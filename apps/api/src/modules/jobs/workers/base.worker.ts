import { Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import {
  JobErrorDetails,
  JobPriority,
  JobRecord,
  JobState,
  JobType,
  WorkerHeartbeat,
  WorkerStatus,
} from '@devflow/shared-types';
import { RedisJobStoreService } from '../redis/redis-job-store.service';
import { KafkaJobBusService } from '../kafka/kafka-job-bus.service';

export interface ProgressCallback {
  (progress: number, intermediateResult?: Record<string, unknown>): Promise<void>;
}

export abstract class BaseWorker implements OnModuleInit, OnModuleDestroy {
  protected readonly logger: Logger;
  public readonly workerId: string;
  public readonly workerType: JobType;
  public readonly concurrency: number;

  private isRunning = false;
  private isSimulatedCrashed = false;
  private readonly activeJobs = new Map<string, { abortController: AbortController; lockToken: string; startedAt: number }>();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private processedCount = 0;
  private failedCount = 0;
  private readonly startedAt: string;

  constructor(
    workerType: JobType,
    workerIdSuffix: string,
    concurrency = 5,
    protected readonly redisStore: RedisJobStoreService,
    protected readonly kafkaBus: KafkaJobBusService,
    protected readonly updateJobStateCallback: (job: JobRecord) => Promise<void>,
  ) {
    this.workerType = workerType;
    this.workerId = `worker-${workerType.toLowerCase()}-${workerIdSuffix}`;
    this.concurrency = concurrency;
    this.startedAt = new Date().toISOString();
    this.logger = new Logger(this.workerId);
  }

  async onModuleInit() {
    await this.start();
  }

  async onModuleDestroy() {
    await this.stop();
  }

  /**
   * Start worker heartbeat and consumer loop
   */
  async start(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;
    this.isSimulatedCrashed = false;
    this.logger.log(`Worker ${this.workerId} started (concurrency: ${this.concurrency})`);

    await this.emitHeartbeat();
    this.heartbeatInterval = setInterval(() => this.emitHeartbeat(), 3000);

    // Subscribe to primary job topic
    const topic = this.kafkaBus.getTopicForJobType(this.workerType);
    this.kafkaBus.subscribe(topic, async (event) => {
      if (!this.isRunning || this.isSimulatedCrashed) return;
      const data = event.data;
      // Synthesize job record from event
      const job: JobRecord = {
        id: data.jobId,
        workspaceId: data.workspaceId,
        repositoryId: data.repositoryId,
        jobType: data.jobType as JobType,
        state: 'QUEUED',
        priority: data.priority as JobPriority,
        payload: (data.payload as Record<string, unknown>) || {},
        attempt: data.attempt || 0,
        maxRetries: data.maxRetries || 3,
        backoffMs: 1000,
        timeoutSeconds: data.timeoutSeconds || 300,
        progress: 0,
        nextRunAt: new Date().toISOString(),
        createdAt: data.enqueuedAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await this.processJob(job);
    });
  }

  /**
   * Graceful shutdown: abort or wait for active tasks to finish
   */
  async stop(): Promise<void> {
    this.isRunning = false;
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    this.logger.log(`Stopping worker ${this.workerId}. Draining ${this.activeJobs.size} active jobs...`);
    for (const [jobId, item] of this.activeJobs.entries()) {
      item.abortController.abort();
      await this.redisStore.releaseJobLock(jobId, item.lockToken);
    }
    this.activeJobs.clear();
  }

  /**
   * Simulate a sudden worker crash (for failure & chaos tests)
   */
  simulateCrash(): void {
    this.isSimulatedCrashed = true;
    this.isRunning = false;
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    this.logger.warn(`CRASH SIMULATED: Worker ${this.workerId} abruptly halted without releasing lock`);
  }

  getRunningJobsCount(): number {
    return this.activeJobs.size;
  }

  isAvailable(): boolean {
    return this.isRunning && !this.isSimulatedCrashed && this.activeJobs.size < this.concurrency;
  }

  // ==========================================
  // Core Job Execution Lifecycle
  // ==========================================

  async processJob(job: JobRecord): Promise<void> {
    if (this.isSimulatedCrashed) {
      this.logger.warn(`Worker ${this.workerId} is crashed; skipping job ${job.id}`);
      return;
    }

    // 1. Concurrency limit check
    if (this.activeJobs.size >= this.concurrency) {
      this.logger.warn(`Concurrency limit reached (${this.concurrency}) on ${this.workerId}. Job ${job.id} postponed`);
      return;
    }

    // 2. Acquire Distributed Lock (SET NX PX)
    const lockTtlMs = (job.timeoutSeconds || 300) * 1000 + 10000;
    const lockResult = await this.redisStore.acquireJobLock(job.id, this.workerId, lockTtlMs);

    if (!lockResult.acquired || !lockResult.token) {
      this.logger.debug(`Could not acquire lock for job ${job.id} (already locked by another worker)`);
      return;
    }

    const lockToken = lockResult.token;
    const abortController = new AbortController();
    this.activeJobs.set(job.id, {
      abortController,
      lockToken,
      startedAt: Date.now(),
    });

    // 3. Mark state as PROCESSING
    const processingJob: JobRecord = {
      ...job,
      state: 'PROCESSING',
      workerId: this.workerId,
      progress: 5,
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await this.updateJobStateCallback(processingJob);
    await this.redisStore.cacheJobState(job.id, 'PROCESSING', 5);

    // 4. Setup Timeout Handler
    const timeoutId = setTimeout(() => {
      this.logger.error(`Job ${job.id} exceeded timeout of ${job.timeoutSeconds}s. Aborting...`);
      abortController.abort();
    }, job.timeoutSeconds * 1000);

    // 5. Execute Subclass Logic
    try {
      const progressCallback: ProgressCallback = async (progress, intermediateResult) => {
        if (abortController.signal.aborted) return;
        const boundedProgress = Math.min(99, Math.max(0, Math.round(progress)));
        processingJob.progress = boundedProgress;
        if (intermediateResult) {
          processingJob.result = { ...(processingJob.result || {}), ...intermediateResult };
        }
        await this.redisStore.cacheJobState(job.id, 'PROCESSING', boundedProgress);
        await this.updateJobStateCallback(processingJob);
      };

      const result = await this.execute(processingJob, abortController.signal, progressCallback);

      clearTimeout(timeoutId);

      if (abortController.signal.aborted) {
        throw new Error('Execution was aborted');
      }

      // 6. Handle Completion
      const durationMs = Date.now() - (this.activeJobs.get(job.id)?.startedAt || Date.now());
      const completedJob: JobRecord = {
        ...processingJob,
        state: 'COMPLETED',
        progress: 100,
        result: result || { status: 'success' },
        errorDetails: undefined,
        completedAt: new Date().toISOString(),
        durationMs,
        updatedAt: new Date().toISOString(),
      };

      this.processedCount++;
      await this.redisStore.cacheJobState(job.id, 'COMPLETED', 100);
      await this.updateJobStateCallback(completedJob);
      this.logger.log(`Job ${job.id} COMPLETED successfully in ${durationMs}ms`);
    } catch (err: any) {
      clearTimeout(timeoutId);
      this.failedCount++;

      const isAborted = abortController.signal.aborted;
      const isRetryable = !isAborted && (err.isRetryable !== false);
      const nextAttempt = (job.attempt || 0) + 1;

      if (isAborted) {
        // Cancelled / Aborted
        const cancelledJob: JobRecord = {
          ...processingJob,
          state: 'CANCELLED',
          errorDetails: {
            message: err.message || 'Job was cancelled or timed out',
            failedAt: new Date().toISOString(),
            attempt: nextAttempt,
            isRetryable: false,
          },
          updatedAt: new Date().toISOString(),
        };
        await this.redisStore.cacheJobState(job.id, 'CANCELLED', processingJob.progress);
        await this.updateJobStateCallback(cancelledJob);
        this.logger.warn(`Job ${job.id} CANCELLED: ${err.message}`);
      } else if (isRetryable && nextAttempt <= job.maxRetries) {
        // Retry with Exponential Backoff + Jitter
        const jitter = Math.floor(Math.random() * 200);
        const backoffMultiplier = Math.pow(2, nextAttempt - 1);
        const calculatedDelayMs = Math.min(30000, job.backoffMs * backoffMultiplier + jitter);

        const errorDetails: JobErrorDetails = {
          message: err.message || 'Job execution error',
          name: err.name,
          stack: err.stack,
          code: err.code || 'JOB_EXECUTION_FAILED',
          isRetryable: true,
          failedAt: new Date().toISOString(),
          attempt: nextAttempt,
        };

        const retryingJob: JobRecord = {
          ...processingJob,
          state: 'RETRYING',
          attempt: nextAttempt,
          errorDetails,
          nextRunAt: new Date(Date.now() + calculatedDelayMs).toISOString(),
          updatedAt: new Date().toISOString(),
        };

        await this.redisStore.cacheJobState(job.id, 'RETRYING', processingJob.progress);
        await this.updateJobStateCallback(retryingJob);
        await this.kafkaBus.publishJobRetry(retryingJob, errorDetails, calculatedDelayMs);

        this.logger.warn(
          `Job ${job.id} failed (attempt ${nextAttempt}/${job.maxRetries}). Next retry in ${calculatedDelayMs}ms`,
        );
      } else {
        // Dead-letter Queue
        const deadLetterReason = isRetryable
          ? `Exhausted all ${job.maxRetries} retry attempts: ${err.message}`
          : `Non-retryable fatal error: ${err.message}`;

        const errorDetails: JobErrorDetails = {
          message: err.message || 'Fatal job error',
          name: err.name,
          stack: err.stack,
          code: err.code || 'FATAL_ERROR',
          isRetryable: false,
          failedAt: new Date().toISOString(),
          attempt: nextAttempt,
          deadLetterReason,
        };

        const deadLetterJob: JobRecord = {
          ...processingJob,
          state: 'DEAD_LETTER',
          attempt: nextAttempt,
          errorDetails,
          completedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        await this.redisStore.cacheJobState(job.id, 'DEAD_LETTER', processingJob.progress);
        await this.updateJobStateCallback(deadLetterJob);
        await this.kafkaBus.publishJobDeadLetter(deadLetterJob, deadLetterReason, errorDetails);

        this.logger.error(`Job ${job.id} routed to DEAD_LETTER: ${deadLetterReason}`);
      }
    } finally {
      // 7. Always Release Distributed Lock & cleanup active map
      await this.redisStore.releaseJobLock(job.id, lockToken);
      this.activeJobs.delete(job.id);
    }
  }

  // ==========================================
  // Worker Subclass Contract
  // ==========================================

  /**
   * Subclasses implement specific domain execution logic
   */
  abstract execute(
    job: JobRecord,
    signal: AbortSignal,
    updateProgress: ProgressCallback,
  ): Promise<Record<string, unknown>>;

  // ==========================================
  // Heartbeat Emission
  // ==========================================

  private async emitHeartbeat(): Promise<void> {
    if (!this.isRunning || this.isSimulatedCrashed) return;

    const status: WorkerStatus = this.activeJobs.size >= this.concurrency ? 'BUSY' : 'ALIVE';
    const heartbeat: WorkerHeartbeat = {
      workerId: this.workerId,
      workerType: this.workerType,
      hostname: process.env.HOSTNAME || 'devflow-worker-node',
      pid: process.pid,
      concurrency: this.concurrency,
      activeJobsCount: this.activeJobs.size,
      status,
      lastHeartbeat: new Date().toISOString(),
      startedAt: this.startedAt,
      version: '1.0.0',
      processedCount: this.processedCount,
      failedCount: this.failedCount,
    };

    await this.redisStore.registerHeartbeat(heartbeat);
  }
}

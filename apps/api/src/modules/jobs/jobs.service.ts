import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  EnqueueJobRequest,
  JobFilterQuery,
  JobMetricsResponse,
  JobPriority,
  JobRecord,
  JobState,
  JobType,
  WorkerHeartbeat,
} from '@devflow/shared-types';
import { RedisJobStoreService } from './redis/redis-job-store.service';
import { KafkaJobBusService } from './kafka/kafka-job-bus.service';
import { JobsRepository } from './jobs.repository';
import { IndexWorker } from './workers/index.worker';
import { AnalysisWorker } from './workers/analysis.worker';
import { EmbeddingWorker } from './workers/embedding.worker';
import { TestWorker } from './workers/test.worker';
import { ReviewWorker } from './workers/review.worker';
import { DocumentationWorker } from './workers/documentation.worker';
import { BaseWorker } from './workers/base.worker';

export interface SimulateFailureRequest {
  scenario: 'WORKER_CRASH' | 'DUPLICATE_EVENT' | 'KAFKA_OUTAGE' | 'REDIS_OUTAGE' | 'RESTORE_SERVICES';
  workerType?: JobType;
}

@Injectable()
export class JobsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(JobsService.name);

  private readonly workerRegistry = new Map<JobType, BaseWorker>();
  private reaperInterval: NodeJS.Timeout | null = null;

  constructor(
    private readonly repository: JobsRepository,
    private readonly redisStore: RedisJobStoreService,
    private readonly kafkaBus: KafkaJobBusService,
    private readonly indexWorker: IndexWorker,
    private readonly analysisWorker: AnalysisWorker,
    private readonly embeddingWorker: EmbeddingWorker,
    private readonly testWorker: TestWorker,
    private readonly reviewWorker: ReviewWorker,
    private readonly documentationWorker: DocumentationWorker,
  ) {
    this.workerRegistry.set('REPOSITORY_INDEX', this.indexWorker);
    this.workerRegistry.set('CODE_ANALYSIS', this.analysisWorker);
    this.workerRegistry.set('EMBEDDING_GENERATION', this.embeddingWorker);
    this.workerRegistry.set('TEST_EXECUTION', this.testWorker);
    this.workerRegistry.set('AI_REVIEW', this.reviewWorker);
    this.workerRegistry.set('DOCUMENTATION', this.documentationWorker);
  }

  async onModuleInit() {
    this.logger.log('Initializing JobsService and starting Dead Worker Reaper loop');

    // Start background Dead Worker Reaper (runs every 10 seconds)
    this.reaperInterval = setInterval(async () => {
      try {
        await this.reapDeadWorkers(15);
      } catch (err: any) {
        this.logger.error(`Dead worker reaper error: ${err.message}`);
      }
    }, 10000);

    // Bootstrap sample jobs if repository is empty so the dashboard has rich data out-of-the-box
    await this.seedInitialJobs();
  }

  onModuleDestroy() {
    if (this.reaperInterval) {
      clearInterval(this.reaperInterval);
      this.reaperInterval = null;
    }
  }

  // ==========================================
  // Job Enqueue & Lifecycle
  // ==========================================

  /**
   * Enqueue a new distributed job with idempotency protection and rate limiting
   */
  async enqueueJob(request: EnqueueJobRequest): Promise<JobRecord> {
    // 1. Rate Limiting Check
    const rateLimitKey = request.workspaceId ? `ratelimit:workspace:${request.workspaceId}` : 'ratelimit:global';
    const isAllowed = await this.redisStore.checkRateLimit(rateLimitKey, 200, 60);
    if (!isAllowed) {
      throw new BadRequestException('Rate limit exceeded for workspace. Please retry in a few seconds.');
    }

    // 2. Idempotency Key Deduplication Check
    if (request.idempotencyKey) {
      const existing = await this.repository.findByIdempotencyKey(request.idempotencyKey);
      if (existing) {
        this.logger.log(
          `Idempotency key hit (${request.idempotencyKey}): returning existing job ${existing.id} [${existing.state}]`,
        );
        return existing;
      }
    }

    // 3. Create Job Record
    const jobId = randomUUID();
    const now = new Date().toISOString();
    const priority = request.priority || JobPriority.NORMAL;
    const maxRetries = request.maxRetries !== undefined ? request.maxRetries : 3;
    const backoffMs = request.backoffMs || 1000;
    const timeoutSeconds = request.timeoutSeconds || 300;

    const newJob: JobRecord = {
      id: jobId,
      workspaceId: request.workspaceId,
      repositoryId: request.repositoryId,
      jobType: request.jobType,
      state: 'QUEUED',
      priority,
      idempotencyKey: request.idempotencyKey,
      payload: request.payload || {},
      progress: 0,
      attempt: 0,
      maxRetries,
      backoffMs,
      timeoutSeconds,
      nextRunAt: now,
      createdAt: now,
      updatedAt: now,
    };

    const savedJob = await this.repository.createJob(newJob);
    await this.redisStore.cacheJobState(jobId, 'QUEUED', 0);

    // 4. Dispatch to Kafka Event Bus
    await this.kafkaBus.publishJobDispatched(savedJob);

    // 5. Trigger local worker execution asynchronously
    const worker = this.workerRegistry.get(request.jobType);
    if (worker && worker.isAvailable()) {
      setImmediate(async () => {
        try {
          await worker.processJob(savedJob);
        } catch (err: any) {
          this.logger.error(`Worker execution error for job ${jobId}: ${err.message}`);
        }
      });
    }

    return savedJob;
  }

  /**
   * Get job by ID with live state from Redis cache
   */
  async getJob(id: string): Promise<JobRecord> {
    const job = await this.repository.findById(id);
    if (!job) {
      throw new NotFoundException(`Job not found: ${id}`);
    }

    // Sync with fast cache if available
    const cached = await this.redisStore.getCachedJobState(id);
    if (cached && (job.state === 'QUEUED' || job.state === 'PROCESSING' || job.state === 'RETRYING')) {
      job.state = cached.state;
      job.progress = cached.progress;
    }

    return job;
  }

  /**
   * List jobs with filters and pagination
   */
  async listJobs(query: JobFilterQuery): Promise<{ jobs: JobRecord[]; total: number }> {
    return this.repository.findJobs(query);
  }

  /**
   * Cancel an in-flight or queued job
   */
  async cancelJob(id: string, reason = 'Cancelled by user'): Promise<JobRecord> {
    const job = await this.getJob(id);

    if (job.state === 'COMPLETED' || job.state === 'CANCELLED' || job.state === 'DEAD_LETTER') {
      throw new BadRequestException(`Cannot cancel job in terminal state: ${job.state}`);
    }

    const updated = await this.repository.updateJob(id, {
      state: 'CANCELLED',
      errorDetails: {
        message: reason,
        failedAt: new Date().toISOString(),
        attempt: job.attempt,
        isRetryable: false,
      },
    });

    await this.redisStore.cacheJobState(id, 'CANCELLED', job.progress);
    this.logger.log(`Job ${id} cancelled. Reason: ${reason}`);
    return updated;
  }

  /**
   * Manually retry a failed or dead-lettered job
   */
  async retryJob(id: string, resetAttempts = true): Promise<JobRecord> {
    const job = await this.getJob(id);

    if (job.state === 'PROCESSING') {
      throw new BadRequestException('Job is currently being processed by a worker');
    }

    const updated = await this.repository.updateJob(id, {
      state: 'QUEUED',
      attempt: resetAttempts ? 0 : job.attempt,
      errorDetails: undefined,
      progress: 0,
      nextRunAt: new Date().toISOString(),
    });

    await this.redisStore.cacheJobState(id, 'QUEUED', 0);
    await this.kafkaBus.publishJobDispatched(updated);

    const worker = this.workerRegistry.get(job.jobType);
    if (worker && worker.isAvailable()) {
      setImmediate(async () => {
        try {
          await worker.processJob(updated);
        } catch (err: any) {
          this.logger.error(`Manual retry error for job ${id}: ${err.message}`);
        }
      });
    }

    return updated;
  }

  /**
   * Aggregate metrics across all jobs
   */
  async getMetrics(workspaceId?: string): Promise<JobMetricsResponse> {
    return this.repository.getMetrics(workspaceId);
  }

  /**
   * Get all registered workers and their current heartbeat status
   */
  async getWorkers(): Promise<WorkerHeartbeat[]> {
    const activeWorkers = await this.redisStore.getActiveWorkers(15);
    const repoHeartbeats = await this.repository.getHeartbeats();

    const mergedMap = new Map<string, WorkerHeartbeat>();
    for (const hb of repoHeartbeats) {
      mergedMap.set(hb.workerId, hb);
    }
    for (const hb of activeWorkers) {
      mergedMap.set(hb.workerId, hb);
    }

    return Array.from(mergedMap.values());
  }

  // ==========================================
  // Failure Detection & Dead Worker Reaper
  // ==========================================

  /**
   * Detect workers that crashed or missed heartbeats (>15s) and reclaim their locked jobs
   */
  async reapDeadWorkers(thresholdSeconds = 15): Promise<{ reclaimedCount: number; deadWorkers: string[] }> {
    const now = Date.now();
    const cutoff = now - thresholdSeconds * 1000;
    const allWorkers = await this.repository.getHeartbeats();
    const deadWorkerIds: string[] = [];

    for (const worker of allWorkers) {
      const lastHb = new Date(worker.lastHeartbeat).getTime();
      if (lastHb < cutoff && worker.status !== 'DEAD') {
        worker.status = 'DEAD';
        await this.redisStore.markWorkerDead(worker.workerId);
        await this.repository.upsertHeartbeat(worker);
        deadWorkerIds.push(worker.workerId);
        this.logger.warn(`Dead Worker Reaper detected inactive worker: ${worker.workerId}`);
      }
    }

    if (deadWorkerIds.length === 0) {
      return { reclaimedCount: 0, deadWorkers: [] };
    }

    const orphanJobs = await this.repository.findJobsToReclaim(deadWorkerIds, now);
    let reclaimedCount = 0;

    for (const job of orphanJobs) {
      const nextAttempt = job.attempt + 1;
      const isRetryable = nextAttempt <= job.maxRetries;

      if (isRetryable) {
        await this.repository.updateJob(job.id, {
          state: 'RETRYING',
          attempt: nextAttempt,
          workerId: undefined,
          lockedUntil: undefined,
          errorDetails: {
            message: `Worker ${job.workerId} died or heartbeat expired`,
            isRetryable: true,
            failedAt: new Date().toISOString(),
            attempt: nextAttempt,
          },
          nextRunAt: new Date(Date.now() + 1000).toISOString(),
        });
        this.logger.warn(`Reclaimed job ${job.id} from dead worker ${job.workerId}. Re-queued for retry.`);
      } else {
        await this.repository.updateJob(job.id, {
          state: 'DEAD_LETTER',
          attempt: nextAttempt,
          workerId: undefined,
          lockedUntil: undefined,
          errorDetails: {
            message: `Worker ${job.workerId} died and max retries (${job.maxRetries}) exhausted`,
            isRetryable: false,
            failedAt: new Date().toISOString(),
            attempt: nextAttempt,
            deadLetterReason: 'Worker crashed repeatedly exceeding retry limits',
          },
        });
        this.logger.error(`Reclaimed job ${job.id} routed to DEAD_LETTER after dead worker crash.`);
      }
      reclaimedCount++;
    }

    return { reclaimedCount, deadWorkers: deadWorkerIds };
  }

  // ==========================================
  // Chaos & Failure Simulation Harness
  // ==========================================

  async simulateFailure(req: SimulateFailureRequest): Promise<Record<string, unknown>> {
    switch (req.scenario) {
      case 'WORKER_CRASH': {
        const targetType = req.workerType || 'REPOSITORY_INDEX';
        const worker = this.workerRegistry.get(targetType);
        if (!worker) {
          throw new BadRequestException(`Worker not found for type: ${targetType}`);
        }
        worker.simulateCrash();
        return {
          scenario: 'WORKER_CRASH',
          workerId: worker.workerId,
          message: `Worker ${worker.workerId} abruptly crashed. Dead worker reaper will reclaim jobs within 15 seconds.`,
        };
      }
      case 'DUPLICATE_EVENT': {
        const key = `sim_dup_${Date.now()}`;
        const job1 = await this.enqueueJob({
          jobType: 'CODE_ANALYSIS',
          payload: { target: 'chaos-test.ts' },
          idempotencyKey: key,
        });
        const job2 = await this.enqueueJob({
          jobType: 'CODE_ANALYSIS',
          payload: { target: 'chaos-test.ts' },
          idempotencyKey: key,
        });
        return {
          scenario: 'DUPLICATE_EVENT',
          idempotencyKey: key,
          job1Id: job1.id,
          job2Id: job2.id,
          isIdentical: job1.id === job2.id,
          message: 'Duplicate event detected: second enqueue returned original job without duplicating work.',
        };
      }
      case 'KAFKA_OUTAGE': {
        this.kafkaBus.setKafkaConnected(false);
        return {
          scenario: 'KAFKA_OUTAGE',
          kafkaStatus: 'OFFLINE',
          bufferedMessages: this.kafkaBus.getBufferedCount(),
          message: 'Kafka broker simulated offline. Outgoing messages are buffered in circuit breaker memory.',
        };
      }
      case 'REDIS_OUTAGE': {
        this.redisStore.setRedisConnected(false);
        return {
          scenario: 'REDIS_OUTAGE',
          redisStatus: 'OFFLINE',
          message: 'Redis cluster simulated offline. Distributed locks and state seamlessly fell back to memory/Postgres transactions.',
        };
      }
      case 'RESTORE_SERVICES': {
        this.kafkaBus.setKafkaConnected(true);
        this.redisStore.setRedisConnected(true);
        for (const [_, worker] of this.workerRegistry.entries()) {
          await worker.start();
        }
        return {
          scenario: 'RESTORE_SERVICES',
          kafkaStatus: 'ONLINE',
          redisStatus: 'ONLINE',
          message: 'All distributed infrastructure services and workers restored to healthy state.',
        };
      }
      default:
        throw new BadRequestException(`Unknown chaos scenario: ${req.scenario}`);
    }
  }

  // ==========================================
  // Initial Job Seeding for Demo / Dashboard
  // ==========================================

  private async seedInitialJobs(): Promise<void> {
    const existing = await this.repository.findJobs({ limit: 1 });
    if (existing.total > 0) return;

    this.logger.log('Seeding initial demonstration jobs into repository');

    const seedData: Array<Partial<JobRecord>> = [
      {
        id: randomUUID(),
        jobType: 'REPOSITORY_INDEX',
        state: 'COMPLETED',
        priority: JobPriority.CRITICAL,
        progress: 100,
        attempt: 1,
        maxRetries: 3,
        backoffMs: 1000,
        timeoutSeconds: 300,
        workerId: 'worker-repository_index-01',
        payload: { repoName: 'DevFlow-Main', branch: 'main', commitSha: 'a1b2c3d' },
        result: { filesIndexed: 142, symbolsCount: 680, chunksCount: 240, durationMs: 4120 },
        startedAt: new Date(Date.now() - 120000).toISOString(),
        completedAt: new Date(Date.now() - 115000).toISOString(),
        durationMs: 5000,
        createdAt: new Date(Date.now() - 125000).toISOString(),
        updatedAt: new Date(Date.now() - 115000).toISOString(),
        nextRunAt: new Date().toISOString(),
      },
      {
        id: randomUUID(),
        jobType: 'CODE_ANALYSIS',
        state: 'COMPLETED',
        priority: JobPriority.HIGH,
        progress: 100,
        attempt: 1,
        maxRetries: 3,
        backoffMs: 1000,
        timeoutSeconds: 300,
        workerId: 'worker-code_analysis-01',
        payload: { targetPath: 'apps/api/src/modules/auth' },
        result: { securityScore: 99, complexityAvg: 3.1, issuesCount: 0 },
        startedAt: new Date(Date.now() - 90000).toISOString(),
        completedAt: new Date(Date.now() - 88000).toISOString(),
        durationMs: 2000,
        createdAt: new Date(Date.now() - 95000).toISOString(),
        updatedAt: new Date(Date.now() - 88000).toISOString(),
        nextRunAt: new Date().toISOString(),
      },
      {
        id: randomUUID(),
        jobType: 'EMBEDDING_GENERATION',
        state: 'PROCESSING',
        priority: JobPriority.NORMAL,
        progress: 65,
        attempt: 1,
        maxRetries: 3,
        backoffMs: 1000,
        timeoutSeconds: 300,
        workerId: 'worker-embedding_generation-01',
        payload: { totalChunks: 120, batchSize: 20 },
        startedAt: new Date(Date.now() - 10000).toISOString(),
        createdAt: new Date(Date.now() - 15000).toISOString(),
        updatedAt: new Date(Date.now() - 2000).toISOString(),
        nextRunAt: new Date().toISOString(),
      },
      {
        id: randomUUID(),
        jobType: 'TEST_EXECUTION',
        state: 'COMPLETED',
        priority: JobPriority.NORMAL,
        progress: 100,
        attempt: 1,
        maxRetries: 3,
        backoffMs: 1000,
        timeoutSeconds: 300,
        workerId: 'worker-test_execution-01',
        payload: { framework: 'jest', testSuite: 'all' },
        result: { totalTests: 55, passedTests: 55, failedTests: 0, lineCoverage: 96.4 },
        startedAt: new Date(Date.now() - 60000).toISOString(),
        completedAt: new Date(Date.now() - 57000).toISOString(),
        durationMs: 3000,
        createdAt: new Date(Date.now() - 65000).toISOString(),
        updatedAt: new Date(Date.now() - 57000).toISOString(),
        nextRunAt: new Date().toISOString(),
      },
      {
        id: randomUUID(),
        jobType: 'AI_REVIEW',
        state: 'RETRYING',
        priority: JobPriority.HIGH,
        progress: 40,
        attempt: 2,
        maxRetries: 3,
        backoffMs: 1000,
        timeoutSeconds: 120,
        payload: { pullRequestId: 'PR-42', headSha: '9f8e7d6' },
        errorDetails: {
          message: 'Upstream rate limit from LLM provider (HTTP 429)',
          code: 'RATE_LIMIT_EXCEEDED',
          isRetryable: true,
          failedAt: new Date(Date.now() - 5000).toISOString(),
          attempt: 2,
        },
        createdAt: new Date(Date.now() - 30000).toISOString(),
        updatedAt: new Date(Date.now() - 5000).toISOString(),
        nextRunAt: new Date(Date.now() + 2000).toISOString(),
      },
      {
        id: randomUUID(),
        jobType: 'DOCUMENTATION',
        state: 'DEAD_LETTER',
        priority: JobPriority.LOW,
        progress: 20,
        attempt: 3,
        maxRetries: 3,
        backoffMs: 1000,
        timeoutSeconds: 60,
        payload: { target: 'corrupted-syntax-tree.ts' },
        errorDetails: {
          message: 'Parser syntax exception: Unexpected EOF at line 1',
          code: 'SYNTAX_ERROR',
          isRetryable: false,
          failedAt: new Date(Date.now() - 20000).toISOString(),
          attempt: 3,
          deadLetterReason: 'Exhausted all 3 retry attempts: Parser syntax exception',
        },
        createdAt: new Date(Date.now() - 45000).toISOString(),
        updatedAt: new Date(Date.now() - 20000).toISOString(),
        nextRunAt: new Date().toISOString(),
      },
    ];

    for (const item of seedData) {
      await this.repository.createJob(item as JobRecord);
    }
  }
}

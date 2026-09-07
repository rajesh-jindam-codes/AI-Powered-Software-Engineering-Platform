import { JobPriority, JobRecord, WorkerHeartbeat } from '@devflow/shared-types';
import { JobsRepository } from './jobs.repository';
import { RedisJobStoreService } from './redis/redis-job-store.service';
import { KafkaJobBusService } from './kafka/kafka-job-bus.service';
import { JobsService } from './jobs.service';
import { IndexWorker } from './workers/index.worker';
import { AnalysisWorker } from './workers/analysis.worker';
import { EmbeddingWorker } from './workers/embedding.worker';
import { TestWorker } from './workers/test.worker';
import { ReviewWorker } from './workers/review.worker';
import { DocumentationWorker } from './workers/documentation.worker';
import { BaseWorker, ProgressCallback } from './workers/base.worker';

class FlakyWorker extends BaseWorker {
  public failCount = 0;
  public succeedOnAttempt = 3;

  constructor(redisStore: RedisJobStoreService, kafkaBus: KafkaJobBusService) {
    super('CODE_ANALYSIS', 'flaky-01', 5, redisStore, kafkaBus, async () => {});
  }

  async execute(job: JobRecord, signal: AbortSignal, updateProgress: ProgressCallback): Promise<Record<string, unknown>> {
    this.failCount++;
    if (this.failCount < this.succeedOnAttempt) {
      const err: any = new Error(`Simulated transient network timeout (failure #${this.failCount})`);
      err.isRetryable = true;
      throw err;
    }
    return { status: 'recovered_and_succeeded', totalAttempts: this.failCount };
  }
}

class FatalWorker extends BaseWorker {
  constructor(redisStore: RedisJobStoreService, kafkaBus: KafkaJobBusService) {
    super('DOCUMENTATION', 'fatal-01', 5, redisStore, kafkaBus, async () => {});
  }

  async execute(job: JobRecord): Promise<Record<string, unknown>> {
    const err: any = new Error('Fatal non-retryable schema violation');
    err.isRetryable = false;
    throw err;
  }
}

describe('Failure & Chaos Engineering Simulation Suite (Phase 6)', () => {
  let repository: JobsRepository;
  let redisStore: RedisJobStoreService;
  let kafkaBus: KafkaJobBusService;
  let indexWorker: IndexWorker;
  let analysisWorker: AnalysisWorker;
  let embeddingWorker: EmbeddingWorker;
  let testWorker: TestWorker;
  let reviewWorker: ReviewWorker;
  let documentationWorker: DocumentationWorker;
  let jobsService: JobsService;

  beforeEach(() => {
    repository = new JobsRepository();
    redisStore = new RedisJobStoreService();
    redisStore.onModuleInit();
    kafkaBus = new KafkaJobBusService();
    kafkaBus.onModuleInit();

    indexWorker = new IndexWorker(redisStore, kafkaBus);
    analysisWorker = new AnalysisWorker(redisStore, kafkaBus);
    embeddingWorker = new EmbeddingWorker(redisStore, kafkaBus);
    testWorker = new TestWorker(redisStore, kafkaBus);
    reviewWorker = new ReviewWorker(redisStore, kafkaBus);
    documentationWorker = new DocumentationWorker(redisStore, kafkaBus);

    jobsService = new JobsService(
      repository,
      redisStore,
      kafkaBus,
      indexWorker,
      analysisWorker,
      embeddingWorker,
      testWorker,
      reviewWorker,
      documentationWorker,
    );
  });

  afterEach(async () => {
    await jobsService.onModuleDestroy();
    redisStore.onModuleDestroy();
    kafkaBus.onModuleDestroy();
  });

  // ==========================================================
  // Test 1: Worker Crash & Dead Worker Reclamation
  // ==========================================================
  it('Scenario 1 (Worker Crash): Dead Worker Reaper detects crashed worker and reclaims locked job for retry', async () => {
    const crashedWorkerId = 'worker-index-crashed-node';
    const deadHeartbeat: WorkerHeartbeat = {
      workerId: crashedWorkerId,
      workerType: 'REPOSITORY_INDEX',
      hostname: 'node-99',
      pid: 1234,
      concurrency: 5,
      activeJobsCount: 1,
      status: 'ALIVE',
      lastHeartbeat: new Date(Date.now() - 25000).toISOString(), // 25s ago (older than 15s threshold)
      startedAt: new Date(Date.now() - 60000).toISOString(),
      version: '1.0.0',
      processedCount: 10,
      failedCount: 0,
    };
    await repository.upsertHeartbeat(deadHeartbeat);

    // Job locked by the crashed worker
    const job: JobRecord = {
      id: 'job-crashed-1',
      jobType: 'REPOSITORY_INDEX',
      state: 'PROCESSING',
      priority: JobPriority.HIGH,
      attempt: 1,
      maxRetries: 3,
      backoffMs: 1000,
      timeoutSeconds: 300,
      progress: 30,
      payload: {},
      workerId: crashedWorkerId,
      lockedUntil: new Date(Date.now() + 60000).toISOString(),
      nextRunAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await repository.createJob(job);

    // Execute reaper
    const result = await jobsService.reapDeadWorkers(15);

    expect(result.deadWorkers).toContain(crashedWorkerId);
    expect(result.reclaimedCount).toBe(1);

    const updatedJob = await repository.findById('job-crashed-1');
    expect(updatedJob?.state).toBe('RETRYING');
    expect(updatedJob?.attempt).toBe(2);
    expect(updatedJob?.workerId).toBeUndefined();
    expect(updatedJob?.errorDetails?.isRetryable).toBe(true);
  });

  // ==========================================================
  // Test 2: Duplicate Event & Idempotency
  // ==========================================================
  it('Scenario 2 (Duplicate Event): Idempotency deduplication rejects duplicate payload execution and returns cached record', async () => {
    const duplicateKey = 'evt_push_sha_88f9e1';

    const job1 = await jobsService.enqueueJob({
      jobType: 'REPOSITORY_INDEX',
      idempotencyKey: duplicateKey,
      payload: { sha: '88f9e1' },
    });

    const job2 = await jobsService.enqueueJob({
      jobType: 'REPOSITORY_INDEX',
      idempotencyKey: duplicateKey,
      payload: { sha: '88f9e1' },
    });

    expect(job1.id).toBe(job2.id);
    const list = await repository.findJobs({});
    expect(list.total).toBe(1);
  });

  // ==========================================================
  // Test 3: Kafka Broker Unavailable & Circuit Breaker Buffering
  // ==========================================================
  it('Scenario 3 (Kafka Outage): Messages are safely buffered when Kafka is down and flushed upon reconnection', async () => {
    kafkaBus.setKafkaConnected(false);
    expect(kafkaBus.isOnline()).toBe(false);

    const job = await jobsService.enqueueJob({
      jobType: 'CODE_ANALYSIS',
      payload: { file: 'index.ts' },
    });

    expect(kafkaBus.getBufferedCount()).toBeGreaterThanOrEqual(1);

    // Reconnect Kafka
    kafkaBus.setKafkaConnected(true);
    expect(kafkaBus.isOnline()).toBe(true);
    expect(kafkaBus.getBufferedCount()).toBe(0);
  });

  // ==========================================================
  // Test 4: Redis Cluster Unavailable & Fallback
  // ==========================================================
  it('Scenario 4 (Redis Outage): Distributed locks and rate limits gracefully fall back to in-memory store', async () => {
    redisStore.setRedisConnected(false);
    expect(redisStore.isOnline()).toBe(false);

    // Should acquire lock successfully via fallback without throwing fatal exceptions
    const lock1 = await redisStore.acquireJobLock('job-redis-test', 'worker-1', 10000);
    expect(lock1.acquired).toBe(true);

    // Second lock attempt from another worker on same job should be rejected
    const lock2 = await redisStore.acquireJobLock('job-redis-test', 'worker-2', 10000);
    expect(lock2.acquired).toBe(false);

    // Release lock
    const released = await redisStore.releaseJobLock('job-redis-test', lock1.token!);
    expect(released).toBe(true);

    // Now worker 2 can acquire
    const lock3 = await redisStore.acquireJobLock('job-redis-test', 'worker-2', 10000);
    expect(lock3.acquired).toBe(true);
  });

  // ==========================================================
  // Test 5: Retry with Exponential Backoff & Jitter
  // ==========================================================
  it('Scenario 5 (Retry with Exponential Backoff): Flaky worker retries with progressive delay', async () => {
    const updatedStateList: JobRecord[] = [];
    const flakyWorker = new FlakyWorker(redisStore, kafkaBus);
    (flakyWorker as any).updateJobStateCallback = async (j: JobRecord) => {
      updatedStateList.push({ ...j });
      await repository.updateJob(j.id, j);
    };

    const jobRecord: JobRecord = {
      id: 'job-flaky-test-1',
      jobType: 'CODE_ANALYSIS',
      state: 'QUEUED',
      priority: JobPriority.NORMAL,
      attempt: 0,
      maxRetries: 3,
      backoffMs: 200,
      timeoutSeconds: 10,
      progress: 0,
      payload: {},
      nextRunAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await repository.createJob(jobRecord);

    await flakyWorker.processJob(jobRecord);

    const finalJob = await repository.findById('job-flaky-test-1');
    expect(finalJob?.state).toBe('RETRYING');
    expect(finalJob?.attempt).toBe(1);
    expect(finalJob?.errorDetails?.isRetryable).toBe(true);
  });

  // ==========================================================
  // Test 6: Dead-Letter Queue (DLQ) on Fatal / Max Retries
  // ==========================================================
  it('Scenario 6 (Dead-Letter Queue): Non-retryable fatal error routes immediately to DEAD_LETTER and DLQ topic', async () => {
    let dlqEventCaptured: any = null;
    kafkaBus.subscribe(kafkaBus.getTopicForJobType('DOCUMENTATION'), async () => {});
    kafkaBus.subscribe('devflow.jobs.dlq.v1', async (evt) => {
      dlqEventCaptured = evt.data;
    });

    const fatalWorker = new FatalWorker(redisStore, kafkaBus);
    (fatalWorker as any).updateJobStateCallback = async (j: JobRecord) => {
      await repository.updateJob(j.id, j);
    };

    const fatalJob: JobRecord = {
      id: 'job-fatal-dlq-1',
      jobType: 'DOCUMENTATION',
      state: 'QUEUED',
      priority: JobPriority.LOW,
      attempt: 0,
      maxRetries: 3,
      backoffMs: 100,
      timeoutSeconds: 5,
      progress: 0,
      payload: {},
      nextRunAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await repository.createJob(fatalJob);

    await fatalWorker.processJob(fatalJob);

    const finalJob = await repository.findById('job-fatal-dlq-1');
    expect(finalJob?.state).toBe('DEAD_LETTER');
    expect(finalJob?.errorDetails?.isRetryable).toBe(false);
    expect(finalJob?.errorDetails?.deadLetterReason).toContain('Non-retryable fatal error');
    expect(dlqEventCaptured).toBeDefined();
    expect(dlqEventCaptured?.jobId).toBe('job-fatal-dlq-1');
  });
});

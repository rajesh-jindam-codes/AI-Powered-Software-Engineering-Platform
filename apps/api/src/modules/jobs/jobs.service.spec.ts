import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { JobPriority, JobRecord, JobType } from '@devflow/shared-types';
import { JobsService } from './jobs.service';
import { JobsRepository } from './jobs.repository';
import { RedisJobStoreService } from './redis/redis-job-store.service';
import { KafkaJobBusService } from './kafka/kafka-job-bus.service';
import { IndexWorker } from './workers/index.worker';
import { AnalysisWorker } from './workers/analysis.worker';
import { EmbeddingWorker } from './workers/embedding.worker';
import { TestWorker } from './workers/test.worker';
import { ReviewWorker } from './workers/review.worker';
import { DocumentationWorker } from './workers/documentation.worker';

describe('JobsService', () => {
  let service: JobsService;
  let repository: JobsRepository;
  let redisStore: RedisJobStoreService;
  let kafkaBus: KafkaJobBusService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobsRepository,
        RedisJobStoreService,
        KafkaJobBusService,
        IndexWorker,
        AnalysisWorker,
        EmbeddingWorker,
        TestWorker,
        ReviewWorker,
        DocumentationWorker,
        JobsService,
      ],
    }).compile();

    service = module.get<JobsService>(JobsService);
    repository = module.get<JobsRepository>(JobsRepository);
    redisStore = module.get<RedisJobStoreService>(RedisJobStoreService);
    kafkaBus = module.get<KafkaJobBusService>(KafkaJobBusService);

    repository.clear();
    redisStore.clearAll();
  });

  afterEach(async () => {
    await service.onModuleDestroy();
  });

  describe('enqueueJob', () => {
    it('should successfully enqueue a new job and return status QUEUED', async () => {
      const job = await service.enqueueJob({
        jobType: 'REPOSITORY_INDEX',
        workspaceId: 'ws-123',
        repositoryId: 'repo-456',
        priority: JobPriority.HIGH,
        payload: { repoUrl: 'https://github.com/org/repo' },
      });

      expect(job).toBeDefined();
      expect(job.id).toBeDefined();
      expect(job.jobType).toBe('REPOSITORY_INDEX');
      expect(job.state).toBe('QUEUED');
      expect(job.priority).toBe(JobPriority.HIGH);
      expect(job.attempt).toBe(0);
      expect(job.progress).toBe(0);
    });

    it('should respect idempotency key and return existing job without creating duplicates', async () => {
      const idempotencyKey = 'unique-ingest-key-100';

      const job1 = await service.enqueueJob({
        jobType: 'CODE_ANALYSIS',
        payload: { path: 'src/main.ts' },
        idempotencyKey,
      });

      const job2 = await service.enqueueJob({
        jobType: 'CODE_ANALYSIS',
        payload: { path: 'src/main.ts' },
        idempotencyKey,
      });

      expect(job1.id).toBe(job2.id);

      const allJobs = await service.listJobs({});
      expect(allJobs.total).toBe(1);
    });

    it('should assign priority and sort priority CRITICAL before LOW in query', async () => {
      const lowJob = await service.enqueueJob({
        jobType: 'DOCUMENTATION',
        priority: JobPriority.LOW,
        payload: {},
      });

      const critJob = await service.enqueueJob({
        jobType: 'REPOSITORY_INDEX',
        priority: JobPriority.CRITICAL,
        payload: {},
      });

      const list = await service.listJobs({});
      expect(list.jobs[0].id).toBe(critJob.id);
      expect(list.jobs[1].id).toBe(lowJob.id);
    });
  });

  describe('cancelJob', () => {
    it('should transition an in-flight/queued job to CANCELLED', async () => {
      const job = await service.enqueueJob({
        jobType: 'TEST_EXECUTION',
        payload: { suite: 'e2e' },
      });

      const cancelled = await service.cancelJob(job.id, 'User stopped build');
      expect(cancelled.state).toBe('CANCELLED');
      expect(cancelled.errorDetails?.message).toBe('User stopped build');
    });

    it('should throw error when cancelling a job in terminal COMPLETED state', async () => {
      const job = await service.enqueueJob({
        jobType: 'CODE_ANALYSIS',
        payload: {},
      });

      await repository.updateJob(job.id, { state: 'COMPLETED' });

      await expect(service.cancelJob(job.id)).rejects.toThrow(BadRequestException);
    });
  });

  describe('retryJob', () => {
    it('should reset a dead-lettered or failed job to QUEUED state', async () => {
      const job = await service.enqueueJob({
        jobType: 'AI_REVIEW',
        payload: { pr: 12 },
      });

      await repository.updateJob(job.id, {
        state: 'DEAD_LETTER',
        attempt: 3,
        errorDetails: { message: 'Failed after 3 attempts', failedAt: new Date().toISOString(), attempt: 3, isRetryable: false },
      });

      const retried = await service.retryJob(job.id, true);
      expect(retried.state).toBe('QUEUED');
      expect(retried.attempt).toBe(0);
      expect(retried.errorDetails).toBeUndefined();
    });
  });

  describe('getMetrics', () => {
    it('should accurately compute KPI counts, active workers, and average duration', async () => {
      await service.enqueueJob({ jobType: 'REPOSITORY_INDEX', payload: {} });
      const job2 = await service.enqueueJob({ jobType: 'CODE_ANALYSIS', payload: {} });

      await repository.updateJob(job2.id, {
        state: 'COMPLETED',
        startedAt: new Date(Date.now() - 3000).toISOString(),
        completedAt: new Date().toISOString(),
        durationMs: 3000,
      });

      const metrics = await service.getMetrics();
      expect(metrics.total).toBe(2);
      expect(metrics.counts.QUEUED).toBe(1);
      expect(metrics.counts.COMPLETED).toBe(1);
      expect(metrics.avgDurationMs).toBe(3000);
    });
  });
});

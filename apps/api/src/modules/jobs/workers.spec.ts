import { JobPriority, JobRecord } from '@devflow/shared-types';
import { RedisJobStoreService } from './redis/redis-job-store.service';
import { KafkaJobBusService } from './kafka/kafka-job-bus.service';
import { IndexWorker } from './workers/index.worker';
import { AnalysisWorker } from './workers/analysis.worker';
import { EmbeddingWorker } from './workers/embedding.worker';
import { TestWorker } from './workers/test.worker';
import { ReviewWorker } from './workers/review.worker';
import { DocumentationWorker } from './workers/documentation.worker';

describe('Specialized Workers Suite (Phase 6)', () => {
  let redisStore: RedisJobStoreService;
  let kafkaBus: KafkaJobBusService;

  beforeEach(() => {
    redisStore = new RedisJobStoreService();
    redisStore.onModuleInit();
    kafkaBus = new KafkaJobBusService();
    kafkaBus.onModuleInit();
  });

  afterEach(() => {
    redisStore.onModuleDestroy();
    kafkaBus.onModuleDestroy();
  });

  const createDummyJob = (type: any, payload: Record<string, unknown> = {}): JobRecord => ({
    id: `job-test-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    jobType: type,
    state: 'QUEUED',
    priority: JobPriority.NORMAL,
    payload,
    attempt: 0,
    maxRetries: 3,
    backoffMs: 100,
    timeoutSeconds: 10,
    progress: 0,
    nextRunAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  it('IndexWorker: should discover files, extract symbols, and generate code chunks', async () => {
    const worker = new IndexWorker(redisStore, kafkaBus);
    await worker.start();

    const job = createDummyJob('REPOSITORY_INDEX', { repositoryId: 'repo-1' });
    const progressUpdates: number[] = [];
    const updateCallback = async (p: number) => {
      progressUpdates.push(p);
    };

    const result = await worker.execute(job, new AbortController().signal, updateCallback);

    expect(result.filesIndexed).toBeGreaterThan(0);
    expect(result.symbolsCount).toBeGreaterThan(0);
    expect(result.chunksCount).toBeGreaterThan(0);
    expect(progressUpdates.length).toBeGreaterThanOrEqual(3);
    await worker.stop();
  });

  it('AnalysisWorker: should run static analysis and compute complexity metrics', async () => {
    const worker = new AnalysisWorker(redisStore, kafkaBus);
    await worker.start();

    const job = createDummyJob('CODE_ANALYSIS', { targetPath: 'src/' });
    const result = await worker.execute(job, new AbortController().signal, async () => {});

    expect(result.filesAnalyzed).toBe(35);
    expect(result.securityScore).toBeGreaterThanOrEqual(90);
    expect(result.maintainabilityIndex).toBeGreaterThan(80);
    await worker.stop();
  });

  it('EmbeddingWorker: should batch chunks and generate 1536-dim vector metadata', async () => {
    const worker = new EmbeddingWorker(redisStore, kafkaBus);
    await worker.start();

    const job = createDummyJob('EMBEDDING_GENERATION', { totalChunks: 40, batchSize: 20 });
    const result = await worker.execute(job, new AbortController().signal, async () => {});

    expect(result.totalChunksEmbedded).toBe(40);
    expect(result.dimensions).toBe(1536);
    expect(result.embeddingModel).toBe('text-embedding-3-small');
    await worker.stop();
  });

  it('TestWorker: should run unit assertions and compute coverage delta', async () => {
    const worker = new TestWorker(redisStore, kafkaBus);
    await worker.start();

    const job = createDummyJob('TEST_EXECUTION', { framework: 'jest' });
    const result = await worker.execute(job, new AbortController().signal, async () => {});

    expect(result.totalTests).toBe(48);
    expect(result.passedTests).toBe(48);
    expect(result.lineCoverage).toBe(94.2);
    expect(result.exitCode).toBe(0);
    await worker.stop();
  });

  it('ReviewWorker: should analyze pull request diffs and synthesize structured comments', async () => {
    const worker = new ReviewWorker(redisStore, kafkaBus);
    await worker.start();

    const job = createDummyJob('AI_REVIEW', { pullRequestId: 'PR-99' });
    const result = await worker.execute(job, new AbortController().signal, async () => {});

    expect(result.status).toBe('approved');
    expect(result.score).toBe(92);
    expect(result.commentsCount).toBe(2);
    await worker.stop();
  });

  it('DocumentationWorker: should scan routes and generate Markdown with Mermaid diagrams', async () => {
    const worker = new DocumentationWorker(redisStore, kafkaBus);
    await worker.start();

    const job = createDummyJob('DOCUMENTATION', {});
    const result = await worker.execute(job, new AbortController().signal, async () => {});

    expect(result.pagesGenerated).toBe(5);
    expect(result.diagramsRendered).toBe(3);
    expect(result.format).toBe('markdown_with_mermaid');
    await worker.stop();
  });
});

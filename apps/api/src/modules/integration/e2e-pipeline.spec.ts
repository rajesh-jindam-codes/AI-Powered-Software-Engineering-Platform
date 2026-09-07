import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { JobPriority } from '@devflow/shared-types';
import { AuthService } from '../auth/auth.service';
import { UserRepository } from '../auth/user.repository';
import { JobsService } from '../jobs/jobs.service';
import { JobsRepository } from '../jobs/jobs.repository';
import { RedisJobStoreService } from '../jobs/redis/redis-job-store.service';
import { KafkaJobBusService } from '../jobs/kafka/kafka-job-bus.service';
import { IndexWorker } from '../jobs/workers/index.worker';
import { AnalysisWorker } from '../jobs/workers/analysis.worker';
import { EmbeddingWorker } from '../jobs/workers/embedding.worker';
import { TestWorker } from '../jobs/workers/test.worker';
import { ReviewWorker } from '../jobs/workers/review.worker';
import { DocumentationWorker } from '../jobs/workers/documentation.worker';
import { IntelligenceService } from '../intelligence/intelligence.service';
import { CodeSearchService } from '../intelligence/search/code-search.service';
import { ApiExtractorService } from '../intelligence/extractors/api-extractor.service';
import { DbExtractorService } from '../intelligence/extractors/db-extractor.service';
import { AuthExtractorService } from '../intelligence/extractors/auth-extractor.service';
import { ConfigExtractorService } from '../intelligence/extractors/config-extractor.service';
import { TestExtractorService } from '../intelligence/extractors/test-extractor.service';
import { CodeGraphBuilderService } from '../intelligence/graph/code-graph-builder.service';
import { SemanticContextChunkerService } from '../intelligence/chunking/semantic-context-chunker.service';
import { QueryProcessorService } from '../intelligence/rag/query-processor.service';
import { QueryEmbedderService } from '../intelligence/rag/query-embedder.service';
import { HybridRetrieverService } from '../intelligence/rag/hybrid-retriever.service';
import { ContextBuilderService } from '../intelligence/rag/context-builder.service';
import { LlmEngineService } from '../intelligence/rag/llm-engine.service';
import { ConversationService } from '../intelligence/chat/conversation.service';
import { AgentOrchestratorService } from '../agents/agent-orchestrator.service';
import { ToolRegistryService } from '../agents/tools/tool-registry.service';
import { VirtualSandboxService } from '../agents/sandbox/virtual-sandbox.service';
import { AgentGuardrailsService } from '../agents/safety/agent-guardrails.service';
import { ReviewsService } from '../reviews/reviews.service';
import { ReviewAnalyzerService } from '../reviews/review-analyzer.service';
import { TestSynthesizerService } from '../reviews/test-synthesizer.service';
import { GitHubService } from '../github/github.service';
import { TestGenerationService } from '../tests/test-generation.service';
import { TestAnalyzerService } from '../tests/test-analyzer.service';
import { TestGeneratorService } from '../tests/test-generator.service';
import { SandboxedTestRunnerService } from '../tests/sandboxed-test-runner.service';
import { TestSelfHealingService } from '../tests/test-self-healing.service';
import { PresenceService } from '../collaboration/presence.service';
import { CrdtSyncService } from '../collaboration/crdt-sync.service';
import { DocumentsService } from '../collaboration/documents.service';
import { ActivityFeedService } from '../collaboration/activity-feed.service';
import { MetricsService } from '../observability/metrics.service';
import { DistributedTracingService } from '../observability/distributed-tracing.service';
import { SsrfProtectionService } from '../../common/security/ssrf-protection.service';
import { SecretSanitizerInterceptor } from '../../common/interceptors/secret-sanitizer.interceptor';
import { AuditService } from '../audit/audit.service';
import { IngestionWorkerService } from '../ingestion/ingestion-worker.service';

describe('DevFlow AI — Complete 14-Phase End-to-End Platform Pipeline', () => {
  let authService: AuthService;
  let ingestionWorker: IngestionWorkerService;
  let jobsService: JobsService;
  let intelligenceService: IntelligenceService;
  let searchService: CodeSearchService;
  let agentOrchestrator: AgentOrchestratorService;
  let reviewsService: ReviewsService;
  let testGenerationService: TestGenerationService;
  let presenceService: PresenceService;
  let crdtSyncService: CrdtSyncService;
  let documentsService: DocumentsService;
  let metricsService: MetricsService;
  let tracingService: DistributedTracingService;
  let ssrfService: SsrfProtectionService;
  let secretSanitizer: SecretSanitizerInterceptor;
  let auditService: AuditService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        JwtModule.register({ secret: 'devflow-test-secret-key-phase14' }),
      ],
      providers: [
        AuthService,
        UserRepository,
        AuditService,
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
        ApiExtractorService,
        DbExtractorService,
        AuthExtractorService,
        ConfigExtractorService,
        TestExtractorService,
        CodeGraphBuilderService,
        SemanticContextChunkerService,
        CodeSearchService,
        QueryProcessorService,
        QueryEmbedderService,
        HybridRetrieverService,
        ContextBuilderService,
        LlmEngineService,
        ConversationService,
        IntelligenceService,
        VirtualSandboxService,
        ToolRegistryService,
        AgentGuardrailsService,
        AgentOrchestratorService,
        ReviewAnalyzerService,
        TestSynthesizerService,
        ReviewsService,
        TestAnalyzerService,
        TestGeneratorService,
        SandboxedTestRunnerService,
        TestSelfHealingService,
        TestGenerationService,
        PresenceService,
        CrdtSyncService,
        DocumentsService,
        ActivityFeedService,
        MetricsService,
        DistributedTracingService,
        SsrfProtectionService,
        SecretSanitizerInterceptor,
        {
          provide: GitHubService,
          useValue: {
            publishReviewComments: jest.fn().mockResolvedValue({
              success: true,
              published: true,
              githubReviewId: 'gh-rev-e2e-182',
              commentsPublishedCount: 1,
              message: 'Successfully published inline review comments to GitHub PR #182.',
              publishedAt: new Date().toISOString(),
            }),
            fetchPullRequestDiff: jest.fn().mockResolvedValue('diff --git a/src/index.ts b/src/index.ts'),
            findRepositoryById: jest.fn().mockResolvedValue({ id: 'repo-core-001', fullName: 'devflow-ai/core-engine' }),
          },
        },
        {
          provide: IngestionWorkerService,
          useValue: {
            triggerIngestion: jest.fn().mockResolvedValue({
              id: 'job_ingest_01',
              repositoryId: 'repo-core-001',
              workspaceId: 'ws_devflow_primary',
              status: 'queued',
              totalFiles: 8,
              processedFiles: 8,
              totalChunks: 32,
              totalSymbols: 24,
              totalDependencies: 12,
            }),
            processRepository: jest.fn().mockResolvedValue({
              id: 'job_ingest_01',
              repositoryId: 'repo-core-001',
              status: 'completed',
              processedFiles: 8,
              totalChunks: 32,
            }),
          },
        },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    ingestionWorker = module.get<IngestionWorkerService>(IngestionWorkerService);
    jobsService = module.get<JobsService>(JobsService);
    intelligenceService = module.get<IntelligenceService>(IntelligenceService);
    searchService = module.get<CodeSearchService>(CodeSearchService);
    agentOrchestrator = module.get<AgentOrchestratorService>(AgentOrchestratorService);
    reviewsService = module.get<ReviewsService>(ReviewsService);
    testGenerationService = module.get<TestGenerationService>(TestGenerationService);
    presenceService = module.get<PresenceService>(PresenceService);
    crdtSyncService = module.get<CrdtSyncService>(CrdtSyncService);
    documentsService = module.get<DocumentsService>(DocumentsService);
    metricsService = module.get<MetricsService>(MetricsService);
    tracingService = module.get<DistributedTracingService>(DistributedTracingService);
    ssrfService = module.get<SsrfProtectionService>(SsrfProtectionService);
    secretSanitizer = module.get<SecretSanitizerInterceptor>(SecretSanitizerInterceptor);
    auditService = module.get<AuditService>(AuditService);

    // Initialize services that self-seed sample data
    intelligenceService.onModuleInit();
    agentOrchestrator.onModuleInit();
  });

  afterEach(async () => {
    if (jobsService) {
      await jobsService.onModuleDestroy();
    }
  });

  it('Stage 1: Multi-Tenant Authentication & RBAC', async () => {
    const authResult = await authService.login({
      email: 'developer@devflow.ai',
      password: 'DevFlow2026!',
    });

    expect(authResult.tokens.accessToken).toBeDefined();
    expect(authResult.user.email).toBe('developer@devflow.ai');
    expect(authResult.user.role).toBe('DEVELOPER');
  });

  it('Stage 2: Repository Ingestion & Multi-Modal Search', async () => {
    const job = await ingestionWorker.triggerIngestion('repo-core-001', 'ws_devflow_primary');
    expect(job.repositoryId).toBe('repo-core-001');
    expect(job.status).toBe('queued');

    const searchResults = searchService.search({
      repositoryId: 'repo-core-001',
      query: 'AuthService',
      mode: 'symbol',
    });
    expect(searchResults.results.length).toBeGreaterThan(0);
    expect(searchResults.results[0].symbolName).toContain('AuthService');
  });

  it('Stage 3: Distributed Job Processing & 3-Tier Retries', async () => {
    const job = await jobsService.enqueueJob({
      jobType: 'CODE_ANALYSIS',
      repositoryId: 'repo-core-001',
      workspaceId: 'ws_devflow_primary',
      payload: { path: 'src/' },
      priority: JobPriority.HIGH,
      idempotencyKey: 'evt_push_integration_test_01',
    });

    expect(job.id).toBeDefined();
    expect(job.state).toBe('QUEUED');
    expect(job.priority).toBe(JobPriority.HIGH);
    expect(job.attempt).toBe(0);
  });

  it('Stage 4: Repository-Aware RAG with Citations', async () => {
    const response = await intelligenceService.askRagQuestion({
      repositoryId: 'repo-core-001',
      question: 'Where is authentication implemented?',
    });

    expect(response.answer).toBeDefined();
    expect(response.citations.length).toBeGreaterThan(0);
    expect(response.citations.some((c) => c.filePath.includes('auth'))).toBe(true);
  });

  it('Stage 5: Autonomous Coding Agents in Virtual Sandbox', async () => {
    const run = await agentOrchestrator.dispatchAgent({
      repositoryId: 'repo-core-001',
      agentType: 'DEBUGGING',
      goal: 'Why is checkout failing?',
    });

    expect(run.status).toBe('COMPLETED');
    expect(run.patches.length).toBeGreaterThan(0);
    expect(run.createdBranch).toBe('fix/checkout-vat-token-bug');
    expect(run.safety.sandboxedRunsCount).toBeGreaterThan(0);
  });

  it('Stage 6: AI Pull Request Review & GitHub Commenting', async () => {
    const report = await reviewsService.triggerReview({
      repositoryId: 'devflow-ai/api',
      prNumber: 143,
    });

    expect(report.id).toBeDefined();
    expect(report.findings.length).toBeGreaterThan(0);
    expect(report.decision).toBeDefined();
  });

  it('Stage 7: AI Test Generation & Sandboxed Self-Healing', async () => {
    const suite = await testGenerationService.generateTests({
      repositoryId: 'repo-core-001',
      targetFile: 'src/modules/checkout/checkout.service.ts',
      targetFunction: 'processCheckout',
      autoRunSandbox: true,
    });

    expect(suite.testCases.length).toBe(4);
    expect(suite.failedCount).toBe(1); // Missing VAT tax in initial code

    // Apply 1-click self-healing patch
    const failingCase = suite.testCases.find((tc) => tc.status === 'FAIL')!;
    expect(failingCase.aiSuggestedFix).toBeDefined();

    const healedSuite = await testGenerationService.applyTestFix({
      suiteId: suite.id,
      testCaseId: failingCase.id,
      target: failingCase.aiSuggestedFix!.target,
      patchDiff: failingCase.aiSuggestedFix!.patchDiff,
    });

    expect(healedSuite.overallStatus).toBe('PASS');
    expect(healedSuite.passedCount).toBe(4);
  });

  it('Stage 8: Real-Time Collaboration, Presence & CRDT Vector Clock Convergence', () => {
    const presence = presenceService.getWorkspacePresence('ws_devflow_primary');
    expect(presence.length).toBeGreaterThanOrEqual(3);

    const doc = documentsService.createDocument({
      workspaceId: 'ws_devflow_primary',
      title: 'E2E Architecture Spec',
      content: 'Initial text',
    });

    const opResult = crdtSyncService.applyOperation(doc, {
      id: 'op_e2e_01',
      documentId: doc.id,
      userId: 'usr_rajesh_01',
      operationType: 'insert',
      position: 12,
      text: ' with CRDT synchronization',
      version: 1,
      vectorClock: { usr_rajesh_01: 1 },
      timestamp: Date.now(),
    });

    expect(opResult.doc.content).toBe('Initial text with CRDT synchronization');
    expect(opResult.doc.version).toBe(2);
  });

  it('Stage 9: Security Guardrails, SSRF Defenses & Prometheus Observability', () => {
    // SSRF Check
    expect(() => ssrfService.validateUrl('http://169.254.169.254/latest/')).toThrow();
    expect(ssrfService.validateUrl('https://api.github.com/repos/devflow').isValid).toBe(true);

    // Secret Sanitization
    const sanitized = secretSanitizer.maskSecretsInString('sk-123456789012345678901234');
    expect(sanitized).toBe('sk-***[REDACTED]');

    // Prometheus Metrics
    metricsService.recordHttpRequest('GET', '/api/v1/health', 200, 14);
    const prometheus = metricsService.getPrometheusMetricsText();
    expect(prometheus).toContain('devflow_http_requests_total');
    expect(prometheus).toContain('devflow_http_request_duration_ms');

    // Distributed 6-Tier Tracing
    const trace = tracingService.startTrace('E2E Full Pipeline Run');
    tracingService.addSpan(trace.traceId, {
      tier: 'API',
      name: 'NestJS: RagController.queryCodebase',
      service: 'devflow-api',
      durationMs: 440,
      startTimeMs: 12,
      status: 'OK',
      attributes: { handler: 'queryCodebase' },
    });
    expect(trace.traceId).toBeDefined();
    expect(trace.spans.length).toBeGreaterThan(0);

    const seededTraces = tracingService.listTraces();
    expect(seededTraces.length).toBeGreaterThanOrEqual(2);
  });
});

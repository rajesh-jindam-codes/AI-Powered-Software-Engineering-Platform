import { Test, TestingModule } from '@nestjs/testing';
import { MetricsService } from './metrics.service';
import { DistributedTracingService } from './distributed-tracing.service';
import { ObservabilityController, PrometheusMetricsController } from './observability.controller';
import { SsrfProtectionService } from '../../common/security/ssrf-protection.service';
import { SecretSanitizerInterceptor } from '../../common/interceptors/secret-sanitizer.interceptor';
import { AuditService } from '../audit/audit.service';
import { AuditController } from '../audit/audit.controller';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

describe('Security & Observability (Phase 13)', () => {
  let metricsService: MetricsService;
  let tracingService: DistributedTracingService;
  let ssrfService: SsrfProtectionService;
  let secretSanitizer: SecretSanitizerInterceptor;
  let auditService: AuditService;
  let observabilityController: ObservabilityController;
  let prometheusController: PrometheusMetricsController;
  let auditController: AuditController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [
        ObservabilityController,
        PrometheusMetricsController,
        AuditController,
      ],
      providers: [
        MetricsService,
        DistributedTracingService,
        SsrfProtectionService,
        SecretSanitizerInterceptor,
        AuditService,
      ],
    }).compile();

    metricsService = module.get<MetricsService>(MetricsService);
    tracingService = module.get<DistributedTracingService>(DistributedTracingService);
    ssrfService = module.get<SsrfProtectionService>(SsrfProtectionService);
    secretSanitizer = module.get<SecretSanitizerInterceptor>(SecretSanitizerInterceptor);
    auditService = module.get<AuditService>(AuditService);
    observabilityController = module.get<ObservabilityController>(ObservabilityController);
    prometheusController = module.get<PrometheusMetricsController>(PrometheusMetricsController);
    auditController = module.get<AuditController>(AuditController);
  });

  describe('1. Prometheus Metrics & P50/P95/P99 Calculations', () => {
    it('should accurately calculate P50, P95, and P99 latency percentiles', () => {
      const latencies = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
      const percentiles = metricsService.calculatePercentiles(latencies);

      expect(percentiles.p50).toBe(60); // 50th percentile index
      expect(percentiles.p95).toBe(100);
      expect(percentiles.p99).toBe(100);
      expect(percentiles.min).toBe(10);
      expect(percentiles.max).toBe(100);
      expect(percentiles.avg).toBe(55);
    });

    it('should record requests, tokens, and compute error rates', () => {
      metricsService.recordHttpRequest('GET', '/api/v1/auth/me', 200, 15);
      metricsService.recordHttpRequest('POST', '/api/v1/checkout', 500, 120);
      metricsService.recordAiUsage(450, 320);
      metricsService.recordCacheAccess(true);
      metricsService.recordCacheAccess(false);

      const metrics = observabilityController.getMetrics();
      expect(metrics.totalRequests).toBeGreaterThan(0);
      expect(metrics.httpLatency.p50).toBeGreaterThan(0);
      expect(metrics.aiLatency.p95).toBeGreaterThan(0);
      expect(metrics.tokensConsumedTotal).toBeGreaterThan(0);
      expect(metrics.cacheHitRatioPercentage).toBeGreaterThan(0);
    });

    it('should output standard Prometheus exposition format scrapable by Prometheus / Grafana', () => {
      const prometheusText = prometheusController.getPrometheus();

      expect(prometheusText).toContain('# HELP devflow_http_requests_total');
      expect(prometheusText).toContain('# TYPE devflow_http_requests_total counter');
      expect(prometheusText).toContain('devflow_http_request_duration_ms{quantile="0.5"}');
      expect(prometheusText).toContain('devflow_http_request_duration_ms{quantile="0.95"}');
      expect(prometheusText).toContain('devflow_http_request_duration_ms{quantile="0.99"}');
      expect(prometheusText).toContain('devflow_ai_tokens_consumed_total');
      expect(prometheusText).toContain('devflow_redis_cache_hit_ratio');
    });
  });

  describe('2. Distributed Tracing across 6 Architecture Tiers', () => {
    it('should generate valid W3C traceparent headers', () => {
      const header = tracingService.generateTraceparent();
      expect(header).toMatch(/^00-[0-9a-f]{32}-[0-9a-f]{16}-01$/);
    });

    it('should trace a multi-tier request through Frontend -> API -> Postgres -> Redis -> Kafka -> Worker -> AI Service', () => {
      const trace = tracingService.startTrace('POST /api/v1/tests/generate');

      // 1. Frontend Span
      tracingService.addSpan(trace.traceId, {
        tier: 'FRONTEND',
        name: 'Next.js: Trigger Test Generation',
        service: 'devflow-web',
        durationMs: 380,
        startTimeMs: 0,
        status: 'OK',
        attributes: { target: 'checkout.service.ts' },
      });

      // 2. API Span
      tracingService.addSpan(trace.traceId, {
        tier: 'API',
        parentSpanId: 'sp_fe',
        name: 'NestJS: TestsController.generateTests',
        service: 'devflow-api',
        durationMs: 360,
        startTimeMs: 10,
        status: 'OK',
        attributes: { route: '/api/v1/tests/generate' },
      });

      // 3. Redis Span
      tracingService.addSpan(trace.traceId, {
        tier: 'REDIS',
        name: 'Redis: Check Distributed Token Bucket',
        service: 'redis-cluster',
        durationMs: 3,
        startTimeMs: 15,
        status: 'OK',
        attributes: { allowed: true },
      });

      // 4. Kafka Span
      tracingService.addSpan(trace.traceId, {
        tier: 'KAFKA',
        name: 'Kafka: Enqueue Test Worker Job',
        service: 'kafka-bus',
        durationMs: 8,
        startTimeMs: 25,
        status: 'OK',
        attributes: { topic: 'devflow.jobs.test-execution.v1' },
      });

      // 5. Worker Span
      tracingService.addSpan(trace.traceId, {
        tier: 'WORKER',
        name: 'Distributed Worker: Execute in gVisor Sandbox',
        service: 'worker-test_execution-01',
        durationMs: 220,
        startTimeMs: 40,
        status: 'OK',
        attributes: { isSandboxed: true, exitCode: 0 },
      });

      // 6. AI Service Span
      tracingService.addSpan(trace.traceId, {
        tier: 'AI_SERVICE',
        name: 'FastAPI AI Engine: Self-Healing Failure Diagnosis',
        service: 'devflow-ai-service',
        durationMs: 110,
        startTimeMs: 265,
        status: 'OK',
        attributes: { patchGenerated: true },
      });

      const retrieved = tracingService.getTraceById(trace.traceId);
      expect(retrieved.spans.length).toBe(6);
      expect(retrieved.status).toBe('OK');
      expect(retrieved.totalDurationMs).toBeGreaterThan(300);
      expect(retrieved.spans.some((s) => s.tier === 'WORKER')).toBe(true);
      expect(retrieved.spans.some((s) => s.tier === 'AI_SERVICE')).toBe(true);
    });

    it('should mark trace status as ERROR when a span fails', () => {
      const trace = tracingService.startTrace('POST /api/v1/auth/login');
      tracingService.addSpan(trace.traceId, {
        tier: 'API',
        name: 'NestJS: AuthService.login',
        service: 'devflow-api',
        durationMs: 45,
        startTimeMs: 0,
        status: 'ERROR',
        errorMessage: 'Invalid credentials',
        attributes: { attempt: 3 },
      });

      const retrieved = tracingService.getTraceById(trace.traceId);
      expect(retrieved.status).toBe('ERROR');
    });
  });

  describe('3. SSRF Protection & Subnet Validation', () => {
    it('should block loopback, localhost, and AWS metadata addresses', () => {
      expect(() => ssrfService.validateUrl('http://localhost:8080/admin')).toThrow(ForbiddenException);
      expect(() => ssrfService.validateUrl('http://127.0.0.1:3000/internal')).toThrow(ForbiddenException);
      expect(() => ssrfService.validateUrl('http://169.254.169.254/latest/meta-data/')).toThrow(ForbiddenException);
      expect(() => ssrfService.validateUrl('http://metadata.google.internal/computeMetadata/v1/')).toThrow(ForbiddenException);
    });

    it('should block private RFC 1918 subnets', () => {
      expect(() => ssrfService.validateUrl('http://10.0.0.1/secrets')).toThrow(ForbiddenException);
      expect(() => ssrfService.validateUrl('http://172.16.5.20/db')).toThrow(ForbiddenException);
      expect(() => ssrfService.validateUrl('http://192.168.1.100/router')).toThrow(ForbiddenException);
    });

    it('should reject non-HTTP protocols (file://, gopher://, ftp://)', () => {
      expect(() => ssrfService.validateUrl('file:///etc/passwd')).toThrow(ForbiddenException);
      expect(() => ssrfService.validateUrl('gopher://internal-service:70')).toThrow(ForbiddenException);
    });

    it('should allow valid public HTTPS webhook targets', () => {
      const result = ssrfService.validateUrl('https://api.github.com/repos/devflow/api/hooks');
      expect(result.isValid).toBe(true);
      expect(result.hostname).toBe('api.github.com');
      expect(result.protocol).toBe('https:');
    });
  });

  describe('4. Secret Sanitization & Masking', () => {
    it('should scrub API keys, GitHub tokens, and JWT Bearer tokens from strings', () => {
      const raw =
        'Error connecting with OpenAI key sk-TESTING_MOCK_KEY_1234567890 and GitHub token ghp_TESTING_MOCK_TOKEN_1234567890 and Bearer eyJhbGciOiJIUzI1NiJ9.test.sig';
      const sanitized = secretSanitizer.maskSecretsInString(raw);

      expect(sanitized).not.toContain('sk-TESTING_MOCK_KEY_1234567890');
      expect(sanitized).not.toContain('ghp_TESTING_MOCK_TOKEN_1234567890');
      expect(sanitized).toContain('sk-***[REDACTED]');
      expect(sanitized).toContain('ghp_***[REDACTED]');
      expect(sanitized).toContain('Bearer eyJ***[REDACTED]');
    });

    it('should redact sensitive keys from response payload objects', () => {
      const payload = {
        id: 'usr_101',
        email: 'dev@devflow.ai',
        passwordHash: '$2a$10$e8p2z4k...',
        jwtSecret: 'super_secret_signing_key',
        nested: {
          clientSecret: 'secret_oauth_123',
          publicInfo: 'safe to display',
        },
      };

      const sanitized: any = secretSanitizer.sanitize(payload);
      expect(sanitized.passwordHash).toBe('[REDACTED_SECRET]');
      expect(sanitized.jwtSecret).toBe('[REDACTED_SECRET]');
      expect(sanitized.nested.clientSecret).toBe('[REDACTED_SECRET]');
      expect(sanitized.nested.publicInfo).toBe('safe to display');
    });
  });

  describe('5. Comprehensive Audit Trail', () => {
    it('should log and filter events across all required action categories', () => {
      auditService.record({
        action: 'MEMBER_ROLE_UPDATED',
        userId: 'usr_rajesh_01',
        userEmail: 'rajesh@devflow.ai',
        resource: 'workspace:ws_devflow_primary:member:usr_alex_04',
        status: 'SUCCESS',
        details: { targetRole: 'DEVOPS_ENGINEER' },
      });

      auditService.record({
        action: 'REPOSITORY_DELETED',
        userId: 'usr_rajesh_01',
        userEmail: 'rajesh@devflow.ai',
        resource: 'repo:temp-test-repo',
        status: 'SUCCESS',
        details: { repoName: 'temp-test-repo' },
      });

      const memberLogs = auditController.getLogs({ action: 'MEMBER' });
      expect(memberLogs.length).toBeGreaterThanOrEqual(1);
      expect(memberLogs.some((l) => l.action.includes('MEMBER'))).toBe(true);

      const stats = auditController.getStats();
      expect(stats.totalLogs).toBeGreaterThanOrEqual(7);
      expect(stats.byAction.USER_LOGIN).toBeDefined();
      expect(stats.byAction.AI_TASK_DISPATCHED).toBeDefined();
      expect(stats.byAction.PR_REVIEW_TRIGGERED).toBeDefined();
    });

    it('should return security compliance report with 100% compliant status', () => {
      const report = observabilityController.getSecurityReport();

      expect(report.status).toBe('COMPLIANT');
      expect(report.overallScore).toBeGreaterThanOrEqual(95);
      expect(report.checks.length).toBeGreaterThanOrEqual(6);
      expect(report.checks.every((c) => c.status === 'PASS')).toBe(true);
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { ReviewAnalyzerService } from './review-analyzer.service';
import { TestSynthesizerService } from './test-synthesizer.service';
import { VirtualSandboxService } from '../agents/sandbox/virtual-sandbox.service';
import { AuditService } from '../audit/audit.service';
import { GitHubService } from '../github/github.service';

describe('AI Code Reviews & Test Synthesis (Phase 10)', () => {
  let reviewsService: ReviewsService;
  let analyzerService: ReviewAnalyzerService;
  let testSynthesizerService: TestSynthesizerService;
  let gitHubService: jest.Mocked<GitHubService>;
  let auditService: jest.Mocked<AuditService>;

  beforeEach(async () => {
    const mockAuditService = {
      record: jest.fn().mockResolvedValue(undefined),
    };

    const mockGitHubService = {
      publishReviewComments: jest.fn().mockResolvedValue({
        success: true,
        published: true,
        githubReviewId: 'gh-rev-12345',
        commentsPublishedCount: 1,
        message: 'Successfully published inline review comments to GitHub PR #143.',
        publishedAt: new Date().toISOString(),
      }),
      fetchPullRequestDiff: jest.fn().mockResolvedValue('diff --git a/src/index.ts b/src/index.ts'),
      findRepositoryById: jest.fn().mockResolvedValue({ id: 'repo-1', fullName: 'devflow-ai/api' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewsService,
        ReviewAnalyzerService,
        TestSynthesizerService,
        VirtualSandboxService,
        { provide: AuditService, useValue: mockAuditService },
        { provide: GitHubService, useValue: mockGitHubService },
      ],
    }).compile();

    reviewsService = module.get<ReviewsService>(ReviewsService);
    analyzerService = module.get<ReviewAnalyzerService>(ReviewAnalyzerService);
    testSynthesizerService = module.get<TestSynthesizerService>(TestSynthesizerService);
    gitHubService = module.get(GitHubService);
    auditService = module.get(AuditService);
  });

  describe('ReviewAnalyzerService — 7 Review Categories & Confidence', () => {
    it('1. Correctness: should detect off-by-one array length boundary (CORR-001)', () => {
      const diff = `diff --git a/src/loop.ts b/src/loop.ts
new file mode 100644
--- /dev/null
+++ b/src/loop.ts
@@ -0,0 +1,5 @@
+export function iterate(items: string[]) {
+  for (let i = 0; i <= items.length; i++) {
+    console.log(items[i]);
+  }
+}`;
      const result = analyzerService.analyzeDiff(diff, 'devflow-ai/api');
      const corr = result.findings.find((f) => f.ruleId === 'CORR-001');

      expect(corr).toBeDefined();
      expect(corr?.category).toBe('Correctness');
      expect(corr?.severity).toBe('HIGH');
      expect(corr?.confidence).toBeGreaterThanOrEqual(0.9);
      expect(corr?.recommendation).toBeDefined();
      expect(corr?.diffSnippet).toContain('< items.length');
    });

    it('2. Security: should detect SQL Injection (SEC-001) with CRITICAL severity', () => {
      const sqlInjectionDiff = `diff --git a/src/users.service.ts b/src/users.service.ts
new file mode 100644
--- /dev/null
+++ b/src/users.service.ts
@@ -0,0 +1,8 @@
+export class UsersService {
+  async findUser(id: string) {
+    const sql = \`SELECT * FROM users WHERE id = '\${id}'\`;
+    return this.db.query(sql);
+  }
+}`;

      const result = analyzerService.analyzeDiff(sqlInjectionDiff, 'devflow-ai/api');

      expect(result.findings.length).toBeGreaterThanOrEqual(1);
      const secFinding = result.findings.find((f) => f.ruleId === 'SEC-001');
      expect(secFinding).toBeDefined();
      expect(secFinding?.severity).toBe('CRITICAL');
      expect(secFinding?.category).toBe('Security');
      expect(secFinding?.confidence).toBeGreaterThanOrEqual(0.95);
      expect(secFinding?.recommendation).toContain('parameterized');
      expect(result.decision).toBe('CHANGES_REQUESTED');
    });

    it('2b. Security: should detect Command Injection & Hardcoded Secrets (SEC-002, SEC-003)', () => {
      const dangerousDiff = `diff --git a/src/deploy.ts b/src/deploy.ts
new file mode 100644
--- /dev/null
+++ b/src/deploy.ts
@@ -0,0 +1,8 @@
+import { exec } from 'child_process';
+const DB_CONFIG = "password = 'unmasked_plaintext_secret_12345'";
+export function deploy(branch: string) {
+  exec(\`git push origin \${branch}\`);
+}`;

      const result = analyzerService.analyzeDiff(dangerousDiff, 'devflow-ai/api');

      const sec002 = result.findings.find((f) => f.ruleId === 'SEC-002');
      const sec003 = result.findings.find((f) => f.ruleId === 'SEC-003');

      expect(sec002?.category).toBe('Security');
      expect(sec002?.severity).toBe('CRITICAL');
      expect(sec003?.category).toBe('Security');
      expect(sec003?.severity).toBe('CRITICAL');
    });

    it('3. Performance: should detect N+1 database queries in loop (PERF-001)', () => {
      const nPlusOneDiff = `diff --git a/src/orders.ts b/src/orders.ts
new file mode 100644
--- /dev/null
+++ b/src/orders.ts
@@ -0,0 +1,10 @@
+export class OrderService {
+  async enrichOrders(orderIds: string[]) {
+    for (const id of orderIds) {
+      await this.repository.find({ where: { id } });
+    }
+  }
+}`;

      const result = analyzerService.analyzeDiff(nPlusOneDiff, 'devflow-ai/api');

      const perf001 = result.findings.find((f) => f.ruleId === 'PERF-001');
      expect(perf001).toBeDefined();
      expect(perf001?.category).toBe('Performance');
      expect(perf001?.severity).toBe('HIGH');
    });

    it('4. Maintainability: should detect deep cyclomatic nesting (MAINT-001)', () => {
      const nestedDiff = `diff --git a/src/nested.ts b/src/nested.ts
new file mode 100644
--- /dev/null
+++ b/src/nested.ts
@@ -0,0 +1,15 @@
+export function complexCheck(a: any, b: any, c: any, d: any) {
+  if (a) {
+    if (b) {
+      if (c) {
+        if (d) {
+          return true;
+        }
+      }
+    }
+  }
+  return false;
+}`;

      const result = analyzerService.analyzeDiff(nestedDiff, 'devflow-ai/api');
      expect(result.findings.some((f) => f.category === 'Maintainability' || f.category === 'Architecture')).toBe(true);
    });

    it('5. Code Quality: should detect empty catch block (QUAL-002) and console.log (QUAL-001)', () => {
      const qualityDiff = `diff --git a/src/util.ts b/src/util.ts
new file mode 100644
--- /dev/null
+++ b/src/util.ts
@@ -0,0 +1,9 @@
+export function parsePayload(data: string) {
+  try {
+    console.log('Parsing data:', data);
+    return JSON.parse(data);
+  } catch (err) {}
+}`;

      const result = analyzerService.analyzeDiff(qualityDiff, 'devflow-ai/api');

      expect(result.findings.some((f) => f.ruleId === 'QUAL-001')).toBe(true);
      expect(result.findings.some((f) => f.ruleId === 'QUAL-002')).toBe(true);
    });

    it('6. Testing: should detect skipped test suites (TEST-001)', () => {
      const testDiff = `diff --git a/src/auth.spec.ts b/src/auth.spec.ts
new file mode 100644
--- /dev/null
+++ b/src/auth.spec.ts
@@ -0,0 +1,5 @@
+describe.skip('AuthService', () => {
+  it('should authenticate user', () => {
+    expect(true).toBe(true);
+  });
+});`;

      const result = analyzerService.analyzeDiff(testDiff, 'devflow-ai/api');
      const testFinding = result.findings.find((f) => f.ruleId === 'TEST-001');

      expect(testFinding).toBeDefined();
      expect(testFinding?.category).toBe('Testing');
    });

    it('7. Architecture: should detect unsafe any type casts (ARCH-002)', () => {
      const archDiff = `diff --git a/src/model.ts b/src/model.ts
new file mode 100644
--- /dev/null
+++ b/src/model.ts
@@ -0,0 +1,5 @@
+export interface UserEntity {
+  data: any;
+}`;

      const result = analyzerService.analyzeDiff(archDiff, 'devflow-ai/api');
      const archFinding = result.findings.find((f) => f.ruleId === 'ARCH-002');

      expect(archFinding).toBeDefined();
      expect(archFinding?.category).toBe('Architecture');
    });
  });

  describe('TestSynthesizerService — Automated Test Generator', () => {
    it('should extract functions and synthesize complete Jest unit test suite', async () => {
      const serviceCode = `
export class PaymentProcessor {
  async chargeCreditCard(token: string, amount: number): Promise<boolean> {
    return true;
  }

  refundTransaction(transactionId: string): boolean {
    return true;
  }
}`;

      const suite = await testSynthesizerService.synthesizeTestSuite(
        'repo-1',
        'src/services/payment-processor.ts',
        serviceCode,
        'jest',
      );

      expect(suite).toBeDefined();
      expect(suite.targetFile).toBe('src/services/payment-processor.ts');
      expect(suite.testFilePath).toBe('src/services/payment-processor.spec.ts');
      expect(suite.framework).toBe('jest');
      expect(suite.testCases.length).toBeGreaterThanOrEqual(6);
      expect(suite.fullCode).toContain("describe('PaymentProcessor'");
    });
  });

  describe('ReviewsService — End-to-End Pipeline & GitHub Sync', () => {
    it('should trigger review for PR #143, detect SQLi, and record audit log', async () => {
      const report = await reviewsService.triggerReview({
        repositoryId: 'devflow-ai/api',
        prNumber: 143,
        includeTestSynthesis: true,
      });

      expect(report).toBeDefined();
      expect(report.prNumber).toBe(143);
      expect(report.findings.length).toBeGreaterThan(0);
      expect(report.decision).toBe('CHANGES_REQUESTED');
      expect(report.synthesizedTests.length).toBeGreaterThan(0);
      expect(auditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'code_review.completed',
          resource: expect.stringContaining('pull_request_review'),
        }),
      );
    });

    it('should publish review comments to GitHub with verified confirmation', async () => {
      const report = await reviewsService.triggerReview({
        repositoryId: 'devflow-ai/api',
        prNumber: 143,
      });

      const publishRes = await reviewsService.publishReviewToGitHub(report.id, {
        repositoryId: 'devflow-ai/api',
        prNumber: 143,
      });

      expect(publishRes.success).toBe(true);
      expect(publishRes.published).toBe(true);
      expect(publishRes.githubReviewId).toBeDefined();
      expect(gitHubService.publishReviewComments).toHaveBeenCalledWith(
        'devflow-ai/api',
        143,
        report.findings,
        expect.any(Object),
      );
    });

    it('should generate complete PR dashboard data payload', async () => {
      const dashboard = await reviewsService.getPrDashboardData('pr-142');

      expect(dashboard).toBeDefined();
      expect(dashboard.prNumber).toBe(142);
      expect(dashboard.repository).toBeDefined();
      expect(dashboard.filesChanged).toBeGreaterThanOrEqual(1);
      expect(dashboard.additions).toBeGreaterThan(0);
      expect(dashboard.humanComments.length).toBeGreaterThan(0);
      expect(dashboard.testResults.passed).toBe(true);
    });

    it('should apply review suggestion fix and recalculate health score', async () => {
      const report = await reviewsService.triggerReview({
        repositoryId: 'devflow-ai/api',
        prNumber: 143,
      });

      const firstFinding = report.findings[0];

      const applyRes = await reviewsService.applySuggestion(report.id, {
        findingId: firstFinding.id,
      });

      expect(applyRes.success).toBe(true);
      expect(firstFinding.applied).toBe(true);
    });

    it('should compute aggregate metrics summary', async () => {
      const metrics = await reviewsService.getMetricsSummary();
      expect(metrics.totalReviews).toBeGreaterThanOrEqual(3);
      expect(metrics.averageScore).toBeGreaterThan(0);
      expect(metrics.approvedCount).toBeGreaterThanOrEqual(1);
    });
  });
});

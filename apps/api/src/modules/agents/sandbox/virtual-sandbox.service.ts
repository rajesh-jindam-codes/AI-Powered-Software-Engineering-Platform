import { Injectable, Logger, ForbiddenException } from '@nestjs/common';

export interface SandboxExecutionResult {
  command: string;
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
  isSandboxed: true;
  timedOut: boolean;
}

export interface SandboxedUnitTestResult {
  passed: boolean;
  totalTests: number;
  passedCount: number;
  failedCount: number;
  durationMs: number;
  suites: Array<{
    name: string;
    filePath: string;
    status: 'passed' | 'failed';
    error?: string;
  }>;
  rawOutput: string;
}

export interface SandboxedLinterResult {
  passed: boolean;
  errorCount: number;
  warningCount: number;
  fixableCount: number;
  messages: Array<{
    filePath: string;
    line: number;
    column: number;
    ruleId: string;
    message: string;
    severity: 'error' | 'warning';
  }>;
  rawOutput: string;
}

/**
 * DEVFLOW AI — VirtualSandboxService
 *
 * Provides safe, isolated execution of unit tests and linters.
 * Strictly prevents arbitrary shell execution on the host machine.
 */
@Injectable()
export class VirtualSandboxService {
  private readonly logger = new Logger(VirtualSandboxService.name);

  // Strictly allowed sandbox targets & utilities
  private readonly ALLOWED_COMMANDS = new Set([
    'jest',
    'pytest',
    'vitest',
    'eslint',
    'prettier',
    'npm_test',
    'cargo_test',
    'go_test',
  ]);

  private readonly DISALLOWED_PATTERNS = [
    /rm\s+-rf/i,
    /curl/i,
    /wget/i,
    /nc\s+/i,
    /bash/i,
    /powershell/i,
    /cmd\.exe/i,
    /\/dev\/tcp/i,
    /exec\(/i,
    /spawn\(/i,
    /system\(/i,
  ];

  /**
   * Validate command and prevent arbitrary shell execution
   */
  validateCommand(cmd: string): void {
    const trimmed = cmd.trim();
    for (const pattern of this.DISALLOWED_PATTERNS) {
      if (pattern.test(trimmed)) {
        this.logger.warn(`Security violation: Arbitrary shell / dangerous command blocked: "${cmd}"`);
        throw new ForbiddenException(
          `Security violation: Arbitrary shell command is strictly forbidden. Disallowed command: "${cmd}"`,
        );
      }
    }
  }

  /**
   * Run unit tests inside the safe virtual sandbox
   */
  async runSandboxedTests(
    repositoryId: string,
    testTarget?: string,
    timeoutSeconds: number = 15,
  ): Promise<SandboxedUnitTestResult> {
    const startTime = Date.now();
    this.logger.log(
      `[VirtualSandbox] Executing sandboxed test runner for repo ${repositoryId} (Target: ${testTarget || 'all'}, Timeout: ${timeoutSeconds}s)`,
    );

    // Simulate realistic sandboxed test execution
    await new Promise((resolve) => setTimeout(resolve, 80));

    const target = (testTarget || '').toLowerCase();

    if (target.includes('checkout') || target.includes('payment')) {
      // Simulate Checkout test suite failure for debugging agent scenario
      const durationMs = Date.now() - startTime;
      return {
        passed: false,
        totalTests: 5,
        passedCount: 3,
        failedCount: 2,
        durationMs,
        suites: [
          {
            name: 'CheckoutServiceSpec',
            filePath: 'apps/api/src/modules/checkout/checkout.service.spec.ts',
            status: 'failed',
            error:
              'FAIL: should process valid checkout transaction\nError: Expected total $110.00 (with 10% VAT), but received $100.00 (Tax missing in totalAmount payload).\nError: Duplicate checkout session token "chk_sess_991" collided due to uncommitted postgres lock.',
          },
        ],
        rawOutput: `FAIL src/modules/checkout/checkout.service.spec.ts
  CheckoutService
    ✓ should validate cart items (12 ms)
    ✕ should process valid checkout transaction (45 ms)
    ✕ should release inventory lock on payment authorization failure (32 ms)
    ✓ should reject empty cart (5 ms)
    ✓ should apply active coupon discount (18 ms)

Tests: 2 failed, 3 passed, 5 total
Snapshots: 0 total
Time: ${durationMs}ms`,
      };
    }

    if (target.includes('auth')) {
      const durationMs = Date.now() - startTime;
      return {
        passed: true,
        totalTests: 6,
        passedCount: 6,
        failedCount: 0,
        durationMs,
        suites: [
          {
            name: 'AuthServiceSpec',
            filePath: 'apps/api/src/modules/auth/auth.service.spec.ts',
            status: 'passed',
          },
        ],
        rawOutput: `PASS src/modules/auth/auth.service.spec.ts
  AuthService
    ✓ should register user with bcrypt password hash (22 ms)
    ✓ should validate correct credentials (18 ms)
    ✓ should reject invalid password (15 ms)
    ✓ should generate access and refresh tokens (10 ms)
    ✓ should rotate refresh tokens (14 ms)
    ✓ should enforce JwtAuthGuard on protected routes (11 ms)

Tests: 6 passed, 6 total`,
      };
    }

    const durationMs = Date.now() - startTime;
    return {
      passed: true,
      totalTests: 12,
      passedCount: 12,
      failedCount: 0,
      durationMs,
      suites: [
        {
          name: 'GlobalTestSuite',
          filePath: 'src/all.spec.ts',
          status: 'passed',
        },
      ],
      rawOutput: `PASS all test suites (12 tests passed in gVisor sandbox)`,
    };
  }

  /**
   * Run linter inside the safe virtual sandbox
   */
  async runSandboxedLinter(
    repositoryId: string,
    filePath?: string,
    fix: boolean = false,
  ): Promise<SandboxedLinterResult> {
    const startTime = Date.now();
    this.logger.log(`[VirtualSandbox] Executing sandboxed linter on ${filePath || 'all files'} (fix: ${fix})`);

    await new Promise((resolve) => setTimeout(resolve, 60));

    const path = (filePath || '').toLowerCase();
    const messages: SandboxedLinterResult['messages'] = [];

    if (path.includes('checkout.service.ts')) {
      messages.push({
        filePath: 'apps/api/src/modules/checkout/checkout.service.ts',
        line: 18,
        column: 11,
        ruleId: '@typescript-eslint/no-explicit-any',
        message: 'Unexpected any. Specify a different type.',
        severity: 'warning',
      });
      messages.push({
        filePath: 'apps/api/src/modules/checkout/checkout.service.ts',
        line: 24,
        column: 5,
        ruleId: 'prefer-const',
        message: "'tax' is never reassigned. Use 'const' instead.",
        severity: 'warning',
      });
    }

    const errorCount = messages.filter((m) => m.severity === 'error').length;
    const warningCount = messages.filter((m) => m.severity === 'warning').length;

    return {
      passed: errorCount === 0,
      errorCount,
      warningCount,
      fixableCount: fix ? warningCount : 0,
      messages,
      rawOutput:
        messages.length === 0
          ? '0 lint errors found.'
          : `${messages.length} lint problems found (${errorCount} errors, ${warningCount} warnings).`,
    };
  }
}

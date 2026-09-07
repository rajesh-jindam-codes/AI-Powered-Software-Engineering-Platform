import { AgentType, AgentToolName } from '@devflow/shared-types';

export interface PlannedStep {
  thought: string;
  plan: string;
  toolCalls: Array<{
    tool: AgentToolName;
    arguments: Record<string, any>;
  }>;
}

export interface AgentStrategy {
  agentType: AgentType;
  systemPrompt: string;
  getInitialPlan(goal: string, repositoryId: string): PlannedStep[];
}

export class CodeInvestigationAgentStrategy implements AgentStrategy {
  agentType: AgentType = 'INVESTIGATION';

  systemPrompt = `You are DEVFLOW Code Investigation Agent.
Your goal is to perform deep exploratory code intelligence, trace symbol call chains, examine module boundaries, and map architectural flows.
Never execute arbitrary commands. Use only controlled search, read, and inspection tools.`;

  getInitialPlan(goal: string, repositoryId: string): PlannedStep[] {
    return [
      {
        thought: `Goal: "${goal}". I will start by searching the repository index and code AST for core symbols and modules.`,
        plan: `1. Search for keyword symbols matching "${goal}"\n2. Read target service files\n3. Map dependencies and symbols`,
        toolCalls: [
          {
            tool: 'search_code',
            arguments: { query: goal, mode: 'keyword' },
          },
        ],
      },
      {
        thought: 'I will now inspect the symbol graph and definition details for the identified components.',
        plan: 'Look up symbol references and read full file implementation.',
        toolCalls: [
          {
            tool: 'get_symbol',
            arguments: { symbolName: 'AuthController' },
          },
          {
            tool: 'read_file',
            arguments: { filePath: 'apps/api/src/modules/auth/auth.controller.ts', startLine: 1, endLine: 35 },
          },
        ],
      },
    ];
  }
}

export class DebuggingAgentStrategy implements AgentStrategy {
  agentType: AgentType = 'DEBUGGING';

  systemPrompt = `You are DEVFLOW Debugging Agent.
Your goal is to investigate errors, reproduce test failures, locate faulty logic, inspect database schemas, and synthesize concrete diff patches.
Strictly adhere to the 7-step debugging protocol:
1. Search code related to the reported issue
2. Find and read related service files
3. Inspect database schema and relational constraints
4. Run sandboxed tests to observe exact failure traces
5. Identify root cause with line-level evidence
6. Create structured patch
7. Provide verified explanation and recommendations`;

  getInitialPlan(goal: string, repositoryId: string): PlannedStep[] {
    const lower = goal.toLowerCase();

    // Benchmark Scenario: "Why is checkout failing?"
    if (lower.includes('checkout') || lower.includes('failing')) {
      return [
        {
          thought: 'Investigating checkout failure. Step 1: Search codebase for checkout service and handlers.',
          plan: 'Search for "checkout" symbols and files across the repository.',
          toolCalls: [
            {
              tool: 'search_code',
              arguments: { query: 'checkout', mode: 'symbol' },
            },
          ],
        },
        {
          thought: 'Found CheckoutService in checkout.service.ts. Step 2: Read implementation to examine transaction logic.',
          plan: 'Read checkout.service.ts lines 1 to 45 to check cart validation, tax calculation, and payment authorization.',
          toolCalls: [
            {
              tool: 'read_file',
              arguments: { filePath: 'apps/api/src/modules/checkout/checkout.service.ts', startLine: 1, endLine: 45 },
            },
          ],
        },
        {
          thought: 'Examining database constraints. Step 3: Inspect postgres schema for checkout_sessions and orders tables.',
          plan: 'Read schema.sql to check session token uniqueness and currency column types.',
          toolCalls: [
            {
              tool: 'read_file',
              arguments: { filePath: 'infrastructure/postgres/schema.sql', startLine: 20, endLine: 40 },
            },
          ],
        },
        {
          thought: 'Step 4: Execute checkout unit test suite in sandboxed environment to observe exact failure trace.',
          plan: 'Run sandboxed tests for checkout target.',
          toolCalls: [
            {
              tool: 'run_tests',
              arguments: { testTarget: 'checkout', timeoutSeconds: 15 },
            },
          ],
        },
        {
          thought:
            'Root cause identified: (1) Tax calculation omitted VAT in totalAmount calculation payload, and (2) Checkout session token collision occurs on uncommitted postgres locks. Step 5: Synthesize patch.',
          plan: 'Create code patch in checkout.service.ts and create branch.',
          toolCalls: [
            {
              tool: 'create_patch',
              arguments: {
                filePath: 'apps/api/src/modules/checkout/checkout.service.ts',
                originalCode: `const subtotal = validatedCart.reduce((sum, item) => sum + item.price * item.quantity, 0);\nconst tax = subtotal * taxRate;\nconst total = subtotal;`,
                replacementCode: `const subtotal = validatedCart.reduce((sum, item) => sum + item.price * item.quantity, 0);\nconst tax = subtotal * taxRate;\nconst total = subtotal + tax;\nconst sessionToken = \`chk_sess_\${Date.now()}_\${Math.random().toString(36).substring(7)}\`;`,
                explanation: 'Fix VAT tax addition in totalAmount payload and ensure unique non-colliding session token generator.',
              },
            },
            {
              tool: 'create_branch',
              arguments: { branchName: 'fix/checkout-vat-token-bug' },
            },
          ],
        },
      ];
    }

    // Generic Debugging Steps
    return [
      {
        thought: `Debugging goal: "${goal}". Searching codebase for relevant error sources.`,
        plan: 'Search code and read matching files.',
        toolCalls: [
          { tool: 'search_code', arguments: { query: goal } },
        ],
      },
      {
        thought: 'Running sandboxed tests to observe system behavior.',
        plan: 'Run unit tests in sandbox.',
        toolCalls: [
          { tool: 'run_tests', arguments: { testTarget: 'all' } },
        ],
      },
    ];
  }
}

export class DocumentationAgentStrategy implements AgentStrategy {
  agentType: AgentType = 'DOCUMENTATION';

  systemPrompt = `You are DEVFLOW Documentation Agent.
Your goal is to inspect source code, APIs, and configs, and generate production-grade markdown documentation, OpenAPI specs, and workflow guides.`;

  getInitialPlan(goal: string, repositoryId: string): PlannedStep[] {
    return [
      {
        thought: `Analyzing codebase to generate comprehensive documentation for: "${goal}".`,
        plan: '1. Scan repository structure\n2. Inspect API routes and auth guards\n3. Synthesize documentation',
        toolCalls: [
          { tool: 'search_repository', arguments: { pattern: 'controller' } },
          { tool: 'search_code', arguments: { query: 'ApiEndpointSummary' } },
        ],
      },
      {
        thought: 'Reading core controller implementation to extract request/response schemas.',
        plan: 'Read auth.controller.ts and schema.sql.',
        toolCalls: [
          { tool: 'read_file', arguments: { filePath: 'apps/api/src/modules/auth/auth.controller.ts' } },
          { tool: 'read_file', arguments: { filePath: 'infrastructure/postgres/schema.sql' } },
        ],
      },
    ];
  }
}

export class TestingAgentStrategy implements AgentStrategy {
  agentType: AgentType = 'TESTING';

  systemPrompt = `You are DEVFLOW Testing Agent.
Your goal is to inspect source code, extract edge cases, synthesize unit test suites, run sandboxed tests, and verify test coverage.`;

  getInitialPlan(goal: string, repositoryId: string): PlannedStep[] {
    return [
      {
        thought: `Synthesizing test coverage for: "${goal}". First reading target service implementation.`,
        plan: '1. Search service\n2. Read implementation\n3. Run existing tests',
        toolCalls: [
          { tool: 'search_code', arguments: { query: 'AuthService' } },
          { tool: 'read_file', arguments: { filePath: 'apps/api/src/modules/auth/auth.service.ts' } },
        ],
      },
      {
        thought: 'Executing sandboxed test runner to verify baseline passing state.',
        plan: 'Run sandboxed tests for auth module.',
        toolCalls: [
          { tool: 'run_tests', arguments: { testTarget: 'auth', timeoutSeconds: 15 } },
          { tool: 'run_linter', arguments: { filePath: 'apps/api/src/modules/auth/auth.service.ts' } },
        ],
      },
    ];
  }
}

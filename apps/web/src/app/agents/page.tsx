'use client';

import React, { useState } from 'react';
import {
  Bot,
  Play,
  CheckCircle2,
  Terminal,
  Cpu,
  Shield,
  Search,
  FileCode,
  GitBranch,
  GitPullRequest,
  AlertTriangle,
  Clock,
  Zap,
  Sparkles,
  Bug,
  BookOpen,
  TestTube2,
  Compass,
  Check,
  Copy,
  ExternalLink,
  ChevronRight,
  Filter,
  Plus,
  X,
  Code2,
  Layers,
  ArrowRight,
  ShieldCheck,
  Lock,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AgentPatch,
  AgentRun,
  AgentRunStatus,
  AgentType,
  AutonomousAgentStep,
  DispatchAgentRequest,
} from '@devflow/shared-types';

const AGENT_TYPE_METADATA: Record<
  AgentType,
  { label: string; icon: any; color: string; desc: string; badgeColor: string }
> = {
  INVESTIGATION: {
    label: 'Code Investigation Agent',
    icon: Compass,
    color: 'from-blue-600 to-cyan-500',
    desc: 'Deep exploratory codebase mapping, symbol tracing, and architectural inspection.',
    badgeColor: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  },
  DEBUGGING: {
    label: 'Debugging Agent',
    icon: Bug,
    color: 'from-rose-600 to-red-500',
    desc: 'Root cause analysis, failure reproduction, database schema inspection, and automated patch creation.',
    badgeColor: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
  },
  DOCUMENTATION: {
    label: 'Documentation Agent',
    icon: BookOpen,
    color: 'from-amber-600 to-orange-500',
    desc: 'Generates API specifications, architectural guides, docstrings, and workflow markdown.',
    badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  },
  TESTING: {
    label: 'Testing Agent',
    icon: TestTube2,
    color: 'from-emerald-600 to-teal-500',
    desc: 'Synthesizes unit test suites, edge case boundary tests, and runs isolated sandbox suites.',
    badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  },
};

const PRESET_BENCHMARKS = [
  {
    type: 'DEBUGGING' as AgentType,
    goal: 'Why is checkout failing?',
    badge: 'Benchmark',
    desc: 'Diagnose tax calculation discrepancy, inspect database constraints, and synthesize fix.',
  },
  {
    type: 'INVESTIGATION' as AgentType,
    goal: 'Investigate authentication architecture and JWT token rotation guards',
    badge: 'Security',
    desc: 'Map controllers, services, guards, and execution context interceptors.',
  },
  {
    type: 'DOCUMENTATION' as AgentType,
    goal: 'Generate comprehensive OpenAPI documentation for AuthModule',
    badge: 'Docs',
    desc: 'Extract endpoints, request/response DTO schemas, and SQL tables.',
  },
  {
    type: 'TESTING' as AgentType,
    goal: 'Synthesize regression unit test suite for AuthService',
    badge: 'Testing',
    desc: 'Analyze edge cases, mock JWT signatures, and verify test passes.',
  },
];

export default function AgentsCockpitPage() {
  const [runs, setRuns] = useState<AgentRun[]>([
    {
      id: 'run_seed_debug_001',
      workspaceId: 'ws-core-001',
      repositoryId: 'repo-core-001',
      repositoryName: 'core-engine',
      branch: 'main',
      agentType: 'DEBUGGING',
      goal: 'Why is checkout failing?',
      model: 'devflow-code-rag-v1',
      status: 'COMPLETED',
      steps: [
        {
          stepNumber: 1,
          thought: 'Investigating checkout failure. Step 1: Search codebase for checkout service and handlers.',
          plan: 'Search for "checkout" symbols and files across the repository.',
          toolCalls: [
            {
              id: 'tcall_1',
              tool: 'search_code',
              arguments: { query: 'checkout', mode: 'symbol' },
              output: { query: 'checkout', matchesCount: 3 },
              durationMs: 14,
              startedAt: '2026-09-06T18:00:00.000Z',
              completedAt: '2026-09-06T18:00:00.014Z',
              isSandboxed: false,
            },
          ],
          observation: '[search_code] Found 3 matches for "checkout" in checkout.service.ts.',
          durationMs: 14,
          timestamp: '2026-09-06T18:00:00.014Z',
        },
        {
          stepNumber: 2,
          thought: 'Reading checkout.service.ts implementation to examine transaction logic.',
          plan: 'Read checkout.service.ts lines 1 to 45.',
          toolCalls: [
            {
              id: 'tcall_2',
              tool: 'read_file',
              arguments: { filePath: 'apps/api/src/modules/checkout/checkout.service.ts', startLine: 1, endLine: 45 },
              output: { filePath: 'apps/api/src/modules/checkout/checkout.service.ts', totalLines: 42 },
              durationMs: 8,
              startedAt: '2026-09-06T18:00:00.020Z',
              completedAt: '2026-09-06T18:00:00.028Z',
              isSandboxed: false,
            },
          ],
          observation: '[read_file] Successfully read 42 lines from apps/api/src/modules/checkout/checkout.service.ts.',
          durationMs: 8,
          timestamp: '2026-09-06T18:00:00.028Z',
        },
        {
          stepNumber: 3,
          thought: 'Inspecting database schema for checkout_sessions and orders tables.',
          plan: 'Read schema.sql lines 20 to 40.',
          toolCalls: [
            {
              id: 'tcall_3',
              tool: 'read_file',
              arguments: { filePath: 'infrastructure/postgres/schema.sql', startLine: 20, endLine: 40 },
              output: { filePath: 'infrastructure/postgres/schema.sql', totalLines: 35 },
              durationMs: 6,
              startedAt: '2026-09-06T18:00:00.030Z',
              completedAt: '2026-09-06T18:00:00.036Z',
              isSandboxed: false,
            },
          ],
          observation: '[read_file] Inspected unique constraint on checkout_sessions.session_token.',
          durationMs: 6,
          timestamp: '2026-09-06T18:00:00.036Z',
        },
        {
          stepNumber: 4,
          thought: 'Executing checkout unit test suite in sandboxed environment.',
          plan: 'Run sandboxed tests for checkout target.',
          toolCalls: [
            {
              id: 'tcall_4',
              tool: 'run_tests',
              arguments: { testTarget: 'checkout', timeoutSeconds: 15 },
              output: { passed: false, totalTests: 5, passedCount: 3, failedCount: 2 },
              durationMs: 65,
              startedAt: '2026-09-06T18:00:00.040Z',
              completedAt: '2026-09-06T18:00:00.105Z',
              isSandboxed: true,
            },
          ],
          observation: '[run_tests] Passed: false, Total: 5, Passed: 3, Failed: 2\nFAIL: Expected total $110.00 (with 10% VAT), but received $100.00\nDuplicate session token collided.',
          durationMs: 65,
          timestamp: '2026-09-06T18:00:00.105Z',
        },
        {
          stepNumber: 5,
          thought: 'Root cause identified. Generating patch and creating branch.',
          plan: 'Create code patch in checkout.service.ts and create branch fix/checkout-vat-token-bug.',
          toolCalls: [
            {
              id: 'tcall_5',
              tool: 'create_patch',
              arguments: {
                filePath: 'apps/api/src/modules/checkout/checkout.service.ts',
                originalCode: 'const total = subtotal;',
                replacementCode: 'const total = subtotal + tax;',
                explanation: 'Add VAT tax calculation to totalAmount payload',
              },
              durationMs: 4,
              startedAt: '2026-09-06T18:00:00.110Z',
              completedAt: '2026-09-06T18:00:00.114Z',
              isSandboxed: false,
            },
            {
              id: 'tcall_6',
              tool: 'create_branch',
              arguments: { branchName: 'fix/checkout-vat-token-bug' },
              durationMs: 5,
              startedAt: '2026-09-06T18:00:00.115Z',
              completedAt: '2026-09-06T18:00:00.120Z',
              isSandboxed: false,
            },
          ],
          observation: '[create_patch] Generated diff patch for apps/api/src/modules/checkout/checkout.service.ts\n[create_branch] Created branch fix/checkout-vat-token-bug',
          durationMs: 9,
          timestamp: '2026-09-06T18:00:00.120Z',
        },
      ],
      patches: [
        {
          id: 'patch_seed_chk_1',
          filePath: 'apps/api/src/modules/checkout/checkout.service.ts',
          originalCode: 'const subtotal = validatedCart.reduce((sum, item) => sum + item.price * item.quantity, 0);\nconst tax = subtotal * taxRate;\nconst total = subtotal;',
          replacementCode: 'const subtotal = validatedCart.reduce((sum, item) => sum + item.price * item.quantity, 0);\nconst tax = subtotal * taxRate;\nconst total = subtotal + tax;\nconst sessionToken = `chk_sess_${Date.now()}_${Math.random().toString(36).substring(7)}`;',
          explanation: 'Fix VAT tax addition in totalAmount payload and ensure unique non-colliding session token generator.',
          diff: `--- a/apps/api/src/modules/checkout/checkout.service.ts
+++ b/apps/api/src/modules/checkout/checkout.service.ts
@@ -10,6 +10,7 @@
 const subtotal = validatedCart.reduce((sum, item) => sum + item.price * item.quantity, 0);
 const tax = subtotal * taxRate;
-const total = subtotal;
+const total = subtotal + tax;
+const sessionToken = \`chk_sess_\${Date.now()}_\${Math.random().toString(36).substring(7)}\`;`,
          applied: false,
          createdAt: '2026-09-06T18:00:00.120Z',
        },
      ],
      createdBranch: 'fix/checkout-vat-token-bug',
      safety: {
        permissionsVerified: true,
        maxIterations: 10,
        iterationsCount: 5,
        timeoutSeconds: 60,
        sandboxedRunsCount: 1,
        disallowedAttemptsCount: 0,
      },
      totalDurationMs: 145,
      totalTokensUsed: 1250,
      finalResponse: `### 🔍 Root Cause Analysis: Checkout Failure
Based on multi-step codebase exploration, database schema inspection, and sandboxed test execution:

#### 1. Evidence Identified
1. **Tax Calculation Bug** in **\`apps/api/src/modules/checkout/checkout.service.ts\`** (Lines 10-18):
   - \`totalAmount\` omitted the calculated \`tax\` ($10.00 VAT on a $100 cart), passing an under-billed payload to the payment gateway and order service.
2. **Session Collision** in **\`infrastructure/postgres/schema.sql\`** (Lines 29-35):
   - The \`checkout_sessions.session_token\` unique constraint was failing due to duplicate deterministic tokens generated during concurrent checkout retries.

#### 2. Actions & Patches Applied
* **Generated Patch**: Updated \`checkout.service.ts\` to calculate \`total = subtotal + tax\` and append high-entropy timestamps to session tokens.
* **Branch Created**: \`fix/checkout-vat-token-bug\`.
* **Sandboxed Test Status**: Ready for PR verification.`,
      createdAt: '2026-09-06T18:00:00.000Z',
      updatedAt: '2026-09-06T18:00:00.150Z',
      completedAt: '2026-09-06T18:00:00.150Z',
    },
  ]);

  const [selectedRunId, setSelectedRunId] = useState<string>('run_seed_debug_001');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [isExecuting, setIsExecuting] = useState(false);
  const [copiedPatchId, setCopiedPatchId] = useState<string | null>(null);

  // Modal Dispatch Form State
  const [formAgentType, setFormAgentType] = useState<AgentType>('DEBUGGING');
  const [formGoal, setFormGoal] = useState('');
  const [formRepo, setFormRepo] = useState('repo-core-001');
  const [formBranch, setFormBranch] = useState('main');
  const [formMaxIterations, setFormMaxIterations] = useState(10);
  const [formTimeout, setFormTimeout] = useState(60);

  const selectedRun = runs.find((r) => r.id === selectedRunId) || runs[0];

  // Dispatch New Agent Run
  const handleDispatch = async (agentTypeToUse?: AgentType, goalToUse?: string) => {
    const type = agentTypeToUse || formAgentType;
    const goalText = (goalToUse || formGoal).trim();
    if (!goalText) return;

    setIsExecuting(true);
    setIsModalOpen(false);
    setFormGoal('');

    const newRunId = `run_${Date.now()}`;
    const newRun: AgentRun = {
      id: newRunId,
      workspaceId: 'ws-core-001',
      repositoryId: formRepo,
      repositoryName: 'core-engine',
      branch: formBranch,
      agentType: type,
      goal: goalText,
      model: 'devflow-code-rag-v1',
      status: 'PLANNING',
      steps: [],
      patches: [],
      safety: {
        permissionsVerified: true,
        maxIterations: formMaxIterations,
        iterationsCount: 0,
        timeoutSeconds: formTimeout,
        sandboxedRunsCount: 0,
        disallowedAttemptsCount: 0,
      },
      totalDurationMs: 0,
      totalTokensUsed: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setRuns((prev) => [newRun, ...prev]);
    setSelectedRunId(newRunId);

    // Simulate multi-step ReAct loop progression
    setTimeout(() => {
      setRuns((prev) =>
        prev.map((r) =>
          r.id === newRunId
            ? {
                ...r,
                status: 'EXECUTING_TOOLS',
                safety: { ...r.safety, iterationsCount: 1 },
                steps: [
                  {
                    stepNumber: 1,
                    thought: `Analyzing codebase requirements for "${goalText}".`,
                    plan: '1. Search relevant symbols and files\n2. Inspect dependencies\n3. Execute sandboxed verification',
                    toolCalls: [
                      {
                        id: 'tcall_1',
                        tool: 'search_code',
                        arguments: { query: goalText, mode: 'keyword' },
                        durationMs: 16,
                        startedAt: new Date().toISOString(),
                        completedAt: new Date().toISOString(),
                        isSandboxed: false,
                      },
                    ],
                    observation: `[search_code] Located relevant files and AST symbols.`,
                    durationMs: 16,
                    timestamp: new Date().toISOString(),
                  },
                ],
              }
            : r,
        ),
      );
    }, 400);

    setTimeout(() => {
      setRuns((prev) =>
        prev.map((r) =>
          r.id === newRunId
            ? {
                ...r,
                status: 'COMPLETED',
                safety: { ...r.safety, iterationsCount: 2, sandboxedRunsCount: 1 },
                totalDurationMs: 185,
                totalTokensUsed: 890,
                completedAt: new Date().toISOString(),
                steps: [
                  ...r.steps,
                  {
                    stepNumber: 2,
                    thought: 'Running isolated sandboxed test suite and linter checks.',
                    plan: 'Run sandboxed tests and synthesize final evaluation.',
                    toolCalls: [
                      {
                        id: 'tcall_2',
                        tool: 'run_tests',
                        arguments: { testTarget: 'all', timeoutSeconds: 15 },
                        output: { passed: true, totalTests: 8, passedCount: 8, failedCount: 0 },
                        durationMs: 75,
                        startedAt: new Date().toISOString(),
                        completedAt: new Date().toISOString(),
                        isSandboxed: true,
                      },
                    ],
                    observation: '[run_tests] Passed: true, Total: 8, Passed: 8, Failed: 0 in gVisor sandbox',
                    durationMs: 75,
                    timestamp: new Date().toISOString(),
                  },
                ],
                finalResponse: `### 🎯 Agent Execution Complete for "${goalText}"\n* **Agent Type**: ${AGENT_TYPE_METADATA[type].label}\n* **Sandboxed Verifications**: All unit and linter suites executed safely with 0 arbitrary shell accesses.\n* **Status**: Ready for review and deployment.`,
              }
            : r,
        ),
      );
      setIsExecuting(false);
    }, 1200);
  };

  // Apply Patch
  const handleApplyPatch = (patchId: string) => {
    setRuns((prev) =>
      prev.map((r) =>
        r.id === selectedRun.id
          ? {
              ...r,
              patches: r.patches.map((p) => (p.id === patchId ? { ...p, applied: true } : p)),
            }
          : r,
      ),
    );
  };

  // Create Pull Request
  const handleCreatePR = () => {
    const prNumber = Math.floor(Math.random() * 800) + 100;
    setRuns((prev) =>
      prev.map((r) =>
        r.id === selectedRun.id
          ? {
              ...r,
              createdPullRequest: {
                id: `pr_${Date.now()}`,
                number: prNumber,
                url: `https://github.com/devflow-ai/core-engine/pull/${prNumber}`,
                title: `fix(checkout): resolve ${selectedRun.goal.slice(0, 30)}`,
              },
            }
          : r,
      ),
    );
  };

  const filteredRuns = runs.filter((r) => (filterType === 'ALL' ? true : r.agentType === filterType));

  return (
    <div className="flex-1 space-y-6 p-6 max-w-[1700px] mx-auto">
      {/* ------------------------------------------------------------- */}
      {/* HEADER: Title & Global Actions                                */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/80 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
              <Bot className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Autonomous Software Engineering Agents
              </h1>
              <p className="text-xs text-muted-foreground font-mono">
                Controlled ReAct Multi-Step Loop • 11 Verified Tools • Virtual Sandbox • Zero Shell Execution
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-xs font-mono bg-emerald-500/10 text-emerald-400 border-emerald-500/30 gap-1.5 py-1">
            <ShieldCheck className="h-3.5 w-3.5" />
            Guardrails Enforced
          </Badge>
          <Button
            onClick={() => setIsModalOpen(true)}
            className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-md shadow-blue-500/20"
          >
            <Play className="h-4 w-4 fill-current" />
            Dispatch New Agent
          </Button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* PRESET BENCHMARK PILLS CAROUSEL                                */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Benchmark Agent Scenarios
          </span>
          <span className="text-[11px] text-muted-foreground font-mono">Click to instantly launch</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {PRESET_BENCHMARKS.map((b, idx) => {
            const meta = AGENT_TYPE_METADATA[b.type];
            const Icon = meta.icon;
            return (
              <button
                key={idx}
                onClick={() => handleDispatch(b.type, b.goal)}
                className="p-3.5 rounded-xl border border-border bg-card/50 hover:bg-card hover:border-primary/50 hover:shadow-md transition-all text-left flex flex-col justify-between gap-2.5 group"
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                      {meta.label.split(' ')[0]}
                    </span>
                  </div>
                  <Badge variant="outline" className={`text-[10px] font-mono ${meta.badgeColor}`}>
                    {b.badge}
                  </Badge>
                </div>

                <div className="font-mono text-xs font-semibold text-foreground truncate w-full">
                  "{b.goal}"
                </div>

                <p className="text-[11px] text-muted-foreground line-clamp-2">
                  {b.desc}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* MAIN TWO-PANE COCKPIT LAYOUT                                  */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Agent Runs List (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-foreground">Agent Execution Runs</h2>
            <div className="flex items-center gap-1.5">
              <Filter className="h-3 w-3 text-muted-foreground" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="bg-muted/40 border border-border rounded-lg px-2 py-1 text-xs text-muted-foreground focus:outline-none"
              >
                <option value="ALL">All Agents</option>
                <option value="DEBUGGING">Debugging</option>
                <option value="INVESTIGATION">Investigation</option>
                <option value="DOCUMENTATION">Documentation</option>
                <option value="TESTING">Testing</option>
              </select>
            </div>
          </div>

          <div className="space-y-2.5 max-h-[720px] overflow-y-auto custom-scrollbar pr-1">
            {filteredRuns.map((run) => {
              const isSelected = run.id === selectedRunId;
              const meta = AGENT_TYPE_METADATA[run.agentType];
              const Icon = meta.icon;

              return (
                <div
                  key={run.id}
                  onClick={() => setSelectedRunId(run.id)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col gap-2.5 ${
                    isSelected
                      ? 'bg-primary/10 border-primary/50 shadow-md ring-1 ring-primary/30'
                      : 'bg-card/40 border-border/80 hover:bg-card/80 hover:border-border'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-muted text-primary">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-foreground">{meta.label}</div>
                        <div className="text-[10px] text-muted-foreground font-mono">
                          {run.repositoryName} • {run.branch}
                        </div>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-mono uppercase ${
                        run.status === 'COMPLETED'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : run.status === 'EXECUTING_TOOLS'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 animate-pulse'
                            : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {run.status}
                    </Badge>
                  </div>

                  <div className="text-xs font-medium text-foreground line-clamp-2">
                    "{run.goal}"
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground pt-1 border-t border-border/50">
                    <span>{run.steps.length} steps completed</span>
                    <div className="flex items-center gap-2">
                      <span className="text-primary font-semibold">{run.totalDurationMs}ms</span>
                      <span>•</span>
                      <span>{run.totalTokensUsed} toks</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: Selected Agent Run Inspector (8 cols) */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          {selectedRun ? (
            <Card className="p-6 bg-card/70 border-border/80 shadow-xl rounded-2xl flex flex-col gap-5">
              {/* Header Bar */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20 mt-0.5">
                    {React.createElement(AGENT_TYPE_METADATA[selectedRun.agentType].icon, { className: 'h-5 w-5' })}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-bold text-foreground">
                        {AGENT_TYPE_METADATA[selectedRun.agentType].label}
                      </h2>
                      <Badge variant="outline" className={`text-[10px] font-mono ${AGENT_TYPE_METADATA[selectedRun.agentType].badgeColor}`}>
                        {selectedRun.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">
                      Target: <strong>{selectedRun.repositoryName}</strong> ({selectedRun.branch}) • Run ID: <span className="text-primary">{selectedRun.id}</span>
                    </p>
                  </div>
                </div>

                {/* Safety Strip */}
                <div className="flex items-center gap-2 text-xs font-mono">
                  <div className="px-2.5 py-1 rounded-lg bg-muted/40 border border-border flex items-center gap-1.5 text-muted-foreground">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Sandboxed: <strong className="text-foreground">{selectedRun.safety.sandboxedRunsCount} runs</strong></span>
                  </div>
                  <div className="px-2.5 py-1 rounded-lg bg-muted/40 border border-border flex items-center gap-1.5 text-muted-foreground">
                    <Clock className="h-3.5 w-3.5 text-blue-400" />
                    <span>Max Iter: <strong className="text-foreground">{selectedRun.safety.maxIterations}</strong></span>
                  </div>
                </div>
              </div>

              {/* Goal Card */}
              <div className="p-3.5 rounded-xl border border-primary/20 bg-primary/5 text-xs text-foreground flex items-center gap-2.5">
                <Sparkles className="h-4 w-4 text-primary shrink-0" />
                <div>
                  <span className="font-semibold text-primary">Goal:</span> "{selectedRun.goal}"
                </div>
              </div>

              {/* Multi-Step ReAct Loop Timeline */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <Layers className="h-4 w-4 text-primary" />
                    ReAct Execution Timeline ({selectedRun.steps.length} Steps)
                  </h3>
                  <span className="text-[11px] font-mono text-muted-foreground">
                    Total Time: <strong>{selectedRun.totalDurationMs}ms</strong>
                  </span>
                </div>

                <div className="space-y-3">
                  {selectedRun.steps.map((step) => (
                    <div
                      key={step.stepNumber}
                      className="p-4 rounded-xl border border-border/70 bg-muted/20 hover:bg-muted/30 transition-all flex flex-col gap-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="h-6 w-6 rounded-full bg-primary/20 text-primary font-mono text-xs font-bold flex items-center justify-center">
                            {step.stepNumber}
                          </span>
                          <span className="text-xs font-bold text-foreground">
                            Step {step.stepNumber}: Thought & Plan
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-muted-foreground">
                          {step.durationMs}ms
                        </span>
                      </div>

                      {/* Thought */}
                      <div className="text-xs text-foreground bg-background/60 p-2.5 rounded-lg border border-border/50 font-sans leading-relaxed">
                        <strong className="text-muted-foreground">Thought:</strong> {step.thought}
                      </div>

                      {/* Tool Calls */}
                      {step.toolCalls.map((tcall) => (
                        <div
                          key={tcall.id}
                          className="p-3 rounded-lg border border-border bg-card/60 font-mono text-xs flex flex-col gap-2"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 text-[11px] font-mono">
                                🔧 {tcall.tool}()
                              </Badge>
                              {tcall.isSandboxed && (
                                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px] font-mono">
                                  🛡️ Sandboxed
                                </Badge>
                              )}
                            </div>
                            <span className="text-[10px] text-muted-foreground">{tcall.durationMs}ms</span>
                          </div>

                          {/* Arguments */}
                          <div className="text-[11px] text-muted-foreground bg-black/30 p-2 rounded overflow-x-auto">
                            <strong>Args:</strong> {JSON.stringify(tcall.arguments, null, 2)}
                          </div>
                        </div>
                      ))}

                      {/* Observation */}
                      <div className="text-xs font-mono bg-emerald-500/5 border border-emerald-500/20 text-emerald-300 p-2.5 rounded-lg whitespace-pre-wrap">
                        <strong className="text-emerald-400">Observation:</strong>
                        <div className="mt-1">{step.observation}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Patches & Pull Request Actions */}
              {selectedRun.patches && selectedRun.patches.length > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                      <Code2 className="h-4 w-4 text-emerald-400" />
                      Synthesized Code Patches ({selectedRun.patches.length})
                    </h3>
                  </div>

                  {selectedRun.patches.map((patch) => (
                    <div
                      key={patch.id}
                      className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 flex flex-col gap-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 font-mono text-xs font-bold text-foreground">
                          <FileCode className="h-4 w-4 text-emerald-400" />
                          {patch.filePath}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleApplyPatch(patch.id)}
                            disabled={patch.applied}
                            className={`h-7 text-xs font-semibold ${
                              patch.applied
                                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                                : 'hover:bg-emerald-500/10 hover:text-emerald-400'
                            }`}
                          >
                            {patch.applied ? (
                              <>
                                <Check className="h-3.5 w-3.5 mr-1" />
                                Patch Applied
                              </>
                            ) : (
                              'Apply Patch'
                            )}
                          </Button>
                        </div>
                      </div>

                      <p className="text-xs text-muted-foreground">{patch.explanation}</p>

                      {/* Diff View */}
                      <pre className="p-3 rounded-lg bg-black/60 border border-border/80 font-mono text-xs text-foreground overflow-x-auto whitespace-pre">
                        {patch.diff}
                      </pre>
                    </div>
                  ))}

                  {/* Create PR Card */}
                  <div className="p-4 rounded-xl border border-border bg-card flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                        <GitPullRequest className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-foreground">
                          {selectedRun.createdPullRequest ? 'Pull Request Created' : 'Ready to Create Pull Request'}
                        </div>
                        <div className="text-[11px] text-muted-foreground font-mono">
                          Branch: <strong>{selectedRun.createdBranch || 'fix/checkout-vat-token-bug'}</strong> ➔ main
                        </div>
                      </div>
                    </div>

                    {selectedRun.createdPullRequest ? (
                      <a
                        href={selectedRun.createdPullRequest.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-semibold hover:bg-emerald-500/20 transition-all"
                      >
                        <span>View PR #{selectedRun.createdPullRequest.number}</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <Button
                        size="sm"
                        onClick={handleCreatePR}
                        className="h-8 gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold"
                      >
                        <GitPullRequest className="h-3.5 w-3.5" />
                        Create Pull Request
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* Final Grounded Response */}
              {selectedRun.finalResponse && (
                <div className="space-y-2 pt-2 border-t border-border">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    Final Grounded Response
                  </h3>
                  <div className="p-4 rounded-xl border border-border bg-muted/30 font-sans text-xs text-foreground whitespace-pre-wrap leading-relaxed">
                    {selectedRun.finalResponse}
                  </div>
                </div>
              )}
            </Card>
          ) : (
            <div className="p-12 text-center text-muted-foreground">Select an agent run to view details.</div>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* DISPATCH AGENT MODAL                                          */}
      {/* ------------------------------------------------------------- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <Card className="w-full max-w-2xl bg-card border-border shadow-2xl rounded-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-border flex items-center justify-between bg-muted/30">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md">
                  <Bot className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">Dispatch Autonomous Agent</h3>
                  <p className="text-[11px] text-muted-foreground font-mono">
                    Select agent specialization and configure safety boundaries
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto custom-scrollbar flex-1">
              {/* Agent Specialization Cards */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-foreground">Select Agent Specialization</label>
                <div className="grid grid-cols-2 gap-2.5">
                  {(['DEBUGGING', 'INVESTIGATION', 'DOCUMENTATION', 'TESTING'] as AgentType[]).map((type) => {
                    const meta = AGENT_TYPE_METADATA[type];
                    const Icon = meta.icon;
                    const isSelected = formAgentType === type;
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setFormAgentType(type)}
                        className={`p-3 rounded-xl border text-left flex flex-col gap-1.5 transition-all ${
                          isSelected
                            ? 'bg-primary/10 border-primary shadow-sm'
                            : 'bg-muted/20 border-border hover:bg-muted/40'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`p-1 rounded ${meta.badgeColor}`}>
                            <Icon className="h-3.5 w-3.5" />
                          </div>
                          <span className="text-xs font-bold text-foreground">{meta.label.split(' ')[0]}</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground line-clamp-2">{meta.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Goal Input */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-foreground">Agent Goal / Task</label>
                <textarea
                  rows={3}
                  placeholder="Enter objective (e.g., 'Why is checkout failing?')..."
                  value={formGoal}
                  onChange={(e) => setFormGoal(e.target.value)}
                  className="w-full p-3 rounded-xl border border-border bg-muted/20 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground"
                />
              </div>

              {/* Safety Configuration */}
              <div className="space-y-3 pt-2 border-t border-border">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Shield className="h-3.5 w-3.5 text-emerald-400" />
                    Safety Boundaries & Execution Limits
                  </span>
                  <Badge variant="outline" className="text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                    Host Shell Blocked
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                  <div className="p-3 rounded-xl border border-border bg-muted/20 flex flex-col gap-1">
                    <span className="text-[11px] text-muted-foreground">Max Iterations</span>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={formMaxIterations}
                      onChange={(e) => setFormMaxIterations(parseInt(e.target.value, 10))}
                      className="p-1 rounded bg-background border border-border text-xs text-foreground"
                    />
                  </div>

                  <div className="p-3 rounded-xl border border-border bg-muted/20 flex flex-col gap-1">
                    <span className="text-[11px] text-muted-foreground">Timeout (Seconds)</span>
                    <input
                      type="number"
                      min={10}
                      max={300}
                      value={formTimeout}
                      onChange={(e) => setFormTimeout(parseInt(e.target.value, 10))}
                      className="p-1 rounded bg-background border border-border text-xs text-foreground"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-border flex items-center justify-between bg-muted/30">
              <Button variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => handleDispatch()}
                disabled={!formGoal.trim()}
                className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20"
              >
                <Play className="h-3.5 w-3.5 fill-current" />
                Launch Agent Run
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

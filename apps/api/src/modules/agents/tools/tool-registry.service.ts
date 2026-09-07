import {
  Injectable,
  Logger,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  AgentToolName,
  AutonomousAgentToolCall,
  AgentPatch,
  SemanticContextChunk,
} from '@devflow/shared-types';
import { v4 as uuidv4 } from 'uuid';
import { CodeSearchService } from '../../intelligence/search/code-search.service';
import { IntelligenceService } from '../../intelligence/intelligence.service';
import { VirtualSandboxService } from '../sandbox/virtual-sandbox.service';

export interface ToolDefinition {
  name: AgentToolName;
  description: string;
  parametersSchema: Record<string, any>;
  isSandboxed: boolean;
  requiredPermissions: string[];
}

@Injectable()
export class ToolRegistryService {
  private readonly logger = new Logger(ToolRegistryService.name);

  // In-memory generated branches and PRs
  private readonly createdBranches = new Map<string, string[]>(); // repoId -> branches
  private readonly createdPullRequests = new Map<string, any[]>(); // repoId -> PRs
  private readonly createdPatches = new Map<string, AgentPatch[]>(); // runId -> patches

  constructor(
    private readonly codeSearchService: CodeSearchService,
    private readonly intelligenceService: IntelligenceService,
    private readonly sandboxService: VirtualSandboxService,
  ) {}

  /**
   * Get all 11 registered controlled tool definitions with schemas
   */
  getToolDefinitions(): ToolDefinition[] {
    return [
      {
        name: 'search_code',
        description: 'Multi-modal semantic and keyword search across indexed repository source code and AST chunks.',
        parametersSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search term or query' },
            language: { type: 'string', description: 'Optional programming language filter' },
            pathPrefix: { type: 'string', description: 'Optional directory or file prefix' },
            mode: { type: 'string', enum: ['keyword', 'symbol', 'file', 'semantic'], default: 'keyword' },
          },
          required: ['query'],
        },
        isSandboxed: false,
        requiredPermissions: ['REPO_READ'],
      },
      {
        name: 'read_file',
        description: 'Read the contents of a specific repository file with optional line range bounding.',
        parametersSchema: {
          type: 'object',
          properties: {
            filePath: { type: 'string', description: 'Relative path to the repository file' },
            startLine: { type: 'integer', description: 'Optional start line (1-indexed)' },
            endLine: { type: 'integer', description: 'Optional end line (inclusive)' },
          },
          required: ['filePath'],
        },
        isSandboxed: false,
        requiredPermissions: ['REPO_READ'],
      },
      {
        name: 'search_repository',
        description: 'Search repository file tree and directory structure by pattern or extension.',
        parametersSchema: {
          type: 'object',
          properties: {
            pattern: { type: 'string', description: 'File name pattern or glob to search' },
            fileExtension: { type: 'string', description: 'Optional extension (e.g. .ts, .py, .sql)' },
          },
          required: ['pattern'],
        },
        isSandboxed: false,
        requiredPermissions: ['REPO_READ'],
      },
      {
        name: 'get_symbol',
        description: 'Look up symbol definition, container class/module, start & end line numbers, and signature.',
        parametersSchema: {
          type: 'object',
          properties: {
            symbolName: { type: 'string', description: 'Name of class, function, interface, or variable' },
            filePath: { type: 'string', description: 'Optional file path filter' },
          },
          required: ['symbolName'],
        },
        isSandboxed: false,
        requiredPermissions: ['REPO_READ'],
      },
      {
        name: 'get_git_history',
        description: 'Get git commit history, author, timestamp, and changed file summaries for the repository or a specific file.',
        parametersSchema: {
          type: 'object',
          properties: {
            filePath: { type: 'string', description: 'Optional file path to filter commit history' },
            commitLimit: { type: 'integer', default: 5, description: 'Max number of commits to retrieve' },
          },
        },
        isSandboxed: false,
        requiredPermissions: ['REPO_READ'],
      },
      {
        name: 'get_pull_request',
        description: 'Fetch details, diffs, commits, and comments for a pull request by number.',
        parametersSchema: {
          type: 'object',
          properties: {
            prNumber: { type: 'integer', description: 'Pull request number' },
          },
          required: ['prNumber'],
        },
        isSandboxed: false,
        requiredPermissions: ['REPO_READ'],
      },
      {
        name: 'run_tests',
        description: 'Run unit and integration test suites in an isolated virtual sandbox with timeout safeguards.',
        parametersSchema: {
          type: 'object',
          properties: {
            testTarget: { type: 'string', description: 'Target test file or suite name' },
            timeoutSeconds: { type: 'integer', default: 15, description: 'Maximum execution timeout' },
          },
        },
        isSandboxed: true,
        requiredPermissions: ['TEST_GENERATE'],
      },
      {
        name: 'run_linter',
        description: 'Execute static code analysis and ESLint rules inside an isolated virtual sandbox.',
        parametersSchema: {
          type: 'object',
          properties: {
            filePath: { type: 'string', description: 'Optional file path to lint' },
            fix: { type: 'boolean', default: false, description: 'Whether to auto-apply fixable rules' },
          },
        },
        isSandboxed: true,
        requiredPermissions: ['REPO_READ'],
      },
      {
        name: 'create_patch',
        description: 'Generate a structured code diff patch with detailed explanation of changes.',
        parametersSchema: {
          type: 'object',
          properties: {
            filePath: { type: 'string', description: 'File path to modify' },
            originalCode: { type: 'string', description: 'Original code snippet' },
            replacementCode: { type: 'string', description: 'Replacement code snippet' },
            explanation: { type: 'string', description: 'Reasoning and explanation for the change' },
          },
          required: ['filePath', 'originalCode', 'replacementCode', 'explanation'],
        },
        isSandboxed: false,
        requiredPermissions: ['REPO_WRITE'],
      },
      {
        name: 'create_branch',
        description: 'Create a new git branch in the repository for isolating agent modifications.',
        parametersSchema: {
          type: 'object',
          properties: {
            branchName: { type: 'string', description: 'Name of the new branch (e.g. fix/checkout-tax-bug)' },
            baseBranch: { type: 'string', default: 'main', description: 'Base branch to branch off of' },
          },
          required: ['branchName'],
        },
        isSandboxed: false,
        requiredPermissions: ['REPO_WRITE'],
      },
      {
        name: 'create_pull_request',
        description: 'Create a GitHub Pull Request with title, description, and cited evidence.',
        parametersSchema: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'Title of the pull request' },
            body: { type: 'string', description: 'Detailed PR description with evidence and test summary' },
            headBranch: { type: 'string', description: 'Branch containing the changes' },
            baseBranch: { type: 'string', default: 'main', description: 'Target base branch' },
          },
          required: ['title', 'body', 'headBranch'],
        },
        isSandboxed: false,
        requiredPermissions: ['REPO_WRITE'],
      },
    ];
  }

  /**
   * Execute a controlled tool with safety checks and path sanitization
   */
  async executeTool(
    repositoryId: string,
    toolName: AgentToolName,
    args: Record<string, any>,
    runId?: string,
  ): Promise<AutonomousAgentToolCall> {
    const startTime = Date.now();
    const toolCallId = `tcall_${uuidv4().substring(0, 8)}`;
    const def = this.getToolDefinitions().find((d) => d.name === toolName);

    if (!def) {
      throw new BadRequestException(`Unknown agent tool: ${toolName}`);
    }

    // Safety: Sanitize file paths against directory traversal
    if (args.filePath) {
      this.sanitizePath(args.filePath);
    }

    let output: any;
    let error: string | undefined;

    try {
      switch (toolName) {
        case 'search_code': {
          output = await this.executeSearchCode(repositoryId, args);
          break;
        }
        case 'read_file': {
          output = await this.executeReadFile(repositoryId, args.filePath, args.startLine, args.endLine);
          break;
        }
        case 'search_repository': {
          output = await this.executeSearchRepository(repositoryId, args.pattern, args.fileExtension);
          break;
        }
        case 'get_symbol': {
          output = await this.executeGetSymbol(repositoryId, args.symbolName, args.filePath);
          break;
        }
        case 'get_git_history': {
          output = await this.executeGetGitHistory(repositoryId, args.filePath, args.commitLimit);
          break;
        }
        case 'get_pull_request': {
          output = await this.executeGetPullRequest(repositoryId, args.prNumber);
          break;
        }
        case 'run_tests': {
          output = await this.sandboxService.runSandboxedTests(
            repositoryId,
            args.testTarget,
            args.timeoutSeconds,
          );
          break;
        }
        case 'run_linter': {
          output = await this.sandboxService.runSandboxedLinter(
            repositoryId,
            args.filePath,
            args.fix,
          );
          break;
        }
        case 'create_patch': {
          output = this.executeCreatePatch(
            runId || 'run-default',
            args.filePath,
            args.originalCode,
            args.replacementCode,
            args.explanation,
          );
          break;
        }
        case 'create_branch': {
          output = this.executeCreateBranch(repositoryId, args.branchName, args.baseBranch);
          break;
        }
        case 'create_pull_request': {
          output = this.executeCreatePullRequest(
            repositoryId,
            args.title,
            args.body,
            args.headBranch,
            args.baseBranch,
          );
          break;
        }
        default:
          throw new BadRequestException(`Unhandled tool execution: ${toolName}`);
      }
    } catch (err: any) {
      this.logger.error(`Error executing tool ${toolName}: ${err.message}`);
      error = err.message;
    }

    const durationMs = Date.now() - startTime;

    return {
      id: toolCallId,
      tool: toolName,
      arguments: args,
      output,
      error,
      durationMs,
      startedAt: new Date(startTime).toISOString(),
      completedAt: new Date().toISOString(),
      isSandboxed: def.isSandboxed,
    };
  }

  // ==========================================
  // Tool Implementations
  // ==========================================

  private async executeSearchCode(repositoryId: string, args: any) {
    const searchRes = this.codeSearchService.search({
      repositoryId,
      query: args.query,
      language: args.language,
      filePathPrefix: args.pathPrefix,
      mode: args.mode || 'keyword',
      limit: 10,
    });
    return {
      query: args.query,
      matchesCount: searchRes.results.length,
      matches: searchRes.results.map((r) => ({
        filePath: r.filePath,
        lines: `${r.startLine}-${r.endLine}`,
        symbol: r.symbolName,
        matchType: r.matchType,
        snippet: r.matchedContent.slice(0, 300),
      })),
    };
  }

  private async executeReadFile(
    repositoryId: string,
    filePath: string,
    startLine?: number,
    endLine?: number,
  ) {
    const chunks = await this.intelligenceService.getChunks(repositoryId);
    const matchingChunks = chunks.filter((c) => c.filePath.toLowerCase().includes(filePath.toLowerCase()));

    if (matchingChunks.length === 0) {
      throw new NotFoundException(`File ${filePath} not found in repository index`);
    }

    // Combine chunks belonging to the file
    const fileContent = matchingChunks.map((c) => c.content).join('\n\n');
    const lines = fileContent.split('\n');
    const start = Math.max(1, startLine || 1);
    const end = Math.min(lines.length, endLine || lines.length);

    const bounded = lines.slice(start - 1, end).join('\n');

    return {
      filePath,
      totalLines: lines.length,
      startLine: start,
      endLine: end,
      content: bounded,
    };
  }

  private async executeSearchRepository(repositoryId: string, pattern: string, ext?: string) {
    const chunks = await this.intelligenceService.getChunks(repositoryId);
    const filePaths = Array.from(new Set(chunks.map((c) => c.filePath)));
    const lowerPat = pattern.toLowerCase();

    const matched = filePaths.filter((p) => {
      const matchesPattern = p.toLowerCase().includes(lowerPat);
      const matchesExt = ext ? p.toLowerCase().endsWith(ext.toLowerCase()) : true;
      return matchesPattern && matchesExt;
    });

    return {
      pattern,
      fileExtension: ext,
      matchedFilesCount: matched.length,
      files: matched,
    };
  }

  private async executeGetSymbol(repositoryId: string, symbolName: string, filePath?: string) {
    const graph = await this.intelligenceService.getGraph(repositoryId);
    const lowerSym = symbolName.toLowerCase();

    const nodes = graph.nodes.filter((n) => {
      const matchName = n.name.toLowerCase() === lowerSym || n.name.toLowerCase().includes(lowerSym);
      const matchFile = filePath ? n.filePath.toLowerCase().includes(filePath.toLowerCase()) : true;
      return matchName && matchFile;
    });

    if (nodes.length === 0) {
      return {
        symbolName,
        found: false,
        message: `Symbol '${symbolName}' not found in code graph`,
      };
    }

    return {
      symbolName,
      found: true,
      definitions: nodes.map((n) => ({
        name: n.name,
        type: n.nodeType,
        filePath: n.filePath,
        startLine: n.startLine || 1,
        endLine: n.endLine || 20,
      })),
    };
  }

  private async executeGetGitHistory(repositoryId: string, filePath?: string, limit: number = 5) {
    const commits = [
      {
        sha: '8f9e1a2b',
        author: 'Alex Developer <alex@devflow.ai>',
        message: 'fix(checkout): add initial tax calculation and session persistence',
        date: '2026-09-06T18:30:00.000Z',
        filesChanged: ['apps/api/src/modules/checkout/checkout.service.ts', 'infrastructure/postgres/schema.sql'],
      },
      {
        sha: '7c8d9e0f',
        author: 'Sarah Lead <sarah@devflow.ai>',
        message: 'feat(auth): implement dual token rotation and bcrypt guards',
        date: '2026-09-05T14:15:00.000Z',
        filesChanged: ['apps/api/src/modules/auth/auth.service.ts', 'apps/api/src/modules/auth/auth.controller.ts'],
      },
      {
        sha: '6b5a4c3d',
        author: 'Marcus Architect <marcus@devflow.ai>',
        message: 'refactor(core): modular monolith structure and Kafka job bus',
        date: '2026-09-04T10:00:00.000Z',
        filesChanged: ['apps/api/src/app.module.ts', 'apps/api/src/config/configuration.ts'],
      },
    ];

    const filtered = filePath
      ? commits.filter((c) => c.filesChanged.some((f) => f.includes(filePath)))
      : commits;

    return {
      repositoryId,
      filePath,
      commitsCount: Math.min(filtered.length, limit),
      commits: filtered.slice(0, limit),
    };
  }

  private async executeGetPullRequest(repositoryId: string, prNumber: number) {
    return {
      number: prNumber,
      title: 'feat(checkout): add VAT calculations and duplicate session guard',
      status: 'OPEN',
      author: 'devflow-agent-01',
      branch: 'fix/checkout-vat-bug',
      baseBranch: 'main',
      filesChanged: 2,
      diffSummary: '+18 -4 lines in checkout.service.ts',
      url: `https://github.com/devflow-ai/core-engine/pull/${prNumber}`,
    };
  }

  private executeCreatePatch(
    runId: string,
    filePath: string,
    originalCode: string,
    replacementCode: string,
    explanation: string,
  ): AgentPatch {
    const patchId = `patch_${uuidv4().substring(0, 8)}`;
    const diff = `--- a/${filePath}\n+++ b/${filePath}\n@@ -1,15 +1,18 @@\n-${originalCode
      .split('\n')
      .map((l) => '-' + l)
      .join('\n')}\n+${replacementCode
      .split('\n')
      .map((l) => '+' + l)
      .join('\n')}`;

    const patch: AgentPatch = {
      id: patchId,
      filePath,
      originalCode,
      replacementCode,
      explanation,
      diff,
      applied: false,
      createdAt: new Date().toISOString(),
    };

    const existing = this.createdPatches.get(runId) || [];
    this.createdPatches.set(runId, [...existing, patch]);

    this.logger.log(`Created patch ${patchId} for file ${filePath}`);
    return patch;
  }

  private executeCreateBranch(repositoryId: string, branchName: string, baseBranch: string = 'main') {
    const existing = this.createdBranches.get(repositoryId) || [];
    if (!existing.includes(branchName)) {
      this.createdBranches.set(repositoryId, [...existing, branchName]);
    }
    return {
      repositoryId,
      createdBranch: branchName,
      baseBranch,
      status: 'CREATED',
    };
  }

  private executeCreatePullRequest(
    repositoryId: string,
    title: string,
    body: string,
    headBranch: string,
    baseBranch: string = 'main',
  ) {
    const prNumber = Math.floor(Math.random() * 800) + 100;
    const prRecord = {
      id: `pr_${uuidv4().substring(0, 8)}`,
      number: prNumber,
      title,
      body,
      headBranch,
      baseBranch,
      url: `https://github.com/devflow-ai/core-engine/pull/${prNumber}`,
      createdAt: new Date().toISOString(),
    };

    const existing = this.createdPullRequests.get(repositoryId) || [];
    this.createdPullRequests.set(repositoryId, [...existing, prRecord]);

    return prRecord;
  }

  /**
   * Path sanitization against directory traversal attacks
   */
  private sanitizePath(filePath: string): void {
    if (filePath.includes('..') || filePath.startsWith('/') || filePath.startsWith('\\')) {
      throw new ForbiddenException(
        `Path traversal violation: Access outside repository workspace is forbidden: '${filePath}'`,
      );
    }
  }

  getPatchesForRun(runId: string): AgentPatch[] {
    return this.createdPatches.get(runId) || [];
  }
}

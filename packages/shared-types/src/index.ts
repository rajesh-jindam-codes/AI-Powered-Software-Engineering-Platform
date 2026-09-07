/**
 * DEVFLOW AI — Core Shared TypeScript Interfaces, Domain Models & Auth/RBAC/Workspace Contracts
 */

// ==========================================
// Tenancy & Identity
// ==========================================

export type OrgTier = 'starter' | 'pro' | 'enterprise';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  tier: OrgTier;
  settings: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export type OrgRole = 'owner' | 'admin' | 'lead' | 'developer' | 'viewer';

export type UserRole = 'ADMIN' | 'DEVELOPER' | 'REVIEWER' | 'VIEWER';
export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'PENDING';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  avatarUrl?: string;
  githubId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserWithPassword extends User {
  passwordHash: string;
}

// ==========================================
// Workspace Management & Memberships
// ==========================================

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  description?: string;
  avatarUrl?: string;
  ownerId: string;
  settings: {
    defaultBranch?: string;
    autoReviewEnabled?: boolean;
    autoReviewPRs?: boolean;
    aiIndexingEnabled?: boolean;
    sandboxTimeoutSeconds?: number;
    allowedModels?: string[];
    allowedRoles?: string[];
  };
  membersCount?: number;
  memberCount?: number;
  reposCount?: number;
  repositoryCount?: number;
  activeAgentsCount?: number;
  userRole?: UserRole;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceMember {
  id: string;
  workspaceId: string;
  userId: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string;
  };
  role: UserRole;
  joinedAt: string;
}

export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';

export interface WorkspaceInvitation {
  id: string;
  workspaceId: string;
  workspaceName?: string;
  email: string;
  role: UserRole;
  invitedBy: {
    id: string;
    name: string;
    email: string;
  };
  token: string;
  status: InvitationStatus;
  expiresAt: string;
  createdAt: string;
}

export interface CreateWorkspaceRequest {
  name: string;
  slug?: string;
  description?: string;
  avatarUrl?: string;
  settings?: Workspace['settings'];
}

export interface UpdateWorkspaceRequest {
  name?: string;
  slug?: string;
  description?: string;
  avatarUrl?: string;
  settings?: Partial<Workspace['settings']>;
}

export interface InviteMemberRequest {
  email: string;
  role: UserRole;
}

export interface UpdateMemberRoleRequest {
  role: UserRole;
}

export interface AcceptInvitationRequest {
  token: string;
}

// ==========================================
// RBAC Permissions
// ==========================================

export enum Permission {
  REPO_READ = 'REPO_READ',
  REPO_WRITE = 'REPO_WRITE',
  REPO_DELETE = 'REPO_DELETE',
  AGENT_DISPATCH = 'AGENT_DISPATCH',
  AGENT_APPROVE = 'AGENT_APPROVE',
  REVIEW_TRIGGER = 'REVIEW_TRIGGER',
  REVIEW_SUBMIT = 'REVIEW_SUBMIT',
  TEST_GENERATE = 'TEST_GENERATE',
  SETTINGS_READ = 'SETTINGS_READ',
  SETTINGS_WRITE = 'SETTINGS_WRITE',
  WORKSPACE_MANAGE = 'WORKSPACE_MANAGE',
  WORKSPACE_INVITE = 'WORKSPACE_INVITE',
  WORKSPACE_DELETE = 'WORKSPACE_DELETE',
  ADMIN_MANAGE_USERS = 'ADMIN_MANAGE_USERS',
  ADMIN_MANAGE_ORGS = 'ADMIN_MANAGE_ORGS',
  AUDIT_READ = 'AUDIT_READ',
}

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  ADMIN: Object.values(Permission),
  DEVELOPER: [
    Permission.REPO_READ,
    Permission.REPO_WRITE,
    Permission.AGENT_DISPATCH,
    Permission.AGENT_APPROVE,
    Permission.REVIEW_TRIGGER,
    Permission.REVIEW_SUBMIT,
    Permission.TEST_GENERATE,
    Permission.SETTINGS_READ,
  ],
  REVIEWER: [
    Permission.REPO_READ,
    Permission.REVIEW_TRIGGER,
    Permission.REVIEW_SUBMIT,
    Permission.SETTINGS_READ,
  ],
  VIEWER: [Permission.REPO_READ, Permission.SETTINGS_READ],
};

// ==========================================
// Authentication DTOs & Contracts
// ==========================================

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  role?: UserRole;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  jti?: string;
  iat?: number;
  exp?: number;
}

export interface UpdateProfileRequest {
  name?: string;
  avatarUrl?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface AuditLogEntry {
  id: string;
  userId?: string;
  userEmail?: string;
  action: string;
  resource: string;
  status: 'SUCCESS' | 'FAILURE' | 'DENIED';
  ipAddress?: string;
  userAgent?: string;
  details?: Record<string, unknown>;
  timestamp: string;
}

// ==========================================
// GitHub Integration & Repositories
// ==========================================

export interface GitHubAccount {
  id: string;
  githubUserId: string;
  username: string;
  avatarUrl?: string;
  email?: string;
  htmlUrl: string;
  connectedAt: string;
}

export interface GitHubInstallation {
  id: string;
  workspaceId: string;
  githubUserId: string;
  githubUsername: string;
  avatarUrl?: string;
  scope?: string;
  connectedAt: string;
  updatedAt: string;
}

export interface GitHubRepository {
  id: string; // GitHub repo ID
  fullName: string;
  name: string;
  owner: string;
  description?: string;
  defaultBranch: string;
  cloneUrl: string;
  htmlUrl: string;
  isPrivate: boolean;
  language?: string;
  starsCount: number;
  forksCount: number;
  openIssuesCount: number;
  pushedAt?: string;
  updatedAt?: string;
  isConnected?: boolean;
}

export type IndexStatus = 'pending' | 'indexing' | 'indexed' | 'failed';

export interface Repository {
  id: string;
  workspaceId: string;
  githubRepoId: string;
  name: string;
  owner: string;
  fullName: string;
  defaultBranch: string;
  cloneUrl: string;
  htmlUrl?: string;
  isPrivate: boolean;
  language?: string;
  starsCount?: number;
  forksCount?: number;
  openIssuesCount?: number;
  indexStatus: IndexStatus;
  lastIndexedAt?: string;
  lastSyncedAt?: string;
  githubMetadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt?: string;
}

export interface ConnectRepositoryRequest {
  githubRepoId: string;
  name?: string;
  owner?: string;
  fullName: string;
  defaultBranch?: string;
  cloneUrl: string;
  htmlUrl?: string;
  isPrivate?: boolean;
  language?: string;
  starsCount?: number;
  forksCount?: number;
  openIssuesCount?: number;
  githubMetadata?: Record<string, unknown>;
}

export interface WebhookDeliveryRecord {
  id: string; // Delivery UUID from GitHub
  eventType: string;
  repositoryId?: string;
  workspaceId?: string;
  signature?: string;
  payload: Record<string, unknown>;
  status: 'PROCESSED' | 'IGNORED' | 'FAILED';
  errorMessage?: string;
  processedAt: string;
}

export interface GitHubWebhookPayload {
  action?: string;
  repository?: {
    id: number;
    name: string;
    full_name: string;
    owner: {
      login: string;
      id: number;
    };
    html_url: string;
    default_branch: string;
    private: boolean;
  };
  sender?: {
    login: string;
    id: number;
    avatar_url: string;
  };
  ref?: string;
  before?: string;
  after?: string;
  commits?: Array<{
    id: string;
    message: string;
    timestamp: string;
    url: string;
    author: {
      name: string;
      email: string;
    };
    added: string[];
    removed: string[];
    modified: string[];
  }>;
  pull_request?: {
    id: number;
    number: number;
    title: string;
    state: string;
    html_url: string;
    diff_url: string;
    head: {
      ref: string;
      sha: string;
    };
    base: {
      ref: string;
      sha: string;
    };
    user: {
      login: string;
    };
  };
  issue?: {
    id: number;
    number: number;
    title: string;
    state: string;
    html_url: string;
    user: {
      login: string;
    };
  };
}

export type ChunkType = 'function' | 'class' | 'method' | 'module' | 'interface' | 'block';

export interface CodeChunk {
  id: string;
  repositoryId: string;
  fileId?: string;
  filePath: string;
  startLine: number;
  endLine: number;
  content: string;
  language: string;
  chunkType: ChunkType;
  tokensCount?: number;
  astMetadata: {
    symbolName?: string;
    parentScope?: string;
    imports?: string[];
    calls?: string[];
    exported?: boolean;
    signature?: string;
  };
  embedding?: number[];
  createdAt: string;
}

export type SymbolKind =
  | 'function'
  | 'class'
  | 'interface'
  | 'method'
  | 'variable'
  | 'type'
  | 'enum'
  | 'table'
  | 'view'
  | 'procedure';

export interface CodeSymbol {
  id: string;
  repositoryId: string;
  fileId?: string;
  filePath: string;
  name: string;
  kind: SymbolKind;
  containerName?: string;
  startLine: number;
  endLine: number;
  signature?: string;
  docstring?: string;
  isExported?: boolean;
}

export interface FileDependency {
  id: string;
  repositoryId: string;
  sourceFileId?: string;
  sourceFilePath: string;
  targetModule: string;
  dependencyType: 'internal' | 'external';
  importedSymbols?: string[];
}

export interface RepositoryFile {
  id: string;
  repositoryId: string;
  filePath: string;
  fileName: string;
  language: string;
  sizeBytes: number;
  sha: string;
  status: 'indexed' | 'ignored' | 'binary' | 'failed';
  lastIngestedAt?: string;
  createdAt: string;
}

export type IngestionJobStatus = 'queued' | 'processing' | 'completed' | 'failed';

export interface IngestionJob {
  id: string;
  repositoryId: string;
  workspaceId: string;
  status: IngestionJobStatus;
  totalFiles: number;
  processedFiles: number;
  totalChunks: number;
  totalSymbols: number;
  totalDependencies: number;
  errorMessage?: string;
  startedAt: string;
  completedAt?: string;
}

export interface IngestionStats {
  filesCount: number;
  chunksCount: number;
  symbolsCount: number;
  dependenciesCount: number;
  languages: Record<string, number>;
  lastIngestedAt?: string;
}

export interface TriggerIngestionRequest {
  branch?: string;
  forceReindex?: boolean;
}

// ==========================================
// Autonomous Coding Agents
// ==========================================

export type AgentTaskStatus =
  | 'queued'
  | 'planning'
  | 'executing'
  | 'verifying'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface AgentTask {
  id: string;
  workspaceId: string;
  repositoryId: string;
  createdBy: string;
  title: string;
  prompt: string;
  status: AgentTaskStatus;
  targetBranch?: string;
  generatedPrUrl?: string;
  executionSummary?: {
    totalSteps: number;
    tokensUsed: number;
    durationMs: number;
  };
  createdAt: string;
  completedAt?: string;
}

export type AgentStepType = 'thought' | 'tool_call' | 'observation' | 'reflection';

export interface AgentStep {
  id: string;
  taskId: string;
  stepNumber: number;
  stepType: AgentStepType;
  thought?: string;
  action?: string;
  observation?: string;
  status: 'running' | 'success' | 'failed';
  createdAt: string;
}

export interface AgentToolCall {
  id: string;
  stepId: string;
  toolName: string;
  inputArguments: Record<string, unknown>;
  outputResult: Record<string, unknown>;
  executionTimeMs: number;
  status: 'success' | 'failed';
  createdAt: string;
}

// ==========================================
// Code Review & Test Generation
// ==========================================

export type ReviewStatus = 'in_progress' | 'approved' | 'changes_requested' | 'failed';
export type FindingSeverity = 'info' | 'warning' | 'critical' | 'security';

export interface ReviewComment {
  id: string;
  codeReviewId: string;
  filePath: string;
  lineNumber: number;
  severity: FindingSeverity;
  body: string;
  suggestedDiff?: string;
  createdAt: string;
}

export interface CodeReview {
  id: string;
  pullRequestId: string;
  commitSha: string;
  status: ReviewStatus;
  score: number;
  summary: {
    overview: string;
    securityIssuesCount: number;
    performanceIssuesCount: number;
    testCoverageDelta: number;
  };
  comments?: ReviewComment[];
  createdAt: string;
}

// ==========================================
// System Health, Errors & API Protocols
// ==========================================

export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptimeSeconds: number;
  version: string;
  environment: string;
  services: {
    database: { status: 'up' | 'down'; latencyMs?: number };
    redis: { status: 'up' | 'down'; latencyMs?: number };
    kafka: { status: 'up' | 'down' };
  };
}

export interface ApiInfoResponse {
  service: string;
  version: string;
  environment: string;
  apiVersion: string;
  timestamp: string;
}

export interface Rfc7807ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  code: string;
  timestamp: string;
  traceId?: string;
  errors?: Array<{ field: string; message: string }>;
}

// ==========================================
// Distributed Job Processing (Phase 6)
// ==========================================

export type JobState =
  | 'QUEUED'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'RETRYING'
  | 'CANCELLED'
  | 'DEAD_LETTER';

export type JobType =
  | 'REPOSITORY_INDEX'
  | 'CODE_ANALYSIS'
  | 'EMBEDDING_GENERATION'
  | 'TEST_EXECUTION'
  | 'AI_REVIEW'
  | 'DOCUMENTATION';

export enum JobPriority {
  CRITICAL = 1,
  HIGH = 2,
  NORMAL = 3,
  LOW = 4,
}

export interface JobErrorDetails {
  message: string;
  name?: string;
  stack?: string;
  code?: string;
  isRetryable: boolean;
  failedAt: string;
  attempt: number;
  deadLetterReason?: string;
}

export interface JobRecord<TPayload = Record<string, unknown>, TResult = Record<string, unknown>> {
  id: string;
  workspaceId?: string;
  repositoryId?: string;
  jobType: JobType;
  state: JobState;
  priority: JobPriority;
  idempotencyKey?: string;
  payload: TPayload;
  result?: TResult;
  errorDetails?: JobErrorDetails;
  progress: number; // 0 - 100
  attempt: number;
  maxRetries: number;
  backoffMs: number;
  timeoutSeconds: number;
  workerId?: string;
  lockedUntil?: string;
  nextRunAt: string;
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  createdAt: string;
  updatedAt: string;
}

export type WorkerStatus = 'ALIVE' | 'BUSY' | 'SHUTTING_DOWN' | 'DEAD';

export interface WorkerHeartbeat {
  workerId: string;
  workerType: JobType;
  hostname: string;
  pid: number;
  concurrency: number;
  activeJobsCount: number;
  status: WorkerStatus;
  lastHeartbeat: string;
  startedAt: string;
  version: string;
  processedCount: number;
  failedCount: number;
}

export interface EnqueueJobRequest<TPayload = Record<string, unknown>> {
  jobType: JobType;
  workspaceId?: string;
  repositoryId?: string;
  payload: TPayload;
  priority?: JobPriority;
  idempotencyKey?: string;
  maxRetries?: number;
  backoffMs?: number;
  timeoutSeconds?: number;
}

export interface CancelJobRequest {
  reason?: string;
}

export interface RetryJobRequest {
  resetAttempts?: boolean;
}

export interface JobFilterQuery {
  workspaceId?: string;
  repositoryId?: string;
  jobType?: JobType;
  state?: JobState;
  priority?: JobPriority;
  workerId?: string;
  page?: number;
  limit?: number;
}

export interface JobMetricsResponse {
  total: number;
  counts: {
    QUEUED: number;
    PROCESSING: number;
    COMPLETED: number;
    FAILED: number;
    RETRYING: number;
    CANCELLED: number;
    DEAD_LETTER: number;
  };
  byType: Record<JobType, number>;
  activeWorkers: number;
  avgDurationMs: number;
  successRate: number;
  timestamp: string;
}

// ==========================================
// Code Intelligence & Repository Graph (Phase 7)
// ==========================================

export type CodeNodeType =
  | 'FILE'
  | 'CLASS'
  | 'FUNCTION'
  | 'INTERFACE'
  | 'API_ENDPOINT'
  | 'DB_MODEL'
  | 'AUTH_GUARD'
  | 'CONFIG_SCHEMA'
  | 'TEST_SUITE';

export type CodeEdgeType =
  | 'IMPORTS'
  | 'DEFINES'
  | 'CALLS'
  | 'EXTENDS'
  | 'IMPLEMENTS'
  | 'ACCESSES_DB'
  | 'PROTECTED_BY'
  | 'TESTS';

export interface CodeGraphNode {
  id: string;
  repositoryId: string;
  nodeType: CodeNodeType;
  name: string;
  filePath: string;
  startLine?: number;
  endLine?: number;
  metadata?: Record<string, unknown>;
}

export interface CodeGraphEdge {
  id: string;
  repositoryId: string;
  sourceNodeId: string;
  targetNodeId: string;
  edgeType: CodeEdgeType;
  weight?: number;
  metadata?: Record<string, unknown>;
}

export interface CodeGraph {
  repositoryId: string;
  nodes: CodeGraphNode[];
  edges: CodeGraphEdge[];
  metrics: {
    totalNodes: number;
    totalEdges: number;
    nodeCountsByType: Record<CodeNodeType, number>;
    edgeCountsByType: Record<CodeEdgeType, number>;
    hasCycles: boolean;
    centralNodes: Array<{ id: string; name: string; nodeType: CodeNodeType; centralityScore: number }>;
  };
}

// ==========================================
// Deep Domain Extraction Summaries
// ==========================================

export interface ApiEndpointSummary {
  id: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS' | 'HEAD';
  path: string;
  controllerName?: string;
  handlerName: string;
  filePath: string;
  startLine: number;
  endLine: number;
  parameters: Array<{ name: string; type: string; source: 'body' | 'query' | 'param' | 'header' }>;
  authGuards: string[];
  responseType?: string;
}

export interface DbModelSummary {
  id: string;
  name: string;
  tableName: string;
  filePath: string;
  startLine: number;
  endLine: number;
  primaryKey: string;
  fields: Array<{ name: string; type: string; nullable?: boolean; isUnique?: boolean }>;
  relations: Array<{ targetModel: string; type: 'one-to-one' | 'one-to-many' | 'many-to-one' | 'many-to-many' }>;
}

export interface AuthPatternSummary {
  id: string;
  name: string;
  type: 'GUARD' | 'MIDDLEWARE' | 'STRATEGY' | 'DECORATOR' | 'INTERCEPTOR';
  filePath: string;
  startLine: number;
  endLine: number;
  mechanism: 'JWT' | 'SESSION' | 'API_KEY' | 'OAUTH' | 'RBAC';
  requiredRoles: string[];
  protectedRoutes: string[];
}

export interface ConfigPatternSummary {
  id: string;
  keyName: string;
  filePath: string;
  lineNumber: number;
  defaultValue?: string;
  schemaType?: string;
  isSecret?: boolean;
}

export interface TestSuiteSummary {
  id: string;
  filePath: string;
  framework: 'jest' | 'pytest' | 'junit' | 'vitest' | 'generic';
  suiteName: string;
  testCasesCount: number;
  testNames: string[];
  targetSourceFiles: string[];
}

export interface CodeIntelligenceReport {
  repositoryId: string;
  stats: {
    filesCount: number;
    functionsCount: number;
    classesCount: number;
    apisCount: number;
    dbModelsCount: number;
    authGuardsCount: number;
    configKeysCount: number;
    testSuitesCount: number;
    totalTestCases: number;
  };
  apis: ApiEndpointSummary[];
  database: DbModelSummary[];
  auth: AuthPatternSummary[];
  config: ConfigPatternSummary[];
  tests: TestSuiteSummary[];
  generatedAt: string;
}

// ==========================================
// Multi-Modal Code Search Contracts
// ==========================================

export type CodeSearchMode = 'keyword' | 'symbol' | 'file' | 'semantic';

export interface CodeSearchQuery {
  repositoryId: string;
  workspaceId?: string;
  query: string;
  mode?: CodeSearchMode;
  language?: string;
  symbolKind?: SymbolKind;
  filePathPrefix?: string;
  page?: number;
  limit?: number;
}

export interface CodeSearchResultItem {
  id: string;
  repositoryId: string;
  filePath: string;
  language: string;
  matchType: 'keyword' | 'symbol' | 'file' | 'semantic';
  symbolName?: string;
  symbolKind?: SymbolKind;
  startLine: number;
  endLine: number;
  matchedContent: string;
  highlightSnippets?: string[];
  score: number;
  contextHeader?: string;
}

export interface CodeSearchResponse {
  query: string;
  mode: CodeSearchMode;
  total: number;
  results: CodeSearchResultItem[];
  latencyMs: number;
}

// ==========================================
// Semantic Context-Enriched Chunker
// ==========================================

export interface SemanticContextChunk {
  id: string;
  repositoryId: string;
  repositoryName: string;
  branch: string;
  commitSha: string;
  filePath: string;
  fileName: string;
  language: string;
  chunkType: 'function' | 'class' | 'interface' | 'method' | 'block' | 'api' | 'db_model';
  symbolBreadcrumb: string; // e.g. "DevFlow > src/auth/jwt.service.ts > JwtService > generateTokens"
  contextHeader: string; // e.g. "// Repo: DevFlow | File: src/auth/jwt.service.ts | Class: JwtService"
  startLine: number;
  endLine: number;
  content: string;
  enrichedContent: string; // Prepend context header & imports for vector embedding
  tokensCount: number;
  dependencies: string[];
}

// ==========================================
// Phase 8: AI Codebase Intelligence & RAG Pipeline
// ==========================================

export type AiChatRole = 'user' | 'assistant' | 'system';

export type AiModelId =
  | 'gpt-4o'
  | 'claude-3-5-sonnet'
  | 'gemini-1.5-pro'
  | 'devflow-code-rag-v1';

export interface AiChatCitation {
  id: string;
  repositoryId: string;
  repositoryName: string;
  filePath: string;
  symbolName?: string;
  startLine: number;
  endLine: number;
  branch: string;
  commitSha: string;
  codeSnippet: string;
  relevanceScore: number;
}

export interface AiChatUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  model: string;
  latencyMs: number;
  estimatedCost: number; // USD
}

export interface AiChatMessage {
  id: string;
  conversationId: string;
  role: AiChatRole;
  content: string;
  citations?: AiChatCitation[];
  usage?: AiChatUsage;
  status: 'streaming' | 'completed' | 'failed' | 'stopped';
  createdAt: string;
}

export interface AiChatConversation {
  id: string;
  workspaceId: string;
  repositoryId: string;
  repositoryName?: string;
  title: string;
  messages: AiChatMessage[];
  totalInputTokens: number;
  totalOutputTokens: number;
  totalEstimatedCost: number;
  model: AiModelId;
  createdAt: string;
  updatedAt: string;
}

export type RagPipelineStage =
  | 'query_processing'
  | 'query_embedding'
  | 'hybrid_retrieval'
  | 'context_building'
  | 'generating'
  | 'completed'
  | 'error';

export interface AiChatStreamEvent {
  stage: RagPipelineStage;
  messageId?: string;
  delta?: string;
  citations?: AiChatCitation[];
  usage?: AiChatUsage;
  error?: string;
}

export interface RagContextBlock {
  repository: string;
  file: string;
  symbol?: string;
  startLine: number;
  endLine: number;
  branch: string;
  commit: string;
  code: string;
  score?: number;
}

export interface RagQueryRequest {
  repositoryId: string;
  workspaceId?: string;
  branch?: string;
  question: string;
  model?: AiModelId;
  conversationId?: string;
  stream?: boolean;
}

export interface RagQueryResponse {
  answer: string;
  citations: AiChatCitation[];
  contextBlocks: RagContextBlock[];
  usage: AiChatUsage;
  latencyMs: number;
}

export interface CreateConversationRequest {
  repositoryId: string;
  workspaceId?: string;
  title?: string;
  model?: AiModelId;
}

export interface SendMessageRequest {
  content: string;
  model?: AiModelId;
  branch?: string;
  stream?: boolean;
}

// ==========================================
// Phase 9: AI Software Engineering Agents
// ==========================================

export type AgentType =
  | 'INVESTIGATION'
  | 'DEBUGGING'
  | 'DOCUMENTATION'
  | 'TESTING';

export type AgentRunStatus =
  | 'QUEUED'
  | 'PLANNING'
  | 'EXECUTING_TOOLS'
  | 'OBSERVING'
  | 'EVALUATING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'
  | 'TIMED_OUT';

export type AgentToolName =
  | 'search_code'
  | 'read_file'
  | 'search_repository'
  | 'get_symbol'
  | 'get_git_history'
  | 'get_pull_request'
  | 'run_tests'
  | 'run_linter'
  | 'create_patch'
  | 'create_branch'
  | 'create_pull_request';

export interface AutonomousAgentToolCall {
  id: string;
  tool: AgentToolName;
  arguments: Record<string, any>;
  output?: any;
  error?: string;
  durationMs: number;
  startedAt: string;
  completedAt: string;
  isSandboxed: boolean;
}

export interface AutonomousAgentStep {
  stepNumber: number;
  thought: string;
  plan?: string;
  toolCalls: AutonomousAgentToolCall[];
  observation: string;
  durationMs: number;
  timestamp: string;
}

export interface AgentPatch {
  id: string;
  filePath: string;
  originalCode: string;
  replacementCode: string;
  explanation: string;
  diff: string;
  applied: boolean;
  createdAt: string;
}

export interface AgentSafetyStatus {
  permissionsVerified: boolean;
  maxIterations: number;
  iterationsCount: number;
  timeoutSeconds: number;
  sandboxedRunsCount: number;
  disallowedAttemptsCount: number;
}

export interface AgentRun {
  id: string;
  workspaceId: string;
  repositoryId: string;
  repositoryName: string;
  branch: string;
  agentType: AgentType;
  goal: string;
  model: AiModelId;
  status: AgentRunStatus;
  steps: AutonomousAgentStep[];
  patches: AgentPatch[];
  createdBranch?: string;
  createdPullRequest?: {
    id: string;
    number: number;
    url: string;
    title: string;
  };
  finalResponse?: string;
  safety: AgentSafetyStatus;
  totalDurationMs: number;
  totalTokensUsed: number;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface DispatchAgentRequest {
  workspaceId?: string;
  repositoryId: string;
  agentType: AgentType;
  goal: string;
  branch?: string;
  model?: AiModelId;
  maxIterations?: number;
  timeoutSeconds?: number;
}

export interface DispatchAgentResponse {
  run: AgentRun;
}

export interface ApplyPatchRequest {
  patchId: string;
}

export interface CreatePullRequestFromAgentRequest {
  title?: string;
  body?: string;
  baseBranch?: string;
}

// ==========================================
// AI Pull Request Review & Test Synthesis (Phase 10)
// ==========================================

export type ReviewCategory =
  | 'Correctness'
  | 'Security'
  | 'Performance'
  | 'Maintainability'
  | 'Code Quality'
  | 'Testing'
  | 'Architecture';

export type ReviewSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

// Legacy aliases for backward compatibility
export type FindingCategory = ReviewCategory | 'security' | 'performance' | 'quality' | 'type_safety';
export type ReviewFindingSeverity = ReviewSeverity | 'info' | 'warning' | 'critical' | 'security';
export type ReviewDecision = 'APPROVED' | 'CHANGES_REQUESTED' | 'COMMENTED';
export type CodeReviewReportStatus = 'PENDING' | 'ANALYZING' | 'COMPLETED' | 'FAILED';

export interface CodeReviewFinding {
  id: string;
  file: string;
  line: number;
  category: ReviewCategory;
  severity: ReviewSeverity;
  explanation: string;
  recommendation: string;
  confidence: number; // 0.0 to 1.0 (e.g. 0.95)
  ruleId: string;
  title: string;
  message: string;
  filePath?: string; // alias to file
  startLine?: number; // alias to line
  endLine?: number;
  originalSnippet?: string;
  suggestedReplacement?: string;
  diffSnippet?: string;
  applied?: boolean;
}

export interface SynthesizedTestCase {
  id: string;
  name: string;
  description: string;
  type: 'happy_path' | 'boundary' | 'edge_case' | 'error_handling';
  code: string;
  passStatus?: 'passed' | 'failed' | 'untested';
}

export interface SynthesizedTestSuite {
  id: string;
  targetFile: string;
  testFilePath: string;
  framework: 'jest' | 'vitest' | 'pytest';
  fullCode: string;
  mockDefinitions: string[];
  testCases: SynthesizedTestCase[];
  estimatedCoverageDelta: number; // e.g. +4.5%
  executionResult?: {
    passed: boolean;
    total: number;
    passedCount: number;
    failedCount: number;
    durationMs: number;
    output: string;
  };
}

export interface CodeReviewSummary {
  overview: string;
  totalFindings: number;
  securityIssuesCount: number;
  performanceIssuesCount: number;
  qualityIssuesCount: number;
  typeSafetyIssuesCount: number;
  criticalIssuesCount: number;
  testCoverageDelta: number;
  securityScore: number;
  performanceScore: number;
  qualityScore: number;
  overallScore: number; // 0 - 100
}

export interface GitHubReviewComment {
  path: string;
  line: number;
  body: string;
  side?: 'RIGHT' | 'LEFT';
}

export interface CodeReviewReport {
  id: string;
  workspaceId: string;
  repositoryId: string;
  repositoryName: string;
  prNumber?: number;
  prTitle?: string;
  commitSha: string;
  baseBranch: string;
  headBranch: string;
  author: string;
  status: CodeReviewReportStatus;
  decision: ReviewDecision;
  summary: CodeReviewSummary;
  findings: CodeReviewFinding[];
  synthesizedTests: SynthesizedTestSuite[];
  analyzedFilesCount: number;
  totalLinesChanged: number;
  additions?: number;
  deletions?: number;
  publishedToGitHub?: boolean;
  publishedAt?: string;
  githubReviewId?: string;
  durationMs: number;
  createdAt: string;
  completedAt?: string;
}

export interface TriggerReviewRequest {
  workspaceId?: string;
  repositoryId: string;
  prNumber?: number;
  commitSha?: string;
  baseBranch?: string;
  headBranch?: string;
  rawDiff?: string;
  includeTestSynthesis?: boolean;
  publishToGitHub?: boolean;
}

export interface SynthesizeTestsRequest {
  repositoryId: string;
  filePath: string;
  functionNames?: string[];
  rawDiff?: string;
  framework?: 'jest' | 'vitest' | 'pytest';
}

export interface ApplyReviewSuggestionRequest {
  findingId: string;
  branch?: string;
}

export interface PublishGitHubCommentsRequest {
  repositoryId: string;
  prNumber: number;
  commitSha?: string;
  reviewId?: string;
  event?: 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT';
  body?: string;
}

export interface PublishGitHubCommentsResponse {
  success: boolean;
  published: boolean;
  githubReviewId?: string;
  commentsPublishedCount: number;
  message: string;
  publishedAt?: string;
}

export interface HumanComment {
  id: string;
  author: string;
  avatarUrl?: string;
  body: string;
  createdAt: string;
  file?: string;
  line?: number;
}

export interface PrDashboardData {
  prNumber: number;
  title: string;
  repository: string;
  author: string;
  baseBranch: string;
  headBranch: string;
  filesChanged: number;
  additions: number;
  deletions: number;
  score: number;
  decision: ReviewDecision;
  findings: CodeReviewFinding[];
  humanComments: HumanComment[];
  testResults: {
    passed: boolean;
    totalTests: number;
    passedCount: number;
    failedCount: number;
    durationMs: number;
    coverageDelta: string;
  };
  githubSyncStatus: {
    published: boolean;
    publishedAt?: string;
    githubReviewId?: string;
    commentCount: number;
  };
}

export interface ReviewMetricsResponse {
  totalReviews: number;
  averageScore: number;
  approvedCount: number;
  changesRequestedCount: number;
  securityIssuesPrevented: number;
  performanceIssuesResolved: number;
  testsGeneratedCount: number;
  avgReviewDurationMs: number;
}

// ==========================================
// AI Test Generation & Sandboxed Execution (Phase 11)
// ==========================================

export type TestType = 'unit' | 'integration' | 'edge_case' | 'failure_case';
export type TestExecutionStatus = 'PASS' | 'FAIL' | 'ERROR' | 'TIMEOUT' | 'UNTESTED';

export interface SandboxResourceLimits {
  cpuQuota: string; // e.g. "1.0 Core (1000m)"
  memoryLimitMb: number; // e.g. 512 MB
  timeoutSeconds: number; // e.g. 15s
  networkRestricted: boolean; // e.g. true (no host sockets)
}

export interface GeneratedTestCase {
  id: string;
  name: string;
  targetFunction: string;
  testType: TestType;
  code: string;
  status: TestExecutionStatus;
  durationMs?: number;
  failureMessage?: string;
  stackTrace?: string;
  assertionDiff?: {
    expected: string;
    received: string;
  };
  aiSuggestedFix?: {
    explanation: string;
    patchDiff: string;
    target: 'code' | 'test';
  };
}

export interface CoverageEstimate {
  statements: number;
  branches: number;
  functions: number;
  lines: number;
  coverageDelta: number; // e.g. +14.5%
}

export interface GeneratedTestSuiteResult {
  id: string;
  workspaceId: string;
  repositoryId: string;
  targetFile: string;
  testFilePath: string;
  framework: 'jest' | 'vitest' | 'pytest';
  fullCode: string;
  mockDefinitions: string[];
  testCases: GeneratedTestCase[];
  overallStatus: TestExecutionStatus;
  totalCount: number;
  passedCount: number;
  failedCount: number;
  errorCount: number;
  timedOutCount: number;
  totalDurationMs: number;
  coverageEstimate: CoverageEstimate;
  sandboxOutput: string;
  sandboxLimits: SandboxResourceLimits;
  createdAt: string;
  updatedAt: string;
}

export interface GenerateTestsRequest {
  workspaceId?: string;
  repositoryId: string;
  targetFile: string;
  targetFunction?: string;
  testTypes?: TestType[];
  framework?: 'jest' | 'vitest' | 'pytest';
  autoRunSandbox?: boolean;
  rawContent?: string;
}

export interface RunGeneratedTestsRequest {
  suiteId: string;
  timeoutSeconds?: number;
}

export interface ApplyTestFixRequest {
  suiteId: string;
  testCaseId: string;
  target: 'code' | 'test';
  patchDiff: string;
}

// ==========================================
// Real-Time Collaboration & CRDT Sync (Phase 12)
// ==========================================

export type PresenceStatus = 'online' | 'idle' | 'offline';

export interface UserActivityLocation {
  file?: string;
  prNumber?: number;
  documentId?: string;
  activity: string; // e.g. "Viewing auth.service.ts", "Reviewing PR #182", "Editing System Arch"
}

export interface UserPresence {
  userId: string;
  userName: string;
  email?: string;
  avatarUrl?: string;
  role?: string;
  status: PresenceStatus;
  currentLocation: UserActivityLocation;
  lastSeenAt: string;
  workspaceId: string;
}

export interface TypingIndicator {
  userId: string;
  userName: string;
  target: 'document' | 'comment' | 'chat';
  targetId: string;
  isTyping: boolean;
  timestamp: string;
}

export type NotificationType =
  | 'mention'
  | 'comment'
  | 'review_requested'
  | 'test_passed'
  | 'doc_shared';

export interface RealtimeNotification {
  id: string;
  workspaceId: string;
  recipientUserId?: string; // empty means all workspace members
  type: NotificationType;
  title: string;
  message: string;
  linkUrl?: string;
  actor: {
    userId: string;
    userName: string;
    avatarUrl?: string;
  };
  read: boolean;
  createdAt: string;
}

export interface DocumentComment {
  id: string;
  documentId: string;
  authorId: string;
  authorName: string;
  avatarUrl?: string;
  content: string;
  mentions: string[]; // e.g. ['rajesh', 'rahul']
  createdAt: string;
  updatedAt?: string;
}

export type ActivityActionType =
  | 'VIEWED_FILE'
  | 'REVIEWED_PR'
  | 'EDITED_DOC'
  | 'POSTED_COMMENT'
  | 'GENERATED_TESTS'
  | 'DISPATCHED_AGENT';

export interface ActivityFeedItem {
  id: string;
  workspaceId: string;
  actorName: string;
  actorAvatar?: string;
  action: ActivityActionType;
  target: string;
  description: string;
  timestamp: string;
}

export type DocOperationType = 'insert' | 'delete' | 'replace';

export interface DocOperation {
  id: string;
  documentId: string;
  userId: string;
  userName?: string;
  operationType: DocOperationType;
  position: number;
  text: string;
  length?: number;
  version: number;
  vectorClock: Record<string, number>;
  timestamp: number;
}

export interface CollaborativeDoc {
  id: string;
  workspaceId: string;
  title: string;
  content: string;
  version: number;
  lastModifiedBy: string;
  activeCollaboratorsCount: number;
  vectorClock: Record<string, number>;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentVersionSnapshot {
  id: string;
  documentId: string;
  version: number;
  title: string;
  content: string;
  modifiedBy: string;
  summary: string;
  createdAt: string;
}

export interface CreateDocumentRequest {
  workspaceId?: string;
  title: string;
  content?: string;
}

export interface UpdateDocumentRequest {
  title?: string;
  content?: string;
  operation?: DocOperation;
}

export interface PostCommentRequest {
  documentId: string;
  content: string;
}

export interface JoinDocumentSessionRequest {
  documentId: string;
  workspaceId?: string;
}

// ==========================================
// Security & Observability (Phase 13)
// ==========================================

export interface PercentileMetrics {
  p50: number;
  p95: number;
  p99: number;
  avg: number;
  min: number;
  max: number;
}

export interface SystemTelemetryMetrics {
  totalRequests: number;
  requestsPerSecond: number;
  errorRatePercentage: number;
  httpLatency: PercentileMetrics;
  aiLatency: PercentileMetrics;
  tokensConsumedTotal: number;
  queueDepth: Record<string, number>;
  cacheHitRatioPercentage: number;
  uptimeSeconds: number;
  activeWorkersCount: number;
  timestamp: string;
}

export type TraceTier =
  | 'FRONTEND'
  | 'API'
  | 'POSTGRES'
  | 'REDIS'
  | 'KAFKA'
  | 'WORKER'
  | 'AI_SERVICE';

export interface DistributedSpan {
  spanId: string;
  parentSpanId?: string;
  tier: TraceTier;
  name: string;
  service: string;
  durationMs: number;
  startTimeMs: number;
  status: 'OK' | 'ERROR';
  attributes: Record<string, unknown>;
  errorMessage?: string;
}

export interface DistributedTrace {
  traceId: string;
  rootOperation: string;
  totalDurationMs: number;
  status: 'OK' | 'ERROR';
  spans: DistributedSpan[];
  timestamp: string;
}

export interface TraceFilterQuery {
  status?: 'OK' | 'ERROR';
  limit?: number;
  service?: string;
}

export interface SecurityComplianceCheck {
  category: string;
  name: string;
  status: 'PASS' | 'WARN' | 'FAIL';
  description: string;
  recommendation?: string;
}

export interface SecurityComplianceReport {
  overallScore: number; // 0 - 100
  status: 'COMPLIANT' | 'NEEDS_ATTENTION' | 'NON_COMPLIANT';
  checks: SecurityComplianceCheck[];
  generatedAt: string;
}

export interface AuditLogQueryFilter {
  action?: string;
  userId?: string;
  resource?: string;
  status?: string;
  limit?: number;
}

export interface AuditLogStatsResponse {
  totalLogs: number;
  byAction: Record<string, number>;
  byStatus: Record<string, number>;
  topUsers: Array<{ userId: string; userEmail: string; count: number }>;
}



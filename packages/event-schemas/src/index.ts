/**
 * DEVFLOW AI — CloudEvents v1.0 Schemas & Kafka Topic Catalog
 */

export const KAFKA_TOPICS = {
  GITHUB_WEBHOOKS: 'devflow.github.webhooks.v1',
  REPO_INDEXING: 'devflow.repo.indexing.v1',
  REPO_INDEXED: 'devflow.repo.indexed.v1',
  AGENT_TASKS: 'devflow.agent.tasks.v1',
  AGENT_STEPS: 'devflow.agent.steps.v1',
  REVIEW_TRIGGERS: 'devflow.review.triggers.v1',
  REVIEW_RESULTS: 'devflow.review.results.v1',
  TEST_GENERATION: 'devflow.test.generation.v1',
  COLLAB_RELAY: 'devflow.collab.relay.v1',
  AUDIT_EVENTS: 'devflow.audit.events.v1',
  // Phase 6 Distributed Job Topics
  JOBS_REPOSITORY_INDEX: 'devflow.jobs.repository-index.v1',
  JOBS_CODE_ANALYSIS: 'devflow.jobs.code-analysis.v1',
  JOBS_EMBEDDING_GENERATION: 'devflow.jobs.embedding-generation.v1',
  JOBS_TEST_EXECUTION: 'devflow.jobs.test-execution.v1',
  JOBS_AI_REVIEW: 'devflow.jobs.ai-review.v1',
  JOBS_DOCUMENTATION: 'devflow.jobs.documentation.v1',
  // Retry topics with progressive delay tiers
  JOBS_RETRY_1: 'devflow.jobs.retry.1.v1', // tier 1: 1s
  JOBS_RETRY_2: 'devflow.jobs.retry.2.v1', // tier 2: 5s
  JOBS_RETRY_3: 'devflow.jobs.retry.3.v1', // tier 3: 30s
  // Dead letter topic
  JOBS_DLQ: 'devflow.jobs.dlq.v1',
  // Worker heartbeat topic
  WORKER_HEARTBEATS: 'devflow.workers.heartbeat.v1',
} as const;

export type KafkaTopic = (typeof KAFKA_TOPICS)[keyof typeof KAFKA_TOPICS];

/**
 * Standard CloudEvents v1.0 Envelope
 */
export interface CloudEventEnvelope<T = unknown> {
  specversion: '1.0';
  id: string;
  type: string;
  source: string;
  time: string;
  datacontenttype: 'application/json';
  traceparent?: string;
  data: T;
}

// ==========================================
// Event Data Payloads
// ==========================================

export interface RepoIndexingEventPayload {
  repositoryId: string;
  workspaceId: string;
  organizationId: string;
  githubRepoId: string;
  cloneUrl: string;
  commitSha: string;
  triggerType: 'MANUAL' | 'WEBHOOK_PUSH' | 'SCHEDULED';
  changedFiles?: string[];
}

export interface AgentTaskEventPayload {
  taskId: string;
  workspaceId: string;
  repositoryId: string;
  userId: string;
  prompt: string;
  targetBranch?: string;
  baseBranch: string;
  maxSteps: number;
  model: string;
}

export interface CodeReviewTriggerPayload {
  pullRequestId: string;
  repositoryId: string;
  githubPrNumber: number;
  baseSha: string;
  headSha: string;
  diffUrl: string;
}

export interface TestGenerationPayload {
  repositoryId: string;
  targetFile: string;
  framework: 'jest' | 'pytest' | 'go_test' | 'cargo_test';
  existingTestFile?: string;
}

// ==========================================
// Distributed Job Event Payloads (Phase 6)
// ==========================================

export interface JobDispatchedEventPayload<TPayload = Record<string, unknown>> {
  jobId: string;
  jobType: string;
  workspaceId?: string;
  repositoryId?: string;
  priority: number;
  attempt: number;
  maxRetries: number;
  timeoutSeconds: number;
  idempotencyKey?: string;
  payload: TPayload;
  enqueuedAt: string;
  traceId?: string;
}

export interface JobRetryEventPayload<TPayload = Record<string, unknown>> {
  jobId: string;
  jobType: string;
  attempt: number;
  maxRetries: number;
  retryTier: 1 | 2 | 3;
  scheduledDelayMs: number;
  lastError: {
    message: string;
    code?: string;
    stack?: string;
  };
  payload: TPayload;
  scheduledAt: string;
}

export interface JobDeadLetterEventPayload<TPayload = Record<string, unknown>> {
  jobId: string;
  jobType: string;
  workspaceId?: string;
  repositoryId?: string;
  attemptsExhausted: number;
  deadLetterReason: string;
  finalError: {
    message: string;
    code?: string;
    stack?: string;
  };
  originalPayload: TPayload;
  failedAt: string;
}

export interface WorkerHeartbeatEventPayload {
  workerId: string;
  workerType: string;
  hostname: string;
  pid: number;
  concurrency: number;
  activeJobsCount: number;
  status: 'ALIVE' | 'BUSY' | 'SHUTTING_DOWN' | 'DEAD';
  timestamp: string;
}


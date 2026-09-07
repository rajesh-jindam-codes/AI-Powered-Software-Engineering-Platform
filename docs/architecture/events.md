# DEVFLOW AI — Event-Driven Architecture & Kafka Specification

> **System Name**: DEVFLOW AI  
> **Document Version**: 1.0.0  
> **Component**: Event Streaming & Asynchronous Processing Engine (Apache Kafka)  
> **Author**: Senior Software Architect

---

## 1. Kafka Cluster Architecture Overview

DEVFLOW AI employs **Apache Kafka (KRaft mode)** as its distributed event backbone for high-throughput, fault-tolerant, asynchronous communication between the NestJS core platform, Python AI engine, GitHub webhooks, and sandbox execution workers.

```mermaid
graph TD
    subgraph Producers
        GHWebhook[GitHub Webhook Ingestion]
        NestCore[NestJS Core Monolith]
        AgentEngine[Python AI Agent Engine]
    end

    subgraph Kafka Cluster (3 AZs / KRaft Quorum)
        Broker1[Broker 1 / Controller - AZ 1]
        Broker2[Broker 2 / Controller - AZ 2]
        Broker3[Broker 3 / Controller - AZ 3]
    end

    subgraph Consumer Groups
        CG_Ingest[Consumer Group: repo-indexing-workers]
        CG_Agent[Consumer Group: agent-execution-workers]
        CG_Review[Consumer Group: pr-review-workers]
        CG_TestGen[Consumer Group: test-generation-workers]
        CG_Collab[Consumer Group: ws-collab-broadcasters]
        CG_Audit[Consumer Group: audit-compliance-archiver]
    end

    GHWebhook -->|acks=all / Key: repoId| Broker1
    NestCore -->|Transactional Outbox / Key: wsId| Broker2
    AgentEngine -->|Streaming Events / Key: taskId| Broker3

    Broker1 --- Broker2 --- Broker3

    Broker1 --> CG_Ingest
    Broker2 --> CG_Agent
    Broker3 --> CG_Review
    Broker1 --> CG_TestGen
    Broker2 --> CG_Collab
    Broker3 --> CG_Audit
```

### 1.1 Cluster Topology & Reliability Configuration

- **Broker Quorum**: 3 dedicated KRaft Controller/Broker instances distributed across 3 distinct AWS Availability Zones (`us-east-1a`, `us-east-1b`, `us-east-1c`).
- **Replication Factor**: `default.replication.factor = 3` for all production topics.
- **In-Sync Replicas**: `min.insync.replicas = 2`. Any write failing to replicate to at least 2 brokers is rejected, ensuring zero data loss (`acks = all`).
- **Partition Sizing**: Sized to support horizontal scale-out of worker consumers (standard: 6 to 12 partitions per topic).

---

## 2. Topic Catalog & Partitioning Strategy

All topic names follow the strict enterprise taxonomy: `devflow.<domain>.<entity-or-action>.<version>`.

| Topic Name                   | Partitions | Retention | Cleanup Policy | Key Strategy      | Purpose / Workload                                   |
| :--------------------------- | :--------- | :-------- | :------------- | :---------------- | :--------------------------------------------------- |
| `devflow.github.webhooks.v1` | 12         | 7 Days    | `delete`       | `repository_id`   | Raw incoming GitHub webhook deliveries.              |
| `devflow.repo.indexing.v1`   | 12         | 3 Days    | `delete`       | `repository_id`   | Repo AST parsing and vector embedding jobs.          |
| `devflow.repo.indexed.v1`    | 6          | 14 Days   | `compact`      | `repository_id`   | State notifications of completed repo indexing.      |
| `devflow.agent.tasks.v1`     | 12         | 7 Days    | `delete`       | `workspace_id`    | Autonomous coding agent task dispatch events.        |
| `devflow.agent.steps.v1`     | 16         | 7 Days    | `delete`       | `task_id`         | Live ReAct reasoning steps, tool calls, and outputs. |
| `devflow.review.triggers.v1` | 8          | 7 Days    | `delete`       | `pull_request_id` | PR code review requests triggered by webhooks.       |
| `devflow.review.results.v1`  | 8          | 14 Days   | `delete`       | `pull_request_id` | Completed code review findings & inline diffs.       |
| `devflow.test.generation.v1` | 8          | 7 Days    | `delete`       | `repository_id`   | Requests for automated test case synthesis.          |
| `devflow.collab.relay.v1`    | 24         | 1 Hour    | `delete`       | `workspace_id`    | Cross-node real-time WebSocket state broadcasts.     |
| `devflow.audit.events.v1`    | 6          | 365 Days  | `delete`       | `organization_id` | Enterprise compliance and security audit trail.      |

---

## 3. Event Schema Definitions (CloudEvents Specification)

DEVFLOW AI adheres to the **CloudEvents v1.0** specification. Every event payload contains structured metadata for distributed tracing, versioning, and idempotency.

```mermaid
classDiagram
    class CloudEvent {
        +string specversion
        +string type
        +string source
        +string id
        +string time
        +string datacontenttype
        +string traceparent
        +T data
    }

    class RepoIndexingPayload {
        +string repositoryId
        +string workspaceId
        +string cloneUrl
        +string commitSha
        +string defaultBranch
        +boolean forceReindex
    }

    class AgentTaskPayload {
        +string taskId
        +string workspaceId
        +string userId
        +string prompt
        +string targetBranch
        +object contextFiles
    }

    class CodeReviewTriggerPayload {
        +string pullRequestId
        +string repositoryId
        +int githubPrNumber
        +string baseSha
        +string headSha
        +string diffUrl
    }

    CloudEvent <|-- RepoIndexingPayload : data
    CloudEvent <|-- AgentTaskPayload : data
    CloudEvent <|-- CodeReviewTriggerPayload : data
```

### 3.1 Event Payloads Examples

#### `devflow.repo.indexing.v1`

```json
{
  "specversion": "1.0",
  "type": "devflow.repo.indexing.v1",
  "source": "https://api.devflow.ai/repositories",
  "id": "evt_9a8b7c6d-5e4f-3a2b-1c0d-9e8f7a6b5c4d",
  "time": "2026-09-06T20:58:30Z",
  "datacontenttype": "application/json",
  "traceparent": "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01",
  "data": {
    "repositoryId": "b1a7d60e-8f2c-4a3b-9e1d-5c6e7f8a9b0c",
    "workspaceId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "organizationId": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
    "githubRepoId": "78912345",
    "cloneUrl": "https://x-access-token:ghs_secret@github.com/org/repo.git",
    "commitSha": "9f8377f9e0f312c29c8e030b42f63e6206014e2b",
    "triggerType": "WEBHOOK_PUSH",
    "changedFiles": ["src/auth/jwt.service.ts", "src/auth/auth.module.ts"]
  }
}
```

#### `devflow.agent.tasks.v1`

```json
{
  "specversion": "1.0",
  "type": "devflow.agent.tasks.v1",
  "source": "https://api.devflow.ai/agents",
  "id": "evt_8f7e6d5c-4b3a-2a1b-0c9d-8e7f6a5b4c3d",
  "time": "2026-09-06T20:58:45Z",
  "datacontenttype": "application/json",
  "traceparent": "00-8a3c9f2277b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01",
  "data": {
    "taskId": "c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f",
    "workspaceId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "repositoryId": "b1a7d60e-8f2c-4a3b-9e1d-5c6e7f8a9b0c",
    "userId": "d1e2f3a4-b5c6-7d8e-9f0a-1b2c3d4e5f6a",
    "prompt": "Add rate limiting middleware to the payment checkout API using Redis sliding window.",
    "targetBranch": "feature/payment-rate-limiting",
    "baseBranch": "main",
    "maxSteps": 25,
    "model": "gpt-4o"
  }
}
```

---

## 4. Transactional Outbox Pattern & Producer Guarantees

To prevent data inconsistencies between the PostgreSQL database and Kafka (the dual-write problem), DEVFLOW AI enforces the **Transactional Outbox Pattern** in the NestJS platform.

```mermaid
sequenceDiagram
    autonumber
    participant App as NestJS Application Service
    participant DB as PostgreSQL (Business Tables + Outbox Table)
    participant Relay as Outbox Publisher Worker / Debezium CDC
    participant Kafka as Apache Kafka Cluster

    App->>DB: BEGIN TRANSACTION
    App->>DB: INSERT INTO agent_tasks (Task State)
    App->>DB: INSERT INTO outbox_events (Payload, Topic, Status='PENDING')
    App->>DB: COMMIT TRANSACTION (Atomic)

    Relay->>DB: SELECT * FROM outbox_events WHERE status = 'PENDING' FOR UPDATE SKIP LOCKED
    Relay->>Kafka: Produce Event (acks=all, enable.idempotence=true)
    Kafka-->>Relay: Ack (Offset Committed)
    Relay->>DB: UPDATE outbox_events SET status = 'PUBLISHED', published_at = NOW()
```

### 4.1 Producer Configuration Settings

```typescript
const kafkaProducerConfig = {
  clientId: 'devflow-api-producer',
  acks: -1, // equivalent to 'all'
  enableIdempotence: true,
  maxInFlightRequests: 5,
  compression: CompressionTypes.GZIP,
  retry: {
    maxRetryTime: 30000,
    initialRetryTime: 300,
    factor: 2,
    multiplier: 1.5,
    retries: 8,
  },
};
```

---

## 5. Consumer Architecture, Backpressure & Idempotency

### 5.1 Idempotent Consumer Processing

Consumers must handle duplicate deliveries gracefully. Every event ID is recorded in Redis with a 24-hour expiration before execution:

```mermaid
graph TD
    EventReceived[Consumer Receives Event from Kafka] --> CheckRedis{Check Redis Key: 'processed:event:{id}'}
    CheckRedis -->|Key Exists: Duplicate| CommitOffset[Ack & Commit Offset]
    CheckRedis -->|Key Not Found: New| AcquireLock[SET 'processed:event:{id}' NX EX 86400]
    AcquireLock --> ExecuteLogic[Execute Domain Business Logic]
    ExecuteLogic -->|Success| CommitOffset
    ExecuteLogic -->|Failure| ReleaseKey[DEL 'processed:event:{id}']
    ReleaseKey --> RouteRetry[Send to Retry Topic / DLQ]
```

---

## 6. Dead Letter Queue (DLQ) & Retry Topology

Heavy AI workloads (such as AST parsing or LLM tool executions) can fail due to transient network glitches, API rate limits, or malformed syntax. DEVFLOW AI employs a **3-tier exponential backoff retry mechanism**:

```mermaid
graph LR
    MainTopic[devflow.agent.tasks.v1] -->|Failure 1| RetryTopic1[devflow.agent.tasks.retry.5s]
    RetryTopic1 -->|Wait 5s & Retry| Consumer1[Agent Worker]
    Consumer1 -->|Failure 2| RetryTopic2[devflow.agent.tasks.retry.30s]
    RetryTopic2 -->|Wait 30s & Retry| Consumer2[Agent Worker]
    Consumer2 -->|Failure 3: Terminal| DLQ[devflow.agent.tasks.DLQ]

    DLQ --> AlertSystem[PagerDuty / Slack Alert]
    DLQ --> AdminUI[Admin Replay Tooling]
```

### 6.1 DLQ Alerting & Operator Replay CLI

- **Alert Rule**: Trigger a warning when DLQ message count > 0; trigger critical page when DLQ rate > 5 msgs/min.
- **Replay Tooling**: Admin CLI command `devflow-cli dlq replay --topic devflow.agent.tasks.DLQ --limit 100` allows re-submitting repaired payloads to the primary topic.

# DevFlow AI — Distributed Event Bus & Job Queue Specification

**Document Version:** 1.0.0  
**Technologies:** Apache Kafka 3.5 / Amazon MSK + Redis 7 BullMQ  
**Target Capabilities:** Distributed Jobs, 3-Tier Exponential Retries, Dead-Letter Queues (DLQ), Idempotency Deduplication  

---

## 1. Event Topics & Schemas

DevFlow AI processes asynchronous engineering workloads via partitioned Apache Kafka topics:

| Topic Name | Partition Key | Payload Schema | Consumers | Retention |
| :--- | :--- | :--- | :--- | :--- |
| `devflow.jobs.repository-index.v1` | `repositoryId` | `RepositoryIndexPayload` | `IndexWorker` | 7 Days |
| `devflow.jobs.code-analysis.v1` | `repositoryId` | `CodeAnalysisPayload` | `AnalysisWorker` | 7 Days |
| `devflow.jobs.embedding-generation.v1` | `repositoryId` | `EmbeddingGenerationPayload`| `EmbeddingWorker` | 7 Days |
| `devflow.jobs.test-execution.v1` | `workspaceId` | `TestExecutionPayload` | `TestWorker` | 3 Days |
| `devflow.jobs.ai-review.v1` | `repositoryId` | `AiReviewPayload` | `ReviewWorker` | 14 Days |
| `devflow.jobs.documentation.v1` | `repositoryId` | `DocumentationPayload` | `DocumentationWorker` | 7 Days |

---

## 2. 3-Tier Exponential Backoff Retry Architecture

Transient errors (e.g. rate limits, network blips, temporary LLM throttling) are automatically routed through exponential backoff retry queues:

```mermaid
flowchart TD
    Job[Incoming Job] --> Primary[Primary Queue: devflow.jobs.{type}.v1]
    Primary -->|Attempt 1 Fails (Transient)| Retry1[Tier 1 Retry: devflow.jobs.retry.1.v1 - Delay: 2s]
    Retry1 -->|Attempt 2 Fails| Retry2[Tier 2 Retry: devflow.jobs.retry.2.v1 - Delay: 10s]
    Retry2 -->|Attempt 3 Fails| Retry3[Tier 3 Retry: devflow.jobs.retry.3.v1 - Delay: 60s]
    Retry3 -->|Max Retries Exhausted| DLQ[Dead-Letter Queue: devflow.jobs.dlq.v1]
    
    Primary -->|Fatal Error (Schema Violation)| DLQ
```

### Dead-Letter Queue (DLQ) Management:
* Jobs routed to the DLQ trigger automated CloudWatch alarms.
* Engineers can inspect error stack traces, edit payloads, and replay dead-lettered jobs with 1 click via the Web Cockpit (`/jobs`).

---

## 3. Idempotency & Deduplication Engine

Every event and job payload accepts an optional `idempotencyKey` (e.g. `evt_push_sha_88f9e1`).

```
API Request with idempotencyKey
            │
            ▼
Check Redis: SETNX idempotency:{idempotencyKey} {jobId} EX 86400
            ├── Key Exists ──► Return existing in-flight/completed Job record (0 duplicate jobs created)
            └── Key New    ──► Enqueue new job & proceed
```

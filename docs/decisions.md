# DevFlow AI — Architectural Decision Records (ADRs)

This document captures the key architectural and design decisions made across all 16 phases of DevFlow AI.

---

### ADR-001: Monorepo Architecture (Turborepo & npm Workspaces)
* **Status**: Accepted
* **Context**: Need unified versioning, shared TypeScript interfaces, and co-located microservices.
* **Decision**: Adopt Turborepo with npm workspaces managing `@devflow/api` (NestJS), `@devflow/web` (Next.js 14), and `@devflow/ai-service` (FastAPI).
* **Consequences**: Shared types across frontend/backend, unified CI pipeline, atomic feature commits.

---

### ADR-002: PostgreSQL 16 with pgvector HNSW Indexing
* **Status**: Accepted
* **Context**: Require unified relational metadata storage and ultra-low latency vector cosine similarity lookups.
* **Decision**: Use PostgreSQL 16 with native `pgvector` extension and HNSW indexing (`m = 16, ef_construction = 64`) instead of a separate standalone vector database (e.g. Pinecone/Milvus).
* **Consequences**: Single ACID transaction boundary, zero data drift between code metadata and vector chunks, sub-3ms cosine lookups.

---

### ADR-003: Apache Kafka & Redis BullMQ for Asynchronous Jobs
* **Status**: Accepted
* **Context**: High-volume AST parsing, embedding generation, and PR reviews must not block user-facing REST APIs.
* **Decision**: Use partitioned Apache Kafka topics for event sourcing and Redis BullMQ for lightweight in-memory task queues.
* **Consequences**: Horizontal scalability across worker nodes, decoupled microservices, automated 3-tier exponential backoff retries.

---

### ADR-004: Tree-sitter for Multi-Language AST Parsing
* **Status**: Accepted
* **Context**: Regex-based code chunking destroys semantic boundaries (functions, classes, guards).
* **Decision**: Adopt Tree-sitter parsers to extract semantic AST symbols, breadcrumbs, APIs, and dependencies.
* **Consequences**: Accurate chunking on syntax boundaries, language-agnostic extensibility.

---

### ADR-005: Hybrid Search (HNSW Cosine + Trigram + AST Symbol)
* **Status**: Accepted
* **Context**: Pure vector search struggles with exact keyword lookups (e.g., function names, variable identifiers).
* **Decision**: Combine pgvector cosine distance, PostgreSQL GIN trigram keyword matching, and B-Tree symbol index queries with Reciprocal Rank Fusion (RRF).
* **Consequences**: Superior search precision and recall across both conceptual and exact symbol queries.

---

### ADR-006: ReAct Loop with Controlled Tool Registry for Autonomous Agents
* **Status**: Accepted
* **Context**: Autonomous agents require multi-step reasoning without risking arbitrary system command execution.
* **Decision**: Implement a 6-phase ReAct loop restricted to 11 strictly typed, validated tools executing within virtual sandboxes.
* **Consequences**: Zero arbitrary shell commands permitted, sandboxed testing, predictable audit trails.

---

### ADR-007: CRDT Vector-Clock Convergence for Collaborative Engineering Notes
* **Status**: Accepted
* **Context**: Real-time multiplayer editing across engineering notes without central locking bottlenecks.
* **Decision**: Implement Conflict-free Replicated Data Types (CRDT) with vector-clock sequence stamping.
* **Consequences**: Deterministic convergence, offline editing tolerance, zero lock contention.

---

### ADR-008: OpenTelemetry 6-Tier Distributed Tracing & W3C traceparents
* **Status**: Accepted
* **Context**: End-to-end request visibility across Web, API, Postgres, Redis, Kafka, Workers, and AI engine.
* **Decision**: Standardize on W3C `traceparent` propagation across all 6 architecture tiers.
* **Consequences**: Full waterfall span inspection, accurate P50/P95/P99 latency attribution.

---

### ADR-009: Fail-Fast CI/CD Quality Gates
* **Status**: Accepted
* **Context**: Prevent broken builds, unformatted code, or vulnerable packages from reaching staging/production.
* **Decision**: Strict linear GitHub Actions pipeline: `Lint` → `Typecheck` → `Unit Tests` → `Integration Tests` → `Build` → `Docker Build` → `Security Scan`.
* **Consequences**: Zero broken deployments in production.

---

### ADR-010: Zero-Downtime Blue/Green Rollouts with Automated Rollback
* **Status**: Accepted
* **Context**: Production deployments must achieve 99.99% availability without downtime during upgrades.
* **Decision**: Implement AWS CodeDeploy Canary/Blue-Green traffic shifting with automated CloudWatch rollback triggers.
* **Consequences**: Seamless version updates, instant rollback on error rate > 0.5%.

---

### ADR-011: Strict Multi-Tenant RBAC Isolation
* **Status**: Accepted
* **Context**: Prevent data leaks between organizations and workspaces.
* **Decision**: Enforce `workspace_id` tenant scoping at database query level and cryptographic JWT token validation.
* **Consequences**: Zero cross-tenant data leakage.

---

### ADR-012: Layered Caching for AI Query Embeddings
* **Status**: Accepted
* **Context**: Repeated user questions cause unnecessary external LLM embedding API costs and latency.
* **Decision**: Implement Redis L2 caching on query text hashes.
* **Consequences**: 89% cache hit ratio, sub-5ms response times on cached queries.

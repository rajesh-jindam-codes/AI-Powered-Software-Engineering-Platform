# DevFlow AI — Quality Assurance, Testing & Verification Strategy

**Document Version:** 1.0.0  
**Frameworks:** Jest, Vitest, PyTest, Playwright, k6  

---

## 1. Multi-Tier Testing Pyramid

```
                / \
               / E2E \       Playwright Browser E2E Lifecycle (10 Steps)
              /-------\
             /  Load   \     k6 Distributed Load Testing (RPS, P95, Latencies)
            /-----------\
           / Integration \   API + PostgreSQL + Redis + Kafka + Workers (9-Stage Pipeline)
          /---------------\
         /    Unit Tests   \ 19 NestJS Test Suites (182 Tests) + 5 Pytest Suites
        /-------------------\
```

---

## 2. Test Suites Overview

### A. NestJS Unit & Integration Tests (19 Suites, 182 Tests)
* **Auth & RBAC**: `auth.service.spec.ts` (Login, registration, token rotation, RBAC guards).
* **Workspaces**: `workspace.service.spec.ts` (Tenant isolation, member roles).
* **GitHub Integration**: `github.service.spec.ts` (OAuth, webhook HMAC signatures).
* **Code Ingestion**: `ingestion.service.spec.ts` (File filters, Tree-sitter parsers, chunking).
* **Code Graph & Extractors**: `intelligence.extractors.spec.ts`, `code-graph-builder.spec.ts`.
* **Multi-Modal Search**: `code-search.service.spec.ts` (Keyword, Symbol, Semantic).
* **RAG Engine**: `rag.service.spec.ts` (Context builder, citations, token streaming).
* **Autonomous Agents**: `agents.service.spec.ts` (ReAct loop, sandbox execution, checkout bug benchmark).
* **AI PR Reviews**: `reviews.service.spec.ts` (7 review categories, GitHub publishing).
* **AI Test Studio**: `test-generation.service.spec.ts` (9-step test generation, self-healing).
* **Real-Time Collaboration**: `collaboration.service.spec.ts` (Presence, CRDT vector clock convergence).
* **Distributed Jobs & Kafka**: `jobs.service.spec.ts`, `workers.spec.ts`, `failure-simulation.spec.ts`.
* **Security & Observability**: `observability.service.spec.ts` (SSRF, secret masking, P50/P95/P99 metrics, 6-tier tracing).
* **Full Pipeline E2E Integration**: `e2e-pipeline.spec.ts` (9-stage full lifecycle).

### B. Python AI Engine Tests (`apps/ai-service`)
* `test_health.py`: Liveness and readiness probes.
* `test_exceptions.py`: RFC 7807 problem details error format and exception handlers.

### C. Playwright Browser E2E Suite (`tests/e2e/devflow-lifecycle.spec.ts`)
* Automates the full 10-step developer journey:
  `Register` → `Login` → `Create Workspace` → `Connect GitHub` → `Import Repo` → `Ingestion & Search` → `RAG Chat` → `Test Studio` → `Review PR` → `Collaboration`.

### D. k6 Distributed Load Testing (`tests/load/`)
* Measures RPS, P50, P95, P99, and error rate across REST APIs, Search, Kafka Jobs, AI RAG, and WebSockets.

---

## 3. Test Execution Commands

```bash
# 1. Run all NestJS API tests
npm test

# 2. Run specific integration test
npm test -- e2e-pipeline.spec.ts

# 3. Run Python AI service tests
cd apps/ai-service && python -m pytest tests/ && cd ../..

# 4. Run Playwright E2E tests
npx playwright test

# 5. Run k6 Load tests
k6 run tests/load/api-benchmark.js
```

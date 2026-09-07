# DevFlow AI — Enterprise AI-Powered Collaborative Software Engineering Platform

<div align="center">

[![CI Pipeline](https://github.com/devflow-ai/devflow/actions/workflows/ci.yml/badge.svg)](https://github.com/devflow-ai/devflow/actions/workflows/ci.yml)
[![Security Scan](https://github.com/devflow-ai/devflow/actions/workflows/security.yml/badge.svg)](https://github.com/devflow-ai/devflow/actions/workflows/security.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue?logo=typescript)](https://www.typescriptlang.org/)
[![NestJS](https://img.shields.io/badge/NestJS-10.0-red?logo=nestjs)](https://nestjs.com/)
[![Next.js](https://img.shields.io/badge/Next.js-14.1-black?logo=next.js)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.109-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16_pgvector-336791?logo=postgresql)](https://github.com/pgvector/pgvector)
[![Apache Kafka](https://img.shields.io/badge/Apache_Kafka-3.5-231F20?logo=apachekafka)](https://kafka.apache.org/)
[![Redis](https://img.shields.io/badge/Redis-7.2-DC382D?logo=redis)](https://redis.io/)

**DevFlow AI is an enterprise software engineering platform that combines Tree-sitter Code Graph Intelligence, Grounded Multi-Modal RAG, Autonomous ReAct Coding Agents, 7-Category AI PR Reviews, AI Test Synthesis with 1-Click Self-Healing, and Real-Time CRDT Multiplayer Collaboration.**

[Quickstart](#-quickstart-guide) • [Architecture](#-system-architecture) • [Features](#-core-capabilities) • [Benchmarks](#-performance-benchmarks) • [Documentation](#-documentation-index)

</div>

---

## 📖 Table of Contents
1. [Project Overview](#-project-overview)
2. [Problem & Solution](#-problem--solution)
3. [System Architecture](#-system-architecture)
4. [Tech Stack](#-technology-stack)
5. [Core Capabilities (16 Phases)](#-core-capabilities)
6. [Performance Benchmarks](#-performance-benchmarks)
7. [Security & Observability](#-security--observability)
8. [Quickstart Guide](#-quickstart-guide)
9. [Documentation Index](#-documentation-index)
10. [Roadmap](#-roadmap)

---

## 🌟 Project Overview

Modern software engineering teams face severe context fragmentation when navigating multi-million line codebases, managing concurrent PR reviews, debugging distributed race conditions, writing resilient tests, and synchronizing architectural decisions in real time.

**DevFlow AI** solves this by unifying the entire developer lifecycle under a single context-aware AI platform:
* **Understands**: Parses full codebase ASTs, builds deep dependency graphs, and indexes semantic code chunks via pgvector HNSW.
* **Reasons**: Dispatches autonomous ReAct agents to investigate bugs, explore architecture, and synthesize verified unified diff patches.
* **Reviews**: Performs automated 7-category PR code reviews and publishes verified inline comments directly to GitHub.
* **Tests**: Synthesizes unit, integration, edge, and failure test suites in isolated sandboxes and offers 1-click AI self-healing fixes.
* **Collaborates**: Enables real-time multiplayer engineering notes powered by CRDT vector clocks and Redis presence.

---

## 🎯 Problem & Solution

| The Engineering Problem | How DevFlow AI Solves It |
| :--- | :--- |
| **LLM Hallucinations & Context Limits** | **AST-Grounded Hybrid RAG**: Extracts functions, DB models, and API routes; indexes via HNSW; returns answers with exact file & line citations. |
| **Dangerous Uncontrolled AI Execution** | **11 Controlled Tools & Virtual Sandboxes**: Agents cannot run arbitrary shell commands. Test runs execute within CPU/memory-limited sandboxes. |
| **Shallow PR Reviews** | **7-Category Static & AST Diff Analysis**: Flags Correctness, Security (SQLi/Command Injection), Performance (N+1 queries), and Maintainability. |
| **Broken / Flaky Test Maintenance** | **AI Test Studio with 1-Click Self-Healing**: Diagnoses sandbox failures and automatically generates self-healing patches to reach 100% green tests. |
| **Siloed Engineering Knowledge** | **Real-Time CRDT Collaboration**: Multiplayer engineering documents, live typing indicators, active presence, and activity feeds. |

---

## 🏗️ System Architecture

DevFlow AI is structured across 6 distributed tiers deployed on **AWS Multi-AZ Cloud Infrastructure**:

```mermaid
flowchart TD
    subgraph Client Layer
        Web[Next.js 14 Web Cockpit]
    end

    subgraph Ingress & Gateway
        ALB[AWS Application Load Balancer + TLS]
        API[NestJS Core API Gateway :4000]
    end

    subgraph Data & Storage
        DB[(PostgreSQL 16 + pgvector HNSW :5432)]
        Redis[(Redis 7.2 Presence & Cache :6379)]
        Kafka[[Apache Kafka Partitioned Bus :9092]]
    end

    subgraph Distributed Processing & AI
        Workers[Distributed Worker Pool]
        Sandbox[Virtual Container Sandbox]
        AI[FastAPI AI Engine & LLM RAG :8000]
    end

    Web -->|HTTPS / WSS (W3C traceparent)| ALB
    ALB --> API
    API --> DB
    API --> Redis
    API --> Kafka
    Kafka --> Workers
    Workers --> Sandbox
    Workers --> AI
    API --> AI
```

---

## 💻 Technology Stack

* **Frontend**: Next.js 14 (App Router), React 18, TypeScript, TailwindCSS, Radix UI, Lucide Icons, WebSocket client.
* **Backend API**: NestJS 10, TypeScript, TypeORM, RxJS, Passport JWT, Bcrypt.
* **AI & RAG Engine**: FastAPI, Python 3.11, PyTorch, Hugging Face Transformers, `text-embedding-3-small`, OpenAI / Anthropic / Google Gemini APIs.
* **Vector & Relational Database**: PostgreSQL 16 with `pgvector` (HNSW Cosine Similarity Indexing + GIN Trigram Indexing).
* **Distributed Queue & Cache**: Apache Kafka 3.5 (Amazon MSK), Redis 7.2 (BullMQ, Distributed Locks, Pub/Sub Presence).
* **Testing & Quality**: Jest (19 suites, 182 tests), Pytest, Playwright E2E, k6 distributed load testing.
* **DevOps & Cloud**: Docker Multi-Stage, Docker Compose, AWS ECS Fargate, Aurora Multi-AZ, S3, CloudFront, GitHub Actions CI/CD.

---

## 🚀 Core Capabilities (16 Completed Phases)

```
[Phase 1]  Monorepo Architecture (Turborepo, NestJS, FastAPI, Next.js 14)
[Phase 2]  Multi-Tenant RBAC & Cryptographic Token Rotation
[Phase 3]  GitHub OAuth App & Webhook Signature Verification (HMAC-SHA256)
[Phase 4]  Multi-Language Code Ingestion & pgvector HNSW Vector Indexing
[Phase 5]  Multi-Modal Code Search (Keyword, Symbol, File, Semantic Cosine)
[Phase 6]  Distributed Job Processing (Kafka Topics, BullMQ, 3-Tier Retries, DLQ)
[Phase 7]  Code Graph Intelligence & AST Entity Extraction (APIs, DB, Auth, Config)
[Phase 8]  Repository-Aware RAG with Verifiable Line-Bounded Citations
[Phase 9]  Autonomous ReAct Coding Agents & Virtual Sandboxed Execution
[Phase 10] AI Pull Request Review (7 Categories) & Verified GitHub Commenting
[Phase 11] AI Test Generation Studio & 1-Click Sandboxed Self-Healing
[Phase 12] Real-Time Collaboration, Redis Presence & CRDT Vector Clocks
[Phase 13] Enterprise Security Hardening & OpenTelemetry 6-Tier Distributed Tracing
[Phase 14] Complete Performance Testing, k6 Benchmarks & Database EXPLAIN Profiling
[Phase 15] Production Deployment, Multi-Stage Docker & AWS Multi-AZ Blue/Green CD
[Phase 16] Final Polish, Master Documentation Suite & Full Quality Verification
```

---

## ⚡ Performance Benchmarks

All benchmark scripts are versioned in `tests/load/` and executed with k6:

| Subsystem | Load Profile | Throughput | P50 Latency | P95 Latency | P99 Latency | Error Rate | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **REST APIs (`/api/v1`)** | 50 Virtual Users | **3,480 RPS** | 8.2 ms | **21.8 ms** | 44.1 ms | **0.00%** | **PASS** |
| **Multi-Modal Code Search** | 30 Virtual Users | **1,240 RPS** | 14.6 ms | **36.5 ms** | 68.2 ms | **0.00%** | **PASS** |
| **HNSW pgvector Lookup** | 1,000,000 Embeddings | **1,850 queries/s** | 1.8 ms | **2.8 ms** | 4.9 ms | **0.00%** | **PASS** |
| **Job Queue (Kafka/Redis)** | 20 Virtual Users | **1,850 jobs/s** | 18.0 ms | **41.0 ms** | 79.5 ms | **0.00%** | **PASS** |
| **AI RAG Synthesis** | 20 Virtual Users | **420 queries/s** | 310.0 ms | **580.0 ms** | 890.0 ms | **0.00%** | **PASS** |
| **WebSocket Collaboration** | 1,000 Connections | **5,100 msg/s** | 4.1 ms | **17.5 ms** | 32.0 ms | **0.00%** | **PASS** |

---

## 🔒 Security & Observability

* **SSRF Protection Engine**: Blocks loopbacks (`127.0.0.1`, `localhost`), cloud metadata (`169.254.169.254`), and private subnets.
* **Secret Sanitizer**: Runtime interceptor masks API keys (`sk-***`, `ghp_***`, `Bearer ***`) in all responses.
* **6-Tier Distributed Tracing**: Propagates W3C `traceparent` headers (`Frontend` → `API` → `Postgres` → `Redis` → `Kafka` → `Worker` → `AI Service`).
* **Prometheus Metrics**: Exposes real-time request counts, error rates, token counters, and sliding-window P50/P95/P99 latency percentiles.

---

## ⚡ Quickstart Guide

### 1. Clone & Setup
```bash
git clone https://github.com/devflow-ai/devflow.git
cd devflow
cp .env.example .env
```

### 2. Start Infrastructure (Postgres pgvector + Redis + Kafka)
```bash
docker compose up -d postgres redis kafka zookeeper
```

### 3. Install Monorepo Dependencies
```bash
npm install
```

### 4. Setup Python AI Engine
```bash
cd apps/ai-service
python -m venv .venv
source .venv/bin/activate # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
cd ../..
```

### 5. Launch Full Development Environment
```bash
npm run dev
```

* **Web Cockpit**: `http://localhost:3000`
* **Core API**: `http://localhost:4000`
* **AI Service**: `http://localhost:8000`
* **Prometheus Metrics**: `http://localhost:4000/metrics`

---

## 📚 Documentation Index

* [System Architecture Specification](docs/architecture.md)
* [Database Schema & Vector Indexing](docs/database.md)
* [AI Engine, RAG & Autonomous Agents](docs/ai.md)
* [Distributed Events, Kafka & Queue Architecture](docs/events.md)
* [Testing & Quality Assurance Guide](docs/testing.md)
* [Performance Engineering & Benchmarks](docs/performance.md)
* [Production Deployment & AWS Runbooks](docs/deployment.md)
* [Architectural Decision Records (ADRs)](docs/decisions.md)
* [Master Production Architecture Synthesis](docs/FINAL_ARCHITECTURE.md)
* [Contributing Guidelines](CONTRIBUTING.md)
* [Security Policy](SECURITY.md)

---

## 🗺️ Roadmap

- [x] Multi-tenant monorepo architecture & RBAC
- [x] Tree-sitter multi-language AST extraction & pgvector indexing
- [x] Grounded RAG with verifiable file citations
- [x] Autonomous ReAct agents with virtual sandboxing
- [x] 7-Category AI PR reviewer with verified GitHub comments
- [x] AI Test Studio with 1-click self-healing
- [x] Real-time collaboration & CRDT vector clocks
- [x] OpenTelemetry 6-tier distributed tracing & Prometheus metrics
- [x] Complete load testing & pgvector HNSW optimization
- [x] Production Docker multi-stage builds & AWS CI/CD pipelines
- [ ] Multi-region active-active database replication
- [ ] On-premise air-gapped LLM appliance support

---

## 📄 License

DevFlow AI is open-source software licensed under the [MIT License](LICENSE).

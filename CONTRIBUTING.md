# Contributing to DevFlow AI

Thank you for your interest in contributing to **DevFlow AI** — the enterprise AI-powered collaborative software engineering platform.

---

## 1. Code of Conduct

We are committed to providing a welcoming, diverse, and harassment-free environment for all contributors. Please be respectful, constructive, and collaborative in all discussions and pull requests.

---

## 2. Monorepo Architecture

DevFlow AI is structured as a Turborepo / npm workspaces monorepo:

```
DevFlow/
├── apps/
│   ├── api/             # NestJS Monolith Core API (Port 4000)
│   ├── web/             # Next.js 14 Web Cockpit (Port 3000)
│   └── ai-service/      # FastAPI Python AI & RAG Engine (Port 8000)
├── packages/
│   ├── shared-types/    # TypeScript types & interfaces
│   ├── event-schemas/   # Kafka & Redis event schemas
│   ├── config/          # Shared ESLint, TS, and Prettier configs
│   └── ui/              # Shared Tailwind / Radix UI components
├── infrastructure/      # PostgreSQL pgvector, Redis, Kafka, Monitoring
├── docs/                # Architecture, API, AI, and Deployment specifications
└── tests/               # E2E (Playwright) & Load (k6) benchmark suites
```

---

## 3. Local Development Setup

### Prerequisites
* **Node.js**: `v20.x` or higher
* **npm**: `v10.x` or higher
* **Python**: `3.11` or higher
* **Docker & Docker Compose**: For local PostgreSQL (pgvector), Redis, and Kafka

### Installation Steps
```bash
# 1. Clone the repository
git clone https://github.com/devflow-ai/devflow.git
cd devflow

# 2. Copy environment template
cp .env.example .env

# 3. Start local infrastructure stack (Postgres + Redis + Kafka)
docker compose up -d postgres redis kafka zookeeper

# 4. Install Monorepo dependencies
npm install

# 5. Setup Python AI service virtual environment
cd apps/ai-service
python -m venv .venv
source .venv/bin/activate # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
cd ../..

# 6. Start full local development servers
npm run dev
```

The web cockpit will be accessible at `http://localhost:3000` and the API at `http://localhost:4000`.

---

## 4. Quality Gate & Testing

Before submitting a Pull Request, all automated quality gates must pass:

```bash
# 1. Code Formatting
npm run format:check

# 2. Strict Monorepo Typecheck
npm run typecheck

# 3. Code Linting
npm run lint

# 4. NestJS Unit & Integration Tests (19 suites, 182 tests)
npm test

# 5. Python AI Engine Tests
cd apps/ai-service && python -m pytest tests/ && cd ../..

# 6. Production Monorepo Build
npm run build
```

---

## 5. Branching & Pull Request Workflow

1. Create a descriptive feature or bugfix branch from `main`:
   ```bash
   git checkout -b feat/ai-agent-memory-enhancement
   # or
   git checkout -b fix/crdt-vector-clock-collision
   ```
2. Make targeted, focused commits using **Conventional Commits**:
   - `feat(agents): add multi-step AST symbol backtracking`
   - `fix(crdt): resolve concurrent deletion tombstone convergence`
   - `docs(deployment): add AWS Aurora PostgreSQL failover runbook`
3. Ensure zero hardcoded secrets, passwords, or `.env` files are committed.
4. Push your branch and open a Pull Request against `main`.
5. Automated CI will run the 5-stage verification gate. Once approved by maintainers, it will be merged via Squash & Merge.

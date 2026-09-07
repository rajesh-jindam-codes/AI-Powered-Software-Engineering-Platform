'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Bot,
  User,
  Sparkles,
  Send,
  Square,
  RotateCcw,
  Copy,
  Check,
  Search,
  Plus,
  Trash2,
  Edit2,
  FileCode,
  FolderGit2,
  GitBranch,
  Layers,
  Cpu,
  Zap,
  Code2,
  Database,
  Shield,
  CreditCard,
  ShoppingCart,
  ExternalLink,
  ChevronRight,
  Info,
  Sliders,
  DollarSign,
  Clock,
  Terminal,
  X,
  Maximize2,
  Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  AiChatCitation,
  AiChatConversation,
  AiChatMessage,
  AiChatUsage,
  AiModelId,
  RagPipelineStage,
} from '@devflow/shared-types';

// Preset Benchmark Prompts
const BENCHMARK_PROMPTS = [
  {
    icon: Shield,
    label: 'Authentication',
    prompt: 'Where is authentication implemented?',
    color: 'from-blue-500/20 to-cyan-500/20 border-blue-500/30 text-blue-400',
  },
  {
    icon: ShoppingCart,
    label: 'Checkout Flow',
    prompt: 'How does checkout work?',
    color: 'from-purple-500/20 to-pink-500/20 border-purple-500/30 text-purple-400',
  },
  {
    icon: Layers,
    label: 'Repository Architecture',
    prompt: 'Explain this repository.',
    color: 'from-amber-500/20 to-orange-500/20 border-amber-500/30 text-amber-400',
  },
  {
    icon: Database,
    label: 'PostgreSQL Config',
    prompt: 'Where is PostgreSQL configured?',
    color: 'from-emerald-500/20 to-teal-500/20 border-emerald-500/30 text-emerald-400',
  },
  {
    icon: CreditCard,
    label: 'Order Lifecycle',
    prompt: 'What happens when an order is created?',
    color: 'from-rose-500/20 to-red-500/20 border-rose-500/30 text-rose-400',
  },
];

const AVAILABLE_MODELS: Array<{ id: AiModelId; name: string; provider: string; costDesc: string }> = [
  { id: 'devflow-code-rag-v1', name: 'DevFlow RAG v1', provider: 'DevFlow AST Engine', costDesc: '$0.50/M in • $1.50/M out' },
  { id: 'gpt-4o', name: 'OpenAI GPT-4o', provider: 'OpenAI', costDesc: '$2.50/M in • $10.00/M out' },
  { id: 'claude-3-5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'Anthropic', costDesc: '$3.00/M in • $15.00/M out' },
  { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', provider: 'Google AI', costDesc: '$1.25/M in • $5.00/M out' },
];

export default function CodebaseChatPage() {
  // Model & Filter States
  const [selectedModel, setSelectedModel] = useState<AiModelId>('devflow-code-rag-v1');
  const [selectedRepo, setSelectedRepo] = useState('repo-core-001');
  const [selectedBranch, setSelectedBranch] = useState('main');

  // Conversation Management
  const [conversations, setConversations] = useState<AiChatConversation[]>([
    {
      id: 'conv-1',
      workspaceId: 'ws-core-001',
      repositoryId: 'repo-core-001',
      repositoryName: 'core-engine',
      title: 'Authentication & JWT Security Flow',
      model: 'devflow-code-rag-v1',
      totalInputTokens: 412,
      totalOutputTokens: 248,
      totalEstimatedCost: 0.000578,
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      updatedAt: new Date(Date.now() - 1800000).toISOString(),
      messages: [
        {
          id: 'msg-seed-1',
          conversationId: 'conv-1',
          role: 'user',
          content: 'Where is authentication implemented?',
          status: 'completed',
          createdAt: new Date(Date.now() - 3600000).toISOString(),
        },
        {
          id: 'msg-seed-2',
          conversationId: 'conv-1',
          role: 'assistant',
          content: `Authentication in **DevFlow AI** is structured across a dedicated NestJS modular architecture with JWT token issuance, bcrypt password hashing, and route-level guard interception:

### 1. HTTP Controllers & Routing
The authentication endpoints for user registration, login, and profile retrieval are defined in:
* **\`apps/api/src/modules/auth/auth.controller.ts\`** (Lines 6-26)
  - \`POST /api/v1/auth/register\`: Validates credentials and creates new tenant accounts.
  - \`POST /api/v1/auth/login\`: Authenticates users and returns signed JWT access & refresh tokens.
  - \`GET /api/v1/auth/me\`: Protected profile route decorated with \`@UseGuards(JwtAuthGuard)\`.

### 2. Business Logic & Token Issuance
User credential verification and cryptographic operations are encapsulated in:
* **\`apps/api/src/modules/auth/auth.service.ts\`** (Lines 5-31)
  - \`validateUser(email, password)\`: Verifies bcrypt hash matches against stored PostgreSQL credentials.
  - \`generateTokens(user)\`: Generates dual JWT tokens (Access token with 15m TTL and rotated 7d Refresh token).

### 3. Route Protection Guards
Request authentication and RBAC claims enforcement are managed by:
* **\`apps/api/src/modules/auth/guards/jwt-auth.guard.ts\`** (Lines 3-14)
  - \`JwtAuthGuard\` implements NestJS \`CanActivate\` to validate incoming \`Authorization: Bearer <token>\` headers.`,
          citations: [
            {
              id: 'cit-1',
              repositoryId: 'repo-core-001',
              repositoryName: 'core-engine',
              filePath: 'apps/api/src/modules/auth/auth.controller.ts',
              symbolName: 'AuthController',
              startLine: 6,
              endLine: 26,
              branch: 'main',
              commitSha: '8f9e1a2b',
              codeSnippet: `@Controller('api/v1/auth')\nexport class AuthController {\n  @Post('register')\n  async register(@Body() dto: RegisterRequest) {}\n\n  @Post('login')\n  async login(@Body() dto: LoginRequest) {}\n\n  @UseGuards(JwtAuthGuard)\n  @Get('me')\n  async getProfile(@CurrentUser() user: any) {}\n}`,
              relevanceScore: 0.98,
            },
            {
              id: 'cit-2',
              repositoryId: 'repo-core-001',
              repositoryName: 'core-engine',
              filePath: 'apps/api/src/modules/auth/auth.service.ts',
              symbolName: 'AuthService',
              startLine: 5,
              endLine: 31,
              branch: 'main',
              commitSha: '8f9e1a2b',
              codeSnippet: `export class AuthService {\n  async validateUser(email: string, pass: string) {\n    const user = await this.findUserByEmail(email);\n    if (user && (await bcrypt.compare(pass, user.passwordHash))) {\n      return user;\n    }\n    throw new UnauthorizedException();\n  }\n}`,
              relevanceScore: 0.95,
            },
            {
              id: 'cit-3',
              repositoryId: 'repo-core-001',
              repositoryName: 'core-engine',
              filePath: 'apps/api/src/modules/auth/guards/jwt-auth.guard.ts',
              symbolName: 'JwtAuthGuard',
              startLine: 3,
              endLine: 14,
              branch: 'main',
              commitSha: '8f9e1a2b',
              codeSnippet: `export class JwtAuthGuard implements CanActivate {\n  canActivate(context: ExecutionContext): boolean {\n    const req = context.switchToHttp().getRequest();\n    const authHeader = req.headers.authorization;\n    return !!authHeader && authHeader.startsWith('Bearer ');\n  }\n}`,
              relevanceScore: 0.92,
            },
          ],
          usage: {
            inputTokens: 412,
            outputTokens: 248,
            totalTokens: 660,
            model: 'devflow-code-rag-v1',
            latencyMs: 185,
            estimatedCost: 0.000578,
          },
          status: 'completed',
          createdAt: new Date(Date.now() - 3590000).toISOString(),
        },
      ],
    },
  ]);

  const [activeConvId, setActiveConvId] = useState<string>('conv-1');
  const [searchFilter, setSearchFilter] = useState('');
  const [inputPrompt, setInputPrompt] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentStage, setCurrentStage] = useState<RagPipelineStage | null>(null);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);
  const [selectedCitation, setSelectedCitation] = useState<AiChatCitation | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const activeConv = conversations.find((c) => c.id === activeConvId) || conversations[0];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConv?.messages, isStreaming]);

  // Create New Conversation
  const handleNewChat = () => {
    const newId = `conv-${Date.now()}`;
    const newConv: AiChatConversation = {
      id: newId,
      workspaceId: 'ws-core-001',
      repositoryId: selectedRepo,
      repositoryName: selectedRepo === 'repo-core-001' ? 'core-engine' : 'web-cockpit',
      title: 'New Codebase Chat',
      model: selectedModel,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalEstimatedCost: 0,
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setConversations([newConv, ...conversations]);
    setActiveConvId(newId);
  };

  // Delete Conversation
  const handleDeleteConv = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const filtered = conversations.filter((c) => c.id !== id);
    setConversations(filtered);
    if (activeConvId === id) {
      if (filtered.length > 0) {
        setActiveConvId(filtered[0].id);
      } else {
        handleNewChat();
      }
    }
  };

  // Send Message & Trigger RAG Stream
  const handleSendMessage = async (promptToSend?: string) => {
    const text = (promptToSend || inputPrompt).trim();
    if (!text || isStreaming) return;

    setInputPrompt('');
    setIsStreaming(true);
    setCurrentStage('query_processing');

    const userMsgId = `msg-user-${Date.now()}`;
    const assistantMsgId = `msg-ai-${Date.now()}`;

    const userMsg: AiChatMessage = {
      id: userMsgId,
      conversationId: activeConv.id,
      role: 'user',
      content: text,
      status: 'completed',
      createdAt: new Date().toISOString(),
    };

    const assistantMsg: AiChatMessage = {
      id: assistantMsgId,
      conversationId: activeConv.id,
      role: 'assistant',
      content: '',
      status: 'streaming',
      createdAt: new Date().toISOString(),
    };

    // Update conversation with user and placeholder assistant message
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === activeConv.id) {
          const title = c.title === 'New Codebase Chat' ? text.slice(0, 35) : c.title;
          return {
            ...c,
            title,
            messages: [...c.messages, userMsg, assistantMsg],
            updatedAt: new Date().toISOString(),
          };
        }
        return c;
      }),
    );

    // Setup Abort Controller
    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Simulate RAG Pipeline Streaming Execution
    try {
      // Stage 1: Query Processing
      setCurrentStage('query_processing');
      await new Promise((r) => setTimeout(r, 120));

      // Stage 2: Query Embedding
      setCurrentStage('query_embedding');
      await new Promise((r) => setTimeout(r, 150));

      // Stage 3: Hybrid Retrieval
      setCurrentStage('hybrid_retrieval');
      await new Promise((r) => setTimeout(r, 200));

      // Determine citations based on prompt
      let mockCitations: AiChatCitation[] = [];
      let fullAnswerText = '';

      const lower = text.toLowerCase();
      if (lower.includes('auth') || lower.includes('jwt') || lower.includes('login')) {
        mockCitations = [
          {
            id: 'cit-auth-1',
            repositoryId: selectedRepo,
            repositoryName: 'core-engine',
            filePath: 'apps/api/src/modules/auth/auth.controller.ts',
            symbolName: 'AuthController',
            startLine: 6,
            endLine: 26,
            branch: selectedBranch,
            commitSha: '8f9e1a2b',
            codeSnippet: `@Controller('api/v1/auth')\nexport class AuthController {\n  @Post('register')\n  async register(@Body() dto: RegisterRequest) {}\n\n  @Post('login')\n  async login(@Body() dto: LoginRequest) {}\n\n  @UseGuards(JwtAuthGuard)\n  @Get('me')\n  async getProfile(@CurrentUser() user: any) {}\n}`,
            relevanceScore: 0.98,
          },
          {
            id: 'cit-auth-2',
            repositoryId: selectedRepo,
            repositoryName: 'core-engine',
            filePath: 'apps/api/src/modules/auth/auth.service.ts',
            symbolName: 'AuthService',
            startLine: 5,
            endLine: 31,
            branch: selectedBranch,
            commitSha: '8f9e1a2b',
            codeSnippet: `export class AuthService {\n  async validateUser(email: string, pass: string) {\n    const user = await this.findUserByEmail(email);\n    if (user && (await bcrypt.compare(pass, user.passwordHash))) {\n      return user;\n    }\n    throw new UnauthorizedException();\n  }\n  async generateTokens(user: any) {\n    const payload = { sub: user.id, email: user.email, role: user.role };\n    return { accessToken: this.jwtService.sign(payload) };\n  }\n}`,
            relevanceScore: 0.95,
          },
          {
            id: 'cit-auth-3',
            repositoryId: selectedRepo,
            repositoryName: 'core-engine',
            filePath: 'apps/api/src/modules/auth/guards/jwt-auth.guard.ts',
            symbolName: 'JwtAuthGuard',
            startLine: 3,
            endLine: 14,
            branch: selectedBranch,
            commitSha: '8f9e1a2b',
            codeSnippet: `export class JwtAuthGuard implements CanActivate {\n  canActivate(context: ExecutionContext): boolean {\n    const req = context.switchToHttp().getRequest();\n    const authHeader = req.headers.authorization;\n    return !!authHeader && authHeader.startsWith('Bearer ');\n  }\n}`,
            relevanceScore: 0.92,
          },
        ];
        fullAnswerText = `Authentication in **DevFlow AI** is structured across a dedicated NestJS modular architecture with JWT token issuance, bcrypt password hashing, and route-level guard interception:

### 1. HTTP Controllers & Routing
The authentication endpoints for user registration, login, and profile retrieval are defined in:
* **\`apps/api/src/modules/auth/auth.controller.ts\`** (Lines 6-26)
  - \`POST /api/v1/auth/register\`: Validates credentials and creates new tenant accounts.
  - \`POST /api/v1/auth/login\`: Authenticates users and returns signed JWT access & refresh tokens.
  - \`GET /api/v1/auth/me\`: Protected profile route decorated with \`@UseGuards(JwtAuthGuard)\`.

### 2. Business Logic & Token Issuance
User credential verification and cryptographic operations are encapsulated in:
* **\`apps/api/src/modules/auth/auth.service.ts\`** (Lines 5-31)
  - \`validateUser(email, password)\`: Verifies bcrypt hash matches against stored PostgreSQL credentials.
  - \`generateTokens(user)\`: Generates dual JWT tokens (Access token with short TTL and rotated Refresh token).

### 3. Route Protection Guards
Request authentication and RBAC claims enforcement are managed by:
* **\`apps/api/src/modules/auth/guards/jwt-auth.guard.ts\`** (Lines 3-14)
  - \`JwtAuthGuard\` implements NestJS \`CanActivate\` to validate incoming \`Authorization: Bearer <token>\` headers.`;
      } else if (lower.includes('checkout') || lower.includes('payment') || lower.includes('cart')) {
        mockCitations = [
          {
            id: 'cit-chk-1',
            repositoryId: selectedRepo,
            repositoryName: 'core-engine',
            filePath: 'apps/api/src/modules/checkout/checkout.service.ts',
            symbolName: 'CheckoutService',
            startLine: 4,
            endLine: 42,
            branch: selectedBranch,
            commitSha: '8f9e1a2b',
            codeSnippet: `export class CheckoutService {\n  async processCheckout(workspaceId: string, cartItems: any[], paymentMethodId: string) {\n    const validatedCart = await this.validateCart(workspaceId, cartItems);\n    const total = this.calculateTotal(validatedCart);\n    const paymentResult = await this.authorizePayment(paymentMethodId, total);\n    const order = await this.ordersService.createOrder({ workspaceId, items: validatedCart, totalAmount: total });\n    return { orderId: order.id, status: 'SUCCESS' };\n  }\n}`,
            relevanceScore: 0.97,
          },
          {
            id: 'cit-chk-2',
            repositoryId: selectedRepo,
            repositoryName: 'core-engine',
            filePath: 'infrastructure/postgres/schema.sql',
            symbolName: 'checkout_sessions',
            startLine: 29,
            endLine: 35,
            branch: selectedBranch,
            commitSha: '8f9e1a2b',
            codeSnippet: `CREATE TABLE checkout_sessions (\n    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n    workspace_id UUID NOT NULL REFERENCES workspaces(id),\n    session_token VARCHAR(255) UNIQUE NOT NULL,\n    amount NUMERIC(12, 2) NOT NULL,\n    expires_at TIMESTAMPTZ NOT NULL\n);`,
            relevanceScore: 0.91,
          },
        ];
        fullAnswerText = `Checkout in **DevFlow AI** executes an atomic transactional pipeline from cart validation to order confirmation:

### 1. Checkout Lifecycle & Workflow
Implemented in **\`apps/api/src/modules/checkout/checkout.service.ts\`** via \`processCheckout()\` (Lines 4-42):
1. **Cart & Inventory Validation (\`validateCart\`)**: Verifies item availability, tier limits, and workspace seats.
2. **Tax & Discount Calculation**: Calculates regional VAT/sales tax and applies active coupons.
3. **Payment Gateway Authorization (\`authorizePayment\`)**: Initiates pre-authorization token with Stripe / Payment Provider.
4. **Order Transaction Execution**: Executes an atomic PostgreSQL transaction inserting order records and locking allocated inventory.
5. **Event Dispatch**: Emits \`devflow.events.order.created.v1\` over Kafka bus.

### 2. Data Persistence
Checkout state and active sessions are stored in PostgreSQL:
* **\`infrastructure/postgres/schema.sql\`** (Lines 29-35)
  - \`checkout_sessions\` table tracks session tokens, payment intent IDs, currency, and expiration timestamps.`;
      } else if (lower.includes('explain') || lower.includes('architecture') || lower.includes('repository')) {
        mockCitations = [
          {
            id: 'cit-arch-1',
            repositoryId: selectedRepo,
            repositoryName: 'core-engine',
            filePath: 'apps/api/src/app.module.ts',
            symbolName: 'AppModule',
            startLine: 11,
            endLine: 24,
            branch: selectedBranch,
            commitSha: '8f9e1a2b',
            codeSnippet: `@Module({\n  imports: [\n    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),\n    AuthModule,\n    WorkspacesModule,\n    GitHubModule,\n    IngestionModule,\n    IntelligenceModule,\n    JobsModule,\n    HealthModule,\n  ],\n})\nexport class AppModule {}`,
            relevanceScore: 0.99,
          },
          {
            id: 'cit-arch-2',
            repositoryId: selectedRepo,
            repositoryName: 'core-engine',
            filePath: 'apps/api/src/config/configuration.ts',
            symbolName: 'configuration',
            startLine: 1,
            endLine: 18,
            branch: selectedBranch,
            commitSha: '8f9e1a2b',
            codeSnippet: `export default () => ({\n  port: parseInt(process.env.PORT || '4000', 10),\n  databaseUrl: process.env.DATABASE_URL,\n  redisUrl: process.env.REDIS_URL,\n  kafkaBrokers: process.env.KAFKA_BROKERS,\n});`,
            relevanceScore: 0.94,
          },
        ];
        fullAnswerText = `**DevFlow AI** is an enterprise-grade AI Software Engineering Intelligence and Codebase Automation platform. The codebase is organized as a high-performance monorepo:

### 🏛️ Core Architecture Components
1. **API Backend (\`apps/api\`)**:
   - Built on NestJS modular monolith architecture.
   - Module orchestration defined in **\`apps/api/src/app.module.ts\`** (Lines 11-24).
   - Includes modules for Workspaces, GitHub Sync, Code Ingestion, Intelligence/AST, Distributed Jobs, and RBAC Auth.

2. **AI Codebase Intelligence & RAG Engine (\`apps/api/src/modules/intelligence\`)**:
   - Multi-modal Code Search (Keyword, Symbol, File, Semantic).
   - AST-bounded Semantic Chunker with metadata breadcrumbs.
   - Repository-aware Hybrid RAG with grounded citations and token cost tracking.

3. **Distributed Job Processing (\`apps/api/src/modules/jobs\`)**:
   - Redis-backed distributed locks and 3-tier retry queues.
   - Kafka event-driven worker pools for background ingestion, code analysis, and test generation.

4. **Web Cockpit (\`apps/web\`)**:
   - Built with Next.js 14, React, Tailwind CSS, and Lucide icons.
   - Real-time Code Intelligence graphs, Code Review cockpit, Job monitors, and AI Chat.

5. **Infrastructure & Storage (\`infrastructure/\`)**:
   - PostgreSQL relational database for users, workspaces, and code metadata (**\`apps/api/src/config/configuration.ts\`**).
   - Redis cluster for caching and distributed locks.
   - Kafka for high-throughput event streaming.`;
      } else if (lower.includes('postgres') || lower.includes('database') || lower.includes('schema')) {
        mockCitations = [
          {
            id: 'cit-pg-1',
            repositoryId: selectedRepo,
            repositoryName: 'core-engine',
            filePath: 'apps/api/src/config/configuration.ts',
            symbolName: 'configuration',
            startLine: 1,
            endLine: 18,
            branch: selectedBranch,
            commitSha: '8f9e1a2b',
            codeSnippet: `export default () => ({\n  databaseUrl: process.env.DATABASE_URL || 'postgresql://devflow:devflow@localhost:5432/devflow_db',\n  postgresHost: process.env.POSTGRES_HOST || 'localhost',\n  postgresPort: parseInt(process.env.POSTGRES_PORT || '5432', 10),\n  postgresUser: process.env.POSTGRES_USER || 'devflow',\n  postgresPassword: process.env.POSTGRES_PASSWORD || 'devflow',\n  postgresDatabase: process.env.POSTGRES_DB || 'devflow_db',\n});`,
            relevanceScore: 0.98,
          },
          {
            id: 'cit-pg-2',
            repositoryId: selectedRepo,
            repositoryName: 'core-engine',
            filePath: 'infrastructure/postgres/schema.sql',
            symbolName: 'users',
            startLine: 1,
            endLine: 18,
            branch: selectedBranch,
            commitSha: '8f9e1a2b',
            codeSnippet: `CREATE TABLE users (\n    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n    email VARCHAR(255) UNIQUE NOT NULL,\n    password_hash VARCHAR(255) NOT NULL,\n    name VARCHAR(255) NOT NULL,\n    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()\n);`,
            relevanceScore: 0.96,
          },
        ];
        fullAnswerText = `PostgreSQL configuration in **DevFlow AI** is defined across the central application configuration and infrastructure schema definitions:

### 1. Application Configuration & Environment Variables
* **\`apps/api/src/config/configuration.ts\`** (Lines 1-18)
  - Reads \`DATABASE_URL\` / \`POSTGRES_HOST\`, \`POSTGRES_PORT\` (default \`5432\`), \`POSTGRES_USER\`, \`POSTGRES_PASSWORD\`, and \`POSTGRES_DB\`.
  - Configures connection pool sizes, SSL requirements, and query timeouts.

### 2. Relational Schema & Table Definitions
* **\`infrastructure/postgres/schema.sql\`** (Lines 1-18)
  - Defines the core database schema including \`users\`, \`workspaces\`, \`repositories\`, \`orders\`, and indexing rules.
  - Utilizes UUID primary keys via \`gen_random_uuid()\` and timezone-aware timestamps (\`TIMESTAMPTZ\`).`;
      } else if (lower.includes('order') || lower.includes('orders')) {
        mockCitations = [
          {
            id: 'cit-ord-1',
            repositoryId: selectedRepo,
            repositoryName: 'core-engine',
            filePath: 'apps/api/src/modules/orders/orders.service.ts',
            symbolName: 'OrdersService',
            startLine: 3,
            endLine: 35,
            branch: selectedBranch,
            commitSha: '8f9e1a2b',
            codeSnippet: `export class OrdersService {\n  async createOrder(dto: { workspaceId: string; items: any[]; totalAmount: number; paymentIntentId: string }) {\n    const orderRecord = {\n      id: 'ord_' + Math.random().toString(36).substring(2, 9),\n      workspaceId: dto.workspaceId,\n      status: 'PAID',\n      totalAmount: dto.totalAmount,\n    };\n    await this.reserveInventory(dto.items);\n    await this.handleOrderCreatedEvent(orderRecord);\n    return orderRecord;\n  }\n}`,
            relevanceScore: 0.98,
          },
          {
            id: 'cit-ord-2',
            repositoryId: selectedRepo,
            repositoryName: 'core-engine',
            filePath: 'infrastructure/postgres/schema.sql',
            symbolName: 'orders',
            startLine: 20,
            endLine: 27,
            branch: selectedBranch,
            commitSha: '8f9e1a2b',
            codeSnippet: `CREATE TABLE orders (\n    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,\n    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',\n    total_amount NUMERIC(12, 2) NOT NULL,\n    payment_intent_id VARCHAR(255),\n    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()\n);`,
            relevanceScore: 0.95,
          },
        ];
        fullAnswerText = `When an order is created in **DevFlow AI**, the system performs an end-to-end transactional execution followed by asynchronous event propagation:

### 1. Synchronous Execution Pipeline
Defined in **\`apps/api/src/modules/orders/orders.service.ts\`** via \`createOrder()\` (Lines 3-35):
1. **Input Payload Validation**: Verifies order line items, quantity, workspace association, and currency.
2. **Database Transaction**: Inserts records into the \`orders\` and \`order_items\` tables (**\`infrastructure/postgres/schema.sql\`** Lines 20-27).
3. **Inventory Reservation (\`reserveInventory\`)**: Deducts item inventory or workspace license quotas.
4. **Status Initialization**: Sets order state to \`PENDING_PAYMENT\` or \`PAID\`.

### 2. Asynchronous Event Propagation
1. **Kafka Event Publication**: Emits \`devflow.events.order.created.v1\` payload with order ID and buyer details.
2. **Invoice Generation**: Background worker generates PDF invoice and records audit log entry.
3. **Customer Notification**: Dispatches webhook notification and confirmation email to workspace administrators.`;
      } else {
        mockCitations = [
          {
            id: 'cit-gen-1',
            repositoryId: selectedRepo,
            repositoryName: 'core-engine',
            filePath: 'apps/api/src/app.module.ts',
            symbolName: 'AppModule',
            startLine: 1,
            endLine: 24,
            branch: selectedBranch,
            commitSha: '8f9e1a2b',
            codeSnippet: `export class AppModule {}`,
            relevanceScore: 0.88,
          },
        ];
        fullAnswerText = `Based on semantic AST indexing of **core-engine**, here is the evidence matching your inquiry:\n\n* **\`apps/api/src/app.module.ts\`** (Lines 1-24) — Module configuration.\n\nAll responses are strictly grounded in repository files with line-level verified citations.`;
      }

      // Stage 4: Context Assembly
      setCurrentStage('context_building');
      await new Promise((r) => setTimeout(r, 120));

      // Stage 5: Streaming Generation
      setCurrentStage('generating');

      const words = fullAnswerText.split(' ');
      let streamed = '';

      for (let i = 0; i < words.length; i++) {
        if (controller.signal.aborted) break;

        const token = (i === 0 ? '' : ' ') + words[i];
        streamed += token;

        setConversations((prev) =>
          prev.map((c) => {
            if (c.id === activeConv.id) {
              return {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === assistantMsgId ? { ...m, content: streamed, citations: mockCitations } : m,
                ),
              };
            }
            return c;
          }),
        );

        await new Promise((r) => setTimeout(r, 18));
      }

      // Calculate Usage & Cost
      const inputTokens = Math.ceil((text.length + 800) / 4);
      const outputTokens = Math.ceil(streamed.length / 4);
      const pricing =
        selectedModel === 'gpt-4o'
          ? { in: 2.5, out: 10.0 }
          : selectedModel === 'claude-3-5-sonnet'
            ? { in: 3.0, out: 15.0 }
            : selectedModel === 'gemini-1.5-pro'
              ? { in: 1.25, out: 5.0 }
              : { in: 0.5, out: 1.5 };

      const estimatedCost = Number(
        ((inputTokens / 1_000_000) * pricing.in + (outputTokens / 1_000_000) * pricing.out).toFixed(6),
      );

      const usage: AiChatUsage = {
        inputTokens,
        outputTokens,
        totalTokens: inputTokens + outputTokens,
        model: selectedModel,
        latencyMs: 340,
        estimatedCost,
      };

      // Finalize Assistant Message
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id === activeConv.id) {
            return {
              ...c,
              totalInputTokens: c.totalInputTokens + inputTokens,
              totalOutputTokens: c.totalOutputTokens + outputTokens,
              totalEstimatedCost: Number((c.totalEstimatedCost + estimatedCost).toFixed(6)),
              messages: c.messages.map((m) =>
                m.id === assistantMsgId
                  ? {
                      ...m,
                      content: streamed,
                      citations: mockCitations,
                      usage,
                      status: controller.signal.aborted ? 'stopped' : 'completed',
                    }
                  : m,
              ),
            };
          }
          return c;
        }),
      );
    } catch (err) {
      console.error('RAG Generation Error:', err);
    } finally {
      setIsStreaming(false);
      setCurrentStage(null);
      abortControllerRef.current = null;
    }
  };

  // Stop Generation
  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsStreaming(false);
    setCurrentStage(null);
  };

  // Retry / Regenerate
  const handleRetry = (msgIndex: number) => {
    if (isStreaming) return;
    const userMsg = activeConv.messages[msgIndex - 1];
    if (userMsg && userMsg.role === 'user') {
      // Remove old assistant message
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id === activeConv.id) {
            const updated = [...c.messages];
            updated.splice(msgIndex, 1);
            return { ...c, messages: updated };
          }
          return c;
        }),
      );
      handleSendMessage(userMsg.content);
    }
  };

  // Copy Code Snippet
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCodeId(id);
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] w-full overflow-hidden bg-background">
      {/* ------------------------------------------------------------- */}
      {/* LEFT SIDEBAR: Conversation History & Chat Settings            */}
      {/* ------------------------------------------------------------- */}
      <aside className="w-80 border-r border-border bg-card/30 backdrop-blur-xl flex flex-col justify-between shrink-0">
        <div className="p-4 flex flex-col gap-3 border-b border-border/70">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-foreground tracking-tight">Codebase RAG</h2>
                <p className="text-[11px] text-muted-foreground font-mono">AST-Grounding Engine</p>
              </div>
            </div>
            <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
              Live Index
            </Badge>
          </div>

          <Button
            onClick={handleNewChat}
            className="w-full justify-start gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-md shadow-primary/20 h-9 text-xs font-semibold"
          >
            <Plus className="h-4 w-4" />
            New Codebase Chat
          </Button>

          {/* Search Conversations */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-lg text-xs bg-muted/40 border border-border focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground"
            />
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5 custom-scrollbar">
          {conversations
            .filter((c) => c.title.toLowerCase().includes(searchFilter.toLowerCase()))
            .map((conv) => {
              const isActive = conv.id === activeConvId;
              return (
                <div
                  key={conv.id}
                  onClick={() => setActiveConvId(conv.id)}
                  className={`group relative p-3 rounded-xl border transition-all cursor-pointer flex flex-col gap-1.5 ${
                    isActive
                      ? 'bg-primary/10 border-primary/40 shadow-sm'
                      : 'bg-card/40 border-border/60 hover:bg-muted/40 hover:border-border'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-foreground truncate">{conv.title}</span>
                    <button
                      onClick={(e) => handleDeleteConv(conv.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-all"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono">
                    <span>{new Date(conv.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-primary font-semibold">{conv.totalInputTokens + conv.totalOutputTokens} toks</span>
                      <span>•</span>
                      <span className="text-emerald-400">${conv.totalEstimatedCost.toFixed(4)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>

        {/* Aggregate AI Cost & Model Stats */}
        <div className="p-3.5 border-t border-border/70 bg-muted/20 flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <DollarSign className="h-3.5 w-3.5 text-emerald-400" />
              Session Total Cost
            </span>
            <span className="font-mono font-bold text-emerald-400">
              ${conversations.reduce((sum, c) => sum + c.totalEstimatedCost, 0).toFixed(5)}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Cpu className="h-3.5 w-3.5 text-blue-400" />
              Tokens Processed
            </span>
            <span className="font-mono font-bold text-foreground">
              {conversations.reduce((sum, c) => sum + c.totalInputTokens + c.totalOutputTokens, 0).toLocaleString()}
            </span>
          </div>
        </div>
      </aside>

      {/* ------------------------------------------------------------- */}
      {/* MAIN CHAT AREA                                                */}
      {/* ------------------------------------------------------------- */}
      <main className="flex-1 flex flex-col justify-between overflow-hidden bg-gradient-to-b from-background via-background/95 to-background">
        {/* Top Control Bar */}
        <header className="h-14 border-b border-border/70 px-6 flex items-center justify-between bg-card/20 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-4">
            {/* Repository Indicator */}
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg border border-border bg-muted/30 text-xs">
              <FolderGit2 className="h-3.5 w-3.5 text-primary" />
              <span className="font-semibold text-foreground">core-engine</span>
              <span className="text-muted-foreground text-[11px] font-mono">/</span>
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground font-mono">
                <GitBranch className="h-3 w-3" />
                {selectedBranch}
              </div>
            </div>

            {/* Model Selector */}
            <div className="flex items-center gap-1.5">
              <Sliders className="h-3.5 w-3.5 text-muted-foreground" />
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value as AiModelId)}
                className="bg-muted/40 border border-border rounded-lg px-2.5 py-1 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {AVAILABLE_MODELS.map((m) => (
                  <option key={m.id} value={m.id} className="bg-card text-foreground">
                    {m.name} ({m.provider})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Active Conversation Telemetry */}
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="font-mono text-[11px] bg-primary/10 text-primary border-primary/30">
              ⚡ Grounded RAG Active
            </Badge>
            <div className="h-4 w-px bg-border" />
            <div className="text-[11px] font-mono text-muted-foreground flex items-center gap-2">
              <span>Tokens: <strong className="text-foreground">{activeConv.totalInputTokens + activeConv.totalOutputTokens}</strong></span>
              <span>•</span>
              <span>Cost: <strong className="text-emerald-400">${activeConv.totalEstimatedCost.toFixed(4)}</strong></span>
            </div>
          </div>
        </header>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {activeConv.messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center max-w-2xl mx-auto text-center gap-6 py-12">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-xl shadow-blue-500/20 animate-pulse">
                <Sparkles className="h-8 w-8" />
              </div>

              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  Ask Anything About Your Codebase
                </h1>
                <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
                  Repository-aware RAG pipeline with AST-bounded hybrid search, exact file and line citations, and zero fabrication.
                </p>
              </div>

              {/* Benchmark Question Prompts Carousel */}
              <div className="w-full flex flex-col gap-2.5 pt-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Quick Benchmark Queries
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-left">
                  {BENCHMARK_PROMPTS.map((bp, i) => {
                    const Icon = bp.icon;
                    return (
                      <button
                        key={i}
                        onClick={() => handleSendMessage(bp.prompt)}
                        className={`p-3.5 rounded-xl border bg-gradient-to-r ${bp.color} hover:scale-[1.01] hover:shadow-lg transition-all text-left flex items-start gap-3 group`}
                      >
                        <div className="p-2 rounded-lg bg-background/60 shrink-0 mt-0.5">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                            {bp.label}
                          </div>
                          <div className="text-[11px] text-muted-foreground mt-0.5 font-mono">
                            "{bp.prompt}"
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto space-y-6">
              {activeConv.messages.map((msg, idx) => {
                const isUser = msg.role === 'user';
                return (
                  <div key={msg.id || idx} className={`flex gap-3.5 ${isUser ? 'justify-end' : 'justify-start'}`}>
                    {/* Avatar */}
                    {!isUser && (
                      <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shrink-0 shadow-md shadow-blue-500/20 mt-1">
                        <Bot className="h-4 w-4" />
                      </div>
                    )}

                    <div className={`flex flex-col gap-2 max-w-3xl ${isUser ? 'items-end' : 'items-start'}`}>
                      {/* Message Bubble Card */}
                      <Card
                        className={`p-4.5 rounded-2xl border ${
                          isUser
                            ? 'bg-primary text-primary-foreground border-primary/40 rounded-tr-sm shadow-md'
                            : 'bg-card/70 border-border/80 rounded-tl-sm backdrop-blur-md shadow-lg shadow-black/5'
                        }`}
                      >
                        {/* Message Content */}
                        <div className="prose prose-invert prose-sm max-w-none text-foreground leading-relaxed whitespace-pre-wrap font-sans">
                          {msg.content || (
                            <span className="italic text-muted-foreground flex items-center gap-2">
                              <span className="h-2 w-2 rounded-full bg-primary animate-ping" />
                              Synthesizing grounded answer from indexed codebase...
                            </span>
                          )}
                        </div>

                        {/* Grounded Citations Bar */}
                        {!isUser && msg.citations && msg.citations.length > 0 && (
                          <div className="mt-4 pt-3.5 border-t border-border/60 flex flex-col gap-2">
                            <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
                              <span className="flex items-center gap-1.5 text-primary">
                                <FileCode className="h-3.5 w-3.5" />
                                Verified Repository Evidence ({msg.citations.length} sources)
                              </span>
                              <span className="font-mono text-[10px] text-muted-foreground">100% Grounded</span>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              {msg.citations.map((cit, cIdx) => (
                                <button
                                  key={cit.id || cIdx}
                                  onClick={() => setSelectedCitation(cit)}
                                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-border/80 bg-muted/40 hover:bg-muted hover:border-primary/50 transition-all text-left text-xs group"
                                >
                                  <Code2 className="h-3 w-3 text-primary group-hover:scale-110 transition-transform" />
                                  <div className="font-mono text-[11px] text-foreground group-hover:text-primary font-medium">
                                    {cit.filePath.split('/').pop()}
                                  </div>
                                  <Badge variant="outline" className="text-[9px] px-1 py-0 font-mono bg-background text-muted-foreground">
                                    L{cit.startLine}-{cit.endLine}
                                  </Badge>
                                  <Eye className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Usage & Cost Telemetry Pill */}
                        {!isUser && msg.usage && (
                          <div className="mt-3 pt-2.5 border-t border-border/40 flex items-center justify-between text-[10px] font-mono text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <span className="flex items-center gap-1 text-primary">
                                <Zap className="h-3 w-3" />
                                {msg.usage.latencyMs}ms
                              </span>
                              <span>•</span>
                              <span>{msg.usage.inputTokens} in / {msg.usage.outputTokens} out toks</span>
                              <span>•</span>
                              <span className="text-emerald-400 font-semibold">${msg.usage.estimatedCost.toFixed(5)}</span>
                            </div>
                            <span className="text-[9px] uppercase tracking-wider">{msg.usage.model}</span>
                          </div>
                        )}
                      </Card>

                      {/* Message Action Controls */}
                      {!isUser && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
                          <button
                            onClick={() => handleCopy(msg.content, msg.id)}
                            className="flex items-center gap-1 px-2 py-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-all text-[11px]"
                          >
                            {copiedCodeId === msg.id ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                            {copiedCodeId === msg.id ? 'Copied' : 'Copy'}
                          </button>
                          <button
                            onClick={() => handleRetry(idx)}
                            className="flex items-center gap-1 px-2 py-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-all text-[11px]"
                          >
                            <RotateCcw className="h-3 w-3" />
                            Regenerate
                          </button>
                        </div>
                      )}
                    </div>

                    {/* User Avatar */}
                    {isUser && (
                      <div className="h-8 w-8 rounded-xl bg-muted border border-border flex items-center justify-center text-foreground shrink-0 mt-1">
                        <User className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                );
              })}

              {/* RAG Pipeline Progress Stage Banner */}
              {isStreaming && currentStage && (
                <div className="max-w-3xl ml-11 p-3 rounded-xl border border-primary/30 bg-primary/5 backdrop-blur-md flex items-center justify-between animate-fadeIn">
                  <div className="flex items-center gap-2.5">
                    <span className="h-2 w-2 rounded-full bg-primary animate-ping" />
                    <span className="text-xs font-medium text-foreground">
                      {currentStage === 'query_processing' && '🔍 Stage 1: Parsing query intent & target symbols...'}
                      {currentStage === 'query_embedding' && '🧬 Stage 2: Generating dense query embeddings...'}
                      {currentStage === 'hybrid_retrieval' && '⚡ Stage 3: Performing multi-modal hybrid retrieval (Vector + BM25)...'}
                      {currentStage === 'context_building' && '📦 Stage 4: Assembling verified AST context blocks...'}
                      {currentStage === 'generating' && '✨ Stage 5: Streaming grounded answer with citations...'}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleStopGeneration}
                    className="h-7 text-xs border-destructive/40 text-destructive hover:bg-destructive/10 gap-1.5"
                  >
                    <Square className="h-3 w-3 fill-destructive" />
                    Stop Generation
                  </Button>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* ------------------------------------------------------------- */}
        {/* BOTTOM SMART CHAT INPUT                                      */}
        {/* ------------------------------------------------------------- */}
        <div className="p-4 border-t border-border/80 bg-card/40 backdrop-blur-xl shrink-0">
          <div className="max-w-4xl mx-auto flex flex-col gap-2">
            {/* Quick Filter Pill Tags */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 text-[11px] font-mono custom-scrollbar">
              <span className="text-muted-foreground font-sans">Focus Filters:</span>
              <button
                onClick={() => setInputPrompt((prev) => `${prev} @auth`)}
                className="px-2 py-0.5 rounded-md border border-border bg-muted/30 hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
              >
                @auth
              </button>
              <button
                onClick={() => setInputPrompt((prev) => `${prev} @orders`)}
                className="px-2 py-0.5 rounded-md border border-border bg-muted/30 hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
              >
                @orders
              </button>
              <button
                onClick={() => setInputPrompt((prev) => `${prev} @checkout`)}
                className="px-2 py-0.5 rounded-md border border-border bg-muted/30 hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
              >
                @checkout
              </button>
              <button
                onClick={() => setInputPrompt((prev) => `${prev} @database`)}
                className="px-2 py-0.5 rounded-md border border-border bg-muted/30 hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
              >
                @database
              </button>
              <button
                onClick={() => setInputPrompt((prev) => `${prev} @config`)}
                className="px-2 py-0.5 rounded-md border border-border bg-muted/30 hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
              >
                @config
              </button>
            </div>

            {/* Input Box Card */}
            <div className="relative rounded-2xl border border-border/80 bg-background/80 shadow-lg shadow-black/5 focus-within:border-primary/60 focus-within:ring-1 focus-within:ring-primary/40 transition-all">
              <textarea
                rows={2}
                placeholder="Ask anything about the codebase (e.g., 'Where is authentication implemented?')..."
                value={inputPrompt}
                onChange={(e) => setInputPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                className="w-full resize-none bg-transparent px-4 pt-3.5 pb-10 text-sm text-foreground focus:outline-none placeholder:text-muted-foreground"
              />

              {/* Action Toolbar */}
              <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between">
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-mono">
                  <span>Model: <strong>{selectedModel}</strong></span>
                  <span>•</span>
                  <span>Branch: <strong>{selectedBranch}</strong></span>
                </div>

                <div className="flex items-center gap-2">
                  {isStreaming ? (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={handleStopGeneration}
                      className="h-8 gap-1.5 text-xs font-semibold"
                    >
                      <Square className="h-3.5 w-3.5 fill-current" />
                      Stop
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => handleSendMessage()}
                      disabled={!inputPrompt.trim()}
                      className="h-8 gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold px-4 shadow-md shadow-primary/20"
                    >
                      <Send className="h-3.5 w-3.5" />
                      Ask Codebase
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ------------------------------------------------------------- */}
      {/* CITATION PREVIEW DRAWER / MODAL                                */}
      {/* ------------------------------------------------------------- */}
      {selectedCitation && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <Card className="w-full max-w-2xl bg-card border-border shadow-2xl rounded-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-border flex items-center justify-between bg-muted/30">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                  <FileCode className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground font-mono">
                    {selectedCitation.filePath}
                  </h3>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-mono">
                    <span>Lines {selectedCitation.startLine}-{selectedCitation.endLine}</span>
                    <span>•</span>
                    <span>Symbol: <strong className="text-primary">{selectedCitation.symbolName || 'Global'}</strong></span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedCitation(null)}
                className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4 flex-1 overflow-y-auto font-mono text-xs custom-scrollbar bg-black/40">
              <div className="text-muted-foreground mb-2 text-[11px]">
                // Repository: {selectedCitation.repositoryName} | Branch: {selectedCitation.branch} | Commit: {selectedCitation.commitSha}
              </div>
              <pre className="p-4 rounded-xl bg-muted/20 border border-border/70 overflow-x-auto text-foreground whitespace-pre">
                {selectedCitation.codeSnippet}
              </pre>
            </div>

            <div className="p-3 border-t border-border flex items-center justify-between bg-muted/20 text-xs">
              <span className="text-muted-foreground font-mono">
                Relevance Match Score: <strong className="text-emerald-400">{(selectedCitation.relevanceScore * 100).toFixed(1)}%</strong>
              </span>
              <Button
                size="sm"
                onClick={() => handleCopy(selectedCitation.codeSnippet, selectedCitation.id)}
                className="h-8 gap-1.5 text-xs"
              >
                {copiedCodeId === selectedCitation.id ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                {copiedCodeId === selectedCitation.id ? 'Copied' : 'Copy Code Snippet'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

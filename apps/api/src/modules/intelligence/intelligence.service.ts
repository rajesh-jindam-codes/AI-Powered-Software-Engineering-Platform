import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import {
  AiChatCitation,
  AiChatConversation,
  AiChatMessage,
  AiChatStreamEvent,
  AiChatUsage,
  AiModelId,
  ApiEndpointSummary,
  AuthPatternSummary,
  CodeGraph,
  CodeIntelligenceReport,
  CodeSearchQuery,
  CodeSearchResponse,
  ConfigPatternSummary,
  DbModelSummary,
  RagQueryRequest,
  RagQueryResponse,
  SemanticContextChunk,
  TestSuiteSummary,
} from '@devflow/shared-types';
import { ApiExtractorService } from './extractors/api-extractor.service';
import { DbExtractorService } from './extractors/db-extractor.service';
import { AuthExtractorService } from './extractors/auth-extractor.service';
import { ConfigExtractorService } from './extractors/config-extractor.service';
import { TestExtractorService } from './extractors/test-extractor.service';
import { CodeGraphBuilderService } from './graph/code-graph-builder.service';
import { SemanticContextChunkerService } from './chunking/semantic-context-chunker.service';
import { CodeSearchService } from './search/code-search.service';
import { QueryProcessorService } from './rag/query-processor.service';
import { HybridRetrieverService } from './rag/hybrid-retriever.service';
import { ContextBuilderService } from './rag/context-builder.service';
import { LlmEngineService } from './rag/llm-engine.service';
import { ConversationService } from './chat/conversation.service';
import { Observable } from 'rxjs';

@Injectable()
export class IntelligenceService implements OnModuleInit {
  private readonly logger = new Logger(IntelligenceService.name);

  private readonly reports = new Map<string, CodeIntelligenceReport>();
  private readonly graphs = new Map<string, CodeGraph>();
  private readonly chunks = new Map<string, SemanticContextChunk[]>();

  constructor(
    private readonly apiExtractor: ApiExtractorService,
    private readonly dbExtractor: DbExtractorService,
    private readonly authExtractor: AuthExtractorService,
    private readonly configExtractor: ConfigExtractorService,
    private readonly testExtractor: TestExtractorService,
    private readonly graphBuilder: CodeGraphBuilderService,
    private readonly chunker: SemanticContextChunkerService,
    private readonly searchService: CodeSearchService,
    private readonly queryProcessor: QueryProcessorService,
    private readonly hybridRetriever: HybridRetrieverService,
    private readonly contextBuilder: ContextBuilderService,
    private readonly llmEngine: LlmEngineService,
    private readonly conversationService: ConversationService,
  ) {}

  onModuleInit() {
    this.logger.log('IntelligenceService initialized with AST extractors, Code Graph builder, and RAG Pipeline');
    this.seedSampleIntelligenceData('repo-core-001');
    this.seedSampleIntelligenceData('repo-default');
  }

  /**
   * Analyze an ingested repository and generate the complete intelligence report and code graph
   */
  async analyzeRepository(
    repositoryId: string,
    repositoryName: string,
    branch: string,
    commitSha: string,
    files: Array<{ filePath: string; language: string; content: string; symbols?: any[]; dependencies?: any[] }>,
  ): Promise<CodeIntelligenceReport> {
    this.logger.log(`Starting deep Code Intelligence analysis for repository ${repositoryId} (${files.length} files)`);

    const allApis: ApiEndpointSummary[] = [];
    const allDbModels: DbModelSummary[] = [];
    const allAuthPatterns: AuthPatternSummary[] = [];
    const allConfigs: ConfigPatternSummary[] = [];
    const allTests: TestSuiteSummary[] = [];
    const allChunks: SemanticContextChunk[] = [];

    const graphFiles: Array<{ filePath: string; language: string }> = [];
    const graphSymbols: Array<{ name: string; kind: string; filePath: string; startLine: number; endLine: number }> = [];
    const graphDeps: Array<{ sourceFilePath: string; targetModule: string; isInternal: boolean }> = [];

    for (const file of files) {
      graphFiles.push({ filePath: file.filePath, language: file.language });

      // 1. Extract APIs
      const apis = this.apiExtractor.extractApis(file.filePath, file.content, file.language);
      allApis.push(...apis);

      // 2. Extract DB Models
      const dbModels = this.dbExtractor.extractDbModels(file.filePath, file.content, file.language);
      allDbModels.push(...dbModels);

      // 3. Extract Auth Patterns
      const auth = this.authExtractor.extractAuthPatterns(file.filePath, file.content);
      allAuthPatterns.push(...auth);

      // 4. Extract Config Keys
      const configs = this.configExtractor.extractConfigKeys(file.filePath, file.content);
      allConfigs.push(...configs);

      // 5. Extract Tests
      const tests = this.testExtractor.extractTestSuites(file.filePath, file.content);
      allTests.push(...tests);

      // 6. Symbols & Dependencies for Graph
      if (file.symbols) {
        for (const s of file.symbols) {
          graphSymbols.push({
            name: s.name,
            kind: s.kind,
            filePath: file.filePath,
            startLine: s.startLine,
            endLine: s.endLine,
          });
        }
      }

      if (file.dependencies) {
        for (const d of file.dependencies) {
          graphDeps.push({
            sourceFilePath: file.filePath,
            targetModule: d.targetModule || d.name,
            isInternal: d.isInternal !== false,
          });
        }
      }

      // 7. Context-Aware Semantic Chunking
      const fileChunks = this.chunker.chunkFile({
        repositoryId,
        repositoryName,
        branch,
        commitSha,
        filePath: file.filePath,
        language: file.language,
        content: file.content,
        symbols: file.symbols || [],
        dependencies: file.dependencies?.map((d: any) => d.name || d.targetModule) || [],
      });
      allChunks.push(...fileChunks);
    }

    // Index generated chunks into search engine
    this.searchService.indexChunks(repositoryId, allChunks);
    this.chunks.set(repositoryId, allChunks);

    // Build Code Graph
    const codeGraph = this.graphBuilder.buildGraph({
      repositoryId,
      files: graphFiles,
      symbols: graphSymbols,
      dependencies: graphDeps,
      apis: allApis,
      database: allDbModels,
      auth: allAuthPatterns,
      tests: allTests,
    });
    this.graphs.set(repositoryId, codeGraph);

    // Build Summary Report
    const totalTestCases = allTests.reduce((sum, t) => sum + t.testCasesCount, 0);
    const report: CodeIntelligenceReport = {
      repositoryId,
      stats: {
        filesCount: files.length,
        functionsCount: graphSymbols.filter((s) => s.kind === 'function' || s.kind === 'method').length,
        classesCount: graphSymbols.filter((s) => s.kind === 'class').length,
        apisCount: allApis.length,
        dbModelsCount: allDbModels.length,
        authGuardsCount: allAuthPatterns.length,
        configKeysCount: allConfigs.length,
        testSuitesCount: allTests.length,
        totalTestCases,
      },
      apis: allApis,
      database: allDbModels,
      auth: allAuthPatterns,
      config: allConfigs,
      tests: allTests,
      generatedAt: new Date().toISOString(),
    };

    this.reports.set(repositoryId, report);
    this.logger.log(`Code Intelligence complete for ${repositoryId}: ${allApis.length} APIs, ${allDbModels.length} DB Models, ${allChunks.length} Chunks`);

    return report;
  }

  // ==========================================
  // Query Methods
  // ==========================================

  async getReport(repositoryId: string): Promise<CodeIntelligenceReport> {
    const report = this.reports.get(repositoryId) || this.reports.get('repo-core-001') || this.reports.get('repo-default');
    if (!report) {
      throw new NotFoundException(`Intelligence report not found for repository: ${repositoryId}`);
    }
    return report;
  }

  async getGraph(repositoryId: string): Promise<CodeGraph> {
    const graph = this.graphs.get(repositoryId) || this.graphs.get('repo-core-001') || this.graphs.get('repo-default');
    if (!graph) {
      throw new NotFoundException(`Code graph not found for repository: ${repositoryId}`);
    }
    return graph;
  }

  async getApis(repositoryId: string): Promise<ApiEndpointSummary[]> {
    const report = await this.getReport(repositoryId);
    return report.apis;
  }

  async getDatabaseModels(repositoryId: string): Promise<DbModelSummary[]> {
    const report = await this.getReport(repositoryId);
    return report.database;
  }

  async getAuthPatterns(repositoryId: string): Promise<AuthPatternSummary[]> {
    const report = await this.getReport(repositoryId);
    return report.auth;
  }

  async getConfigKeys(repositoryId: string): Promise<ConfigPatternSummary[]> {
    const report = await this.getReport(repositoryId);
    return report.config;
  }

  async getTestSuites(repositoryId: string): Promise<TestSuiteSummary[]> {
    const report = await this.getReport(repositoryId);
    return report.tests;
  }

  async searchCode(query: CodeSearchQuery): Promise<CodeSearchResponse> {
    return this.searchService.search(query);
  }

  async getChunks(repositoryId: string): Promise<SemanticContextChunk[]> {
    return this.chunks.get(repositoryId) || this.chunks.get('repo-core-001') || this.chunks.get('repo-default') || [];
  }

  // ==========================================
  // Phase 8: RAG & AI Chat Methods
  // ==========================================

  /**
   * One-off Grounded RAG Question
   */
  async askRagQuestion(req: RagQueryRequest): Promise<RagQueryResponse> {
    const startTime = Date.now();
    const chunks = await this.getChunks(req.repositoryId);
    const retrieval = this.hybridRetriever.retrieve(req.question, chunks, {
      repositoryId: req.repositoryId,
      branch: req.branch || 'main',
      topK: 5,
    });

    const context = this.contextBuilder.buildContext(req.question, retrieval.contextBlocks);
    const { answer, usage } = await this.llmEngine.generateResponse(
      retrieval.query,
      context,
      retrieval.citations,
      req.model || 'devflow-code-rag-v1',
    );

    return {
      answer,
      citations: retrieval.citations,
      contextBlocks: retrieval.contextBlocks,
      usage,
      latencyMs: Date.now() - startTime,
    };
  }

  /**
   * Conversation Management Delegation
   */
  createConversation(
    workspaceId: string,
    repositoryId: string,
    title?: string,
    model?: AiModelId,
  ): AiChatConversation {
    return this.conversationService.createConversation(workspaceId, repositoryId, 'DevFlow-Main', title, model);
  }

  getConversation(conversationId: string): AiChatConversation {
    return this.conversationService.getConversation(conversationId);
  }

  listConversations(workspaceId: string, repositoryId?: string): AiChatConversation[] {
    return this.conversationService.listConversations(workspaceId, repositoryId);
  }

  deleteConversation(conversationId: string): boolean {
    return this.conversationService.deleteConversation(conversationId);
  }

  updateConversationTitle(conversationId: string, title: string): AiChatConversation {
    return this.conversationService.updateConversationTitle(conversationId, title);
  }

  async sendMessage(
    conversationId: string,
    content: string,
    options: { model?: AiModelId; branch?: string } = {},
  ): Promise<{ userMessage: AiChatMessage; assistantMessage: AiChatMessage }> {
    const conv = this.getConversation(conversationId);
    const chunks = await this.getChunks(conv.repositoryId);
    return this.conversationService.sendMessage(conversationId, content, chunks, options);
  }

  async streamMessage(
    conversationId: string,
    content: string,
    options: { model?: AiModelId; branch?: string } = {},
  ): Promise<Observable<AiChatStreamEvent>> {
    const conv = this.getConversation(conversationId);
    const chunks = await this.getChunks(conv.repositoryId);
    return this.conversationService.streamMessage(conversationId, content, chunks, options);
  }

  stopGeneration(messageId: string): boolean {
    return this.conversationService.stopGeneration(messageId);
  }

  async retryMessage(
    conversationId: string,
    messageId: string,
    model?: AiModelId,
  ): Promise<Observable<AiChatStreamEvent>> {
    const conv = this.getConversation(conversationId);
    const chunks = await this.getChunks(conv.repositoryId);
    return this.conversationService.retryMessage(conversationId, messageId, chunks, model);
  }

  // ==========================================
  // Sample Seed for Instant Grounded Intelligence
  // ==========================================
  private seedSampleIntelligenceData(repositoryId: string): void {
    const sampleFiles = [
      {
        filePath: 'apps/api/src/modules/auth/auth.controller.ts',
        language: 'typescript',
        content: `import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RegisterRequest, LoginRequest } from '@devflow/shared-types';

@Controller('api/v1/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() dto: RegisterRequest) {
    return this.authService.register(dto);
  }

  @Post('login')
  async login(@Body() dto: LoginRequest) {
    return this.authService.login(dto.email, dto.password);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(@CurrentUser() user: any) {
    return this.authService.getProfile(user.id);
  }
}`,
        symbols: [
          { name: 'AuthController', kind: 'class', startLine: 6, endLine: 26 },
          { name: 'register', kind: 'method', startLine: 9, endLine: 12, containerName: 'AuthController' },
          { name: 'login', kind: 'method', startLine: 14, endLine: 17, containerName: 'AuthController' },
          { name: 'getProfile', kind: 'method', startLine: 19, endLine: 23, containerName: 'AuthController' },
        ],
        dependencies: [
          { name: './auth.service', isInternal: true },
          { name: './guards/jwt-auth.guard', isInternal: true },
        ],
      },
      {
        filePath: 'apps/api/src/modules/auth/auth.service.ts',
        language: 'typescript',
        content: `import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.findUserByEmail(email);
    if (user && (await bcrypt.compare(pass, user.passwordHash))) {
      const { passwordHash, ...result } = user;
      return result;
    }
    throw new UnauthorizedException('Invalid credentials');
  }

  async generateTokens(user: any) {
    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });
    return { accessToken, refreshToken, expiresIn: 900 };
  }

  async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
  }
}`,
        symbols: [
          { name: 'AuthService', kind: 'class', startLine: 5, endLine: 31 },
          { name: 'validateUser', kind: 'method', startLine: 8, endLine: 16, containerName: 'AuthService' },
          { name: 'generateTokens', kind: 'method', startLine: 18, endLine: 23, containerName: 'AuthService' },
          { name: 'hashPassword', kind: 'method', startLine: 25, endLine: 28, containerName: 'AuthService' },
        ],
      },
      {
        filePath: 'apps/api/src/modules/auth/guards/jwt-auth.guard.ts',
        language: 'typescript',
        content: `import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid Authorization header');
    }
    return true;
  }
}`,
        symbols: [
          { name: 'JwtAuthGuard', kind: 'class', startLine: 3, endLine: 14 },
          { name: 'canActivate', kind: 'method', startLine: 4, endLine: 12, containerName: 'JwtAuthGuard' },
        ],
      },
      {
        filePath: 'apps/api/src/modules/checkout/checkout.service.ts',
        language: 'typescript',
        content: `import { Injectable, BadRequestException } from '@nestjs/common';
import { OrdersService } from '../orders/orders.service';

@Injectable()
export class CheckoutService {
  constructor(private readonly ordersService: OrdersService) {}

  async processCheckout(workspaceId: string, cartItems: any[], paymentMethodId: string) {
    // 1. Validate Cart
    const validatedCart = await this.validateCart(workspaceId, cartItems);

    // 2. Calculate Taxes and Total
    const taxRate = 0.10;
    const subtotal = validatedCart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const tax = subtotal * taxRate;
    const total = subtotal + tax;

    // 3. Payment Gateway Authorization
    const paymentResult = await this.authorizePayment(paymentMethodId, total);

    // 4. Create Order Transaction
    const order = await this.ordersService.createOrder({
      workspaceId,
      items: validatedCart,
      totalAmount: total,
      paymentIntentId: paymentResult.transactionId,
    });

    return { orderId: order.id, status: 'SUCCESS', total };
  }

  async validateCart(workspaceId: string, items: any[]) {
    if (!items || items.length === 0) throw new BadRequestException('Cart is empty');
    return items;
  }

  async authorizePayment(paymentMethodId: string, amount: number) {
    return { transactionId: 'tx_' + Math.random().toString(36).substring(7), status: 'AUTHORIZED' };
  }
}`,
        symbols: [
          { name: 'CheckoutService', kind: 'class', startLine: 4, endLine: 42 },
          { name: 'processCheckout', kind: 'method', startLine: 7, endLine: 30, containerName: 'CheckoutService' },
          { name: 'validateCart', kind: 'method', startLine: 32, endLine: 35, containerName: 'CheckoutService' },
          { name: 'authorizePayment', kind: 'method', startLine: 37, endLine: 39, containerName: 'CheckoutService' },
        ],
      },
      {
        filePath: 'apps/api/src/modules/orders/orders.service.ts',
        language: 'typescript',
        content: `import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  async createOrder(dto: { workspaceId: string; items: any[]; totalAmount: number; paymentIntentId: string }) {
    this.logger.log(\`Creating new order for workspace \${dto.workspaceId}, total: \${dto.totalAmount}\`);

    // Step 1: Save order & order_items to PostgreSQL table
    const orderRecord = {
      id: 'ord_' + Math.random().toString(36).substring(2, 9),
      workspaceId: dto.workspaceId,
      status: 'PAID',
      totalAmount: dto.totalAmount,
      createdAt: new Date().toISOString(),
    };

    // Step 2: Reserve Inventory & Deduct Workspace Quotas
    await this.reserveInventory(dto.items);

    // Step 3: Emit order created event
    await this.handleOrderCreatedEvent(orderRecord);

    return orderRecord;
  }

  async reserveInventory(items: any[]) {
    this.logger.log(\`Reserving inventory for \${items.length} items\`);
  }

  async handleOrderCreatedEvent(order: any) {
    this.logger.log(\`Emitting devflow.events.order.created.v1 for order \${order.id}\`);
  }
}`,
        symbols: [
          { name: 'OrdersService', kind: 'class', startLine: 3, endLine: 35 },
          { name: 'createOrder', kind: 'method', startLine: 6, endLine: 24, containerName: 'OrdersService' },
          { name: 'reserveInventory', kind: 'method', startLine: 26, endLine: 28, containerName: 'OrdersService' },
          { name: 'handleOrderCreatedEvent', kind: 'method', startLine: 30, endLine: 32, containerName: 'OrdersService' },
        ],
      },
      {
        filePath: 'apps/api/src/config/configuration.ts',
        language: 'typescript',
        content: `export default () => ({
  port: parseInt(process.env.PORT || '4000', 10),
  environment: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://devflow:devflow@localhost:5432/devflow_db',
  postgresHost: process.env.POSTGRES_HOST || 'localhost',
  postgresPort: parseInt(process.env.POSTGRES_PORT || '5432', 10),
  postgresUser: process.env.POSTGRES_USER || 'devflow',
  postgresPassword: process.env.POSTGRES_PASSWORD || 'devflow',
  postgresDatabase: process.env.POSTGRES_DB || 'devflow_db',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  kafkaBrokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
  jwtSecret: process.env.JWT_SECRET || 'devflow-super-secret-jwt-key',
  poolConfig: {
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  },
});`,
        symbols: [
          { name: 'configuration', kind: 'function', startLine: 1, endLine: 18 },
        ],
      },
      {
        filePath: 'infrastructure/postgres/schema.sql',
        language: 'sql',
        content: `CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'DEVELOPER',
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    total_amount NUMERIC(12, 2) NOT NULL,
    payment_intent_id VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE checkout_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id),
    session_token VARCHAR(255) UNIQUE NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL
);`,
        symbols: [
          { name: 'users', kind: 'class', startLine: 1, endLine: 10 },
          { name: 'workspaces', kind: 'class', startLine: 12, endLine: 18 },
          { name: 'orders', kind: 'class', startLine: 20, endLine: 27 },
          { name: 'checkout_sessions', kind: 'class', startLine: 29, endLine: 35 },
        ],
      },
      {
        filePath: 'infrastructure/postgres/data-source.ts',
        language: 'typescript',
        content: `import { DataSource } from 'typeorm';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
  username: process.env.POSTGRES_USER || 'devflow',
  password: process.env.POSTGRES_PASSWORD || 'devflow',
  database: process.env.POSTGRES_DB || 'devflow_db',
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
  entities: ['dist/**/*.entity.js'],
  migrations: ['dist/migrations/*.js'],
  extra: {
    max: 20,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  },
});`,
        symbols: [
          { name: 'AppDataSource', kind: 'variable', startLine: 3, endLine: 19 },
        ],
      },
      {
        filePath: 'apps/api/src/app.module.ts',
        language: 'typescript',
        content: `import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { AuthModule } from './modules/auth/auth.module';
import { WorkspacesModule } from './modules/workspaces/workspaces.module';
import { GitHubModule } from './modules/github/github.module';
import { IngestionModule } from './modules/ingestion/ingestion.module';
import { IntelligenceModule } from './modules/intelligence/intelligence.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    AuthModule,
    WorkspacesModule,
    GitHubModule,
    IngestionModule,
    IntelligenceModule,
    JobsModule,
    HealthModule,
  ],
})
export class AppModule {}`,
        symbols: [
          { name: 'AppModule', kind: 'class', startLine: 11, endLine: 24 },
        ],
      },
    ];

    this.analyzeRepository(repositoryId, 'DevFlow-Main', 'main', '8f9e1a2b', sampleFiles);
  }
}

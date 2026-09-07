import { Test, TestingModule } from '@nestjs/testing';
import { IntelligenceService } from './intelligence.service';
import { ApiExtractorService } from './extractors/api-extractor.service';
import { DbExtractorService } from './extractors/db-extractor.service';
import { AuthExtractorService } from './extractors/auth-extractor.service';
import { ConfigExtractorService } from './extractors/config-extractor.service';
import { TestExtractorService } from './extractors/test-extractor.service';
import { CodeGraphBuilderService } from './graph/code-graph-builder.service';
import { SemanticContextChunkerService } from './chunking/semantic-context-chunker.service';
import { CodeSearchService } from './search/code-search.service';
import { QueryProcessorService } from './rag/query-processor.service';
import { QueryEmbedderService } from './rag/query-embedder.service';
import { HybridRetrieverService } from './rag/hybrid-retriever.service';
import { ContextBuilderService } from './rag/context-builder.service';
import { LlmEngineService } from './rag/llm-engine.service';
import { ConversationService } from './chat/conversation.service';
import { firstValueFrom, toArray } from 'rxjs';

describe('Phase 8: AI Codebase Intelligence & RAG Pipeline', () => {
  let intelligenceService: IntelligenceService;
  let queryProcessor: QueryProcessorService;
  let embedder: QueryEmbedderService;
  let hybridRetriever: HybridRetrieverService;
  let contextBuilder: ContextBuilderService;
  let llmEngine: LlmEngineService;
  let conversationService: ConversationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiExtractorService,
        DbExtractorService,
        AuthExtractorService,
        ConfigExtractorService,
        TestExtractorService,
        CodeGraphBuilderService,
        SemanticContextChunkerService,
        CodeSearchService,
        QueryProcessorService,
        QueryEmbedderService,
        HybridRetrieverService,
        ContextBuilderService,
        LlmEngineService,
        ConversationService,
        IntelligenceService,
      ],
    }).compile();

    intelligenceService = module.get<IntelligenceService>(IntelligenceService);
    queryProcessor = module.get<QueryProcessorService>(QueryProcessorService);
    embedder = module.get<QueryEmbedderService>(QueryEmbedderService);
    hybridRetriever = module.get<HybridRetrieverService>(HybridRetrieverService);
    contextBuilder = module.get<ContextBuilderService>(ContextBuilderService);
    llmEngine = module.get<LlmEngineService>(LlmEngineService);
    conversationService = module.get<ConversationService>(ConversationService);

    // Initialize module & seed sample repository data
    intelligenceService.onModuleInit();
  });

  describe('1. Query Processing & Intent Extraction', () => {
    it('should detect AUTH_INTENT and extract auth symbols', () => {
      const result = queryProcessor.process('Where is authentication implemented?');
      expect(result.intent).toBe('AUTH_INTENT');
      expect(result.targetSymbols).toContain('AuthController');
      expect(result.targetFiles).toContain('auth.controller.ts');
    });

    it('should detect CHECKOUT_INTENT and extract checkout symbols', () => {
      const result = queryProcessor.process('How does checkout work?');
      expect(result.intent).toBe('CHECKOUT_INTENT');
      expect(result.targetSymbols).toContain('CheckoutService');
      expect(result.targetFiles).toContain('checkout.service.ts');
    });

    it('should detect ARCHITECTURE_INTENT for repository explanation queries', () => {
      const result = queryProcessor.process('Explain this repository.');
      expect(result.intent).toBe('ARCHITECTURE_INTENT');
      expect(result.expandedTerms).toContain('DevFlow');
    });

    it('should detect DATABASE_CONFIG_INTENT for postgres questions', () => {
      const result = queryProcessor.process('Where is PostgreSQL configured?');
      expect(result.intent).toBe('DATABASE_CONFIG_INTENT');
      expect(result.targetFiles).toContain('schema.sql');
      expect(result.targetFiles).toContain('configuration.ts');
    });

    it('should detect ORDER_INTENT for order creation questions', () => {
      const result = queryProcessor.process('What happens when an order is created?');
      expect(result.intent).toBe('ORDER_INTENT');
      expect(result.targetSymbols).toContain('OrdersService');
    });
  });

  describe('2. Query Embedding & Cosine Similarity', () => {
    it('should generate normalized 64-dimensional float vector', () => {
      const vec = embedder.embed('authentication and jwt guard');
      expect(vec.length).toBe(64);
      const norm = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0));
      expect(norm).toBeCloseTo(1.0, 4);
    });

    it('should compute higher cosine similarity for semantically aligned text', () => {
      const vec1 = embedder.embed('auth jwt token guard');
      const vec2 = embedder.embed('jwt token authentication');
      const vec3 = embedder.embed('database postgresql migration schema');

      const sim12 = embedder.cosineSimilarity(vec1, vec2);
      const sim13 = embedder.cosineSimilarity(vec1, vec3);

      expect(sim12).toBeGreaterThan(sim13);
      expect(sim12).toBeGreaterThan(0.4);
    });
  });

  describe('3. Hybrid Retrieval & Grounded Context Assembly', () => {
    it('should perform hybrid search and return top-k citations with repository evidence', async () => {
      const chunks = await intelligenceService.getChunks('repo-core-001');
      expect(chunks.length).toBeGreaterThan(0);

      const retrieval = hybridRetriever.retrieve('Where is authentication implemented?', chunks, {
        repositoryId: 'repo-core-001',
        branch: 'main',
        topK: 5,
      });

      expect(retrieval.citations.length).toBeGreaterThan(0);
      expect(retrieval.citations[0].filePath).toBeDefined();
      expect(retrieval.citations[0].startLine).toBeGreaterThan(0);
      expect(retrieval.citations[0].endLine).toBeGreaterThanOrEqual(retrieval.citations[0].startLine);
      expect(retrieval.citations[0].branch).toBe('main');
      expect(retrieval.citations[0].commitSha).toBeDefined();
    });

    it('should assemble structured context with bounded tokens', async () => {
      const chunks = await intelligenceService.getChunks('repo-core-001');
      const retrieval = hybridRetriever.retrieve('Where is PostgreSQL configured?', chunks, {
        repositoryId: 'repo-core-001',
      });

      const context = contextBuilder.buildContext('Where is PostgreSQL configured?', retrieval.contextBlocks);

      expect(context.systemPrompt).toContain('DEVFLOW AI');
      expect(context.systemPrompt).toContain('Grounding & Citations');
      expect(context.formattedEvidence).toContain('Repository:');
      expect(context.formattedEvidence).toContain('Lines:');
      expect(context.totalContextTokens).toBeGreaterThan(50);
      expect(context.totalContextTokens).toBeLessThan(6000);
    });
  });

  describe('4. AI Cost & Token Tracking', () => {
    it('should calculate exact token costs according to model pricing matrix', () => {
      const usageGpt4o = llmEngine.calculateUsage('gpt-4o', 1000, 500, 250);
      expect(usageGpt4o.inputTokens).toBe(1000);
      expect(usageGpt4o.outputTokens).toBe(500);
      expect(usageGpt4o.totalTokens).toBe(1500);
      // (1000/1M * 2.50) + (500/1M * 10.00) = 0.0025 + 0.0050 = 0.0075
      expect(usageGpt4o.estimatedCost).toBe(0.0075);

      const usageDevFlow = llmEngine.calculateUsage('devflow-code-rag-v1', 1000, 500, 150);
      // (1000/1M * 0.50) + (500/1M * 1.50) = 0.0005 + 0.00075 = 0.00125
      expect(usageDevFlow.estimatedCost).toBe(0.00125);
    });
  });

  describe('5. Benchmark Questions Grounding & Citations', () => {
    it('Benchmark 1: "Where is authentication implemented?"', async () => {
      const response = await intelligenceService.askRagQuestion({
        repositoryId: 'repo-core-001',
        question: 'Where is authentication implemented?',
      });

      expect(response.answer).toContain('auth.controller.ts');
      expect(response.answer).toContain('auth.service.ts');
      expect(response.answer).toContain('jwt-auth.guard.ts');
      expect(response.citations.length).toBeGreaterThan(0);
      expect(response.usage.estimatedCost).toBeGreaterThan(0);
    });

    it('Benchmark 2: "How does checkout work?"', async () => {
      const response = await intelligenceService.askRagQuestion({
        repositoryId: 'repo-core-001',
        question: 'How does checkout work?',
      });

      expect(response.answer).toContain('checkout.service.ts');
      expect(response.answer).toContain('processCheckout');
      expect(response.answer).toContain('validateCart');
      expect(response.citations.length).toBeGreaterThan(0);
    });

    it('Benchmark 3: "Explain this repository."', async () => {
      const response = await intelligenceService.askRagQuestion({
        repositoryId: 'repo-core-001',
        question: 'Explain this repository.',
      });

      expect(response.answer).toContain('DevFlow AI');
      expect(response.answer).toContain('NestJS');
      expect(response.answer).toContain('app.module.ts');
      expect(response.citations.length).toBeGreaterThan(0);
    });

    it('Benchmark 4: "Where is PostgreSQL configured?"', async () => {
      const response = await intelligenceService.askRagQuestion({
        repositoryId: 'repo-core-001',
        question: 'Where is PostgreSQL configured?',
      });

      expect(response.answer).toContain('configuration.ts');
      expect(response.answer).toContain('schema.sql');
      expect(response.citations.length).toBeGreaterThan(0);
    });

    it('Benchmark 5: "What happens when an order is created?"', async () => {
      const response = await intelligenceService.askRagQuestion({
        repositoryId: 'repo-core-001',
        question: 'What happens when an order is created?',
      });

      expect(response.answer).toContain('orders.service.ts');
      expect(response.answer).toContain('createOrder');
      expect(response.answer).toContain('reserveInventory');
      expect(response.citations.length).toBeGreaterThan(0);
    });
  });

  describe('6. AI Chat Conversations, Streaming & Controls', () => {
    it('should create, list, retrieve, and delete conversations', () => {
      const conv = intelligenceService.createConversation('ws-core-001', 'repo-core-001', 'Test Chat');
      expect(conv.id).toBeDefined();
      expect(conv.title).toBe('Test Chat');

      const list = intelligenceService.listConversations('ws-core-001', 'repo-core-001');
      expect(list.some((c) => c.id === conv.id)).toBe(true);

      const fetched = intelligenceService.getConversation(conv.id);
      expect(fetched.id).toBe(conv.id);

      intelligenceService.updateConversationTitle(conv.id, 'Renamed Chat');
      expect(intelligenceService.getConversation(conv.id).title).toBe('Renamed Chat');

      intelligenceService.deleteConversation(conv.id);
      expect(() => intelligenceService.getConversation(conv.id)).toThrow();
    });

    it('should send non-streaming message and update total conversation tokens and cost', async () => {
      const conv = intelligenceService.createConversation('ws-core-001', 'repo-core-001');
      const { userMessage, assistantMessage } = await intelligenceService.sendMessage(
        conv.id,
        'Where is authentication implemented?',
      );

      expect(userMessage.role).toBe('user');
      expect(assistantMessage.role).toBe('assistant');
      expect(assistantMessage.citations?.length).toBeGreaterThan(0);
      expect(assistantMessage.usage?.totalTokens).toBeGreaterThan(0);

      const updatedConv = intelligenceService.getConversation(conv.id);
      expect(updatedConv.totalInputTokens).toBeGreaterThan(0);
      expect(updatedConv.totalOutputTokens).toBeGreaterThan(0);
      expect(updatedConv.totalEstimatedCost).toBeGreaterThan(0);
    });

    it('should stream message via SSE observable with pipeline stages and deltas', async () => {
      const conv = intelligenceService.createConversation('ws-core-001', 'repo-core-001');
      const stream$ = await intelligenceService.streamMessage(
        conv.id,
        'How does checkout work?',
      );

      const events = await firstValueFrom(stream$.pipe(toArray()));
      expect(events.length).toBeGreaterThan(0);

      const stages = events.map((e) => e.stage);
      expect(stages).toContain('query_processing');
      expect(stages).toContain('hybrid_retrieval');
      expect(stages).toContain('generating');
      expect(stages).toContain('completed');

      const deltas = events.filter((e) => e.delta).map((e) => e.delta).join('');
      expect(deltas.length).toBeGreaterThan(0);

      const completedEvent = events.find((e) => e.stage === 'completed');
      expect(completedEvent?.citations?.length).toBeGreaterThan(0);
      expect(completedEvent?.usage?.estimatedCost).toBeGreaterThan(0);
    });

    it('should support retrying messages in a conversation', async () => {
      const conv = intelligenceService.createConversation('ws-core-001', 'repo-core-001');
      const { assistantMessage } = await intelligenceService.sendMessage(
        conv.id,
        'Where is PostgreSQL configured?',
      );

      const retryStream$ = await intelligenceService.retryMessage(conv.id, assistantMessage.id);
      const events = await firstValueFrom(retryStream$.pipe(toArray()));

      expect(events.some((e) => e.stage === 'completed')).toBe(true);
    });
  });
});

import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  AiChatCitation,
  AiChatConversation,
  AiChatMessage,
  AiChatStreamEvent,
  AiChatUsage,
  AiModelId,
  SemanticContextChunk,
} from '@devflow/shared-types';
import { v4 as uuidv4 } from 'uuid';
import { QueryProcessorService } from '../rag/query-processor.service';
import { HybridRetrieverService } from '../rag/hybrid-retriever.service';
import { ContextBuilderService } from '../rag/context-builder.service';
import { LlmEngineService } from '../rag/llm-engine.service';
import { Observable } from 'rxjs';

@Injectable()
export class ConversationService {
  private readonly logger = new Logger(ConversationService.name);

  // In-memory conversation store (keyed by conversationId)
  private readonly conversations = new Map<string, AiChatConversation>();

  // Active generation abort controllers (keyed by messageId)
  private readonly activeAbortControllers = new Map<string, AbortController>();

  constructor(
    private readonly queryProcessor: QueryProcessorService,
    private readonly hybridRetriever: HybridRetrieverService,
    private readonly contextBuilder: ContextBuilderService,
    private readonly llmEngine: LlmEngineService,
  ) {
    this.seedSampleConversation();
  }

  // ==========================================
  // Conversation CRUD
  // ==========================================

  createConversation(
    workspaceId: string,
    repositoryId: string,
    repositoryName: string = 'DevFlow-Main',
    title?: string,
    model: AiModelId = 'devflow-code-rag-v1',
  ): AiChatConversation {
    const id = `conv_${uuidv4().substring(0, 8)}`;
    const conversation: AiChatConversation = {
      id,
      workspaceId,
      repositoryId,
      repositoryName,
      title: title || 'New Codebase Chat',
      messages: [],
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalEstimatedCost: 0,
      model,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.conversations.set(id, conversation);
    this.logger.log(`Created new AI conversation ${id} for repo ${repositoryId}`);
    return conversation;
  }

  getConversation(conversationId: string): AiChatConversation {
    const conv = this.conversations.get(conversationId);
    if (!conv) {
      throw new NotFoundException(`Conversation ${conversationId} not found`);
    }
    return conv;
  }

  listConversations(workspaceId: string, repositoryId?: string): AiChatConversation[] {
    const all = Array.from(this.conversations.values());
    return all
      .filter((c) => {
        if (workspaceId && c.workspaceId !== workspaceId) return false;
        if (repositoryId && c.repositoryId !== repositoryId) return false;
        return true;
      })
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  deleteConversation(conversationId: string): boolean {
    const exists = this.conversations.has(conversationId);
    if (!exists) {
      throw new NotFoundException(`Conversation ${conversationId} not found`);
    }
    this.conversations.delete(conversationId);
    return true;
  }

  updateConversationTitle(conversationId: string, title: string): AiChatConversation {
    const conv = this.getConversation(conversationId);
    conv.title = title;
    conv.updatedAt = new Date().toISOString();
    this.conversations.set(conversationId, conv);
    return conv;
  }

  // ==========================================
  // Send Message (Non-Streaming)
  // ==========================================

  async sendMessage(
    conversationId: string,
    content: string,
    chunks: SemanticContextChunk[],
    options: { model?: AiModelId; branch?: string } = {},
  ): Promise<{ userMessage: AiChatMessage; assistantMessage: AiChatMessage }> {
    const conv = this.getConversation(conversationId);
    const model = options.model || conv.model || 'devflow-code-rag-v1';

    // 1. Record User Message
    const userMessage: AiChatMessage = {
      id: `msg_${uuidv4().substring(0, 8)}`,
      conversationId,
      role: 'user',
      content,
      status: 'completed',
      createdAt: new Date().toISOString(),
    };
    conv.messages.push(userMessage);

    // 2. Execute RAG Retrieval
    const retrieval = this.hybridRetriever.retrieve(content, chunks, {
      repositoryId: conv.repositoryId,
      branch: options.branch || 'main',
      topK: 5,
    });

    // 3. Build Grounded Context
    const history = conv.messages.map((m) => ({ role: m.role, content: m.content }));
    const context = this.contextBuilder.buildContext(content, retrieval.contextBlocks, history);

    // 4. Generate Grounded Answer
    const { answer, usage } = await this.llmEngine.generateResponse(
      retrieval.query,
      context,
      retrieval.citations,
      model,
    );

    // 5. Record Assistant Message
    const assistantMessage: AiChatMessage = {
      id: `msg_${uuidv4().substring(0, 8)}`,
      conversationId,
      role: 'assistant',
      content: answer,
      citations: retrieval.citations,
      usage,
      status: 'completed',
      createdAt: new Date().toISOString(),
    };
    conv.messages.push(assistantMessage);

    // Update conversation metrics
    conv.totalInputTokens += usage.inputTokens;
    conv.totalOutputTokens += usage.outputTokens;
    conv.totalEstimatedCost = Number((conv.totalEstimatedCost + usage.estimatedCost).toFixed(6));
    conv.updatedAt = new Date().toISOString();

    // Auto-update conversation title if default
    if (conv.title === 'New Codebase Chat' && content.length > 0) {
      conv.title = content.slice(0, 35) + (content.length > 35 ? '...' : '');
    }

    return { userMessage, assistantMessage };
  }

  // ==========================================
  // Send Message (SSE Streaming Observable)
  // ==========================================

  streamMessage(
    conversationId: string,
    content: string,
    chunks: SemanticContextChunk[],
    options: { model?: AiModelId; branch?: string } = {},
  ): Observable<AiChatStreamEvent> {
    const conv = this.getConversation(conversationId);
    const model = options.model || conv.model || 'devflow-code-rag-v1';

    const userMessageId = `msg_${uuidv4().substring(0, 8)}`;
    const assistantMessageId = `msg_${uuidv4().substring(0, 8)}`;

    const abortController = new AbortController();
    this.activeAbortControllers.set(assistantMessageId, abortController);

    // 1. Record User Message
    const userMessage: AiChatMessage = {
      id: userMessageId,
      conversationId,
      role: 'user',
      content,
      status: 'completed',
      createdAt: new Date().toISOString(),
    };
    conv.messages.push(userMessage);

    // Initial Assistant Message placeholder
    const assistantMessage: AiChatMessage = {
      id: assistantMessageId,
      conversationId,
      role: 'assistant',
      content: '',
      status: 'streaming',
      createdAt: new Date().toISOString(),
    };
    conv.messages.push(assistantMessage);

    return new Observable<AiChatStreamEvent>((subscriber) => {
      (async () => {
        try {
          // Stage 1: Query Processing
          subscriber.next({
            stage: 'query_processing',
            messageId: assistantMessageId,
          });

          // Stage 2: Embedding
          subscriber.next({
            stage: 'query_embedding',
            messageId: assistantMessageId,
          });

          // Stage 3: Hybrid Retrieval
          subscriber.next({
            stage: 'hybrid_retrieval',
            messageId: assistantMessageId,
          });

          const retrieval = this.hybridRetriever.retrieve(content, chunks, {
            repositoryId: conv.repositoryId,
            branch: options.branch || 'main',
            topK: 5,
          });

          // Emit retrieved citations immediately
          subscriber.next({
            stage: 'hybrid_retrieval',
            messageId: assistantMessageId,
            citations: retrieval.citations,
          });

          // Stage 4: Context Assembly
          subscriber.next({
            stage: 'context_building',
            messageId: assistantMessageId,
          });

          const history = conv.messages.map((m) => ({ role: m.role, content: m.content }));
          const context = this.contextBuilder.buildContext(content, retrieval.contextBlocks, history);

          // Stage 5: Generation
          subscriber.next({
            stage: 'generating',
            messageId: assistantMessageId,
          });

          let accumulatedAnswer = '';
          let finalUsage: AiChatUsage | undefined;

          const streamGen = this.llmEngine.generateStream(
            retrieval.query,
            context,
            retrieval.citations,
            model,
            abortController.signal,
          );

          for await (const chunk of streamGen) {
            if (chunk.type === 'delta' && chunk.delta) {
              accumulatedAnswer += chunk.delta;
              assistantMessage.content = accumulatedAnswer;
              subscriber.next({
                stage: 'generating',
                messageId: assistantMessageId,
                delta: chunk.delta,
              });
            } else if (chunk.type === 'done' && chunk.usage) {
              finalUsage = chunk.usage;
            }
          }

          // Finalize message
          assistantMessage.content = accumulatedAnswer;
          assistantMessage.citations = retrieval.citations;
          assistantMessage.usage = finalUsage;
          assistantMessage.status = abortController.signal.aborted ? 'stopped' : 'completed';

          if (finalUsage) {
            conv.totalInputTokens += finalUsage.inputTokens;
            conv.totalOutputTokens += finalUsage.outputTokens;
            conv.totalEstimatedCost = Number(
              (conv.totalEstimatedCost + finalUsage.estimatedCost).toFixed(6),
            );
          }
          conv.updatedAt = new Date().toISOString();

          // Auto title
          if (conv.title === 'New Codebase Chat' && content.length > 0) {
            conv.title = content.slice(0, 35) + (content.length > 35 ? '...' : '');
          }

          subscriber.next({
            stage: 'completed',
            messageId: assistantMessageId,
            citations: retrieval.citations,
            usage: finalUsage,
          });

          subscriber.complete();
        } catch (err: any) {
          this.logger.error(`Streaming error for message ${assistantMessageId}: ${err.message}`);
          assistantMessage.status = 'failed';
          subscriber.next({
            stage: 'error',
            messageId: assistantMessageId,
            error: err.message || 'An error occurred while streaming response',
          });
          subscriber.complete();
        } finally {
          this.activeAbortControllers.delete(assistantMessageId);
        }
      })();

      return () => {
        abortController.abort();
        this.activeAbortControllers.delete(assistantMessageId);
      };
    });
  }

  // ==========================================
  // Stop Generation
  // ==========================================

  stopGeneration(messageId: string): boolean {
    const controller = this.activeAbortControllers.get(messageId);
    if (controller) {
      controller.abort();
      this.activeAbortControllers.delete(messageId);
      this.logger.log(`Generation aborted for message: ${messageId}`);
      return true;
    }
    return false;
  }

  // ==========================================
  // Retry / Regenerate Message
  // ==========================================

  async retryMessage(
    conversationId: string,
    messageId: string,
    chunks: SemanticContextChunk[],
    model?: AiModelId,
  ): Promise<Observable<AiChatStreamEvent>> {
    const conv = this.getConversation(conversationId);
    const msgIndex = conv.messages.findIndex((m) => m.id === messageId);

    if (msgIndex === -1) {
      throw new NotFoundException(`Message ${messageId} not found in conversation ${conversationId}`);
    }

    // Find preceding user question
    let userPrompt = '';
    if (conv.messages[msgIndex].role === 'assistant') {
      const prev = conv.messages[msgIndex - 1];
      if (prev && prev.role === 'user') {
        userPrompt = prev.content;
      }
      // Remove old assistant message
      conv.messages.splice(msgIndex, 1);
    } else {
      userPrompt = conv.messages[msgIndex].content;
    }

    if (!userPrompt) {
      throw new BadRequestException('Could not determine prompt for message retry');
    }

    return this.streamMessage(conversationId, userPrompt, chunks, { model });
  }

  // ==========================================
  // Seed Default Demonstration Conversation
  // ==========================================

  private seedSampleConversation() {
    const convId = 'conv-welcome-001';
    const sampleConv: AiChatConversation = {
      id: convId,
      workspaceId: 'ws-core-001',
      repositoryId: 'repo-core-001',
      repositoryName: 'core-engine',
      title: 'DevFlow Architecture & Authentication Guide',
      messages: [
        {
          id: 'msg-seed-1',
          conversationId: convId,
          role: 'user',
          content: 'Where is authentication implemented?',
          status: 'completed',
          createdAt: '2026-09-06T18:00:00.000Z',
        },
        {
          id: 'msg-seed-2',
          conversationId: convId,
          role: 'assistant',
          content: `Authentication in **DevFlow AI** is implemented via a multi-layered NestJS architecture:

### 1. HTTP Endpoints
* **\`apps/api/src/modules/auth/auth.controller.ts\`** (Lines 1-28)
  - Manages \`/register\`, \`/login\`, and \`@UseGuards(JwtAuthGuard) /me\` endpoints.

### 2. Service Logic
* **\`apps/api/src/modules/auth/auth.service.ts\`** (Lines 1-48)
  - Implements \`validateUser()\` with bcrypt password hashing and dual-token JWT rotation.

### 3. Protection Guard
* **\`apps/api/src/modules/auth/guards/jwt-auth.guard.ts\`** (Lines 1-15)
  - \`JwtAuthGuard\` validates incoming bearer tokens for all protected workspace routes.`,
          citations: [
            {
              id: 'cit-auth-ctrl',
              repositoryId: 'repo-core-001',
              repositoryName: 'core-engine',
              filePath: 'apps/api/src/modules/auth/auth.controller.ts',
              symbolName: 'AuthController',
              startLine: 1,
              endLine: 28,
              branch: 'main',
              commitSha: '8f9e1a2b',
              codeSnippet: `@Controller('api/v1/auth')\nexport class AuthController {\n  @Post('login')\n  async login(@Body() dto: LoginRequest) {}\n}`,
              relevanceScore: 0.98,
            },
            {
              id: 'cit-auth-srv',
              repositoryId: 'repo-core-001',
              repositoryName: 'core-engine',
              filePath: 'apps/api/src/modules/auth/auth.service.ts',
              symbolName: 'AuthService',
              startLine: 1,
              endLine: 48,
              branch: 'main',
              commitSha: '8f9e1a2b',
              codeSnippet: `export class AuthService {\n  async validateUser(email: string, pass: string) {}\n  async generateTokens(user: User) {}\n}`,
              relevanceScore: 0.95,
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
          createdAt: '2026-09-06T18:00:01.000Z',
        },
      ],
      totalInputTokens: 412,
      totalOutputTokens: 248,
      totalEstimatedCost: 0.000578,
      model: 'devflow-code-rag-v1',
      createdAt: '2026-09-06T18:00:00.000Z',
      updatedAt: '2026-09-06T18:00:01.000Z',
    };

    this.conversations.set(convId, sampleConv);
  }
}

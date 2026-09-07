import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Res,
  Sse,
} from '@nestjs/common';
import { Response } from 'express';
import {
  AiChatConversation,
  AiChatMessage,
  AiChatStreamEvent,
  AiModelId,
  ApiEndpointSummary,
  AuthPatternSummary,
  CodeGraph,
  CodeIntelligenceReport,
  CodeSearchMode,
  CodeSearchQuery,
  CodeSearchResponse,
  ConfigPatternSummary,
  CreateConversationRequest,
  DbModelSummary,
  RagQueryRequest,
  RagQueryResponse,
  SemanticContextChunk,
  SendMessageRequest,
  TestSuiteSummary,
} from '@devflow/shared-types';
import { IntelligenceService } from './intelligence.service';
import { Observable, map } from 'rxjs';

@Controller('api/v1/workspaces/:workspaceId/repositories/:repositoryId/intelligence')
export class IntelligenceController {
  constructor(private readonly intelligenceService: IntelligenceService) {}

  // ==========================================
  // Code Intelligence & AST Reports
  // ==========================================

  @Get()
  async getReport(
    @Param('repositoryId') repositoryId: string,
  ): Promise<CodeIntelligenceReport> {
    return this.intelligenceService.getReport(repositoryId);
  }

  @Get('graph')
  async getGraph(
    @Param('repositoryId') repositoryId: string,
  ): Promise<CodeGraph> {
    return this.intelligenceService.getGraph(repositoryId);
  }

  @Get('apis')
  async getApis(
    @Param('repositoryId') repositoryId: string,
  ): Promise<ApiEndpointSummary[]> {
    return this.intelligenceService.getApis(repositoryId);
  }

  @Get('database')
  async getDatabaseModels(
    @Param('repositoryId') repositoryId: string,
  ): Promise<DbModelSummary[]> {
    return this.intelligenceService.getDatabaseModels(repositoryId);
  }

  @Get('auth')
  async getAuthPatterns(
    @Param('repositoryId') repositoryId: string,
  ): Promise<AuthPatternSummary[]> {
    return this.intelligenceService.getAuthPatterns(repositoryId);
  }

  @Get('config')
  async getConfigKeys(
    @Param('repositoryId') repositoryId: string,
  ): Promise<ConfigPatternSummary[]> {
    return this.intelligenceService.getConfigKeys(repositoryId);
  }

  @Get('tests')
  async getTestSuites(
    @Param('repositoryId') repositoryId: string,
  ): Promise<TestSuiteSummary[]> {
    return this.intelligenceService.getTestSuites(repositoryId);
  }

  @Post('search')
  @HttpCode(HttpStatus.OK)
  async searchCode(
    @Param('workspaceId') workspaceId: string,
    @Param('repositoryId') repositoryId: string,
    @Body()
    body: {
      query: string;
      mode?: CodeSearchMode;
      language?: string;
      filePathPrefix?: string;
      page?: number;
      limit?: number;
    },
  ): Promise<CodeSearchResponse> {
    const searchQuery: CodeSearchQuery = {
      repositoryId,
      workspaceId,
      query: body.query || '',
      mode: body.mode || 'keyword',
      language: body.language,
      filePathPrefix: body.filePathPrefix,
      page: body.page || 1,
      limit: body.limit || 20,
    };
    return this.intelligenceService.searchCode(searchQuery);
  }

  @Get('chunks')
  async getChunks(
    @Param('repositoryId') repositoryId: string,
  ): Promise<SemanticContextChunk[]> {
    return this.intelligenceService.getChunks(repositoryId);
  }

  // ==========================================
  // Phase 8: RAG Direct Endpoints
  // ==========================================

  @Post('rag/ask')
  @HttpCode(HttpStatus.OK)
  async askRagQuestion(
    @Param('workspaceId') workspaceId: string,
    @Param('repositoryId') repositoryId: string,
    @Body() body: { question: string; model?: AiModelId; branch?: string },
  ): Promise<RagQueryResponse> {
    const request: RagQueryRequest = {
      workspaceId,
      repositoryId,
      question: body.question,
      model: body.model,
      branch: body.branch,
    };
    return this.intelligenceService.askRagQuestion(request);
  }

  // ==========================================
  // Phase 8: AI Chat Conversations
  // ==========================================

  @Post('conversations')
  async createConversation(
    @Param('workspaceId') workspaceId: string,
    @Param('repositoryId') repositoryId: string,
    @Body() body: CreateConversationRequest,
  ): Promise<AiChatConversation> {
    return this.intelligenceService.createConversation(
      workspaceId,
      repositoryId,
      body.title,
      body.model,
    );
  }

  @Get('conversations')
  async listConversations(
    @Param('workspaceId') workspaceId: string,
    @Param('repositoryId') repositoryId: string,
  ): Promise<AiChatConversation[]> {
    return this.intelligenceService.listConversations(workspaceId, repositoryId);
  }

  @Get('conversations/:conversationId')
  async getConversation(
    @Param('conversationId') conversationId: string,
  ): Promise<AiChatConversation> {
    return this.intelligenceService.getConversation(conversationId);
  }

  @Delete('conversations/:conversationId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteConversation(
    @Param('conversationId') conversationId: string,
  ): Promise<void> {
    this.intelligenceService.deleteConversation(conversationId);
  }

  @Patch('conversations/:conversationId')
  async updateConversationTitle(
    @Param('conversationId') conversationId: string,
    @Body() body: { title: string },
  ): Promise<AiChatConversation> {
    return this.intelligenceService.updateConversationTitle(conversationId, body.title);
  }

  @Post('conversations/:conversationId/messages')
  async sendMessage(
    @Param('conversationId') conversationId: string,
    @Body() body: SendMessageRequest,
  ): Promise<{ userMessage: AiChatMessage; assistantMessage: AiChatMessage }> {
    return this.intelligenceService.sendMessage(conversationId, body.content, {
      model: body.model,
      branch: body.branch,
    });
  }

  /**
   * Server-Sent Events (SSE) Stream Endpoint for Chat Messages
   */
  @Post('conversations/:conversationId/messages/stream')
  async streamMessageHttp(
    @Param('conversationId') conversationId: string,
    @Body() body: SendMessageRequest,
    @Res() res: Response,
  ): Promise<void> {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const stream$ = await this.intelligenceService.streamMessage(
      conversationId,
      body.content,
      { model: body.model, branch: body.branch },
    );

    const subscription = stream$.subscribe({
      next: (event) => {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      },
      error: (err) => {
        res.write(`data: ${JSON.stringify({ stage: 'error', error: err.message })}\n\n`);
        res.end();
      },
      complete: () => {
        res.end();
      },
    });

    res.on('close', () => {
      subscription.unsubscribe();
    });
  }

  @Post('conversations/:conversationId/messages/:messageId/stop')
  @HttpCode(HttpStatus.OK)
  async stopGeneration(
    @Param('messageId') messageId: string,
  ): Promise<{ stopped: boolean }> {
    const stopped = this.intelligenceService.stopGeneration(messageId);
    return { stopped };
  }

  @Post('conversations/:conversationId/messages/:messageId/retry')
  async retryMessage(
    @Param('conversationId') conversationId: string,
    @Param('messageId') messageId: string,
    @Body() body: { model?: AiModelId },
    @Res() res: Response,
  ): Promise<void> {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const stream$ = await this.intelligenceService.retryMessage(
      conversationId,
      messageId,
      body.model,
    );

    const subscription = stream$.subscribe({
      next: (event) => {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      },
      error: (err) => {
        res.write(`data: ${JSON.stringify({ stage: 'error', error: err.message })}\n\n`);
        res.end();
      },
      complete: () => {
        res.end();
      },
    });

    res.on('close', () => {
      subscription.unsubscribe();
    });
  }
}

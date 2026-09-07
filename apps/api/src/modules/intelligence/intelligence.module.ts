import { Module } from '@nestjs/common';
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
import { IntelligenceService } from './intelligence.service';
import { IntelligenceController } from './intelligence.controller';

@Module({
  controllers: [IntelligenceController],
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
  exports: [
    IntelligenceService,
    CodeGraphBuilderService,
    SemanticContextChunkerService,
    CodeSearchService,
    QueryProcessorService,
    QueryEmbedderService,
    HybridRetrieverService,
    ContextBuilderService,
    LlmEngineService,
    ConversationService,
  ],
})
export class IntelligenceModule {}

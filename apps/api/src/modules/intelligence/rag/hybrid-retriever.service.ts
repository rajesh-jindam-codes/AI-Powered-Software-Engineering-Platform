import { Injectable, Logger } from '@nestjs/common';
import {
  AiChatCitation,
  RagContextBlock,
  SemanticContextChunk,
} from '@devflow/shared-types';
import { QueryProcessorService, ProcessedQuery } from './query-processor.service';
import { QueryEmbedderService } from './query-embedder.service';

export interface HybridRetrievalResult {
  query: ProcessedQuery;
  citations: AiChatCitation[];
  contextBlocks: RagContextBlock[];
  totalChunksSearched: number;
  retrievalLatencyMs: number;
}

export interface HybridSearchOptions {
  repositoryId: string;
  branch?: string;
  language?: string;
  filePathPrefix?: string;
  topK?: number;
  minScoreThreshold?: number;
}

@Injectable()
export class HybridRetrieverService {
  private readonly logger = new Logger(HybridRetrieverService.name);

  constructor(
    private readonly queryProcessor: QueryProcessorService,
    private readonly embedder: QueryEmbedderService,
  ) {}

  retrieve(
    rawQuery: string,
    chunks: SemanticContextChunk[],
    options: HybridSearchOptions,
  ): HybridRetrievalResult {
    const startTime = Date.now();
    const processedQuery = this.queryProcessor.process(rawQuery);
    const queryVector = this.embedder.embed(
      `${processedQuery.cleanedQuery} ${processedQuery.expandedTerms.join(' ')}`,
    );

    const topK = options.topK || 5;
    const minScore = options.minScoreThreshold || 0.15;

    // Filter by repository and optional branch/language
    let candidates = chunks.filter((c) => {
      if (options.repositoryId && c.repositoryId !== options.repositoryId) {
        return false;
      }
      if (options.branch && c.branch && c.branch !== options.branch) {
        return false;
      }
      if (options.language && c.language.toLowerCase() !== options.language.toLowerCase()) {
        return false;
      }
      if (options.filePathPrefix && !c.filePath.startsWith(options.filePathPrefix)) {
        return false;
      }
      return true;
    });

    if (candidates.length === 0 && chunks.length > 0) {
      // Fallback to all chunks if repository filter had no matching chunks
      candidates = chunks;
    }

    interface ScoredChunk {
      chunk: SemanticContextChunk;
      vectorScore: number;
      keywordScore: number;
      symbolScore: number;
      finalScore: number;
    }

    const scored: ScoredChunk[] = [];

    for (const chunk of candidates) {
      // 1. Vector Cosine Similarity
      const chunkVector = this.embedder.embed(chunk.enrichedContent || chunk.content);
      const vectorScore = this.embedder.cosineSimilarity(queryVector, chunkVector);

      // 2. Keyword & Token Matching Score
      let keywordScore = 0;
      const lowerContent = chunk.content.toLowerCase();
      const lowerFile = chunk.filePath.toLowerCase();
      const lowerBreadcrumb = chunk.symbolBreadcrumb.toLowerCase();

      // Check keywords
      for (const kw of processedQuery.keywords) {
        if (lowerFile.includes(kw)) keywordScore += 0.4;
        if (lowerBreadcrumb.includes(kw)) keywordScore += 0.35;
        if (lowerContent.includes(kw)) keywordScore += 0.25;
      }

      // Check expanded terms
      for (const term of processedQuery.expandedTerms) {
        if (lowerContent.includes(term.toLowerCase())) keywordScore += 0.2;
        if (lowerFile.includes(term.toLowerCase())) keywordScore += 0.3;
      }

      // 3. Target Symbols & Files Direct Match Boost
      let symbolScore = 0;
      for (const sym of processedQuery.targetSymbols) {
        if (chunk.symbolBreadcrumb.toLowerCase().includes(sym.toLowerCase())) {
          symbolScore += 0.6;
        }
        if (lowerContent.includes(sym.toLowerCase())) {
          symbolScore += 0.3;
        }
      }

      for (const file of processedQuery.targetFiles) {
        if (lowerFile.includes(file.toLowerCase())) {
          symbolScore += 0.7;
        }
      }

      // 4. Weighted Hybrid Score
      // Vector: 35%, Keyword: 35%, Symbol/File match: 30%
      const finalScore =
        vectorScore * 0.35 +
        Math.min(1.0, keywordScore) * 0.35 +
        Math.min(1.0, symbolScore) * 0.3;

      if (finalScore >= minScore || scored.length < topK) {
        scored.push({
          chunk,
          vectorScore: Number(vectorScore.toFixed(3)),
          keywordScore: Number(keywordScore.toFixed(3)),
          symbolScore: Number(symbolScore.toFixed(3)),
          finalScore: Number(finalScore.toFixed(3)),
        });
      }
    }

    // Sort by final score descending
    scored.sort((a, b) => b.finalScore - a.finalScore);

    // Pick top K
    const topScored = scored.slice(0, topK);

    // If topScored is empty (e.g. empty repository), take first few chunks as fallback
    const selected = topScored.length > 0 ? topScored : candidates.slice(0, topK).map((c) => ({
      chunk: c,
      vectorScore: 0.5,
      keywordScore: 0.5,
      symbolScore: 0.5,
      finalScore: 0.5,
    }));

    // Build Citations and Context Blocks
    const citations: AiChatCitation[] = selected.map((s) => ({
      id: `cit_${s.chunk.id}`,
      repositoryId: s.chunk.repositoryId,
      repositoryName: s.chunk.repositoryName,
      filePath: s.chunk.filePath,
      symbolName: s.chunk.symbolBreadcrumb.split('>').pop()?.trim(),
      startLine: s.chunk.startLine,
      endLine: s.chunk.endLine,
      branch: s.chunk.branch || 'main',
      commitSha: s.chunk.commitSha || 'latest',
      codeSnippet: s.chunk.content.slice(0, 500),
      relevanceScore: s.finalScore,
    }));

    const contextBlocks: RagContextBlock[] = selected.map((s) => ({
      repository: s.chunk.repositoryName,
      file: s.chunk.filePath,
      symbol: s.chunk.symbolBreadcrumb.split('>').pop()?.trim(),
      startLine: s.chunk.startLine,
      endLine: s.chunk.endLine,
      branch: s.chunk.branch || 'main',
      commit: s.chunk.commitSha || 'latest',
      code: s.chunk.content,
      score: s.finalScore,
    }));

    const latencyMs = Date.now() - startTime;

    return {
      query: processedQuery,
      citations,
      contextBlocks,
      totalChunksSearched: candidates.length,
      retrievalLatencyMs: latencyMs,
    };
  }
}

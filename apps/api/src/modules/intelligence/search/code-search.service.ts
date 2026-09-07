import { Injectable, Logger } from '@nestjs/common';
import {
  CodeSearchMode,
  CodeSearchQuery,
  CodeSearchResponse,
  CodeSearchResultItem,
  SemanticContextChunk,
} from '@devflow/shared-types';

export interface IndexedCodeItem {
  id: string;
  repositoryId: string;
  filePath: string;
  language: string;
  symbolName?: string;
  symbolKind?: any;
  startLine: number;
  endLine: number;
  content: string;
  contextHeader?: string;
}

@Injectable()
export class CodeSearchService {
  private readonly logger = new Logger(CodeSearchService.name);

  private readonly index = new Map<string, IndexedCodeItem[]>(); // repoId -> items

  indexChunks(repositoryId: string, chunks: SemanticContextChunk[]): void {
    const items: IndexedCodeItem[] = chunks.map((c) => ({
      id: c.id,
      repositoryId: c.repositoryId,
      filePath: c.filePath,
      language: c.language,
      symbolName: c.symbolBreadcrumb.split('>').pop()?.trim(),
      symbolKind: c.chunkType,
      startLine: c.startLine,
      endLine: c.endLine,
      content: c.content,
      contextHeader: c.contextHeader,
    }));

    const existing = this.index.get(repositoryId) || [];
    this.index.set(repositoryId, [...existing, ...items]);
  }

  search(query: CodeSearchQuery): CodeSearchResponse {
    const startTime = Date.now();
    const mode = query.mode || 'keyword';
    const rawQuery = query.query.trim().toLowerCase();
    const items = this.index.get(query.repositoryId) || [];

    let matched: CodeSearchResultItem[] = [];

    if (!rawQuery) {
      // Empty query returns top items
      matched = items.slice(0, 20).map((item) => ({
        id: item.id,
        repositoryId: item.repositoryId,
        filePath: item.filePath,
        language: item.language,
        matchType: mode,
        symbolName: item.symbolName,
        symbolKind: item.symbolKind,
        startLine: item.startLine,
        endLine: item.endLine,
        matchedContent: item.content,
        score: 1.0,
        contextHeader: item.contextHeader,
      }));
    } else {
      for (const item of items) {
        let score = 0;
        let matchType: CodeSearchMode = 'keyword';
        const highlights: string[] = [];

        // 1. File Search Match
        if (mode === 'file' || item.filePath.toLowerCase().includes(rawQuery)) {
          if (item.filePath.toLowerCase().includes(rawQuery)) {
            score += 0.8;
            matchType = 'file';
            highlights.push(`File path matched: ${item.filePath}`);
          }
        }

        // 2. Symbol Search Match
        if (mode === 'symbol' || (item.symbolName && item.symbolName.toLowerCase().includes(rawQuery))) {
          if (item.symbolName && item.symbolName.toLowerCase().includes(rawQuery)) {
            score += item.symbolName.toLowerCase() === rawQuery ? 1.5 : 1.0;
            matchType = 'symbol';
            highlights.push(`Symbol matched: ${item.symbolName}`);
          }
        }

        // 3. Keyword Content Match
        if (mode === 'keyword' || mode === 'semantic') {
          const contentLower = item.content.toLowerCase();
          if (contentLower.includes(rawQuery)) {
            score += 0.9;
            matchType = mode;

            // Extract matching line snippets
            const lines = item.content.split('\n');
            for (let i = 0; i < lines.length; i++) {
              if (lines[i].toLowerCase().includes(rawQuery)) {
                highlights.push(`L${item.startLine + i}: ${lines[i].trim()}`);
                if (highlights.length >= 3) break;
              }
            }
          }
        }

        // Apply filters
        if (query.language && item.language.toLowerCase() !== query.language.toLowerCase()) {
          score = 0;
        }
        if (query.filePathPrefix && !item.filePath.startsWith(query.filePathPrefix)) {
          score = 0;
        }

        if (score > 0) {
          matched.push({
            id: item.id,
            repositoryId: item.repositoryId,
            filePath: item.filePath,
            language: item.language,
            matchType,
            symbolName: item.symbolName,
            symbolKind: item.symbolKind,
            startLine: item.startLine,
            endLine: item.endLine,
            matchedContent: item.content,
            highlightSnippets: highlights,
            score: Number(score.toFixed(2)),
            contextHeader: item.contextHeader,
          });
        }
      }
    }

    // Sort by relevance score descending
    matched.sort((a, b) => b.score - a.score);

    const page = Math.max(1, query.page || 1);
    const limit = Math.max(1, Math.min(100, query.limit || 20));
    const paginated = matched.slice((page - 1) * limit, page * limit);
    const latencyMs = Date.now() - startTime;

    return {
      query: query.query,
      mode,
      total: matched.length,
      results: paginated,
      latencyMs,
    };
  }

  clear(): void {
    this.index.clear();
  }
}

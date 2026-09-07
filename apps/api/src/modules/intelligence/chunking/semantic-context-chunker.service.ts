import { Injectable, Logger } from '@nestjs/common';
import { SemanticContextChunk, SymbolKind } from '@devflow/shared-types';

export interface ChunkFileInput {
  repositoryId: string;
  repositoryName: string;
  branch: string;
  commitSha: string;
  filePath: string;
  language: string;
  content: string;
  symbols: Array<{ name: string; kind: SymbolKind; startLine: number; endLine: number; containerName?: string }>;
  dependencies?: string[];
}

/**
 * DEVFLOW AI — SemanticContextChunkerService
 *
 * Slices source code into AST-bounded semantic units while strictly
 * preserving repository, branch, commit, file, symbol breadcrumb,
 * line numbers, and structured context headers.
 */
@Injectable()
export class SemanticContextChunkerService {
  private readonly logger = new Logger(SemanticContextChunkerService.name);

  chunkFile(input: ChunkFileInput): SemanticContextChunk[] {
    const chunks: SemanticContextChunk[] = [];
    const lines = input.content.split('\n');
    const totalLines = lines.length;
    const fileName = input.filePath.split('/').pop() || input.filePath;

    // If file is empty
    if (totalLines === 0 || input.content.trim().length === 0) {
      return [];
    }

    // Sort symbols by start line
    const sortedSymbols = [...input.symbols].sort((a, b) => a.startLine - b.startLine);

    if (sortedSymbols.length === 0) {
      // Fallback: natural paragraph / logical block chunking (max ~50 lines per chunk)
      const chunkSize = 40;
      for (let i = 0; i < totalLines; i += chunkSize) {
        const start = i + 1;
        const end = Math.min(totalLines, i + chunkSize);
        const chunkContent = lines.slice(i, end).join('\n');
        const contextHeader = `// Repository: ${input.repositoryName} | Branch: ${input.branch} | File: ${input.filePath} (Lines ${start}-${end})`;
        const breadcrumb = `${input.repositoryName} > ${input.filePath} > Block_${start}_${end}`;

        chunks.push({
          id: `chunk_${input.repositoryId.substring(0, 8)}_${input.filePath.replace(/[^a-zA-Z0-9]/g, '_')}_${start}`,
          repositoryId: input.repositoryId,
          repositoryName: input.repositoryName,
          branch: input.branch,
          commitSha: input.commitSha,
          filePath: input.filePath,
          fileName,
          language: input.language,
          chunkType: 'block',
          symbolBreadcrumb: breadcrumb,
          contextHeader,
          startLine: start,
          endLine: end,
          content: chunkContent,
          enrichedContent: `${contextHeader}\n\n${chunkContent}`,
          tokensCount: Math.ceil(chunkContent.length / 4),
          dependencies: input.dependencies || [],
        });
      }
      return chunks;
    }

    // AST-bounded Chunking
    for (const sym of sortedSymbols) {
      const start = Math.max(1, sym.startLine);
      const end = Math.min(totalLines, sym.endLine);
      const symbolLines = lines.slice(start - 1, end);
      const chunkContent = symbolLines.join('\n');

      const containerPrefix = sym.containerName ? `${sym.containerName} > ` : '';
      const symbolBreadcrumb = `${input.repositoryName} > ${input.filePath} > ${containerPrefix}${sym.name}`;
      const contextHeader = `// Repository: ${input.repositoryName} | Branch: ${input.branch} | Commit: ${input.commitSha.substring(0, 7)}\n// File: ${input.filePath} (Lines ${start}-${end})\n// Scope: ${sym.kind.toUpperCase()} ${sym.name}`;

      const chunkType: SemanticContextChunk['chunkType'] =
        sym.kind === 'class'
          ? 'class'
          : sym.kind === 'function' || sym.kind === 'method'
            ? 'function'
            : sym.kind === 'interface'
              ? 'interface'
              : 'block';

      chunks.push({
        id: `chunk_${input.repositoryId.substring(0, 8)}_${input.filePath.replace(/[^a-zA-Z0-9]/g, '_')}_${start}_${end}`,
        repositoryId: input.repositoryId,
        repositoryName: input.repositoryName,
        branch: input.branch,
        commitSha: input.commitSha,
        filePath: input.filePath,
        fileName,
        language: input.language,
        chunkType,
        symbolBreadcrumb,
        contextHeader,
        startLine: start,
        endLine: end,
        content: chunkContent,
        enrichedContent: `${contextHeader}\n\n${chunkContent}`,
        tokensCount: Math.ceil(chunkContent.length / 4),
        dependencies: input.dependencies || [],
      });
    }

    return chunks;
  }
}

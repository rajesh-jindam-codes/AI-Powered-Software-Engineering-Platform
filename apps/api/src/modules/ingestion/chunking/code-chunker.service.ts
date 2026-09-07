import { Injectable } from '@nestjs/common';
import { ExtractedChunk, ExtractedSymbol } from '../parsers/parser.interface';
import { CodeChunk, ChunkType } from '@devflow/shared-types';
import * as crypto from 'crypto';

@Injectable()
export class CodeChunkerService {
  private readonly maxChunkLines = 120;
  private readonly maxChunkChars = 4000;

  /**
   * Refines raw extracted chunks with metadata, context breadcrumbs, and token estimations
   */
  processChunks(
    repositoryId: string,
    fileId: string,
    filePath: string,
    language: string,
    rawChunks: ExtractedChunk[],
    symbols: ExtractedSymbol[],
  ): CodeChunk[] {
    const refinedChunks: CodeChunk[] = [];

    for (const chunk of rawChunks) {
      const lines = chunk.content.split(/\r?\n/);

      // If chunk is reasonably sized, keep as a single semantic unit
      if (lines.length <= this.maxChunkLines && chunk.content.length <= this.maxChunkChars) {
        refinedChunks.push(
          this.buildChunk(
            repositoryId,
            fileId,
            filePath,
            language,
            chunk.startLine,
            chunk.endLine,
            chunk.content,
            chunk.chunkType,
            chunk.symbolName,
            chunk.parentScope,
            chunk.signature,
          ),
        );
      } else {
        // Split oversized block into sub-chunks with overlap
        const subChunks = this.splitLargeBlock(lines, chunk.startLine, 80, 10);
        for (const sub of subChunks) {
          refinedChunks.push(
            this.buildChunk(
              repositoryId,
              fileId,
              filePath,
              language,
              sub.startLine,
              sub.endLine,
              sub.content,
              chunk.chunkType,
              chunk.symbolName,
              chunk.parentScope,
              chunk.signature,
            ),
          );
        }
      }
    }

    return refinedChunks;
  }

  private buildChunk(
    repositoryId: string,
    fileId: string,
    filePath: string,
    language: string,
    startLine: number,
    endLine: number,
    content: string,
    chunkType: ChunkType,
    symbolName?: string,
    parentScope?: string,
    signature?: string,
  ): CodeChunk {
    const id = `chunk-${crypto.randomUUID()}`;
    const tokensCount = Math.ceil(content.length / 4);

    return {
      id,
      repositoryId,
      fileId,
      filePath,
      startLine,
      endLine,
      content,
      language,
      chunkType,
      tokensCount,
      astMetadata: {
        symbolName,
        parentScope,
        signature,
      },
      createdAt: new Date().toISOString(),
    };
  }

  private splitLargeBlock(
    lines: string[],
    baseStartLine: number,
    windowSize: number,
    overlap: number,
  ): Array<{ startLine: number; endLine: number; content: string }> {
    const results: Array<{ startLine: number; endLine: number; content: string }> = [];

    for (let i = 0; i < lines.length; i += windowSize - overlap) {
      const slice = lines.slice(i, i + windowSize);
      if (slice.length === 0) break;

      const startLine = baseStartLine + i;
      const endLine = baseStartLine + Math.min(i + windowSize, lines.length) - 1;

      results.push({
        startLine,
        endLine: Math.max(startLine, endLine),
        content: slice.join('\n'),
      });

      if (i + windowSize >= lines.length) break;
    }

    return results;
  }
}

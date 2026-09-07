import { Injectable } from '@nestjs/common';
import {
  LanguageParser,
  ParseResult,
  ExtractedSymbol,
  ExtractedChunk,
} from './parser.interface';

@Injectable()
export class GenericParser implements LanguageParser {
  readonly language = 'Generic';

  canParse(): boolean {
    return true; // Catch-all fallback
  }

  parse(filePath: string, content: string): ParseResult {
    const lines = content.split(/\r?\n/);
    const symbols: ExtractedSymbol[] = [];
    const chunks: ExtractedChunk[] = [];

    const isMarkdown = filePath.toLowerCase().endsWith('.md') || filePath.toLowerCase().endsWith('.mdx');

    if (isMarkdown) {
      // Extract markdown headings as symbols
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        const headerMatch = line.match(/^(#{1,6})\s+(.+)/);
        if (headerMatch) {
          symbols.push({
            name: headerMatch[2],
            kind: 'type',
            startLine: i + 1,
            endLine: i + 1,
            isExported: true,
          });
        }
      }
    }

    // Sliding window chunking (50 lines per chunk with 5 lines overlap)
    const chunkSize = 50;
    const overlap = 5;

    for (let i = 0; i < lines.length; i += chunkSize - overlap) {
      const slice = lines.slice(i, i + chunkSize);
      const text = slice.join('\n');
      if (!text.trim()) continue;

      chunks.push({
        startLine: i + 1,
        endLine: Math.min(i + chunkSize, lines.length),
        content: text,
        chunkType: 'block',
        tokensCount: Math.ceil(text.length / 4),
      });

      if (i + chunkSize >= lines.length) break;
    }

    return {
      language: this.detectLanguageFromPath(filePath),
      symbols,
      dependencies: [],
      chunks,
    };
  }

  private detectLanguageFromPath(filePath: string): string {
    const lower = filePath.toLowerCase();
    if (lower.endsWith('.md') || lower.endsWith('.mdx')) return 'Markdown';
    if (lower.endsWith('.json')) return 'JSON';
    if (lower.endsWith('.yaml') || lower.endsWith('.yml')) return 'YAML';
    if (lower.endsWith('.sh') || lower.endsWith('.bash')) return 'Shell';
    if (lower.endsWith('.html') || lower.endsWith('.htm')) return 'HTML';
    if (lower.endsWith('.css')) return 'CSS';
    if (lower.endsWith('.go')) return 'Go';
    if (lower.endsWith('.rs')) return 'Rust';
    return 'Text';
  }
}

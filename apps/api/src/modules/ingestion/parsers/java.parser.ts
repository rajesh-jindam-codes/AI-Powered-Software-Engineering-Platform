import { Injectable } from '@nestjs/common';
import {
  LanguageParser,
  ParseResult,
  ExtractedSymbol,
  ExtractedDependency,
  ExtractedChunk,
} from './parser.interface';

@Injectable()
export class JavaParser implements LanguageParser {
  readonly language = 'Java';

  canParse(filePath: string, language?: string): boolean {
    if (language === 'Java') return true;
    return filePath.toLowerCase().endsWith('.java');
  }

  parse(filePath: string, content: string): ParseResult {
    const lines = content.split(/\r?\n/);
    const symbols: ExtractedSymbol[] = [];
    const dependencies: ExtractedDependency[] = [];
    const chunks: ExtractedChunk[] = [];

    // 1. Package & Imports
    this.extractImports(lines, dependencies);

    // 2. Class & Method Symbols & Chunks
    this.extractSymbolsAndChunks(lines, symbols, chunks);

    if (chunks.length === 0 && lines.length > 0) {
      chunks.push({
        startLine: 1,
        endLine: lines.length,
        content: content.slice(0, 4000),
        chunkType: 'module',
        tokensCount: Math.ceil(content.length / 4),
      });
    }

    return {
      language: 'Java',
      symbols,
      dependencies,
      chunks,
    };
  }

  private extractImports(lines: string[], dependencies: ExtractedDependency[]): void {
    const importRegex = /^import\s+(?:static\s+)?([A-Za-z0-9_.*]+);/;

    for (const line of lines) {
      const trimmed = line.trim();
      const match = trimmed.match(importRegex);
      if (match) {
        const pkg = match[1];
        const isInternal = !pkg.startsWith('java.') && !pkg.startsWith('javax.') && !pkg.startsWith('org.springframework.');
        dependencies.push({
          targetModule: pkg,
          dependencyType: isInternal ? 'internal' : 'external',
        });
      }
    }
  }

  private extractSymbolsAndChunks(
    lines: string[],
    symbols: ExtractedSymbol[],
    chunks: ExtractedChunk[],
  ): void {
    const classRegex = /^(?:public|protected|private|abstract|final|\s)*(?:class|interface|enum)\s+([A-Za-z0-9_]+)/;
    const methodRegex = /^(?:public|protected|private|static|final|synchronized|abstract|\s)*([A-Za-z0-9_<>[\],\s]+)\s+([A-Za-z0-9_]+)\s*\(([^)]*)\)\s*(?:throws\s+[^{]+)?\s*\{?/;

    let currentClassName = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('/*')) continue;

      // Class / Interface / Enum
      const classMatch = trimmed.match(classRegex);
      if (classMatch && !trimmed.includes(';') && (trimmed.includes('{') || lines[i + 1]?.includes('{'))) {
        const name = classMatch[1];
        currentClassName = name;
        const kind = trimmed.includes('interface ')
          ? 'interface'
          : trimmed.includes('enum ')
          ? 'enum'
          : 'class';
        const endLine = this.findBlockEnd(lines, i);
        const blockContent = lines.slice(i, endLine).join('\n');

        symbols.push({
          name,
          kind,
          startLine: i + 1,
          endLine,
          isExported: trimmed.includes('public '),
          signature: trimmed.split('{')[0].trim(),
        });

        chunks.push({
          startLine: i + 1,
          endLine,
          content: blockContent,
          chunkType: kind as any,
          symbolName: name,
          signature: trimmed.split('{')[0].trim(),
          tokensCount: Math.ceil(blockContent.length / 4),
        });
        continue;
      }

      // Method
      if (currentClassName && !trimmed.startsWith('@')) {
        const methodMatch = trimmed.match(methodRegex);
        if (methodMatch && !['if', 'for', 'while', 'switch', 'catch', 'return'].includes(methodMatch[2])) {
          const methodName = methodMatch[2];
          const endLine = this.findBlockEnd(lines, i);

          symbols.push({
            name: methodName,
            kind: 'method',
            containerName: currentClassName,
            startLine: i + 1,
            endLine,
            isExported: trimmed.includes('public '),
            signature: trimmed.split('{')[0].trim(),
          });
        }
      }
    }
  }

  private findBlockEnd(lines: string[], startIdx: number): number {
    let braceCount = 0;
    let foundOpen = false;

    for (let i = startIdx; i < lines.length; i++) {
      const line = lines[i];
      for (let c = 0; c < line.length; c++) {
        if (line[c] === '{') {
          braceCount++;
          foundOpen = true;
        } else if (line[c] === '}') {
          braceCount--;
        }
      }
      if (foundOpen && braceCount <= 0) {
        return i + 1;
      }
    }
    return lines.length;
  }
}

import { Injectable } from '@nestjs/common';
import {
  LanguageParser,
  ParseResult,
  ExtractedSymbol,
  ExtractedDependency,
  ExtractedChunk,
} from './parser.interface';

@Injectable()
export class PythonParser implements LanguageParser {
  readonly language = 'Python';

  canParse(filePath: string, language?: string): boolean {
    if (language === 'Python') return true;
    const lower = filePath.toLowerCase();
    return lower.endsWith('.py') || lower.endsWith('.pyw');
  }

  parse(filePath: string, content: string): ParseResult {
    const lines = content.split(/\r?\n/);
    const symbols: ExtractedSymbol[] = [];
    const dependencies: ExtractedDependency[] = [];
    const chunks: ExtractedChunk[] = [];

    // 1. Imports
    this.extractImports(lines, dependencies);

    // 2. Symbols & Chunks
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
      language: 'Python',
      symbols,
      dependencies,
      chunks,
    };
  }

  private extractImports(lines: string[], dependencies: ExtractedDependency[]): void {
    const fromImportRegex = /^from\s+([.\w]+)\s+import\s+([*\w\s,()]+)/;
    const plainImportRegex = /^import\s+([\w\s,.]+)/;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('import ') && !trimmed.startsWith('from ')) continue;

      const fromMatch = trimmed.match(fromImportRegex);
      if (fromMatch) {
        const moduleName = fromMatch[1];
        const rawSymbols = fromMatch[2].replace(/[()]/g, '');
        const importedSymbols = rawSymbols
          .split(',')
          .map((s) => s.trim().split(' as ')[0].trim())
          .filter(Boolean);

        const isInternal = moduleName.startsWith('.');
        dependencies.push({
          targetModule: moduleName,
          dependencyType: isInternal ? 'internal' : 'external',
          importedSymbols,
        });
        continue;
      }

      const plainMatch = trimmed.match(plainImportRegex);
      if (plainMatch) {
        const modules = plainMatch[1].split(',').map((m) => m.trim().split(' as ')[0].trim());
        for (const mod of modules) {
          if (!mod) continue;
          dependencies.push({
            targetModule: mod,
            dependencyType: mod.startsWith('.') ? 'internal' : 'external',
          });
        }
      }
    }
  }

  private extractSymbolsAndChunks(
    lines: string[],
    symbols: ExtractedSymbol[],
    chunks: ExtractedChunk[],
  ): void {
    const classRegex = /^class\s+([A-Za-z0-9_]+)(?:\(([^)]*)\))?:/;
    const defRegex = /^(?:async\s+)?def\s+([A-Za-z0-9_]+)\s*\(([^)]*)\)(?:\s*->\s*[^:]+)?:/;

    // Find base indentation across non-empty lines
    let baseIndent = 0;
    for (const line of lines) {
      if (line.trim().length > 0) {
        const indent = line.length - line.trimStart().length;
        if (line.trim().startsWith('class ') || line.trim().startsWith('def ') || line.trim().startsWith('import ') || line.trim().startsWith('from ')) {
          baseIndent = indent;
          break;
        }
      }
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      const indent = line.length - line.trimStart().length;

      // Class definition
      const classMatch = trimmed.match(classRegex);
      if (classMatch && indent <= baseIndent) {
        const className = classMatch[1];
        const endLine = this.findPythonBlockEnd(lines, i, indent);
        const blockContent = lines.slice(i, endLine).join('\n');
        const docstring = this.extractDocstring(lines, i + 1);

        symbols.push({
          name: className,
          kind: 'class',
          startLine: i + 1,
          endLine,
          signature: trimmed,
          docstring,
          isExported: true,
        });

        chunks.push({
          startLine: i + 1,
          endLine,
          content: blockContent,
          chunkType: 'class',
          symbolName: className,
          signature: trimmed,
          tokensCount: Math.ceil(blockContent.length / 4),
        });

        // Extract class methods
        this.extractMethods(lines, i + 1, endLine - 1, className, symbols);
        continue;
      }

      // Top-level function
      const defMatch = trimmed.match(defRegex);
      if (defMatch && indent <= baseIndent) {
        const funcName = defMatch[1];
        const endLine = this.findPythonBlockEnd(lines, i, indent);
        const blockContent = lines.slice(i, endLine).join('\n');
        const docstring = this.extractDocstring(lines, i + 1);

        symbols.push({
          name: funcName,
          kind: 'function',
          startLine: i + 1,
          endLine,
          signature: trimmed,
          docstring,
          isExported: !funcName.startsWith('_'),
        });

        chunks.push({
          startLine: i + 1,
          endLine,
          content: blockContent,
          chunkType: 'function',
          symbolName: funcName,
          signature: trimmed,
          tokensCount: Math.ceil(blockContent.length / 4),
        });
      }
    }
  }

  private extractMethods(
    lines: string[],
    startIdx: number,
    endIdx: number,
    className: string,
    symbols: ExtractedSymbol[],
  ): void {
    const methodRegex = /^(?:async\s+)?def\s+([A-Za-z0-9_]+)\s*\(([^)]*)\)(?:\s*->\s*[^:]+)?:/;

    for (let i = startIdx; i <= endIdx && i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      const indent = line.length - line.trimStart().length;

      const match = trimmed.match(methodRegex);
      if (match && indent > 0) {
        const methodName = match[1];
        const endLine = this.findPythonBlockEnd(lines, i, indent);
        const docstring = this.extractDocstring(lines, i + 1);

        symbols.push({
          name: methodName,
          kind: 'method',
          containerName: className,
          startLine: i + 1,
          endLine,
          signature: trimmed,
          docstring,
          isExported: !methodName.startsWith('_'),
        });
      }
    }
  }

  private findPythonBlockEnd(lines: string[], startIdx: number, baseIndent: number): number {
    for (let i = startIdx + 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim() || line.trim().startsWith('#')) continue;

      const currentIndent = line.length - line.trimStart().length;
      if (currentIndent <= baseIndent) {
        return i;
      }
    }
    return lines.length;
  }

  private extractDocstring(lines: string[], nextLineIdx: number): string | undefined {
    if (nextLineIdx >= lines.length) return undefined;
    const trimmed = lines[nextLineIdx].trim();
    if (trimmed.startsWith('"""') || trimmed.startsWith("'''")) {
      const quote = trimmed.slice(0, 3);
      if (trimmed.endsWith(quote) && trimmed.length > 6) {
        return trimmed.slice(3, -3).trim();
      }
      return trimmed.slice(3).trim();
    }
    return undefined;
  }
}

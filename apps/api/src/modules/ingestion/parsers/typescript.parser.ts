import { Injectable } from '@nestjs/common';
import {
  LanguageParser,
  ParseResult,
  ExtractedSymbol,
  ExtractedDependency,
  ExtractedChunk,
} from './parser.interface';

@Injectable()
export class TypeScriptParser implements LanguageParser {
  readonly language = 'TypeScript';

  canParse(filePath: string, language?: string): boolean {
    if (language === 'TypeScript' || language === 'JavaScript') return true;
    const lower = filePath.toLowerCase();
    return (
      lower.endsWith('.ts') ||
      lower.endsWith('.tsx') ||
      lower.endsWith('.js') ||
      lower.endsWith('.jsx') ||
      lower.endsWith('.mjs') ||
      lower.endsWith('.cjs')
    );
  }

  parse(filePath: string, content: string): ParseResult {
    const lines = content.split(/\r?\n/);
    const symbols: ExtractedSymbol[] = [];
    const dependencies: ExtractedDependency[] = [];
    const chunks: ExtractedChunk[] = [];

    // 1. Extract Imports & Dependencies
    this.extractImports(lines, dependencies);

    // 2. Extract AST Symbols & Boundaries
    this.extractSymbolsAndChunks(lines, symbols, chunks);

    // 3. Fallback if no specific chunks were generated (e.g. flat script)
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
      language: filePath.endsWith('.js') || filePath.endsWith('.jsx') ? 'JavaScript' : 'TypeScript',
      symbols,
      dependencies,
      chunks,
    };
  }

  private extractImports(lines: string[], dependencies: ExtractedDependency[]): void {
    const importRegex = /import\s+(?:([\w*\s{},]+)\s+from\s+)?['"]([^'"]+)['"]/g;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('import ') && !trimmed.startsWith('import(')) continue;

      let match: RegExpExecArray | null;
      while ((match = importRegex.exec(trimmed)) !== null) {
        const rawImported = match[1];
        const moduleSpecifier = match[2];

        const isInternal =
          moduleSpecifier.startsWith('.') ||
          moduleSpecifier.startsWith('@/') ||
          moduleSpecifier.startsWith('~/');

        const importedSymbols: string[] = [];
        if (rawImported) {
          rawImported
            .replace(/[{}]/g, '')
            .split(',')
            .map((s) => s.trim().split(' as ')[0].trim())
            .filter(Boolean)
            .forEach((s) => importedSymbols.push(s));
        }

        dependencies.push({
          targetModule: moduleSpecifier,
          dependencyType: isInternal ? 'internal' : 'external',
          importedSymbols: importedSymbols.length > 0 ? importedSymbols : undefined,
        });
      }
    }
  }

  private extractSymbolsAndChunks(
    lines: string[],
    symbols: ExtractedSymbol[],
    chunks: ExtractedChunk[],
  ): void {
    const classRegex = /^(?:export\s+)?(?:abstract\s+)?class\s+([A-Za-z0-9_$]+)(?:\s+extends\s+([A-Za-z0-9_$]+))?(?:\s+implements\s+([A-Za-z0-9_$,\s]+))?/;
    const interfaceRegex = /^(?:export\s+)?interface\s+([A-Za-z0-9_$]+)/;
    const typeRegex = /^(?:export\s+)?type\s+([A-Za-z0-9_$]+)/;
    const enumRegex = /^(?:export\s+)?enum\s+([A-Za-z0-9_$]+)/;
    const functionRegex = /^(?:export\s+)?(?:async\s+)?function\s+([A-Za-z0-9_$]+)\s*\(([^)]*)\)/;
    const arrowFuncRegex = /^(?:export\s+)?(?:const|let|var)\s+([A-Za-z0-9_$]+)\s*=\s*(?:async\s*)?\([^)]*\)\s*(?::\s*[^=]+)?\s*=>/;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      const lineNum = i + 1;
      const isExported = trimmed.startsWith('export ');

      // Classes
      const classMatch = trimmed.match(classRegex);
      if (classMatch) {
        const name = classMatch[1];
        const endLine = this.findBlockEnd(lines, i);
        const blockContent = lines.slice(i, endLine).join('\n');

        symbols.push({
          name,
          kind: 'class',
          startLine: lineNum,
          endLine,
          isExported,
          signature: trimmed.split('{')[0].trim(),
        });

        chunks.push({
          startLine: lineNum,
          endLine,
          content: blockContent,
          chunkType: 'class',
          symbolName: name,
          signature: trimmed.split('{')[0].trim(),
          tokensCount: Math.ceil(blockContent.length / 4),
        });

        // Scan methods inside class
        this.extractClassMethods(lines, i, endLine, name, symbols);
        continue;
      }

      // Interfaces
      const ifaceMatch = trimmed.match(interfaceRegex);
      if (ifaceMatch) {
        const name = ifaceMatch[1];
        const endLine = this.findBlockEnd(lines, i);
        const blockContent = lines.slice(i, endLine).join('\n');

        symbols.push({
          name,
          kind: 'interface',
          startLine: lineNum,
          endLine,
          isExported,
          signature: trimmed.split('{')[0].trim(),
        });

        chunks.push({
          startLine: lineNum,
          endLine,
          content: blockContent,
          chunkType: 'interface',
          symbolName: name,
          tokensCount: Math.ceil(blockContent.length / 4),
        });
        continue;
      }

      // Types
      const typeMatch = trimmed.match(typeRegex);
      if (typeMatch) {
        symbols.push({
          name: typeMatch[1],
          kind: 'type',
          startLine: lineNum,
          endLine: lineNum,
          isExported,
          signature: trimmed,
        });
        continue;
      }

      // Enums
      const enumMatch = trimmed.match(enumRegex);
      if (enumMatch) {
        const name = enumMatch[1];
        const endLine = this.findBlockEnd(lines, i);
        symbols.push({
          name,
          kind: 'enum',
          startLine: lineNum,
          endLine,
          isExported,
        });
        continue;
      }

      // Named Functions
      const funcMatch = trimmed.match(functionRegex);
      if (funcMatch) {
        const name = funcMatch[1];
        const endLine = this.findBlockEnd(lines, i);
        const blockContent = lines.slice(i, endLine).join('\n');

        symbols.push({
          name,
          kind: 'function',
          startLine: lineNum,
          endLine,
          isExported,
          signature: trimmed.split('{')[0].trim(),
        });

        chunks.push({
          startLine: lineNum,
          endLine,
          content: blockContent,
          chunkType: 'function',
          symbolName: name,
          signature: trimmed.split('{')[0].trim(),
          tokensCount: Math.ceil(blockContent.length / 4),
        });
        continue;
      }

      // Arrow Functions
      const arrowMatch = trimmed.match(arrowFuncRegex);
      if (arrowMatch) {
        const name = arrowMatch[1];
        const endLine = this.findBlockEnd(lines, i);
        const blockContent = lines.slice(i, endLine).join('\n');

        symbols.push({
          name,
          kind: 'function',
          startLine: lineNum,
          endLine,
          isExported,
          signature: trimmed.split('{')[0].trim(),
        });

        chunks.push({
          startLine: lineNum,
          endLine,
          content: blockContent,
          chunkType: 'function',
          symbolName: name,
          tokensCount: Math.ceil(blockContent.length / 4),
        });
      }
    }
  }

  private extractClassMethods(
    lines: string[],
    startIdx: number,
    endIdx: number,
    className: string,
    symbols: ExtractedSymbol[],
  ): void {
    const methodRegex = /(?:public|private|protected|async|static|\s)*([A-Za-z0-9_$]+)\s*\(([^)]*)\)\s*(?::\s*[^;{]+)?\s*\{/g;
    const singleLineMethodRegex = /^(?:public|private|protected|async|static|\s)*([A-Za-z0-9_$]+)\s*\(([^)]*)\)\s*(?::\s*[^;{]+)?\s*\{?/;

    // If single-line class
    if (startIdx === endIdx - 1) {
      const fullClassLine = lines[startIdx];
      const bodyStart = fullClassLine.indexOf('{');
      const bodyEnd = fullClassLine.lastIndexOf('}');
      if (bodyStart !== -1 && bodyEnd > bodyStart) {
        const body = fullClassLine.slice(bodyStart + 1, bodyEnd);
        let match: RegExpExecArray | null;
        while ((match = methodRegex.exec(body)) !== null) {
          const methodName = match[1].trim();
          if (methodName && !['if', 'for', 'while', 'switch', 'catch', 'constructor'].includes(methodName)) {
            symbols.push({
              name: methodName,
              kind: 'method',
              containerName: className,
              startLine: startIdx + 1,
              endLine: startIdx + 1,
              signature: `${methodName}(${match[2]})`,
            });
          }
        }
      }
      return;
    }

    for (let i = startIdx + 1; i < endIdx && i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line.startsWith('//') || line.startsWith('/*')) continue;
      if (line.startsWith('constructor') || line.startsWith('get ') || line.startsWith('set ')) continue;

      const match = line.match(singleLineMethodRegex);
      if (match && !['if', 'for', 'while', 'switch', 'catch', 'class'].includes(match[1])) {
        const methodName = match[1];
        const mEnd = this.findBlockEnd(lines, i);

        symbols.push({
          name: methodName,
          kind: 'method',
          containerName: className,
          startLine: i + 1,
          endLine: mEnd,
          signature: line.split('{')[0].trim(),
        });
      }
    }
  }

  private findBlockEnd(lines: string[], startIdx: number): number {
    let braceCount = 0;
    let foundOpen = false;

    for (let i = startIdx; i < lines.length; i++) {
      const line = lines[i];
      for (let c = 0; c < line.length; c++) {
        const char = line[c];
        if (char === '{') {
          braceCount++;
          foundOpen = true;
        } else if (char === '}') {
          braceCount--;
        }
      }

      if (foundOpen && braceCount <= 0) {
        return i + 1;
      }
    }

    return Math.min(startIdx + 20, lines.length);
  }
}

import { Injectable } from '@nestjs/common';
import {
  LanguageParser,
  ParseResult,
  ExtractedSymbol,
  ExtractedDependency,
  ExtractedChunk,
} from './parser.interface';

@Injectable()
export class SqlParser implements LanguageParser {
  readonly language = 'SQL';

  canParse(filePath: string, language?: string): boolean {
    if (language === 'SQL') return true;
    return filePath.toLowerCase().endsWith('.sql');
  }

  parse(filePath: string, content: string): ParseResult {
    const lines = content.split(/\r?\n/);
    const symbols: ExtractedSymbol[] = [];
    const dependencies: ExtractedDependency[] = [];
    const chunks: ExtractedChunk[] = [];

    const tableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:([a-zA-Z0-9_]+)\.)?([a-zA-Z0-9_]+)/i;
    const viewRegex = /CREATE\s+(?:OR\s+REPLACE\s+)?VIEW\s+(?:([a-zA-Z0-9_]+)\.)?([a-zA-Z0-9_]+)/i;
    const indexRegex = /CREATE\s+(?:UNIQUE\s+)?INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-zA-Z0-9_]+)\s+ON\s+([a-zA-Z0-9_.]+)/i;
    const funcRegex = /CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+([a-zA-Z0-9_.]+)\s*\(([^)]*)\)/i;
    const procRegex = /CREATE\s+(?:OR\s+REPLACE\s+)?PROCEDURE\s+([a-zA-Z0-9_.]+)\s*\(([^)]*)\)/i;
    const refRegex = /REFERENCES\s+([a-zA-Z0-9_.]+)/gi;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('--') || trimmed.startsWith('/*')) continue;

      // Table
      const tableMatch = trimmed.match(tableRegex);
      if (tableMatch) {
        const tableName = tableMatch[2];
        const endLine = this.findSemicolonEnd(lines, i);
        const blockContent = lines.slice(i, endLine).join('\n');

        symbols.push({
          name: tableName,
          kind: 'table',
          startLine: i + 1,
          endLine,
          isExported: true,
          signature: trimmed,
        });

        chunks.push({
          startLine: i + 1,
          endLine,
          content: blockContent,
          chunkType: 'block',
          symbolName: tableName,
          signature: trimmed,
          tokensCount: Math.ceil(blockContent.length / 4),
        });

        // Scan for foreign key dependencies
        let refMatch: RegExpExecArray | null;
        while ((refMatch = refRegex.exec(blockContent)) !== null) {
          const targetTable = refMatch[1].split('(')[0].trim();
          dependencies.push({
            targetModule: targetTable,
            dependencyType: 'internal',
          });
        }
        continue;
      }

      // View
      const viewMatch = trimmed.match(viewRegex);
      if (viewMatch) {
        const viewName = viewMatch[2];
        const endLine = this.findSemicolonEnd(lines, i);
        symbols.push({
          name: viewName,
          kind: 'view',
          startLine: i + 1,
          endLine,
          isExported: true,
          signature: trimmed,
        });
        continue;
      }

      // Index
      const indexMatch = trimmed.match(indexRegex);
      if (indexMatch) {
        const idxName = indexMatch[1];
        const onTable = indexMatch[2];
        symbols.push({
          name: idxName,
          kind: 'variable',
          containerName: onTable,
          startLine: i + 1,
          endLine: i + 1,
          isExported: false,
          signature: trimmed,
        });
        continue;
      }

      // Function
      const funcMatch = trimmed.match(funcRegex);
      if (funcMatch) {
        const funcName = funcMatch[1];
        const endLine = this.findSemicolonEnd(lines, i);
        symbols.push({
          name: funcName,
          kind: 'function',
          startLine: i + 1,
          endLine,
          isExported: true,
          signature: trimmed,
        });
        continue;
      }

      // Procedure
      const procMatch = trimmed.match(procRegex);
      if (procMatch) {
        const procName = procMatch[1];
        const endLine = this.findSemicolonEnd(lines, i);
        symbols.push({
          name: procName,
          kind: 'procedure',
          startLine: i + 1,
          endLine,
          isExported: true,
          signature: trimmed,
        });
      }
    }

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
      language: 'SQL',
      symbols,
      dependencies,
      chunks,
    };
  }

  private findSemicolonEnd(lines: string[], startIdx: number): number {
    for (let i = startIdx; i < lines.length; i++) {
      if (lines[i].includes(';')) {
        return i + 1;
      }
    }
    return Math.min(startIdx + 50, lines.length);
  }
}

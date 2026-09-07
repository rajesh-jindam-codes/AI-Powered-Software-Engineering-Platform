import { SymbolKind, ChunkType } from '@devflow/shared-types';

export interface ExtractedSymbol {
  name: string;
  kind: SymbolKind;
  containerName?: string;
  startLine: number;
  endLine: number;
  signature?: string;
  docstring?: string;
  isExported?: boolean;
}

export interface ExtractedDependency {
  targetModule: string;
  dependencyType: 'internal' | 'external';
  importedSymbols?: string[];
}

export interface ExtractedChunk {
  startLine: number;
  endLine: number;
  content: string;
  chunkType: ChunkType;
  symbolName?: string;
  parentScope?: string;
  signature?: string;
  tokensCount?: number;
}

export interface ParseResult {
  language: string;
  symbols: ExtractedSymbol[];
  dependencies: ExtractedDependency[];
  chunks: ExtractedChunk[];
}

export interface LanguageParser {
  readonly language: string;
  canParse(filePath: string, language?: string): boolean;
  parse(filePath: string, content: string): Promise<ParseResult> | ParseResult;
}

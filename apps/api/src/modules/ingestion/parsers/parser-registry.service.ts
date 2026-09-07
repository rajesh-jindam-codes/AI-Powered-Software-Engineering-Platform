import { Injectable } from '@nestjs/common';
import { LanguageParser, ParseResult } from './parser.interface';
import { TypeScriptParser } from './typescript.parser';
import { PythonParser } from './python.parser';
import { JavaParser } from './java.parser';
import { SqlParser } from './sql.parser';
import { GenericParser } from './generic.parser';

@Injectable()
export class ParserRegistryService {
  private readonly parsers: LanguageParser[] = [];
  private readonly fallbackParser: GenericParser;

  constructor(
    tsParser: TypeScriptParser,
    pyParser: PythonParser,
    javaParser: JavaParser,
    sqlParser: SqlParser,
    genericParser: GenericParser,
  ) {
    this.fallbackParser = genericParser;
    // Register parsers in priority order
    this.registerParser(tsParser);
    this.registerParser(pyParser);
    this.registerParser(javaParser);
    this.registerParser(sqlParser);
  }

  registerParser(parser: LanguageParser): void {
    this.parsers.push(parser);
  }

  getParser(filePath: string, language?: string): LanguageParser {
    for (const parser of this.parsers) {
      if (parser.canParse(filePath, language)) {
        return parser;
      }
    }
    return this.fallbackParser;
  }

  async parseFile(filePath: string, content: string, language?: string): Promise<ParseResult> {
    const parser = this.getParser(filePath, language);
    return parser.parse(filePath, content);
  }
}

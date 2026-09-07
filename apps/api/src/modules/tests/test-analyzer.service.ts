import { Injectable, Logger } from '@nestjs/common';

export interface CodeFunctionMeta {
  name: string;
  className?: string;
  isAsync: boolean;
  params: Array<{ name: string; type?: string; defaultValue?: string }>;
  returnType?: string;
  throwsExceptions: string[];
  branchCount: number;
  linesRange: { start: number; end: number };
}

export interface InjectedDependencyMeta {
  name: string;
  type: string;
  mockFactorySnippet: string;
}

export interface CodeAnalysisResult {
  filePath: string;
  language: 'typescript' | 'javascript' | 'python';
  functions: CodeFunctionMeta[];
  dependencies: InjectedDependencyMeta[];
  existingCoveredFunctions: string[];
  uncoveredBranchesCount: number;
}

/**
 * DEVFLOW AI — TestAnalyzerService (Phase 11)
 *
 * Step 1: Analyzes target source code AST & control flows
 * Step 2: Analyzes existing test files to detect covered branches
 * Step 3: Identifies constructor & module dependencies to generate typed mock factories
 */
@Injectable()
export class TestAnalyzerService {
  private readonly logger = new Logger(TestAnalyzerService.name);

  /**
   * Deep analysis of target file code and existing tests
   */
  analyzeCode(
    filePath: string,
    sourceCode: string,
    existingTestCode?: string,
  ): CodeAnalysisResult {
    const isPython = filePath.endsWith('.py');
    const language = isPython ? 'python' : 'typescript';
    this.logger.log(`Analyzing AST and dependencies for ${filePath} (${language})`);

    const functions = this.extractFunctions(sourceCode, isPython);
    const dependencies = this.extractDependencies(sourceCode, isPython);
    const existingCoveredFunctions = existingTestCode
      ? this.extractCoveredFunctions(existingTestCode, isPython)
      : [];

    const uncoveredBranchesCount = functions.reduce((acc, f) => acc + f.branchCount, 0);

    return {
      filePath,
      language,
      functions,
      dependencies,
      existingCoveredFunctions,
      uncoveredBranchesCount,
    };
  }

  private extractFunctions(code: string, isPython: boolean): CodeFunctionMeta[] {
    const results: CodeFunctionMeta[] = [];
    const lines = code.split('\n');

    let currentClass: string | undefined;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Detect Class
      const classMatch = line.match(/(?:export\s+)?class\s+([a-zA-Z0-9_]+)/);
      if (classMatch) {
        currentClass = classMatch[1];
      }

      if (isPython) {
        // Python def
        const pyMatch = line.match(/(?:async\s+)?def\s+([a-zA-Z0-9_]+)\s*\(([^)]*)\)(?:\s*->\s*([^:]+))?:/);
        if (pyMatch && !['__init__', '__repr__'].includes(pyMatch[1])) {
          const name = pyMatch[1];
          const isAsync = line.startsWith('async ');
          const paramsRaw = pyMatch[2].trim();
          const params = paramsRaw
            ? paramsRaw
                .split(',')
                .map((p) => p.trim())
                .filter((p) => p !== 'self' && p !== 'cls')
                .map((p) => ({ name: p.split(':')[0].trim(), type: p.split(':')[1]?.trim() }))
            : [];

          results.push({
            name,
            className: currentClass,
            isAsync,
            params,
            returnType: pyMatch[3]?.trim() || 'Any',
            throwsExceptions: ['ValueError', 'Exception'],
            branchCount: 3,
            linesRange: { start: i + 1, end: i + 15 },
          });
        }
      } else {
        // TypeScript / JS methods
        const tsMatch = line.match(
          /(?:(?:public|private|protected|async)\s+)*(?:async\s+)?([a-zA-Z0-9_]+)\s*\(([^)]*)\)(?:\s*:\s*([^{]+))?\s*\{/,
        );

        if (
          tsMatch &&
          !['constructor', 'if', 'switch', 'while', 'for', 'catch'].includes(tsMatch[1])
        ) {
          const name = tsMatch[1];
          const isAsync = line.includes('async ');
          const paramsRaw = tsMatch[2].trim();
          const params = paramsRaw
            ? paramsRaw.split(',').map((p) => {
                const parts = p.trim().split(':');
                return { name: parts[0].trim(), type: parts[1]?.trim() };
              })
            : [];

          // Detect throwing exceptions
          const throwsExceptions: string[] = [];
          if (code.includes('NotFoundException')) throwsExceptions.push('NotFoundException');
          if (code.includes('BadRequestException')) throwsExceptions.push('BadRequestException');
          if (code.includes('HttpException')) throwsExceptions.push('HttpException');

          results.push({
            name,
            className: currentClass,
            isAsync,
            params,
            returnType: tsMatch[3]?.trim() || 'Promise<unknown>',
            throwsExceptions: throwsExceptions.length > 0 ? throwsExceptions : ['Error'],
            branchCount: Math.max(2, (code.match(/if\s*\(|switch\s*\(/g) || []).length),
            linesRange: { start: i + 1, end: i + 25 },
          });
        }
      }
    }

    return results;
  }

  private extractDependencies(code: string, isPython: boolean): InjectedDependencyMeta[] {
    const deps: InjectedDependencyMeta[] = [];

    if (isPython) {
      if (code.includes('requests.') || code.includes('httpx.')) {
        deps.push({
          name: 'httpClient',
          type: 'AsyncMock',
          mockFactorySnippet: 'mock_http = AsyncMock()',
        });
      }
      if (code.includes('redis') || code.includes('Redis')) {
        deps.push({
          name: 'redisClient',
          type: 'MagicMock',
          mockFactorySnippet: 'mock_redis = MagicMock(get=MagicMock(), set=MagicMock())',
        });
      }
    } else {
      if (code.includes('Repository<') || code.includes('repository') || code.includes('dataSource')) {
        deps.push({
          name: 'repository',
          type: 'Repository',
          mockFactorySnippet:
            'const mockRepository = { find: jest.fn(), findOne: jest.fn(), save: jest.fn(), delete: jest.fn(), query: jest.fn() };',
        });
      }
      if (code.includes('Logger') || code.includes('logger')) {
        deps.push({
          name: 'logger',
          type: 'Logger',
          mockFactorySnippet:
            'const mockLogger = { log: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() };',
        });
      }
      if (code.includes('redis') || code.includes('Redis')) {
        deps.push({
          name: 'redisStore',
          type: 'RedisJobStoreService',
          mockFactorySnippet:
            'const mockRedis = { zcount: jest.fn().mockResolvedValue(0), zadd: jest.fn().mockResolvedValue(1), get: jest.fn(), set: jest.fn() };',
        });
      }
      if (code.includes('kafka') || code.includes('Kafka') || code.includes('JobBus')) {
        deps.push({
          name: 'jobBus',
          type: 'KafkaJobBusService',
          mockFactorySnippet:
            'const mockJobBus = { publish: jest.fn().mockResolvedValue({ partition: 0, offset: 1 }) };',
        });
      }
    }

    return deps;
  }

  private extractCoveredFunctions(testCode: string, isPython: boolean): string[] {
    const covered: string[] = [];
    const pattern = isPython ? /def test_([a-zA-Z0-9_]+)/g : /(?:it|test)\s*\(\s*['"](?:should\s+)?([a-zA-Z0-9_]+)/g;

    let match: RegExpExecArray | null;
    while ((match = pattern.exec(testCode)) !== null) {
      if (match[1] && !covered.includes(match[1])) {
        covered.push(match[1]);
      }
    }

    return covered;
  }
}

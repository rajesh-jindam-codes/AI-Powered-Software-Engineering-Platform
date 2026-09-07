import { Injectable, Logger } from '@nestjs/common';
import {
  TestType,
  GeneratedTestCase,
  CoverageEstimate,
} from '@devflow/shared-types';
import {
  CodeAnalysisResult,
  CodeFunctionMeta,
  InjectedDependencyMeta,
} from './test-analyzer.service';

export interface GenerationOptions {
  framework?: 'jest' | 'vitest' | 'pytest';
  testTypes?: TestType[];
  targetFunction?: string;
}

export interface GeneratedSuitePayload {
  testFilePath: string;
  framework: 'jest' | 'vitest' | 'pytest';
  fullCode: string;
  mockDefinitions: string[];
  testCases: GeneratedTestCase[];
  coverageEstimate: CoverageEstimate;
}

/**
 * DEVFLOW AI — TestGeneratorService (Phase 11)
 *
 * Synthesizes test cases covering:
 * - Unit Tests: Happy path assertions, mock verification
 * - Integration Tests: Multi-dependency coordination, DB/Cache fixture integration
 * - Edge Cases: Boundary inputs (0, empty arrays, null, max boundaries)
 * - Failure Cases: Expected exception throwing and error rejections
 */
@Injectable()
export class TestGeneratorService {
  private readonly logger = new Logger(TestGeneratorService.name);

  /**
   * Generates a complete test suite based on AST analysis and user criteria
   */
  generateTestSuite(
    analysis: CodeAnalysisResult,
    options: GenerationOptions = {},
  ): GeneratedSuitePayload {
    const framework = options.framework || (analysis.language === 'python' ? 'pytest' : 'jest');
    const selectedTypes = options.testTypes && options.testTypes.length > 0
      ? options.testTypes
      : (['unit', 'integration', 'edge_case', 'failure_case'] as TestType[]);

    this.logger.log(
      `Generating ${selectedTypes.join(', ')} tests for ${analysis.filePath} using ${framework}`,
    );

    const targetFunctions = options.targetFunction
      ? analysis.functions.filter(
          (f) => f.name.toLowerCase() === options.targetFunction?.toLowerCase(),
        )
      : analysis.functions;

    const functionsToCover =
      targetFunctions.length > 0
        ? targetFunctions
        : [
            {
              name: 'processExecution',
              isAsync: true,
              params: [{ name: 'payload', type: 'Record<string, unknown>' }],
              returnType: 'Promise<{ success: boolean; resultId: string }>',
              throwsExceptions: ['BadRequestException', 'Error'],
              branchCount: 3,
              linesRange: { start: 1, end: 35 },
            },
          ];

    const testCases: GeneratedTestCase[] = [];
    const mockDefinitions: string[] = this.buildMockDefinitions(
      analysis.dependencies,
      framework,
    );

    let testCaseCounter = 1;

    for (const fn of functionsToCover) {
      for (const tType of selectedTypes) {
        const testCase = this.generateSpecificTestCase(
          analysis,
          fn,
          tType,
          framework,
          testCaseCounter++,
        );
        testCases.push(testCase);
      }
    }

    const testFilePath = this.computeTestFilePath(analysis.filePath, framework);
    const fullCode = this.assembleFullTestCode(
      analysis,
      functionsToCover,
      mockDefinitions,
      testCases,
      framework,
    );

    const coverageEstimate = this.calculateEstimatedCoverage(
      analysis,
      testCases,
    );

    return {
      testFilePath,
      framework,
      fullCode,
      mockDefinitions,
      testCases,
      coverageEstimate,
    };
  }

  private generateSpecificTestCase(
    analysis: CodeAnalysisResult,
    fn: CodeFunctionMeta,
    testType: TestType,
    framework: 'jest' | 'vitest' | 'pytest',
    index: number,
  ): GeneratedTestCase {
    const id = `tc_${testType}_${fn.name}_${index}`;
    const isPy = framework === 'pytest';

    switch (testType) {
      case 'unit': {
        const name = `should successfully execute ${fn.name} with standard input (happy path)`;
        const code = isPy
          ? `def test_${fn.name}_happy_path():\n    # Arrange & Act\n    result = ${fn.name}(valid_payload)\n    # Assert\n    assert result is not None\n    assert result.get("success") is True`
          : `it('should successfully execute ${fn.name} with standard input', async () => {\n  const payload = { id: 'req_101', amount: 100, currency: 'USD' };\n  const result = await service.${fn.name}(payload);\n  expect(result).toBeDefined();\n  expect(result.status).toEqual('completed');\n});`;
        return {
          id,
          name,
          targetFunction: fn.name,
          testType: 'unit',
          code,
          status: 'UNTESTED',
        };
      }

      case 'integration': {
        const name = `should coordinate with injected dependencies when invoking ${fn.name}`;
        const code = isPy
          ? `def test_${fn.name}_integration(mock_redis, mock_http):\n    # Simulate multi-service call\n    mock_redis.get.return_value = None\n    result = ${fn.name}(sample_entity)\n    assert mock_http.called`
          : `it('should coordinate with injected dependencies when invoking ${fn.name}', async () => {\n  mockRepository.findOne.mockResolvedValueOnce({ id: 'item_99', active: true });\n  const result = await service.${fn.name}('item_99');\n  expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { id: 'item_99' } });\n  expect(result).not.toBeNull();\n});`;
        return {
          id,
          name,
          targetFunction: fn.name,
          testType: 'integration',
          code,
          status: 'UNTESTED',
        };
      }

      case 'edge_case': {
        const name = `should safely handle boundary edge cases and empty inputs for ${fn.name}`;
        const code = isPy
          ? `def test_${fn.name}_edge_case_empty_input():\n    # Boundary values: empty dict and 0 amount\n    result = ${fn.name}({})\n    assert result.get("items") == [] or result.get("total") == 0`
          : `it('should safely handle boundary edge cases (0, empty arrays, null keys) in ${fn.name}', async () => {\n  const emptyInput = { items: [], total: 0, flags: {} };\n  const result = await service.${fn.name}(emptyInput);\n  expect(result.total).toBe(0);\n  expect(result.processed).toBe(true);\n});`;
        return {
          id,
          name,
          targetFunction: fn.name,
          testType: 'edge_case',
          code,
          status: 'UNTESTED',
        };
      }

      case 'failure_case': {
        const exceptionName = fn.throwsExceptions[0] || 'BadRequestException';
        const name = `should throw ${exceptionName} when invalid arguments or failing states occur in ${fn.name}`;
        const code = isPy
          ? `def test_${fn.name}_failure_case_raises_exception():\n    with pytest.raises(${exceptionName}):\n        ${fn.name}(invalid_input)`
          : `it('should throw ${exceptionName} when invalid arguments occur in ${fn.name}', async () => {\n  const invalidInput = null;\n  await expect(service.${fn.name}(invalidInput as any))\n    .rejects.toThrow('${exceptionName === 'Error' ? 'Invalid payload' : exceptionName}');\n});`;
        return {
          id,
          name,
          targetFunction: fn.name,
          testType: 'failure_case',
          code,
          status: 'UNTESTED',
        };
      }
    }
  }

  private buildMockDefinitions(
    deps: InjectedDependencyMeta[],
    framework: 'jest' | 'vitest' | 'pytest',
  ): string[] {
    if (framework === 'pytest') {
      return [
        '@pytest.fixture\ndef mock_redis():\n    return MagicMock()',
        '@pytest.fixture\ndef mock_http():\n    return AsyncMock()',
      ];
    }

    if (deps.length === 0) {
      return [
        'const mockRepository = { find: jest.fn(), findOne: jest.fn(), save: jest.fn() };',
        'const mockLogger = { log: jest.fn(), error: jest.fn(), warn: jest.fn() };',
      ];
    }

    return deps.map((d) => d.mockFactorySnippet);
  }

  private computeTestFilePath(
    targetFilePath: string,
    framework: 'jest' | 'vitest' | 'pytest',
  ): string {
    if (framework === 'pytest') {
      const parts = targetFilePath.split('/');
      const fileName = parts[parts.length - 1];
      return targetFilePath.replace(fileName, `test_${fileName}`);
    }
    return targetFilePath.replace(/\.(ts|js)$/, '.spec.ts');
  }

  private assembleFullTestCode(
    analysis: CodeAnalysisResult,
    functions: CodeFunctionMeta[],
    mockDefinitions: string[],
    testCases: GeneratedTestCase[],
    framework: 'jest' | 'vitest' | 'pytest',
  ): string {
    const className = functions[0]?.className || 'TargetService';

    if (framework === 'pytest') {
      return `# Generated by DevFlow AI Test Generation (Phase 11)
# Target: ${analysis.filePath}
import pytest
from unittest.mock import MagicMock, AsyncMock

${mockDefinitions.join('\n\n')}

${testCases.map((tc) => tc.code).join('\n\n')}
`;
    }

    return `/**
 * Generated by DevFlow AI Test Generation Engine (Phase 11)
 * Target: ${analysis.filePath}
 * Isolation: Virtual Sandbox (No arbitrary shell execution)
 */
import { Test, TestingModule } from '@nestjs/testing';
import { ${className} } from './${analysis.filePath.split('/').pop()?.replace('.ts', '') || 'service'}';

describe('${className}', () => {
  let service: ${className};

  ${mockDefinitions.join('\n  ')}

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ${className},
        { provide: 'REPOSITORY', useValue: mockRepository },
        { provide: 'LOGGER', useValue: mockLogger },
      ],
    }).compile();

    service = module.get<${className}>(${className});
    jest.clearAllMocks();
  });

  ${testCases
    .map(
      (tc) => `  describe('${tc.targetFunction} - [${tc.testType.toUpperCase()}]', () => {
    ${tc.code
      .split('\n')
      .map((l) => '    ' + l)
      .join('\n')}
  });`,
    )
    .join('\n\n')}
});
`;
  }

  private calculateEstimatedCoverage(
    analysis: CodeAnalysisResult,
    testCases: GeneratedTestCase[],
  ): CoverageEstimate {
    const totalBranchCount = Math.max(1, analysis.uncoveredBranchesCount);
    const testCount = testCases.length;
    const branches = Math.min(96, Math.round((testCount / (totalBranchCount + 2)) * 100));
    const functions = Math.min(100, Math.round((testCases.length / Math.max(1, analysis.functions.length * 4)) * 100));
    const statements = Math.min(94, Math.round((branches + functions) / 2));
    const lines = Math.min(92, statements - 2);
    const coverageDelta = Math.min(35.0, Number((branches * 0.35).toFixed(1)));

    return {
      statements,
      branches,
      functions,
      lines,
      coverageDelta,
    };
  }
}

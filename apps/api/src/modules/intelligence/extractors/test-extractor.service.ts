import { Injectable, Logger } from '@nestjs/common';
import { TestSuiteSummary } from '@devflow/shared-types';

/**
 * DEVFLOW AI — TestExtractorService
 *
 * Scans test suites, assertions, and test-to-source mappings across
 * Jest, Pytest, and JUnit.
 */
@Injectable()
export class TestExtractorService {
  private readonly logger = new Logger(TestExtractorService.name);

  extractTestSuites(filePath: string, content: string): TestSuiteSummary[] {
    const suites: TestSuiteSummary[] = [];
    const lines = content.split('\n');

    const isTestFile =
      filePath.includes('.spec.') ||
      filePath.includes('.test.') ||
      filePath.startsWith('test_') ||
      filePath.includes('/tests/') ||
      filePath.includes('Test.java');

    if (!isTestFile) return [];

    let framework: 'jest' | 'pytest' | 'junit' | 'vitest' | 'generic' = 'generic';
    if (filePath.endsWith('.ts') || filePath.endsWith('.js') || filePath.endsWith('.tsx')) {
      framework = 'jest';
    } else if (filePath.endsWith('.py')) {
      framework = 'pytest';
    } else if (filePath.endsWith('.java')) {
      framework = 'junit';
    }

    let currentSuite = filePath.split('/').pop() || 'Test Suite';
    const testNames: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Jest describe('...')
      const describeMatch = line.match(/describe\s*\(\s*['"`]([^'"`]+)['"`]/);
      if (describeMatch) {
        currentSuite = describeMatch[1];
      }

      // Jest it('...') or test('...')
      const testMatch = line.match(/(?:it|test)\s*\(\s*['"`]([^'"`]+)['"`]/);
      if (testMatch) {
        testNames.push(testMatch[1]);
      }

      // Pytest def test_...
      const pyTestMatch = line.match(/^def\s+(test_[a-zA-Z0-9_]+)\s*\(/);
      if (pyTestMatch) {
        testNames.push(pyTestMatch[1].replace('test_', '').replace(/_/g, ' '));
      }

      // JUnit @Test
      if (line.includes('@Test')) {
        const nextLine = lines[i + 1]?.trim() || '';
        const javaFnMatch = nextLine.match(/void\s+([A-Za-z0-9_]+)\s*\(/);
        if (javaFnMatch) {
          testNames.push(javaFnMatch[1]);
        }
      }
    }

    // Determine target source file (e.g. src/auth/jwt.service.spec.ts -> src/auth/jwt.service.ts)
    const targetSource = filePath
      .replace(/\.spec\./, '.')
      .replace(/\.test\./, '.')
      .replace(/tests\//, 'src/')
      .replace(/test_/, '');

    suites.push({
      id: `suite_${filePath.replace(/[^a-zA-Z0-9]/g, '_')}`,
      filePath,
      framework,
      suiteName: currentSuite,
      testCasesCount: testNames.length,
      testNames,
      targetSourceFiles: [targetSource],
    });

    return suites;
  }
}

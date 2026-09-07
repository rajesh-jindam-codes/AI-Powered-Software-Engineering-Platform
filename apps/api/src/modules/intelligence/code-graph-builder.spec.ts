import { CodeGraphBuilderService } from './graph/code-graph-builder.service';

describe('CodeGraphBuilderService', () => {
  let graphBuilder: CodeGraphBuilderService;

  beforeEach(() => {
    graphBuilder = new CodeGraphBuilderService();
  });

  it('should build multi-layer directed graph with nodes and edges across files, symbols, APIs, and DB models', () => {
    const graph = graphBuilder.buildGraph({
      repositoryId: 'repo-100',
      files: [
        { filePath: 'src/auth/auth.service.ts', language: 'typescript' },
        { filePath: 'src/auth/auth.controller.ts', language: 'typescript' },
      ],
      symbols: [
        { name: 'AuthService', kind: 'class', filePath: 'src/auth/auth.service.ts', startLine: 1, endLine: 30 },
        { name: 'AuthController', kind: 'class', filePath: 'src/auth/auth.controller.ts', startLine: 1, endLine: 25 },
      ],
      dependencies: [
        { sourceFilePath: 'src/auth/auth.controller.ts', targetModule: 'src/auth/auth.service.ts', isInternal: true },
      ],
      apis: [
        {
          id: 'api_post_login',
          method: 'POST',
          path: '/api/v1/auth/login',
          handlerName: 'login',
          filePath: 'src/auth/auth.controller.ts',
          startLine: 10,
          endLine: 15,
          parameters: [],
          authGuards: [],
        },
      ],
      database: [
        {
          id: 'db_users',
          name: 'User',
          tableName: 'users',
          filePath: 'src/entities/user.entity.ts',
          startLine: 1,
          endLine: 20,
          primaryKey: 'id',
          fields: [],
          relations: [],
        },
      ],
      auth: [],
      tests: [
        {
          id: 'suite_auth',
          filePath: 'src/auth/auth.service.spec.ts',
          framework: 'jest',
          suiteName: 'AuthService',
          testCasesCount: 5,
          testNames: ['should login'],
          targetSourceFiles: ['src/auth/auth.service.ts'],
        },
      ],
    });

    expect(graph.metrics.totalNodes).toBeGreaterThanOrEqual(5);
    expect(graph.metrics.totalEdges).toBeGreaterThanOrEqual(3);
    expect(graph.metrics.nodeCountsByType.FILE).toBe(2);
    expect(graph.metrics.nodeCountsByType.API_ENDPOINT).toBe(1);
    expect(graph.metrics.nodeCountsByType.DB_MODEL).toBe(1);
    expect(graph.metrics.nodeCountsByType.TEST_SUITE).toBe(1);
    expect(graph.metrics.hasCycles).toBe(false);
  });

  it('should accurately detect circular dependencies in repository code graph', () => {
    const cyclicGraph = graphBuilder.buildGraph({
      repositoryId: 'repo-cyclic',
      files: [
        { filePath: 'src/module-a.ts', language: 'typescript' },
        { filePath: 'src/module-b.ts', language: 'typescript' },
      ],
      symbols: [],
      dependencies: [
        { sourceFilePath: 'src/module-a.ts', targetModule: 'src/module-b.ts', isInternal: true },
        { sourceFilePath: 'src/module-b.ts', targetModule: 'src/module-a.ts', isInternal: true }, // circular link
      ],
      apis: [],
      database: [],
      auth: [],
      tests: [],
    });

    expect(cyclicGraph.metrics.hasCycles).toBe(true);
  });
});

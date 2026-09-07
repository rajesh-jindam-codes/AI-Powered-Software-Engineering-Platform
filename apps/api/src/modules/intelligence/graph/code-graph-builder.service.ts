import { Injectable, Logger } from '@nestjs/common';
import {
  ApiEndpointSummary,
  AuthPatternSummary,
  CodeEdgeType,
  CodeGraph,
  CodeGraphEdge,
  CodeGraphNode,
  CodeNodeType,
  DbModelSummary,
  TestSuiteSummary,
} from '@devflow/shared-types';

export interface CodeGraphInput {
  repositoryId: string;
  files: Array<{ filePath: string; language: string }>;
  symbols: Array<{ name: string; kind: string; filePath: string; startLine: number; endLine: number }>;
  dependencies: Array<{ sourceFilePath: string; targetModule: string; isInternal: boolean }>;
  apis: ApiEndpointSummary[];
  database: DbModelSummary[];
  auth: AuthPatternSummary[];
  tests: TestSuiteSummary[];
}

@Injectable()
export class CodeGraphBuilderService {
  private readonly logger = new Logger(CodeGraphBuilderService.name);

  buildGraph(input: CodeGraphInput): CodeGraph {
    const nodes: CodeGraphNode[] = [];
    const edges: CodeGraphEdge[] = [];
    const nodeMap = new Map<string, CodeGraphNode>();

    const addNode = (node: CodeGraphNode) => {
      if (!nodeMap.has(node.id)) {
        nodeMap.set(node.id, node);
        nodes.push(node);
      }
    };

    const addEdge = (edge: CodeGraphEdge) => {
      const edgeKey = `${edge.sourceNodeId}->${edge.targetNodeId}:${edge.edgeType}`;
      if (!edges.some((e) => `${e.sourceNodeId}->${e.targetNodeId}:${e.edgeType}` === edgeKey)) {
        edges.push(edge);
      }
    };

    // 1. Add FILE nodes
    for (const file of input.files) {
      const fileId = `file:${file.filePath}`;
      addNode({
        id: fileId,
        repositoryId: input.repositoryId,
        nodeType: 'FILE',
        name: file.filePath.split('/').pop() || file.filePath,
        filePath: file.filePath,
        metadata: { language: file.language },
      });
    }

    // 2. Add Symbol nodes (CLASS, FUNCTION, INTERFACE) and DEFINES edges
    for (const sym of input.symbols) {
      const symType: CodeNodeType =
        sym.kind === 'class' ? 'CLASS' : sym.kind === 'function' || sym.kind === 'method' ? 'FUNCTION' : 'INTERFACE';
      const symId = `sym:${sym.filePath}:${sym.name}`;
      addNode({
        id: symId,
        repositoryId: input.repositoryId,
        nodeType: symType,
        name: sym.name,
        filePath: sym.filePath,
        startLine: sym.startLine,
        endLine: sym.endLine,
      });

      const fileId = `file:${sym.filePath}`;
      if (nodeMap.has(fileId)) {
        addEdge({
          id: `edge:defines:${fileId}:${symId}`,
          repositoryId: input.repositoryId,
          sourceNodeId: fileId,
          targetNodeId: symId,
          edgeType: 'DEFINES',
          weight: 1.0,
        });
      }
    }

    // 3. Add IMPORTS edges between files
    for (const dep of input.dependencies) {
      const sourceFileId = `file:${dep.sourceFilePath}`;
      let targetFileId = `file:${dep.targetModule}`;

      // Resolve relative path if needed
      if (dep.isInternal) {
        for (const file of input.files) {
          if (file.filePath.includes(dep.targetModule.replace(/^[./]+/, ''))) {
            targetFileId = `file:${file.filePath}`;
            break;
          }
        }
      }

      if (nodeMap.has(sourceFileId) && nodeMap.has(targetFileId) && sourceFileId !== targetFileId) {
        addEdge({
          id: `edge:imports:${sourceFileId}:${targetFileId}`,
          repositoryId: input.repositoryId,
          sourceNodeId: sourceFileId,
          targetNodeId: targetFileId,
          edgeType: 'IMPORTS',
          weight: 1.0,
        });
      }
    }

    // 4. Add API_ENDPOINT nodes and PROTECTED_BY edges
    for (const api of input.apis) {
      const apiId = `api:${api.id}`;
      addNode({
        id: apiId,
        repositoryId: input.repositoryId,
        nodeType: 'API_ENDPOINT',
        name: `${api.method} ${api.path}`,
        filePath: api.filePath,
        startLine: api.startLine,
        endLine: api.endLine,
        metadata: { method: api.method, path: api.path, handler: api.handlerName },
      });

      const fileId = `file:${api.filePath}`;
      if (nodeMap.has(fileId)) {
        addEdge({
          id: `edge:defines:${fileId}:${apiId}`,
          repositoryId: input.repositoryId,
          sourceNodeId: fileId,
          targetNodeId: apiId,
          edgeType: 'DEFINES',
          weight: 1.0,
        });
      }
    }

    // 5. Add DB_MODEL nodes and ACCESSES_DB edges
    for (const db of input.database) {
      const dbId = `db:${db.id}`;
      addNode({
        id: dbId,
        repositoryId: input.repositoryId,
        nodeType: 'DB_MODEL',
        name: db.tableName,
        filePath: db.filePath,
        startLine: db.startLine,
        endLine: db.endLine,
        metadata: { primaryKey: db.primaryKey, fieldsCount: db.fields.length },
      });

      const fileId = `file:${db.filePath}`;
      if (nodeMap.has(fileId)) {
        addEdge({
          id: `edge:defines:${fileId}:${dbId}`,
          repositoryId: input.repositoryId,
          sourceNodeId: fileId,
          targetNodeId: dbId,
          edgeType: 'DEFINES',
          weight: 1.0,
        });
      }
    }

    // 6. Add TEST_SUITE nodes and TESTS edges
    for (const test of input.tests) {
      const testId = `test:${test.id}`;
      addNode({
        id: testId,
        repositoryId: input.repositoryId,
        nodeType: 'TEST_SUITE',
        name: test.suiteName,
        filePath: test.filePath,
        metadata: { testCasesCount: test.testCasesCount, framework: test.framework },
      });

      for (const target of test.targetSourceFiles) {
        const targetFileId = `file:${target}`;
        if (nodeMap.has(targetFileId)) {
          addEdge({
            id: `edge:tests:${testId}:${targetFileId}`,
            repositoryId: input.repositoryId,
            sourceNodeId: testId,
            targetNodeId: targetFileId,
            edgeType: 'TESTS',
            weight: 1.5,
          });
        }
      }
    }

    // Metrics computation: Count types, calculate in-degrees, detect cycles
    const nodeCountsByType: Record<CodeNodeType, number> = {
      FILE: 0,
      CLASS: 0,
      FUNCTION: 0,
      INTERFACE: 0,
      API_ENDPOINT: 0,
      DB_MODEL: 0,
      AUTH_GUARD: 0,
      CONFIG_SCHEMA: 0,
      TEST_SUITE: 0,
    };

    const edgeCountsByType: Record<CodeEdgeType, number> = {
      IMPORTS: 0,
      DEFINES: 0,
      CALLS: 0,
      EXTENDS: 0,
      IMPLEMENTS: 0,
      ACCESSES_DB: 0,
      PROTECTED_BY: 0,
      TESTS: 0,
    };

    const inDegrees = new Map<string, number>();
    for (const node of nodes) {
      if (nodeCountsByType[node.nodeType] !== undefined) {
        nodeCountsByType[node.nodeType]++;
      }
      inDegrees.set(node.id, 0);
    }

    for (const edge of edges) {
      if (edgeCountsByType[edge.edgeType] !== undefined) {
        edgeCountsByType[edge.edgeType]++;
      }
      inDegrees.set(edge.targetNodeId, (inDegrees.get(edge.targetNodeId) || 0) + 1);
    }

    // Central nodes calculation
    const centralNodes = nodes
      .map((node) => ({
        id: node.id,
        name: node.name,
        nodeType: node.nodeType,
        centralityScore: inDegrees.get(node.id) || 0,
      }))
      .sort((a, b) => b.centralityScore - a.centralityScore)
      .slice(0, 10);

    const hasCycles = this.detectCycles(nodes, edges);

    return {
      repositoryId: input.repositoryId,
      nodes,
      edges,
      metrics: {
        totalNodes: nodes.length,
        totalEdges: edges.length,
        nodeCountsByType,
        edgeCountsByType,
        hasCycles,
        centralNodes,
      },
    };
  }

  // ==========================================
  // Circular Dependency Detection (DFS)
  // ==========================================
  private detectCycles(nodes: CodeGraphNode[], edges: CodeGraphEdge[]): boolean {
    const adj = new Map<string, string[]>();
    for (const node of nodes) {
      adj.set(node.id, []);
    }
    for (const edge of edges) {
      if (edge.edgeType === 'IMPORTS') {
        const list = adj.get(edge.sourceNodeId) || [];
        list.push(edge.targetNodeId);
        adj.set(edge.sourceNodeId, list);
      }
    }

    const visited = new Set<string>();
    const recStack = new Set<string>();

    const dfs = (nodeId: string): boolean => {
      visited.add(nodeId);
      recStack.add(nodeId);

      const neighbors = adj.get(nodeId) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          if (dfs(neighbor)) return true;
        } else if (recStack.has(neighbor)) {
          return true; // Cycle detected
        }
      }

      recStack.delete(nodeId);
      return false;
    };

    for (const node of nodes) {
      if (!visited.has(node.id)) {
        if (dfs(node.id)) return true;
      }
    }

    return false;
  }
}

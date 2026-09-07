import { CodeSearchService } from './search/code-search.service';
import { SemanticContextChunkerService } from './chunking/semantic-context-chunker.service';

describe('CodeSearchService & SemanticContextChunkerService', () => {
  let searchService: CodeSearchService;
  let chunker: SemanticContextChunkerService;

  beforeEach(() => {
    searchService = new CodeSearchService();
    chunker = new SemanticContextChunkerService();
  });

  describe('SemanticContextChunkerService', () => {
    it('should slice code into AST-bounded chunks preserving repository, branch, commit, and context headers', () => {
      const code = `
export class TokenService {
  generateAccessToken(userId: string): string {
    return 'access_token_val';
  }

  generateRefreshToken(userId: string): string {
    return 'refresh_token_val';
  }
}
      `;

      const chunks = chunker.chunkFile({
        repositoryId: 'repo-abc',
        repositoryName: 'DevFlow',
        branch: 'main',
        commitSha: 'a1b2c3d4e5f6',
        filePath: 'src/auth/token.service.ts',
        language: 'typescript',
        content: code,
        symbols: [
          { name: 'TokenService', kind: 'class', startLine: 2, endLine: 10 },
          { name: 'generateAccessToken', kind: 'method', startLine: 3, endLine: 5, containerName: 'TokenService' },
          { name: 'generateRefreshToken', kind: 'method', startLine: 7, endLine: 9, containerName: 'TokenService' },
        ],
      });

      expect(chunks.length).toBe(3);
      expect(chunks[0].repositoryName).toBe('DevFlow');
      expect(chunks[0].branch).toBe('main');
      expect(chunks[0].commitSha).toBe('a1b2c3d4e5f6');
      expect(chunks[0].contextHeader).toContain('// Repository: DevFlow');
      expect(chunks[0].enrichedContent).toContain('// File: src/auth/token.service.ts');
      expect(chunks[1].symbolBreadcrumb).toBe('DevFlow > src/auth/token.service.ts > TokenService > generateAccessToken');
    });
  });

  describe('CodeSearchService', () => {
    it('should support keyword, symbol, and file searches with line highlighting', () => {
      const chunks = chunker.chunkFile({
        repositoryId: 'repo-1',
        repositoryName: 'DevFlow',
        branch: 'main',
        commitSha: '12345678',
        filePath: 'src/modules/search.service.ts',
        language: 'typescript',
        content: `
export class SearchService {
  async executeHybridSearch(query: string) {
    // Perform RRF fusion
    return [];
  }
}
        `,
        symbols: [
          { name: 'SearchService', kind: 'class', startLine: 2, endLine: 8 },
          { name: 'executeHybridSearch', kind: 'method', startLine: 3, endLine: 6, containerName: 'SearchService' },
        ],
      });

      searchService.indexChunks('repo-1', chunks);

      // 1. Keyword search
      const keywordRes = searchService.search({
        repositoryId: 'repo-1',
        query: 'HybridSearch',
        mode: 'keyword',
      });
      expect(keywordRes.total).toBeGreaterThan(0);
      expect(keywordRes.results[0].filePath).toBe('src/modules/search.service.ts');

      // 2. Symbol search
      const symbolRes = searchService.search({
        repositoryId: 'repo-1',
        query: 'SearchService',
        mode: 'symbol',
      });
      expect(symbolRes.total).toBeGreaterThan(0);
      expect(symbolRes.results[0].symbolName).toBe('SearchService');

      // 3. File search
      const fileRes = searchService.search({
        repositoryId: 'repo-1',
        query: 'search.service',
        mode: 'file',
      });
      expect(fileRes.total).toBeGreaterThan(0);
    });
  });
});

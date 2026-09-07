import { Test, TestingModule } from '@nestjs/testing';
import { IngestionWorkerService } from './ingestion-worker.service';
import { IngestionRepository } from './ingestion.repository';
import { FileFilterService } from './filtering/file-filter.service';
import { ParserRegistryService } from './parsers/parser-registry.service';
import { TypeScriptParser } from './parsers/typescript.parser';
import { PythonParser } from './parsers/python.parser';
import { JavaParser } from './parsers/java.parser';
import { SqlParser } from './parsers/sql.parser';
import { GenericParser } from './parsers/generic.parser';
import { CodeChunkerService } from './chunking/code-chunker.service';
import { GitHubRepository } from '../github/github.repository';
import { AuditService } from '../audit/audit.service';

describe('Repository Ingestion Engine', () => {
  let workerService: IngestionWorkerService;
  let ingestionRepo: IngestionRepository;
  let fileFilterService: FileFilterService;
  let parserRegistry: ParserRegistryService;
  let githubRepo: GitHubRepository;

  const testRepoId = 'repo-test-101';
  const testWorkspaceId = 'ws-test-101';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IngestionWorkerService,
        IngestionRepository,
        FileFilterService,
        ParserRegistryService,
        TypeScriptParser,
        PythonParser,
        JavaParser,
        SqlParser,
        GenericParser,
        CodeChunkerService,
        GitHubRepository,
        {
          provide: AuditService,
          useValue: {
            record: jest.fn(),
            getLogs: jest.fn().mockResolvedValue([]),
          },
        },
      ],
    }).compile();

    workerService = module.get<IngestionWorkerService>(IngestionWorkerService);
    ingestionRepo = module.get<IngestionRepository>(IngestionRepository);
    fileFilterService = module.get<FileFilterService>(FileFilterService);
    parserRegistry = module.get<ParserRegistryService>(ParserRegistryService);
    githubRepo = module.get<GitHubRepository>(GitHubRepository);

    // Create test repository in GitHub repository store
    await githubRepo.createRepository({
      workspaceId: testWorkspaceId,
      githubRepoId: 'test-gh-repo-101',
      name: 'test-ingestion-repo',
      owner: 'devflow-ai',
      fullName: 'devflow-ai/test-ingestion-repo',
      defaultBranch: 'main',
      cloneUrl: 'https://github.com/devflow-ai/test-ingestion-repo.git',
      isPrivate: true,
      indexStatus: 'pending',
    });
  });

  describe('File Filter & Ignore Rules', () => {
    it('should ignore node_modules, .git, and dist folders', () => {
      expect(fileFilterService.shouldProcess('node_modules/express/index.js').process).toBe(false);
      expect(fileFilterService.shouldProcess('.git/HEAD').process).toBe(false);
      expect(fileFilterService.shouldProcess('dist/main.bundle.js').process).toBe(false);
      expect(fileFilterService.shouldProcess('coverage/lcov.info').process).toBe(false);
    });

    it('should reject secret files (.env, *.pem, *.key, id_rsa)', () => {
      expect(fileFilterService.shouldProcess('.env').isSecret).toBe(true);
      expect(fileFilterService.shouldProcess('.env.production').isSecret).toBe(true);
      expect(fileFilterService.shouldProcess('server.key').isSecret).toBe(true);
      expect(fileFilterService.shouldProcess('id_rsa').isSecret).toBe(true);
      expect(fileFilterService.shouldProcess('credentials.json').isSecret).toBe(true);
    });

    it('should reject binary files (.png, .zip, .exe, .wasm)', () => {
      expect(fileFilterService.shouldProcess('assets/logo.png').isBinary).toBe(true);
      expect(fileFilterService.shouldProcess('archive.zip').isBinary).toBe(true);
      expect(fileFilterService.shouldProcess('driver.bin').isBinary).toBe(true);
      expect(fileFilterService.shouldProcess('module.wasm').isBinary).toBe(true);
    });

    it('should process supported code files (TS, Python, Java, SQL)', () => {
      expect(fileFilterService.shouldProcess('src/index.ts').process).toBe(true);
      expect(fileFilterService.shouldProcess('models/agent.py').process).toBe(true);
      expect(fileFilterService.shouldProcess('src/Main.java').process).toBe(true);
      expect(fileFilterService.shouldProcess('db/schema.sql').process).toBe(true);
    });
  });

  describe('Multi-Language AST Parsing', () => {
    it('should parse TypeScript classes, methods, and imports', async () => {
      const code = `
        import { Injectable } from '@nestjs/common';
        import { Helper } from './utils';

        export interface UserConfig {
          theme: string;
        }

        export class UserService {
          public async findUser(id: string): Promise<any> {
            return { id };
          }
        }
      `;

      const result = await parserRegistry.parseFile('src/user.service.ts', code, 'TypeScript');
      expect(result.language).toBe('TypeScript');

      // Check symbols
      const userSvc = result.symbols.find((s) => s.name === 'UserService');
      expect(userSvc).toBeDefined();
      expect(userSvc?.kind).toBe('class');

      const findMethod = result.symbols.find((s) => s.name === 'findUser');
      expect(findMethod).toBeDefined();
      expect(findMethod?.kind).toBe('method');
      expect(findMethod?.containerName).toBe('UserService');

      // Check dependencies
      expect(result.dependencies.some((d) => d.targetModule === '@nestjs/common')).toBe(true);
      expect(result.dependencies.some((d) => d.targetModule === './utils')).toBe(true);

      // Check chunks
      expect(result.chunks.length).toBeGreaterThan(0);
      expect(result.chunks.some((c) => c.symbolName === 'UserService')).toBe(true);
    });

    it('should parse Python classes, functions, and imports', async () => {
      const code = `
        from fastapi import FastAPI
        import os

        class AgentPipeline:
            """Agent Pipeline orchestrator."""
            def __init__(self, name: str):
                self.name = name

            def run_step(self, task: str) -> bool:
                return True
      `;

      const result = await parserRegistry.parseFile('agents/pipeline.py', code, 'Python');
      expect(result.language).toBe('Python');

      const clsSym = result.symbols.find((s) => s.name === 'AgentPipeline');
      expect(clsSym).toBeDefined();
      expect(clsSym?.kind).toBe('class');
      expect(clsSym?.docstring).toBe('Agent Pipeline orchestrator.');

      const methodSym = result.symbols.find((s) => s.name === 'run_step');
      expect(methodSym).toBeDefined();
      expect(methodSym?.kind).toBe('method');
      expect(methodSym?.containerName).toBe('AgentPipeline');
    });

    it('should parse Java classes, interfaces, and methods', async () => {
      const code = `
        package com.devflow.app;
        import java.util.List;

        public class OrderProcessor implements ProcessorContract {
            public void process(List<String> items) {
                // process items
            }
        }
      `;

      const result = await parserRegistry.parseFile('src/OrderProcessor.java', code, 'Java');
      expect(result.language).toBe('Java');

      const cls = result.symbols.find((s) => s.name === 'OrderProcessor');
      expect(cls).toBeDefined();
      expect(cls?.kind).toBe('class');

      const method = result.symbols.find((s) => s.name === 'process');
      expect(method).toBeDefined();
      expect(method?.kind).toBe('method');
    });

    it('should parse SQL tables, indexes, and foreign keys', async () => {
      const code = `
        CREATE TABLE IF NOT EXISTS orders (
            id UUID PRIMARY KEY,
            user_id UUID REFERENCES users(id),
            amount DECIMAL(10, 2)
        );

        CREATE INDEX idx_orders_user ON orders(user_id);
      `;

      const result = await parserRegistry.parseFile('migrations/001_orders.sql', code, 'SQL');
      expect(result.language).toBe('SQL');

      const tbl = result.symbols.find((s) => s.name === 'orders');
      expect(tbl).toBeDefined();
      expect(tbl?.kind).toBe('table');

      const idx = result.symbols.find((s) => s.name === 'idx_orders_user');
      expect(idx).toBeDefined();

      const dep = result.dependencies.find((d) => d.targetModule === 'users');
      expect(dep).toBeDefined();
    });
  });

  describe('Asynchronous Ingestion Pipeline Execution', () => {
    it('should trigger ingestion non-blockingly and process repository in background', async () => {
      const customFiles = [
        {
          filePath: 'src/app.ts',
          content: 'export class AppController { getHello(): string { return "Hello"; } }',
        },
        {
          filePath: 'scripts/worker.py',
          content: 'def run_worker():\n    print("running worker")',
        },
        {
          filePath: 'schema.sql',
          content: 'CREATE TABLE products (id INT PRIMARY KEY, name VARCHAR(255));',
        },
        {
          filePath: '.env',
          content: 'SECRET_KEY=12345',
        },
        {
          filePath: 'node_modules/dep/index.js',
          content: 'console.log("ignored");',
        },
      ];

      // Non-blocking trigger
      const queuedJob = await workerService.triggerIngestion(
        testRepoId,
        testWorkspaceId,
        undefined,
        customFiles,
      );

      expect(queuedJob).toBeDefined();
      expect(queuedJob.status).toBe('queued');

      // Process repository synchronously for assertion
      const completedJob = await workerService.processRepository(
        queuedJob.id,
        testRepoId,
        testWorkspaceId,
        undefined,
        customFiles,
      );

      expect(completedJob.status).toBe('completed');
      expect(completedJob.totalFiles).toBe(5);
      expect(completedJob.processedFiles).toBe(5);
      expect(completedJob.totalChunks).toBeGreaterThan(0);
      expect(completedJob.totalSymbols).toBeGreaterThan(0);

      // Verify repository files in store
      const files = await ingestionRepo.listFilesByRepo(testRepoId);
      expect(files.length).toBe(5);

      const indexedFiles = files.filter((f) => f.status === 'indexed');
      expect(indexedFiles.length).toBe(3); // app.ts, worker.py, schema.sql

      const ignoredFiles = files.filter((f) => f.status === 'ignored');
      expect(ignoredFiles.length).toBe(2); // .env, node_modules

      // Verify symbols
      const symbols = await ingestionRepo.listSymbolsByRepo(testRepoId);
      expect(symbols.some((s) => s.name === 'AppController')).toBe(true);
      expect(symbols.some((s) => s.name === 'run_worker')).toBe(true);
      expect(symbols.some((s) => s.name === 'products')).toBe(true);
    });

    it('should skip re-parsing unchanged files (SHA idempotency caching)', async () => {
      const files = [
        {
          filePath: 'src/service.ts',
          content: 'export class CachingService { ping(): void {} }',
        },
      ];

      // 1st run
      const job1 = await workerService.triggerIngestion(testRepoId, testWorkspaceId, undefined, files);
      await workerService.processRepository(job1.id, testRepoId, testWorkspaceId, undefined, files);

      const symbolsInitial = await ingestionRepo.listSymbolsByRepo(testRepoId);
      expect(symbolsInitial.length).toBe(2); // CachingService + ping

      // 2nd run with identical file content
      const job2 = await workerService.triggerIngestion(testRepoId, testWorkspaceId, undefined, files);
      const resJob2 = await workerService.processRepository(
        job2.id,
        testRepoId,
        testWorkspaceId,
        undefined,
        files,
      );

      expect(resJob2.status).toBe('completed');
      expect(resJob2.processedFiles).toBe(1);

      // Symbols count should remain 2 (not duplicated)
      const symbolsAfter = await ingestionRepo.listSymbolsByRepo(testRepoId);
      expect(symbolsAfter.length).toBe(2);
    });

    it('should update symbols when file content changes', async () => {
      const initialFiles = [
        {
          filePath: 'src/dynamic.ts',
          content: 'export class InitialClass {}',
        },
      ];

      const job1 = await workerService.triggerIngestion(
        testRepoId,
        testWorkspaceId,
        undefined,
        initialFiles,
      );
      await workerService.processRepository(job1.id, testRepoId, testWorkspaceId, undefined, initialFiles);

      let symbols = await ingestionRepo.listSymbolsByRepo(testRepoId);
      expect(symbols.some((s) => s.name === 'InitialClass')).toBe(true);

      // Modified file content
      const updatedFiles = [
        {
          filePath: 'src/dynamic.ts',
          content: 'export class UpdatedClass { newMethod(): void {} }',
        },
      ];

      const job2 = await workerService.triggerIngestion(
        testRepoId,
        testWorkspaceId,
        undefined,
        updatedFiles,
      );
      await workerService.processRepository(job2.id, testRepoId, testWorkspaceId, undefined, updatedFiles);

      symbols = await ingestionRepo.listSymbolsByRepo(testRepoId);
      expect(symbols.some((s) => s.name === 'UpdatedClass')).toBe(true);
      expect(symbols.some((s) => s.name === 'newMethod')).toBe(true);
      expect(symbols.some((s) => s.name === 'InitialClass')).toBe(false);
    });
  });
});

import { Injectable } from '@nestjs/common';
import {
  RepositoryFile,
  CodeChunk,
  CodeSymbol,
  FileDependency,
  IngestionJob,
  IngestionStats,
} from '@devflow/shared-types';
import * as crypto from 'crypto';

@Injectable()
export class IngestionRepository {
  private readonly files = new Map<string, RepositoryFile>();
  private readonly chunks = new Map<string, CodeChunk>();
  private readonly symbols = new Map<string, CodeSymbol>();
  private readonly dependencies = new Map<string, FileDependency>();
  private readonly jobs = new Map<string, IngestionJob>();

  constructor() {
    this.seedBaselineIngestedData();
  }

  private seedBaselineIngestedData() {
    const repoId = 'repo-core-001';
    const workspaceId = 'ws-core-001';

    // Seed sample files
    const file1: RepositoryFile = {
      id: 'file-001',
      repositoryId: repoId,
      filePath: 'src/modules/auth/auth.service.ts',
      fileName: 'auth.service.ts',
      language: 'TypeScript',
      sizeBytes: 4200,
      sha: 'a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0',
      status: 'indexed',
      lastIngestedAt: '2026-09-06T18:30:00.000Z',
      createdAt: '2026-09-06T18:30:00.000Z',
    };

    const file2: RepositoryFile = {
      id: 'file-002',
      repositoryId: repoId,
      filePath: 'src/modules/workspaces/workspace.service.ts',
      fileName: 'workspace.service.ts',
      language: 'TypeScript',
      sizeBytes: 8900,
      sha: 'b2c3d4e5f6a17890123456789abcdef0123456789abcdef0123456789abcdef0',
      status: 'indexed',
      lastIngestedAt: '2026-09-06T18:30:00.000Z',
      createdAt: '2026-09-06T18:30:00.000Z',
    };

    this.files.set(file1.id, file1);
    this.files.set(file2.id, file2);

    // Seed sample symbols
    const sym1: CodeSymbol = {
      id: 'sym-001',
      repositoryId: repoId,
      fileId: file1.id,
      filePath: file1.filePath,
      name: 'AuthService',
      kind: 'class',
      startLine: 18,
      endLine: 120,
      signature: 'export class AuthService',
      isExported: true,
    };

    const sym2: CodeSymbol = {
      id: 'sym-002',
      repositoryId: repoId,
      fileId: file1.id,
      filePath: file1.filePath,
      name: 'login',
      kind: 'method',
      containerName: 'AuthService',
      startLine: 45,
      endLine: 65,
      signature: 'async login(dto: LoginDto, ip?: string): Promise<AuthResponse>',
      isExported: true,
    };

    const sym3: CodeSymbol = {
      id: 'sym-003',
      repositoryId: repoId,
      fileId: file2.id,
      filePath: file2.filePath,
      name: 'WorkspaceService',
      kind: 'class',
      startLine: 20,
      endLine: 210,
      signature: 'export class WorkspaceService',
      isExported: true,
    };

    this.symbols.set(sym1.id, sym1);
    this.symbols.set(sym2.id, sym2);
    this.symbols.set(sym3.id, sym3);

    // Seed sample chunks
    const chunk1: CodeChunk = {
      id: 'chk-001',
      repositoryId: repoId,
      fileId: file1.id,
      filePath: file1.filePath,
      startLine: 18,
      endLine: 120,
      content: 'export class AuthService {\n  constructor(...) {}\n  async login(...) {}\n}',
      language: 'TypeScript',
      chunkType: 'class',
      tokensCount: 450,
      astMetadata: { symbolName: 'AuthService', signature: 'export class AuthService' },
      createdAt: '2026-09-06T18:30:00.000Z',
    };

    this.chunks.set(chunk1.id, chunk1);

    // Seed completed job
    const job1: IngestionJob = {
      id: 'job-init-001',
      repositoryId: repoId,
      workspaceId,
      status: 'completed',
      totalFiles: 2,
      processedFiles: 2,
      totalChunks: 1,
      totalSymbols: 3,
      totalDependencies: 4,
      startedAt: '2026-09-06T18:29:50.000Z',
      completedAt: '2026-09-06T18:30:00.000Z',
    };
    this.jobs.set(job1.id, job1);
  }

  // ==========================================
  // File Store
  // ==========================================

  async saveFile(data: Omit<RepositoryFile, 'id' | 'createdAt'>): Promise<RepositoryFile> {
    const existing = await this.findFileByPath(data.repositoryId, data.filePath);
    const id = existing?.id || `file-${crypto.randomUUID()}`;

    const file: RepositoryFile = {
      ...data,
      id,
      createdAt: existing?.createdAt || new Date().toISOString(),
      lastIngestedAt: new Date().toISOString(),
    };

    this.files.set(id, file);
    return file;
  }

  async findFileByPath(repositoryId: string, filePath: string): Promise<RepositoryFile | null> {
    const norm = filePath.replace(/\\/g, '/');
    for (const f of this.files.values()) {
      if (f.repositoryId === repositoryId && f.filePath === norm) {
        return f;
      }
    }
    return null;
  }

  async listFilesByRepo(repositoryId: string): Promise<RepositoryFile[]> {
    return Array.from(this.files.values()).filter((f) => f.repositoryId === repositoryId);
  }

  // ==========================================
  // Chunks Store
  // ==========================================

  async saveChunks(chunksList: CodeChunk[]): Promise<CodeChunk[]> {
    for (const chk of chunksList) {
      this.chunks.set(chk.id, chk);
    }
    return chunksList;
  }

  async listChunksByRepo(repositoryId: string): Promise<CodeChunk[]> {
    return Array.from(this.chunks.values()).filter((c) => c.repositoryId === repositoryId);
  }

  async deleteChunksForFile(fileId: string): Promise<void> {
    for (const [id, chk] of this.chunks.entries()) {
      if (chk.fileId === fileId) {
        this.chunks.delete(id);
      }
    }
  }

  // ==========================================
  // Symbols Store
  // ==========================================

  async saveSymbols(symbolsList: Omit<CodeSymbol, 'id'>[]): Promise<CodeSymbol[]> {
    const saved: CodeSymbol[] = [];
    for (const sym of symbolsList) {
      const id = `sym-${crypto.randomUUID()}`;
      const symbol: CodeSymbol = { ...sym, id };
      this.symbols.set(id, symbol);
      saved.push(symbol);
    }
    return saved;
  }

  async listSymbolsByRepo(repositoryId: string, query?: string): Promise<CodeSymbol[]> {
    let result = Array.from(this.symbols.values()).filter((s) => s.repositoryId === repositoryId);
    if (query) {
      const q = query.toLowerCase();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.filePath.toLowerCase().includes(q) ||
          s.kind.toLowerCase().includes(q),
      );
    }
    return result;
  }

  async deleteSymbolsForFile(fileId: string): Promise<void> {
    for (const [id, s] of this.symbols.entries()) {
      if (s.fileId === fileId) {
        this.symbols.delete(id);
      }
    }
  }

  // ==========================================
  // Dependencies Store
  // ==========================================

  async saveDependencies(depsList: Omit<FileDependency, 'id'>[]): Promise<FileDependency[]> {
    const saved: FileDependency[] = [];
    for (const dep of depsList) {
      const id = `dep-${crypto.randomUUID()}`;
      const dependency: FileDependency = { ...dep, id };
      this.dependencies.set(id, dependency);
      saved.push(dependency);
    }
    return saved;
  }

  async listDependenciesByRepo(repositoryId: string): Promise<FileDependency[]> {
    return Array.from(this.dependencies.values()).filter((d) => d.repositoryId === repositoryId);
  }

  async deleteDependenciesForFile(fileId: string): Promise<void> {
    for (const [id, d] of this.dependencies.entries()) {
      if (d.sourceFileId === fileId) {
        this.dependencies.delete(id);
      }
    }
  }

  // ==========================================
  // Ingestion Jobs
  // ==========================================

  async createJob(data: Omit<IngestionJob, 'id' | 'startedAt'>): Promise<IngestionJob> {
    const id = `job-${crypto.randomUUID()}`;
    const job: IngestionJob = {
      ...data,
      id,
      startedAt: new Date().toISOString(),
    };

    this.jobs.set(id, job);
    return job;
  }

  async updateJob(jobId: string, updates: Partial<IngestionJob>): Promise<IngestionJob | null> {
    const existing = this.jobs.get(jobId);
    if (!existing) return null;

    const merged: IngestionJob = {
      ...existing,
      ...updates,
    };
    this.jobs.set(jobId, merged);
    return merged;
  }

  async findJobById(jobId: string): Promise<IngestionJob | null> {
    return this.jobs.get(jobId) || null;
  }

  async findLatestJobByRepo(repositoryId: string): Promise<IngestionJob | null> {
    const repoJobs = Array.from(this.jobs.values())
      .filter((j) => j.repositoryId === repositoryId)
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());

    return repoJobs[0] || null;
  }

  async getRepoStats(repositoryId: string): Promise<IngestionStats> {
    const files = await this.listFilesByRepo(repositoryId);
    const chunks = await this.listChunksByRepo(repositoryId);
    const symbols = await this.listSymbolsByRepo(repositoryId);
    const deps = await this.listDependenciesByRepo(repositoryId);

    const languages: Record<string, number> = {};
    for (const f of files) {
      if (f.status === 'indexed') {
        languages[f.language] = (languages[f.language] || 0) + 1;
      }
    }

    const latestJob = await this.findLatestJobByRepo(repositoryId);

    return {
      filesCount: files.filter((f) => f.status === 'indexed').length,
      chunksCount: chunks.length,
      symbolsCount: symbols.length,
      dependenciesCount: deps.length,
      languages,
      lastIngestedAt: latestJob?.completedAt || files[0]?.lastIngestedAt,
    };
  }

  async clearRepoIngestion(repositoryId: string): Promise<void> {
    const fileIds = new Set(
      Array.from(this.files.values())
        .filter((f) => f.repositoryId === repositoryId)
        .map((f) => f.id),
    );

    for (const fileId of fileIds) {
      this.files.delete(fileId);
    }
    for (const [id, c] of this.chunks.entries()) {
      if (c.repositoryId === repositoryId) this.chunks.delete(id);
    }
    for (const [id, s] of this.symbols.entries()) {
      if (s.repositoryId === repositoryId) this.symbols.delete(id);
    }
    for (const [id, d] of this.dependencies.entries()) {
      if (d.repositoryId === repositoryId) this.dependencies.delete(id);
    }
  }
}

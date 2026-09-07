import { Injectable, Logger } from '@nestjs/common';
import { IngestionRepository } from './ingestion.repository';
import { FileFilterService } from './filtering/file-filter.service';
import { ParserRegistryService } from './parsers/parser-registry.service';
import { CodeChunkerService } from './chunking/code-chunker.service';
import { GitHubRepository } from '../github/github.repository';
import { AuditService } from '../audit/audit.service';
import { IngestionJob, TriggerIngestionRequest } from '@devflow/shared-types';
import * as crypto from 'crypto';

export interface FileInput {
  filePath: string;
  content: string;
}

@Injectable()
export class IngestionWorkerService {
  private readonly logger = new Logger(IngestionWorkerService.name);

  constructor(
    private readonly ingestionRepository: IngestionRepository,
    private readonly fileFilterService: FileFilterService,
    private readonly parserRegistryService: ParserRegistryService,
    private readonly codeChunkerService: CodeChunkerService,
    private readonly githubRepository: GitHubRepository,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Non-blocking entrypoint: Creates IngestionJob and starts asynchronous execution
   */
  async triggerIngestion(
    repositoryId: string,
    workspaceId: string,
    options?: TriggerIngestionRequest,
    customFiles?: FileInput[],
  ): Promise<IngestionJob> {
    const job = await this.ingestionRepository.createJob({
      repositoryId,
      workspaceId,
      status: 'queued',
      totalFiles: 0,
      processedFiles: 0,
      totalChunks: 0,
      totalSymbols: 0,
      totalDependencies: 0,
    });

    // Update repository status to indexing
    await this.githubRepository.updateRepository(repositoryId, {
      indexStatus: 'indexing',
    });

    // Fire & forget async background processing
    setImmediate(() => {
      this.processRepository(job.id, repositoryId, workspaceId, options, customFiles).catch(
        (err) => {
          this.logger.error(`Failed to ingest repository ${repositoryId}: ${err.message}`, err.stack);
        },
      );
    });

    return job;
  }

  /**
   * Asynchronous background ingestion pipeline
   */
  async processRepository(
    jobId: string,
    repositoryId: string,
    workspaceId: string,
    options?: TriggerIngestionRequest,
    customFiles?: FileInput[],
  ): Promise<IngestionJob> {
    try {
      await this.ingestionRepository.updateJob(jobId, { status: 'processing' });

      // 1. Discover files (custom provided or default baseline code tree)
      const filesToProcess = customFiles || (await this.discoverRepositoryFiles(repositoryId));

      await this.ingestionRepository.updateJob(jobId, {
        totalFiles: filesToProcess.length,
      });

      if (options?.forceReindex) {
        await this.ingestionRepository.clearRepoIngestion(repositoryId);
      }

      let totalChunks = 0;
      let totalSymbols = 0;
      let totalDeps = 0;
      let processedFiles = 0;

      // 2. Iterate and process each discovered file
      for (const fileItem of filesToProcess) {
        const filePath = fileItem.filePath.replace(/\\/g, '/');
        const content = fileItem.content;
        const sizeBytes = Buffer.byteLength(content, 'utf8');

        // 3. File Filtering & Ignore Checks
        const filterDecision = this.fileFilterService.shouldProcess(filePath, sizeBytes, content);

        if (!filterDecision.process) {
          await this.ingestionRepository.saveFile({
            repositoryId,
            filePath,
            fileName: filePath.split('/').pop() || filePath,
            language: filterDecision.language,
            sizeBytes,
            sha: this.calculateSha256(content),
            status: filterDecision.isBinary ? 'binary' : 'ignored',
          });
          processedFiles++;
          await this.ingestionRepository.updateJob(jobId, { processedFiles });
          continue;
        }

        // 4. SHA-256 Idempotency Check
        const sha = this.calculateSha256(content);
        const existingFile = await this.ingestionRepository.findFileByPath(repositoryId, filePath);

        if (existingFile && existingFile.sha === sha && !options?.forceReindex) {
          // Unchanged file: Skip re-parsing
          processedFiles++;
          await this.ingestionRepository.updateJob(jobId, { processedFiles });
          continue;
        }

        // 5. Parse AST & Extract Metadata
        const parseResult = await this.parserRegistryService.parseFile(
          filePath,
          content,
          filterDecision.language,
        );

        // 6. Save or Update File Record
        const savedFile = await this.ingestionRepository.saveFile({
          repositoryId,
          filePath,
          fileName: filePath.split('/').pop() || filePath,
          language: parseResult.language,
          sizeBytes,
          sha,
          status: 'indexed',
        });

        // Clean previous file artefacts if incremental update
        if (existingFile) {
          await this.ingestionRepository.deleteChunksForFile(savedFile.id);
          await this.ingestionRepository.deleteSymbolsForFile(savedFile.id);
          await this.ingestionRepository.deleteDependenciesForFile(savedFile.id);
        }

        // 7. Process & Store Semantic Code Chunks
        const chunks = this.codeChunkerService.processChunks(
          repositoryId,
          savedFile.id,
          filePath,
          parseResult.language,
          parseResult.chunks,
          parseResult.symbols,
        );
        await this.ingestionRepository.saveChunks(chunks);
        totalChunks += chunks.length;

        // 8. Store Symbols
        const symbolsToSave = parseResult.symbols.map((s) => ({
          ...s,
          repositoryId,
          fileId: savedFile.id,
          filePath,
        }));
        await this.ingestionRepository.saveSymbols(symbolsToSave);
        totalSymbols += symbolsToSave.length;

        // 9. Store Dependencies
        const depsToSave = parseResult.dependencies.map((d) => ({
          ...d,
          repositoryId,
          sourceFileId: savedFile.id,
          sourceFilePath: filePath,
        }));
        await this.ingestionRepository.saveDependencies(depsToSave);
        totalDeps += depsToSave.length;

        processedFiles++;
        await this.ingestionRepository.updateJob(jobId, {
          processedFiles,
          totalChunks,
          totalSymbols,
          totalDependencies: totalDeps,
        });
      }

      // 10. Finalize Job & Repository Status
      const completedJob = await this.ingestionRepository.updateJob(jobId, {
        status: 'completed',
        processedFiles,
        totalChunks,
        totalSymbols,
        totalDependencies: totalDeps,
        completedAt: new Date().toISOString(),
      });

      await this.githubRepository.updateRepository(repositoryId, {
        indexStatus: 'indexed',
        lastIndexedAt: new Date().toISOString(),
      });

      this.auditService.record({
        userId: 'system-worker',
        action: 'REPOSITORY_INGESTION_COMPLETED',
        resource: `repository/${repositoryId}`,
        status: 'SUCCESS',
        details: {
          jobId,
          filesCount: processedFiles,
          chunksCount: totalChunks,
          symbolsCount: totalSymbols,
        },
      });

      return completedJob!;
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown ingestion error';
      await this.ingestionRepository.updateJob(jobId, {
        status: 'failed',
        errorMessage: errorMsg,
        completedAt: new Date().toISOString(),
      });

      await this.githubRepository.updateRepository(repositoryId, {
        indexStatus: 'failed',
      });

      throw err;
    }
  }

  private calculateSha256(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Generates sample multi-language repository codebase files for indexing
   */
  private async discoverRepositoryFiles(repositoryId: string): Promise<FileInput[]> {
    return [
      {
        filePath: 'src/core/engine.ts',
        content: `import { Injectable } from '@nestjs/common';
import { Logger } from '../utils/logger';
import * as crypto from 'crypto';

export interface EngineConfig {
  maxWorkers: number;
  timeoutMs: number;
}

export class CoreEngine {
  private isRunning: boolean = false;

  constructor(private readonly config: EngineConfig) {}

  public async start(): Promise<void> {
    this.isRunning = true;
  }

  public stop(): void {
    this.isRunning = false;
  }
}`,
      },
      {
        filePath: 'src/agents/react_agent.py',
        content: `from typing import List, Dict, Any
import json
import logging

class ReActAgent:
    """Multi-step reasoning and tool orchestration coding agent."""
    def __init__(self, model_name: str, max_iterations: int = 15):
        self.model_name = model_name
        self.max_iterations = max_iterations

    async def execute_step(self, prompt: str, history: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Executes a single thought, tool_call, or observation iteration."""
        return {"action": "tool_call", "thought": "Plan codebase AST inspection"}
`,
      },
      {
        filePath: 'src/services/PaymentService.java',
        content: `package com.devflow.services;

import java.util.List;
import java.util.UUID;

public class PaymentService implements IPaymentService {
    public boolean processPayment(UUID customerId, double amount) {
        return amount > 0;
    }
}
`,
      },
      {
        filePath: 'migrations/001_schema.sql',
        content: `CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS workspaces (
    id UUID PRIMARY KEY,
    owner_id UUID REFERENCES users(id),
    name VARCHAR(255) NOT NULL
);
`,
      },
      {
        filePath: 'README.md',
        content: `# DevFlow Core Engine\n\nHigh-performance AI orchestration and semantic code intelligence platform.`,
      },
      {
        filePath: '.env',
        content: `SECRET_KEY=supersecret123\nAPI_KEY=xyz9988`,
      },
      {
        filePath: 'assets/logo.png',
        content: '\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00',
      },
    ];
  }
}

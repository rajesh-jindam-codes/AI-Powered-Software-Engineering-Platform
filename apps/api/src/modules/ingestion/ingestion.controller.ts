import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { IngestionWorkerService } from './ingestion-worker.service';
import { IngestionRepository } from './ingestion.repository';
import { GitHubRepository } from '../github/github.repository';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  User,
  IngestionJob,
  RepositoryFile,
  CodeSymbol,
  CodeChunk,
  FileDependency,
  IngestionStats,
  TriggerIngestionRequest,
} from '@devflow/shared-types';

@Controller('ingestion')
@UseGuards(JwtAuthGuard)
export class IngestionController {
  constructor(
    private readonly ingestionWorkerService: IngestionWorkerService,
    private readonly ingestionRepository: IngestionRepository,
    private readonly githubRepository: GitHubRepository,
  ) {}

  @Post('repositories/:repoId/trigger')
  @HttpCode(HttpStatus.ACCEPTED)
  async triggerIngestion(
    @Param('repoId') repoId: string,
    @CurrentUser() user: User,
    @Body() dto?: TriggerIngestionRequest,
  ): Promise<IngestionJob> {
    const repo = await this.githubRepository.findRepositoryById(repoId);
    if (!repo) {
      throw new NotFoundException(`Repository with ID '${repoId}' not found`);
    }

    return this.ingestionWorkerService.triggerIngestion(repo.id, repo.workspaceId, dto);
  }

  @Get('jobs/:jobId')
  async getJobStatus(@Param('jobId') jobId: string): Promise<IngestionJob> {
    const job = await this.ingestionRepository.findJobById(jobId);
    if (!job) {
      throw new NotFoundException(`Ingestion job '${jobId}' not found`);
    }
    return job;
  }

  @Get('repositories/:repoId/status')
  async getRepositoryStatus(
    @Param('repoId') repoId: string,
  ): Promise<{ latestJob: IngestionJob | null; stats: IngestionStats }> {
    const repo = await this.githubRepository.findRepositoryById(repoId);
    if (!repo) {
      throw new NotFoundException(`Repository with ID '${repoId}' not found`);
    }

    const [latestJob, stats] = await Promise.all([
      this.ingestionRepository.findLatestJobByRepo(repoId),
      this.ingestionRepository.getRepoStats(repoId),
    ]);

    return { latestJob, stats };
  }

  @Get('repositories/:repoId/files')
  async listFiles(@Param('repoId') repoId: string): Promise<RepositoryFile[]> {
    return this.ingestionRepository.listFilesByRepo(repoId);
  }

  @Get('repositories/:repoId/symbols')
  async listSymbols(
    @Param('repoId') repoId: string,
    @Query('q') query?: string,
  ): Promise<CodeSymbol[]> {
    return this.ingestionRepository.listSymbolsByRepo(repoId, query);
  }

  @Get('repositories/:repoId/chunks')
  async listChunks(@Param('repoId') repoId: string): Promise<CodeChunk[]> {
    return this.ingestionRepository.listChunksByRepo(repoId);
  }

  @Get('repositories/:repoId/dependencies')
  async listDependencies(@Param('repoId') repoId: string): Promise<FileDependency[]> {
    return this.ingestionRepository.listDependenciesByRepo(repoId);
  }
}

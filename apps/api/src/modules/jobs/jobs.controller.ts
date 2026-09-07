import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  CancelJobRequest,
  EnqueueJobRequest,
  JobFilterQuery,
  JobMetricsResponse,
  JobPriority,
  JobRecord,
  JobState,
  JobType,
  RetryJobRequest,
  WorkerHeartbeat,
} from '@devflow/shared-types';
import { JobsService, SimulateFailureRequest } from './jobs.service';

@Controller('api/v1/jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  /**
   * Enqueue a new distributed asynchronous job
   */
  @Post('enqueue')
  @HttpCode(HttpStatus.ACCEPTED)
  async enqueueJob(@Body() body: EnqueueJobRequest): Promise<JobRecord> {
    return this.jobsService.enqueueJob(body);
  }

  /**
   * Query jobs with filtering and pagination
   */
  @Get()
  async listJobs(
    @Query('workspaceId') workspaceId?: string,
    @Query('repositoryId') repositoryId?: string,
    @Query('jobType') jobType?: JobType,
    @Query('state') state?: JobState,
    @Query('priority') priority?: string,
    @Query('workerId') workerId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<{ jobs: JobRecord[]; total: number }> {
    const filters: JobFilterQuery = {
      workspaceId,
      repositoryId,
      jobType,
      state,
      priority: priority ? (parseInt(priority, 10) as JobPriority) : undefined,
      workerId,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    };
    return this.jobsService.listJobs(filters);
  }

  /**
   * Get aggregated job system metrics
   */
  @Get('metrics')
  async getMetrics(@Query('workspaceId') workspaceId?: string): Promise<JobMetricsResponse> {
    return this.jobsService.getMetrics(workspaceId);
  }

  /**
   * Get active worker fleet status and heartbeats
   */
  @Get('workers')
  async getWorkers(): Promise<WorkerHeartbeat[]> {
    return this.jobsService.getWorkers();
  }

  /**
   * Chaos / Failure Simulation endpoint
   */
  @Post('simulate-failure')
  @HttpCode(HttpStatus.OK)
  async simulateFailure(@Body() body: SimulateFailureRequest): Promise<Record<string, unknown>> {
    return this.jobsService.simulateFailure(body);
  }

  /**
   * Manually trigger dead worker reaper
   */
  @Post('reap-dead-workers')
  @HttpCode(HttpStatus.OK)
  async reapDeadWorkers(@Query('threshold') threshold?: string): Promise<{ reclaimedCount: number; deadWorkers: string[] }> {
    const thresholdSec = threshold ? parseInt(threshold, 10) : 15;
    return this.jobsService.reapDeadWorkers(thresholdSec);
  }

  /**
   * Get single job details with progress
   */
  @Get(':id')
  async getJob(@Param('id') id: string): Promise<JobRecord> {
    return this.jobsService.getJob(id);
  }

  /**
   * Cancel an in-flight or queued job
   */
  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancelJob(@Param('id') id: string, @Body() body?: CancelJobRequest): Promise<JobRecord> {
    return this.jobsService.cancelJob(id, body?.reason);
  }

  /**
   * Re-queue / retry a failed or dead-lettered job
   */
  @Post(':id/retry')
  @HttpCode(HttpStatus.OK)
  async retryJob(@Param('id') id: string, @Body() body?: RetryJobRequest): Promise<JobRecord> {
    return this.jobsService.retryJob(id, body?.resetAttempts ?? true);
  }
}

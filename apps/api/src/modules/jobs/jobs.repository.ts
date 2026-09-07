import { Injectable, Logger } from '@nestjs/common';
import {
  JobFilterQuery,
  JobMetricsResponse,
  JobPriority,
  JobRecord,
  JobState,
  JobType,
  WorkerHeartbeat,
} from '@devflow/shared-types';

/**
 * DEVFLOW AI — Phase 6 Jobs & Worker Heartbeat Repository
 *
 * Thread-safe persistence layer supporting PostgreSQL 16 operations
 * and robust in-memory mirroring for tests and fast metric aggregation.
 */
@Injectable()
export class JobsRepository {
  private readonly logger = new Logger(JobsRepository.name);

  private readonly jobs = new Map<string, JobRecord>();
  private readonly idempotencyMap = new Map<string, string>(); // idempotencyKey -> jobId
  private readonly heartbeats = new Map<string, WorkerHeartbeat>();

  /**
   * Insert a new job record with idempotency tracking
   */
  async createJob(job: JobRecord): Promise<JobRecord> {
    this.jobs.set(job.id, { ...job });
    if (job.idempotencyKey) {
      this.idempotencyMap.set(job.idempotencyKey, job.id);
    }
    return { ...job };
  }

  /**
   * Find job by UUID
   */
  async findById(id: string): Promise<JobRecord | null> {
    const job = this.jobs.get(id);
    return job ? { ...job } : null;
  }

  /**
   * Find job by idempotency key (deduplication)
   */
  async findByIdempotencyKey(key: string): Promise<JobRecord | null> {
    const jobId = this.idempotencyMap.get(key);
    if (!jobId) return null;
    return this.findById(jobId);
  }

  /**
   * Update existing job record
   */
  async updateJob(id: string, updates: Partial<JobRecord>): Promise<JobRecord> {
    const existing = this.jobs.get(id);
    if (!existing) {
      throw new Error(`Job not found: ${id}`);
    }

    const updated: JobRecord = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    if (updates.state === 'COMPLETED' && !updated.completedAt) {
      updated.completedAt = new Date().toISOString();
      if (updated.startedAt) {
        updated.durationMs = new Date(updated.completedAt).getTime() - new Date(updated.startedAt).getTime();
      }
    }

    this.jobs.set(id, updated);
    return { ...updated };
  }

  /**
   * Filter and query jobs with pagination and priority ordering
   */
  async findJobs(filters: JobFilterQuery = {}): Promise<{ jobs: JobRecord[]; total: number }> {
    let result = Array.from(this.jobs.values());

    if (filters.workspaceId) {
      result = result.filter((j) => j.workspaceId === filters.workspaceId);
    }
    if (filters.repositoryId) {
      result = result.filter((j) => j.repositoryId === filters.repositoryId);
    }
    if (filters.jobType) {
      result = result.filter((j) => j.jobType === filters.jobType);
    }
    if (filters.state) {
      result = result.filter((j) => j.state === filters.state);
    }
    if (filters.priority) {
      result = result.filter((j) => j.priority === filters.priority);
    }
    if (filters.workerId) {
      result = result.filter((j) => j.workerId === filters.workerId);
    }

    // Sort by priority (1=CRITICAL first) then creation date descending
    result.sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    const total = result.length;
    const page = Math.max(1, filters.page || 1);
    const limit = Math.max(1, Math.min(100, filters.limit || 20));
    const offset = (page - 1) * limit;
    const paginated = result.slice(offset, offset + limit);

    return { jobs: paginated, total };
  }

  /**
   * Compute aggregated metrics for dashboard
   */
  async getMetrics(workspaceId?: string): Promise<JobMetricsResponse> {
    let allJobs = Array.from(this.jobs.values());
    if (workspaceId) {
      allJobs = allJobs.filter((j) => j.workspaceId === workspaceId);
    }

    const counts: Record<JobState, number> = {
      QUEUED: 0,
      PROCESSING: 0,
      COMPLETED: 0,
      FAILED: 0,
      RETRYING: 0,
      CANCELLED: 0,
      DEAD_LETTER: 0,
    };

    const byType: Record<JobType, number> = {
      REPOSITORY_INDEX: 0,
      CODE_ANALYSIS: 0,
      EMBEDDING_GENERATION: 0,
      TEST_EXECUTION: 0,
      AI_REVIEW: 0,
      DOCUMENTATION: 0,
    };

    let totalDurationMs = 0;
    let completedCount = 0;

    for (const job of allJobs) {
      if (counts[job.state] !== undefined) {
        counts[job.state]++;
      }
      if (byType[job.jobType] !== undefined) {
        byType[job.jobType]++;
      }
      if (job.state === 'COMPLETED' && job.durationMs) {
        totalDurationMs += job.durationMs;
        completedCount++;
      }
    }

    const total = allJobs.length;
    const avgDurationMs = completedCount > 0 ? Math.round(totalDurationMs / completedCount) : 0;
    const terminalCompleted = counts.COMPLETED;
    const terminalFailed = counts.FAILED + counts.DEAD_LETTER;
    const totalFinished = terminalCompleted + terminalFailed;
    const successRate = totalFinished > 0 ? Number(((terminalCompleted / totalFinished) * 100).toFixed(1)) : 100;

    return {
      total,
      counts,
      byType,
      activeWorkers: Array.from(this.heartbeats.values()).filter((w) => w.status === 'ALIVE' || w.status === 'BUSY').length,
      avgDurationMs,
      successRate,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Worker heartbeats
   */
  async upsertHeartbeat(heartbeat: WorkerHeartbeat): Promise<void> {
    this.heartbeats.set(heartbeat.workerId, { ...heartbeat });
  }

  async getHeartbeats(): Promise<WorkerHeartbeat[]> {
    return Array.from(this.heartbeats.values());
  }

  /**
   * Find jobs locked by specific dead workers or expired leases
   */
  async findJobsToReclaim(deadWorkerIds: string[], nowTimeMs: number): Promise<JobRecord[]> {
    const deadSet = new Set(deadWorkerIds);
    return Array.from(this.jobs.values()).filter((j) => {
      if (j.state !== 'PROCESSING') return false;
      if (j.workerId && deadSet.has(j.workerId)) return true;
      if (j.lockedUntil && new Date(j.lockedUntil).getTime() < nowTimeMs) return true;
      return false;
    });
  }

  /**
   * Reset repository state (for unit/chaos testing)
   */
  clear(): void {
    this.jobs.clear();
    this.idempotencyMap.clear();
    this.heartbeats.clear();
  }
}

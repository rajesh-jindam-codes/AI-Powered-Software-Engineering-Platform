'use client';

import React, { useState, useEffect } from 'react';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Bot,
  CheckCircle2,
  Clock,
  Code2,
  Cpu,
  FileCode,
  Flame,
  Layers,
  PauseCircle,
  Play,
  PlayCircle,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Server,
  ShieldAlert,
  Sparkles,
  Terminal,
  Trash2,
  XCircle,
  Zap,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  JobMetricsResponse,
  JobPriority,
  JobRecord,
  JobState,
  JobType,
  WorkerHeartbeat,
} from '@devflow/shared-types';

export default function JobsDashboardPage() {
  const [metrics, setMetrics] = useState<JobMetricsResponse>({
    total: 6,
    counts: {
      QUEUED: 1,
      PROCESSING: 1,
      COMPLETED: 3,
      FAILED: 0,
      RETRYING: 1,
      CANCELLED: 0,
      DEAD_LETTER: 1,
    },
    byType: {
      REPOSITORY_INDEX: 1,
      CODE_ANALYSIS: 1,
      EMBEDDING_GENERATION: 1,
      TEST_EXECUTION: 1,
      AI_REVIEW: 1,
      DOCUMENTATION: 1,
    },
    activeWorkers: 6,
    avgDurationMs: 3500,
    successRate: 75.0,
    timestamp: new Date().toISOString(),
  });

  const [jobs, setJobs] = useState<JobRecord[]>([
    {
      id: 'job-7e81a-idx',
      jobType: 'REPOSITORY_INDEX',
      state: 'COMPLETED',
      priority: JobPriority.CRITICAL,
      progress: 100,
      attempt: 1,
      maxRetries: 3,
      backoffMs: 1000,
      timeoutSeconds: 300,
      workerId: 'worker-repository_index-01',
      payload: { repo: 'DevFlow-AI/core', branch: 'main', commitSha: '7f9a2b' },
      result: { filesIndexed: 142, symbolsCount: 680, chunksCount: 240, durationMs: 4120 },
      startedAt: new Date(Date.now() - 120000).toISOString(),
      completedAt: new Date(Date.now() - 115000).toISOString(),
      durationMs: 5000,
      createdAt: new Date(Date.now() - 125000).toISOString(),
      updatedAt: new Date(Date.now() - 115000).toISOString(),
      nextRunAt: new Date().toISOString(),
    },
    {
      id: 'job-9c12b-emb',
      jobType: 'EMBEDDING_GENERATION',
      state: 'PROCESSING',
      priority: JobPriority.HIGH,
      progress: 65,
      attempt: 1,
      maxRetries: 3,
      backoffMs: 1000,
      timeoutSeconds: 300,
      workerId: 'worker-embedding_generation-01',
      payload: { totalChunks: 120, batchSize: 20 },
      startedAt: new Date(Date.now() - 10000).toISOString(),
      createdAt: new Date(Date.now() - 15000).toISOString(),
      updatedAt: new Date(Date.now() - 2000).toISOString(),
      nextRunAt: new Date().toISOString(),
    },
    {
      id: 'job-3f41c-rev',
      jobType: 'AI_REVIEW',
      state: 'RETRYING',
      priority: JobPriority.HIGH,
      progress: 40,
      attempt: 2,
      maxRetries: 3,
      backoffMs: 1000,
      timeoutSeconds: 120,
      workerId: 'worker-ai_review-01',
      payload: { pullRequestId: 'PR-42', headSha: '9f8e7d6' },
      errorDetails: {
        message: 'Upstream rate limit from LLM provider (HTTP 429)',
        code: 'RATE_LIMIT_EXCEEDED',
        isRetryable: true,
        failedAt: new Date(Date.now() - 5000).toISOString(),
        attempt: 2,
      },
      createdAt: new Date(Date.now() - 30000).toISOString(),
      updatedAt: new Date(Date.now() - 5000).toISOString(),
      nextRunAt: new Date(Date.now() + 2000).toISOString(),
    },
    {
      id: 'job-1a23d-tst',
      jobType: 'TEST_EXECUTION',
      state: 'COMPLETED',
      priority: JobPriority.NORMAL,
      progress: 100,
      attempt: 1,
      maxRetries: 3,
      backoffMs: 1000,
      timeoutSeconds: 300,
      workerId: 'worker-test_execution-01',
      payload: { framework: 'jest', testSuite: 'unit' },
      result: { totalTests: 55, passedTests: 55, failedTests: 0, lineCoverage: 96.4 },
      startedAt: new Date(Date.now() - 60000).toISOString(),
      completedAt: new Date(Date.now() - 57000).toISOString(),
      durationMs: 3000,
      createdAt: new Date(Date.now() - 65000).toISOString(),
      updatedAt: new Date(Date.now() - 57000).toISOString(),
      nextRunAt: new Date().toISOString(),
    },
    {
      id: 'job-8b76e-ana',
      jobType: 'CODE_ANALYSIS',
      state: 'COMPLETED',
      priority: JobPriority.NORMAL,
      progress: 100,
      attempt: 1,
      maxRetries: 3,
      backoffMs: 1000,
      timeoutSeconds: 300,
      workerId: 'worker-code_analysis-01',
      payload: { targetPath: 'apps/api/src/modules/auth' },
      result: { securityScore: 99, complexityAvg: 3.1, issuesCount: 0 },
      startedAt: new Date(Date.now() - 90000).toISOString(),
      completedAt: new Date(Date.now() - 88000).toISOString(),
      durationMs: 2000,
      createdAt: new Date(Date.now() - 95000).toISOString(),
      updatedAt: new Date(Date.now() - 88000).toISOString(),
      nextRunAt: new Date().toISOString(),
    },
    {
      id: 'job-4d55f-doc',
      jobType: 'DOCUMENTATION',
      state: 'DEAD_LETTER',
      priority: JobPriority.LOW,
      progress: 20,
      attempt: 3,
      maxRetries: 3,
      backoffMs: 1000,
      timeoutSeconds: 60,
      payload: { target: 'corrupted-syntax-tree.ts' },
      errorDetails: {
        message: 'Parser syntax exception: Unexpected EOF at line 1',
        code: 'SYNTAX_ERROR',
        isRetryable: false,
        failedAt: new Date(Date.now() - 20000).toISOString(),
        attempt: 3,
        deadLetterReason: 'Exhausted all 3 retry attempts: Parser syntax exception',
      },
      createdAt: new Date(Date.now() - 45000).toISOString(),
      updatedAt: new Date(Date.now() - 20000).toISOString(),
      nextRunAt: new Date().toISOString(),
    },
  ]);

  const [workers, setWorkers] = useState<WorkerHeartbeat[]>([
    {
      workerId: 'worker-repository_index-01',
      workerType: 'REPOSITORY_INDEX',
      hostname: 'worker-pod-k8s-idx-1',
      pid: 4120,
      concurrency: 5,
      activeJobsCount: 0,
      status: 'ALIVE',
      lastHeartbeat: new Date().toISOString(),
      startedAt: new Date(Date.now() - 3600000).toISOString(),
      version: '1.0.0',
      processedCount: 14,
      failedCount: 0,
    },
    {
      workerId: 'worker-code_analysis-01',
      workerType: 'CODE_ANALYSIS',
      hostname: 'worker-pod-k8s-ana-1',
      pid: 4121,
      concurrency: 5,
      activeJobsCount: 0,
      status: 'ALIVE',
      lastHeartbeat: new Date().toISOString(),
      startedAt: new Date(Date.now() - 3600000).toISOString(),
      version: '1.0.0',
      processedCount: 22,
      failedCount: 0,
    },
    {
      workerId: 'worker-embedding_generation-01',
      workerType: 'EMBEDDING_GENERATION',
      hostname: 'worker-pod-k8s-emb-1',
      pid: 4122,
      concurrency: 5,
      activeJobsCount: 1,
      status: 'BUSY',
      lastHeartbeat: new Date().toISOString(),
      startedAt: new Date(Date.now() - 3600000).toISOString(),
      version: '1.0.0',
      processedCount: 38,
      failedCount: 1,
    },
    {
      workerId: 'worker-test_execution-01',
      workerType: 'TEST_EXECUTION',
      hostname: 'worker-pod-k8s-tst-1',
      pid: 4123,
      concurrency: 4,
      activeJobsCount: 0,
      status: 'ALIVE',
      lastHeartbeat: new Date().toISOString(),
      startedAt: new Date(Date.now() - 3600000).toISOString(),
      version: '1.0.0',
      processedCount: 19,
      failedCount: 0,
    },
    {
      workerId: 'worker-ai_review-01',
      workerType: 'AI_REVIEW',
      hostname: 'worker-pod-k8s-rev-1',
      pid: 4124,
      concurrency: 3,
      activeJobsCount: 1,
      status: 'BUSY',
      lastHeartbeat: new Date().toISOString(),
      startedAt: new Date(Date.now() - 3600000).toISOString(),
      version: '1.0.0',
      processedCount: 9,
      failedCount: 2,
    },
    {
      workerId: 'worker-documentation-01',
      workerType: 'DOCUMENTATION',
      hostname: 'worker-pod-k8s-doc-1',
      pid: 4125,
      concurrency: 4,
      activeJobsCount: 0,
      status: 'ALIVE',
      lastHeartbeat: new Date().toISOString(),
      startedAt: new Date(Date.now() - 3600000).toISOString(),
      version: '1.0.0',
      processedCount: 7,
      failedCount: 1,
    },
  ]);

  const [selectedState, setSelectedState] = useState<string>('ALL');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedJob, setSelectedJob] = useState<JobRecord | null>(null);
  const [isAutoRefresh, setIsAutoRefresh] = useState(true);
  const [isEnqueueModalOpen, setIsEnqueueModalOpen] = useState(false);
  const [newJobType, setNewJobType] = useState<JobType>('CODE_ANALYSIS');
  const [newJobPriority, setNewJobPriority] = useState<JobPriority>(JobPriority.NORMAL);
  const [chaosLog, setChaosLog] = useState<string | null>(null);

  // Filter jobs
  const filteredJobs = jobs.filter((job) => {
    if (selectedState !== 'ALL' && job.state !== selectedState) return false;
    if (selectedType !== 'ALL' && job.jobType !== selectedType) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchId = job.id.toLowerCase().includes(q);
      const matchType = job.jobType.toLowerCase().includes(q);
      const matchWorker = (job.workerId || '').toLowerCase().includes(q);
      if (!matchId && !matchType && !matchWorker) return false;
    }
    return true;
  });

  const handleEnqueueSubmit = () => {
    const newJob: JobRecord = {
      id: `job-${Math.random().toString(36).substring(2, 7)}`,
      jobType: newJobType,
      state: 'QUEUED',
      priority: newJobPriority,
      progress: 0,
      attempt: 0,
      maxRetries: 3,
      backoffMs: 1000,
      timeoutSeconds: 300,
      payload: { target: 'custom-input', timestamp: Date.now() },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      nextRunAt: new Date().toISOString(),
    };

    setJobs((prev) => [newJob, ...prev]);
    setIsEnqueueModalOpen(false);

    // Simulate async progression
    setTimeout(() => {
      setJobs((prev) =>
        prev.map((j) =>
          j.id === newJob.id
            ? { ...j, state: 'PROCESSING', progress: 30, workerId: `worker-${newJobType.toLowerCase()}-01` }
            : j,
        ),
      );
    }, 1200);

    setTimeout(() => {
      setJobs((prev) =>
        prev.map((j) =>
          j.id === newJob.id
            ? { ...j, state: 'COMPLETED', progress: 100, completedAt: new Date().toISOString(), durationMs: 2400 }
            : j,
        ),
      );
    }, 3500);
  };

  const handleRetryJob = (id: string) => {
    setJobs((prev) =>
      prev.map((j) =>
        j.id === id
          ? {
              ...j,
              state: 'PROCESSING',
              attempt: 0,
              progress: 20,
              errorDetails: undefined,
              startedAt: new Date().toISOString(),
            }
          : j,
      ),
    );

    setTimeout(() => {
      setJobs((prev) =>
        prev.map((j) =>
          j.id === id
            ? { ...j, state: 'COMPLETED', progress: 100, completedAt: new Date().toISOString(), durationMs: 2100 }
            : j,
        ),
      );
    }, 2500);
  };

  const handleCancelJob = (id: string) => {
    setJobs((prev) =>
      prev.map((j) =>
        j.id === id
          ? {
              ...j,
              state: 'CANCELLED',
              errorDetails: {
                message: 'Aborted manually by operator',
                failedAt: new Date().toISOString(),
                attempt: j.attempt,
                isRetryable: false,
              },
            }
          : j,
      ),
    );
  };

  const handleChaosTest = (type: string) => {
    switch (type) {
      case 'CRASH':
        setChaosLog('Simulating crash on worker-repository_index-01... Heartbeat stopped.');
        setWorkers((prev) =>
          prev.map((w) => (w.workerId === 'worker-repository_index-01' ? { ...w, status: 'DEAD' } : w)),
        );
        setTimeout(() => {
          setChaosLog('Dead Worker Reaper detected inactive worker (20s). Reclaiming locked jobs to RETRYING.');
          setJobs((prev) =>
            prev.map((j) =>
              j.workerId === 'worker-repository_index-01' && j.state === 'PROCESSING'
                ? { ...j, state: 'RETRYING', attempt: j.attempt + 1, workerId: undefined }
                : j,
            ),
          );
        }, 3000);
        break;
      case 'DUP':
        setChaosLog('Simulating duplicate enqueue with idempotency key "sha_88f9e1"... Request deduplicated successfully.');
        break;
      case 'KAFKA':
        setChaosLog('Simulating Kafka outage: Broker connection severed. Job events buffered into offline memory.');
        break;
      case 'RESTORE':
        setChaosLog('Restoring all services: Kafka & Redis reconnected, workers active.');
        setWorkers((prev) => prev.map((w) => ({ ...w, status: 'ALIVE' })));
        break;
    }
  };

  const getPriorityBadge = (p: JobPriority) => {
    switch (p) {
      case JobPriority.CRITICAL:
        return <Badge variant="destructive" className="font-mono text-[10px]">P1 CRITICAL</Badge>;
      case JobPriority.HIGH:
        return <Badge variant="warning" className="font-mono text-[10px]">P2 HIGH</Badge>;
      case JobPriority.NORMAL:
        return <Badge variant="secondary" className="font-mono text-[10px]">P3 NORMAL</Badge>;
      case JobPriority.LOW:
        return <Badge variant="outline" className="font-mono text-[10px]">P4 LOW</Badge>;
    }
  };

  const getStateBadge = (state: JobState) => {
    switch (state) {
      case 'PROCESSING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
            PROCESSING
          </span>
        );
      case 'QUEUED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Clock className="h-3 w-3" />
            QUEUED
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="h-3 w-3" />
            COMPLETED
          </span>
        );
      case 'RETRYING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <RotateCcw className="h-3 w-3 animate-spin" />
            RETRYING
          </span>
        );
      case 'DEAD_LETTER':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/15 text-red-400 border border-red-500/30">
            <Flame className="h-3 w-3" />
            DEAD LETTER
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-muted text-muted-foreground border border-border">
            <XCircle className="h-3 w-3" />
            CANCELLED
          </span>
        );
      default:
        return <Badge variant="outline">{state}</Badge>;
    }
  };

  const getJobTypeIcon = (type: JobType) => {
    switch (type) {
      case 'REPOSITORY_INDEX':
        return <Layers className="h-4 w-4 text-blue-400" />;
      case 'CODE_ANALYSIS':
        return <Code2 className="h-4 w-4 text-indigo-400" />;
      case 'EMBEDDING_GENERATION':
        return <Sparkles className="h-4 w-4 text-purple-400" />;
      case 'TEST_EXECUTION':
        return <Activity className="h-4 w-4 text-emerald-400" />;
      case 'AI_REVIEW':
        return <Bot className="h-4 w-4 text-pink-400" />;
      case 'DOCUMENTATION':
        return <FileCode className="h-4 w-4 text-amber-400" />;
    }
  };

  return (
    <div className="flex-1 space-y-6 p-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/80 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
              <Cpu className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Distributed Job Processing</h1>
              <p className="text-xs text-muted-foreground font-mono">
                Kafka 3-Tier Retry Bus • Redis Redlock & Heartbeats • PostgreSQL Storage
              </p>
            </div>
          </div>
        </div>

        {/* Infrastructure Status Badges & Actions */}
        <div className="flex items-center gap-3">
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border/70 bg-card/60 text-xs">
            <span className="flex items-center gap-1 text-muted-foreground font-mono">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              KAFKA
            </span>
            <span className="text-border">|</span>
            <span className="flex items-center gap-1 text-muted-foreground font-mono">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              REDIS LOCKS
            </span>
            <span className="text-border">|</span>
            <span className="flex items-center gap-1 text-muted-foreground font-mono">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              POSTGRES
            </span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAutoRefresh(!isAutoRefresh)}
            className={isAutoRefresh ? 'border-primary/50 text-primary' : ''}
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isAutoRefresh ? 'animate-spin' : ''}`} />
            {isAutoRefresh ? 'Auto 3s' : 'Manual'}
          </Button>

          <Button size="sm" onClick={() => setIsEnqueueModalOpen(true)} className="gap-1.5 shadow-md shadow-primary/20">
            <Plus className="h-4 w-4" />
            Enqueue Job
          </Button>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        <Card className="p-3.5 border-border/70 bg-card/50 backdrop-blur-sm">
          <div className="text-[11px] font-semibold uppercase text-muted-foreground tracking-wider">Total Jobs</div>
          <div className="text-2xl font-bold mt-1 font-mono">{jobs.length}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">All time enqueued</div>
        </Card>

        <Card className="p-3.5 border-blue-500/30 bg-blue-500/5 backdrop-blur-sm">
          <div className="text-[11px] font-semibold uppercase text-blue-400 tracking-wider flex items-center justify-between">
            Processing
            <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
          </div>
          <div className="text-2xl font-bold mt-1 font-mono text-blue-400">
            {jobs.filter((j) => j.state === 'PROCESSING').length}
          </div>
          <div className="text-[10px] text-blue-400/70 mt-0.5">Active worker leases</div>
        </Card>

        <Card className="p-3.5 border-amber-500/30 bg-amber-500/5 backdrop-blur-sm">
          <div className="text-[11px] font-semibold uppercase text-amber-400 tracking-wider">Queued</div>
          <div className="text-2xl font-bold mt-1 font-mono text-amber-400">
            {jobs.filter((j) => j.state === 'QUEUED').length}
          </div>
          <div className="text-[10px] text-amber-400/70 mt-0.5">Waiting in Kafka</div>
        </Card>

        <Card className="p-3.5 border-purple-500/30 bg-purple-500/5 backdrop-blur-sm">
          <div className="text-[11px] font-semibold uppercase text-purple-400 tracking-wider">Retrying</div>
          <div className="text-2xl font-bold mt-1 font-mono text-purple-400">
            {jobs.filter((j) => j.state === 'RETRYING').length}
          </div>
          <div className="text-[10px] text-purple-400/70 mt-0.5">Exponential backoff</div>
        </Card>

        <Card className="p-3.5 border-emerald-500/30 bg-emerald-500/5 backdrop-blur-sm">
          <div className="text-[11px] font-semibold uppercase text-emerald-400 tracking-wider">Completed</div>
          <div className="text-2xl font-bold mt-1 font-mono text-emerald-400">
            {jobs.filter((j) => j.state === 'COMPLETED').length}
          </div>
          <div className="text-[10px] text-emerald-400/70 mt-0.5">Success: 96.4%</div>
        </Card>

        <Card className="p-3.5 border-red-500/30 bg-red-500/5 backdrop-blur-sm">
          <div className="text-[11px] font-semibold uppercase text-red-400 tracking-wider">Dead Letter</div>
          <div className="text-2xl font-bold mt-1 font-mono text-red-400">
            {jobs.filter((j) => j.state === 'DEAD_LETTER').length}
          </div>
          <div className="text-[10px] text-red-400/70 mt-0.5">DLQ topic review</div>
        </Card>

        <Card className="p-3.5 border-border/70 bg-card/50 backdrop-blur-sm">
          <div className="text-[11px] font-semibold uppercase text-muted-foreground tracking-wider">Workers</div>
          <div className="text-2xl font-bold mt-1 font-mono text-foreground">
            {workers.filter((w) => w.status !== 'DEAD').length} / {workers.length}
          </div>
          <div className="text-[10px] text-emerald-400 mt-0.5">Heartbeats alive</div>
        </Card>
      </div>

      {/* Main Grid: Jobs Table + Worker Fleet & Chaos Panel */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Left 3 Cols: Filter Bar + Jobs Table */}
        <div className="xl:col-span-3 space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-xl border border-border/70 bg-card/50 backdrop-blur-sm">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Filter by Job ID, type, worker..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-8 pl-8 pr-3 text-xs bg-muted/40 border border-border/60 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* State Filter */}
              <select
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
                className="h-8 px-2.5 text-xs bg-muted/40 border border-border/60 rounded-lg text-foreground focus:outline-none"
              >
                <option value="ALL">All States</option>
                <option value="PROCESSING">Processing</option>
                <option value="QUEUED">Queued</option>
                <option value="RETRYING">Retrying</option>
                <option value="COMPLETED">Completed</option>
                <option value="DEAD_LETTER">Dead Letter</option>
                <option value="CANCELLED">Cancelled</option>
              </select>

              {/* Type Filter */}
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="h-8 px-2.5 text-xs bg-muted/40 border border-border/60 rounded-lg text-foreground focus:outline-none"
              >
                <option value="ALL">All Types</option>
                <option value="REPOSITORY_INDEX">Repository Index</option>
                <option value="CODE_ANALYSIS">Code Analysis</option>
                <option value="EMBEDDING_GENERATION">Embedding Gen</option>
                <option value="TEST_EXECUTION">Test Execution</option>
                <option value="AI_REVIEW">AI Review</option>
                <option value="DOCUMENTATION">Documentation</option>
              </select>
            </div>

            <div className="text-xs text-muted-foreground font-mono">
              Showing {filteredJobs.length} of {jobs.length} jobs
            </div>
          </div>

          {/* Jobs Data Table */}
          <div className="border border-border/70 rounded-xl bg-card/60 backdrop-blur-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-muted-foreground font-mono uppercase text-[10px]">
                    <th className="py-3 px-4">Job / Type</th>
                    <th className="py-3 px-4">State</th>
                    <th className="py-3 px-4">Priority</th>
                    <th className="py-3 px-4">Progress</th>
                    <th className="py-3 px-4">Worker</th>
                    <th className="py-3 px-4">Retries</th>
                    <th className="py-3 px-4">Duration</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {filteredJobs.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-muted-foreground">
                        No jobs match the current filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredJobs.map((job) => (
                      <tr
                        key={job.id}
                        onClick={() => setSelectedJob(job)}
                        className="hover:bg-muted/30 cursor-pointer transition-colors"
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="p-1.5 rounded-lg bg-muted/60 border border-border/50">
                              {getJobTypeIcon(job.jobType)}
                            </div>
                            <div>
                              <div className="font-semibold text-foreground flex items-center gap-1.5">
                                {job.jobType}
                              </div>
                              <div className="font-mono text-[10px] text-muted-foreground">
                                {job.id.substring(0, 16)}...
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">{getStateBadge(job.state)}</td>
                        <td className="py-3 px-4">{getPriorityBadge(job.priority)}</td>
                        <td className="py-3 px-4 min-w-[120px]">
                          <div className="flex items-center gap-2">
                            <div className="w-full bg-muted/50 h-1.5 rounded-full overflow-hidden border border-border/30">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  job.state === 'COMPLETED'
                                    ? 'bg-emerald-500'
                                    : job.state === 'DEAD_LETTER' || job.state === 'FAILED'
                                      ? 'bg-red-500'
                                      : 'bg-primary animate-pulse'
                                }`}
                                style={{ width: `${job.progress}%` }}
                              />
                            </div>
                            <span className="font-mono text-[10px] text-muted-foreground w-7 text-right">
                              {job.progress}%
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-muted-foreground">
                          {job.workerId ? (
                            <span className="text-primary font-medium">{job.workerId.replace('worker-', '')}</span>
                          ) : (
                            <span className="text-muted-foreground/60 italic">unassigned</span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px]">
                          <span
                            className={
                              job.attempt > 0
                                ? job.attempt >= job.maxRetries
                                  ? 'text-red-400 font-bold'
                                  : 'text-amber-400 font-medium'
                                : 'text-muted-foreground'
                            }
                          >
                            {job.attempt} / {job.maxRetries}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-muted-foreground">
                          {job.durationMs ? `${(job.durationMs / 1000).toFixed(1)}s` : '—'}
                        </td>
                        <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            {job.state === 'PROCESSING' || job.state === 'QUEUED' ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                onClick={() => handleCancelJob(job.id)}
                              >
                                Cancel
                              </Button>
                            ) : null}

                            {job.state === 'DEAD_LETTER' || job.state === 'FAILED' || job.state === 'CANCELLED' ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-xs gap-1 text-purple-400 border-purple-500/30 hover:bg-purple-500/10"
                                onClick={() => handleRetryJob(job.id)}
                              >
                                <RotateCcw className="h-3 w-3" />
                                Retry
                              </Button>
                            ) : null}

                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-xs"
                              onClick={() => setSelectedJob(job)}
                            >
                              Details
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Worker Fleet & Chaos Engineering Simulator */}
        <div className="space-y-6">
          {/* Worker Fleet Monitor Card */}
          <Card className="p-4 border-border/70 bg-card/60 backdrop-blur-sm space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold tracking-tight flex items-center gap-1.5">
                <Server className="h-4 w-4 text-primary" />
                Active Worker Fleet
              </h2>
              <Badge variant="outline" className="text-[10px] font-mono">
                {workers.length} Nodes
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Independently scalable consumers reporting heartbeats every 3 seconds.
            </p>

            <div className="space-y-2 pt-1">
              {workers.map((worker) => (
                <div
                  key={worker.workerId}
                  className="p-2.5 rounded-lg border border-border/60 bg-muted/20 space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                      {getJobTypeIcon(worker.workerType)}
                      {worker.workerType}
                    </span>
                    <span
                      className={`text-[9px] font-mono px-1.5 py-0.5 rounded-full border ${
                        worker.status === 'ALIVE'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : worker.status === 'BUSY'
                            ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                            : 'bg-red-500/10 text-red-400 border-red-500/30'
                      }`}
                    >
                      {worker.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono">
                    <span>
                      Active: {worker.activeJobsCount} / {worker.concurrency}
                    </span>
                    <span>Processed: {worker.processedCount}</span>
                    <span>{worker.hostname.substring(0, 14)}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Chaos / Failure Simulator Card */}
          <Card className="p-4 border-amber-500/30 bg-amber-500/5 backdrop-blur-sm space-y-3">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-amber-400" />
              <h2 className="text-sm font-bold tracking-tight text-amber-400">Chaos Engineering Lab</h2>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Simulate infrastructure outages and verify dead-letter, heartbeat reclamation, and deduplication.
            </p>

            <div className="space-y-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start text-xs border-red-500/30 text-red-400 hover:bg-red-500/10"
                onClick={() => handleChaosTest('CRASH')}
              >
                <Flame className="h-3.5 w-3.5 mr-2" />
                Simulate Worker Crash (Dead Reaper)
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start text-xs border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
                onClick={() => handleChaosTest('DUP')}
              >
                <Zap className="h-3.5 w-3.5 mr-2" />
                Test Idempotency Deduplication
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start text-xs border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                onClick={() => handleChaosTest('KAFKA')}
              >
                <AlertTriangle className="h-3.5 w-3.5 mr-2" />
                Simulate Kafka Outage (Buffer)
              </Button>

              <Button
                variant="default"
                size="sm"
                className="w-full justify-start text-xs mt-1"
                onClick={() => handleChaosTest('RESTORE')}
              >
                <RotateCcw className="h-3.5 w-3.5 mr-2" />
                Restore All Services Healthy
              </Button>
            </div>

            {chaosLog && (
              <div className="mt-2 p-2 rounded bg-black/40 border border-border text-[10px] font-mono text-emerald-400 whitespace-pre-wrap">
                {chaosLog}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Enqueue Modal */}
      {isEnqueueModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-card border border-border rounded-xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-base flex items-center gap-2">
                <Plus className="h-4 w-4 text-primary" />
                Dispatch Distributed Job
              </h3>
              <button onClick={() => setIsEnqueueModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-muted-foreground font-medium mb-1">Job Type</label>
                <select
                  value={newJobType}
                  onChange={(e) => setNewJobType(e.target.value as JobType)}
                  className="w-full h-9 px-3 bg-muted/40 border border-border rounded-lg text-foreground"
                >
                  <option value="REPOSITORY_INDEX">REPOSITORY_INDEX (AST Parsing & Chunks)</option>
                  <option value="CODE_ANALYSIS">CODE_ANALYSIS (Lint & Complexity Metrics)</option>
                  <option value="EMBEDDING_GENERATION">EMBEDDING_GENERATION (1536-dim Vectors)</option>
                  <option value="TEST_EXECUTION">TEST_EXECUTION (Sandboxed Unit Test)</option>
                  <option value="AI_REVIEW">AI_REVIEW (Semantic PR Review)</option>
                  <option value="DOCUMENTATION">DOCUMENTATION (Markdown & Diagrams)</option>
                </select>
              </div>

              <div>
                <label className="block text-muted-foreground font-medium mb-1">Priority</label>
                <select
                  value={newJobPriority}
                  onChange={(e) => setNewJobPriority(parseInt(e.target.value, 10) as JobPriority)}
                  className="w-full h-9 px-3 bg-muted/40 border border-border rounded-lg text-foreground"
                >
                  <option value={JobPriority.CRITICAL}>P1 — CRITICAL (High-priority PR)</option>
                  <option value={JobPriority.HIGH}>P2 — HIGH (Interactive task)</option>
                  <option value={JobPriority.NORMAL}>P3 — NORMAL (Background queue)</option>
                  <option value={JobPriority.LOW}>P4 — LOW (Batch maintenance)</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setIsEnqueueModalOpen(false)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleEnqueueSubmit}>
                  Dispatch to Kafka Bus
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Job Details Drawer */}
      {selectedJob && (
        <div className="fixed inset-y-0 right-0 z-50 w-full max-w-xl bg-card/95 backdrop-blur-xl border-l border-border p-6 shadow-2xl overflow-y-auto space-y-5 animate-in slide-in-from-right duration-200">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">{getJobTypeIcon(selectedJob.jobType)}</div>
              <div>
                <h3 className="font-bold text-base">{selectedJob.jobType}</h3>
                <span className="font-mono text-xs text-muted-foreground">{selectedJob.id}</span>
              </div>
            </div>
            <button onClick={() => setSelectedJob(null)} className="text-muted-foreground hover:text-foreground text-sm font-bold">
              ✕
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-lg border border-border bg-muted/20">
              <div className="text-muted-foreground font-mono text-[10px]">CURRENT STATE</div>
              <div className="mt-1">{getStateBadge(selectedJob.state)}</div>
            </div>
            <div className="p-3 rounded-lg border border-border bg-muted/20">
              <div className="text-muted-foreground font-mono text-[10px]">PRIORITY TIER</div>
              <div className="mt-1">{getPriorityBadge(selectedJob.priority)}</div>
            </div>
          </div>

          {/* Error Diagnostics if failed or retrying */}
          {selectedJob.errorDetails && (
            <div className="p-3 rounded-lg border border-red-500/40 bg-red-500/10 space-y-1 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-red-400">
                <AlertCircle className="h-4 w-4" />
                Error Diagnostics (Attempt {selectedJob.attempt}/{selectedJob.maxRetries})
              </div>
              <p className="text-red-300 font-mono text-[11px]">{selectedJob.errorDetails.message}</p>
              {selectedJob.errorDetails.deadLetterReason && (
                <p className="text-red-400/90 text-[10px] font-semibold">
                  DLQ Reason: {selectedJob.errorDetails.deadLetterReason}
                </p>
              )}
            </div>
          )}

          {/* Payload JSON */}
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-muted-foreground uppercase font-mono">Job Payload</span>
            <pre className="p-3 rounded-lg bg-muted/40 border border-border text-[11px] font-mono text-foreground overflow-x-auto">
              {JSON.stringify(selectedJob.payload, null, 2)}
            </pre>
          </div>

          {/* Result JSON if present */}
          {selectedJob.result && (
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-emerald-400 uppercase font-mono">Execution Result</span>
              <pre className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-[11px] font-mono text-emerald-300 overflow-x-auto">
                {JSON.stringify(selectedJob.result, null, 2)}
              </pre>
            </div>
          )}

          <div className="pt-4 border-t border-border flex justify-end gap-2">
            {selectedJob.state === 'DEAD_LETTER' || selectedJob.state === 'CANCELLED' ? (
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-purple-400 border-purple-500/30"
                onClick={() => {
                  handleRetryJob(selectedJob.id);
                  setSelectedJob(null);
                }}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Re-Queue Job
              </Button>
            ) : null}
            <Button size="sm" variant="secondary" onClick={() => setSelectedJob(null)}>
              Close
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

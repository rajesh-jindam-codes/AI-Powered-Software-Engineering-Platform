'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Activity,
  ShieldCheck,
  Server,
  Zap,
  Clock,
  Cpu,
  Layers,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Terminal,
  RefreshCw,
  GitPullRequest,
  Database,
  Lock,
  Eye,
  FileCode,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import {
  SystemTelemetryMetrics,
  DistributedTrace,
  DistributedSpan,
  SecurityComplianceReport,
  AuditLogEntry,
} from '@devflow/shared-types';

const INITIAL_METRICS: SystemTelemetryMetrics = {
  totalRequests: 1420,
  requestsPerSecond: 18.4,
  errorRatePercentage: 0.8,
  httpLatency: { p50: 25, p95: 85, p99: 145, avg: 34.2, min: 12, max: 180 },
  aiLatency: { p50: 380, p95: 890, p99: 1150, avg: 442.0, min: 210, max: 1280 },
  tokensConsumedTotal: 485000,
  queueDepth: {
    'devflow.jobs.repository-index.v1': 0,
    'devflow.jobs.code-analysis.v1': 2,
    'devflow.jobs.embedding-generation.v1': 0,
    'devflow.jobs.test-execution.v1': 0,
    'devflow.jobs.ai-review.v1': 1,
    'devflow.jobs.dlq.v1': 0,
  },
  cacheHitRatioPercentage: 89.0,
  uptimeSeconds: 7200,
  activeWorkersCount: 6,
  timestamp: new Date().toISOString(),
};

const INITIAL_TRACES: DistributedTrace[] = [
  {
    traceId: 'tr_rag_88f91a',
    rootOperation: 'POST /api/v1/intelligence/rag/query ("Where is auth implemented?")',
    totalDurationMs: 462,
    status: 'OK',
    timestamp: new Date(Date.now() - 45000).toISOString(),
    spans: [
      {
        spanId: 'sp_fe_01',
        tier: 'FRONTEND',
        name: 'Next.js Client: Trigger Codebase RAG Query',
        service: 'devflow-web',
        durationMs: 462,
        startTimeMs: 0,
        status: 'OK',
        attributes: { httpRoute: '/chat', userQuery: 'Where is auth implemented?' },
      },
      {
        spanId: 'sp_api_01',
        parentSpanId: 'sp_fe_01',
        tier: 'API',
        name: 'NestJS: RagController.queryCodebase',
        service: 'devflow-api',
        durationMs: 440,
        startTimeMs: 12,
        status: 'OK',
        attributes: { controller: 'RagController', handler: 'queryCodebase' },
      },
      {
        spanId: 'sp_redis_01',
        parentSpanId: 'sp_api_01',
        tier: 'REDIS',
        name: 'Redis: Check Query Embedding Cache',
        service: 'redis-cluster',
        durationMs: 4,
        startTimeMs: 18,
        status: 'OK',
        attributes: { cacheKey: 'embed:hash:auth_query', cacheHit: false },
      },
      {
        spanId: 'sp_ai_01',
        parentSpanId: 'sp_api_01',
        tier: 'AI_SERVICE',
        name: 'FastAPI AI Engine: Generate Query Embedding (text-embedding-3-small)',
        service: 'devflow-ai-service',
        durationMs: 140,
        startTimeMs: 25,
        status: 'OK',
        attributes: { model: 'text-embedding-3-small', dimension: 1536 },
      },
      {
        spanId: 'sp_db_01',
        parentSpanId: 'sp_api_01',
        tier: 'POSTGRES',
        name: 'PostgreSQL: Hybrid pgvector Cosine Search <=> (Top 8 chunks)',
        service: 'postgres-pgvector',
        durationMs: 38,
        startTimeMs: 170,
        status: 'OK',
        attributes: { chunksRetrieved: 8, executionPlan: 'HNSW Index Scan' },
      },
      {
        spanId: 'sp_ai_02',
        parentSpanId: 'sp_api_01',
        tier: 'AI_SERVICE',
        name: 'FastAPI AI Engine: LLM Answer Synthesis with Citations',
        service: 'devflow-ai-service',
        durationMs: 240,
        startTimeMs: 212,
        status: 'OK',
        attributes: { model: 'devflow-code-rag-v1', tokensGenerated: 340 },
      },
    ],
  },
  {
    traceId: 'tr_rev_441b9c',
    rootOperation: 'POST /api/v1/reviews/trigger (PR #182 Checkout VAT Tax)',
    totalDurationMs: 1280,
    status: 'OK',
    timestamp: new Date(Date.now() - 140000).toISOString(),
    spans: [
      {
        spanId: 'sp_fe_02',
        tier: 'FRONTEND',
        name: 'Next.js Client: Trigger PR Code Review',
        service: 'devflow-web',
        durationMs: 1280,
        startTimeMs: 0,
        status: 'OK',
        attributes: { prNumber: 182, repo: 'devflow-ai/api' },
      },
      {
        spanId: 'sp_api_02',
        parentSpanId: 'sp_fe_02',
        tier: 'API',
        name: 'NestJS: ReviewsController.triggerReview',
        service: 'devflow-api',
        durationMs: 1260,
        startTimeMs: 10,
        status: 'OK',
        attributes: { prNumber: 182 },
      },
      {
        spanId: 'sp_kafka_01',
        parentSpanId: 'sp_api_02',
        tier: 'KAFKA',
        name: 'Kafka: Publish Job to devflow.jobs.ai-review.v1',
        service: 'kafka-cluster',
        durationMs: 15,
        startTimeMs: 25,
        status: 'OK',
        attributes: { topic: 'devflow.jobs.ai-review.v1', partition: 1, offset: 402 },
      },
      {
        spanId: 'sp_worker_01',
        parentSpanId: 'sp_kafka_01',
        tier: 'WORKER',
        name: 'Distributed Worker: Consume & Execute ReviewWorker',
        service: 'worker-ai_review-01',
        durationMs: 1200,
        startTimeMs: 45,
        status: 'OK',
        attributes: { workerId: 'worker-ai_review-01', concurrency: 3 },
      },
      {
        spanId: 'sp_ai_03',
        parentSpanId: 'sp_worker_01',
        tier: 'AI_SERVICE',
        name: 'FastAPI AI Engine: Multi-Category Security & Quality Analysis',
        service: 'devflow-ai-service',
        durationMs: 980,
        startTimeMs: 210,
        status: 'OK',
        attributes: { findingsCount: 2, confidenceScore: 0.96 },
      },
    ],
  },
];

const INITIAL_REPORT: SecurityComplianceReport = {
  overallScore: 98,
  status: 'COMPLIANT',
  generatedAt: new Date().toISOString(),
  checks: [
    {
      category: 'Authentication & RBAC',
      name: 'Multi-Tenant Workspace RBAC & JWT Signatures',
      status: 'PASS',
      description: 'All routes enforce verified JWT signatures and strict workspace tenant boundaries.',
    },
    {
      category: 'Network & SSRF',
      name: 'SSRF URL Validation & Loopback Filter',
      status: 'PASS',
      description: 'Outbound webhooks and integrations filter internal IPs, localhost, and AWS metadata.',
    },
    {
      category: 'Sandbox Isolation',
      name: 'gVisor Test Container Quotas',
      status: 'PASS',
      description: 'Test runner enforces 1.0 CPU, 512MB RAM, 15s timeout, and prohibits host shell execution.',
    },
    {
      category: 'Secret Protection',
      name: 'Outbound Secret & API Key Sanitization',
      status: 'PASS',
      description: 'Automated scrubber masks sk-***, ghp_***, and Bearer tokens in responses and logs.',
    },
    {
      category: 'Injection Defenses',
      name: 'SQL & AST Parameterization',
      status: 'PASS',
      description: 'All database and pgvector queries use parameterized arguments.',
    },
    {
      category: 'Rate Limiting',
      name: 'API Throttling & DDoS Protection',
      status: 'PASS',
      description: 'ThrottlerGuard active with 120 req/min sliding window limit.',
    },
  ],
};

const INITIAL_AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: 'audit_001',
    action: 'USER_LOGIN',
    userEmail: 'rajesh@devflow.ai',
    userId: 'usr_rajesh_01',
    resource: 'auth:jwt',
    status: 'SUCCESS',
    ipAddress: '192.168.1.45',
    timestamp: new Date(Date.now() - 120000).toISOString(),
    details: { provider: 'github_oauth', role: 'STAFF_ENGINEER' },
  },
  {
    id: 'audit_002',
    action: 'REPOSITORY_CONNECTED',
    userEmail: 'rajesh@devflow.ai',
    userId: 'usr_rajesh_01',
    resource: 'repo:devflow-ai/api',
    status: 'SUCCESS',
    ipAddress: '192.168.1.45',
    timestamp: new Date(Date.now() - 240000).toISOString(),
    details: { repoId: 'repo_devflow', defaultBranch: 'main' },
  },
  {
    id: 'audit_003',
    action: 'MEMBER_ROLE_UPDATED',
    userEmail: 'rajesh@devflow.ai',
    userId: 'usr_rajesh_01',
    resource: 'workspace:ws_devflow_primary:member:usr_priya_03',
    status: 'SUCCESS',
    ipAddress: '192.168.1.45',
    timestamp: new Date(Date.now() - 360000).toISOString(),
    details: { targetUser: 'priya@devflow.ai', oldRole: 'DEVELOPER', newRole: 'SENIOR_DEVELOPER' },
  },
  {
    id: 'audit_004',
    action: 'AI_TASK_DISPATCHED',
    userEmail: 'priya@devflow.ai',
    userId: 'usr_priya_03',
    resource: 'agent:debugging_agent:task_dbg_01',
    status: 'SUCCESS',
    ipAddress: '192.168.1.88',
    timestamp: new Date(Date.now() - 480000).toISOString(),
    details: { goal: 'Why is checkout failing?', model: 'devflow-code-rag-v1' },
  },
  {
    id: 'audit_005',
    action: 'PR_REVIEW_TRIGGERED',
    userEmail: 'rahul@devflow.ai',
    userId: 'usr_rahul_02',
    resource: 'review:pr_182',
    status: 'SUCCESS',
    ipAddress: '192.168.1.72',
    timestamp: new Date(Date.now() - 600000).toISOString(),
    details: { prNumber: 182, findingsCount: 2 },
  },
  {
    id: 'audit_006',
    action: 'PATCH_APPLIED',
    userEmail: 'rahul@devflow.ai',
    userId: 'usr_rahul_02',
    resource: 'patch:checkout_vat_tax',
    status: 'SUCCESS',
    ipAddress: '192.168.1.72',
    timestamp: new Date(Date.now() - 720000).toISOString(),
    details: { file: 'checkout.service.ts', verifiedInSandbox: true },
  },
];

export default function ObservabilityPage() {
  const [metrics] = useState<SystemTelemetryMetrics>(INITIAL_METRICS);
  const [traces] = useState<DistributedTrace[]>(INITIAL_TRACES);
  const [selectedTrace, setSelectedTrace] = useState<DistributedTrace>(INITIAL_TRACES[0]);
  const [selectedSpan, setSelectedSpan] = useState<DistributedSpan | null>(INITIAL_TRACES[0].spans[0]);
  const [report] = useState<SecurityComplianceReport>(INITIAL_REPORT);
  const [auditLogs] = useState<AuditLogEntry[]>(INITIAL_AUDIT_LOGS);
  const [auditSearch, setAuditSearch] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'metrics' | 'traces' | 'security' | 'audit'>('metrics');
  const [showPrometheusRaw, setShowPrometheusRaw] = useState<boolean>(false);

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'FRONTEND':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'API':
        return 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30';
      case 'POSTGRES':
        return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';
      case 'REDIS':
        return 'bg-rose-500/20 text-rose-400 border-rose-500/30';
      case 'KAFKA':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'WORKER':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'AI_SERVICE':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const filteredLogs = auditLogs.filter(
    (l) =>
      l.action.toLowerCase().includes(auditSearch.toLowerCase()) ||
      (l.userEmail && l.userEmail.toLowerCase().includes(auditSearch.toLowerCase())) ||
      (l.resource && l.resource.toLowerCase().includes(auditSearch.toLowerCase())),
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border/80 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-mono tracking-widest text-primary font-bold uppercase bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
              PHASE 13
            </span>
            <span className="text-xs text-muted-foreground font-mono">
              OpenTelemetry • Prometheus • 6-Tier Tracing • SSRF Defenses
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground via-foreground/90 to-foreground/70 bg-clip-text text-transparent flex items-center gap-2.5">
            <Activity className="h-7 w-7 text-primary" />
            Security & Observability Cockpit
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time Prometheus telemetry, P50/P95/P99 latency percentiles, OpenTelemetry distributed tracing, security compliance matrix, and immutable audit logs.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 gap-1.5 font-mono text-xs px-2.5 py-1">
            <ShieldCheck className="h-3.5 w-3.5" />
            Security Score: {report.overallScore}% ({report.status})
          </Badge>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowPrometheusRaw(!showPrometheusRaw)}
            className="gap-1.5 font-mono text-xs border-border/80 bg-card/60"
          >
            <Terminal className="h-3.5 w-3.5 text-primary" />
            {showPrometheusRaw ? 'Hide Prometheus' : 'Scrape /metrics'}
          </Button>
        </div>
      </div>

      {/* Raw Prometheus Modal / Dropdown */}
      {showPrometheusRaw && (
        <Card className="border-border/80 bg-black/95 backdrop-blur-xl">
          <CardHeader className="p-3 border-b border-border/40 flex flex-row items-center justify-between">
            <span className="text-xs font-mono text-emerald-400 font-bold">
              GET /metrics (Prometheus Exposition Format)
            </span>
            <Badge variant="outline" className="text-[10px] font-mono text-emerald-400 border-emerald-500/30">
              text/plain; version=0.0.4
            </Badge>
          </CardHeader>
          <CardContent className="p-4">
            <pre className="font-mono text-xs text-emerald-400 overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-[220px]">
              <code>{`# HELP devflow_http_requests_total Total number of HTTP requests processed
# TYPE devflow_http_requests_total counter
devflow_http_requests_total ${metrics.totalRequests}

# HELP devflow_http_request_duration_ms HTTP request latency percentiles in milliseconds
# TYPE devflow_http_request_duration_ms summary
devflow_http_request_duration_ms{quantile="0.5"} ${metrics.httpLatency.p50}
devflow_http_request_duration_ms{quantile="0.95"} ${metrics.httpLatency.p95}
devflow_http_request_duration_ms{quantile="0.99"} ${metrics.httpLatency.p99}

# HELP devflow_ai_latency_ms AI RAG & Agent execution latency in milliseconds
# TYPE devflow_ai_latency_ms summary
devflow_ai_latency_ms{quantile="0.5"} ${metrics.aiLatency.p50}
devflow_ai_latency_ms{quantile="0.95"} ${metrics.aiLatency.p95}
devflow_ai_latency_ms{quantile="0.99"} ${metrics.aiLatency.p99}

# HELP devflow_ai_tokens_consumed_total Total LLM tokens consumed across providers
# TYPE devflow_ai_tokens_consumed_total counter
devflow_ai_tokens_consumed_total ${metrics.tokensConsumedTotal}

# HELP devflow_redis_cache_hit_ratio Percentage of Redis cache hits
# TYPE devflow_redis_cache_hit_ratio gauge
devflow_redis_cache_hit_ratio ${metrics.cacheHitRatioPercentage}`}</code>
            </pre>
          </CardContent>
        </Card>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-border/80 pb-2">
        {[
          { id: 'metrics', label: 'Prometheus Telemetry', icon: Activity },
          { id: 'traces', label: 'Distributed Tracing (6 Tiers)', icon: Server },
          { id: 'security', label: 'Security & SSRF Compliance', icon: ShieldCheck },
          { id: 'audit', label: 'Audit Trail Logs', icon: FileCode },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                active
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: Prometheus Metrics */}
      {activeTab === 'metrics' && (
        <div className="space-y-6">
          {/* Top KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="border-border/80 bg-card/60 backdrop-blur-xl">
              <CardContent className="p-4 space-y-1">
                <span className="text-[11px] font-mono text-muted-foreground uppercase flex items-center justify-between">
                  HTTP Latency P95
                  <Clock className="h-3.5 w-3.5 text-blue-400" />
                </span>
                <div className="text-2xl font-bold text-foreground">
                  {metrics.httpLatency.p95} <span className="text-xs font-normal text-muted-foreground">ms</span>
                </div>
                <div className="text-[10px] text-muted-foreground font-mono">
                  P50: {metrics.httpLatency.p50}ms • P99: {metrics.httpLatency.p99}ms
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/80 bg-card/60 backdrop-blur-xl">
              <CardContent className="p-4 space-y-1">
                <span className="text-[11px] font-mono text-muted-foreground uppercase flex items-center justify-between">
                  AI Pipeline P95
                  <Zap className="h-3.5 w-3.5 text-purple-400" />
                </span>
                <div className="text-2xl font-bold text-foreground">
                  {metrics.aiLatency.p95} <span className="text-xs font-normal text-muted-foreground">ms</span>
                </div>
                <div className="text-[10px] text-muted-foreground font-mono">
                  P50: {metrics.aiLatency.p50}ms • P99: {metrics.aiLatency.p99}ms
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/80 bg-card/60 backdrop-blur-xl">
              <CardContent className="p-4 space-y-1">
                <span className="text-[11px] font-mono text-muted-foreground uppercase flex items-center justify-between">
                  Error Rate
                  <AlertTriangle className="h-3.5 w-3.5 text-emerald-400" />
                </span>
                <div className="text-2xl font-bold text-emerald-400">
                  {metrics.errorRatePercentage}%
                </div>
                <div className="text-[10px] text-muted-foreground font-mono">
                  {metrics.totalRequests.toLocaleString()} Total Requests
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/80 bg-card/60 backdrop-blur-xl">
              <CardContent className="p-4 space-y-1">
                <span className="text-[11px] font-mono text-muted-foreground uppercase flex items-center justify-between">
                  Cache Hit Ratio
                  <Database className="h-3.5 w-3.5 text-cyan-400" />
                </span>
                <div className="text-2xl font-bold text-foreground">
                  {metrics.cacheHitRatioPercentage}%
                </div>
                <div className="text-[10px] text-muted-foreground font-mono">
                  Redis Cluster Active
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Secondary Details: Tokens & Kafka Queue Depth */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-border/80 bg-card/60 backdrop-blur-xl">
              <CardHeader className="p-4 pb-2 border-b border-border/60">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Zap className="h-3.5 w-3.5 text-primary" />
                  AI Token Consumption & Model Costs
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-muted-foreground">Cumulative Token Usage:</span>
                  <span className="text-foreground font-bold">{metrics.tokensConsumedTotal.toLocaleString()} tokens</span>
                </div>
                <div className="w-full bg-muted/40 rounded-full h-2 overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2 w-3/5" />
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono pt-1">
                  <div className="p-2 rounded bg-muted/20 border border-border/40">
                    <span className="text-[10px] text-muted-foreground block">GPT-4o</span>
                    <span className="font-bold text-foreground">280k</span>
                  </div>
                  <div className="p-2 rounded bg-muted/20 border border-border/40">
                    <span className="text-[10px] text-muted-foreground block">Claude 3.5</span>
                    <span className="font-bold text-foreground">140k</span>
                  </div>
                  <div className="p-2 rounded bg-muted/20 border border-border/40">
                    <span className="text-[10px] text-muted-foreground block">Gemini 1.5</span>
                    <span className="font-bold text-foreground">65k</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/80 bg-card/60 backdrop-blur-xl">
              <CardHeader className="p-4 pb-2 border-b border-border/60">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Server className="h-3.5 w-3.5 text-primary" />
                  Kafka Distributed Job Queue Depths
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-2 text-xs font-mono">
                {Object.entries(metrics.queueDepth).map(([topic, depth]) => (
                  <div key={topic} className="flex items-center justify-between p-1.5 rounded bg-muted/10 border border-border/40">
                    <span className="text-muted-foreground truncate max-w-[280px]">{topic}</span>
                    <Badge variant={depth === 0 ? 'outline' : 'default'} className="text-[10px] h-4">
                      {depth} pending
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 2: Distributed Tracing Waterfall Explorer */}
      {activeTab === 'traces' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Traces List */}
          <div className="lg:col-span-4 space-y-3">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
              Recorded Distributed Traces ({traces.length})
            </span>
            {traces.map((trace) => {
              const isSelected = selectedTrace.traceId === trace.traceId;
              return (
                <div
                  key={trace.traceId}
                  onClick={() => {
                    setSelectedTrace(trace);
                    setSelectedSpan(trace.spans[0]);
                  }}
                  className={`p-3 rounded-lg border text-xs cursor-pointer transition-all ${
                    isSelected
                      ? 'border-primary bg-primary/10 shadow-sm'
                      : 'border-border/60 bg-card/60 hover:border-border'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold text-foreground">
                    <span className="truncate">{trace.rootOperation}</span>
                    <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px] h-4">
                      {trace.status}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between mt-2 text-[10px] text-muted-foreground font-mono">
                    <span>{trace.spans.length} spans</span>
                    <span>{trace.totalDurationMs} ms</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Trace Waterfall Breakdown */}
          <div className="lg:col-span-8 space-y-4">
            <Card className="border-border/80 bg-card/60 backdrop-blur-xl">
              <CardHeader className="p-4 border-b border-border/60">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                      <Server className="h-4 w-4 text-primary" />
                      Trace: {selectedTrace.traceId}
                    </CardTitle>
                    <CardDescription className="text-xs font-mono mt-0.5">
                      Total Duration: {selectedTrace.totalDurationMs} ms • {selectedTrace.spans.length} Tiers
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="font-mono text-xs">
                    W3C traceparent active
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="p-4 space-y-3">
                {/* Spans Waterfall Chart */}
                <div className="space-y-2">
                  {selectedTrace.spans.map((span) => {
                    const isSelected = selectedSpan?.spanId === span.spanId;
                    const leftPercent = (span.startTimeMs / Math.max(1, selectedTrace.totalDurationMs)) * 100;
                    const widthPercent = Math.max(8, (span.durationMs / Math.max(1, selectedTrace.totalDurationMs)) * 100);

                    return (
                      <div
                        key={span.spanId}
                        onClick={() => setSelectedSpan(span)}
                        className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                          isSelected ? 'border-primary bg-primary/10' : 'border-border/40 bg-muted/10 hover:bg-muted/30'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[11px] mb-1.5">
                          <div className="flex items-center gap-2 min-w-0">
                            <Badge variant="outline" className={`text-[9px] font-mono px-1 py-0 ${getTierColor(span.tier)}`}>
                              {span.tier}
                            </Badge>
                            <span className="font-semibold text-foreground truncate">{span.name}</span>
                          </div>
                          <span className="text-[10px] font-mono text-muted-foreground shrink-0">{span.durationMs} ms</span>
                        </div>

                        {/* Timing Bar */}
                        <div className="w-full bg-muted/40 h-1.5 rounded-full overflow-hidden relative">
                          <div
                            className="bg-gradient-to-r from-blue-500 to-indigo-500 h-1.5 rounded-full absolute"
                            style={{
                              left: `${leftPercent}%`,
                              width: `${widthPercent}%`,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Selected Span Detail Box */}
                {selectedSpan && (
                  <div className="p-3 rounded-lg bg-background/90 border border-border/80 text-xs font-mono space-y-2 mt-4">
                    <div className="flex items-center justify-between text-muted-foreground border-b border-border/40 pb-1">
                      <span className="text-foreground font-bold">Span Attributes: {selectedSpan.name}</span>
                      <span className="text-primary">{selectedSpan.service}</span>
                    </div>
                    <pre className="text-muted-foreground text-[11px] overflow-x-auto whitespace-pre-wrap">
                      <code>{JSON.stringify(selectedSpan.attributes, null, 2)}</code>
                    </pre>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 3: Security & Compliance Checklist */}
      {activeTab === 'security' && (
        <Card className="border-border/80 bg-card/60 backdrop-blur-xl">
          <CardHeader className="p-4 border-b border-border/60">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  Enterprise Security Hardening & Compliance Matrix
                </CardTitle>
                <CardDescription className="text-xs">
                  Automated validation of isolation, SSRF, injection defenses, and secret sanitization
                </CardDescription>
              </div>
              <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 font-mono text-xs">
                ALL 6 CHECKS PASSED
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {report.checks.map((check, idx) => (
              <div key={idx} className="flex items-start gap-3 p-3 rounded-lg border border-border/60 bg-muted/10 text-xs">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center justify-between font-bold text-foreground">
                    <span>{check.name}</span>
                    <Badge variant="outline" className="text-[10px] font-mono uppercase">
                      {check.category}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground text-[11px] mt-0.5 leading-relaxed">{check.description}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* TAB 4: Audit Trail Logs */}
      {activeTab === 'audit' && (
        <Card className="border-border/80 bg-card/60 backdrop-blur-xl">
          <CardHeader className="p-4 border-b border-border/60 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                <FileCode className="h-4 w-4 text-primary" />
                Platform Audit Trail ({filteredLogs.length} events)
              </CardTitle>
              <CardDescription className="text-xs">
                Immutable activity log for logins, member permissions, repository actions, and AI executions
              </CardDescription>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="h-3.5 w-3.5 text-muted-foreground absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Filter by action, user, or resource..."
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 rounded-lg bg-background border border-border/80 text-xs text-foreground focus:outline-none focus:border-primary w-64"
                />
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="border-b border-border/60 bg-muted/20 text-muted-foreground font-mono text-[10px] uppercase">
                  <tr>
                    <th className="p-3">Action</th>
                    <th className="p-3">Actor / User</th>
                    <th className="p-3">Target Resource</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 font-mono text-[11px]">
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-muted/10 transition-colors">
                      <td className="p-3 font-bold text-primary">{log.action}</td>
                      <td className="p-3 text-foreground">{log.userEmail}</td>
                      <td className="p-3 text-muted-foreground truncate max-w-[240px]">{log.resource}</td>
                      <td className="p-3">
                        <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[9px] h-4">
                          {log.status}
                        </Badge>
                      </td>
                      <td className="p-3 text-muted-foreground text-[10px]">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

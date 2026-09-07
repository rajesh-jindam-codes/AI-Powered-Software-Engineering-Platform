'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Bot,
  Box,
  CheckCircle2,
  ChevronRight,
  Code2,
  Compass,
  Copy,
  Database,
  ExternalLink,
  FileCode,
  FolderGit2,
  Globe,
  Key,
  Layers,
  Network,
  RefreshCw,
  Search,
  Server,
  Shield,
  ShieldCheck,
  Sparkles,
  Terminal,
  TestTube2,
  Workflow,
  Zap,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  ApiEndpointSummary,
  AuthPatternSummary,
  CodeGraph,
  CodeIntelligenceReport,
  CodeSearchMode,
  CodeSearchResultItem,
  ConfigPatternSummary,
  DbModelSummary,
  SemanticContextChunk,
  TestSuiteSummary,
} from '@devflow/shared-types';

export default function RepositoryIntelligencePage({ params }: { params: { id: string } }) {
  const [activeTab, setActiveTab] = useState<'overview' | 'apis' | 'database' | 'auth' | 'config' | 'tests' | 'graph' | 'chunks'>('overview');
  const [searchMode, setSearchMode] = useState<CodeSearchMode>('keyword');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Sample Intelligence Report
  const [report] = useState<CodeIntelligenceReport>({
    repositoryId: params.id,
    stats: {
      filesCount: 42,
      functionsCount: 184,
      classesCount: 28,
      apisCount: 12,
      dbModelsCount: 6,
      authGuardsCount: 4,
      configKeysCount: 14,
      testSuitesCount: 9,
      totalTestCases: 74,
    },
    apis: [
      {
        id: 'api_get_jobs',
        method: 'GET',
        path: '/api/v1/jobs',
        controllerName: 'JobsController',
        handlerName: 'listJobs',
        filePath: 'apps/api/src/modules/jobs/jobs.controller.ts',
        startLine: 35,
        endLine: 50,
        parameters: [
          { name: 'workspaceId', type: 'string', source: 'query' },
          { name: 'state', type: 'JobState', source: 'query' },
        ],
        authGuards: ['JwtAuthGuard'],
      },
      {
        id: 'api_post_enqueue',
        method: 'POST',
        path: '/api/v1/jobs/enqueue',
        controllerName: 'JobsController',
        handlerName: 'enqueueJob',
        filePath: 'apps/api/src/modules/jobs/jobs.controller.ts',
        startLine: 25,
        endLine: 30,
        parameters: [{ name: 'body', type: 'EnqueueJobRequest', source: 'body' }],
        authGuards: ['JwtAuthGuard', 'RolesGuard'],
      },
      {
        id: 'api_post_login',
        method: 'POST',
        path: '/api/v1/auth/login',
        controllerName: 'AuthController',
        handlerName: 'login',
        filePath: 'apps/api/src/modules/auth/auth.controller.ts',
        startLine: 18,
        endLine: 24,
        parameters: [{ name: 'dto', type: 'LoginRequest', source: 'body' }],
        authGuards: [],
      },
      {
        id: 'api_get_workspaces',
        method: 'GET',
        path: '/api/v1/workspaces',
        controllerName: 'WorkspacesController',
        handlerName: 'listWorkspaces',
        filePath: 'apps/api/src/modules/workspaces/workspaces.controller.ts',
        startLine: 20,
        endLine: 28,
        parameters: [],
        authGuards: ['JwtAuthGuard'],
      },
    ],
    database: [
      {
        id: 'db_distributed_jobs',
        name: 'DistributedJob',
        tableName: 'distributed_jobs',
        filePath: 'infrastructure/postgres/migrations/006_distributed_jobs_schema.sql',
        startLine: 5,
        endLine: 35,
        primaryKey: 'id',
        fields: [
          { name: 'id', type: 'UUID', nullable: false, isUnique: true },
          { name: 'workspace_id', type: 'UUID', nullable: true },
          { name: 'job_type', type: 'VARCHAR(50)', nullable: false },
          { name: 'state', type: 'VARCHAR(30)', nullable: false },
          { name: 'priority', type: 'INTEGER', nullable: false },
          { name: 'idempotency_key', type: 'VARCHAR(255)', isUnique: true },
          { name: 'payload', type: 'JSONB', nullable: false },
        ],
        relations: [{ targetModel: 'workspaces', type: 'many-to-one' }],
      },
      {
        id: 'db_workspaces',
        name: 'Workspace',
        tableName: 'workspaces',
        filePath: 'infrastructure/postgres/migrations/003_workspace_management_schema.sql',
        startLine: 1,
        endLine: 25,
        primaryKey: 'id',
        fields: [
          { name: 'id', type: 'UUID', nullable: false, isUnique: true },
          { name: 'name', type: 'VARCHAR(255)', nullable: false },
          { name: 'slug', type: 'VARCHAR(100)', nullable: false, isUnique: true },
          { name: 'owner_id', type: 'UUID', nullable: false },
        ],
        relations: [{ targetModel: 'users', type: 'many-to-one' }],
      },
    ],
    auth: [
      {
        id: 'auth_jwt_guard',
        name: 'JwtAuthGuard',
        type: 'GUARD',
        filePath: 'apps/api/src/modules/auth/guards/jwt-auth.guard.ts',
        startLine: 5,
        endLine: 20,
        mechanism: 'JWT',
        requiredRoles: [],
        protectedRoutes: ['/api/v1/jobs/*', '/api/v1/workspaces/*'],
      },
      {
        id: 'auth_roles_guard',
        name: 'RolesGuard',
        type: 'GUARD',
        filePath: 'apps/api/src/modules/auth/guards/roles.guard.ts',
        startLine: 8,
        endLine: 28,
        mechanism: 'RBAC',
        requiredRoles: ['ADMIN', 'DEVELOPER', 'REVIEWER'],
        protectedRoutes: ['/api/v1/jobs/enqueue', '/api/v1/workspaces/:id/settings'],
      },
    ],
    config: [
      { id: 'cfg_jwt_secret', keyName: 'JWT_SECRET', filePath: 'apps/api/src/config/configuration.ts', lineNumber: 8, isSecret: true, schemaType: 'string' },
      { id: 'cfg_database_url', keyName: 'DATABASE_URL', filePath: 'apps/api/src/config/configuration.ts', lineNumber: 9, isSecret: true, schemaType: 'string' },
      { id: 'cfg_redis_url', keyName: 'REDIS_URL', filePath: 'apps/api/src/config/configuration.ts', lineNumber: 10, isSecret: false, schemaType: 'string' },
      { id: 'cfg_port', keyName: 'PORT', filePath: 'apps/api/src/config/configuration.ts', lineNumber: 7, defaultValue: '4000', isSecret: false, schemaType: 'number' },
    ],
    tests: [
      {
        id: 'suite_jobs_service',
        filePath: 'apps/api/src/modules/jobs/jobs.service.spec.ts',
        framework: 'jest',
        suiteName: 'JobsService',
        testCasesCount: 5,
        testNames: ['should enqueue job', 'should respect idempotency key', 'should cancel job', 'should compute metrics'],
        targetSourceFiles: ['apps/api/src/modules/jobs/jobs.service.ts'],
      },
      {
        id: 'suite_failure_sim',
        filePath: 'apps/api/src/modules/jobs/failure-simulation.spec.ts',
        framework: 'jest',
        suiteName: 'FailureSimulation',
        testCasesCount: 6,
        testNames: ['Worker Crash Reclamation', 'Duplicate Event', 'Kafka Outage', 'Redis Fallback'],
        targetSourceFiles: ['apps/api/src/modules/jobs/redis/redis-job-store.service.ts'],
      },
    ],
    generatedAt: new Date().toISOString(),
  });

  // Sample Code Graph
  const [graph] = useState<CodeGraph>({
    repositoryId: params.id,
    nodes: [
      { id: 'node_1', repositoryId: params.id, nodeType: 'FILE', name: 'jobs.controller.ts', filePath: 'apps/api/src/modules/jobs/jobs.controller.ts' },
      { id: 'node_2', repositoryId: params.id, nodeType: 'CLASS', name: 'JobsService', filePath: 'apps/api/src/modules/jobs/jobs.service.ts' },
      { id: 'node_3', repositoryId: params.id, nodeType: 'API_ENDPOINT', name: 'POST /api/v1/jobs/enqueue', filePath: 'apps/api/src/modules/jobs/jobs.controller.ts' },
      { id: 'node_4', repositoryId: params.id, nodeType: 'DB_MODEL', name: 'distributed_jobs', filePath: 'migrations/006.sql' },
      { id: 'node_5', repositoryId: params.id, nodeType: 'AUTH_GUARD', name: 'JwtAuthGuard', filePath: 'guards/jwt-auth.guard.ts' },
      { id: 'node_6', repositoryId: params.id, nodeType: 'TEST_SUITE', name: 'JobsServiceSpec', filePath: 'jobs.service.spec.ts' },
    ],
    edges: [
      { id: 'edge_1', repositoryId: params.id, sourceNodeId: 'node_1', targetNodeId: 'node_3', edgeType: 'DEFINES' },
      { id: 'edge_2', repositoryId: params.id, sourceNodeId: 'node_1', targetNodeId: 'node_2', edgeType: 'IMPORTS' },
      { id: 'edge_3', repositoryId: params.id, sourceNodeId: 'node_2', targetNodeId: 'node_4', edgeType: 'ACCESSES_DB' },
      { id: 'edge_4', repositoryId: params.id, sourceNodeId: 'node_3', targetNodeId: 'node_5', edgeType: 'PROTECTED_BY' },
      { id: 'edge_5', repositoryId: params.id, sourceNodeId: 'node_6', targetNodeId: 'node_2', edgeType: 'TESTS' },
    ],
    metrics: {
      totalNodes: 6,
      totalEdges: 5,
      nodeCountsByType: {
        FILE: 1,
        CLASS: 1,
        FUNCTION: 0,
        INTERFACE: 0,
        API_ENDPOINT: 1,
        DB_MODEL: 1,
        AUTH_GUARD: 1,
        CONFIG_SCHEMA: 0,
        TEST_SUITE: 1,
      },
      edgeCountsByType: {
        IMPORTS: 1,
        DEFINES: 1,
        CALLS: 0,
        EXTENDS: 0,
        IMPLEMENTS: 0,
        ACCESSES_DB: 1,
        PROTECTED_BY: 1,
        TESTS: 1,
      },
      hasCycles: false,
      centralNodes: [
        { id: 'node_2', name: 'JobsService', nodeType: 'CLASS', centralityScore: 3 },
        { id: 'node_4', name: 'distributed_jobs', nodeType: 'DB_MODEL', centralityScore: 1 },
      ],
    },
  });

  // Sample Semantic Chunks
  const [chunks] = useState<SemanticContextChunk[]>([
    {
      id: 'chunk_1',
      repositoryId: params.id,
      repositoryName: 'DevFlow-Main',
      branch: 'main',
      commitSha: '8f9e1a2b3c4d',
      filePath: 'apps/api/src/modules/jobs/jobs.service.ts',
      fileName: 'jobs.service.ts',
      language: 'typescript',
      chunkType: 'class',
      symbolBreadcrumb: 'DevFlow > apps/api/src/modules/jobs/jobs.service.ts > JobsService',
      contextHeader: '// Repository: DevFlow | Branch: main | Commit: 8f9e1a2\n// File: apps/api/src/modules/jobs/jobs.service.ts (Lines 1-85)\n// Scope: CLASS JobsService',
      startLine: 1,
      endLine: 85,
      content: `export class JobsService implements OnModuleInit {\n  async enqueueJob(request: EnqueueJobRequest): Promise<JobRecord> {\n    // Idempotency check\n    if (request.idempotencyKey) { ... }\n  }\n}`,
      enrichedContent: `// Repository: DevFlow | Branch: main\n// Scope: CLASS JobsService\n\nexport class JobsService...`,
      tokensCount: 142,
      dependencies: ['RedisJobStoreService', 'KafkaJobBusService', 'JobsRepository'],
    },
  ]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getMethodBadge = (method: string) => {
    switch (method) {
      case 'GET':
        return <Badge variant="success" className="font-mono text-[10px] px-1.5 py-0">GET</Badge>;
      case 'POST':
        return <Badge variant="default" className="font-mono text-[10px] px-1.5 py-0 bg-blue-600">POST</Badge>;
      case 'PUT':
        return <Badge variant="warning" className="font-mono text-[10px] px-1.5 py-0">PUT</Badge>;
      case 'DELETE':
        return <Badge variant="destructive" className="font-mono text-[10px] px-1.5 py-0">DEL</Badge>;
      default:
        return <Badge variant="outline" className="font-mono text-[10px]">{method}</Badge>;
    }
  };

  return (
    <div className="flex-1 space-y-6 p-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/80 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Link href="/repositories" className="hover:text-foreground flex items-center gap-1">
              <FolderGit2 className="h-3 w-3" />
              Repositories
            </Link>
            <ChevronRight className="h-3 w-3" />
            <Link href={`/repositories/${params.id}`} className="hover:text-foreground">
              Repository Cockpit
            </Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground font-medium">Code Intelligence</span>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
              <Compass className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Code Intelligence & Architecture Graph</h1>
              <p className="text-xs text-muted-foreground font-mono">
                AST Discovery • APIs • Database Models • Auth Guards • Config Schemas • Test Suites
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link href={`/repositories/${params.id}/chat`}>
            <Button size="sm" className="gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-md shadow-blue-500/20">
              <Sparkles className="h-3.5 w-3.5" />
              AI Codebase Chat
            </Button>
          </Link>
          <Link href={`/repositories/${params.id}`}>
            <Button variant="outline" size="sm" className="gap-1.5">
              <ArrowLeft className="h-3.5 w-3.5" />
              Repository Overview
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <Card className="p-3 border-border/70 bg-card/60">
          <div className="text-[10px] font-semibold uppercase text-muted-foreground font-mono">Files Scanned</div>
          <div className="text-xl font-bold font-mono mt-0.5">{report.stats.filesCount}</div>
        </Card>
        <Card className="p-3 border-border/70 bg-card/60">
          <div className="text-[10px] font-semibold uppercase text-blue-400 font-mono">APIs Discovered</div>
          <div className="text-xl font-bold font-mono text-blue-400 mt-0.5">{report.stats.apisCount}</div>
        </Card>
        <Card className="p-3 border-border/70 bg-card/60">
          <div className="text-[10px] font-semibold uppercase text-indigo-400 font-mono">Database Models</div>
          <div className="text-xl font-bold font-mono text-indigo-400 mt-0.5">{report.stats.dbModelsCount}</div>
        </Card>
        <Card className="p-3 border-border/70 bg-card/60">
          <div className="text-[10px] font-semibold uppercase text-emerald-400 font-mono">Auth Guards</div>
          <div className="text-xl font-bold font-mono text-emerald-400 mt-0.5">{report.stats.authGuardsCount}</div>
        </Card>
        <Card className="p-3 border-border/70 bg-card/60">
          <div className="text-[10px] font-semibold uppercase text-purple-400 font-mono">Config Keys</div>
          <div className="text-xl font-bold font-mono text-purple-400 mt-0.5">{report.stats.configKeysCount}</div>
        </Card>
        <Card className="p-3 border-border/70 bg-card/60">
          <div className="text-[10px] font-semibold uppercase text-pink-400 font-mono">Test Suites</div>
          <div className="text-xl font-bold font-mono text-pink-400 mt-0.5">{report.stats.testSuitesCount}</div>
        </Card>
        <Card className="p-3 border-border/70 bg-card/60">
          <div className="text-[10px] font-semibold uppercase text-amber-400 font-mono">Circular Cycles</div>
          <div className="text-xl font-bold font-mono text-amber-400 mt-0.5">
            {graph.metrics.hasCycles ? 'DETECTED' : '0 (CLEAN)'}
          </div>
        </Card>
      </div>

      {/* Multi-Modal Code Search Bar */}
      <Card className="p-4 border-border/70 bg-card/50 backdrop-blur-sm space-y-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full md:w-2/3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search across files, AST symbols, API endpoints, DB entities..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-9 pl-9 pr-3 text-xs bg-muted/40 border border-border/70 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Mode Switcher */}
            <div className="flex items-center rounded-lg border border-border/70 bg-muted/30 p-0.5 text-xs font-mono">
              <button
                onClick={() => setSearchMode('keyword')}
                className={`px-2.5 py-1 rounded-md transition-all ${searchMode === 'keyword' ? 'bg-primary text-primary-foreground font-semibold shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Keyword
              </button>
              <button
                onClick={() => setSearchMode('symbol')}
                className={`px-2.5 py-1 rounded-md transition-all ${searchMode === 'symbol' ? 'bg-primary text-primary-foreground font-semibold shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Symbol
              </button>
              <button
                onClick={() => setSearchMode('file')}
                className={`px-2.5 py-1 rounded-md transition-all ${searchMode === 'file' ? 'bg-primary text-primary-foreground font-semibold shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              >
                File
              </button>
              <button
                onClick={() => setSearchMode('semantic')}
                className={`px-2.5 py-1 rounded-md transition-all ${searchMode === 'semantic' ? 'bg-primary text-primary-foreground font-semibold shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Semantic
              </button>
            </div>
          </div>

          <div className="text-xs text-muted-foreground font-mono">
            Mode: <span className="text-primary font-bold uppercase">{searchMode}</span> • Index: 100% Synced
          </div>
        </div>
      </Card>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1 border-b border-border/80 overflow-x-auto text-xs font-medium">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2.5 border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === 'overview' ? 'border-primary text-primary font-bold' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Compass className="h-4 w-4" />
          Overview
        </button>
        <button
          onClick={() => setActiveTab('apis')}
          className={`px-4 py-2.5 border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === 'apis' ? 'border-primary text-primary font-bold' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Globe className="h-4 w-4" />
          APIs ({report.apis.length})
        </button>
        <button
          onClick={() => setActiveTab('database')}
          className={`px-4 py-2.5 border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === 'database' ? 'border-primary text-primary font-bold' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Database className="h-4 w-4" />
          Database ({report.database.length})
        </button>
        <button
          onClick={() => setActiveTab('auth')}
          className={`px-4 py-2.5 border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === 'auth' ? 'border-primary text-primary font-bold' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <ShieldCheck className="h-4 w-4" />
          Auth & Security ({report.auth.length})
        </button>
        <button
          onClick={() => setActiveTab('config')}
          className={`px-4 py-2.5 border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === 'config' ? 'border-primary text-primary font-bold' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Key className="h-4 w-4" />
          Config ({report.config.length})
        </button>
        <button
          onClick={() => setActiveTab('tests')}
          className={`px-4 py-2.5 border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === 'tests' ? 'border-primary text-primary font-bold' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <TestTube2 className="h-4 w-4" />
          Tests ({report.tests.length})
        </button>
        <button
          onClick={() => setActiveTab('graph')}
          className={`px-4 py-2.5 border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === 'graph' ? 'border-primary text-primary font-bold' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Network className="h-4 w-4" />
          Code Graph ({graph.nodes.length} Nodes)
        </button>
        <button
          onClick={() => setActiveTab('chunks')}
          className={`px-4 py-2.5 border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === 'chunks' ? 'border-primary text-primary font-bold' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Code2 className="h-4 w-4" />
          Semantic Chunks
        </button>
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="p-5 border-border/70 bg-card/60 space-y-4">
            <h3 className="font-bold text-sm flex items-center gap-2">
              <Globe className="h-4 w-4 text-blue-400" />
              REST & GraphQL API Surface
            </h3>
            <div className="space-y-2.5">
              {report.apis.slice(0, 3).map((api) => (
                <div key={api.id} className="p-2.5 rounded-lg border border-border/60 bg-muted/20 space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getMethodBadge(api.method)}
                      <span className="font-mono text-xs font-semibold">{api.path}</span>
                    </div>
                  </div>
                  <div className="text-[11px] text-muted-foreground font-mono flex items-center justify-between">
                    <span>{api.controllerName} → {api.handlerName}</span>
                    {api.authGuards.length > 0 && (
                      <Badge variant="outline" className="text-[9px] font-mono border-emerald-500/30 text-emerald-400">
                        {api.authGuards.join(', ')}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <Button variant="ghost" size="sm" onClick={() => setActiveTab('apis')} className="w-full text-xs text-primary">
              View All {report.apis.length} APIs →
            </Button>
          </Card>

          <Card className="p-5 border-border/70 bg-card/60 space-y-4">
            <h3 className="font-bold text-sm flex items-center gap-2">
              <Database className="h-4 w-4 text-indigo-400" />
              Database Entities & Schema
            </h3>
            <div className="space-y-2.5">
              {report.database.slice(0, 3).map((db) => (
                <div key={db.id} className="p-2.5 rounded-lg border border-border/60 bg-muted/20 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-indigo-300">{db.tableName}</span>
                    <Badge variant="outline" className="text-[9px] font-mono">PK: {db.primaryKey}</Badge>
                  </div>
                  <div className="text-[11px] text-muted-foreground font-mono">
                    {db.fields.length} columns • {db.relations.length} relationships
                  </div>
                </div>
              ))}
            </div>
            <Button variant="ghost" size="sm" onClick={() => setActiveTab('database')} className="w-full text-xs text-primary">
              View All {report.database.length} DB Models →
            </Button>
          </Card>

          <Card className="p-5 border-border/70 bg-card/60 space-y-4">
            <h3 className="font-bold text-sm flex items-center gap-2">
              <Network className="h-4 w-4 text-purple-400" />
              Central Architecture Hubs
            </h3>
            <div className="space-y-2.5">
              {graph.metrics.centralNodes.map((node) => (
                <div key={node.id} className="p-2.5 rounded-lg border border-border/60 bg-muted/20 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-xs text-foreground">{node.name}</div>
                    <div className="text-[10px] text-muted-foreground font-mono">{node.nodeType}</div>
                  </div>
                  <Badge variant="secondary" className="font-mono text-[10px]">
                    Degree: {node.centralityScore}
                  </Badge>
                </div>
              ))}
            </div>
            <Button variant="ghost" size="sm" onClick={() => setActiveTab('graph')} className="w-full text-xs text-primary">
              Explore Code Graph →
            </Button>
          </Card>
        </div>
      )}

      {/* Tab 2: APIs */}
      {activeTab === 'apis' && (
        <Card className="border-border/70 bg-card/60 overflow-hidden">
          <div className="p-4 border-b border-border bg-muted/20 flex items-center justify-between">
            <h3 className="font-bold text-sm">Discovered Endpoints ({report.apis.length})</h3>
            <span className="text-xs text-muted-foreground font-mono">Extracted via AST Route Analysis</span>
          </div>
          <div className="divide-y divide-border/60">
            {report.apis.map((api) => (
              <div key={api.id} className="p-4 hover:bg-muted/20 transition-colors space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    {getMethodBadge(api.method)}
                    <span className="font-mono text-sm font-bold text-foreground">{api.path}</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
                    <span>{api.filePath}:{api.startLine}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs font-mono pt-1">
                  <div className="p-2 rounded bg-muted/30 border border-border/40">
                    <span className="text-muted-foreground text-[10px] block">CONTROLLER / HANDLER</span>
                    <span className="font-semibold text-foreground">{api.controllerName || 'Default'} → {api.handlerName}()</span>
                  </div>
                  <div className="p-2 rounded bg-muted/30 border border-border/40">
                    <span className="text-muted-foreground text-[10px] block">PARAMETERS</span>
                    <span>{api.parameters.length > 0 ? api.parameters.map((p) => `${p.source}(${p.name})`).join(', ') : 'None'}</span>
                  </div>
                  <div className="p-2 rounded bg-muted/30 border border-border/40">
                    <span className="text-muted-foreground text-[10px] block">SECURITY GUARDS</span>
                    <span className={api.authGuards.length > 0 ? 'text-emerald-400 font-semibold' : 'text-muted-foreground'}>
                      {api.authGuards.length > 0 ? api.authGuards.join(', ') : 'Public Endpoint'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Tab 3: Database Models */}
      {activeTab === 'database' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {report.database.map((db) => (
            <Card key={db.id} className="p-5 border-border/70 bg-card/60 space-y-4">
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <div className="flex items-center gap-2">
                  <Database className="h-5 w-5 text-indigo-400" />
                  <div>
                    <h3 className="font-bold text-base">{db.tableName}</h3>
                    <span className="text-xs text-muted-foreground font-mono">Entity: {db.name}</span>
                  </div>
                </div>
                <Badge variant="outline" className="font-mono text-xs">PK: {db.primaryKey}</Badge>
              </div>

              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase font-mono">Columns & Types</span>
                <div className="divide-y divide-border/40 border border-border/50 rounded-lg overflow-hidden bg-muted/20">
                  {db.fields.map((f) => (
                    <div key={f.name} className="px-3 py-1.5 flex items-center justify-between text-xs font-mono">
                      <span className="font-semibold text-foreground">{f.name}</span>
                      <span className="text-muted-foreground">{f.type} {f.nullable ? '(nullable)' : ''}</span>
                    </div>
                  ))}
                </div>
              </div>

              {db.relations.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase font-mono">Relationships</span>
                  <div className="space-y-1 text-xs font-mono">
                    {db.relations.map((r, i) => (
                      <div key={i} className="p-2 rounded bg-muted/30 border border-border/40 flex items-center justify-between">
                        <span>→ {r.targetModel}</span>
                        <Badge variant="secondary" className="text-[10px]">{r.type}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Tab 4: Auth & Security */}
      {activeTab === 'auth' && (
        <Card className="border-border/70 bg-card/60 divide-y divide-border/60">
          {report.auth.map((auth) => (
            <div key={auth.id} className="p-5 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="h-5 w-5 text-emerald-400" />
                  <h3 className="font-bold text-base">{auth.name}</h3>
                  <Badge variant="outline" className="font-mono text-[10px] text-emerald-400 border-emerald-500/30">
                    {auth.mechanism}
                  </Badge>
                </div>
                <span className="text-xs font-mono text-muted-foreground">{auth.filePath}</span>
              </div>

              <div className="text-xs text-muted-foreground font-mono space-y-1 pt-1">
                <div>Type: <span className="text-foreground">{auth.type}</span></div>
                {auth.requiredRoles.length > 0 && (
                  <div>Enforced Roles: <span className="text-primary font-bold">{auth.requiredRoles.join(', ')}</span></div>
                )}
                {auth.protectedRoutes.length > 0 && (
                  <div>Protected Pattern: <span className="text-foreground">{auth.protectedRoutes.join(', ')}</span></div>
                )}
              </div>
            </div>
          ))}
        </Card>
      )}

      {/* Tab 5: Configuration */}
      {activeTab === 'config' && (
        <Card className="border-border/70 bg-card/60 overflow-hidden">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-muted-foreground uppercase text-[10px]">
                <th className="py-3 px-4">Environment Key</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Secret Status</th>
                <th className="py-3 px-4">Declared At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {report.config.map((cfg) => (
                <tr key={cfg.id} className="hover:bg-muted/20">
                  <td className="py-3 px-4 font-bold text-foreground">{cfg.keyName}</td>
                  <td className="py-3 px-4 text-muted-foreground">{cfg.schemaType || 'string'}</td>
                  <td className="py-3 px-4">
                    {cfg.isSecret ? (
                      <Badge variant="destructive" className="text-[9px]">SECRET / MASKED</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[9px]">PUBLIC CONFIG</Badge>
                    )}
                  </td>
                  <td className="py-3 px-4 text-muted-foreground">{cfg.filePath}:{cfg.lineNumber}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* Tab 6: Tests */}
      {activeTab === 'tests' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {report.tests.map((test) => (
            <Card key={test.id} className="p-5 border-border/70 bg-card/60 space-y-3">
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <div className="flex items-center gap-2">
                  <TestTube2 className="h-5 w-5 text-pink-400" />
                  <div>
                    <h3 className="font-bold text-base">{test.suiteName}</h3>
                    <span className="text-xs text-muted-foreground font-mono">{test.framework.toUpperCase()}</span>
                  </div>
                </div>
                <Badge variant="secondary" className="font-mono text-xs">{test.testCasesCount} Assertions</Badge>
              </div>

              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase font-mono">Test Cases</span>
                <div className="space-y-1 text-xs font-mono">
                  {test.testNames.map((name, i) => (
                    <div key={i} className="p-2 rounded bg-muted/30 border border-border/40 flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                      <span>{name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Tab 7: Code Graph */}
      {activeTab === 'graph' && (
        <Card className="p-6 border-border/70 bg-card/60 space-y-4">
          <div className="flex items-center justify-between border-b border-border/60 pb-4">
            <div>
              <h3 className="font-bold text-base flex items-center gap-2">
                <Network className="h-5 w-5 text-primary" />
                Repository Relationship Topology
              </h3>
              <p className="text-xs text-muted-foreground">
                Directed graph connecting files, classes, functions, APIs, DB entities, and tests.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono text-xs">{graph.nodes.length} Nodes</Badge>
              <Badge variant="outline" className="font-mono text-xs">{graph.edges.length} Edges</Badge>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            {graph.nodes.map((node) => (
              <div key={node.id} className="p-3 rounded-xl border border-border/70 bg-muted/20 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-foreground truncate">{node.name}</span>
                  <Badge variant="outline" className="text-[9px] font-mono">{node.nodeType}</Badge>
                </div>
                <div className="text-[11px] text-muted-foreground font-mono truncate">{node.filePath}</div>
                <div className="text-[10px] text-primary font-mono pt-1 border-t border-border/40">
                  Outgoing Edges: {graph.edges.filter((e) => e.sourceNodeId === node.id).length} • Ingoing: {graph.edges.filter((e) => e.targetNodeId === node.id).length}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Tab 8: Semantic Chunks */}
      {activeTab === 'chunks' && (
        <div className="space-y-4">
          {chunks.map((chunk) => (
            <Card key={chunk.id} className="p-5 border-border/70 bg-card/60 space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <div className="flex items-center gap-2">
                  <Code2 className="h-4 w-4 text-primary" />
                  <span className="font-bold text-foreground">{chunk.symbolBreadcrumb}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">{chunk.tokensCount} tokens</Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs"
                    onClick={() => copyToClipboard(chunk.enrichedContent, chunk.id)}
                  >
                    <Copy className="h-3 w-3 mr-1" />
                    {copiedId === chunk.id ? 'Copied' : 'Copy Embedding Prompt'}
                  </Button>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-black/40 border border-border text-[11px] text-emerald-300 whitespace-pre-wrap overflow-x-auto">
                {chunk.contextHeader}
              </div>

              <pre className="p-3 rounded-lg bg-muted/40 border border-border text-[11px] text-foreground overflow-x-auto">
                {chunk.content}
              </pre>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  FolderGit2,
  GitBranch,
  Copy,
  ExternalLink,
  Activity,
  CheckCircle2,
  Clock,
  Sparkles,
  Bot,
  GitPullRequest,
  AlertCircle,
  FileCode,
  Shield,
  Star,
  GitFork,
  Terminal,
  ArrowLeft,
  RefreshCw,
  Lock,
  Globe,
  Layers,
  Database,
  Check,
  Search,
  Box,
  Braces,
  Cpu,
  Loader2,
  Table as TableIcon,
  Code2,
  Compass,
} from 'lucide-react';
import { useWorkspace } from '@/context/WorkspaceContext';
import { useAuth } from '@/context/AuthContext';
import {
  Repository,
  WebhookDeliveryRecord,
  RepositoryFile,
  CodeSymbol,
  CodeChunk,
  FileDependency,
  IngestionJob,
  IngestionStats,
} from '@devflow/shared-types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

type TabType = 'symbols' | 'chunks' | 'dependencies' | 'files' | 'webhooks';

export default function RepositoryDetailPage() {
  const params = useParams();
  const repoId = params.id as string;

  const { activeWorkspace } = useWorkspace();
  const { tokens } = useAuth();

  const [repository, setRepository] = useState<Repository | null>(null);
  const [deliveries, setDeliveries] = useState<WebhookDeliveryRecord[]>([]);
  const [symbols, setSymbols] = useState<CodeSymbol[]>([]);
  const [chunks, setChunks] = useState<CodeChunk[]>([]);
  const [dependencies, setDependencies] = useState<FileDependency[]>([]);
  const [files, setFiles] = useState<RepositoryFile[]>([]);
  const [latestJob, setLatestJob] = useState<IngestionJob | null>(null);
  const [stats, setStats] = useState<IngestionStats | null>(null);

  const [activeTab, setActiveTab] = useState<TabType>('symbols');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedClone, setCopiedClone] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isIngesting, setIsIngesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

  const getHeaders = useCallback(() => ({
    'Content-Type': 'application/json',
    ...(tokens?.accessToken ? { Authorization: `Bearer ${tokens.accessToken}` } : {}),
  }), [tokens]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // 1. Fetch Repository Details
      const res = await fetch(`${apiUrl}/github/repositories/${repoId}`, {
        headers: getHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setRepository(data.repository);
        setDeliveries(data.recentDeliveries || []);
      }

      // 2. Fetch Ingestion Data in Parallel
      const [statusRes, symRes, chkRes, depRes, filesRes] = await Promise.all([
        fetch(`${apiUrl}/ingestion/repositories/${repoId}/status`, { headers: getHeaders() }),
        fetch(`${apiUrl}/ingestion/repositories/${repoId}/symbols`, { headers: getHeaders() }),
        fetch(`${apiUrl}/ingestion/repositories/${repoId}/chunks`, { headers: getHeaders() }),
        fetch(`${apiUrl}/ingestion/repositories/${repoId}/dependencies`, { headers: getHeaders() }),
        fetch(`${apiUrl}/ingestion/repositories/${repoId}/files`, { headers: getHeaders() }),
      ]);

      if (statusRes.ok) {
        const stData = await statusRes.json();
        setLatestJob(stData.latestJob);
        setStats(stData.stats);
      }
      if (symRes.ok) setSymbols(await symRes.json());
      if (chkRes.ok) setChunks(await chkRes.json());
      if (depRes.ok) setDependencies(await depRes.json());
      if (filesRes.ok) setFiles(await filesRes.json());
    } catch {
      // Demo Fallback
      setRepository({
        id: repoId,
        workspaceId: activeWorkspace?.id || 'ws-core-001',
        githubRepoId: '7891001',
        name: 'core-engine',
        owner: 'devflow-ai',
        fullName: 'devflow-ai/core-engine',
        defaultBranch: 'main',
        cloneUrl: 'https://github.com/devflow-ai/core-engine.git',
        htmlUrl: 'https://github.com/devflow-ai/core-engine',
        isPrivate: true,
        language: 'TypeScript',
        starsCount: 142,
        forksCount: 28,
        openIssuesCount: 4,
        indexStatus: 'indexed',
        lastIndexedAt: '2026-09-06T18:30:00.000Z',
        lastSyncedAt: '2026-09-06T18:30:00.000Z',
        createdAt: '2026-09-01T00:00:00.000Z',
      });

      setSymbols([
        {
          id: 'sym-1',
          repositoryId: repoId,
          filePath: 'src/modules/auth/auth.service.ts',
          name: 'AuthService',
          kind: 'class',
          startLine: 18,
          endLine: 120,
          signature: 'export class AuthService',
          isExported: true,
        },
        {
          id: 'sym-2',
          repositoryId: repoId,
          filePath: 'src/modules/auth/auth.service.ts',
          name: 'login',
          kind: 'method',
          containerName: 'AuthService',
          startLine: 45,
          endLine: 65,
          signature: 'async login(dto: LoginDto): Promise<AuthResponse>',
          isExported: true,
        },
        {
          id: 'sym-3',
          repositoryId: repoId,
          filePath: 'src/agents/react_agent.py',
          name: 'ReActAgent',
          kind: 'class',
          startLine: 5,
          endLine: 45,
          signature: 'class ReActAgent:',
          docstring: 'Multi-step reasoning and tool orchestration coding agent.',
          isExported: true,
        },
        {
          id: 'sym-4',
          repositoryId: repoId,
          filePath: 'migrations/001_schema.sql',
          name: 'workspaces',
          kind: 'table',
          startLine: 1,
          endLine: 12,
          signature: 'CREATE TABLE workspaces',
          isExported: true,
        },
      ]);

      setChunks([
        {
          id: 'chk-1',
          repositoryId: repoId,
          filePath: 'src/modules/auth/auth.service.ts',
          startLine: 18,
          endLine: 120,
          content: 'export class AuthService {\n  constructor(private readonly repo: AuthRepo) {}\n  async login(dto: LoginDto) {}\n}',
          language: 'TypeScript',
          chunkType: 'class',
          tokensCount: 380,
          astMetadata: { symbolName: 'AuthService', signature: 'export class AuthService' },
          createdAt: '2026-09-06T18:30:00.000Z',
        },
        {
          id: 'chk-2',
          repositoryId: repoId,
          filePath: 'src/agents/react_agent.py',
          startLine: 5,
          endLine: 45,
          content: 'class ReActAgent:\n    def __init__(self, model_name: str):\n        self.model = model_name\n    async def execute_step(self) -> dict:\n        return {}',
          language: 'Python',
          chunkType: 'class',
          tokensCount: 290,
          astMetadata: { symbolName: 'ReActAgent' },
          createdAt: '2026-09-06T18:30:00.000Z',
        },
      ]);

      setDeliveries([
        {
          id: 'delivery-uuid-991',
          eventType: 'push',
          repositoryId: repoId,
          payload: { ref: 'refs/heads/main', commits: [{ message: 'feat: AST code chunking' }] },
          status: 'PROCESSED',
          processedAt: '2026-09-06T18:30:00.000Z',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [apiUrl, getHeaders, repoId, activeWorkspace]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleTriggerIngestion = async () => {
    setIsIngesting(true);
    try {
      const res = await fetch(`${apiUrl}/ingestion/repositories/${repoId}/trigger`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ forceReindex: true }),
      });

      if (res.ok) {
        const job = await res.json();
        setLatestJob(job);
        // Wait 1.5s then reload data to reflect background processing completion
        setTimeout(async () => {
          await loadData();
          setIsIngesting(false);
        }, 1500);
      } else {
        setIsIngesting(false);
      }
    } catch {
      setIsIngesting(false);
    }
  };

  const copyCloneUrl = () => {
    if (repository?.cloneUrl) {
      navigator.clipboard.writeText(`git clone ${repository.cloneUrl}`);
      setCopiedClone(true);
      setTimeout(() => setCopiedClone(false), 2500);
    }
  };

  const filteredSymbols = symbols.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.filePath.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.kind.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const filteredChunks = chunks.filter(
    (c) =>
      c.filePath.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.astMetadata.symbolName &&
        c.astMetadata.symbolName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      c.content.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  if (isLoading) {
    return <div className="max-w-7xl mx-auto p-12 text-center text-muted-foreground animate-pulse">Loading repository AST intelligence...</div>;
  }

  if (error || !repository) {
    return (
      <div className="max-w-xl mx-auto p-8 rounded-xl border border-destructive/40 text-center space-y-3">
        <h2 className="text-base font-bold text-destructive">Repository Not Found</h2>
        <Link href="/workspaces">
          <Button size="sm">Back to Workspaces</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 py-4">
      {/* Back Link */}
      <Link
        href={activeWorkspace ? `/workspaces/${activeWorkspace.id}/repositories` : '/workspaces'}
        className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Repositories
      </Link>

      {/* Hero Header */}
      <div className="relative rounded-2xl border border-border/80 bg-gradient-to-r from-card/90 via-card/60 to-primary/5 p-6 md:p-8 backdrop-blur-xl shadow-xl overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start gap-4">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 border border-white/10 flex items-center justify-center text-white shadow-xl shadow-blue-500/20 shrink-0">
              <FolderGit2 className="h-8 w-8" />
            </div>

            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl md:text-3xl font-black tracking-tight text-foreground">
                  {repository.fullName}
                </h1>

                {repository.isPrivate ? (
                  <Badge variant="outline" className="text-xs font-mono text-amber-400 border-amber-500/30 gap-1">
                    <Lock className="h-3 w-3" />
                    PRIVATE
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs font-mono text-blue-400 border-blue-500/30 gap-1">
                    <Globe className="h-3 w-3" />
                    PUBLIC
                  </Badge>
                )}

                <Badge
                  variant={
                    repository.indexStatus === 'indexed'
                      ? 'success'
                      : repository.indexStatus === 'indexing'
                      ? 'secondary'
                      : 'outline'
                  }
                  className="font-mono text-xs"
                >
                  {repository.indexStatus === 'indexing' || isIngesting ? (
                    <Activity className="h-3 w-3 mr-1 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                  )}
                  {isIngesting ? 'INGESTING AST...' : repository.indexStatus.toUpperCase()}
                </Badge>
              </div>

              {/* Clone & External Link Bar */}
              <div className="flex items-center gap-3 mt-3 flex-wrap">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/40 border border-border text-xs font-mono text-muted-foreground">
                  <Terminal className="h-3.5 w-3.5 text-primary" />
                  <span className="truncate max-w-sm">git clone {repository.cloneUrl}</span>
                  <button
                    onClick={copyCloneUrl}
                    className="hover:text-foreground text-muted-foreground ml-1"
                    title="Copy Git Clone Command"
                  >
                    {copiedClone ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>

                {repository.htmlUrl && (
                  <a
                    href={repository.htmlUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-muted/40 transition-colors"
                  >
                    <span>View on GitHub</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link href={`/repositories/${repoId}/intelligence`}>
              <Button
                variant="outline"
                className="gap-2 border-indigo-500/40 text-indigo-300 hover:bg-indigo-500/10 text-xs"
              >
                <Compass className="h-4 w-4 text-indigo-400" />
                Code Intelligence & Graph
              </Button>
            </Link>

            <Button
              disabled={isIngesting}
              onClick={handleTriggerIngestion}
              className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/20 text-xs"
            >
              {isIngesting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing Codebase...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Trigger Ingestion & AST Parse
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Ingestion & AST Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card/60 border-border/80">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-blue-500/10 text-blue-500">
              <Box className="h-5 w-5" />
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground">{symbols.length}</div>
              <div className="text-xs text-muted-foreground font-medium">AST Symbols Extracted</div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/60 border-border/80">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-500">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground">{chunks.length}</div>
              <div className="text-xs text-muted-foreground font-medium">Semantic Code Chunks</div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/60 border-border/80">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-500">
              <FileCode className="h-5 w-5" />
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground">{files.length || 3}</div>
              <div className="text-xs text-muted-foreground font-medium">Code Files Indexed</div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/60 border-border/80">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-violet-500/10 text-violet-500">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground font-mono">1,536-dim</div>
              <div className="text-xs text-muted-foreground font-medium">pgvector Embeddings</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ingestion Cockpit Tabs & Search */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-3">
          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto">
            <Button
              variant={activeTab === 'symbols' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('symbols')}
              className="gap-2 text-xs"
            >
              <Braces className="h-3.5 w-3.5" />
              AST Symbols ({symbols.length})
            </Button>

            <Button
              variant={activeTab === 'chunks' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('chunks')}
              className="gap-2 text-xs"
            >
              <Layers className="h-3.5 w-3.5" />
              Code Chunks ({chunks.length})
            </Button>

            <Button
              variant={activeTab === 'dependencies' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('dependencies')}
              className="gap-2 text-xs"
            >
              <Cpu className="h-3.5 w-3.5" />
              Dependencies ({dependencies.length})
            </Button>

            <Button
              variant={activeTab === 'webhooks' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('webhooks')}
              className="gap-2 text-xs"
            >
              <Activity className="h-3.5 w-3.5" />
              Webhooks ({deliveries.length})
            </Button>
          </div>

          {/* Search Filter */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search symbols, paths, or text..."
              className="w-full h-9 pl-9 pr-3.5 rounded-lg bg-card border border-input text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        {/* TAB 1: AST Symbols Explorer */}
        {activeTab === 'symbols' && (
          <div className="space-y-3">
            {filteredSymbols.length === 0 ? (
              <div className="p-8 border border-dashed rounded-xl text-center text-xs text-muted-foreground">
                No symbols match query.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredSymbols.map((sym) => (
                  <Card key={sym.id} className="bg-card/60 border-border/80 hover:border-primary/40 transition-colors">
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="p-1.5 rounded-md bg-primary/10 text-primary text-xs font-mono">
                            {sym.kind === 'class' ? (
                              <Box className="h-3.5 w-3.5" />
                            ) : sym.kind === 'table' ? (
                              <TableIcon className="h-3.5 w-3.5" />
                            ) : (
                              <Code2 className="h-3.5 w-3.5" />
                            )}
                          </span>
                          <div className="min-w-0">
                            <span className="text-sm font-bold text-foreground truncate block">
                              {sym.name}
                            </span>
                            {sym.containerName && (
                              <span className="text-[10px] text-muted-foreground font-mono">
                                inside {sym.containerName}
                              </span>
                            )}
                          </div>
                        </div>

                        <Badge variant="outline" className="font-mono text-[10px] uppercase">
                          {sym.kind}
                        </Badge>
                      </div>

                      {sym.signature && (
                        <div className="p-2 rounded bg-muted/40 text-[11px] font-mono text-muted-foreground truncate border border-border/50">
                          {sym.signature}
                        </div>
                      )}

                      <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono pt-1">
                        <span className="truncate">{sym.filePath}</span>
                        <span className="text-primary shrink-0">
                          L{sym.startLine}-{sym.endLine}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Semantic Code Chunks */}
        {activeTab === 'chunks' && (
          <div className="space-y-3">
            {filteredChunks.length === 0 ? (
              <div className="p-8 border border-dashed rounded-xl text-center text-xs text-muted-foreground">
                No code chunks found.
              </div>
            ) : (
              <div className="space-y-3">
                {filteredChunks.map((chk) => (
                  <Card key={chk.id} className="bg-card/60 border-border/80">
                    <CardHeader className="py-2.5 px-4 bg-muted/20 border-b border-border/60">
                      <div className="flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2 font-mono text-muted-foreground">
                          <FileCode className="h-3.5 w-3.5 text-primary" />
                          <span className="text-foreground font-medium">{chk.filePath}</span>
                          <span>(Lines {chk.startLine}-{chk.endLine})</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="font-mono text-[10px]">
                            {chk.chunkType}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            ~{chk.tokensCount || Math.ceil(chk.content.length / 4)} tokens
                          </span>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4">
                      <pre className="p-3 rounded-lg bg-zinc-950 text-zinc-200 text-xs font-mono overflow-x-auto border border-zinc-800">
                        <code>{chk.content}</code>
                      </pre>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Dependencies Graph */}
        {activeTab === 'dependencies' && (
          <div className="space-y-3">
            {dependencies.length === 0 ? (
              <div className="p-8 border border-dashed rounded-xl text-center text-xs text-muted-foreground">
                No external/internal dependencies mapped yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {dependencies.map((dep) => (
                  <Card key={dep.id} className="bg-card/60 border-border/80 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-semibold text-foreground truncate">
                        {dep.targetModule}
                      </span>
                      <Badge
                        variant={dep.dependencyType === 'internal' ? 'outline' : 'secondary'}
                        className="text-[10px] font-mono"
                      >
                        {dep.dependencyType.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="text-[10px] text-muted-foreground font-mono mt-1 truncate">
                      Source: {dep.sourceFilePath}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: Webhook Deliveries */}
        {activeTab === 'webhooks' && (
          <div className="space-y-3">
            {deliveries.length === 0 ? (
              <div className="p-8 border border-dashed rounded-xl text-center text-xs text-muted-foreground">
                No webhook deliveries recorded yet.
              </div>
            ) : (
              deliveries.map((del) => (
                <Card key={del.id} className="bg-card/60 border-border/80 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <GitBranch className="h-4 w-4 text-primary" />
                      <span className="font-mono text-xs font-bold uppercase">{del.eventType}</span>
                      <span className="font-mono text-[10px] text-muted-foreground">GUID: {del.id}</span>
                    </div>
                    <Badge variant="success" className="text-[10px] font-mono">
                      {del.status}
                    </Badge>
                  </div>
                  <pre className="mt-2 p-2 rounded bg-zinc-950 text-zinc-300 text-[11px] font-mono overflow-x-auto">
                    {JSON.stringify(del.payload, null, 2).slice(0, 300)}...
                  </pre>
                </Card>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

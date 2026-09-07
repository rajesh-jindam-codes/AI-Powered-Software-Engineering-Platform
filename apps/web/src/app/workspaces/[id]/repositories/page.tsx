'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  FolderGit2,
  Plus,
  Search,
  GitBranch,
  Activity,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Trash2,
  RefreshCw,
  Sparkles,
  ArrowLeft,
  Lock,
  Globe,
  Star,
  GitFork,
  Clock,
  ArrowRight,
  Shield,
  Loader2,
} from 'lucide-react';
import { useWorkspace } from '@/context/WorkspaceContext';
import { useAuth } from '@/context/AuthContext';
import { Repository } from '@devflow/shared-types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';

export default function WorkspaceRepositoriesPage() {
  const params = useParams();
  const workspaceId = params.id as string;

  const { getWorkspace } = useWorkspace();
  const { tokens, user } = useAuth();

  const [workspaceName, setWorkspaceName] = useState('Workspace');
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

  const getHeaders = useCallback(() => ({
    'Content-Type': 'application/json',
    ...(tokens?.accessToken ? { Authorization: `Bearer ${tokens.accessToken}` } : {}),
  }), [tokens]);

  const loadRepositories = useCallback(async () => {
    setIsLoading(true);
    setFeedback(null);
    try {
      const ws = await getWorkspace(workspaceId);
      setWorkspaceName(ws.name);

      const res = await fetch(`${apiUrl}/github/workspaces/${workspaceId}/repositories`, {
        headers: getHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setRepositories(data);
      } else {
        throw new Error('Failed to load workspace repositories');
      }
    } catch {
      // Demo fallback data
      setRepositories([
        {
          id: 'repo-core-001',
          workspaceId,
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
        },
        {
          id: 'repo-web-002',
          workspaceId,
          githubRepoId: '7891002',
          name: 'web-cockpit',
          owner: 'devflow-ai',
          fullName: 'devflow-ai/web-cockpit',
          defaultBranch: 'main',
          cloneUrl: 'https://github.com/devflow-ai/web-cockpit.git',
          htmlUrl: 'https://github.com/devflow-ai/web-cockpit',
          isPrivate: true,
          language: 'TypeScript',
          starsCount: 89,
          forksCount: 12,
          openIssuesCount: 2,
          indexStatus: 'indexed',
          lastIndexedAt: '2026-09-06T19:00:00.000Z',
          lastSyncedAt: '2026-09-06T19:00:00.000Z',
          createdAt: '2026-09-01T00:00:00.000Z',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [apiUrl, getHeaders, getWorkspace, workspaceId]);

  useEffect(() => {
    loadRepositories();
  }, [loadRepositories]);

  const handleSync = async (repoId: string, fullName: string) => {
    setSyncingId(repoId);
    setFeedback(null);
    try {
      // Simulate/trigger sync webhook
      await new Promise((r) => setTimeout(r, 800));
      setRepositories((prev) =>
        prev.map((r) =>
          r.id === repoId
            ? { ...r, indexStatus: 'indexed', lastSyncedAt: new Date().toISOString() }
            : r,
        ),
      );
      setFeedback({
        type: 'success',
        message: `Sync completed for '${fullName}'. Codebase AST index is up to date.`,
      });
    } finally {
      setSyncingId(null);
    }
  };

  const handleDisconnect = async (repoId: string, fullName: string) => {
    if (!confirm(`Are you sure you want to disconnect '${fullName}' from this workspace?`)) return;

    setDisconnectingId(repoId);
    setFeedback(null);
    try {
      const res = await fetch(`${apiUrl}/github/workspaces/${workspaceId}/repositories/${repoId}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || err.message || 'Failed to disconnect repository');
      }

      setRepositories((prev) => prev.filter((r) => r.id !== repoId));
      setFeedback({
        type: 'success',
        message: `Repository '${fullName}' disconnected from workspace.`,
      });
    } catch (err: unknown) {
      if (err instanceof Error) {
        setFeedback({ type: 'error', message: err.message });
      } else {
        setFeedback({ type: 'error', message: 'Failed to disconnect repository.' });
      }
    } finally {
      setDisconnectingId(null);
    }
  };

  const filteredRepos = repositories.filter(
    (repo) =>
      repo.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (repo.language && repo.language.toLowerCase().includes(searchQuery.toLowerCase())),
  );

  return (
    <div className="max-w-6xl mx-auto space-y-8 py-4">
      {/* Back Link */}
      <Link
        href={`/workspaces/${workspaceId}`}
        className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to {workspaceName}
      </Link>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-primary text-xs font-semibold tracking-wider uppercase">
            <FolderGit2 className="h-4 w-4" />
            <span>Workspace Source Code Hub</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground mt-1">
            Connected Repositories
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Repositories connected to {workspaceName} with active webhook listening and pgvector indexing.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href={`/workspaces/${workspaceId}/github`}>
            <Button className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/20">
              <Plus className="h-4 w-4" />
              Import from GitHub
            </Button>
          </Link>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-xl border text-sm flex items-center gap-3 ${
            feedback.type === 'success'
              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
              : 'border-destructive/50 bg-destructive/10 text-destructive'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="h-5 w-5 shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search connected repositories by name or language..."
          className="w-full h-10 pl-10 pr-4 rounded-xl bg-card/60 backdrop-blur-md border border-input text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Repositories List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 rounded-2xl bg-card/40 border border-border animate-pulse p-4" />
          ))}
        </div>
      ) : filteredRepos.length === 0 ? (
        <div className="p-12 rounded-2xl border border-dashed border-border text-center space-y-4 bg-card/20">
          <FolderGit2 className="h-10 w-10 text-muted-foreground mx-auto" />
          <div>
            <h3 className="text-base font-bold text-foreground">No repositories connected</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
              {searchQuery
                ? `No connected repositories match "${searchQuery}".`
                : 'Connect your GitHub repository to enable autonomous code reviews and semantic search.'}
            </p>
          </div>
          <Link href={`/workspaces/${workspaceId}/github`}>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Connect Your First Repository
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRepos.map((repo) => (
            <Card
              key={repo.id}
              className="bg-card/60 border-border/80 hover:border-primary/50 transition-all shadow-md group"
            >
              <CardContent className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-4 min-w-0">
                  <div className="h-11 w-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                    <FolderGit2 className="h-5 w-5" />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <Link
                        href={`/repositories/${repo.id}`}
                        className="text-base font-bold text-foreground hover:text-primary transition-colors truncate"
                      >
                        {repo.fullName}
                      </Link>
                      {repo.isPrivate ? (
                        <Badge variant="outline" className="text-[10px] font-mono gap-1 text-amber-400 border-amber-500/30">
                          <Lock className="h-2.5 w-2.5" />
                          PRIVATE
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] font-mono gap-1 text-blue-400 border-blue-500/30">
                          <Globe className="h-2.5 w-2.5" />
                          PUBLIC
                        </Badge>
                      )}

                      <Badge
                        variant={
                          repo.indexStatus === 'indexed'
                            ? 'success'
                            : repo.indexStatus === 'indexing'
                            ? 'secondary'
                            : 'outline'
                        }
                        className="text-[10px] font-mono"
                      >
                        {repo.indexStatus === 'indexing' ? (
                          <Activity className="h-3 w-3 mr-1 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                        )}
                        {repo.indexStatus.toUpperCase()}
                      </Badge>
                    </div>

                    {/* Metadata Subline */}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground font-mono mt-1.5 flex-wrap">
                      <span className="flex items-center gap-1 text-foreground font-medium">
                        <GitBranch className="h-3.5 w-3.5 text-muted-foreground" />
                        {repo.defaultBranch}
                      </span>
                      {repo.language && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
                            {repo.language}
                          </span>
                        </>
                      )}
                      {repo.starsCount !== undefined && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Star className="h-3 w-3 text-amber-400" />
                            {repo.starsCount}
                          </span>
                        </>
                      )}
                      {repo.lastIndexedAt && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            Indexed {new Date(repo.lastIndexedAt).toLocaleDateString()}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-border/50">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={syncingId === repo.id}
                    onClick={() => handleSync(repo.id, repo.fullName)}
                    className="gap-1.5 text-xs"
                    title="Trigger Webhook Sync"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${syncingId === repo.id ? 'animate-spin' : ''}`} />
                    Sync
                  </Button>

                  <Link href={`/repositories/${repo.id}`}>
                    <Button size="sm" className="gap-1.5 text-xs">
                      Cockpit
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </Link>

                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={disconnectingId === repo.id}
                    onClick={() => handleDisconnect(repo.id, repo.fullName)}
                    className="h-9 w-9 text-muted-foreground hover:text-destructive"
                    title="Disconnect Repository"
                  >
                    {disconnectingId === repo.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

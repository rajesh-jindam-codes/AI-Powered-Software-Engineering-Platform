'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  FolderGit2,
  ExternalLink,
  Search,
  CheckCircle2,
  AlertCircle,
  Plus,
  RefreshCw,
  Sparkles,
  ArrowLeft,
  Shield,
  Lock,
  Globe,
  Star,
  GitFork,
  Loader2,
  Layers,
} from 'lucide-react';
import { useWorkspace } from '@/context/WorkspaceContext';
import { useAuth } from '@/context/AuthContext';
import { GitHubInstallation, GitHubRepository as RemoteRepo } from '@devflow/shared-types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';

export default function WorkspaceGitHubPage() {
  const params = useParams();
  const workspaceId = params.id as string;

  const { getWorkspace } = useWorkspace();
  const { tokens, user } = useAuth();

  const [workspaceName, setWorkspaceName] = useState('Workspace');
  const [installation, setInstallation] = useState<GitHubInstallation | null>(null);
  const [availableRepos, setAvailableRepos] = useState<RemoteRepo[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [connectingRepoId, setConnectingRepoId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

  const getHeaders = useCallback(() => ({
    'Content-Type': 'application/json',
    ...(tokens?.accessToken ? { Authorization: `Bearer ${tokens.accessToken}` } : {}),
  }), [tokens]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setFeedback(null);
    try {
      const ws = await getWorkspace(workspaceId);
      setWorkspaceName(ws.name);

      // 1. Fetch GitHub Installation Status
      const statusRes = await fetch(`${apiUrl}/github/workspaces/${workspaceId}/status`, {
        headers: getHeaders(),
      });
      if (statusRes.ok) {
        const statusData = await statusRes.json();
        setInstallation(statusData.installation);
      }

      // 2. Fetch Available Repositories
      const reposRes = await fetch(`${apiUrl}/github/workspaces/${workspaceId}/available-repositories`, {
        headers: getHeaders(),
      });
      if (reposRes.ok) {
        const reposData = await reposRes.json();
        setAvailableRepos(reposData);
      }
    } catch {
      // Fallback state for local dev
      setInstallation({
        id: 'gh-inst-001',
        workspaceId,
        githubUserId: 'gh-user-001',
        githubUsername: 'devflow-ai',
        avatarUrl: 'https://avatars.githubusercontent.com/u/9919?v=4',
        scope: 'repo,read:org,admin:repo_hook',
        connectedAt: '2026-09-01T00:00:00.000Z',
        updatedAt: '2026-09-06T12:00:00.000Z',
      });
      setAvailableRepos([
        {
          id: '7891001',
          name: 'core-engine',
          owner: 'devflow-ai',
          fullName: 'devflow-ai/core-engine',
          description: 'Core event bus, microservice orchestration, and workflow scheduling engine.',
          defaultBranch: 'main',
          cloneUrl: 'https://github.com/devflow-ai/core-engine.git',
          htmlUrl: 'https://github.com/devflow-ai/core-engine',
          isPrivate: true,
          language: 'TypeScript',
          starsCount: 142,
          forksCount: 28,
          openIssuesCount: 4,
          isConnected: true,
        },
        {
          id: '7891002',
          name: 'web-cockpit',
          owner: 'devflow-ai',
          fullName: 'devflow-ai/web-cockpit',
          description: 'Next.js developer portal, agent control cockpit, and AST explorer.',
          defaultBranch: 'main',
          cloneUrl: 'https://github.com/devflow-ai/web-cockpit.git',
          htmlUrl: 'https://github.com/devflow-ai/web-cockpit',
          isPrivate: true,
          language: 'TypeScript',
          starsCount: 89,
          forksCount: 12,
          openIssuesCount: 2,
          isConnected: true,
        },
        {
          id: '7891003',
          name: 'rag-pipeline',
          owner: 'devflow-ai',
          fullName: 'devflow-ai/rag-pipeline',
          description: 'AST chunk parsing, tree-sitter bindings, and pgvector embeddings generator.',
          defaultBranch: 'main',
          cloneUrl: 'https://github.com/devflow-ai/rag-pipeline.git',
          htmlUrl: 'https://github.com/devflow-ai/rag-pipeline',
          isPrivate: false,
          language: 'Python',
          starsCount: 310,
          forksCount: 45,
          openIssuesCount: 6,
          isConnected: false,
        },
        {
          id: '7891004',
          name: 'agent-orchestrator',
          owner: 'devflow-ai',
          fullName: 'devflow-ai/agent-orchestrator',
          description: 'Multi-agent coding loops, AST verification, and automated patch synthesis.',
          defaultBranch: 'main',
          cloneUrl: 'https://github.com/devflow-ai/agent-orchestrator.git',
          htmlUrl: 'https://github.com/devflow-ai/agent-orchestrator',
          isPrivate: true,
          language: 'TypeScript',
          starsCount: 204,
          forksCount: 31,
          openIssuesCount: 5,
          isConnected: false,
        },
        {
          id: '7891005',
          name: 'distributed-worker',
          owner: 'devflow-ai',
          fullName: 'devflow-ai/distributed-worker',
          description: 'Asynchronous task workers for CI test execution and sandbox sandboxing.',
          defaultBranch: 'main',
          cloneUrl: 'https://github.com/devflow-ai/distributed-worker.git',
          htmlUrl: 'https://github.com/devflow-ai/distributed-worker',
          isPrivate: false,
          language: 'Go',
          starsCount: 175,
          forksCount: 22,
          openIssuesCount: 3,
          isConnected: false,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [apiUrl, getHeaders, getWorkspace, workspaceId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleConnectOAuth = async () => {
    try {
      const res = await fetch(`${apiUrl}/github/auth-url?workspaceId=${workspaceId}`, {
        headers: getHeaders(),
      });
      if (res.ok) {
        const { authUrl, state } = await res.json();
        // Simulate OAuth callback for local dev environment
        const callbackRes = await fetch(`${apiUrl}/github/callback`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({
            code: 'mock-auth-code-live',
            state,
            workspaceId,
          }),
        });

        if (callbackRes.ok) {
          const inst = await callbackRes.json();
          setInstallation(inst);
          setFeedback({
            type: 'success',
            message: `Successfully connected GitHub account: @${inst.githubUsername}`,
          });
          await loadData();
        }
      }
    } catch {
      setFeedback({ type: 'error', message: 'Failed to initiate GitHub OAuth authorization.' });
    }
  };

  const handleConnectRepo = async (repo: RemoteRepo) => {
    setConnectingRepoId(repo.id);
    setFeedback(null);
    try {
      const res = await fetch(`${apiUrl}/github/workspaces/${workspaceId}/repositories/connect`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          githubRepoId: repo.id,
          fullName: repo.fullName,
          name: repo.name,
          owner: repo.owner,
          defaultBranch: repo.defaultBranch,
          cloneUrl: repo.cloneUrl,
          htmlUrl: repo.htmlUrl,
          isPrivate: repo.isPrivate,
          language: repo.language,
          starsCount: repo.starsCount,
          forksCount: repo.forksCount,
          openIssuesCount: repo.openIssuesCount,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || err.message || 'Failed to connect repository');
      }

      setAvailableRepos((prev) =>
        prev.map((r) => (r.id === repo.id ? { ...r, isConnected: true } : r)),
      );

      setFeedback({
        type: 'success',
        message: `Repository '${repo.fullName}' successfully connected to ${workspaceName}.`,
      });
    } catch (err: unknown) {
      if (err instanceof Error) {
        setFeedback({ type: 'error', message: err.message });
      } else {
        setFeedback({ type: 'error', message: 'Failed to connect repository.' });
      }
    } finally {
      setConnectingRepoId(null);
    }
  };

  const filteredRepos = availableRepos.filter(
    (repo) =>
      repo.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (repo.description && repo.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (repo.language && repo.language.toLowerCase().includes(searchQuery.toLowerCase())),
  );

  return (
    <div className="max-w-6xl mx-auto space-y-8 py-4">
      {/* Back Link */}
      <Link
        href={`/workspaces/${workspaceId}/repositories`}
        className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Connected Repositories
      </Link>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-primary text-xs font-semibold tracking-wider uppercase">
            <FolderGit2 className="h-4 w-4" />
            <span>GitHub Integration Hub</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground mt-1">
            Connect Repositories to {workspaceName}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Authorize GitHub OAuth, select source code repositories, and enable continuous webhook listening.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href={`/workspaces/${workspaceId}/repositories`}>
            <Button variant="outline" size="sm" className="gap-2">
              <Layers className="h-4 w-4 text-primary" />
              View Connected ({availableRepos.filter((r) => r.isConnected).length})
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

      {/* GitHub Account Connection Card */}
      <Card className="border-border/80 bg-gradient-to-r from-card/90 via-card/60 to-primary/5 backdrop-blur-xl shadow-xl">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-zinc-900 border border-zinc-700 flex items-center justify-center text-white shrink-0 overflow-hidden shadow-lg">
                {installation?.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={installation.avatarUrl}
                    alt={installation.githubUsername}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <FolderGit2 className="h-7 w-7 text-white" />
                )}
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-foreground">
                    {installation ? `@${installation.githubUsername}` : 'GitHub Not Connected'}
                  </h3>
                  {installation ? (
                    <Badge variant="success" className="font-mono text-[10px]">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      OAUTH LINKED
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="font-mono text-[10px] border-amber-500/40 text-amber-400">
                      DISCONNECTED
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1 font-mono">
                  {installation
                    ? `Scope: ${installation.scope || 'repo,read:org,admin:repo_hook'} • Connected: ${new Date(
                        installation.connectedAt,
                      ).toLocaleDateString()}`
                    : 'Grant access to your GitHub repositories and organizations to enable automated AI code reviews.'}
                </p>
              </div>
            </div>

            <Button
              onClick={handleConnectOAuth}
              className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/20 shrink-0"
            >
              <RefreshCw className="h-4 w-4" />
              {installation ? 'Re-authorize GitHub' : 'Connect GitHub Account'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Available Repositories Browser */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-indigo-400" />
              Available GitHub Repositories
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Select repositories from your authorized GitHub organizations to import into this workspace.
            </p>
          </div>

          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter available repos..."
              className="w-full h-10 pl-10 pr-4 rounded-xl bg-card border border-input text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-40 rounded-xl bg-card/40 border border-border animate-pulse p-4" />
            ))}
          </div>
        ) : filteredRepos.length === 0 ? (
          <div className="p-12 rounded-2xl border border-dashed border-border text-center space-y-2 bg-card/20">
            <FolderGit2 className="h-8 w-8 text-muted-foreground mx-auto" />
            <p className="text-sm font-semibold">No matching repositories found</p>
            <p className="text-xs text-muted-foreground">Try adjusting your search query or authorize additional GitHub orgs.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredRepos.map((repo) => (
              <Card
                key={repo.id}
                className={`bg-card/60 border-border/80 hover:border-primary/40 transition-all ${
                  repo.isConnected ? 'border-emerald-500/30 bg-emerald-500/5' : ''
                }`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base font-bold text-foreground truncate">
                          {repo.fullName}
                        </CardTitle>
                        {repo.isPrivate ? (
                          <span title="Private Repository">
                            <Lock className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                          </span>
                        ) : (
                          <span title="Public Repository">
                            <Globe className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                          </span>
                        )}
                      </div>
                      <CardDescription className="text-xs line-clamp-2 mt-1 min-h-[32px]">
                        {repo.description || 'No description provided.'}
                      </CardDescription>
                    </div>

                    <Badge variant="outline" className="font-mono text-[10px] shrink-0">
                      {repo.defaultBranch}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="pb-3">
                  <div className="flex items-center gap-4 text-xs text-muted-foreground font-mono">
                    {repo.language && (
                      <span className="flex items-center gap-1.5 text-foreground font-medium">
                        <span className="h-2 w-2 rounded-full bg-indigo-500" />
                        {repo.language}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Star className="h-3 w-3 text-amber-400" />
                      {repo.starsCount}
                    </span>
                    <span className="flex items-center gap-1">
                      <GitFork className="h-3 w-3 text-muted-foreground" />
                      {repo.forksCount}
                    </span>
                  </div>
                </CardContent>

                <CardFooter className="pt-2 border-t border-border/50 flex items-center justify-between">
                  <a
                    href={repo.htmlUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                  >
                    View on GitHub
                    <ExternalLink className="h-3 w-3" />
                  </a>

                  {repo.isConnected ? (
                    <Badge variant="success" className="gap-1 text-xs">
                      <CheckCircle2 className="h-3 w-3" />
                      Connected
                    </Badge>
                  ) : (
                    <Button
                      size="sm"
                      disabled={connectingRepoId === repo.id}
                      onClick={() => handleConnectRepo(repo)}
                      className="gap-1.5 text-xs bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                      {connectingRepoId === repo.id ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Connecting...
                        </>
                      ) : (
                        <>
                          <Plus className="h-3.5 w-3.5" />
                          Connect to Workspace
                        </>
                      )}
                    </Button>
                  )}
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

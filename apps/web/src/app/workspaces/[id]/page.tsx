'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Building2,
  Users,
  Settings,
  GitBranch,
  FolderGit2,
  Bot,
  Sparkles,
  Shield,
  ArrowRight,
  Plus,
  Activity,
  CheckCircle2,
  Database,
  Cpu,
  Layers,
  Calendar,
  Key,
} from 'lucide-react';
import { useWorkspace } from '@/context/WorkspaceContext';
import { useAuth } from '@/context/AuthContext';
import { Workspace, WorkspaceMember } from '@devflow/shared-types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

export default function WorkspaceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params.id as string;

  const { getWorkspace, listMembers, selectWorkspace } = useWorkspace();
  const { user } = useAuth();

  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const ws = await getWorkspace(workspaceId);
      setWorkspace(ws);
      selectWorkspace(ws.id);

      const memList = await listMembers(workspaceId);
      setMembers(memList);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to load workspace details');
      }
    } finally {
      setIsLoading(false);
    }
  }, [getWorkspace, listMembers, selectWorkspace, workspaceId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto space-y-8 animate-pulse">
        <div className="h-32 bg-card/40 rounded-2xl border border-border" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-card/40 rounded-xl border border-border" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !workspace) {
    return (
      <div className="max-w-xl mx-auto p-10 rounded-2xl border border-destructive/30 bg-destructive/5 text-center space-y-4">
        <Shield className="h-10 w-10 text-destructive mx-auto" />
        <h2 className="text-lg font-bold text-foreground">Workspace Access Restricted</h2>
        <p className="text-xs text-muted-foreground">{error || 'Workspace could not be found or you do not have permission to view it.'}</p>
        <Link href="/workspaces">
          <Button size="sm" variant="outline">
            Return to Workspaces
          </Button>
        </Link>
      </div>
    );
  }

  const isAdmin = workspace.userRole === 'ADMIN' || user?.role === 'ADMIN';

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Workspace Hero Header */}
      <div className="relative rounded-2xl border border-border/80 bg-gradient-to-r from-card/90 via-card/60 to-primary/5 p-6 md:p-8 backdrop-blur-xl shadow-xl overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start gap-4">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 border border-white/10 flex items-center justify-center text-white shadow-xl shadow-blue-500/20 overflow-hidden shrink-0">
              {workspace.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={workspace.avatarUrl} alt={workspace.name} className="h-full w-full object-cover" />
              ) : (
                <Building2 className="h-8 w-8" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl md:text-3xl font-black tracking-tight text-foreground">
                  {workspace.name}
                </h1>
                <Badge variant="outline" className="font-mono text-xs border-primary/40 text-primary">
                  /{workspace.slug}
                </Badge>
                <Badge
                  variant={isAdmin ? 'default' : 'secondary'}
                  className="font-mono text-xs"
                >
                  <Shield className="h-3 w-3 mr-1" />
                  {workspace.userRole || 'DEVELOPER'}
                </Badge>
              </div>

              <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
                {workspace.description ||
                  'Central collaborative engineering workspace with automated code review and RAG indexing.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link href={`/workspaces/${workspace.id}/members`}>
              <Button variant="outline" size="sm" className="gap-2">
                <Users className="h-4 w-4 text-blue-400" />
                Team ({members.length})
              </Button>
            </Link>

            {isAdmin && (
              <Link href={`/workspaces/${workspace.id}/settings`}>
                <Button variant="outline" size="sm" className="gap-2">
                  <Settings className="h-4 w-4 text-muted-foreground" />
                  Settings
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card/60 border-border/80">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-blue-500/10 text-blue-500">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground">{members.length}</div>
              <div className="text-xs text-muted-foreground font-medium">Active Collaborators</div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/60 border-border/80">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-500">
              <FolderGit2 className="h-5 w-5" />
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground">4</div>
              <div className="text-xs text-muted-foreground font-medium">Connected Repositories</div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/60 border-border/80">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-500">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground">1,536-dim</div>
              <div className="text-xs text-muted-foreground font-medium">Postgres Vector RAG</div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/60 border-border/80">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-violet-500/10 text-violet-500">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground">Active</div>
              <div className="text-xs text-muted-foreground font-medium">AI Review Agents</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid: Repositories & Team Quick View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Connected Repositories Section */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <FolderGit2 className="h-5 w-5 text-primary" />
              Workspace Repositories
            </h2>
            <Button size="sm" variant="outline" className="text-xs gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              Link Repository
            </Button>
          </div>

          <div className="space-y-3">
            {[
              {
                name: 'devflow-ai/core-engine',
                branch: 'main',
                indexed: '1,420 AST Chunks',
                status: 'INDEXED',
                updated: '10 mins ago',
              },
              {
                name: 'devflow-ai/web-cockpit',
                branch: 'main',
                indexed: '850 AST Chunks',
                status: 'INDEXED',
                updated: '25 mins ago',
              },
              {
                name: 'devflow-ai/rag-pipeline',
                branch: 'feature/hybrid-search',
                indexed: '612 AST Chunks',
                status: 'INDEXING',
                updated: 'Just now',
              },
            ].map((repo, idx) => (
              <Card key={idx} className="bg-card/60 border-border/70 hover:border-primary/40 transition-colors">
                <CardContent className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-lg bg-muted/60 flex items-center justify-center text-muted-foreground shrink-0">
                      <GitBranch className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-foreground truncate hover:text-primary transition-colors cursor-pointer">
                        {repo.name}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground font-mono mt-0.5">
                        <span>{repo.branch}</span>
                        <span>•</span>
                        <span>{repo.indexed}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <Badge
                      variant={repo.status === 'INDEXED' ? 'success' : 'secondary'}
                      className="text-[10px] font-mono"
                    >
                      {repo.status === 'INDEXING' ? (
                        <Activity className="h-3 w-3 mr-1 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                      )}
                      {repo.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Team Members Snapshot */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-400" />
              Members ({members.length})
            </h2>
            <Link href={`/workspaces/${workspace.id}/members`}>
              <Button size="sm" variant="ghost" className="text-xs gap-1 text-primary">
                Manage
                <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </div>

          <Card className="bg-card/60 border-border/70">
            <CardContent className="p-4 divide-y divide-border/60 space-y-3">
              {members.map((mem) => (
                <div key={mem.id} className="pt-3 first:pt-0 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="h-8 w-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center overflow-hidden shrink-0">
                      {mem.user.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={mem.user.avatarUrl} alt={mem.user.name} className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-xs font-bold text-primary">{mem.user.name.charAt(0)}</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">{mem.user.name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{mem.user.email}</p>
                    </div>
                  </div>

                  <Badge variant="outline" className="font-mono text-[9px] shrink-0">
                    {mem.role}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

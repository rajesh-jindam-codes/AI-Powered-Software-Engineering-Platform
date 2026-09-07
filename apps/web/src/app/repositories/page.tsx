'use client';

import React from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  FolderGit2,
  GitBranch,
  Database,
  RefreshCw,
  Plus,
  ExternalLink,
  Lock,
  Globe,
  Star,
  CheckCircle2,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { useWorkspace } from '@/context/WorkspaceContext';

export default function RepositoriesPage() {
  const { activeWorkspace } = useWorkspace();

  const repos = [
    {
      id: 'repo-core-001',
      name: 'devflow-ai/core-engine',
      description: 'Core event bus, microservice orchestration, and workflow scheduling engine.',
      defaultBranch: 'main',
      status: 'indexed',
      language: 'TypeScript',
      starsCount: 142,
      lastSync: '10m ago',
    },
    {
      id: 'repo-web-002',
      name: 'devflow-ai/web-cockpit',
      description: 'Next.js developer portal, agent control cockpit, and AST explorer.',
      defaultBranch: 'main',
      status: 'indexed',
      language: 'TypeScript',
      starsCount: 89,
      lastSync: '25m ago',
    },
    {
      id: 'repo-rag-003',
      name: 'devflow-ai/rag-pipeline',
      description: 'AST chunk parsing, tree-sitter bindings, and pgvector embeddings generator.',
      defaultBranch: 'main',
      status: 'indexing',
      language: 'Python',
      starsCount: 310,
      lastSync: 'Just now',
    },
  ];

  const githubLink = activeWorkspace
    ? `/workspaces/${activeWorkspace.id}/github`
    : '/workspaces';

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-primary text-xs font-semibold tracking-wider uppercase">
            <FolderGit2 className="h-4 w-4" />
            <span>Codebase Architecture Hub</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground mt-1">
            Connected Repositories
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Git repositories continuously indexed with Tree-sitter AST and pgvector embeddings.
          </p>
        </div>

        <Link href={githubLink}>
          <Button size="sm" className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/20">
            <Plus className="h-4 w-4" />
            Connect Repository
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {repos.map((repo) => (
          <Card
            key={repo.id}
            className="border-border/80 bg-card/60 hover:border-primary/50 transition-all shadow-md group"
          >
            <CardContent className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-4 min-w-0">
                <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                  <FolderGit2 className="h-5 w-5" />
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <Link
                      href={`/repositories/${repo.id}`}
                      className="text-base font-bold text-foreground hover:text-primary transition-colors truncate"
                    >
                      {repo.name}
                    </Link>
                    <Badge variant="outline" className="text-[10px] font-mono text-amber-400 border-amber-500/30 gap-1">
                      <Lock className="h-2.5 w-2.5" />
                      PRIVATE
                    </Badge>
                    <Badge
                      variant={repo.status === 'indexed' ? 'success' : 'secondary'}
                      className="text-[10px] font-mono"
                    >
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      {repo.status.toUpperCase()}
                    </Badge>
                  </div>

                  <p className="text-xs text-muted-foreground mt-1 truncate max-w-2xl">
                    {repo.description}
                  </p>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground font-mono mt-2 flex-wrap">
                    <span className="flex items-center gap-1.5 text-foreground font-medium">
                      <GitBranch className="h-3.5 w-3.5 text-muted-foreground" />
                      {repo.defaultBranch}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                      {repo.language}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Star className="h-3 w-3 text-amber-400" />
                      {repo.starsCount}
                    </span>
                    <span>•</span>
                    <span>Synced {repo.lastSync}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Link href={`/repositories/${repo.id}`}>
                  <Button size="sm" className="gap-1.5 text-xs">
                    View Cockpit
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

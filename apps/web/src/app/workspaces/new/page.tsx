'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Building2,
  Sparkles,
  ArrowLeft,
  CheckCircle2,
  Shield,
  Layers,
  Bot,
  GitBranch,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { useWorkspace } from '@/context/WorkspaceContext';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';

export default function NewWorkspacePage() {
  const router = useRouter();
  const { createWorkspace } = useWorkspace();

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [defaultBranch, setDefaultBranch] = useState('main');
  const [aiIndexingEnabled, setAiIndexingEnabled] = useState(true);
  const [autoReviewPRs, setAutoReviewPRs] = useState(true);
  const [isCustomSlug, setIsCustomSlug] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleNameChange = (val: string) => {
    setName(val);
    if (!isCustomSlug) {
      setSlug(
        val
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, ''),
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Please provide a valid workspace name.');
      return;
    }

    setIsLoading(true);
    try {
      const workspace = await createWorkspace({
        name: name.trim(),
        slug: slug.trim() || undefined,
        description: description.trim() || undefined,
        avatarUrl: `https://api.dicebear.com/8.x/identicon/svg?seed=${encodeURIComponent(
          name.trim(),
        )}`,
        settings: {
          defaultBranch,
          aiIndexingEnabled,
          autoReviewPRs,
          allowedRoles: ['ADMIN', 'DEVELOPER', 'REVIEWER', 'VIEWER'],
        },
      });

      router.push(`/workspaces/${workspace.id}`);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to create workspace. Please check your inputs.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-4">
      {/* Back Link */}
      <Link
        href="/workspaces"
        className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Workspaces
      </Link>

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-primary text-xs font-semibold tracking-wider uppercase">
          <Sparkles className="h-4 w-4" />
          <span>Tenant Provisioning Wizard</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground mt-1">
          Create New Engineering Workspace
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Set up an isolated project environment with automated codebase RAG, AI agent policies, and multi-user RBAC.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl border border-destructive/50 bg-destructive/10 text-destructive text-sm flex items-center gap-3">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Details Card */}
        <Card className="border-border/80 bg-card/60 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Workspace Identity
            </CardTitle>
            <CardDescription className="text-xs">
              This uniquely identifies your engineering tenant and API boundary.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Workspace Name <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. Distributed Infrastructure & AI"
                className="w-full h-10 px-3.5 rounded-lg bg-background border border-input text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                URL Slug <span className="text-destructive">*</span>
              </label>
              <div className="flex rounded-lg border border-input bg-background overflow-hidden focus-within:ring-2 focus-within:ring-primary">
                <span className="px-3 bg-muted/60 text-muted-foreground text-xs flex items-center border-r border-input font-mono">
                  devflow.ai/
                </span>
                <input
                  type="text"
                  required
                  value={slug}
                  onChange={(e) => {
                    setIsCustomSlug(true);
                    setSlug(e.target.value);
                  }}
                  placeholder="distributed-infra-ai"
                  className="w-full h-10 px-3.5 bg-transparent text-sm text-foreground focus:outline-none font-mono"
                />
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Unique identifier used in URLs, webhooks, and Kafka event routing.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Description (Optional)
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide details on project scope, primary tech stack, or team goals..."
                className="w-full p-3 rounded-lg bg-background border border-input text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              />
            </div>
          </CardContent>
        </Card>

        {/* AI & Automation Engine Settings */}
        <Card className="border-border/80 bg-card/60 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Bot className="h-5 w-5 text-indigo-400" />
              AI & Pipeline Defaults
            </CardTitle>
            <CardDescription className="text-xs">
              Configure autonomous code review, vector RAG embeddings, and default git targets.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Default Git Branch
              </label>
              <select
                value={defaultBranch}
                onChange={(e) => setDefaultBranch(e.target.value)}
                className="w-full h-10 px-3.5 rounded-lg bg-background border border-input text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary font-mono"
              >
                <option value="main">main</option>
                <option value="master">master</option>
                <option value="develop">develop</option>
              </select>
            </div>

            <div className="pt-2 space-y-3">
              <label className="flex items-start gap-3 p-3 rounded-xl border border-border/80 bg-muted/20 cursor-pointer hover:bg-muted/40 transition-colors">
                <input
                  type="checkbox"
                  checked={aiIndexingEnabled}
                  onChange={(e) => setAiIndexingEnabled(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-input text-primary focus:ring-primary"
                />
                <div>
                  <div className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    Enable Codebase Vector Embeddings & RAG Indexing
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Parses code AST into semantic chunks with PostgreSQL pgvector (1536-dim embeddings) for hybrid search.
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 rounded-xl border border-border/80 bg-muted/20 cursor-pointer hover:bg-muted/40 transition-colors">
                <input
                  type="checkbox"
                  checked={autoReviewPRs}
                  onChange={(e) => setAutoReviewPRs(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-input text-primary focus:ring-primary"
                />
                <div>
                  <div className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                    Autonomous AI Pull Request Reviews
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Automatically generates architectural, security, and performance feedback on new pull requests.
                  </p>
                </div>
              </label>
            </div>
          </CardContent>

          <CardFooter className="flex justify-between items-center border-t border-border/60 pt-4">
            <Link href="/workspaces">
              <Button type="button" variant="outline" size="sm">
                Cancel
              </Button>
            </Link>

            <Button
              type="submit"
              disabled={isLoading || !name.trim()}
              className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/20"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Provisioning Workspace...
                </>
              ) : (
                <>
                  <Building2 className="h-4 w-4" />
                  Create Workspace
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}

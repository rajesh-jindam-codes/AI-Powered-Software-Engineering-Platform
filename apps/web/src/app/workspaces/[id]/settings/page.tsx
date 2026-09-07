'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Settings,
  Building2,
  Trash2,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Sparkles,
  Bot,
  Shield,
  Save,
  Loader2,
} from 'lucide-react';
import { useWorkspace } from '@/context/WorkspaceContext';
import { useAuth } from '@/context/AuthContext';
import { Workspace } from '@devflow/shared-types';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';

export default function WorkspaceSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params.id as string;

  const { getWorkspace, updateWorkspace, deleteWorkspace } = useWorkspace();
  const { user } = useAuth();

  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [defaultBranch, setDefaultBranch] = useState('main');
  const [aiIndexingEnabled, setAiIndexingEnabled] = useState(true);
  const [autoReviewPRs, setAutoReviewPRs] = useState(true);

  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadWorkspace = useCallback(async () => {
    setIsLoading(true);
    try {
      const ws = await getWorkspace(workspaceId);
      setWorkspace(ws);
      setName(ws.name);
      setSlug(ws.slug);
      setDescription(ws.description || '');
      if (ws.settings) {
        setDefaultBranch(ws.settings.defaultBranch || 'main');
        setAiIndexingEnabled(ws.settings.aiIndexingEnabled ?? true);
        setAutoReviewPRs(ws.settings.autoReviewPRs ?? true);
      }
    } catch {
      setFeedback({ type: 'error', message: 'Failed to load workspace settings.' });
    } finally {
      setIsLoading(false);
    }
  }, [getWorkspace, workspaceId]);

  useEffect(() => {
    loadWorkspace();
  }, [loadWorkspace]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    setIsSaving(true);
    try {
      const updated = await updateWorkspace(workspaceId, {
        name,
        slug,
        description,
        settings: {
          defaultBranch,
          aiIndexingEnabled,
          autoReviewPRs,
          allowedRoles: ['ADMIN', 'DEVELOPER', 'REVIEWER', 'VIEWER'],
        },
      });
      setWorkspace(updated);
      setFeedback({ type: 'success', message: 'Workspace configuration updated successfully.' });
    } catch (err: unknown) {
      if (err instanceof Error) {
        setFeedback({ type: 'error', message: err.message });
      } else {
        setFeedback({ type: 'error', message: 'Failed to update workspace.' });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!workspace || deleteConfirmText !== workspace.slug) {
      setFeedback({
        type: 'error',
        message: `Please type '${workspace?.slug}' to confirm workspace deletion.`,
      });
      return;
    }

    setIsDeleting(true);
    try {
      await deleteWorkspace(workspaceId);
      router.push('/workspaces');
    } catch (err: unknown) {
      if (err instanceof Error) {
        setFeedback({ type: 'error', message: err.message });
      } else {
        setFeedback({ type: 'error', message: 'Failed to delete workspace.' });
      }
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return <div className="max-w-4xl mx-auto p-12 text-center text-muted-foreground animate-pulse">Loading workspace settings...</div>;
  }

  if (!workspace) {
    return (
      <div className="max-w-xl mx-auto p-8 rounded-xl border border-border text-center space-y-3">
        <h2 className="text-base font-bold">Workspace Not Found</h2>
        <Link href="/workspaces">
          <Button size="sm">Back to Workspaces</Button>
        </Link>
      </div>
    );
  }

  const isAdmin = workspace.userRole === 'ADMIN' || user?.role === 'ADMIN';

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-4">
      {/* Back Link */}
      <Link
        href={`/workspaces/${workspaceId}`}
        className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to {workspace.name}
      </Link>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-primary text-xs font-semibold tracking-wider uppercase">
            <Settings className="h-4 w-4" />
            <span>Workspace Administration</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground mt-1">
            Workspace Settings
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure metadata, AI vectorization policies, and tenant lifecycle.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href={`/workspaces/${workspaceId}/members`}>
            <Button variant="outline" size="sm">
              Manage Members
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
            <AlertTriangle className="h-5 w-5 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {!isAdmin && (
        <div className="p-4 rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-300 text-xs flex items-center gap-3">
          <Shield className="h-4 w-4 shrink-0" />
          <span>You have read-only access to these settings. Only workspace administrators can save changes.</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* General Identity */}
        <Card className="border-border/80 bg-card/60 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              General Configuration
            </CardTitle>
            <CardDescription className="text-xs">
              Manage public workspace identification and description.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Workspace Name
              </label>
              <input
                type="text"
                disabled={!isAdmin}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-10 px-3.5 rounded-lg bg-background border border-input text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                URL Slug
              </label>
              <input
                type="text"
                disabled={!isAdmin}
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="w-full h-10 px-3.5 rounded-lg bg-background border border-input text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary font-mono disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Description
              </label>
              <textarea
                rows={3}
                disabled={!isAdmin}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-3 rounded-lg bg-background border border-input text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none disabled:opacity-60"
              />
            </div>
          </CardContent>
        </Card>

        {/* AI & Automation Engine */}
        <Card className="border-border/80 bg-card/60 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Bot className="h-5 w-5 text-indigo-400" />
              AI & Pipeline Engine Policies
            </CardTitle>
            <CardDescription className="text-xs">
              Configure RAG embedding triggers, automated reviews, and default branch targets.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Default Branch
              </label>
              <select
                disabled={!isAdmin}
                value={defaultBranch}
                onChange={(e) => setDefaultBranch(e.target.value)}
                className="w-full h-10 px-3.5 rounded-lg bg-background border border-input text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary font-mono disabled:opacity-60"
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
                  disabled={!isAdmin}
                  checked={aiIndexingEnabled}
                  onChange={(e) => setAiIndexingEnabled(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-input text-primary focus:ring-primary disabled:opacity-60"
                />
                <div>
                  <div className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    Continuous Vector Embedding Indexing
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Automatically update pgvector embeddings whenever new commits are pushed to repositories in this workspace.
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 rounded-xl border border-border/80 bg-muted/20 cursor-pointer hover:bg-muted/40 transition-colors">
                <input
                  type="checkbox"
                  disabled={!isAdmin}
                  checked={autoReviewPRs}
                  onChange={(e) => setAutoReviewPRs(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-input text-primary focus:ring-primary disabled:opacity-60"
                />
                <div>
                  <div className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                    Automated AI Pull Request Reviews
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Trigger the AI Review Agent on all open PRs against the default branch.
                  </p>
                </div>
              </label>
            </div>
          </CardContent>

          {isAdmin && (
            <CardFooter className="flex justify-end border-t border-border/60 pt-4">
              <Button
                type="submit"
                disabled={isSaving}
                className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-md shadow-blue-500/20"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving Changes...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </CardFooter>
          )}
        </Card>
      </form>

      {/* Danger Zone */}
      {isAdmin && (
        <Card className="border-destructive/40 bg-destructive/5 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-destructive flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Danger Zone
            </CardTitle>
            <CardDescription className="text-xs text-destructive/80">
              Irreversible actions that will permanently delete this workspace and all associated repositories, vectors, and member mappings.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="p-3.5 rounded-xl border border-destructive/30 bg-destructive/10 text-xs text-destructive space-y-1">
              <p className="font-semibold">Warning: This action cannot be undone.</p>
              <p>
                All codebase AST chunks, RAG embeddings, background worker tasks, and member authorizations will be deleted immediately.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Type <span className="font-mono font-bold text-destructive">{workspace.slug}</span> to confirm:
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder={workspace.slug}
                className="w-full h-10 px-3.5 rounded-lg bg-background border border-destructive/50 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-destructive font-mono"
              />
            </div>
          </CardContent>

          <CardFooter className="flex justify-end border-t border-destructive/20 pt-4">
            <Button
              type="button"
              variant="destructive"
              disabled={deleteConfirmText !== workspace.slug || isDeleting}
              onClick={handleDelete}
              className="gap-2"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Deleting Workspace...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Permanently Delete Workspace
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}

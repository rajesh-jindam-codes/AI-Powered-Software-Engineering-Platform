'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Building2,
  Plus,
  Search,
  Users,
  GitBranch,
  Shield,
  ArrowRight,
  ExternalLink,
  Settings,
  Sparkles,
  Layers,
  Calendar,
  CheckCircle2,
} from 'lucide-react';
import { useWorkspace } from '@/context/WorkspaceContext';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

export default function WorkspacesPage() {
  const { workspaces, activeWorkspace, selectWorkspace, isLoading } = useWorkspace();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredWorkspaces = workspaces.filter(
    (ws) =>
      ws.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ws.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ws.description && ws.description.toLowerCase().includes(searchQuery.toLowerCase())),
  );

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/80 pb-6">
        <div>
          <div className="flex items-center gap-2 text-primary text-xs font-semibold tracking-wider uppercase">
            <Layers className="h-4 w-4" />
            <span>Multi-Tenant Engineering Platform</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground mt-1">
            Workspaces & Organizations
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your engineering teams, codebase boundaries, AI indexing, and role-based permissions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/workspaces/new">
            <Button className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/20">
              <Plus className="h-4 w-4" />
              New Workspace
            </Button>
          </Link>
        </div>
      </div>

      {/* Search & Active Workspace Banner */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Search Bar */}
        <div className="lg:col-span-2 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search workspaces by name, slug, or description..."
            className="w-full h-11 pl-10 pr-4 rounded-xl bg-card/60 backdrop-blur-md border border-input text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all"
          />
        </div>

        {/* Current Active Workspace Indicator */}
        <div className="p-3.5 rounded-xl border border-primary/30 bg-primary/5 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-9 w-9 rounded-lg bg-primary/20 border border-primary/40 flex items-center justify-center shrink-0">
              <Building2 className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <div className="text-xs text-muted-foreground flex items-center gap-1.5 font-mono">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                ACTIVE TENANT
              </div>
              <p className="text-sm font-semibold truncate text-foreground">
                {activeWorkspace ? activeWorkspace.name : 'No workspace selected'}
              </p>
            </div>
          </div>
          {activeWorkspace && (
            <Badge variant="outline" className="border-primary/40 text-primary font-mono text-[10px]">
              {activeWorkspace.userRole || 'MEMBER'}
            </Badge>
          )}
        </div>
      </div>

      {/* Workspaces Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-64 rounded-2xl border border-border/60 bg-card/40 animate-pulse p-6"
            />
          ))}
        </div>
      ) : filteredWorkspaces.length === 0 ? (
        <div className="p-12 rounded-2xl border border-dashed border-border text-center space-y-4 bg-card/20">
          <div className="h-14 w-14 rounded-2xl bg-muted/60 mx-auto flex items-center justify-center text-muted-foreground">
            <Building2 className="h-7 w-7" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-foreground">No workspaces found</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              {searchQuery
                ? `No workspaces match query "${searchQuery}". Try another keyword.`
                : "You haven't created or joined any workspaces yet."}
            </p>
          </div>
          <Link href="/workspaces/new">
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Create Your First Workspace
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredWorkspaces.map((ws) => {
            const isActive = activeWorkspace?.id === ws.id;
            return (
              <Card
                key={ws.id}
                className={`relative overflow-hidden transition-all duration-200 hover:shadow-xl hover:border-primary/50 group ${
                  isActive ? 'border-primary/60 bg-gradient-to-b from-primary/5 to-card' : 'bg-card/60'
                }`}
              >
                {isActive && (
                  <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />
                )}

                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-11 w-11 rounded-xl bg-gradient-to-tr from-blue-600/20 to-indigo-600/20 border border-border flex items-center justify-center overflow-hidden shrink-0">
                        {ws.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={ws.avatarUrl} alt={ws.name} className="h-full w-full object-cover" />
                        ) : (
                          <Building2 className="h-5 w-5 text-primary" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <CardTitle className="text-base font-bold text-foreground truncate group-hover:text-primary transition-colors">
                          {ws.name}
                        </CardTitle>
                        <CardDescription className="font-mono text-xs text-muted-foreground">
                          /{ws.slug}
                        </CardDescription>
                      </div>
                    </div>

                    <Badge
                      variant={
                        ws.userRole === 'ADMIN'
                          ? 'default'
                          : ws.userRole === 'DEVELOPER'
                          ? 'secondary'
                          : 'outline'
                      }
                      className="shrink-0 font-mono text-[10px]"
                    >
                      <Shield className="h-2.5 w-2.5 mr-1 text-primary" />
                      {ws.userRole || 'DEVELOPER'}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <p className="text-xs text-muted-foreground line-clamp-2 min-h-[32px]">
                    {ws.description || 'Enterprise collaborative software engineering and AI workspace.'}
                  </p>

                  {/* Metadata Stats */}
                  <div className="grid grid-cols-2 gap-2 p-2.5 rounded-lg bg-muted/30 border border-border/50 text-xs">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Users className="h-3.5 w-3.5 text-blue-400" />
                      <span>{ws.memberCount || 1} Members</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <GitBranch className="h-3.5 w-3.5 text-indigo-400" />
                      <span>{ws.repositoryCount || 0} Repositories</span>
                    </div>
                  </div>

                  {/* AI & Policy Flags */}
                  <div className="flex items-center gap-2 flex-wrap text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1 text-emerald-400">
                      <Sparkles className="h-3 w-3" />
                      AI RAG Active
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3 text-blue-400" />
                      Auto-Review
                    </span>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 pt-2 border-t border-border/60">
                    <Button
                      variant={isActive ? 'secondary' : 'default'}
                      size="sm"
                      onClick={() => selectWorkspace(ws.id)}
                      className="flex-1 text-xs gap-1.5"
                    >
                      {isActive ? 'Current Active' : 'Switch To'}
                    </Button>

                    <Link href={`/workspaces/${ws.id}`}>
                      <Button variant="outline" size="sm" className="text-xs px-2.5" title="View Workspace">
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </Link>

                    <Link href={`/workspaces/${ws.id}/settings`}>
                      <Button variant="outline" size="sm" className="text-xs px-2.5" title="Settings">
                        <Settings className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

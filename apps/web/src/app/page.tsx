import React from 'react';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { ActiveAgentsWidget } from '@/components/dashboard/ActiveAgentsWidget';
import { RecentActivityWidget } from '@/components/dashboard/RecentActivityWidget';
import { CodebaseHealthWidget } from '@/components/dashboard/CodebaseHealthWidget';
import { Button } from '@/components/ui/button';
import { FolderGit2, Bot, GitPullRequest, Activity, Plus, Sparkles } from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            Engineering Cockpit
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 font-mono font-medium border border-blue-500/20">
              PHASE 1 ACTIVE
            </span>
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Multiplayer AI orchestration, AST codebase intelligence, and real-time review pipeline.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/repositories">
            <Button variant="outline" size="sm" className="gap-2">
              <FolderGit2 className="h-4 w-4" />
              Connect Repo
            </Button>
          </Link>
          <Link href="/agents">
            <Button
              size="sm"
              className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-lg shadow-blue-500/20"
            >
              <Sparkles className="h-4 w-4" />
              Dispatch Agent Task
            </Button>
          </Link>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Connected Repos"
          value="12"
          delta="+2 this week"
          deltaType="positive"
          description="100% AST index coverage"
          icon={FolderGit2}
          iconColor="text-blue-500"
        />
        <MetricCard
          title="Active AI Agents"
          value="3"
          delta="2 verifying"
          deltaType="positive"
          description="Isolated in gVisor sandboxes"
          icon={Bot}
          iconColor="text-indigo-500"
        />
        <MetricCard
          title="Pending PR Reviews"
          value="5"
          delta="Avg score: 96"
          deltaType="neutral"
          description="Automated inline annotations"
          icon={GitPullRequest}
          iconColor="text-purple-500"
        />
        <MetricCard
          title="Test Coverage Delta"
          value="+18.4%"
          delta="Verified in sandbox"
          deltaType="positive"
          description="AI mutation test generation"
          icon={Activity}
          iconColor="text-emerald-500"
        />
      </div>

      {/* Middle Grid: Active Agents & Codebase Health */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ActiveAgentsWidget />
        <CodebaseHealthWidget />
      </div>

      {/* Bottom Grid: Recent Activity Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="col-span-1 lg:col-span-2">
          <RecentActivityWidget />
        </div>
        <div className="col-span-1 p-6 rounded-xl border border-border bg-card flex flex-col justify-between">
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-blue-500" />
              Quick Agent Prompts
            </h3>
            <p className="text-xs text-muted-foreground">
              Run autonomous tasks with continuous AST verification and sandbox tests:
            </p>
            <div className="space-y-2 text-xs">
              <div className="p-2.5 rounded-lg border border-border/60 bg-muted/30 hover:border-primary/40 cursor-pointer transition-colors">
                &ldquo;Add idempotency key middleware using Redis to payments API&rdquo;
              </div>
              <div className="p-2.5 rounded-lg border border-border/60 bg-muted/30 hover:border-primary/40 cursor-pointer transition-colors">
                &ldquo;Generate unit tests for all uncovered methods in AuthService&rdquo;
              </div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
            <span>LLM Gateway: Multi-Model Router</span>
            <span className="font-mono text-emerald-500">READY</span>
          </div>
        </div>
      </div>
    </div>
  );
}

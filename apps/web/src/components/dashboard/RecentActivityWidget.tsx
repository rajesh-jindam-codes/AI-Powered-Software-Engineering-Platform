import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { GitPullRequest, GitCommit, ShieldCheck, CheckCircle2, Clock } from 'lucide-react';
import { formatTimeAgo } from '@devflow/ui';

interface ActivityItem {
  id: string;
  type: 'pr_review' | 'commit_sync' | 'security_scan' | 'test_run';
  title: string;
  description: string;
  timestamp: string;
}

const mockActivities: ActivityItem[] = [
  {
    id: 'act-1',
    type: 'pr_review',
    title: 'PR #142 Code Review Completed',
    description: 'Found 0 vulnerabilities, 2 performance suggestions posted.',
    timestamp: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
  },
  {
    id: 'act-2',
    type: 'commit_sync',
    title: 'AST Index Updated (9f8377f)',
    description: '34 TypeScript files re-chunked and embedded in pgvector.',
    timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
  },
  {
    id: 'act-3',
    type: 'test_run',
    title: 'AI Test Suite Generated',
    description: 'Created 8 mutation unit tests for PaymentService. 100% pass.',
    timestamp: new Date(Date.now() - 1000 * 60 * 110).toISOString(),
  },
  {
    id: 'act-4',
    type: 'security_scan',
    title: 'Zero Secret Leaks Verified',
    description: 'Pre-commit entropy scanner cleared commit bundle.',
    timestamp: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
  },
];

export function RecentActivityWidget() {
  const getIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'pr_review':
        return <GitPullRequest className="h-4 w-4 text-purple-500" />;
      case 'commit_sync':
        return <GitCommit className="h-4 w-4 text-blue-500" />;
      case 'test_run':
        return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
      case 'security_scan':
        return <ShieldCheck className="h-4 w-4 text-cyan-500" />;
    }
  };

  return (
    <Card className="col-span-1">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="h-5 w-5 text-indigo-500" />
          Live Event Stream
        </CardTitle>
        <CardDescription>Recent Kafka-driven events and platform triggers</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {mockActivities.map((act) => (
          <div
            key={act.id}
            className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-muted/40 transition-colors"
          >
            <div className="mt-0.5 p-1.5 rounded-md bg-muted/60">{getIcon(act.type)}</div>
            <div className="flex-1 space-y-0.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">{act.title}</span>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {formatTimeAgo(act.timestamp)}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-snug">{act.description}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

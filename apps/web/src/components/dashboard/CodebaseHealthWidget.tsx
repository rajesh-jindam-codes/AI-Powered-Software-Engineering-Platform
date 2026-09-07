import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { ShieldCheck, Zap, Database, Check } from 'lucide-react';

export function CodebaseHealthWidget() {
  return (
    <Card className="col-span-1">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Zap className="h-5 w-5 text-amber-500" />
          Codebase Health & RAG Index
        </CardTitle>
        <CardDescription>Vector embeddings and AST graph status</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-2 text-muted-foreground">
              <Database className="h-4 w-4 text-blue-500" />
              pgvector HNSW Chunks
            </span>
            <span className="font-mono font-semibold text-foreground">148,920 chunks</span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-2 text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              Security Vulnerabilities
            </span>
            <span className="font-mono font-semibold text-emerald-500 flex items-center gap-1">
              <Check className="h-3 w-3" /> 0 Critical
            </span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-2 text-muted-foreground">
              <Zap className="h-4 w-4 text-purple-500" />
              Mean Vector Recall (HNSW)
            </span>
            <span className="font-mono font-semibold text-foreground">98.4%</span>
          </div>
        </div>

        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-600 dark:text-emerald-400">
          All repository branches are continuously synchronized via GitHub Webhooks with 0 Kafka
          lag.
        </div>
      </CardContent>
    </Card>
  );
}

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Settings, Shield, Cpu, Database, Bell } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Settings className="h-6 w-6 text-foreground" />
          Workspace Configuration
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage AI model routing, vector store indexing rules, and execution sandbox limits.
        </p>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Cpu className="h-5 w-5 text-blue-500" />
              LLM Model Routing & Token Quotas
            </CardTitle>
            <CardDescription>
              Configure default foundation models for reasoning, reviews, and embeddings.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex items-center justify-between p-3 rounded-lg border border-border">
              <div>
                <span className="font-semibold text-foreground">Coding Agent Tier</span>
                <p className="text-xs text-muted-foreground">
                  Primary model for multi-step reasoning and patch generation.
                </p>
              </div>
              <Badge variant="outline" className="font-mono">
                claude-3-5-sonnet
              </Badge>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg border border-border">
              <div>
                <span className="font-semibold text-foreground">PR Review & Test Generation</span>
                <p className="text-xs text-muted-foreground">
                  Model for automated diff analysis and test synthesis.
                </p>
              </div>
              <Badge variant="outline" className="font-mono">
                gpt-4o
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-5 w-5 text-emerald-500" />
              Sandbox Security & Isolation
            </CardTitle>
            <CardDescription>
              Execution parameters for running untrusted code and test suites.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="flex items-center justify-between py-1 border-b border-border">
              <span className="text-muted-foreground">Kernel Virtualization Engine</span>
              <span className="font-mono font-medium text-foreground">gVisor (runsc)</span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-border">
              <span className="text-muted-foreground">Sandbox Memory Ceiling</span>
              <span className="font-mono font-medium text-foreground">1024 MB</span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-border">
              <span className="text-muted-foreground">Network Egress Policy</span>
              <span className="font-mono font-medium text-emerald-500">
                DENY_ALL (Loopback Only)
              </span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-muted-foreground">Execution Watchdog Timeout</span>
              <span className="font-mono font-medium text-foreground">60 Seconds</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bot, Terminal, Cpu, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';

interface AgentTaskItem {
  id: string;
  title: string;
  repo: string;
  model: string;
  status: 'planning' | 'executing' | 'verifying' | 'completed';
  currentStep: string;
  progressPercent: number;
}

const mockAgentTasks: AgentTaskItem[] = [
  {
    id: 'task-101',
    title: 'Implement Redis Sliding-Window Rate Limiter',
    repo: 'devflow-ai/api',
    model: 'claude-3.5-sonnet',
    status: 'executing',
    currentStep: 'Step 4/6: Executing Jest unit tests in gVisor sandbox',
    progressPercent: 65,
  },
  {
    id: 'task-102',
    title: 'Generate AST Symbol Call Graph for AuthModule',
    repo: 'devflow-ai/ai-service',
    model: 'gpt-4o',
    status: 'verifying',
    currentStep: 'Step 3/3: Validating Tree-sitter node definitions',
    progressPercent: 90,
  },
  {
    id: 'task-103',
    title: 'Add CloudEvents v1.0 Header Validation',
    repo: 'devflow-ai/event-schemas',
    model: 'gpt-4o',
    status: 'planning',
    currentStep: 'Step 1/4: Analyzing schema contract dependencies',
    progressPercent: 25,
  },
];

export function ActiveAgentsWidget() {
  return (
    <Card className="col-span-1 lg:col-span-2">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            <Bot className="h-5 w-5 text-blue-500" />
            Active Autonomous Coding Agents
          </CardTitle>
          <CardDescription>
            Live agent tasks running in isolated execution sandboxes
          </CardDescription>
        </div>
        <Link
          href="/agents"
          className="text-xs text-primary hover:underline flex items-center gap-1 font-medium"
        >
          View all agents
          <ArrowUpRight className="h-3 w-3" />
        </Link>
      </CardHeader>
      <CardContent className="space-y-4">
        {mockAgentTasks.map((task) => (
          <div
            key={task.id}
            className="p-4 rounded-lg border border-border bg-card hover:bg-accent/40 transition-colors space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="font-semibold text-sm text-foreground">{task.title}</span>
                <span className="text-xs text-muted-foreground font-mono">({task.repo})</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-mono text-[10px] flex items-center gap-1">
                  <Cpu className="h-3 w-3 text-indigo-500" />
                  {task.model}
                </Badge>
                <Badge
                  variant={
                    task.status === 'executing'
                      ? 'warning'
                      : task.status === 'verifying'
                        ? 'success'
                        : 'secondary'
                  }
                  className="capitalize font-mono text-[10px]"
                >
                  {task.status}
                </Badge>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5 text-[11px]">
                  <Terminal className="h-3.5 w-3.5 text-blue-500" />
                  {task.currentStep}
                </span>
                <span className="font-mono text-[11px] font-medium">{task.progressPercent}%</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-500"
                  style={{ width: `${task.progressPercent}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

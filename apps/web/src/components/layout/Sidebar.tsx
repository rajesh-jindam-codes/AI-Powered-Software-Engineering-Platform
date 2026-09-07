'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Building2,
  FolderGit2,
  Bot,
  GitPullRequest,
  Users,
  Settings,
  Sparkles,
  Layers,
  Terminal,
  User as UserIcon,
  ChevronRight,
  Shield,
  ChevronsUpDown,
  Cpu,
  MessageSquareCode,
  Activity,
  FlaskConical,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/AuthContext';
import { useWorkspace } from '@/context/WorkspaceContext';

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { activeWorkspace, workspaces } = useWorkspace();

  const navItems = [
    { label: 'Overview', href: '/', icon: LayoutDashboard },
    {
      label: 'Workspaces',
      href: '/workspaces',
      icon: Building2,
      count: `${workspaces.length}`,
    },
    { label: 'Repositories', href: '/repositories', icon: FolderGit2, count: '4' },
    { label: 'AI Codebase Chat', href: '/chat', icon: MessageSquareCode, count: 'RAG live', highlight: true },
    { label: 'Autonomous Agents', href: '/agents', icon: Bot, count: 'ReAct' },
    { label: 'AI Code Reviews', href: '/reviews', icon: GitPullRequest, count: '5' },
    { label: 'AI Test Studio', href: '/tests', icon: FlaskConical, count: 'Self-Heal', highlight: true },
    { label: 'Live Collaboration', href: '/collaboration', icon: Users, count: 'CRDT' },
    { label: 'Jobs & Queue', href: '/jobs', icon: Cpu, count: 'Kafka' },
    { label: 'Observability & Security', href: '/observability', icon: Activity, count: '98% pass', highlight: true },
    {
      label: 'Settings',
      href: activeWorkspace ? `/workspaces/${activeWorkspace.id}/settings` : '/settings',
      icon: Settings,
    },
  ];

  return (
    <aside className="w-64 border-r border-border bg-card/50 backdrop-blur-xl flex flex-col justify-between h-screen sticky top-0">
      {/* Brand & Workspace Switcher */}
      <div className="overflow-y-auto">
        <div className="h-16 flex items-center px-6 border-b border-border gap-3">
          <div className="h-9 w-9 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <span className="font-bold text-base tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              DEVFLOW AI
            </span>
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] text-muted-foreground font-mono">
                {user?.role ? `ROLE: ${user.role}` : 'WORKSPACE: PRO'}
              </span>
            </div>
          </div>
        </div>

        {/* Workspace Switcher Component */}
        <div className="px-3 pt-3">
          <Link
            href="/workspaces"
            className="flex items-center justify-between p-2.5 rounded-xl border border-border/70 bg-muted/30 hover:bg-muted/60 hover:border-primary/40 transition-all text-xs group"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-7 w-7 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center text-primary font-bold shrink-0">
                <Building2 className="h-4 w-4" />
              </div>
              <div className="min-w-0 text-left">
                <div className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                  {activeWorkspace ? activeWorkspace.name : 'Select Workspace'}
                </div>
                <div className="text-[10px] text-muted-foreground font-mono truncate">
                  {activeWorkspace ? `/${activeWorkspace.slug}` : 'Multi-Tenant'}
                </div>
              </div>
            </div>
            <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          </Link>
        </div>

        {/* Navigation Section */}
        <div className="px-3 py-3 space-y-1">
          <div className="px-3 pb-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Platform Cockpit
          </div>
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                href={item.href}
                className={cn(
                  'flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all group',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20'
                    : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
                )}
              >
                <div className="flex items-center gap-2.5">
                  <Icon
                    className={cn(
                      'h-4 w-4 transition-transform group-hover:scale-110',
                      isActive ? 'text-primary-foreground' : 'text-muted-foreground',
                    )}
                  />
                  <span>{item.label}</span>
                </div>
                {item.count && (
                  <Badge
                    variant={isActive ? 'secondary' : item.highlight ? 'success' : 'outline'}
                    className="text-[9px] px-1.5 py-0 h-4 font-mono"
                  >
                    {item.count}
                  </Badge>
                )}
              </Link>
            );
          })}
        </div>

        {/* Subsystems Status */}
        <div className="px-5 py-2">
          <div className="p-2.5 rounded-lg border border-border/60 bg-muted/20 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-medium">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Terminal className="h-3 w-3 text-blue-500" />
                Workspace RBAC
              </span>
              <span className="text-[10px] text-emerald-500 font-mono">ISOLATED</span>
            </div>
            <div className="flex items-center justify-between text-[11px] font-medium">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Layers className="h-3 w-3 text-indigo-500" />
                Vector Index (HNSW)
              </span>
              <span className="text-[10px] text-emerald-500 font-mono">READY</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer User Info */}
      <div className="p-3 border-t border-border">
        <Link
          href="/settings"
          className="flex items-center justify-between p-2 rounded-lg bg-card border border-border text-xs hover:border-primary/40 transition-colors"
        >
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs overflow-hidden">
              {user?.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.avatarUrl} alt={user.name} className="h-full w-full object-cover" />
              ) : (
                <UserIcon className="h-4 w-4" />
              )}
            </div>
            <div className="flex flex-col text-left">
              <span className="font-medium text-foreground truncate max-w-[110px]">
                {user?.name || 'devflow-user'}
              </span>
              <span className="text-[10px] text-muted-foreground font-mono flex items-center gap-1">
                <Shield className="h-2.5 w-2.5 text-blue-500" />
                {user?.role || 'DEVELOPER'}
              </span>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </Link>
      </div>
    </aside>
  );
}

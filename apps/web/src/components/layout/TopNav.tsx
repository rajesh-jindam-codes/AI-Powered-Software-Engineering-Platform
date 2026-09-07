'use client';

import React from 'react';
import Link from 'next/link';
import { Search, Bell, GitBranch, Activity, User as UserIcon, LogOut, Shield } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/AuthContext';

export function TopNav() {
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <header className="h-16 border-b border-border bg-card/40 backdrop-blur-xl px-8 flex items-center justify-between sticky top-0 z-30">
      {/* Search & Breadcrumb */}
      <div className="flex items-center gap-4 w-96">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search code, AST symbols, agent tasks (⌘K)..."
            className="w-full h-9 pl-9 pr-4 rounded-lg bg-muted/40 border border-input text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:bg-background transition-all"
          />
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* System Health Pill */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-500 text-xs font-medium">
          <Activity className="h-3.5 w-3.5 animate-pulse" />
          <span className="font-mono text-[11px]">SERVICES: HEALTHY</span>
        </div>

        {/* GitHub Status */}
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-lg border border-border bg-muted/30 text-xs text-muted-foreground">
          <GitBranch className="h-3.5 w-3.5 text-foreground" />
          <span>main</span>
        </div>

        {/* Notification Bell */}
        <Button variant="ghost" size="icon" className="relative h-9 w-9 text-muted-foreground">
          <Bell className="h-4 w-4" />
          <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-blue-500" />
        </Button>

        {/* Theme Toggle */}
        <ThemeToggle />

        {/* User Profile / Auth State */}
        {isAuthenticated && user ? (
          <div className="flex items-center gap-2 pl-2 border-l border-border">
            <Link
              href="/settings/profile"
              className="flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-muted/50 transition-colors"
              title="View Profile Settings"
            >
              <div className="h-7 w-7 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center overflow-hidden">
                {user.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.avatarUrl}
                    alt={user.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <UserIcon className="h-4 w-4 text-primary" />
                )}
              </div>
              <div className="hidden lg:flex flex-col text-left">
                <span className="text-xs font-semibold text-foreground leading-tight">
                  {user.name}
                </span>
                <span className="text-[10px] text-muted-foreground font-mono flex items-center gap-1">
                  <Shield className="h-2.5 w-2.5 text-blue-500" />
                  {user.role}
                </span>
              </div>
            </Link>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => logout()}
              className="h-8 w-8 text-muted-foreground hover:text-rose-500"
              title="Log Out"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <Link href="/login">
            <Button size="sm" className="gap-1.5 text-xs">
              <UserIcon className="h-3.5 w-3.5" />
              Sign In
            </Button>
          </Link>
        )}
      </div>
    </header>
  );
}

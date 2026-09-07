/**
 * DEVFLOW AI — Shared UI Design System Tokens & Constants
 */

export const THEME_COLORS = {
  brand: {
    50: '#f0f4ff',
    100: '#dbe4ff',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    900: '#1e3a8a',
  },
  accent: {
    purple: '#8b5cf6',
    cyan: '#06b6d4',
    emerald: '#10b981',
    amber: '#f59e0b',
    rose: '#f43f5e',
  },
  status: {
    healthy: '#10b981',
    degraded: '#f59e0b',
    failed: '#ef4444',
    running: '#3b82f6',
  },
} as const;

export const NAVIGATION_ITEMS = [
  { label: 'Overview', href: '/', icon: 'LayoutDashboard' },
  { label: 'Repositories', href: '/repositories', icon: 'FolderGit2' },
  { label: 'AI Agents', href: '/agents', icon: 'Bot' },
  { label: 'Code Reviews', href: '/reviews', icon: 'GitPullRequest' },
  { label: 'Settings', href: '/settings', icon: 'Settings' },
] as const;

export function formatTimeAgo(timestamp: string | number | Date): string {
  const date = new Date(timestamp);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return `${Math.max(1, seconds)}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

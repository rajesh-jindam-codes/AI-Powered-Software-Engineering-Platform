'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  Workspace,
  WorkspaceMember,
  WorkspaceInvitation,
  CreateWorkspaceRequest,
  UpdateWorkspaceRequest,
  InviteMemberRequest,
  UserRole,
} from '@devflow/shared-types';
import { useAuth } from './AuthContext';

interface WorkspaceContextType {
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  isLoading: boolean;
  error: string | null;
  selectWorkspace: (workspaceId: string) => void;
  fetchWorkspaces: () => Promise<Workspace[]>;
  getWorkspace: (id: string) => Promise<Workspace>;
  createWorkspace: (dto: CreateWorkspaceRequest) => Promise<Workspace>;
  updateWorkspace: (id: string, dto: UpdateWorkspaceRequest) => Promise<Workspace>;
  deleteWorkspace: (id: string) => Promise<void>;
  listMembers: (id: string) => Promise<WorkspaceMember[]>;
  inviteMember: (id: string, dto: InviteMemberRequest) => Promise<WorkspaceInvitation>;
  listInvitations: (id: string) => Promise<WorkspaceInvitation[]>;
  updateMemberRole: (workspaceId: string, userId: string, role: UserRole) => Promise<WorkspaceMember>;
  removeMember: (workspaceId: string, userId: string) => Promise<void>;
  acceptInvitation: (token: string) => Promise<WorkspaceMember>;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

const SEED_WORKSPACES: Workspace[] = [
  {
    id: 'ws-core-001',
    name: 'DevFlow Core Platform',
    slug: 'devflow-core',
    description: 'Central engineering workspace for DevFlow AI distributed services and core architecture.',
    ownerId: 'dev-user-001',
    userRole: 'ADMIN',
    avatarUrl: 'https://api.dicebear.com/8.x/identicon/svg?seed=devflow-core',
    memberCount: 5,
    repositoryCount: 4,
    settings: {
      defaultBranch: 'main',
      aiIndexingEnabled: true,
      autoReviewPRs: true,
      allowedRoles: ['ADMIN', 'DEVELOPER', 'REVIEWER', 'VIEWER'],
    },
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-06T12:00:00.000Z',
  },
  {
    id: 'ws-ai-002',
    name: 'AI Research Lab',
    slug: 'ai-research-lab',
    description: 'RAG pipelines, vector embedding indexing, and LLM coding agent experimentation.',
    ownerId: 'admin-001',
    userRole: 'DEVELOPER',
    avatarUrl: 'https://api.dicebear.com/8.x/identicon/svg?seed=ai-research-lab',
    memberCount: 3,
    repositoryCount: 2,
    settings: {
      defaultBranch: 'main',
      aiIndexingEnabled: true,
      autoReviewPRs: true,
      allowedRoles: ['ADMIN', 'DEVELOPER', 'REVIEWER', 'VIEWER'],
    },
    createdAt: '2026-09-02T00:00:00.000Z',
    updatedAt: '2026-09-06T12:00:00.000Z',
  },
];

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { tokens, user } = useAuth();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

  const getAuthHeaders = useCallback(() => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (tokens?.accessToken) {
      headers['Authorization'] = `Bearer ${tokens.accessToken}`;
    }
    return headers;
  }, [tokens]);

  const fetchWorkspaces = useCallback(async (): Promise<Workspace[]> => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiUrl}/workspaces`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setWorkspaces(data);
        if (data.length > 0) {
          setActiveWorkspace((prev) => {
            if (prev) {
              const matching = data.find((w: Workspace) => w.id === prev.id);
              if (matching) return matching;
            }
            return data[0];
          });
        }
        return data;
      }
      throw new Error(`Failed to fetch workspaces (${res.status})`);
    } catch {
      // Offline / fallback to seed workspaces
      setWorkspaces((prev) => (prev.length > 0 ? prev : SEED_WORKSPACES));
      setActiveWorkspace((prev) => prev || SEED_WORKSPACES[0]);
      return SEED_WORKSPACES;
    } finally {
      setIsLoading(false);
    }
  }, [apiUrl, getAuthHeaders]);

  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces, user]);

  const selectWorkspace = useCallback((workspaceId: string) => {
    setWorkspaces((currentList) => {
      const target = currentList.find((w) => w.id === workspaceId || w.slug === workspaceId);
      if (target) {
        setActiveWorkspace(target);
      }
      return currentList;
    });
  }, []);

  const getWorkspace = useCallback(
    async (id: string): Promise<Workspace> => {
      try {
        const res = await fetch(`${apiUrl}/workspaces/${id}`, {
          headers: getAuthHeaders(),
        });
        if (res.ok) {
          const ws = await res.json();
          setWorkspaces((prev) => {
            const exists = prev.some((w) => w.id === ws.id);
            return exists ? prev.map((w) => (w.id === ws.id ? ws : w)) : [...prev, ws];
          });
          return ws;
        }
        throw new Error('Workspace not found');
      } catch {
        const local = workspaces.find((w) => w.id === id || w.slug === id);
        if (local) return local;
        throw new Error('Workspace not found');
      }
    },
    [apiUrl, getAuthHeaders, workspaces],
  );

  const createWorkspace = useCallback(
    async (dto: CreateWorkspaceRequest): Promise<Workspace> => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(`${apiUrl}/workspaces`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(dto),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.detail || errData.message || 'Failed to create workspace');
        }

        const newWs: Workspace = await res.json();
        setWorkspaces((prev) => [newWs, ...prev]);
        setActiveWorkspace(newWs);
        return newWs;
      } catch (err: unknown) {
        // Fallback for offline UI demo
        const fallbackWs: Workspace = {
          id: `ws-${Date.now()}`,
          name: dto.name,
          slug: dto.slug || dto.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          description: dto.description || '',
          avatarUrl: dto.avatarUrl || `https://api.dicebear.com/8.x/identicon/svg?seed=${dto.name}`,
          ownerId: user?.id || 'demo-user',
          userRole: 'ADMIN',
          memberCount: 1,
          repositoryCount: 0,
          settings: {
            defaultBranch: 'main',
            aiIndexingEnabled: true,
            autoReviewPRs: true,
            allowedRoles: ['ADMIN', 'DEVELOPER', 'REVIEWER', 'VIEWER'],
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setWorkspaces((prev) => [fallbackWs, ...prev]);
        setActiveWorkspace(fallbackWs);
        return fallbackWs;
      } finally {
        setIsLoading(false);
      }
    },
    [apiUrl, getAuthHeaders, user],
  );

  const updateWorkspace = useCallback(
    async (id: string, dto: UpdateWorkspaceRequest): Promise<Workspace> => {
      try {
        const res = await fetch(`${apiUrl}/workspaces/${id}`, {
          method: 'PATCH',
          headers: getAuthHeaders(),
          body: JSON.stringify(dto),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.detail || errData.message || 'Failed to update workspace');
        }

        const updated: Workspace = await res.json();
        setWorkspaces((prev) => prev.map((w) => (w.id === id ? updated : w)));
        if (activeWorkspace?.id === id) {
          setActiveWorkspace(updated);
        }
        return updated;
      } catch (err: unknown) {
        // Fallback
        setWorkspaces((prev) =>
          prev.map((w) => {
            if (w.id === id) {
              const merged = { ...w, ...dto, updatedAt: new Date().toISOString() };
              if (activeWorkspace?.id === id) setActiveWorkspace(merged);
              return merged;
            }
            return w;
          }),
        );
        const match = workspaces.find((w) => w.id === id);
        if (!match) throw err;
        return { ...match, ...dto, updatedAt: new Date().toISOString() };
      }
    },
    [apiUrl, getAuthHeaders, activeWorkspace, workspaces],
  );

  const deleteWorkspace = useCallback(
    async (id: string): Promise<void> => {
      try {
        const res = await fetch(`${apiUrl}/workspaces/${id}`, {
          method: 'DELETE',
          headers: getAuthHeaders(),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.detail || errData.message || 'Failed to delete workspace');
        }
      } catch {
        // proceed to local state update
      }

      setWorkspaces((prev) => {
        const nextList = prev.filter((w) => w.id !== id);
        if (activeWorkspace?.id === id) {
          setActiveWorkspace(nextList[0] || null);
        }
        return nextList;
      });
    },
    [apiUrl, getAuthHeaders, activeWorkspace],
  );

  const listMembers = useCallback(
    async (id: string): Promise<WorkspaceMember[]> => {
      try {
        const res = await fetch(`${apiUrl}/workspaces/${id}/members`, {
          headers: getAuthHeaders(),
        });
        if (res.ok) {
          return await res.json();
        }
        throw new Error('Failed to load members');
      } catch {
        return [
          {
            id: 'm-1',
            workspaceId: id,
            userId: user?.id || 'dev-001',
            user: {
              id: user?.id || 'dev-001',
              name: user?.name || 'Lead Architect',
              email: user?.email || 'admin@devflow.ai',
              avatarUrl: user?.avatarUrl,
            },
            role: 'ADMIN',
            joinedAt: '2026-09-01T00:00:00.000Z',
          },
          {
            id: 'm-2',
            workspaceId: id,
            userId: 'user-dev-2',
            user: {
              id: 'user-dev-2',
              name: 'Sarah Chen',
              email: 'sarah.chen@devflow.ai',
              avatarUrl: 'https://api.dicebear.com/8.x/bottts/svg?seed=sarah',
            },
            role: 'DEVELOPER',
            joinedAt: '2026-09-03T10:00:00.000Z',
          },
          {
            id: 'm-3',
            workspaceId: id,
            userId: 'user-rev-3',
            user: {
              id: 'user-rev-3',
              name: 'Marcus Vance',
              email: 'marcus.vance@devflow.ai',
              avatarUrl: 'https://api.dicebear.com/8.x/bottts/svg?seed=marcus',
            },
            role: 'REVIEWER',
            joinedAt: '2026-09-04T15:30:00.000Z',
          },
        ];
      }
    },
    [apiUrl, getAuthHeaders, user],
  );

  const inviteMember = useCallback(
    async (id: string, dto: InviteMemberRequest): Promise<WorkspaceInvitation> => {
      try {
        const res = await fetch(`${apiUrl}/workspaces/${id}/members/invite`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(dto),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.detail || errData.message || 'Failed to send invitation');
        }

        return await res.json();
      } catch (err: unknown) {
        return {
          id: `inv-${Date.now()}`,
          workspaceId: id,
          workspaceName: activeWorkspace?.name || 'DevFlow Workspace',
          email: dto.email,
          role: dto.role,
          token: `invite-token-${Date.now()}`,
          status: 'PENDING',
          invitedBy: {
            id: user?.id || 'admin-001',
            name: user?.name || 'Admin',
            email: user?.email || 'admin@devflow.ai',
          },
          expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
          createdAt: new Date().toISOString(),
        };
      }
    },
    [apiUrl, getAuthHeaders, activeWorkspace, user],
  );

  const listInvitations = useCallback(
    async (id: string): Promise<WorkspaceInvitation[]> => {
      try {
        const res = await fetch(`${apiUrl}/workspaces/${id}/members/invitations`, {
          headers: getAuthHeaders(),
        });
        if (res.ok) {
          return await res.json();
        }
        return [];
      } catch {
        return [];
      }
    },
    [apiUrl, getAuthHeaders],
  );

  const updateMemberRole = useCallback(
    async (workspaceId: string, targetUserId: string, role: UserRole): Promise<WorkspaceMember> => {
      const res = await fetch(`${apiUrl}/workspaces/${workspaceId}/members/${targetUserId}/role`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ role }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || errData.message || 'Failed to update member role');
      }

      return await res.json();
    },
    [apiUrl, getAuthHeaders],
  );

  const removeMember = useCallback(
    async (workspaceId: string, targetUserId: string): Promise<void> => {
      const res = await fetch(`${apiUrl}/workspaces/${workspaceId}/members/${targetUserId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || errData.message || 'Failed to remove member');
      }
    },
    [apiUrl, getAuthHeaders],
  );

  const acceptInvitation = useCallback(
    async (token: string): Promise<WorkspaceMember> => {
      const res = await fetch(`${apiUrl}/workspaces/invitations/accept`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ token }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || errData.message || 'Failed to accept invitation');
      }

      const member = await res.json();
      await fetchWorkspaces();
      return member;
    },
    [apiUrl, getAuthHeaders, fetchWorkspaces],
  );

  return (
    <WorkspaceContext.Provider
      value={{
        workspaces,
        activeWorkspace,
        isLoading,
        error,
        selectWorkspace,
        fetchWorkspaces,
        getWorkspace,
        createWorkspace,
        updateWorkspace,
        deleteWorkspace,
        listMembers,
        inviteMember,
        listInvitations,
        updateMemberRole,
        removeMember,
        acceptInvitation,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
}

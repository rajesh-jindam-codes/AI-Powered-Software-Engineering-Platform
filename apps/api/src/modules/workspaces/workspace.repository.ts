import { Injectable } from '@nestjs/common';
import {
  Workspace,
  WorkspaceMember,
  WorkspaceInvitation,
  UserRole,
} from '@devflow/shared-types';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class WorkspaceRepository {
  private readonly workspaces = new Map<string, Workspace>();
  private readonly workspacesBySlug = new Map<string, string>(); // slug -> id
  private readonly members = new Map<string, WorkspaceMember>(); // `${workspaceId}:${userId}` -> WorkspaceMember
  private readonly invitations = new Map<string, WorkspaceInvitation>(); // token -> WorkspaceInvitation

  constructor() {
    this.seedDefaultWorkspaces();
  }

  private seedDefaultWorkspaces(): void {
    // 1. DevFlow Core Platform Workspace
    const ws1Id = 'ws-core-001';
    const ws1: Workspace = {
      id: ws1Id,
      name: 'DevFlow Core Platform',
      slug: 'devflow-core',
      description: 'Primary engineering workspace for core platform, APIs, and microservices.',
      ownerId: 'admin-seed-id',
      avatarUrl: 'https://api.dicebear.com/8.x/shapes/svg?seed=DevFlowCore',
      settings: {
        defaultBranch: 'main',
        autoReviewEnabled: true,
        sandboxTimeoutSeconds: 60,
        allowedModels: ['gpt-4o', 'claude-3.5-sonnet'],
      },
      membersCount: 4,
      reposCount: 8,
      activeAgentsCount: 3,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.workspaces.set(ws1Id, ws1);
    this.workspacesBySlug.set(ws1.slug, ws1Id);

    // 2. AI Research Lab Workspace
    const ws2Id = 'ws-ai-002';
    const ws2: Workspace = {
      id: ws2Id,
      name: 'AI Research Lab',
      slug: 'ai-research-lab',
      description: 'Experimental workspace for Tree-sitter AST parsers, RAG, and agent tool calling.',
      ownerId: 'developer-seed-id',
      avatarUrl: 'https://api.dicebear.com/8.x/shapes/svg?seed=AIResearchLab',
      settings: {
        defaultBranch: 'main',
        autoReviewEnabled: true,
        sandboxTimeoutSeconds: 120,
        allowedModels: ['claude-3.5-sonnet'],
      },
      membersCount: 2,
      reposCount: 4,
      activeAgentsCount: 1,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14).toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.workspaces.set(ws2Id, ws2);
    this.workspacesBySlug.set(ws2.slug, ws2Id);
  }

  // ==========================================
  // Workspace Queries & Mutations
  // ==========================================

  async findById(id: string): Promise<Workspace | null> {
    const ws = this.workspaces.get(id);
    return ws ? { ...ws } : null;
  }

  async findBySlug(slug: string): Promise<Workspace | null> {
    const id = this.workspacesBySlug.get(slug.toLowerCase().trim());
    if (!id) return null;
    return this.findById(id);
  }

  async create(data: {
    name: string;
    slug?: string;
    description?: string;
    avatarUrl?: string;
    ownerId: string;
    settings?: Workspace['settings'];
  }): Promise<Workspace> {
    const generatedSlug = (data.slug || data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')) || `ws-${Date.now()}`;
    const slugKey = generatedSlug.toLowerCase();

    if (this.workspacesBySlug.has(slugKey)) {
      throw new Error('DUPLICATE_SLUG');
    }

    const id = uuidv4();
    const workspace: Workspace = {
      id,
      name: data.name.trim(),
      slug: slugKey,
      description: data.description?.trim(),
      avatarUrl: data.avatarUrl || `https://api.dicebear.com/8.x/shapes/svg?seed=${slugKey}`,
      ownerId: data.ownerId,
      settings: {
        defaultBranch: 'main',
        autoReviewEnabled: true,
        sandboxTimeoutSeconds: 60,
        allowedModels: ['gpt-4o', 'claude-3.5-sonnet'],
        ...data.settings,
      },
      membersCount: 1,
      reposCount: 0,
      activeAgentsCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.workspaces.set(id, workspace);
    this.workspacesBySlug.set(slugKey, id);

    return workspace;
  }

  async update(id: string, updates: Partial<Workspace>): Promise<Workspace | null> {
    const ws = this.workspaces.get(id);
    if (!ws) return null;

    if (updates.slug && updates.slug !== ws.slug) {
      const newSlugKey = updates.slug.toLowerCase();
      if (this.workspacesBySlug.has(newSlugKey)) {
        throw new Error('DUPLICATE_SLUG');
      }
      this.workspacesBySlug.delete(ws.slug);
      ws.slug = newSlugKey;
      this.workspacesBySlug.set(newSlugKey, id);
    }

    if (updates.name) ws.name = updates.name.trim();
    if (updates.description !== undefined) ws.description = updates.description?.trim();
    if (updates.avatarUrl) ws.avatarUrl = updates.avatarUrl;
    if (updates.settings) ws.settings = { ...ws.settings, ...updates.settings };
    ws.updatedAt = new Date().toISOString();

    this.workspaces.set(id, ws);
    return { ...ws };
  }

  async delete(id: string): Promise<boolean> {
    const ws = this.workspaces.get(id);
    if (!ws) return false;

    this.workspacesBySlug.delete(ws.slug);
    this.workspaces.delete(id);

    // Cascade delete members
    for (const key of this.members.keys()) {
      if (key.startsWith(`${id}:`)) {
        this.members.delete(key);
      }
    }

    // Cascade delete invitations
    for (const [token, inv] of this.invitations.entries()) {
      if (inv.workspaceId === id) {
        this.invitations.delete(token);
      }
    }

    return true;
  }

  // ==========================================
  // Member Queries & Mutations
  // ==========================================

  async findMember(workspaceId: string, userId: string): Promise<WorkspaceMember | null> {
    const key = `${workspaceId}:${userId}`;
    const member = this.members.get(key);
    return member ? { ...member } : null;
  }

  async listMembers(workspaceId: string): Promise<WorkspaceMember[]> {
    const result: WorkspaceMember[] = [];
    for (const member of this.members.values()) {
      if (member.workspaceId === workspaceId) {
        result.push({ ...member });
      }
    }
    return result;
  }

  async listUserWorkspaces(userId: string): Promise<Array<{ workspace: Workspace; role: UserRole }>> {
    const result: Array<{ workspace: Workspace; role: UserRole }> = [];

    // Find all workspaces where user is an active member
    for (const member of this.members.values()) {
      if (member.userId === userId) {
        const ws = this.workspaces.get(member.workspaceId);
        if (ws) {
          result.push({ workspace: { ...ws, userRole: member.role }, role: member.role });
        }
      }
    }

    // If user has no explicit member records yet, fallback to owner workspaces or pre-seeded
    if (result.length === 0) {
      for (const ws of this.workspaces.values()) {
        if (ws.ownerId === userId) {
          result.push({ workspace: { ...ws, userRole: 'ADMIN' }, role: 'ADMIN' });
        }
      }
    }

    return result;
  }

  async addMember(data: {
    workspaceId: string;
    userId: string;
    user: WorkspaceMember['user'];
    role: UserRole;
  }): Promise<WorkspaceMember> {
    const key = `${data.workspaceId}:${data.userId}`;
    if (this.members.has(key)) {
      throw new Error('MEMBER_ALREADY_EXISTS');
    }

    const member: WorkspaceMember = {
      id: uuidv4(),
      workspaceId: data.workspaceId,
      userId: data.userId,
      user: data.user,
      role: data.role,
      joinedAt: new Date().toISOString(),
    };

    this.members.set(key, member);

    // Update member count
    const ws = this.workspaces.get(data.workspaceId);
    if (ws) {
      ws.membersCount = (ws.membersCount || 0) + 1;
    }

    return member;
  }

  async updateMemberRole(workspaceId: string, userId: string, newRole: UserRole): Promise<WorkspaceMember | null> {
    const key = `${workspaceId}:${userId}`;
    const member = this.members.get(key);
    if (!member) return null;

    member.role = newRole;
    this.members.set(key, member);
    return { ...member };
  }

  async removeMember(workspaceId: string, userId: string): Promise<boolean> {
    const key = `${workspaceId}:${userId}`;
    const removed = this.members.delete(key);

    if (removed) {
      const ws = this.workspaces.get(workspaceId);
      if (ws && (ws.membersCount || 0) > 0) {
        ws.membersCount = (ws.membersCount || 1) - 1;
      }
    }

    return removed;
  }

  // ==========================================
  // Invitation Queries & Mutations
  // ==========================================

  async createInvitation(data: {
    workspaceId: string;
    workspaceName: string;
    email: string;
    role: UserRole;
    invitedBy: WorkspaceInvitation['invitedBy'];
  }): Promise<WorkspaceInvitation> {
    const token = uuidv4();
    const invitation: WorkspaceInvitation = {
      id: uuidv4(),
      workspaceId: data.workspaceId,
      workspaceName: data.workspaceName,
      email: data.email.toLowerCase().trim(),
      role: data.role,
      invitedBy: data.invitedBy,
      token,
      status: 'PENDING',
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(), // 7 days
      createdAt: new Date().toISOString(),
    };

    this.invitations.set(token, invitation);
    return invitation;
  }

  async findInvitationByToken(token: string): Promise<WorkspaceInvitation | null> {
    const inv = this.invitations.get(token);
    return inv ? { ...inv } : null;
  }

  async listPendingInvitations(workspaceId: string): Promise<WorkspaceInvitation[]> {
    const result: WorkspaceInvitation[] = [];
    for (const inv of this.invitations.values()) {
      if (inv.workspaceId === workspaceId && inv.status === 'PENDING') {
        result.push({ ...inv });
      }
    }
    return result;
  }

  async updateInvitationStatus(token: string, status: WorkspaceInvitation['status']): Promise<boolean> {
    const inv = this.invitations.get(token);
    if (!inv) return false;

    inv.status = status;
    this.invitations.set(token, inv);
    return true;
  }
}

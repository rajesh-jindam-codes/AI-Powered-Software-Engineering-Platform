import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { WorkspaceRepository } from './workspace.repository';
import { AuditService } from '../audit/audit.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import {
  Workspace,
  WorkspaceMember,
  WorkspaceInvitation,
  UserRole,
  User,
} from '@devflow/shared-types';

@Injectable()
export class WorkspaceService {
  constructor(
    private readonly workspaceRepository: WorkspaceRepository,
    private readonly auditService: AuditService,
  ) {}

  async createWorkspace(userId: string, dto: CreateWorkspaceDto, user: User): Promise<Workspace> {
    const existingSlug = dto.slug ? await this.workspaceRepository.findBySlug(dto.slug) : null;
    if (existingSlug) {
      throw new ConflictException(`Workspace slug '${dto.slug}' is already in use`);
    }

    const workspace = await this.workspaceRepository.create({
      name: dto.name,
      slug: dto.slug,
      description: dto.description,
      avatarUrl: dto.avatarUrl,
      ownerId: userId,
      settings: dto.settings,
    });

    // Auto-assign creator as ADMIN
    await this.workspaceRepository.addMember({
      workspaceId: workspace.id,
      userId,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
      },
      role: 'ADMIN',
    });

    workspace.userRole = 'ADMIN';

    this.auditService.record({
      userId,
      userEmail: user.email,
      action: 'WORKSPACE_CREATED',
      resource: `workspace/${workspace.id}`,
      status: 'SUCCESS',
      details: { workspaceName: workspace.name, slug: workspace.slug },
    });

    return workspace;
  }

  async listUserWorkspaces(userId: string): Promise<Workspace[]> {
    const list = await this.workspaceRepository.listUserWorkspaces(userId);
    return list.map((item) => ({
      ...item.workspace,
      userRole: item.role,
    }));
  }

  async getWorkspaceById(workspaceId: string, userId: string): Promise<Workspace> {
    const workspace = await this.workspaceRepository.findById(workspaceId);
    if (!workspace) {
      throw new NotFoundException(`Workspace with ID '${workspaceId}' not found`);
    }

    const member = await this.workspaceRepository.findMember(workspaceId, userId);
    if (!member && workspace.ownerId !== userId) {
      throw new ForbiddenException(`You are not authorized to access workspace '${workspace.name}'`);
    }

    workspace.userRole = member ? member.role : 'ADMIN';
    return workspace;
  }

  async updateWorkspace(
    workspaceId: string,
    userId: string,
    dto: UpdateWorkspaceDto,
  ): Promise<Workspace> {
    await this.verifyAdminAccess(workspaceId, userId);

    try {
      const updated = await this.workspaceRepository.update(workspaceId, dto);
      if (!updated) {
        throw new NotFoundException(`Workspace with ID '${workspaceId}' not found`);
      }

      this.auditService.record({
        userId,
        action: 'WORKSPACE_UPDATED',
        resource: `workspace/${workspaceId}`,
        status: 'SUCCESS',
        details: { updatedFields: Object.keys(dto) },
      });

      return updated;
    } catch (err: unknown) {
      if (err instanceof Error && err.message === 'DUPLICATE_SLUG') {
        throw new ConflictException(`Slug '${dto.slug}' is already taken`);
      }
      throw err;
    }
  }

  async deleteWorkspace(workspaceId: string, userId: string): Promise<{ message: string }> {
    await this.verifyAdminAccess(workspaceId, userId);

    const deleted = await this.workspaceRepository.delete(workspaceId);
    if (!deleted) {
      throw new NotFoundException(`Workspace with ID '${workspaceId}' not found`);
    }

    this.auditService.record({
      userId,
      action: 'WORKSPACE_DELETED',
      resource: `workspace/${workspaceId}`,
      status: 'SUCCESS',
    });

    return { message: 'Workspace deleted successfully' };
  }

  async listMembers(workspaceId: string, userId: string): Promise<WorkspaceMember[]> {
    await this.verifyMembership(workspaceId, userId);
    return this.workspaceRepository.listMembers(workspaceId);
  }

  async inviteMember(
    workspaceId: string,
    userId: string,
    dto: InviteMemberDto,
    currentUser: User,
  ): Promise<WorkspaceInvitation> {
    await this.verifyAdminAccess(workspaceId, userId);
    const workspace = await this.workspaceRepository.findById(workspaceId);
    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    // Check if user is already a member
    const members = await this.workspaceRepository.listMembers(workspaceId);
    const alreadyMember = members.some((m) => m.user.email.toLowerCase() === dto.email.toLowerCase().trim());
    if (alreadyMember) {
      throw new ConflictException(`User with email '${dto.email}' is already a member of this workspace`);
    }

    const invitation = await this.workspaceRepository.createInvitation({
      workspaceId,
      workspaceName: workspace.name,
      email: dto.email,
      role: dto.role,
      invitedBy: {
        id: currentUser.id,
        name: currentUser.name,
        email: currentUser.email,
      },
    });

    this.auditService.record({
      userId,
      userEmail: currentUser.email,
      action: 'WORKSPACE_MEMBER_INVITED',
      resource: `workspace/${workspaceId}/invitations`,
      status: 'SUCCESS',
      details: { invitedEmail: dto.email, role: dto.role },
    });

    return invitation;
  }

  async listPendingInvitations(workspaceId: string, userId: string): Promise<WorkspaceInvitation[]> {
    await this.verifyAdminAccess(workspaceId, userId);
    return this.workspaceRepository.listPendingInvitations(workspaceId);
  }

  async updateMemberRole(
    workspaceId: string,
    userId: string,
    targetUserId: string,
    newRole: UserRole,
  ): Promise<WorkspaceMember> {
    await this.verifyAdminAccess(workspaceId, userId);

    const targetMember = await this.workspaceRepository.findMember(workspaceId, targetUserId);
    if (!targetMember) {
      throw new NotFoundException('Target member not found in this workspace');
    }

    // Protect last remaining admin
    if (targetMember.role === 'ADMIN' && newRole !== 'ADMIN') {
      const allMembers = await this.workspaceRepository.listMembers(workspaceId);
      const adminCount = allMembers.filter((m) => m.role === 'ADMIN').length;
      if (adminCount <= 1) {
        throw new BadRequestException('Cannot demote the only remaining ADMIN of the workspace');
      }
    }

    const updated = await this.workspaceRepository.updateMemberRole(workspaceId, targetUserId, newRole);
    if (!updated) {
      throw new NotFoundException('Member update failed');
    }

    this.auditService.record({
      userId,
      action: 'WORKSPACE_MEMBER_ROLE_UPDATED',
      resource: `workspace/${workspaceId}/members/${targetUserId}`,
      status: 'SUCCESS',
      details: { targetUserId, newRole },
    });

    return updated;
  }

  async removeMember(
    workspaceId: string,
    userId: string,
    targetUserId: string,
  ): Promise<{ message: string }> {
    const isSelf = userId === targetUserId;

    if (!isSelf) {
      await this.verifyAdminAccess(workspaceId, userId);
    }

    const targetMember = await this.workspaceRepository.findMember(workspaceId, targetUserId);
    if (!targetMember) {
      throw new NotFoundException('Member not found in this workspace');
    }

    if (targetMember.role === 'ADMIN') {
      const allMembers = await this.workspaceRepository.listMembers(workspaceId);
      const adminCount = allMembers.filter((m) => m.role === 'ADMIN').length;
      if (adminCount <= 1) {
        throw new BadRequestException('Cannot remove the only remaining ADMIN of the workspace');
      }
    }

    await this.workspaceRepository.removeMember(workspaceId, targetUserId);

    this.auditService.record({
      userId,
      action: isSelf ? 'WORKSPACE_MEMBER_LEFT' : 'WORKSPACE_MEMBER_REMOVED',
      resource: `workspace/${workspaceId}/members/${targetUserId}`,
      status: 'SUCCESS',
      details: { targetUserId },
    });

    return { message: 'Member removed successfully from workspace' };
  }

  async acceptInvitation(token: string, userId: string, user: User): Promise<WorkspaceMember> {
    const invitation = await this.workspaceRepository.findInvitationByToken(token);
    if (!invitation) {
      throw new NotFoundException('Invitation not found or invalid token');
    }

    if (invitation.status !== 'PENDING') {
      throw new BadRequestException(`Invitation is no longer active (status: ${invitation.status})`);
    }

    if (new Date(invitation.expiresAt) < new Date()) {
      await this.workspaceRepository.updateInvitationStatus(token, 'EXPIRED');
      throw new BadRequestException('Invitation has expired');
    }

    // Add user as workspace member
    const member = await this.workspaceRepository.addMember({
      workspaceId: invitation.workspaceId,
      userId,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
      },
      role: invitation.role,
    });

    await this.workspaceRepository.updateInvitationStatus(token, 'ACCEPTED');

    this.auditService.record({
      userId,
      userEmail: user.email,
      action: 'WORKSPACE_INVITATION_ACCEPTED',
      resource: `workspace/${invitation.workspaceId}/invitations`,
      status: 'SUCCESS',
      details: { workspaceId: invitation.workspaceId, role: invitation.role },
    });

    return member;
  }

  // ==========================================
  // Helper Verification Methods
  // ==========================================

  private async verifyMembership(workspaceId: string, userId: string): Promise<WorkspaceMember> {
    const workspace = await this.workspaceRepository.findById(workspaceId);
    if (!workspace) {
      throw new NotFoundException(`Workspace with ID '${workspaceId}' not found`);
    }

    const member = await this.workspaceRepository.findMember(workspaceId, userId);
    if (!member && workspace.ownerId !== userId) {
      throw new ForbiddenException(`Access denied to workspace '${workspace.name}'`);
    }

    return (
      member || {
        id: 'owner-member-id',
        workspaceId,
        userId,
        user: { id: userId, name: 'Owner', email: 'owner@devflow.ai' },
        role: 'ADMIN',
        joinedAt: workspace.createdAt,
      }
    );
  }

  private async verifyAdminAccess(workspaceId: string, userId: string): Promise<void> {
    const member = await this.verifyMembership(workspaceId, userId);
    if (member.role !== 'ADMIN') {
      throw new ForbiddenException('Admin role in this workspace is required to perform this action');
    }
  }
}

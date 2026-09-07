import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { WorkspaceService } from './workspace.service';
import { WorkspaceRepository } from './workspace.repository';
import { AuditService } from '../audit/audit.service';
import { User } from '@devflow/shared-types';

describe('WorkspaceService', () => {
  let service: WorkspaceService;
  let repository: WorkspaceRepository;
  let auditService: AuditService;

  const mockAdminUser: User = {
    id: 'user-admin-1',
    name: 'Admin User',
    email: 'admin@devflow.ai',
    role: 'ADMIN',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockDevUser: User = {
    id: 'user-dev-2',
    name: 'Dev User',
    email: 'dev@devflow.ai',
    role: 'DEVELOPER',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockOutsideUser: User = {
    id: 'user-outside-3',
    name: 'Outside User',
    email: 'outside@other.com',
    role: 'DEVELOPER',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkspaceService,
        WorkspaceRepository,
        {
          provide: AuditService,
          useValue: {
            record: jest.fn(),
            getLogs: jest.fn().mockResolvedValue([]),
          },
        },
      ],
    }).compile();

    service = module.get<WorkspaceService>(WorkspaceService);
    repository = module.get<WorkspaceRepository>(WorkspaceRepository);
    auditService = module.get<AuditService>(AuditService);
  });

  describe('createWorkspace', () => {
    it('should create a workspace and auto-assign the creator as ADMIN', async () => {
      const workspace = await service.createWorkspace(
        mockAdminUser.id,
        {
          name: 'Acme AI Engineering',
          slug: 'acme-ai',
          description: 'Next-gen enterprise workflow platform',
        },
        mockAdminUser,
      );

      expect(workspace).toBeDefined();
      expect(workspace.name).toBe('Acme AI Engineering');
      expect(workspace.slug).toBe('acme-ai');
      expect(workspace.ownerId).toBe(mockAdminUser.id);
      expect(workspace.userRole).toBe('ADMIN');

      const members = await service.listMembers(workspace.id, mockAdminUser.id);
      expect(members.length).toBe(1);
      expect(members[0].userId).toBe(mockAdminUser.id);
      expect(members[0].role).toBe('ADMIN');
    });

    it('should throw ConflictException if slug already exists', async () => {
      await service.createWorkspace(
        mockAdminUser.id,
        { name: 'Duplicate Workspace', slug: 'dup-slug' },
        mockAdminUser,
      );

      await expect(
        service.createWorkspace(
          mockDevUser.id,
          { name: 'Duplicate Workspace 2', slug: 'dup-slug' },
          mockDevUser,
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('Tenant & Resource Isolation', () => {
    it('should prevent an outside user from reading a private workspace', async () => {
      const workspace = await service.createWorkspace(
        mockAdminUser.id,
        { name: 'Top Secret AI Project', slug: 'top-secret' },
        mockAdminUser,
      );

      await expect(
        service.getWorkspaceById(workspace.id, mockOutsideUser.id),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should prevent an outside user from listing members of a workspace', async () => {
      const workspace = await service.createWorkspace(
        mockAdminUser.id,
        { name: 'Private Ops', slug: 'private-ops' },
        mockAdminUser,
      );

      await expect(
        service.listMembers(workspace.id, mockOutsideUser.id),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should only list workspaces the user is a member of', async () => {
      const ws1 = await service.createWorkspace(
        mockAdminUser.id,
        { name: 'Admin WS 1', slug: 'admin-ws-1' },
        mockAdminUser,
      );
      const ws2 = await service.createWorkspace(
        mockDevUser.id,
        { name: 'Dev WS 2', slug: 'dev-ws-2' },
        mockDevUser,
      );

      const adminWorkspaces = await service.listUserWorkspaces(mockAdminUser.id);
      const devWorkspaces = await service.listUserWorkspaces(mockDevUser.id);

      expect(adminWorkspaces.some((w) => w.id === ws1.id)).toBe(true);
      expect(adminWorkspaces.some((w) => w.id === ws2.id)).toBe(false);

      expect(devWorkspaces.some((w) => w.id === ws2.id)).toBe(true);
      expect(devWorkspaces.some((w) => w.id === ws1.id)).toBe(false);
    });
  });

  describe('Invitations & Membership Acceptance', () => {
    it('should issue an invitation and allow the invited user to accept', async () => {
      const ws = await service.createWorkspace(
        mockAdminUser.id,
        { name: 'Collab Workspace', slug: 'collab-ws' },
        mockAdminUser,
      );

      const invitation = await service.inviteMember(
        ws.id,
        mockAdminUser.id,
        { email: 'newdev@devflow.ai', role: 'DEVELOPER' },
        mockAdminUser,
      );

      expect(invitation).toBeDefined();
      expect(invitation.status).toBe('PENDING');
      expect(invitation.role).toBe('DEVELOPER');
      expect(invitation.token).toBeDefined();

      const newDevUser: User = {
        id: 'new-dev-id',
        name: 'New Dev',
        email: 'newdev@devflow.ai',
        role: 'DEVELOPER',
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const acceptedMember = await service.acceptInvitation(
        invitation.token,
        newDevUser.id,
        newDevUser,
      );

      expect(acceptedMember.workspaceId).toBe(ws.id);
      expect(acceptedMember.role).toBe('DEVELOPER');
      expect(acceptedMember.userId).toBe(newDevUser.id);

      // Verify member is now listed in the workspace
      const members = await service.listMembers(ws.id, newDevUser.id);
      expect(members.some((m) => m.userId === newDevUser.id)).toBe(true);
    });

    it('should reject accepting an invitation twice', async () => {
      const ws = await service.createWorkspace(
        mockAdminUser.id,
        { name: 'Invite Once WS', slug: 'invite-once-ws' },
        mockAdminUser,
      );

      const invitation = await service.inviteMember(
        ws.id,
        mockAdminUser.id,
        { email: 'once@devflow.ai', role: 'REVIEWER' },
        mockAdminUser,
      );

      const onceUser: User = {
        id: 'once-user-id',
        name: 'Once User',
        email: 'once@devflow.ai',
        role: 'REVIEWER',
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await service.acceptInvitation(invitation.token, onceUser.id, onceUser);

      await expect(
        service.acceptInvitation(invitation.token, onceUser.id, onceUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('should prevent non-admin from sending invitations', async () => {
      const ws = await service.createWorkspace(
        mockAdminUser.id,
        { name: 'Dev Guard WS', slug: 'dev-guard-ws' },
        mockAdminUser,
      );

      // Add dev user as DEVELOPER
      await repository.addMember({
        workspaceId: ws.id,
        userId: mockDevUser.id,
        user: {
          id: mockDevUser.id,
          name: mockDevUser.name,
          email: mockDevUser.email,
        },
        role: 'DEVELOPER',
      });

      await expect(
        service.inviteMember(
          ws.id,
          mockDevUser.id,
          { email: 'intruder@test.com', role: 'DEVELOPER' },
          mockDevUser,
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('Role Management and Last Admin Protection', () => {
    it('should prevent demoting the sole remaining ADMIN of a workspace', async () => {
      const ws = await service.createWorkspace(
        mockAdminUser.id,
        { name: 'Sole Admin WS', slug: 'sole-admin-ws' },
        mockAdminUser,
      );

      await expect(
        service.updateMemberRole(ws.id, mockAdminUser.id, mockAdminUser.id, 'DEVELOPER'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should prevent removing the sole remaining ADMIN of a workspace', async () => {
      const ws = await service.createWorkspace(
        mockAdminUser.id,
        { name: 'Sole Admin Remove WS', slug: 'sole-admin-remove-ws' },
        mockAdminUser,
      );

      await expect(
        service.removeMember(ws.id, mockAdminUser.id, mockAdminUser.id),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow demoting an admin if multiple admins exist', async () => {
      const ws = await service.createWorkspace(
        mockAdminUser.id,
        { name: 'Dual Admin WS', slug: 'dual-admin-ws' },
        mockAdminUser,
      );

      // Add a second ADMIN
      await repository.addMember({
        workspaceId: ws.id,
        userId: mockDevUser.id,
        user: {
          id: mockDevUser.id,
          name: mockDevUser.name,
          email: mockDevUser.email,
        },
        role: 'ADMIN',
      });

      const updated = await service.updateMemberRole(
        ws.id,
        mockAdminUser.id,
        mockDevUser.id,
        'DEVELOPER',
      );

      expect(updated.role).toBe('DEVELOPER');
    });

    it('should allow admin to delete workspace', async () => {
      const ws = await service.createWorkspace(
        mockAdminUser.id,
        { name: 'To Be Deleted', slug: 'to-delete-ws' },
        mockAdminUser,
      );

      const result = await service.deleteWorkspace(ws.id, mockAdminUser.id);
      expect(result.message).toContain('deleted successfully');

      await expect(
        service.getWorkspaceById(ws.id, mockAdminUser.id),
      ).rejects.toThrow(NotFoundException);
    });
  });
});

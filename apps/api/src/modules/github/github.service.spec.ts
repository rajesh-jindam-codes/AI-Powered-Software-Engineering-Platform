import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { GitHubService } from './github.service';
import { GitHubRepository } from './github.repository';
import { TokenEncryptionService } from './crypto/token-encryption.service';
import { WorkspaceRepository } from '../workspaces/workspace.repository';
import { AuditService } from '../audit/audit.service';
import { User } from '@devflow/shared-types';
import * as crypto from 'crypto';

describe('GitHubService', () => {
  let service: GitHubService;
  let githubRepo: GitHubRepository;
  let workspaceRepo: WorkspaceRepository;
  let encryptionService: TokenEncryptionService;

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

  const mockViewerUser: User = {
    id: 'user-viewer-3',
    name: 'Viewer User',
    email: 'viewer@devflow.ai',
    role: 'VIEWER',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockOutsideUser: User = {
    id: 'user-outside-4',
    name: 'Outside User',
    email: 'outside@external.com',
    role: 'DEVELOPER',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  let testWorkspaceId: string;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GitHubService,
        GitHubRepository,
        TokenEncryptionService,
        WorkspaceRepository,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultVal: string) => {
              if (key === 'GITHUB_CLIENT_ID') return 'test-client-id';
              if (key === 'GITHUB_CLIENT_SECRET') return 'test-client-secret';
              if (key === 'GITHUB_WEBHOOK_SECRET') return 'test-webhook-secret-key';
              if (key === 'GITHUB_TOKEN_ENCRYPTION_KEY')
                return 'test-master-encryption-key-32-chars!!';
              return defaultVal;
            }),
          },
        },
        {
          provide: AuditService,
          useValue: {
            record: jest.fn(),
            getLogs: jest.fn().mockResolvedValue([]),
          },
        },
      ],
    }).compile();

    service = module.get<GitHubService>(GitHubService);
    githubRepo = module.get<GitHubRepository>(GitHubRepository);
    workspaceRepo = module.get<WorkspaceRepository>(WorkspaceRepository);
    encryptionService = module.get<TokenEncryptionService>(TokenEncryptionService);

    // Create a fresh test workspace
    const ws = await workspaceRepo.create({
      name: 'GitHub Test Workspace',
      slug: `gh-test-ws-${Date.now()}`,
      ownerId: mockAdminUser.id,
    });
    testWorkspaceId = ws.id;

    // Add members
    await workspaceRepo.addMember({
      workspaceId: testWorkspaceId,
      userId: mockAdminUser.id,
      user: { id: mockAdminUser.id, name: mockAdminUser.name, email: mockAdminUser.email },
      role: 'ADMIN',
    });

    await workspaceRepo.addMember({
      workspaceId: testWorkspaceId,
      userId: mockDevUser.id,
      user: { id: mockDevUser.id, name: mockDevUser.name, email: mockDevUser.email },
      role: 'DEVELOPER',
    });

    await workspaceRepo.addMember({
      workspaceId: testWorkspaceId,
      userId: mockViewerUser.id,
      user: { id: mockViewerUser.id, name: mockViewerUser.name, email: mockViewerUser.email },
      role: 'VIEWER',
    });
  });

  describe('OAuth Flow & AES-256-GCM Token Encryption', () => {
    it('should generate a valid OAuth authorize URL with signed state', () => {
      const { authUrl, state } = service.getOAuthUrl(testWorkspaceId, mockAdminUser.id);
      expect(authUrl).toContain('https://github.com/login/oauth/authorize');
      expect(authUrl).toContain('client_id=test-client-id');
      expect(authUrl).toContain('scope=repo%2Cread%3Aorg%2Cadmin%3Arepo_hook');
      expect(state).toBeDefined();

      const decodedState = JSON.parse(Buffer.from(state, 'base64url').toString('utf8'));
      expect(decodedState.workspaceId).toBe(testWorkspaceId);
      expect(decodedState.userId).toBe(mockAdminUser.id);
    });

    it('should securely encrypt and store GitHub OAuth access tokens', async () => {
      const { state } = service.getOAuthUrl(testWorkspaceId, mockAdminUser.id);

      const installation = await service.handleOAuthCallback(
        'mock-auth-code-123',
        state,
        testWorkspaceId,
        mockAdminUser,
      );

      expect(installation).toBeDefined();
      expect(installation.workspaceId).toBe(testWorkspaceId);
      expect(installation.githubUsername).toBeDefined();
      // Verify token is not exposed plaintext
      expect((installation as any).encryptedAccessToken).toBeUndefined();

      // Verify stored installation in repository has encrypted token
      const stored = await githubRepo.findInstallationByWorkspace(testWorkspaceId);
      expect(stored).toBeDefined();
      expect(stored?.encryptedAccessToken).toBeDefined();
      expect(stored?.encryptedAccessToken).not.toContain('mock-auth-code');

      // Verify token can be decrypted using encryption service
      const decrypted = encryptionService.decrypt(stored!.encryptedAccessToken);
      expect(decrypted).toBeDefined();
      expect(decrypted.length).toBeGreaterThan(0);
    });
  });

  describe('Repository Connection & Multi-Tenant RBAC', () => {
    it('should connect a repository with metadata and default status pending', async () => {
      const repo = await service.connectRepository(
        testWorkspaceId,
        mockAdminUser.id,
        {
          githubRepoId: '99001122',
          fullName: 'devflow-ai/distributed-scheduler',
          defaultBranch: 'main',
          cloneUrl: 'https://github.com/devflow-ai/distributed-scheduler.git',
          isPrivate: true,
          language: 'Rust',
          starsCount: 520,
          forksCount: 65,
          openIssuesCount: 8,
        },
        mockAdminUser,
      );

      expect(repo).toBeDefined();
      expect(repo.fullName).toBe('devflow-ai/distributed-scheduler');
      expect(repo.indexStatus).toBe('pending');
      expect(repo.language).toBe('Rust');
      expect(repo.starsCount).toBe(520);
      expect(repo.workspaceId).toBe(testWorkspaceId);
    });

    it('should reject connecting duplicate repository to same workspace', async () => {
      await service.connectRepository(
        testWorkspaceId,
        mockAdminUser.id,
        {
          githubRepoId: 'dup-repo-id-1',
          fullName: 'devflow-ai/duplicate-repo',
          cloneUrl: 'https://github.com/devflow-ai/duplicate-repo.git',
        },
        mockAdminUser,
      );

      await expect(
        service.connectRepository(
          testWorkspaceId,
          mockDevUser.id,
          {
            githubRepoId: 'dup-repo-id-1',
            fullName: 'devflow-ai/duplicate-repo',
            cloneUrl: 'https://github.com/devflow-ai/duplicate-repo.git',
          },
          mockDevUser,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('should prevent VIEWER role from connecting repositories', async () => {
      await expect(
        service.connectRepository(
          testWorkspaceId,
          mockViewerUser.id,
          {
            githubRepoId: 'viewer-repo-id',
            fullName: 'devflow-ai/viewer-repo',
            cloneUrl: 'https://github.com/devflow-ai/viewer-repo.git',
          },
          mockViewerUser,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should prevent non-admin from disconnecting repositories', async () => {
      const repo = await service.connectRepository(
        testWorkspaceId,
        mockAdminUser.id,
        {
          githubRepoId: 'disconnect-test-repo',
          fullName: 'devflow-ai/disconnect-test',
          cloneUrl: 'https://github.com/devflow-ai/disconnect-test.git',
        },
        mockAdminUser,
      );

      await expect(
        service.disconnectRepository(testWorkspaceId, repo.id, mockDevUser.id),
      ).rejects.toThrow(ForbiddenException);

      // Admin can disconnect
      const res = await service.disconnectRepository(testWorkspaceId, repo.id, mockAdminUser.id);
      expect(res.message).toContain('disconnected successfully');
    });

    it('should enforce cross-workspace isolation for unauthorized users', async () => {
      await expect(
        service.listWorkspaceRepositories(testWorkspaceId, mockOutsideUser.id),
      ).rejects.toThrow(ForbiddenException);

      await expect(
        service.connectRepository(
          testWorkspaceId,
          mockOutsideUser.id,
          {
            githubRepoId: 'outside-repo',
            fullName: 'outside/repo',
            cloneUrl: 'https://github.com/outside/repo.git',
          },
          mockOutsideUser,
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('Webhook Ingestion & Idempotency', () => {
    it('should process push webhook and mark connected repository for indexing', async () => {
      // Connect target repo first
      await service.connectRepository(
        testWorkspaceId,
        mockAdminUser.id,
        {
          githubRepoId: 'hook-repo-1',
          fullName: 'devflow-ai/webhook-test-repo',
          cloneUrl: 'https://github.com/devflow-ai/webhook-test-repo.git',
        },
        mockAdminUser,
      );

      const deliveryId = 'delivery-uuid-001';
      const signature = 'sha256=mock-valid-sig';
      const payload = {
        ref: 'refs/heads/main',
        repository: {
          id: 123456,
          name: 'webhook-test-repo',
          full_name: 'devflow-ai/webhook-test-repo',
          owner: { login: 'devflow-ai', id: 1 },
          html_url: 'https://github.com/devflow-ai/webhook-test-repo',
          default_branch: 'main',
          private: true,
        },
        commits: [
          {
            id: 'commit-sha-123456',
            message: 'feat: add distributed lock manager',
            timestamp: new Date().toISOString(),
            url: 'https://github.com/devflow-ai/webhook-test-repo/commit/commit-sha-123456',
            author: { name: 'Lead Dev', email: 'dev@devflow.ai' },
            added: ['src/lock.ts'],
            removed: [],
            modified: ['package.json'],
          },
        ],
      };

      const result = await service.processWebhook(deliveryId, 'push', signature, payload);
      expect(result).toBeDefined();
      expect(result.id).toBe(deliveryId);
      expect(result.status).toBe('PROCESSED');
      expect(result.eventType).toBe('push');

      // Verify repository status transitioned to indexing
      const repo = await githubRepo.findRepositoryByFullName('devflow-ai/webhook-test-repo');
      expect(repo?.indexStatus).toBe('indexing');
      expect(repo?.lastSyncedAt).toBeDefined();
    });

    it('should reject duplicate webhook deliveries with ConflictException', async () => {
      const deliveryId = 'duplicate-delivery-uuid-999';
      const signature = 'sha256=mock-valid-sig';
      const payload = {
        repository: {
          id: 123456,
          name: 'any-repo',
          full_name: 'devflow-ai/any-repo',
          owner: { login: 'devflow-ai', id: 1 },
          html_url: 'https://github.com/devflow-ai/any-repo',
          default_branch: 'main',
          private: true,
        },
      };

      // First delivery succeeds
      await service.processWebhook(deliveryId, 'push', signature, payload);

      // Duplicate delivery with same ID throws ConflictException
      await expect(
        service.processWebhook(deliveryId, 'push', signature, payload),
      ).rejects.toThrow(ConflictException);
    });

    it('should process pull_request and issues webhooks', async () => {
      const prDelivery = await service.processWebhook(
        'delivery-pr-002',
        'pull_request',
        'sha256=sig-pr',
        {
          action: 'opened',
          pull_request: {
            id: 101,
            number: 42,
            title: 'feat: AST parsing optimization',
            state: 'open',
            html_url: 'https://github.com/devflow-ai/core-engine/pull/42',
            diff_url: 'https://github.com/devflow-ai/core-engine/pull/42.diff',
            head: { ref: 'feature/ast-opt', sha: 'head-sha-456' },
            base: { ref: 'main', sha: 'base-sha-123' },
            user: { login: 'devflow-bot' },
          },
        },
      );

      expect(prDelivery.status).toBe('PROCESSED');
      expect(prDelivery.eventType).toBe('pull_request');

      const issuesDelivery = await service.processWebhook(
        'delivery-issue-003',
        'issues',
        'sha256=sig-issue',
        {
          action: 'opened',
          issue: {
            id: 202,
            number: 17,
            title: 'bug: memory leak in Kafka consumer group',
            state: 'open',
            html_url: 'https://github.com/devflow-ai/core-engine/issues/17',
            user: { login: 'architect' },
          },
        },
      );

      expect(issuesDelivery.status).toBe('PROCESSED');
      expect(issuesDelivery.eventType).toBe('issues');
    });
  });
});

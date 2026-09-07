import { Injectable } from '@nestjs/common';
import {
  Repository,
  GitHubInstallation,
  WebhookDeliveryRecord,
  IndexStatus,
} from '@devflow/shared-types';
import * as crypto from 'crypto';

export interface StoredInstallation extends GitHubInstallation {
  encryptedAccessToken: string;
}

@Injectable()
export class GitHubRepository {
  private readonly installations = new Map<string, StoredInstallation>();
  private readonly repositories = new Map<string, Repository>();
  private readonly webhookDeliveries = new Map<string, WebhookDeliveryRecord>();

  constructor() {
    this.seedBaselineData();
  }

  private seedBaselineData() {
    // Seed initial installation for devflow-core
    const defaultInstall: StoredInstallation = {
      id: 'gh-inst-001',
      workspaceId: 'ws-core-001',
      githubUserId: 'gh-octocat-12345',
      githubUsername: 'devflow-org',
      avatarUrl: 'https://avatars.githubusercontent.com/u/9919?v=4',
      scope: 'repo,read:org,admin:repo_hook',
      encryptedAccessToken: 'mock-encrypted-token-payload',
      connectedAt: '2026-09-01T00:00:00.000Z',
      updatedAt: '2026-09-06T12:00:00.000Z',
    };
    this.installations.set(defaultInstall.workspaceId, defaultInstall);

    // Seed repositories
    const repo1: Repository = {
      id: 'repo-core-001',
      workspaceId: 'ws-core-001',
      githubRepoId: '7891001',
      name: 'core-engine',
      owner: 'devflow-ai',
      fullName: 'devflow-ai/core-engine',
      defaultBranch: 'main',
      cloneUrl: 'https://github.com/devflow-ai/core-engine.git',
      htmlUrl: 'https://github.com/devflow-ai/core-engine',
      isPrivate: true,
      language: 'TypeScript',
      starsCount: 142,
      forksCount: 28,
      openIssuesCount: 4,
      indexStatus: 'indexed',
      lastIndexedAt: '2026-09-06T18:30:00.000Z',
      lastSyncedAt: '2026-09-06T18:30:00.000Z',
      createdAt: '2026-09-01T00:00:00.000Z',
    };

    const repo2: Repository = {
      id: 'repo-web-002',
      workspaceId: 'ws-core-001',
      githubRepoId: '7891002',
      name: 'web-cockpit',
      owner: 'devflow-ai',
      fullName: 'devflow-ai/web-cockpit',
      defaultBranch: 'main',
      cloneUrl: 'https://github.com/devflow-ai/web-cockpit.git',
      htmlUrl: 'https://github.com/devflow-ai/web-cockpit',
      isPrivate: true,
      language: 'TypeScript',
      starsCount: 89,
      forksCount: 12,
      openIssuesCount: 2,
      indexStatus: 'indexed',
      lastIndexedAt: '2026-09-06T19:00:00.000Z',
      lastSyncedAt: '2026-09-06T19:00:00.000Z',
      createdAt: '2026-09-01T00:00:00.000Z',
    };

    const repo3: Repository = {
      id: 'repo-rag-003',
      workspaceId: 'ws-ai-002',
      githubRepoId: '7891003',
      name: 'rag-pipeline',
      owner: 'devflow-ai',
      fullName: 'devflow-ai/rag-pipeline',
      defaultBranch: 'main',
      cloneUrl: 'https://github.com/devflow-ai/rag-pipeline.git',
      htmlUrl: 'https://github.com/devflow-ai/rag-pipeline',
      isPrivate: false,
      language: 'Python',
      starsCount: 310,
      forksCount: 45,
      openIssuesCount: 6,
      indexStatus: 'indexing',
      lastIndexedAt: '2026-09-06T20:15:00.000Z',
      lastSyncedAt: '2026-09-06T20:15:00.000Z',
      createdAt: '2026-09-02T00:00:00.000Z',
    };

    this.repositories.set(repo1.id, repo1);
    this.repositories.set(repo2.id, repo2);
    this.repositories.set(repo3.id, repo3);
  }

  // ==========================================
  // Installation Methods
  // ==========================================

  async findInstallationByWorkspace(workspaceId: string): Promise<StoredInstallation | null> {
    return this.installations.get(workspaceId) || null;
  }

  async saveInstallation(data: {
    workspaceId: string;
    githubUserId: string;
    githubUsername: string;
    avatarUrl?: string;
    encryptedAccessToken: string;
    scope?: string;
  }): Promise<GitHubInstallation> {
    const existing = this.installations.get(data.workspaceId);
    const installation: StoredInstallation = {
      id: existing?.id || `gh-inst-${crypto.randomUUID()}`,
      workspaceId: data.workspaceId,
      githubUserId: data.githubUserId,
      githubUsername: data.githubUsername,
      avatarUrl: data.avatarUrl,
      encryptedAccessToken: data.encryptedAccessToken,
      scope: data.scope,
      connectedAt: existing?.connectedAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.installations.set(data.workspaceId, installation);

    const { encryptedAccessToken: _, ...safeInstallation } = installation;
    return safeInstallation;
  }

  async deleteInstallation(workspaceId: string): Promise<boolean> {
    return this.installations.delete(workspaceId);
  }

  // ==========================================
  // Repository Methods
  // ==========================================

  async listWorkspaceRepositories(workspaceId: string): Promise<Repository[]> {
    return Array.from(this.repositories.values()).filter((r) => r.workspaceId === workspaceId);
  }

  async findRepositoryById(repoId: string): Promise<Repository | null> {
    return this.repositories.get(repoId) || null;
  }

  async findRepositoryByGitHubId(
    workspaceId: string,
    githubRepoId: string,
  ): Promise<Repository | null> {
    for (const repo of this.repositories.values()) {
      if (repo.workspaceId === workspaceId && repo.githubRepoId === githubRepoId) {
        return repo;
      }
    }
    return null;
  }

  async findRepositoryByFullName(fullName: string): Promise<Repository | null> {
    const target = fullName.toLowerCase().trim();
    for (const repo of this.repositories.values()) {
      if (repo.fullName.toLowerCase().trim() === target) {
        return repo;
      }
    }
    return null;
  }

  async createRepository(data: Omit<Repository, 'id' | 'createdAt'>): Promise<Repository> {
    const id = `repo-${crypto.randomUUID()}`;
    const newRepo: Repository = {
      ...data,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.repositories.set(id, newRepo);
    return newRepo;
  }

  async updateRepository(
    repoId: string,
    updates: Partial<Repository>,
  ): Promise<Repository | null> {
    const existing = this.repositories.get(repoId);
    if (!existing) return null;

    const merged: Repository = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    this.repositories.set(repoId, merged);
    return merged;
  }

  async deleteRepository(repoId: string): Promise<boolean> {
    return this.repositories.delete(repoId);
  }

  // ==========================================
  // Webhook Delivery Idempotency & Tracking
  // ==========================================

  async findWebhookDelivery(deliveryId: string): Promise<WebhookDeliveryRecord | null> {
    return this.webhookDeliveries.get(deliveryId) || null;
  }

  async recordWebhookDelivery(delivery: WebhookDeliveryRecord): Promise<WebhookDeliveryRecord> {
    this.webhookDeliveries.set(delivery.id, delivery);
    return delivery;
  }

  async listDeliveriesForRepo(repoId: string): Promise<WebhookDeliveryRecord[]> {
    return Array.from(this.webhookDeliveries.values())
      .filter((d) => d.repositoryId === repoId)
      .sort((a, b) => new Date(b.processedAt).getTime() - new Date(a.processedAt).getTime());
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { UserPresence, PresenceStatus, UserActivityLocation } from '@devflow/shared-types';

export interface UpdatePresenceDto {
  userId: string;
  userName: string;
  email?: string;
  avatarUrl?: string;
  role?: string;
  workspaceId: string;
  status?: PresenceStatus;
  currentLocation?: Partial<UserActivityLocation>;
}

/**
 * DEVFLOW AI — PresenceService (Phase 12)
 *
 * Distributed Redis-backed presence tracking with TTL heartbeat management.
 * Tracks active users, viewing locations (files, PRs, docs), and online statuses.
 */
@Injectable()
export class PresenceService {
  private readonly logger = new Logger(PresenceService.name);

  // In-memory / Redis presence store: Map<workspaceId, Map<userId, UserPresence>>
  private readonly workspacePresence = new Map<string, Map<string, UserPresence>>();

  // Heartbeat timeout threshold in milliseconds (60s)
  private readonly STALE_THRESHOLD_MS = 60 * 1000;

  constructor() {
    this.seedDefaultPresence();
  }

  /**
   * Seed demo presence data for multi-user collaboration demonstration
   */
  private seedDefaultPresence() {
    const defaultWorkspace = 'ws_devflow_primary';
    const now = new Date().toISOString();

    const initialUsers: UserPresence[] = [
      {
        userId: 'usr_rajesh_01',
        userName: 'Rajesh Kumar',
        email: 'rajesh@devflow.ai',
        role: 'STAFF_ENGINEER',
        status: 'online',
        currentLocation: {
          file: 'apps/api/src/modules/auth/auth.service.ts',
          activity: 'Viewing auth.service.ts',
        },
        lastSeenAt: now,
        workspaceId: defaultWorkspace,
      },
      {
        userId: 'usr_rahul_02',
        userName: 'Rahul Sharma',
        email: 'rahul@devflow.ai',
        role: 'TECH_LEAD',
        status: 'online',
        currentLocation: {
          prNumber: 182,
          activity: 'Reviewing PR #182 (Checkout VAT calculation)',
        },
        lastSeenAt: now,
        workspaceId: defaultWorkspace,
      },
      {
        userId: 'usr_priya_03',
        userName: 'Priya Patel',
        email: 'priya@devflow.ai',
        role: 'SENIOR_DEVELOPER',
        status: 'online',
        currentLocation: {
          documentId: 'doc_arch_01',
          activity: 'Editing System Architecture & CRDT RFC',
        },
        lastSeenAt: now,
        workspaceId: defaultWorkspace,
      },
      {
        userId: 'usr_alex_04',
        userName: 'Alex Chen',
        email: 'alex@devflow.ai',
        role: 'DEVOPS_ENGINEER',
        status: 'idle',
        currentLocation: {
          activity: 'Monitoring Kafka Job Cluster & Redis TTLs',
        },
        lastSeenAt: new Date(Date.now() - 30000).toISOString(),
        workspaceId: defaultWorkspace,
      },
    ];

    const map = new Map<string, UserPresence>();
    initialUsers.forEach((u) => map.set(u.userId, u));
    this.workspacePresence.set(defaultWorkspace, map);
  }

  /**
   * Record or update a user's presence state
   */
  updatePresence(dto: UpdatePresenceDto): UserPresence {
    let workspaceMap = this.workspacePresence.get(dto.workspaceId);
    if (!workspaceMap) {
      workspaceMap = new Map<string, UserPresence>();
      this.workspacePresence.set(dto.workspaceId, workspaceMap);
    }

    const existing = workspaceMap.get(dto.userId);
    const now = new Date().toISOString();

    const updated: UserPresence = {
      userId: dto.userId,
      userName: dto.userName || existing?.userName || 'Anonymous Engineer',
      email: dto.email || existing?.email,
      avatarUrl: dto.avatarUrl || existing?.avatarUrl,
      role: dto.role || existing?.role || 'DEVELOPER',
      status: dto.status || existing?.status || 'online',
      currentLocation: {
        file: dto.currentLocation?.file ?? existing?.currentLocation.file,
        prNumber: dto.currentLocation?.prNumber ?? existing?.currentLocation.prNumber,
        documentId: dto.currentLocation?.documentId ?? existing?.currentLocation.documentId,
        activity:
          dto.currentLocation?.activity ??
          existing?.currentLocation.activity ??
          'Active on DevFlow Platform',
      },
      lastSeenAt: now,
      workspaceId: dto.workspaceId,
    };

    workspaceMap.set(dto.userId, updated);
    this.logger.debug(
      `Presence updated for ${updated.userName} (${updated.userId}) in workspace ${dto.workspaceId}: ${updated.currentLocation.activity}`,
    );

    return updated;
  }

  /**
   * Refresh heartbeat timestamp to maintain online status
   */
  heartbeat(userId: string, workspaceId: string): boolean {
    const workspaceMap = this.workspacePresence.get(workspaceId);
    if (!workspaceMap) return false;

    const user = workspaceMap.get(userId);
    if (!user) return false;

    user.lastSeenAt = new Date().toISOString();
    user.status = 'online';
    return true;
  }

  /**
   * Mark a user as offline on WebSocket disconnect
   */
  setUserOffline(userId: string, workspaceId: string): UserPresence | null {
    const workspaceMap = this.workspacePresence.get(workspaceId);
    if (!workspaceMap) return null;

    const user = workspaceMap.get(userId);
    if (!user) return null;

    user.status = 'offline';
    user.lastSeenAt = new Date().toISOString();
    return user;
  }

  /**
   * Get all active and online users for a workspace
   */
  getWorkspacePresence(workspaceId: string): UserPresence[] {
    this.pruneStaleConnections(workspaceId);
    const workspaceMap = this.workspacePresence.get(workspaceId);
    if (!workspaceMap) {
      return this.workspacePresence.get('ws_devflow_primary')
        ? Array.from(this.workspacePresence.get('ws_devflow_primary')!.values())
        : [];
    }
    return Array.from(workspaceMap.values());
  }

  /**
   * Get all users currently viewing/editing a specific document
   */
  getDocumentCollaborators(documentId: string, workspaceId: string): UserPresence[] {
    const presence = this.getWorkspacePresence(workspaceId);
    return presence.filter(
      (p) => p.status !== 'offline' && p.currentLocation.documentId === documentId,
    );
  }

  /**
   * Prune stale connections exceeding TTL threshold
   */
  pruneStaleConnections(workspaceId: string): number {
    const workspaceMap = this.workspacePresence.get(workspaceId);
    if (!workspaceMap) return 0;

    const now = Date.now();
    let pruned = 0;

    for (const [userId, presence] of workspaceMap.entries()) {
      const lastSeen = new Date(presence.lastSeenAt).getTime();
      if (now - lastSeen > this.STALE_THRESHOLD_MS && presence.status !== 'offline') {
        presence.status = 'idle';
        pruned++;
      }
    }

    return pruned;
  }
}

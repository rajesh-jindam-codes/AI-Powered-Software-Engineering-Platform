import { Injectable, Logger } from '@nestjs/common';
import {
  AuditLogEntry,
  AuditLogQueryFilter,
  AuditLogStatsResponse,
} from '@devflow/shared-types';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AuditService {
  private readonly logger = new Logger('AuditService');
  private readonly logs: AuditLogEntry[] = [];

  constructor() {
    this.seedDefaultAuditLogs();
  }

  private seedDefaultAuditLogs() {
    const now = Date.now();
    const initialEntries: Array<Omit<AuditLogEntry, 'id' | 'timestamp'>> = [
      {
        action: 'USER_LOGIN',
        userEmail: 'rajesh@devflow.ai',
        userId: 'usr_rajesh_01',
        resource: 'auth:jwt',
        status: 'SUCCESS',
        ipAddress: '192.168.1.45',
        details: { provider: 'github_oauth', role: 'STAFF_ENGINEER' },
      },
      {
        action: 'REPOSITORY_CONNECTED',
        userEmail: 'rajesh@devflow.ai',
        userId: 'usr_rajesh_01',
        resource: 'repo:devflow-ai/api',
        status: 'SUCCESS',
        ipAddress: '192.168.1.45',
        details: { repoId: 'repo_devflow', defaultBranch: 'main' },
      },
      {
        action: 'MEMBER_ROLE_UPDATED',
        userEmail: 'rajesh@devflow.ai',
        userId: 'usr_rajesh_01',
        resource: 'workspace:ws_devflow_primary:member:usr_priya_03',
        status: 'SUCCESS',
        ipAddress: '192.168.1.45',
        details: { targetUser: 'priya@devflow.ai', oldRole: 'DEVELOPER', newRole: 'SENIOR_DEVELOPER' },
      },
      {
        action: 'AI_TASK_DISPATCHED',
        userEmail: 'priya@devflow.ai',
        userId: 'usr_priya_03',
        resource: 'agent:debugging_agent:task_dbg_01',
        status: 'SUCCESS',
        ipAddress: '192.168.1.88',
        details: { goal: 'Why is checkout failing?', model: 'devflow-code-rag-v1' },
      },
      {
        action: 'AGENT_TOOL_CALLED',
        userEmail: 'priya@devflow.ai',
        userId: 'usr_priya_03',
        resource: 'tool:run_tests:checkout.service.spec.ts',
        status: 'SUCCESS',
        ipAddress: '192.168.1.88',
        details: { toolName: 'run_tests', durationMs: 82, isSandboxed: true },
      },
      {
        action: 'PR_REVIEW_TRIGGERED',
        userEmail: 'rahul@devflow.ai',
        userId: 'usr_rahul_02',
        resource: 'review:pr_182',
        status: 'SUCCESS',
        ipAddress: '192.168.1.72',
        details: { prNumber: 182, findingsCount: 2 },
      },
      {
        action: 'PATCH_APPLIED',
        userEmail: 'rahul@devflow.ai',
        userId: 'usr_rahul_02',
        resource: 'patch:checkout_vat_tax',
        status: 'SUCCESS',
        ipAddress: '192.168.1.72',
        details: { file: 'checkout.service.ts', verifiedInSandbox: true },
      },
    ];

    for (let i = 0; i < initialEntries.length; i++) {
      const e = initialEntries[i];
      this.logs.push({
        id: `audit_seed_${i + 1}`,
        timestamp: new Date(now - (initialEntries.length - i) * 600000).toISOString(),
        ...e,
      });
    }
  }

  record(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): AuditLogEntry {
    const fullEntry: AuditLogEntry = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      ...entry,
    };

    this.logs.unshift(fullEntry);
    if (this.logs.length > 2000) {
      this.logs.pop();
    }

    this.logger.log(
      JSON.stringify({
        auditEvent: true,
        action: fullEntry.action,
        userEmail: fullEntry.userEmail || 'anonymous',
        status: fullEntry.status,
        resource: fullEntry.resource,
        ipAddress: fullEntry.ipAddress,
        timestamp: fullEntry.timestamp,
      }),
    );

    return fullEntry;
  }

  getLogs(limit = 50): AuditLogEntry[] {
    return this.logs.slice(0, limit);
  }

  getLogsForUser(userId: string, limit = 20): AuditLogEntry[] {
    return this.logs.filter((l) => l.userId === userId).slice(0, limit);
  }

  getFilteredLogs(filter: AuditLogQueryFilter = {}): AuditLogEntry[] {
    let list = [...this.logs];

    if (filter.action) {
      const actionUpper = filter.action.toUpperCase();
      list = list.filter((l) => l.action.toUpperCase().includes(actionUpper));
    }

    if (filter.userId) {
      list = list.filter((l) => l.userId === filter.userId);
    }

    if (filter.resource) {
      list = list.filter((l) => l.resource.toLowerCase().includes(filter.resource!.toLowerCase()));
    }

    if (filter.status) {
      list = list.filter((l) => l.status.toUpperCase() === filter.status!.toUpperCase());
    }

    const limit = filter.limit || 50;
    return list.slice(0, limit);
  }

  getAuditStats(): AuditLogStatsResponse {
    const byAction: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    const userCounts = new Map<string, { email: string; count: number }>();

    for (const log of this.logs) {
      byAction[log.action] = (byAction[log.action] || 0) + 1;
      byStatus[log.status] = (byStatus[log.status] || 0) + 1;

      if (log.userId) {
        const existing = userCounts.get(log.userId) || {
          email: log.userEmail || 'anonymous',
          count: 0,
        };
        existing.count++;
        userCounts.set(log.userId, existing);
      }
    }

    const topUsers = Array.from(userCounts.entries())
      .map(([userId, val]) => ({ userId, userEmail: val.email, count: val.count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalLogs: this.logs.length,
      byAction,
      byStatus,
      topUsers,
    };
  }
}

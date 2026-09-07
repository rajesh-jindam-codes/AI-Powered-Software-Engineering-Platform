import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { ActivityFeedItem, ActivityActionType } from '@devflow/shared-types';

export interface RecordActivityDto {
  workspaceId: string;
  actorName: string;
  actorAvatar?: string;
  action: ActivityActionType;
  target: string;
  description: string;
}

/**
 * DEVFLOW AI — ActivityFeedService (Phase 12)
 *
 * Real-time event aggregator and workspace activity streamer.
 */
@Injectable()
export class ActivityFeedService {
  private readonly logger = new Logger(ActivityFeedService.name);

  // Map<workspaceId, ActivityFeedItem[]>
  private readonly workspaceActivities = new Map<string, ActivityFeedItem[]>();

  constructor() {
    this.seedDefaultActivity();
  }

  private seedDefaultActivity() {
    const ws = 'ws_devflow_primary';
    const now = Date.now();

    const items: ActivityFeedItem[] = [
      {
        id: 'act_001',
        workspaceId: ws,
        actorName: 'Rajesh Kumar',
        action: 'VIEWED_FILE',
        target: 'src/modules/auth/auth.service.ts',
        description: 'Rajesh is viewing auth.service.ts in Repository devflow-ai/api',
        timestamp: new Date(now - 120000).toISOString(),
      },
      {
        id: 'act_002',
        workspaceId: ws,
        actorName: 'Rahul Sharma',
        action: 'REVIEWED_PR',
        target: 'PR #182',
        description: 'Rahul is reviewing PR #182 (Checkout VAT tax calculation fix)',
        timestamp: new Date(now - 240000).toISOString(),
      },
      {
        id: 'act_003',
        workspaceId: ws,
        actorName: 'Priya Patel',
        action: 'EDITED_DOC',
        target: 'RFC 042: Real-Time Multi-Region Collaboration',
        description: 'Priya updated the CRDT state vector specification',
        timestamp: new Date(now - 360000).toISOString(),
      },
      {
        id: 'act_004',
        workspaceId: ws,
        actorName: 'Alex Chen',
        action: 'GENERATED_TESTS',
        target: 'CheckoutServiceSpec',
        description: 'Alex generated 4 test cases and verified them in gVisor sandbox',
        timestamp: new Date(now - 600000).toISOString(),
      },
    ];

    this.workspaceActivities.set(ws, items);
  }

  /**
   * Record a new activity event
   */
  recordActivity(dto: RecordActivityDto): ActivityFeedItem {
    const item: ActivityFeedItem = {
      id: `act_${uuidv4().substring(0, 8)}`,
      workspaceId: dto.workspaceId,
      actorName: dto.actorName,
      actorAvatar: dto.actorAvatar,
      action: dto.action,
      target: dto.target,
      description: dto.description,
      timestamp: new Date().toISOString(),
    };

    let list = this.workspaceActivities.get(dto.workspaceId);
    if (!list) {
      list = [];
      this.workspaceActivities.set(dto.workspaceId, list);
    }
    list.unshift(item);
    if (list.length > 500) list.pop();

    this.logger.debug(`Activity recorded for ${dto.workspaceId}: ${dto.description}`);
    return item;
  }

  /**
   * Get activity feed for a workspace
   */
  getActivityFeed(workspaceId: string = 'ws_devflow_primary', limit = 30): ActivityFeedItem[] {
    const list = this.workspaceActivities.get(workspaceId);
    if (!list) {
      return this.workspaceActivities.get('ws_devflow_primary')?.slice(0, limit) || [];
    }
    return list.slice(0, limit);
  }
}

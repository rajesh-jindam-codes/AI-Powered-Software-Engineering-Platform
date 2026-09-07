import { Test, TestingModule } from '@nestjs/testing';
import { PresenceService } from './presence.service';
import { CrdtSyncService } from './crdt-sync.service';
import { DocumentsService } from './documents.service';
import { ActivityFeedService } from './activity-feed.service';
import { DocumentsController } from './documents.controller';
import { AuditService } from '../audit/audit.service';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { DocOperation } from '@devflow/shared-types';

describe('Real-Time Collaboration & CRDT Synchronization (Phase 12)', () => {
  let presenceService: PresenceService;
  let crdtSyncService: CrdtSyncService;
  let documentsService: DocumentsService;
  let activityFeedService: ActivityFeedService;
  let controller: DocumentsController;
  let auditService: AuditService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DocumentsController],
      providers: [
        PresenceService,
        CrdtSyncService,
        DocumentsService,
        ActivityFeedService,
        {
          provide: AuditService,
          useValue: {
            record: jest.fn().mockImplementation((entry) => ({
              id: 'audit_collab_101',
              timestamp: new Date().toISOString(),
              ...entry,
            })),
          },
        },
      ],
    }).compile();

    presenceService = module.get<PresenceService>(PresenceService);
    crdtSyncService = module.get<CrdtSyncService>(CrdtSyncService);
    documentsService = module.get<DocumentsService>(DocumentsService);
    activityFeedService = module.get<ActivityFeedService>(ActivityFeedService);
    controller = module.get<DocumentsController>(DocumentsController);
    auditService = module.get<AuditService>(AuditService);
  });

  describe('1. Distributed Presence & Location Tracking', () => {
    it('should track active users and their location (files, PRs, documents)', () => {
      const presence = presenceService.getWorkspacePresence('ws_devflow_primary');

      expect(presence.length).toBeGreaterThanOrEqual(3);
      const rajesh = presence.find((u) => u.userId === 'usr_rajesh_01');
      expect(rajesh).toBeDefined();
      expect(rajesh?.currentLocation.activity).toContain('Viewing auth.service.ts');

      const rahul = presence.find((u) => u.userId === 'usr_rahul_02');
      expect(rahul?.currentLocation.prNumber).toBe(182);

      const priya = presence.find((u) => u.userId === 'usr_priya_03');
      expect(priya?.currentLocation.documentId).toBe('doc_arch_01');
    });

    it('should update presence location and status', () => {
      const updated = presenceService.updatePresence({
        userId: 'usr_rajesh_01',
        userName: 'Rajesh Kumar',
        workspaceId: 'ws_devflow_primary',
        status: 'online',
        currentLocation: {
          file: 'apps/api/src/modules/checkout/checkout.service.ts',
          activity: 'Editing checkout.service.ts',
        },
      });

      expect(updated.currentLocation.file).toBe('apps/api/src/modules/checkout/checkout.service.ts');
      expect(updated.currentLocation.activity).toBe('Editing checkout.service.ts');
    });

    it('should handle disconnect / reconnect and mark offline', () => {
      const offline = presenceService.setUserOffline('usr_rahul_02', 'ws_devflow_primary');
      expect(offline?.status).toBe('offline');

      // Reconnect with heartbeat
      const reconnected = presenceService.heartbeat('usr_rahul_02', 'ws_devflow_primary');
      expect(reconnected).toBe(true);

      const presenceList = presenceService.getWorkspacePresence('ws_devflow_primary');
      const rahul = presenceList.find((u) => u.userId === 'usr_rahul_02');
      expect(rahul?.status).toBe('online');
    });

    it('should prune stale connections exceeding TTL threshold', () => {
      // Artificially inject a stale user
      presenceService.updatePresence({
        userId: 'usr_stale_99',
        userName: 'Stale Bot',
        workspaceId: 'ws_devflow_primary',
        status: 'online',
      });

      const workspaceMap = (presenceService as any).workspacePresence.get('ws_devflow_primary');
      const staleUser = workspaceMap.get('usr_stale_99');
      staleUser.lastSeenAt = new Date(Date.now() - 120000).toISOString(); // 2 mins ago

      const prunedCount = presenceService.pruneStaleConnections('ws_devflow_primary');
      expect(prunedCount).toBeGreaterThanOrEqual(1);
      expect(staleUser.status).toBe('idle');
    });
  });

  describe('2. CRDT Vector Clocks & Concurrent Operations', () => {
    it('should apply insert and delete operations with deterministic convergence', () => {
      const initialDoc = {
        id: 'doc_test_sync_1',
        workspaceId: 'ws_devflow_primary',
        title: 'CRDT Sync Test',
        content: 'Hello World',
        version: 1,
        lastModifiedBy: 'Rajesh',
        activeCollaboratorsCount: 2,
        vectorClock: { usr_rajesh: 1 },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // User A (Priya) inserts " Beautiful" at index 5
      const op1: DocOperation = {
        id: 'op_001',
        documentId: initialDoc.id,
        userId: 'usr_priya',
        userName: 'Priya Patel',
        operationType: 'insert',
        position: 5,
        text: ' Beautiful',
        version: 1,
        vectorClock: { usr_priya: 1 },
        timestamp: Date.now(),
      };

      const result1 = crdtSyncService.applyOperation(initialDoc, op1);
      expect(result1.applied).toBe(true);
      expect(result1.doc.content).toBe('Hello Beautiful World');
      expect(result1.doc.version).toBe(2);
      expect(result1.doc.vectorClock.usr_priya).toBe(1);

      // User B (Rahul) inserts "!" at the end (index 21)
      const op2: DocOperation = {
        id: 'op_002',
        documentId: initialDoc.id,
        userId: 'usr_rahul',
        userName: 'Rahul Sharma',
        operationType: 'insert',
        position: 21,
        text: '!',
        version: 2,
        vectorClock: { usr_rahul: 1 },
        timestamp: Date.now(),
      };

      const result2 = crdtSyncService.applyOperation(result1.doc, op2);
      expect(result2.applied).toBe(true);
      expect(result2.doc.content).toBe('Hello Beautiful World!');
      expect(result2.doc.version).toBe(3);
    });

    it('should deduplicate duplicate operations idempotently', () => {
      const doc = {
        id: 'doc_idempotent_test',
        workspaceId: 'ws_devflow_primary',
        title: 'Idempotency Test',
        content: 'Initial Text',
        version: 1,
        lastModifiedBy: 'User',
        activeCollaboratorsCount: 1,
        vectorClock: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const op: DocOperation = {
        id: 'op_dup_unique_99',
        documentId: doc.id,
        userId: 'usr_1',
        operationType: 'insert',
        position: 0,
        text: '[Prefix] ',
        version: 1,
        vectorClock: { usr_1: 1 },
        timestamp: Date.now(),
      };

      const firstPass = crdtSyncService.applyOperation(doc, op);
      expect(firstPass.applied).toBe(true);
      expect(firstPass.isDuplicate).toBe(false);
      expect(firstPass.doc.content).toBe('[Prefix] Initial Text');

      // Duplicate submission of same op id
      const secondPass = crdtSyncService.applyOperation(firstPass.doc, op);
      expect(secondPass.applied).toBe(false);
      expect(secondPass.isDuplicate).toBe(true);
      expect(secondPass.doc.content).toBe('[Prefix] Initial Text'); // Content preserved without duplicate insertion
    });
  });

  describe('3. Collaborative Documents CRUD & Version Snapshots', () => {
    it('should create new documents and generate version snapshots', () => {
      const user = { id: 'usr_rajesh_01', email: 'rajesh@devflow.ai', name: 'Rajesh Kumar' };

      const doc = controller.createDocument(
        {
          workspaceId: 'ws_devflow_primary',
          title: 'Kubernetes Ingress & TLS Architecture',
          content: '# Ingress Spec\n\nConfiguring Traefik with Let\'s Encrypt.',
        },
        { user },
      );

      expect(doc.id).toBeDefined();
      expect(doc.version).toBe(1);
      expect(doc.lastModifiedBy).toBe('Rajesh Kumar');

      const snapshots = controller.getDocumentSnapshots(doc.id);
      expect(snapshots.length).toBe(1);
      expect(snapshots[0].summary).toBe('Document created.');
    });

    it('should enforce multi-tenant boundary checks', () => {
      const user = { id: 'usr_intruder', email: 'intruder@other-company.com' };

      // Document exists in ws_devflow_primary
      expect(() => {
        controller.getDocumentById('doc_arch_01', 'ws_unauthorized_org');
      }).toThrow(ForbiddenException);
    });

    it('should throw NotFoundException for invalid document ID', () => {
      expect(() => {
        controller.getDocumentById('doc_non_existent');
      }).toThrow(NotFoundException);
    });
  });

  describe('4. Threaded Comments, @Mentions & Real-Time Notifications', () => {
    it('should post comment, extract @mentions, and dispatch real-time notifications', () => {
      const user = {
        id: 'usr_priya_03',
        email: 'priya@devflow.ai',
        name: 'Priya Patel',
        avatarUrl: 'https://avatar.devflow.ai/priya.png',
      };

      const result = controller.postComment(
        'doc_arch_01',
        {
          content: 'Hey @rajesh and @rahul, please review section 3 for CRDT state vectors!',
        },
        { user },
      );

      expect(result.comment.id).toBeDefined();
      expect(result.comment.authorName).toBe('Priya Patel');
      expect(result.comment.mentions).toEqual(['rajesh', 'rahul']);

      // Check generated notifications
      expect(result.generatedNotifications.length).toBe(2);
      expect(result.generatedNotifications[0].type).toBe('mention');
      expect(result.generatedNotifications[0].title).toContain('RFC 042');
      expect(result.generatedNotifications[0].actor.userName).toBe('Priya Patel');

      const workspaceNotifs = controller.getNotifications('ws_devflow_primary');
      expect(workspaceNotifs.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('5. Real-Time Activity Feed', () => {
    it('should aggregate team actions and return live feed', () => {
      const feed = controller.getActivityFeed('ws_devflow_primary', 10);
      expect(feed.length).toBeGreaterThanOrEqual(4);

      // Verify actions
      expect(feed.some((f) => f.action === 'VIEWED_FILE')).toBe(true);
      expect(feed.some((f) => f.action === 'REVIEWED_PR')).toBe(true);
      expect(feed.some((f) => f.action === 'EDITED_DOC')).toBe(true);

      // Record new activity
      activityFeedService.recordActivity({
        workspaceId: 'ws_devflow_primary',
        actorName: 'Alex Chen',
        action: 'DISPATCHED_AGENT',
        target: 'InvestigationAgent',
        description: 'Alex dispatched Code Investigation Agent for payment gateway',
      });

      const updatedFeed = controller.getActivityFeed('ws_devflow_primary', 10);
      expect(updatedFeed[0].action).toBe('DISPATCHED_AGENT');
      expect(updatedFeed[0].actorName).toBe('Alex Chen');
    });
  });
});

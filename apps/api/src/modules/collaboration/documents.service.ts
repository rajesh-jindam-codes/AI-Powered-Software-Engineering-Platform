import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import {
  CollaborativeDoc,
  DocumentVersionSnapshot,
  DocumentComment,
  RealtimeNotification,
  DocOperation,
  CreateDocumentRequest,
  UpdateDocumentRequest,
  PostCommentRequest,
} from '@devflow/shared-types';
import { CrdtSyncService } from './crdt-sync.service';
import { AuditService } from '../audit/audit.service';

/**
 * DEVFLOW AI — DocumentsService (Phase 12)
 *
 * Manages Collaborative Engineering Documents, version history snapshots,
 * threaded comments, user @mentions, and real-time notification dispatching.
 */
@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  // In-memory persistent storage: Map<docId, CollaborativeDoc>
  private readonly documents = new Map<string, CollaborativeDoc>();

  // Snapshots for version history: Map<docId, DocumentVersionSnapshot[]>
  private readonly snapshots = new Map<string, DocumentVersionSnapshot[]>();

  // Comments per document: Map<docId, DocumentComment[]>
  private readonly comments = new Map<string, DocumentComment[]>();

  // Real-time notifications: Map<workspaceId, RealtimeNotification[]>
  private readonly notifications = new Map<string, RealtimeNotification[]>();

  constructor(
    private readonly crdtSync: CrdtSyncService,
    private readonly auditService: AuditService,
  ) {
    this.seedDefaultDocuments();
  }

  private seedDefaultDocuments() {
    const ws = 'ws_devflow_primary';
    const now = new Date().toISOString();

    const initialDocs: CollaborativeDoc[] = [
      {
        id: 'doc_arch_01',
        workspaceId: ws,
        title: 'RFC 042: Real-Time Multi-Region Collaboration & CRDT Convergence',
        content: `# RFC 042: Real-Time Multi-Region Collaboration Architecture

## 1. Overview
DevFlow AI uses a hybrid transport combining Redis Pub/Sub, NestJS WebSockets, and Vector Clock CRDT synchronization.

## 2. Presence & State Synchronization
- Distributed presence tracking via Redis with 60s TTL heartbeats.
- Real-time multiplayer cursor broadcasts and typing indicators.
- Threaded discussions with automatic @mention resolution.

## 3. Conflict-Free Operational Transformations
Each mutation is encapsulated as a \`DocOperation\` with vector clock stamps.
Deterministic tie-breaking ensures identical convergence across all connected peers.

## 4. Security & Multi-Tenancy
All socket connections enforce JWT authentication and RBAC boundary isolation per workspace.`,
        version: 4,
        lastModifiedBy: 'Priya Patel',
        activeCollaboratorsCount: 3,
        vectorClock: { usr_priya_03: 3, usr_rajesh_01: 1 },
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        updatedAt: now,
      },
      {
        id: 'doc_sec_02',
        workspaceId: ws,
        title: 'Security Specification: Zero-Trust Sandboxed Execution Engine',
        content: `# Security Spec: Zero-Trust Sandboxed Execution Engine

## 1. Isolation Policy
All repository test suites and dynamic code execution occur inside gVisor-based sandbox containers.

## 2. Resource Quotas
- CPU: 1.0 Core (1000m)
- Memory: 512 MB ceiling
- Execution Timeout: 15 seconds
- Outbound Networking: Airgapped (disabled)

## 3. Prohibited Command Filters
Direct host execution of shell scripts or arbitrary command injection is blocked via regex guardrails.`,
        version: 2,
        lastModifiedBy: 'Alex Chen',
        activeCollaboratorsCount: 1,
        vectorClock: { usr_alex_04: 2 },
        createdAt: new Date(Date.now() - 172800000).toISOString(),
        updatedAt: now,
      },
    ];

    for (const doc of initialDocs) {
      this.documents.set(doc.id, doc);

      // Seed initial snapshots
      this.snapshots.set(doc.id, [
        {
          id: `snap_${doc.id}_v1`,
          documentId: doc.id,
          version: 1,
          title: doc.title,
          content: doc.content.slice(0, 100) + '\n...',
          modifiedBy: doc.lastModifiedBy,
          summary: 'Initial draft created.',
          createdAt: doc.createdAt,
        },
        {
          id: `snap_${doc.id}_v${doc.version}`,
          documentId: doc.id,
          version: doc.version,
          title: doc.title,
          content: doc.content,
          modifiedBy: doc.lastModifiedBy,
          summary: 'Updated architecture diagrams and security boundaries.',
          createdAt: doc.updatedAt,
        },
      ]);

      // Seed initial comments
      if (doc.id === 'doc_arch_01') {
        this.comments.set(doc.id, [
          {
            id: 'cmt_001',
            documentId: doc.id,
            authorId: 'usr_rahul_02',
            authorName: 'Rahul Sharma',
            content: 'Great writeup @priya! How are we handling out-of-order packet delivery during network reconnects?',
            mentions: ['priya'],
            createdAt: new Date(Date.now() - 3600000).toISOString(),
          },
          {
            id: 'cmt_002',
            documentId: doc.id,
            authorId: 'usr_priya_03',
            authorName: 'Priya Patel',
            content: '@rahul The CrdtSyncService uses an operation ID cache and vector clocks to achieve idempotent convergence.',
            mentions: ['rahul'],
            createdAt: new Date(Date.now() - 1800000).toISOString(),
          },
        ]);
      }
    }
  }

  /**
   * List all collaborative documents in a workspace
   */
  listDocuments(workspaceId: string = 'ws_devflow_primary'): CollaborativeDoc[] {
    const docs = Array.from(this.documents.values());
    const filtered = docs.filter((d) => d.workspaceId === workspaceId);
    return filtered.length > 0 ? filtered : docs;
  }

  /**
   * Get a document by ID with permission verification
   */
  getDocumentById(documentId: string, workspaceId?: string): CollaborativeDoc {
    const doc = this.documents.get(documentId);
    if (!doc) {
      throw new NotFoundException(`Document "${documentId}" not found.`);
    }

    if (workspaceId && doc.workspaceId !== workspaceId) {
      throw new ForbiddenException(`Access denied to document in workspace "${doc.workspaceId}".`);
    }

    return doc;
  }

  /**
   * Create a new engineering document
   */
  createDocument(
    dto: CreateDocumentRequest,
    user?: { id: string; email: string; name?: string },
  ): CollaborativeDoc {
    const docId = `doc_${uuidv4().substring(0, 8)}`;
    const workspaceId = dto.workspaceId || 'ws_devflow_primary';
    const now = new Date().toISOString();
    const authorName = user?.name || user?.email || 'DevFlow Engineer';

    const newDoc: CollaborativeDoc = {
      id: docId,
      workspaceId,
      title: dto.title || 'Untitled Engineering Note',
      content: dto.content || `# ${dto.title || 'Untitled Document'}\n\nStart collaborative editing here...`,
      version: 1,
      lastModifiedBy: authorName,
      activeCollaboratorsCount: 1,
      vectorClock: { [user?.id || 'usr_default']: 1 },
      createdAt: now,
      updatedAt: now,
    };

    this.documents.set(docId, newDoc);

    // Initial snapshot
    this.snapshots.set(docId, [
      {
        id: `snap_${docId}_v1`,
        documentId: docId,
        version: 1,
        title: newDoc.title,
        content: newDoc.content,
        modifiedBy: authorName,
        summary: 'Document created.',
        createdAt: now,
      },
    ]);

    this.comments.set(docId, []);

    this.auditService.record({
      action: 'DOCUMENT_CREATED',
      resource: `doc:${docId}:${workspaceId}`,
      status: 'SUCCESS',
      details: { docId, title: newDoc.title },
      userId: user?.id,
      userEmail: user?.email,
    });

    return newDoc;
  }

  /**
   * Apply an edit or operation to a document
   */
  updateDocument(
    documentId: string,
    dto: UpdateDocumentRequest,
    user?: { id: string; email: string; name?: string },
  ): CollaborativeDoc {
    const doc = this.getDocumentById(documentId);

    if (dto.operation) {
      const result = this.crdtSync.applyOperation(doc, dto.operation);
      this.documents.set(documentId, result.doc);

      // Create snapshot every 5 versions
      if (result.doc.version % 5 === 0) {
        this.createSnapshot(result.doc, `Auto-snapshot at version ${result.doc.version}`);
      }

      return result.doc;
    }

    // Direct title/content update
    const updated: CollaborativeDoc = {
      ...doc,
      title: dto.title ?? doc.title,
      content: dto.content ?? doc.content,
      version: doc.version + 1,
      lastModifiedBy: user?.name || user?.email || doc.lastModifiedBy,
      updatedAt: new Date().toISOString(),
    };

    this.documents.set(documentId, updated);
    return updated;
  }

  /**
   * Create a named version snapshot
   */
  createSnapshot(doc: CollaborativeDoc, summary: string): DocumentVersionSnapshot {
    const snapId = `snap_${doc.id}_v${doc.version}_${uuidv4().substring(0, 4)}`;
    const snapshot: DocumentVersionSnapshot = {
      id: snapId,
      documentId: doc.id,
      version: doc.version,
      title: doc.title,
      content: doc.content,
      modifiedBy: doc.lastModifiedBy,
      summary,
      createdAt: new Date().toISOString(),
    };

    let list = this.snapshots.get(doc.id);
    if (!list) {
      list = [];
      this.snapshots.set(doc.id, list);
    }
    list.unshift(snapshot);
    return snapshot;
  }

  /**
   * Get version history snapshots for a document
   */
  getDocumentSnapshots(documentId: string): DocumentVersionSnapshot[] {
    return this.snapshots.get(documentId) || [];
  }

  /**
   * Post a comment on a document with automatic @mention resolution and notifications
   */
  postComment(
    dto: PostCommentRequest,
    user: { id: string; email: string; name?: string; avatarUrl?: string },
  ): { comment: DocumentComment; generatedNotifications: RealtimeNotification[] } {
    const doc = this.getDocumentById(dto.documentId);
    const commentId = `cmt_${uuidv4().substring(0, 8)}`;
    const now = new Date().toISOString();

    // Extract @mentions (e.g. "@rajesh", "@rahul", "@priya")
    const mentionRegex = /@([a-zA-Z0-9_]+)/g;
    const mentions: string[] = [];
    let match: RegExpExecArray | null;
    while ((match = mentionRegex.exec(dto.content)) !== null) {
      if (match[1] && !mentions.includes(match[1].toLowerCase())) {
        mentions.push(match[1].toLowerCase());
      }
    }

    const comment: DocumentComment = {
      id: commentId,
      documentId: dto.documentId,
      authorId: user.id,
      authorName: user.name || user.email,
      avatarUrl: user.avatarUrl,
      content: dto.content,
      mentions,
      createdAt: now,
    };

    let docComments = this.comments.get(dto.documentId);
    if (!docComments) {
      docComments = [];
      this.comments.set(dto.documentId, docComments);
    }
    docComments.push(comment);

    // Create real-time notifications for mentioned users
    const generatedNotifications: RealtimeNotification[] = [];

    for (const mention of mentions) {
      const notif: RealtimeNotification = {
        id: `notif_${uuidv4().substring(0, 8)}`,
        workspaceId: doc.workspaceId,
        type: 'mention',
        title: `Mentioned in ${doc.title}`,
        message: `${comment.authorName} mentioned you: "${dto.content.substring(0, 80)}..."`,
        linkUrl: `/collaboration?doc=${doc.id}`,
        actor: {
          userId: user.id,
          userName: comment.authorName,
          avatarUrl: user.avatarUrl,
        },
        read: false,
        createdAt: now,
      };

      this.addNotification(doc.workspaceId, notif);
      generatedNotifications.push(notif);
    }

    return { comment, generatedNotifications };
  }

  /**
   * Get comments for a document
   */
  getDocumentComments(documentId: string): DocumentComment[] {
    return this.comments.get(documentId) || [];
  }

  /**
   * Add a notification to workspace store
   */
  addNotification(workspaceId: string, notif: RealtimeNotification): void {
    let list = this.notifications.get(workspaceId);
    if (!list) {
      list = [];
      this.notifications.set(workspaceId, list);
    }
    list.unshift(notif);
    if (list.length > 500) list.pop();
  }

  /**
   * Get real-time notifications for a workspace / user
   */
  getNotifications(workspaceId: string = 'ws_devflow_primary'): RealtimeNotification[] {
    return this.notifications.get(workspaceId) || [];
  }
}

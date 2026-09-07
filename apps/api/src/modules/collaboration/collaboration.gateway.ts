import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import {
  DocOperation,
  TypingIndicator,
  PostCommentRequest,
} from '@devflow/shared-types';
import { PresenceService, UpdatePresenceDto } from './presence.service';
import { CrdtSyncService } from './crdt-sync.service';
import { DocumentsService } from './documents.service';
import { ActivityFeedService } from './activity-feed.service';

/**
 * DEVFLOW AI — CollaborationGateway (Phase 12)
 *
 * Real-Time WebSocket Gateway for multiplayer editing, Redis presence,
 * live typing indicators, CRDT vector clock synchronization, and mentions.
 */
@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: '/collaboration',
})
export class CollaborationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(CollaborationGateway.name);

  @WebSocketServer()
  server!: Server;

  // Track socket mappings: Map<socketId, { userId: string; workspaceId: string; documentId?: string }>
  private readonly socketSessions = new Map<
    string,
    { userId: string; workspaceId: string; documentId?: string; userName: string }
  >();

  constructor(
    private readonly presenceService: PresenceService,
    private readonly crdtSync: CrdtSyncService,
    private readonly documentsService: DocumentsService,
    private readonly activityFeed: ActivityFeedService,
  ) {}

  handleConnection(client: Socket) {
    this.logger.log(`WebSocket client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    const session = this.socketSessions.get(client.id);
    if (session) {
      this.logger.log(`WebSocket client disconnected: ${session.userName} (${client.id})`);
      const offlineUser = this.presenceService.setUserOffline(
        session.userId,
        session.workspaceId,
      );

      if (offlineUser && this.server) {
        this.server
          .to(`workspace:${session.workspaceId}`)
          .emit('presence:changed', offlineUser);
      }

      this.socketSessions.delete(client.id);
    }
  }

  /**
   * Client joins a workspace room
   */
  @SubscribeMessage('workspace:join')
  handleWorkspaceJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { workspaceId: string; userId: string; userName: string },
  ) {
    const room = `workspace:${payload.workspaceId}`;
    client.join(room);

    this.socketSessions.set(client.id, {
      userId: payload.userId,
      workspaceId: payload.workspaceId,
      userName: payload.userName,
    });

    const presenceList = this.presenceService.getWorkspacePresence(payload.workspaceId);
    client.emit('presence:list', presenceList);
    const feed = this.activityFeed.getActivityFeed(payload.workspaceId);
    client.emit('activity:list', feed);

    this.logger.debug(`Client ${client.id} joined workspace room: ${room}`);
  }

  /**
   * Client updates presence (e.g. active file, PR review, or doc editing)
   */
  @SubscribeMessage('presence:update')
  handlePresenceUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: UpdatePresenceDto,
  ) {
    const updated = this.presenceService.updatePresence(payload);

    if (this.server) {
      this.server
        .to(`workspace:${payload.workspaceId}`)
        .emit('presence:changed', updated);
    }

    // Record activity in feed
    if (payload.currentLocation?.activity) {
      const act = this.activityFeed.recordActivity({
        workspaceId: payload.workspaceId,
        actorName: payload.userName,
        actorAvatar: payload.avatarUrl,
        action: payload.currentLocation.prNumber
          ? 'REVIEWED_PR'
          : payload.currentLocation.documentId
            ? 'EDITED_DOC'
            : 'VIEWED_FILE',
        target: payload.currentLocation.file || `PR #${payload.currentLocation.prNumber}` || 'Platform',
        description: `${payload.userName} is ${payload.currentLocation.activity}`,
      });

      if (this.server) {
        this.server.to(`workspace:${payload.workspaceId}`).emit('activity:item', act);
      }
    }

    return updated;
  }

  /**
   * Client heartbeat
   */
  @SubscribeMessage('presence:heartbeat')
  handleHeartbeat(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { userId: string; workspaceId: string },
  ) {
    return this.presenceService.heartbeat(payload.userId, payload.workspaceId);
  }

  /**
   * Client starts/stops typing indicator
   */
  @SubscribeMessage('typing:indicator')
  handleTypingIndicator(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: TypingIndicator & { workspaceId: string },
  ) {
    if (this.server) {
      client.to(`workspace:${payload.workspaceId}`).emit('typing:changed', payload);
      if (payload.targetId) {
        client.to(`doc:${payload.targetId}`).emit('typing:changed', payload);
      }
    }
  }

  /**
   * Client joins a specific document editing session
   */
  @SubscribeMessage('doc:join')
  handleDocJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { documentId: string; workspaceId: string; user: any },
  ) {
    const room = `doc:${payload.documentId}`;
    client.join(room);

    const session = this.socketSessions.get(client.id);
    if (session) {
      session.documentId = payload.documentId;
    }

    const doc = this.documentsService.getDocumentById(payload.documentId);
    const comments = this.documentsService.getDocumentComments(payload.documentId);
    const snapshots = this.documentsService.getDocumentSnapshots(payload.documentId);

    // Update location to viewing this doc
    this.presenceService.updatePresence({
      userId: payload.user.id,
      userName: payload.user.name,
      workspaceId: payload.workspaceId,
      currentLocation: {
        documentId: payload.documentId,
        activity: `Editing ${doc.title}`,
      },
    });

    client.emit('doc:state', { doc, comments, snapshots });
    this.logger.debug(`User ${payload.user.name} joined document room: ${room}`);
  }

  /**
   * Client leaves document session
   */
  @SubscribeMessage('doc:leave')
  handleDocLeave(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { documentId: string },
  ) {
    client.leave(`doc:${payload.documentId}`);
  }

  /**
   * Client broadcasts an operational edit (CRDT Transformation)
   */
  @SubscribeMessage('doc:op')
  handleDocOperation(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { documentId: string; operation: DocOperation },
  ) {
    const updatedDoc = this.documentsService.updateDocument(payload.documentId, {
      operation: payload.operation,
    });

    if (this.server) {
      // Broadcast operation to other peers in document room
      client.to(`doc:${payload.documentId}`).emit('doc:op_applied', {
        documentId: payload.documentId,
        operation: payload.operation,
        doc: updatedDoc,
      });
    }

    return updatedDoc;
  }

  /**
   * Client broadcasts cursor / selection position
   */
  @SubscribeMessage('doc:cursor')
  handleDocCursor(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: {
      documentId: string;
      userId: string;
      userName: string;
      cursor: { line: number; ch: number; selection?: string };
    },
  ) {
    if (this.server) {
      client.to(`doc:${payload.documentId}`).emit('doc:cursor_moved', payload);
    }
  }

  /**
   * Client posts a comment on a document
   */
  @SubscribeMessage('comment:post')
  handlePostComment(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: {
      request: PostCommentRequest;
      user: { id: string; email: string; name?: string; avatarUrl?: string };
      workspaceId: string;
    },
  ) {
    const result = this.documentsService.postComment(payload.request, payload.user);

    if (this.server) {
      // Broadcast comment to document room
      this.server
        .to(`doc:${payload.request.documentId}`)
        .emit('comment:added', result.comment);

      // Broadcast notifications to workspace room
      for (const notif of result.generatedNotifications) {
        this.server
          .to(`workspace:${payload.workspaceId}`)
          .emit('notification:new', notif);
      }
    }

    return result;
  }
}

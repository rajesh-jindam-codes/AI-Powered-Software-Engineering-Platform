import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { DocumentsService } from './documents.service';
import { PresenceService } from './presence.service';
import { ActivityFeedService } from './activity-feed.service';
import {
  CollaborativeDoc,
  DocumentVersionSnapshot,
  DocumentComment,
  RealtimeNotification,
  UserPresence,
  ActivityFeedItem,
  CreateDocumentRequest,
  UpdateDocumentRequest,
  PostCommentRequest,
} from '@devflow/shared-types';

@UseGuards(JwtAuthGuard)
@Controller('collaboration')
export class DocumentsController {
  constructor(
    private readonly documentsService: DocumentsService,
    private readonly presenceService: PresenceService,
    private readonly activityFeed: ActivityFeedService,
  ) {}

  @Get('documents')
  listDocuments(@Query('workspaceId') workspaceId?: string): CollaborativeDoc[] {
    return this.documentsService.listDocuments(workspaceId);
  }

  @Post('documents')
  @HttpCode(HttpStatus.CREATED)
  createDocument(
    @Body() request: CreateDocumentRequest,
    @Request() req: any,
  ): CollaborativeDoc {
    return this.documentsService.createDocument(request, req.user);
  }

  @Get('documents/:id')
  getDocumentById(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId?: string,
  ): CollaborativeDoc {
    return this.documentsService.getDocumentById(id, workspaceId);
  }

  @Put('documents/:id')
  updateDocument(
    @Param('id') id: string,
    @Body() request: UpdateDocumentRequest,
    @Request() req: any,
  ): CollaborativeDoc {
    return this.documentsService.updateDocument(id, request, req.user);
  }

  @Get('documents/:id/snapshots')
  getDocumentSnapshots(@Param('id') id: string): DocumentVersionSnapshot[] {
    return this.documentsService.getDocumentSnapshots(id);
  }

  @Get('documents/:id/comments')
  getDocumentComments(@Param('id') id: string): DocumentComment[] {
    return this.documentsService.getDocumentComments(id);
  }

  @Post('documents/:id/comments')
  @HttpCode(HttpStatus.CREATED)
  postComment(
    @Param('id') id: string,
    @Body() request: Omit<PostCommentRequest, 'documentId'>,
    @Request() req: any,
  ) {
    return this.documentsService.postComment(
      { documentId: id, content: request.content },
      req.user,
    );
  }

  @Get('presence')
  getWorkspacePresence(@Query('workspaceId') workspaceId?: string): UserPresence[] {
    return this.presenceService.getWorkspacePresence(workspaceId || 'ws_devflow_primary');
  }

  @Get('activity')
  getActivityFeed(
    @Query('workspaceId') workspaceId?: string,
    @Query('limit') limit?: number,
  ): ActivityFeedItem[] {
    return this.activityFeed.getActivityFeed(
      workspaceId || 'ws_devflow_primary',
      limit ? Number(limit) : 30,
    );
  }

  @Get('notifications')
  getNotifications(@Query('workspaceId') workspaceId?: string): RealtimeNotification[] {
    return this.documentsService.getNotifications(workspaceId || 'ws_devflow_primary');
  }
}

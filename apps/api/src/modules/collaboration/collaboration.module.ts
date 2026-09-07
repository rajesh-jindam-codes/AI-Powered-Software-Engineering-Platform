import { Module } from '@nestjs/common';
import { PresenceService } from './presence.service';
import { CrdtSyncService } from './crdt-sync.service';
import { DocumentsService } from './documents.service';
import { ActivityFeedService } from './activity-feed.service';
import { CollaborationGateway } from './collaboration.gateway';
import { DocumentsController } from './documents.controller';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [DocumentsController],
  providers: [
    PresenceService,
    CrdtSyncService,
    DocumentsService,
    ActivityFeedService,
    CollaborationGateway,
  ],
  exports: [
    PresenceService,
    CrdtSyncService,
    DocumentsService,
    ActivityFeedService,
    CollaborationGateway,
  ],
})
export class CollaborationModule {}

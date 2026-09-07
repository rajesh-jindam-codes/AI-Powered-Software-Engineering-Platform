import { Module } from '@nestjs/common';
import { WorkspacesController } from './workspaces.controller';
import { WorkspaceService } from './workspace.service';
import { WorkspaceRepository } from './workspace.repository';
import { WorkspaceMemberGuard } from './guards/workspace-member.guard';
import { WorkspaceRolesGuard } from './guards/workspace-roles.guard';

@Module({
  controllers: [WorkspacesController],
  providers: [
    WorkspaceService,
    WorkspaceRepository,
    WorkspaceMemberGuard,
    WorkspaceRolesGuard,
  ],
  exports: [WorkspaceService, WorkspaceRepository, WorkspaceMemberGuard, WorkspaceRolesGuard],
})
export class WorkspacesModule {}

import { Injectable, CanActivate, ExecutionContext, ForbiddenException, NotFoundException } from '@nestjs/common';
import { WorkspaceRepository } from '../workspace.repository';
import { User } from '@devflow/shared-types';

@Injectable()
export class WorkspaceMemberGuard implements CanActivate {
  constructor(private readonly workspaceRepository: WorkspaceRepository) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user as User | undefined;

    if (!user) {
      throw new ForbiddenException('User context is missing');
    }

    const workspaceId = request.params.id || request.params.workspaceId;

    if (!workspaceId) {
      return true;
    }

    const workspace = await this.workspaceRepository.findById(workspaceId);
    if (!workspace) {
      throw new NotFoundException(`Workspace with ID '${workspaceId}' not found`);
    }

    // Owner is always an active member
    if (workspace.ownerId === user.id) {
      request.workspaceRole = 'ADMIN';
      return true;
    }

    const member = await this.workspaceRepository.findMember(workspaceId, user.id);
    if (!member) {
      throw new ForbiddenException(
        `Access denied. You are not an active member of workspace '${workspace.name}'.`,
      );
    }

    request.workspaceRole = member.role;
    return true;
  }
}

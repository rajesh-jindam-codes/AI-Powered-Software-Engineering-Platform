import { SetMetadata, CustomDecorator } from '@nestjs/common';
import { UserRole } from '@devflow/shared-types';

export const WORKSPACE_ROLES_KEY = 'workspaceRoles';
export const WorkspaceRoles = (...roles: UserRole[]): CustomDecorator<string> =>
  SetMetadata(WORKSPACE_ROLES_KEY, roles);

import { SetMetadata, CustomDecorator } from '@nestjs/common';
import { Permission } from '@devflow/shared-types';

export const PERMISSIONS_KEY = 'permissions';
export const RequirePermissions = (...permissions: Permission[]): CustomDecorator<string> =>
  SetMetadata(PERMISSIONS_KEY, permissions);

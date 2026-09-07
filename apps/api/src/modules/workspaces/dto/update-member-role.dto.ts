import { IsNotEmpty, IsIn, IsString } from 'class-validator';
import { UserRole } from '@devflow/shared-types';

export class UpdateMemberRoleDto {
  @IsIn(['ADMIN', 'DEVELOPER', 'REVIEWER', 'VIEWER'], {
    message: 'Role must be one of ADMIN, DEVELOPER, REVIEWER, VIEWER',
  })
  @IsNotEmpty({ message: 'Role is required' })
  role!: UserRole;
}

export class AcceptInvitationDto {
  @IsString({ message: 'Token must be a string' })
  @IsNotEmpty({ message: 'Invitation token is required' })
  token!: string;
}

import { IsEmail, IsNotEmpty, IsIn } from 'class-validator';
import { UserRole } from '@devflow/shared-types';

export class InviteMemberDto {
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email!: string;

  @IsIn(['ADMIN', 'DEVELOPER', 'REVIEWER', 'VIEWER'], {
    message: 'Role must be one of ADMIN, DEVELOPER, REVIEWER, VIEWER',
  })
  @IsNotEmpty({ message: 'Role is required' })
  role!: UserRole;
}

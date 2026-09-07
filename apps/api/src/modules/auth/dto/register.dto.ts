import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength, IsIn } from 'class-validator';
import { UserRole } from '@devflow/shared-types';

export class RegisterDto {
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email!: string;

  @IsString({ message: 'Password must be a string' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password!: string;

  @IsString({ message: 'Name must be a string' })
  @IsNotEmpty({ message: 'Full name is required' })
  name!: string;

  @IsOptional()
  @IsIn(['ADMIN', 'DEVELOPER', 'REVIEWER', 'VIEWER'], {
    message: 'Role must be one of ADMIN, DEVELOPER, REVIEWER, VIEWER',
  })
  role?: UserRole;
}

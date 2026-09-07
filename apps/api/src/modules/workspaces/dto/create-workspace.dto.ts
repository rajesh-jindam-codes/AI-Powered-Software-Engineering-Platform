import { IsNotEmpty, IsOptional, IsString, MinLength, MaxLength, Matches, IsObject } from 'class-validator';
import { Workspace } from '@devflow/shared-types';

export class CreateWorkspaceDto {
  @IsString({ message: 'Workspace name must be a string' })
  @IsNotEmpty({ message: 'Workspace name is required' })
  @MinLength(2, { message: 'Workspace name must be at least 2 characters long' })
  @MaxLength(50, { message: 'Workspace name cannot exceed 50 characters' })
  name!: string;

  @IsOptional()
  @IsString({ message: 'Slug must be a string' })
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Slug must contain only lowercase letters, numbers, and hyphens',
  })
  slug?: string;

  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  @MaxLength(255, { message: 'Description cannot exceed 255 characters' })
  description?: string;

  @IsOptional()
  @IsString({ message: 'Avatar URL must be a string' })
  avatarUrl?: string;

  @IsOptional()
  @IsObject({ message: 'Settings must be an object' })
  settings?: Workspace['settings'];
}

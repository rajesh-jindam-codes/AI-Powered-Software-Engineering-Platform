import {
  IsNotEmpty,
  IsString,
  IsBoolean,
  IsOptional,
  IsNumber,
  IsObject,
} from 'class-validator';

export class ConnectRepositoryDto {
  @IsNotEmpty()
  @IsString()
  githubRepoId!: string;

  @IsNotEmpty()
  @IsString()
  fullName!: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  owner?: string;

  @IsOptional()
  @IsString()
  defaultBranch?: string;

  @IsNotEmpty()
  @IsString()
  cloneUrl!: string;

  @IsOptional()
  @IsString()
  htmlUrl?: string;

  @IsOptional()
  @IsBoolean()
  isPrivate?: boolean;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsNumber()
  starsCount?: number;

  @IsOptional()
  @IsNumber()
  forksCount?: number;

  @IsOptional()
  @IsNumber()
  openIssuesCount?: number;

  @IsOptional()
  @IsObject()
  githubMetadata?: Record<string, unknown>;
}

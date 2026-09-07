import { IsNotEmpty, IsString } from 'class-validator';

export class OAuthCallbackDto {
  @IsNotEmpty()
  @IsString()
  code!: string;

  @IsNotEmpty()
  @IsString()
  state!: string;

  @IsNotEmpty()
  @IsString()
  workspaceId!: string;
}

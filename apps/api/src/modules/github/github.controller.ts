import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { GitHubService } from './github.service';
import { ConnectRepositoryDto } from './dto/connect-repository.dto';
import { OAuthCallbackDto } from './dto/oauth-callback.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { GitHubWebhookGuard } from './guards/github-webhook.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import {
  User,
  Repository,
  GitHubInstallation,
  GitHubRepository as RemoteGitHubRepo,
  WebhookDeliveryRecord,
  GitHubWebhookPayload,
} from '@devflow/shared-types';

@Controller('github')
export class GitHubController {
  constructor(private readonly githubService: GitHubService) {}

  @Get('auth-url')
  @UseGuards(JwtAuthGuard)
  getAuthUrl(
    @Query('workspaceId') workspaceId: string,
    @CurrentUser() user: User,
  ): { authUrl: string; state: string } {
    return this.githubService.getOAuthUrl(workspaceId, user.id);
  }

  @Post('callback')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async handleCallback(
    @Body() dto: OAuthCallbackDto,
    @CurrentUser() user: User,
  ): Promise<GitHubInstallation> {
    return this.githubService.handleOAuthCallback(
      dto.code,
      dto.state,
      dto.workspaceId,
      user,
    );
  }

  @Get('workspaces/:workspaceId/status')
  @UseGuards(JwtAuthGuard)
  async getStatus(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser() user: User,
  ): Promise<{ connected: boolean; installation: GitHubInstallation | null }> {
    const installation = await this.githubService.getInstallation(workspaceId, user.id);
    return {
      connected: !!installation,
      installation,
    };
  }

  @Get('workspaces/:workspaceId/available-repositories')
  @UseGuards(JwtAuthGuard)
  async listAvailableRepositories(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser() user: User,
  ): Promise<RemoteGitHubRepo[]> {
    return this.githubService.listAvailableRepositories(workspaceId, user.id);
  }

  @Get('workspaces/:workspaceId/repositories')
  @UseGuards(JwtAuthGuard)
  async listWorkspaceRepositories(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser() user: User,
  ): Promise<Repository[]> {
    return this.githubService.listWorkspaceRepositories(workspaceId, user.id);
  }

  @Post('workspaces/:workspaceId/repositories/connect')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async connectRepository(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser() user: User,
    @Body() dto: ConnectRepositoryDto,
  ): Promise<Repository> {
    return this.githubService.connectRepository(workspaceId, user.id, dto, user);
  }

  @Delete('workspaces/:workspaceId/repositories/:repoId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async disconnectRepository(
    @Param('workspaceId') workspaceId: string,
    @Param('repoId') repoId: string,
    @CurrentUser() user: User,
  ): Promise<{ message: string }> {
    return this.githubService.disconnectRepository(workspaceId, repoId, user.id);
  }

  @Get('repositories/:id')
  @UseGuards(JwtAuthGuard)
  async getRepositoryDetails(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ): Promise<{ repository: Repository; recentDeliveries: WebhookDeliveryRecord[] }> {
    return this.githubService.getRepositoryDetails(id, user.id);
  }

  @Public()
  @Post('webhooks')
  @UseGuards(GitHubWebhookGuard)
  @HttpCode(HttpStatus.ACCEPTED)
  async handleWebhook(
    @Headers('x-github-delivery') deliveryId: string,
    @Headers('x-github-event') eventType: string,
    @Headers('x-hub-signature-256') signature: string,
    @Body() payload: GitHubWebhookPayload,
  ): Promise<WebhookDeliveryRecord> {
    return this.githubService.processWebhook(
      deliveryId,
      eventType || 'push',
      signature,
      payload,
    );
  }
}

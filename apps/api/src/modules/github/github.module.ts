import { Module } from '@nestjs/common';
import { GitHubController } from './github.controller';
import { GitHubService } from './github.service';
import { GitHubRepository } from './github.repository';
import { TokenEncryptionService } from './crypto/token-encryption.service';
import { GitHubWebhookGuard } from './guards/github-webhook.guard';
import { WorkspacesModule } from '../workspaces/workspaces.module';

@Module({
  imports: [WorkspacesModule],
  controllers: [GitHubController],
  providers: [
    GitHubService,
    GitHubRepository,
    TokenEncryptionService,
    GitHubWebhookGuard,
  ],
  exports: [GitHubService, GitHubRepository, TokenEncryptionService],
})
export class GitHubModule {}

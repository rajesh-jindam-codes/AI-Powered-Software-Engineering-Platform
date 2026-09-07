import { Module } from '@nestjs/common';
import { ReviewAnalyzerService } from './review-analyzer.service';
import { TestSynthesizerService } from './test-synthesizer.service';
import { ReviewsService } from './reviews.service';
import { ReviewsController } from './reviews.controller';
import { AgentsModule } from '../agents/agents.module';
import { AuditModule } from '../audit/audit.module';
import { GitHubModule } from '../github/github.module';

@Module({
  imports: [AgentsModule, AuditModule, GitHubModule],
  controllers: [ReviewsController],
  providers: [ReviewAnalyzerService, TestSynthesizerService, ReviewsService],
  exports: [ReviewsService, ReviewAnalyzerService, TestSynthesizerService],
})
export class ReviewsModule {}

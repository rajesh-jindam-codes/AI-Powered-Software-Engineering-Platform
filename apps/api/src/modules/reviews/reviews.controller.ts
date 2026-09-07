import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ReviewsService } from './reviews.service';
import {
  CodeReviewReport,
  TriggerReviewRequest,
  SynthesizeTestsRequest,
  ApplyReviewSuggestionRequest,
  ReviewMetricsResponse,
  SynthesizedTestSuite,
  PublishGitHubCommentsRequest,
  PublishGitHubCommentsResponse,
  PrDashboardData,
} from '@devflow/shared-types';

@UseGuards(JwtAuthGuard)
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post('trigger')
  @HttpCode(HttpStatus.OK)
  async triggerReview(
    @Body() request: TriggerReviewRequest,
    @Request() req: any,
  ): Promise<CodeReviewReport> {
    return this.reviewsService.triggerReview(request, req.user);
  }

  @Get()
  async listReviews(
    @Query('repositoryId') repositoryId?: string,
    @Query('workspaceId') workspaceId?: string,
    @Query('search') search?: string,
  ): Promise<CodeReviewReport[]> {
    return this.reviewsService.listReviews({ repositoryId, workspaceId, search });
  }

  @Get('metrics/summary')
  async getMetricsSummary(): Promise<ReviewMetricsResponse> {
    return this.reviewsService.getMetricsSummary();
  }

  @Get(':id')
  async getReviewById(@Param('id') id: string): Promise<CodeReviewReport> {
    return this.reviewsService.getReviewById(id);
  }

  @Get(':id/dashboard')
  async getPrDashboardData(@Param('id') id: string): Promise<PrDashboardData> {
    return this.reviewsService.getPrDashboardData(id);
  }

  @Post(':id/synthesize-tests')
  @HttpCode(HttpStatus.OK)
  async synthesizeTests(
    @Param('id') id: string,
    @Body() request: SynthesizeTestsRequest,
    @Request() req: any,
  ): Promise<SynthesizedTestSuite> {
    return this.reviewsService.synthesizeTests(request, req.user);
  }

  @Post(':id/apply-suggestion')
  @HttpCode(HttpStatus.OK)
  async applySuggestion(
    @Param('id') id: string,
    @Body() request: ApplyReviewSuggestionRequest,
    @Request() req: any,
  ): Promise<{ success: boolean; findingId: string; message: string }> {
    return this.reviewsService.applySuggestion(id, request, req.user);
  }

  @Post(':id/publish-github')
  @HttpCode(HttpStatus.OK)
  async publishReviewToGitHub(
    @Param('id') id: string,
    @Body() request: PublishGitHubCommentsRequest,
    @Request() req: any,
  ): Promise<PublishGitHubCommentsResponse> {
    return this.reviewsService.publishReviewToGitHub(id, request, req.user);
  }
}

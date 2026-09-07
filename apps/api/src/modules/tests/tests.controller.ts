import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import {
  TestGenerationService,
  BenchmarkPreset,
} from './test-generation.service';
import {
  GenerateTestsRequest,
  RunGeneratedTestsRequest,
  ApplyTestFixRequest,
  GeneratedTestSuiteResult,
} from '@devflow/shared-types';

@UseGuards(JwtAuthGuard)
@Controller('tests')
export class TestsController {
  constructor(private readonly testService: TestGenerationService) {}

  @Get('benchmarks')
  getBenchmarks(): BenchmarkPreset[] {
    return this.testService.getBenchmarkPresets();
  }

  @Post('generate')
  @HttpCode(HttpStatus.OK)
  async generateTests(
    @Body() request: GenerateTestsRequest,
    @Request() req: any,
  ): Promise<GeneratedTestSuiteResult> {
    return this.testService.generateTests(request, req.user);
  }

  @Post('run')
  @HttpCode(HttpStatus.OK)
  async runGeneratedTests(
    @Body() request: RunGeneratedTestsRequest,
    @Request() req: any,
  ): Promise<GeneratedTestSuiteResult> {
    return this.testService.runGeneratedTests(request, req.user);
  }

  @Get('suites/:id')
  async getSuiteById(@Param('id') id: string): Promise<GeneratedTestSuiteResult> {
    return this.testService.getSuiteById(id);
  }

  @Post('apply-fix')
  @HttpCode(HttpStatus.OK)
  async applyTestFix(
    @Body() request: ApplyTestFixRequest,
    @Request() req: any,
  ): Promise<GeneratedTestSuiteResult> {
    return this.testService.applyTestFix(request, req.user);
  }
}

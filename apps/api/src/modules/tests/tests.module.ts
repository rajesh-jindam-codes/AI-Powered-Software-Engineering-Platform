import { Module } from '@nestjs/common';
import { TestsController } from './tests.controller';
import { TestAnalyzerService } from './test-analyzer.service';
import { TestGeneratorService } from './test-generator.service';
import { SandboxedTestRunnerService } from './sandboxed-test-runner.service';
import { TestSelfHealingService } from './test-self-healing.service';
import { TestGenerationService } from './test-generation.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [TestsController],
  providers: [
    TestAnalyzerService,
    TestGeneratorService,
    SandboxedTestRunnerService,
    TestSelfHealingService,
    TestGenerationService,
  ],
  exports: [
    TestAnalyzerService,
    TestGeneratorService,
    SandboxedTestRunnerService,
    TestSelfHealingService,
    TestGenerationService,
  ],
})
export class TestsModule {}

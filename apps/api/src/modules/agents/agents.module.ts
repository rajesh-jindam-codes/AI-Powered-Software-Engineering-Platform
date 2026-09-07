import { Module } from '@nestjs/common';
import { IntelligenceModule } from '../intelligence/intelligence.module';
import { AuditModule } from '../audit/audit.module';
import { VirtualSandboxService } from './sandbox/virtual-sandbox.service';
import { ToolRegistryService } from './tools/tool-registry.service';
import { AgentGuardrailsService } from './safety/agent-guardrails.service';
import { AgentOrchestratorService } from './agent-orchestrator.service';
import { AgentsController } from './agents.controller';

@Module({
  imports: [IntelligenceModule, AuditModule],
  controllers: [AgentsController],
  providers: [
    VirtualSandboxService,
    ToolRegistryService,
    AgentGuardrailsService,
    AgentOrchestratorService,
  ],
  exports: [
    AgentOrchestratorService,
    ToolRegistryService,
    VirtualSandboxService,
    AgentGuardrailsService,
  ],
})
export class AgentsModule {}

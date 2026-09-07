import {
  Injectable,
  Logger,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import {
  AgentType,
  AgentToolName,
  Permission,
  ROLE_PERMISSIONS,
  UserRole,
} from '@devflow/shared-types';
import { AuditService } from '../../audit/audit.service';

export interface AgentExecutionContext {
  workspaceId: string;
  repositoryId: string;
  userId?: string;
  userRole?: UserRole;
  agentType: AgentType;
  maxIterations: number;
  currentIteration: number;
  timeoutSeconds: number;
  startedAt: number;
}

@Injectable()
export class AgentGuardrailsService {
  private readonly logger = new Logger(AgentGuardrailsService.name);

  // Maximum hard boundaries
  private readonly ABSOLUTE_MAX_ITERATIONS = 20;
  private readonly DEFAULT_MAX_ITERATIONS = 10;
  private readonly ABSOLUTE_MAX_TIMEOUT_SECONDS = 300; // 5 mins
  private readonly DEFAULT_TIMEOUT_SECONDS = 60; // 1 min
  private readonly MAX_TOOL_TIMEOUT_MS = 15000; // 15s

  constructor(private readonly auditService: AuditService) {}

  /**
   * Validate initial agent dispatch request and permissions
   */
  validateDispatchRequest(
    workspaceId: string,
    repositoryId: string,
    userRole: UserRole = 'DEVELOPER',
    maxIterations?: number,
    timeoutSeconds?: number,
  ): { safeMaxIterations: number; safeTimeoutSeconds: number } {
    // 1. Permission Check: Verify user role can dispatch agents
    const userPermissions = ROLE_PERMISSIONS[userRole] || [];
    if (!userPermissions.includes(Permission.AGENT_DISPATCH)) {
      this.logger.warn(`Permission Denied: User role ${userRole} attempted to dispatch AI Agent`);
      throw new ForbiddenException(
        `Permission Denied: Role '${userRole}' does not have AGENT_DISPATCH permission.`,
      );
    }

    // 2. Bound maximum iterations
    const safeMaxIterations = Math.min(
      this.ABSOLUTE_MAX_ITERATIONS,
      Math.max(1, maxIterations || this.DEFAULT_MAX_ITERATIONS),
    );

    // 3. Bound timeout
    const safeTimeoutSeconds = Math.min(
      this.ABSOLUTE_MAX_TIMEOUT_SECONDS,
      Math.max(5, timeoutSeconds || this.DEFAULT_TIMEOUT_SECONDS),
    );

    this.logger.log(
      `Guardrails validated for dispatch in workspace ${workspaceId} (Iterations: ${safeMaxIterations}, Timeout: ${safeTimeoutSeconds}s)`,
    );

    return { safeMaxIterations, safeTimeoutSeconds };
  }

  /**
   * Check before each step that limits (iterations, timeouts) are not exceeded
   */
  checkStepExecution(context: AgentExecutionContext): void {
    // 1. Check iteration count
    if (context.currentIteration > context.maxIterations) {
      throw new BadRequestException(
        `Safety limit reached: Agent reached maximum allowed iterations (${context.maxIterations}). Execution stopped.`,
      );
    }

    // 2. Check total elapsed time
    const elapsedSeconds = (Date.now() - context.startedAt) / 1000;
    if (elapsedSeconds > context.timeoutSeconds) {
      throw new BadRequestException(
        `Safety timeout: Agent exceeded maximum execution time (${context.timeoutSeconds}s). Elapsed: ${elapsedSeconds.toFixed(1)}s.`,
      );
    }
  }

  /**
   * Validate tool execution permissions and inputs
   */
  validateToolExecution(
    toolName: AgentToolName,
    args: Record<string, any>,
    userRole: UserRole = 'DEVELOPER',
  ): void {
    const userPermissions = ROLE_PERMISSIONS[userRole] || [];

    // Write operations require REPO_WRITE
    if (
      (toolName === 'create_patch' || toolName === 'create_branch' || toolName === 'create_pull_request') &&
      !userPermissions.includes(Permission.REPO_WRITE)
    ) {
      throw new ForbiddenException(
        `Permission Denied: Tool '${toolName}' requires REPO_WRITE permission.`,
      );
    }

    // Test operations require TEST_GENERATE
    if (toolName === 'run_tests' && !userPermissions.includes(Permission.TEST_GENERATE)) {
      throw new ForbiddenException(
        `Permission Denied: Tool '${toolName}' requires TEST_GENERATE permission.`,
      );
    }

    // Verify no arbitrary shell parameters in non-code fields
    for (const [key, value] of Object.entries(args)) {
      if (typeof value === 'string' && key !== 'originalCode' && key !== 'replacementCode' && key !== 'explanation') {
        if (
          value.includes('; rm') ||
          value.includes('&& rm') ||
          value.includes('| bash') ||
          value.includes('| sh') ||
          value.includes('/dev/tcp')
        ) {
          throw new ForbiddenException(`Command injection detected in argument '${key}'. Execution aborted.`);
        }
      }
    }
  }

  /**
   * Record structured audit trail for each tool execution
   */
  async logToolAudit(
    context: AgentExecutionContext,
    toolName: AgentToolName,
    args: Record<string, any>,
    status: 'SUCCESS' | 'FAILURE' | 'DENIED',
    durationMs: number,
  ): Promise<void> {
    try {
      this.auditService.record({
        userId: context.userId || 'system-agent',
        action: `AGENT_TOOL_${toolName.toUpperCase()}`,
        resource: `workspace:${context.workspaceId}/repo:${context.repositoryId}`,
        status,
        details: {
          agentType: context.agentType,
          iteration: context.currentIteration,
          toolName,
          durationMs,
          arguments: args,
        },
      });
    } catch (err: any) {
      this.logger.error(`Failed to record audit log: ${err.message}`);
    }
  }
}

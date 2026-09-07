import {
  Controller,
  Get,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuditService } from './audit.service';
import {
  AuditLogEntry,
  AuditLogQueryFilter,
  AuditLogStatsResponse,
} from '@devflow/shared-types';

@UseGuards(JwtAuthGuard)
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('logs')
  getLogs(@Query() filter: AuditLogQueryFilter): AuditLogEntry[] {
    return this.auditService.getFilteredLogs(filter);
  }

  @Get('stats')
  getStats(): AuditLogStatsResponse {
    return this.auditService.getAuditStats();
  }

  @Get('user/me')
  getMyLogs(@Request() req: any): AuditLogEntry[] {
    return this.auditService.getLogsForUser(req.user?.id || 'usr_rajesh_01');
  }
}

import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Req,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { AuditService } from '../audit/audit.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuthResponse, AuthTokens, User, AuditLogEntry } from '@devflow/shared-types';

@Controller('auth')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly auditService: AuditService,
  ) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterDto, @Req() req: Request): Promise<AuthResponse> {
    const ipAddress = req.ip || req.socket.remoteAddress;
    return this.authService.register(dto, ipAddress);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Req() req: Request): Promise<AuthResponse> {
    const ipAddress = req.ip || req.socket.remoteAddress;
    return this.authService.login(dto, ipAddress);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() dto: RefreshTokenDto, @Req() req: Request): Promise<AuthTokens> {
    const ipAddress = req.ip || req.socket.remoteAddress;
    return this.authService.refresh(dto.refreshToken, ipAddress);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Body() dto: Partial<RefreshTokenDto>,
    @CurrentUser('id') userId: string,
    @Req() req: Request,
  ): Promise<{ message: string }> {
    const ipAddress = req.ip || req.socket.remoteAddress;
    await this.authService.logout(dto.refreshToken, userId, ipAddress);
    return { message: 'Logged out successfully' };
  }

  @Get('me')
  @HttpCode(HttpStatus.OK)
  async getMe(@CurrentUser() user: User): Promise<User> {
    return user;
  }

  @Patch('profile')
  @HttpCode(HttpStatus.OK)
  async updateProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateProfileDto,
    @Req() req: Request,
  ): Promise<User> {
    const ipAddress = req.ip || req.socket.remoteAddress;
    return this.authService.updateProfile(userId, dto, ipAddress);
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @CurrentUser('id') userId: string,
    @Body() dto: ChangePasswordDto,
    @Req() req: Request,
  ): Promise<{ message: string }> {
    const ipAddress = req.ip || req.socket.remoteAddress;
    return this.authService.changePassword(userId, dto, ipAddress);
  }

  // ==========================================
  // RBAC Demonstration & Verification Endpoints
  // ==========================================

  @Get('rbac/admin-only')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  adminOnlyEndpoint(@CurrentUser() user: User): {
    message: string;
    accessedBy: string;
    role: string;
  } {
    return {
      message: 'Access granted to ADMIN resource',
      accessedBy: user.email,
      role: user.role,
    };
  }

  @Get('rbac/developer-only')
  @Roles('ADMIN', 'DEVELOPER')
  @HttpCode(HttpStatus.OK)
  developerEndpoint(@CurrentUser() user: User): {
    message: string;
    accessedBy: string;
    role: string;
  } {
    return {
      message: 'Access granted to DEVELOPER resource',
      accessedBy: user.email,
      role: user.role,
    };
  }

  @Get('rbac/reviewer-only')
  @Roles('ADMIN', 'REVIEWER')
  @HttpCode(HttpStatus.OK)
  reviewerEndpoint(@CurrentUser() user: User): {
    message: string;
    accessedBy: string;
    role: string;
  } {
    return {
      message: 'Access granted to REVIEWER resource',
      accessedBy: user.email,
      role: user.role,
    };
  }

  @Get('rbac/viewer-allowed')
  @Roles('ADMIN', 'DEVELOPER', 'REVIEWER', 'VIEWER')
  @HttpCode(HttpStatus.OK)
  viewerEndpoint(@CurrentUser() user: User): {
    message: string;
    accessedBy: string;
    role: string;
  } {
    return {
      message: 'Access granted to read-only VIEWER resource',
      accessedBy: user.email,
      role: user.role,
    };
  }

  @Get('rbac/audit-logs')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  getAuditLogs(): AuditLogEntry[] {
    return this.auditService.getLogs(50);
  }
}

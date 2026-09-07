import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserRepository } from './user.repository';
import { AuditService } from '../audit/audit.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { AuthResponse, AuthTokens, JwtPayload, User } from '@devflow/shared-types';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
  ) {}

  async register(dto: RegisterDto, ipAddress?: string): Promise<AuthResponse> {
    const existing = await this.userRepository.findByEmail(dto.email);
    if (existing) {
      this.auditService.record({
        userEmail: dto.email,
        action: 'USER_REGISTER_ATTEMPT_DUPLICATE',
        resource: 'auth/register',
        status: 'FAILURE',
        ipAddress,
        details: { email: dto.email },
      });
      throw new ConflictException(`User with email '${dto.email}' already exists`);
    }

    const user = await this.userRepository.create(dto);
    const tokens = await this.generateTokens(user);

    this.auditService.record({
      userId: user.id,
      userEmail: user.email,
      action: 'USER_REGISTERED',
      resource: 'auth/register',
      status: 'SUCCESS',
      ipAddress,
      details: { role: user.role },
    });

    return { user, tokens };
  }

  async login(dto: LoginDto, ipAddress?: string): Promise<AuthResponse> {
    const userWithPassword = await this.userRepository.findByEmail(dto.email);

    if (!userWithPassword) {
      this.auditService.record({
        userEmail: dto.email,
        action: 'LOGIN_FAILED_USER_NOT_FOUND',
        resource: 'auth/login',
        status: 'FAILURE',
        ipAddress,
      });
      throw new UnauthorizedException('Invalid email or password');
    }

    if (userWithPassword.status === 'SUSPENDED') {
      this.auditService.record({
        userId: userWithPassword.id,
        userEmail: userWithPassword.email,
        action: 'LOGIN_FAILED_USER_SUSPENDED',
        resource: 'auth/login',
        status: 'DENIED',
        ipAddress,
      });
      throw new ForbiddenException('User account has been suspended. Please contact admin.');
    }

    const passwordValid = await this.userRepository.comparePassword(
      dto.password,
      userWithPassword.passwordHash,
    );

    if (!passwordValid) {
      this.auditService.record({
        userId: userWithPassword.id,
        userEmail: userWithPassword.email,
        action: 'LOGIN_FAILED_INVALID_PASSWORD',
        resource: 'auth/login',
        status: 'FAILURE',
        ipAddress,
      });
      throw new UnauthorizedException('Invalid email or password');
    }

    const user = this.userRepository.sanitizeUser(userWithPassword);
    const tokens = await this.generateTokens(user);

    this.auditService.record({
      userId: user.id,
      userEmail: user.email,
      action: 'LOGIN_SUCCESS',
      resource: 'auth/login',
      status: 'SUCCESS',
      ipAddress,
    });

    return { user, tokens };
  }

  async refresh(refreshToken: string, ipAddress?: string): Promise<AuthTokens> {
    let payload: JwtPayload;
    try {
      const refreshSecret = this.configService.get<string>(
        'JWT_REFRESH_SECRET',
        'devflow-ultra-secure-jwt-refresh-secret-key-phase2-2026',
      );
      payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: refreshSecret,
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const storedUserId = this.userRepository.getUserIdByRefreshToken(refreshToken);
    if (!storedUserId || storedUserId !== payload.sub) {
      throw new UnauthorizedException('Refresh token has been revoked or is invalid');
    }

    const userWithPassword = await this.userRepository.findById(payload.sub);
    if (!userWithPassword || userWithPassword.status === 'SUSPENDED') {
      throw new UnauthorizedException('User account is invalid or suspended');
    }

    // Revoke old token (Rotation)
    this.userRepository.revokeRefreshToken(refreshToken);

    const user = this.userRepository.sanitizeUser(userWithPassword);
    const newTokens = await this.generateTokens(user);

    this.auditService.record({
      userId: user.id,
      userEmail: user.email,
      action: 'TOKEN_REFRESHED',
      resource: 'auth/refresh',
      status: 'SUCCESS',
      ipAddress,
    });

    return newTokens;
  }

  async logout(refreshToken?: string, userId?: string, ipAddress?: string): Promise<void> {
    if (refreshToken) {
      this.userRepository.revokeRefreshToken(refreshToken);
    }

    if (userId) {
      this.auditService.record({
        userId,
        action: 'LOGOUT',
        resource: 'auth/logout',
        status: 'SUCCESS',
        ipAddress,
      });
    }
  }

  async getProfile(userId: string): Promise<User> {
    const userWithPassword = await this.userRepository.findById(userId);
    if (!userWithPassword) {
      throw new NotFoundException('User profile not found');
    }
    return this.userRepository.sanitizeUser(userWithPassword);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto, ipAddress?: string): Promise<User> {
    const updatedUser = await this.userRepository.updateProfile(userId, dto);
    if (!updatedUser) {
      throw new NotFoundException('User profile not found');
    }

    this.auditService.record({
      userId,
      userEmail: updatedUser.email,
      action: 'PROFILE_UPDATED',
      resource: 'auth/profile',
      status: 'SUCCESS',
      ipAddress,
      details: { updatedFields: Object.keys(dto) },
    });

    return updatedUser;
  }

  async changePassword(
    userId: string,
    dto: ChangePasswordDto,
    ipAddress?: string,
  ): Promise<{ message: string }> {
    const userWithPassword = await this.userRepository.findById(userId);
    if (!userWithPassword) {
      throw new NotFoundException('User not found');
    }

    const currentValid = await this.userRepository.comparePassword(
      dto.currentPassword,
      userWithPassword.passwordHash,
    );

    if (!currentValid) {
      this.auditService.record({
        userId,
        userEmail: userWithPassword.email,
        action: 'PASSWORD_CHANGE_FAILED',
        resource: 'auth/change-password',
        status: 'FAILURE',
        ipAddress,
      });
      throw new BadRequestException('Current password is incorrect');
    }

    const newHash = await this.userRepository.hashPassword(dto.newPassword);
    await this.userRepository.updatePasswordHash(userId, newHash);

    this.auditService.record({
      userId,
      userEmail: userWithPassword.email,
      action: 'PASSWORD_CHANGED',
      resource: 'auth/change-password',
      status: 'SUCCESS',
      ipAddress,
    });

    return { message: 'Password changed successfully' };
  }

  private async generateTokens(user: User): Promise<AuthTokens> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
      jti: uuidv4(),
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>(
        'JWT_SECRET',
        'devflow-ultra-secure-jwt-secret-key-phase2-production-2026',
      ),
      expiresIn: this.configService.get<string>('JWT_EXPIRES_IN', '15m'),
    });

    const refreshSecret = this.configService.get<string>(
      'JWT_REFRESH_SECRET',
      'devflow-ultra-secure-jwt-refresh-secret-key-phase2-2026',
    );
    const refreshToken = this.jwtService.sign(payload, {
      secret: refreshSecret,
      expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d'),
    });

    this.userRepository.storeRefreshToken(refreshToken, user.id);

    return {
      accessToken,
      refreshToken,
      expiresIn: 900, // 15 minutes in seconds
    };
  }
}

import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { UserRepository } from './user.repository';
import { AuditService } from '../audit/audit.service';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';
import { User } from '@devflow/shared-types';

describe('AuthService & RBAC Engine', () => {
  let authService: AuthService;
  let userRepository: UserRepository;
  let auditService: AuditService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        UserRepository,
        AuditService,
        JwtService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue: unknown) => {
              if (key === 'JWT_SECRET') return 'test-jwt-secret';
              if (key === 'JWT_EXPIRES_IN') return '15m';
              if (key === 'JWT_REFRESH_SECRET') return 'test-jwt-refresh-secret';
              if (key === 'JWT_REFRESH_EXPIRES_IN') return '7d';
              return defaultValue;
            }),
          },
        },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    userRepository = module.get<UserRepository>(UserRepository);
    auditService = module.get<AuditService>(AuditService);
  });

  describe('1. User Registration', () => {
    it('should successfully register a new user with hashed password and return tokens', async () => {
      const response = await authService.register({
        email: 'newuser@devflow.ai',
        name: 'New Dev',
        password: 'Password123!',
        role: 'DEVELOPER',
      });

      expect(response.user).toBeDefined();
      expect(response.user.email).toBe('newuser@devflow.ai');
      expect(response.user.role).toBe('DEVELOPER');
      expect(response.user.status).toBe('ACTIVE');
      expect((response.user as unknown as Record<string, unknown>).passwordHash).toBeUndefined();
      expect(response.tokens.accessToken).toBeDefined();
      expect(response.tokens.refreshToken).toBeDefined();
    });

    it('should reject registration if email is already taken (Duplicate Email)', async () => {
      await expect(
        authService.register({
          email: 'admin@devflow.ai', // Pre-seeded default admin
          name: 'Imposter Admin',
          password: 'Password123!',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('2. User Login & Authentication', () => {
    it('should successfully authenticate with valid credentials', async () => {
      const response = await authService.login({
        email: 'developer@devflow.ai',
        password: 'DevFlow2026!',
      });

      expect(response.user.email).toBe('developer@devflow.ai');
      expect(response.user.role).toBe('DEVELOPER');
      expect(response.tokens.accessToken).toBeDefined();
      expect(response.tokens.refreshToken).toBeDefined();
    });

    it('should reject login with non-existent email', async () => {
      await expect(
        authService.login({
          email: 'nonexistent@devflow.ai',
          password: 'DevFlow2026!',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should reject login with invalid password', async () => {
      await expect(
        authService.login({
          email: 'developer@devflow.ai',
          password: 'WrongPassword123!',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should reject login if user account is suspended', async () => {
      const user = await userRepository.findByEmail('developer@devflow.ai');
      expect(user).toBeDefined();
      await userRepository.updateStatus(user!.id, 'SUSPENDED');

      await expect(
        authService.login({
          email: 'developer@devflow.ai',
          password: 'DevFlow2026!',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('3. Token Refresh & Rotation', () => {
    it('should rotate tokens with a valid refresh token', async () => {
      const loginRes = await authService.login({
        email: 'admin@devflow.ai',
        password: 'DevFlow2026!',
      });

      const newTokens = await authService.refresh(loginRes.tokens.refreshToken);

      expect(newTokens.accessToken).toBeDefined();
      expect(newTokens.refreshToken).toBeDefined();
      expect(newTokens.refreshToken).not.toBe(loginRes.tokens.refreshToken);
    });

    it('should reject invalid or already revoked refresh tokens', async () => {
      await expect(authService.refresh('invalid-bogus-token-xyz')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('4. Logout & Session Revocation', () => {
    it('should revoke refresh token on logout', async () => {
      const loginRes = await authService.login({
        email: 'admin@devflow.ai',
        password: 'DevFlow2026!',
      });

      await authService.logout(loginRes.tokens.refreshToken, loginRes.user.id);

      // Attempting to refresh with the revoked token must fail
      await expect(authService.refresh(loginRes.tokens.refreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('5. Profile & Password Management', () => {
    it('should update user profile name and avatar', async () => {
      const user = await userRepository.findByEmail('viewer@devflow.ai');
      expect(user).toBeDefined();

      const updated = await authService.updateProfile(user!.id, {
        name: 'Lead Product Manager',
        avatarUrl: 'https://example.com/avatar.png',
      });

      expect(updated.name).toBe('Lead Product Manager');
      expect(updated.avatarUrl).toBe('https://example.com/avatar.png');
    });

    it('should change password when current password is verified', async () => {
      const user = await userRepository.findByEmail('viewer@devflow.ai');
      expect(user).toBeDefined();

      const res = await authService.changePassword(user!.id, {
        currentPassword: 'DevFlow2026!',
        newPassword: 'BrandNewSecurePassword2026!',
      });

      expect(res.message).toBe('Password changed successfully');

      // Verify login works with the new password
      const newLogin = await authService.login({
        email: 'viewer@devflow.ai',
        password: 'BrandNewSecurePassword2026!',
      });
      expect(newLogin.user).toBeDefined();
    });

    it('should reject password change if current password is wrong', async () => {
      const user = await userRepository.findByEmail('reviewer@devflow.ai');
      expect(user).toBeDefined();

      await expect(
        authService.changePassword(user!.id, {
          currentPassword: 'IncorrectPassword!',
          newPassword: 'BrandNewSecurePassword2026!',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('6. RBAC RolesGuard Enforcement', () => {
    let reflector: Reflector;
    let rolesGuard: RolesGuard;

    beforeEach(() => {
      reflector = new Reflector();
      rolesGuard = new RolesGuard(reflector);
    });

    const createMockContext = (user: Partial<User>): ExecutionContext =>
      ({
        switchToHttp: () => ({
          getRequest: () => ({ user }),
        }),
        getHandler: () => ({}),
        getClass: () => ({}),
      }) as unknown as ExecutionContext;

    it('should allow ADMIN to access ADMIN-only route', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ADMIN']);

      const context = createMockContext({
        id: '1',
        email: 'admin@devflow.ai',
        role: 'ADMIN',
      });

      expect(rolesGuard.canActivate(context)).toBe(true);
    });

    it('should block VIEWER from accessing ADMIN-only route with ForbiddenException', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ADMIN']);

      const context = createMockContext({
        id: '2',
        email: 'viewer@devflow.ai',
        role: 'VIEWER',
      });

      expect(() => rolesGuard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should allow DEVELOPER to access route requiring DEVELOPER role', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ADMIN', 'DEVELOPER']);

      const context = createMockContext({
        id: '3',
        email: 'dev@devflow.ai',
        role: 'DEVELOPER',
      });

      expect(rolesGuard.canActivate(context)).toBe(true);
    });

    it('should block VIEWER from accessing DEVELOPER route', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ADMIN', 'DEVELOPER']);

      const context = createMockContext({
        id: '4',
        email: 'viewer@devflow.ai',
        role: 'VIEWER',
      });

      expect(() => rolesGuard.canActivate(context)).toThrow(ForbiddenException);
    });
  });

  describe('7. Audit Logging', () => {
    it('should record audit logs on critical auth events', async () => {
      await authService.register({
        email: 'audit-user@devflow.ai',
        name: 'Audit User',
        password: 'Password123!',
      });

      const logs = auditService.getLogs(10);
      expect(logs.length).toBeGreaterThan(0);
      const actions = logs.map((l) => l.action);
      expect(actions).toContain('USER_REGISTERED');
    });
  });
});

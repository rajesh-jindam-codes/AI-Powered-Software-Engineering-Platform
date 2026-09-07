import { Injectable, Logger } from '@nestjs/common';
import { AuthPatternSummary } from '@devflow/shared-types';

/**
 * DEVFLOW AI — AuthExtractorService
 *
 * Discovers authentication mechanisms, guards, passport strategies,
 * RBAC role checks, and protected routes.
 */
@Injectable()
export class AuthExtractorService {
  private readonly logger = new Logger(AuthExtractorService.name);

  extractAuthPatterns(filePath: string, content: string): AuthPatternSummary[] {
    const patterns: AuthPatternSummary[] = [];
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Detect Guard definitions
      if (line.includes('implements CanActivate') || line.includes('extends AuthGuard')) {
        const nameMatch = line.match(/class\s+([A-Za-z0-9_]+)/);
        const name = nameMatch ? nameMatch[1] : 'CustomAuthGuard';
        const isJwt = name.toLowerCase().includes('jwt') || content.includes('jwtService');
        const isRoles = name.toLowerCase().includes('role') || content.includes('Reflector');

        patterns.push({
          id: `auth_guard_${name}`,
          name,
          type: 'GUARD',
          filePath,
          startLine: i + 1,
          endLine: i + 25,
          mechanism: isJwt ? 'JWT' : isRoles ? 'RBAC' : 'SESSION',
          requiredRoles: isRoles ? ['ADMIN', 'DEVELOPER'] : [],
          protectedRoutes: [],
        });
      }

      // Detect Passport Strategy
      if (line.includes('extends PassportStrategy')) {
        const nameMatch = line.match(/class\s+([A-Za-z0-9_]+)/);
        const name = nameMatch ? nameMatch[1] : 'PassportStrategy';
        const isOAuth = name.toLowerCase().includes('github') || name.toLowerCase().includes('oauth');

        patterns.push({
          id: `auth_strat_${name}`,
          name,
          type: 'STRATEGY',
          filePath,
          startLine: i + 1,
          endLine: i + 30,
          mechanism: isOAuth ? 'OAUTH' : 'JWT',
          requiredRoles: [],
          protectedRoutes: [],
        });
      }

      // Detect Roles Decorator: @Roles('ADMIN', 'DEVELOPER')
      const rolesMatch = line.match(/@Roles\s*\(([^)]+)\)/);
      if (rolesMatch) {
        const roles = rolesMatch[1].replace(/['"]/g, '').split(',').map((r) => r.trim());
        patterns.push({
          id: `auth_roles_${i + 1}`,
          name: `RolesCheck (${roles.join(', ')})`,
          type: 'DECORATOR',
          filePath,
          startLine: i + 1,
          endLine: i + 1,
          mechanism: 'RBAC',
          requiredRoles: roles,
          protectedRoutes: [],
        });
      }
    }

    return patterns;
  }
}

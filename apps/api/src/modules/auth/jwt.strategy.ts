import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UserRepository } from './user.repository';
import { JwtPayload, User } from '@devflow/shared-types';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly userRepository: UserRepository,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>(
        'JWT_SECRET',
        'devflow-ultra-secure-jwt-secret-key-phase2-production-2026',
      ),
    });
  }

  async validate(payload: JwtPayload): Promise<User> {
    const userWithPassword = await this.userRepository.findById(payload.sub);

    if (!userWithPassword) {
      throw new UnauthorizedException('User account no longer exists');
    }

    if (userWithPassword.status === 'SUSPENDED') {
      throw new UnauthorizedException('User account has been suspended');
    }

    return this.userRepository.sanitizeUser(userWithPassword);
  }
}

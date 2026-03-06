import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../../common/redis/redis.module';

export interface JwtPayload {
  sub: string;
  email: string;
  companyId: string;
  roles: string[];
}

const TOKEN_BLACKLIST_PREFIX = 'bl:';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: JwtPayload) {
    // Check token blacklist
    const authHeader = req.headers.authorization;
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const blacklisted = await this.redis.get(`${TOKEN_BLACKLIST_PREFIX}${token}`);
      if (blacklisted) {
        throw new UnauthorizedException('Token has been revoked');
      }
    }

    return {
      id: payload.sub,
      email: payload.email,
      companyId: payload.companyId,
      roles: payload.roles,
    };
  }
}

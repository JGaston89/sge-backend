import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Inject } from '@nestjs/common';
import { REDIS_CLIENT } from '../../database/redis.module';
import { RedisClientType } from 'redis';

export interface JwtPayload {
  sub: string;          // usuario_id
  inst: string;         // institucion_id
  email: string;
  roles: string[];
  iat: number;
  exp: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    @Inject(REDIS_CLIENT) private readonly redis: RedisClientType,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('auth.jwtAccessSecret'),
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: JwtPayload): Promise<JwtPayload> {
    // Extraer token del header para chequear blacklist
    const authHeader = (req.headers as unknown as Record<string, string>)['authorization'] || '';
    const token = authHeader.replace('Bearer ', '');

    const blacklisted = await this.redis.exists(`blacklist:${token}`);
    if (blacklisted) {
      throw new UnauthorizedException('Token revocado');
    }

    return payload;
  }
}

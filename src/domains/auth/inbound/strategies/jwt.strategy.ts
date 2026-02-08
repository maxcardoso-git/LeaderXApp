import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET', 'leaderx-jwt-secret-change-in-production'),
    });
  }

  async validate(payload: { sub: string; tenantId: string; email: string }) {
    return {
      userId: payload.sub,
      tenantId: payload.tenantId,
      email: payload.email,
    };
  }
}

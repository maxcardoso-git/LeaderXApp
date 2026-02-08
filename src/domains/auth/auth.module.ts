import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaService } from '@infrastructure/persistence/prisma.service';
import { AuthService } from './application/services/auth.service';
import { AuthController } from './inbound/controllers/auth.controller';
import { JwtStrategy } from './inbound/strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET', 'leaderx-jwt-secret-change-in-production'),
        signOptions: {
          expiresIn: 28800, // 8 hours in seconds
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [PrismaService, AuthService, JwtStrategy, JwtAuthGuard],
  exports: [AuthService, JwtAuthGuard],
})
export class AuthModule {}

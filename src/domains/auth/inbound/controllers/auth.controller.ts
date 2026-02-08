import { Controller, Post, Get, Body, Headers, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { IsEmail, IsString, IsNotEmpty } from 'class-validator';
import { AuthService } from '../../application/services/auth.service';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';

class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiHeader({ name: 'X-Tenant-Id', required: true })
  async login(
    @Body() dto: LoginDto,
    @Headers('x-tenant-id') tenantId: string,
  ) {
    return this.authService.login(dto.email, dto.password, tenantId || 'demo-tenant');
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile with permissions' })
  async me(@Req() req: any) {
    return this.authService.me(req.user.userId, req.user.tenantId);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout and revoke sessions' })
  async logout(@Req() req: any) {
    return this.authService.logout(req.user.userId, req.user.tenantId);
  }
}

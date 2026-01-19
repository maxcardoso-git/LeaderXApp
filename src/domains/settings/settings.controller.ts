import {
  Controller,
  Get,
  Post,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { PrismaService } from '@infrastructure/persistence/prisma.service';

interface ThemeConfig {
  id?: string;
  tenantId?: string;
  css: string;
  createdAt?: string;
  updatedAt?: string;
}

@ApiTags('Settings')
@Controller('settings')
export class SettingsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('theme')
  @ApiOperation({ summary: 'Get tenant theme configuration' })
  @ApiResponse({ status: 200, description: 'Theme retrieved successfully' })
  @ApiHeader({ name: 'X-Tenant-Id', required: true })
  async getTheme(
    @Headers('x-tenant-id') tenantId: string,
  ): Promise<ThemeConfig | null> {
    const setting = await this.prisma.tenantSettings.findUnique({
      where: {
        tenantId_key: {
          tenantId,
          key: 'theme',
        },
      },
    });

    if (!setting) {
      return null;
    }

    const value = setting.value as { css: string };
    return {
      id: setting.id,
      tenantId: setting.tenantId,
      css: value.css || '',
      createdAt: setting.createdAt.toISOString(),
      updatedAt: setting.updatedAt.toISOString(),
    };
  }

  @Post('theme')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Save tenant theme configuration' })
  @ApiResponse({ status: 200, description: 'Theme saved successfully' })
  @ApiHeader({ name: 'X-Tenant-Id', required: true })
  async saveTheme(
    @Headers('x-tenant-id') tenantId: string,
    @Body() data: { css: string },
  ): Promise<ThemeConfig> {
    const setting = await this.prisma.tenantSettings.upsert({
      where: {
        tenantId_key: {
          tenantId,
          key: 'theme',
        },
      },
      update: {
        value: { css: data.css },
      },
      create: {
        tenantId,
        key: 'theme',
        value: { css: data.css },
      },
    });

    const value = setting.value as { css: string };
    return {
      id: setting.id,
      tenantId: setting.tenantId,
      css: value.css || '',
      createdAt: setting.createdAt.toISOString(),
      updatedAt: setting.updatedAt.toISOString(),
    };
  }
}

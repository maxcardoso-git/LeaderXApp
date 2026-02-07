import { Controller, Get, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@ApiTags('Gateway')
@Controller('admin/gateway')
export class GatewayProxyController {
  private readonly logger = new Logger(GatewayProxyController.name);
  private readonly kongAdminUrl: string;

  constructor(private readonly httpService: HttpService) {
    this.kongAdminUrl = process.env.KONG_ADMIN_URL || 'http://localhost:8001';
  }

  @Get('status')
  @ApiOperation({ summary: 'Get Kong Gateway status' })
  async getStatus() {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.kongAdminUrl}/status`),
      );
      return response.data;
    } catch (error: any) {
      this.logger.error(`Failed to get Kong status: ${error.message}`);
      return { error: 'Kong Gateway unreachable', details: error.message };
    }
  }

  @Get('routes')
  @ApiOperation({ summary: 'List Kong Gateway routes' })
  async getRoutes() {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.kongAdminUrl}/routes?size=100`),
      );
      return response.data;
    } catch (error: any) {
      this.logger.error(`Failed to get Kong routes: ${error.message}`);
      return { data: [], error: error.message };
    }
  }

  @Get('consumers')
  @ApiOperation({ summary: 'List Kong Gateway consumers' })
  async getConsumers() {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.kongAdminUrl}/consumers?size=100`),
      );
      return response.data;
    } catch (error: any) {
      this.logger.error(`Failed to get Kong consumers: ${error.message}`);
      return { data: [], error: error.message };
    }
  }

  @Get('plugins')
  @ApiOperation({ summary: 'List Kong Gateway plugins' })
  async getPlugins() {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.kongAdminUrl}/plugins?size=100`),
      );
      return response.data;
    } catch (error: any) {
      this.logger.error(`Failed to get Kong plugins: ${error.message}`);
      return { data: [], error: error.message };
    }
  }

  @Get('services')
  @ApiOperation({ summary: 'List Kong Gateway services' })
  async getServices() {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.kongAdminUrl}/services?size=100`),
      );
      return response.data;
    } catch (error: any) {
      this.logger.error(`Failed to get Kong services: ${error.message}`);
      return { data: [], error: error.message };
    }
  }
}

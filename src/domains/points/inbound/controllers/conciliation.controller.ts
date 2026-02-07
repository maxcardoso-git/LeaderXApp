import {
  Controller,
  Get,
  Param,
  Query,
  Headers,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiHeader,
} from '@nestjs/swagger';
import { ConciliationHandler } from '../../application/handlers/conciliation.handler';

@ApiTags('Points Conciliation')
@Controller('admin/conciliation')
export class ConciliationController {
  constructor(
    private readonly conciliationHandler: ConciliationHandler,
  ) {}

  @Get('summary')
  @ApiOperation({ summary: 'Get conciliation summary (KPIs)' })
  @ApiResponse({ status: 200, description: 'Summary retrieved successfully' })
  @ApiHeader({ name: 'X-Tenant-Id', required: true })
  async getSummary(
    @Headers('x-tenant-id') tenantId: string,
  ) {
    return await this.conciliationHandler.getSummary(tenantId);
  }

  @Get('anomalies')
  @ApiOperation({ summary: 'List detected anomalies' })
  @ApiResponse({ status: 200, description: 'Anomalies listed successfully' })
  @ApiHeader({ name: 'X-Tenant-Id', required: true })
  async listAnomalies(
    @Headers('x-tenant-id') tenantId: string,
    @Query('type') type?: string,
    @Query('severity') severity?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('size') size?: string,
  ) {
    return await this.conciliationHandler.listAnomalies(tenantId, {
      type,
      severity,
      status,
      page: page ? Number(page) : undefined,
      size: size ? Number(size) : undefined,
    });
  }

  @Get('anomalies/:id')
  @ApiOperation({ summary: 'Get anomaly detail' })
  @ApiResponse({ status: 200, description: 'Anomaly retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Anomaly not found' })
  @ApiHeader({ name: 'X-Tenant-Id', required: true })
  async getAnomaly(
    @Param('id') anomalyId: string,
    @Headers('x-tenant-id') tenantId: string,
  ) {
    const anomaly = await this.conciliationHandler.getAnomaly(tenantId, anomalyId);

    if (!anomaly) {
      throw new HttpException(
        { error: 'ANOMALY_NOT_FOUND', message: `Anomaly ${anomalyId} not found` },
        HttpStatus.NOT_FOUND,
      );
    }

    return anomaly;
  }
}

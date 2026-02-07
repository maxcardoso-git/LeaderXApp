import {
  Controller,
  Get,
  Post,
  Patch,
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

  // ─── Anomalies ────────────────────────────────────────────

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

  // ─── Notifications ────────────────────────────────────────

  @Post('notifications/sync')
  @ApiOperation({ summary: 'Sync notifications from detected anomalies' })
  @ApiResponse({ status: 200, description: 'Notifications synced successfully' })
  @ApiHeader({ name: 'X-Tenant-Id', required: true })
  async syncNotifications(
    @Headers('x-tenant-id') tenantId: string,
  ) {
    return await this.conciliationHandler.syncNotifications(tenantId);
  }

  @Get('notifications')
  @ApiOperation({ summary: 'List conciliation notifications' })
  @ApiResponse({ status: 200, description: 'Notifications listed successfully' })
  @ApiHeader({ name: 'X-Tenant-Id', required: true })
  async listNotifications(
    @Headers('x-tenant-id') tenantId: string,
    @Query('status') status?: string,
    @Query('code') code?: string,
    @Query('severity') severity?: string,
    @Query('page') page?: string,
    @Query('size') size?: string,
  ) {
    return await this.conciliationHandler.listNotifications(tenantId, {
      status,
      code,
      severity,
      page: page ? Number(page) : undefined,
      size: size ? Number(size) : undefined,
    });
  }

  @Get('notifications/count')
  @ApiOperation({ summary: 'Get notification counts by status' })
  @ApiResponse({ status: 200, description: 'Counts retrieved successfully' })
  @ApiHeader({ name: 'X-Tenant-Id', required: true })
  async getNotificationCounts(
    @Headers('x-tenant-id') tenantId: string,
  ) {
    return await this.conciliationHandler.getNotificationCounts(tenantId);
  }

  @Get('notifications/:id')
  @ApiOperation({ summary: 'Get notification detail' })
  @ApiResponse({ status: 200, description: 'Notification retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  @ApiHeader({ name: 'X-Tenant-Id', required: true })
  async getNotification(
    @Param('id') notificationId: string,
    @Headers('x-tenant-id') tenantId: string,
  ) {
    const notification = await this.conciliationHandler.getNotification(tenantId, notificationId);

    if (!notification) {
      throw new HttpException(
        { error: 'NOTIFICATION_NOT_FOUND', message: `Notification ${notificationId} not found` },
        HttpStatus.NOT_FOUND,
      );
    }

    return notification;
  }

  @Patch('notifications/:id/acknowledge')
  @ApiOperation({ summary: 'Acknowledge a notification' })
  @ApiResponse({ status: 200, description: 'Notification acknowledged' })
  @ApiResponse({ status: 404, description: 'Notification not found or not in NEW status' })
  @ApiHeader({ name: 'X-Tenant-Id', required: true })
  async acknowledgeNotification(
    @Param('id') notificationId: string,
    @Headers('x-tenant-id') tenantId: string,
  ) {
    const result = await this.conciliationHandler.acknowledgeNotification(
      tenantId,
      notificationId,
      'admin', // TODO: extract from auth context
    );

    if (!result) {
      throw new HttpException(
        { error: 'CANNOT_ACKNOWLEDGE', message: 'Notification not found or not in NEW status' },
        HttpStatus.BAD_REQUEST,
      );
    }

    return result;
  }

  @Patch('notifications/:id/resolve')
  @ApiOperation({ summary: 'Resolve a notification' })
  @ApiResponse({ status: 200, description: 'Notification resolved' })
  @ApiResponse({ status: 404, description: 'Notification not found or already resolved' })
  @ApiHeader({ name: 'X-Tenant-Id', required: true })
  async resolveNotification(
    @Param('id') notificationId: string,
    @Headers('x-tenant-id') tenantId: string,
  ) {
    const result = await this.conciliationHandler.resolveNotification(
      tenantId,
      notificationId,
      'admin', // TODO: extract from auth context
    );

    if (!result) {
      throw new HttpException(
        { error: 'CANNOT_RESOLVE', message: 'Notification not found or already resolved' },
        HttpStatus.BAD_REQUEST,
      );
    }

    return result;
  }
}

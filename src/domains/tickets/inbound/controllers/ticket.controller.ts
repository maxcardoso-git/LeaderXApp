import { Controller, Get, Post, Put, Param, Query, Headers, Body } from '@nestjs/common';
import { TicketHandler } from '../../application/handlers';

@Controller('admin/tickets')
export class TicketController {
  constructor(private readonly handler: TicketHandler) {}

  @Post('event/:eventId/generate')
  async generateForEvent(
    @Headers('x-tenant-id') tenantId: string,
    @Param('eventId') eventId: string,
  ) {
    return this.handler.generateForEvent(tenantId, eventId);
  }

  @Get('event/:eventId')
  async listByEvent(
    @Headers('x-tenant-id') tenantId: string,
    @Param('eventId') eventId: string,
    @Query('page') page?: string,
    @Query('size') size?: string,
    @Query('status') status?: string,
    @Query('batchId') batchId?: string,
  ) {
    return this.handler.listByEvent(tenantId, eventId, {
      page: page ? parseInt(page) : undefined,
      size: size ? parseInt(size) : undefined,
      status,
      batchId,
    });
  }

  @Get('event/:eventId/inventory')
  async getInventory(
    @Headers('x-tenant-id') tenantId: string,
    @Param('eventId') eventId: string,
  ) {
    return this.handler.getInventory(tenantId, eventId);
  }

  @Put(':id/reserve')
  async reserve(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Body() body: { holderId: string },
  ) {
    return this.handler.reserve(tenantId, id, body.holderId);
  }

  @Put(':id/sell')
  async sell(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
  ) {
    return this.handler.sell(tenantId, id);
  }

  @Put(':id/cancel')
  async cancel(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
  ) {
    return this.handler.cancel(tenantId, id);
  }
}

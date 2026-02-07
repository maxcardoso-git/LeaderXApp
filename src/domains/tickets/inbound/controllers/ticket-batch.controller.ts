import { Controller, Get, Post, Put, Delete, Body, Param, Headers, HttpCode, HttpStatus } from '@nestjs/common';
import { TicketBatchHandler } from '../../application/handlers';

@Controller('admin/ticket-batches')
export class TicketBatchController {
  constructor(private readonly handler: TicketBatchHandler) {}

  @Get('event/:eventId')
  async listByEvent(
    @Headers('x-tenant-id') tenantId: string,
    @Param('eventId') eventId: string,
  ) {
    return this.handler.listByEvent(tenantId, eventId);
  }

  @Post('event/:eventId')
  async create(
    @Headers('x-tenant-id') tenantId: string,
    @Param('eventId') eventId: string,
    @Body() body: { name: string; price: number; quantity: number; openDate: string; closeDate?: string },
  ) {
    if (!body.name || body.price == null || body.quantity == null || !body.openDate) {
      throw new Error('name, price, quantity and openDate are required');
    }
    return this.handler.create(tenantId, eventId, {
      name: body.name,
      price: body.price,
      quantity: body.quantity,
      openDate: new Date(body.openDate),
      closeDate: body.closeDate ? new Date(body.closeDate) : undefined,
    });
  }

  @Put(':id')
  async update(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Body() body: { name?: string; price?: number; quantity?: number; openDate?: string; closeDate?: string },
  ) {
    return this.handler.update(tenantId, id, {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.price !== undefined && { price: body.price }),
      ...(body.quantity !== undefined && { quantity: body.quantity }),
      ...(body.openDate !== undefined && { openDate: new Date(body.openDate) }),
      ...(body.closeDate !== undefined && { closeDate: new Date(body.closeDate) }),
    });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
  ) {
    await this.handler.remove(tenantId, id);
  }

  @Put('event/:eventId/reorder')
  async reorder(
    @Headers('x-tenant-id') tenantId: string,
    @Param('eventId') eventId: string,
    @Body() body: { batchIds: string[] },
  ) {
    await this.handler.reorder(tenantId, eventId, body.batchIds);
    return { ok: true };
  }
}

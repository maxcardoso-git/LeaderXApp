import { Controller, Get, Post, Put, Param, Query, Headers, Body } from '@nestjs/common';
import { InvitationHandler, InvitationPolicyHandler } from '../../application/handlers';

@Controller('admin/invitations')
export class InvitationController {
  constructor(
    private readonly handler: InvitationHandler,
    private readonly policyHandler: InvitationPolicyHandler,
  ) {}

  @Get('event/:eventId')
  async listByEvent(
    @Headers('x-tenant-id') tenantId: string,
    @Param('eventId') eventId: string,
    @Query('page') page?: string,
    @Query('size') size?: string,
    @Query('status') status?: string,
    @Query('type') type?: string,
  ) {
    return this.handler.listByEvent(tenantId, eventId, {
      page: page ? parseInt(page) : undefined,
      size: size ? parseInt(size) : undefined,
      status,
      type,
    });
  }

  @Get(':id')
  async getById(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
  ) {
    return this.handler.getById(tenantId, id);
  }

  @Post('event/:eventId')
  async create(
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-actor-id') actorId: string,
    @Param('eventId') eventId: string,
    @Body() body: {
      type?: string;
      recipientName: string;
      recipientEmail?: string;
      recipientPhone?: string;
      batchId?: string;
      priceCurrency?: string;
      priceAmount?: number;
      pointsRequired?: number;
      exchangeRateId?: string;
      tableId?: string;
      seatId?: string;
      expiresAt?: string;
    },
  ) {
    if (!body.recipientName) {
      throw new Error('recipientName is required');
    }
    return this.handler.create(tenantId, eventId, {
      ...body,
      issuedByMemberId: actorId || undefined,
      issuedByRole: 'ADMIN',
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
    });
  }

  @Put(':id/send')
  async send(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
  ) {
    return this.handler.send(tenantId, id);
  }

  @Put(':id/accept')
  async accept(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
  ) {
    return this.handler.accept(tenantId, id);
  }

  @Put(':id/decline')
  async decline(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
  ) {
    return this.handler.decline(tenantId, id);
  }

  @Put(':id/cancel')
  async cancel(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Body() body: { reason?: string },
  ) {
    return this.handler.cancel(tenantId, id, body.reason);
  }

  // --- Invitation Policy ---

  @Get('event/:eventId/policy')
  async getPolicy(
    @Headers('x-tenant-id') tenantId: string,
    @Param('eventId') eventId: string,
  ) {
    return this.policyHandler.getByEvent(tenantId, eventId);
  }

  @Put('event/:eventId/policy')
  async upsertPolicy(
    @Headers('x-tenant-id') tenantId: string,
    @Param('eventId') eventId: string,
    @Body() body: {
      allowedTypes?: string[];
      maxInvitations?: number;
      allowPoints?: boolean;
      allowHybrid?: boolean;
      allowedRoles?: string[];
      expirationHours?: number;
    },
  ) {
    return this.policyHandler.upsert(tenantId, eventId, body);
  }
}

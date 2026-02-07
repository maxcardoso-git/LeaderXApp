import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/persistence/prisma.service';

export interface InvitationDocument {
  id: string;
  tenantId: string;
  eventId: string;
  ticketId: string | null;
  batchId: string | null;
  type: string;
  status: string;
  recipientName: string;
  recipientEmail: string | null;
  recipientPhone: string | null;
  issuedByMemberId: string | null;
  issuedByRole: string | null;
  priceCurrency: string;
  priceAmount: number;
  pointsRequired: number;
  exchangeRateId: string | null;
  tableId: string | null;
  seatId: string | null;
  seatLocked: boolean;
  expiresAt: string | null;
  acceptedAt: string | null;
  cancelledReason: string | null;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class InvitationHandler {
  constructor(private readonly prisma: PrismaService) {}

  async listByEvent(
    tenantId: string,
    eventId: string,
    params: { page?: number; size?: number; status?: string; type?: string },
  ): Promise<{ items: InvitationDocument[]; total: number }> {
    const page = params.page || 1;
    const size = params.size || 50;
    const where: any = { tenantId, eventId };
    if (params.status) where.status = params.status;
    if (params.type) where.type = params.type;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.invitation.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * size,
        take: size,
      }),
      this.prisma.invitation.count({ where }),
    ]);

    return { items: items.map((i) => this.toDocument(i)), total };
  }

  async getById(tenantId: string, id: string): Promise<InvitationDocument | null> {
    const invitation = await this.prisma.invitation.findFirst({
      where: { id, tenantId },
    });
    return invitation ? this.toDocument(invitation) : null;
  }

  async create(
    tenantId: string,
    eventId: string,
    data: {
      type?: string;
      recipientName: string;
      recipientEmail?: string;
      recipientPhone?: string;
      issuedByMemberId?: string;
      issuedByRole?: string;
      batchId?: string;
      priceCurrency?: string;
      priceAmount?: number;
      pointsRequired?: number;
      exchangeRateId?: string;
      tableId?: string;
      seatId?: string;
      expiresAt?: Date;
    },
  ): Promise<InvitationDocument> {
    // Get expiration from policy if not provided
    let expiresAt = data.expiresAt || null;
    if (!expiresAt) {
      const policy = await this.prisma.invitationPolicy.findUnique({
        where: { eventId },
      });
      if (policy) {
        expiresAt = new Date(Date.now() + policy.expirationHours * 60 * 60 * 1000);
      }
    }

    const invitation = await this.prisma.invitation.create({
      data: {
        tenantId,
        eventId,
        type: data.type || 'FREE',
        status: 'CREATED',
        recipientName: data.recipientName,
        recipientEmail: data.recipientEmail,
        recipientPhone: data.recipientPhone,
        issuedByMemberId: data.issuedByMemberId,
        issuedByRole: data.issuedByRole,
        batchId: data.batchId,
        priceCurrency: data.priceCurrency || 'BRL',
        priceAmount: data.priceAmount || 0,
        pointsRequired: data.pointsRequired || 0,
        exchangeRateId: data.exchangeRateId,
        tableId: data.tableId,
        seatId: data.seatId,
        expiresAt,
      },
    });

    await this.logAction(tenantId, invitation.id, 'CREATED', data.issuedByRole || 'ADMIN');
    return this.toDocument(invitation);
  }

  async send(tenantId: string, id: string): Promise<InvitationDocument> {
    const invitation = await this.prisma.invitation.update({
      where: { id },
      data: { status: 'SENT' },
    });
    await this.logAction(tenantId, id, 'SENT', 'ADMIN');
    return this.toDocument(invitation);
  }

  async accept(tenantId: string, id: string): Promise<InvitationDocument> {
    const invitation = await this.prisma.invitation.update({
      where: { id },
      data: {
        status: 'ACCEPTED',
        acceptedAt: new Date(),
        seatLocked: !!((await this.prisma.invitation.findUnique({ where: { id }, select: { seatId: true } }))?.seatId),
      },
    });
    await this.logAction(tenantId, id, 'ACCEPTED', 'MEMBER');
    return this.toDocument(invitation);
  }

  async decline(tenantId: string, id: string): Promise<InvitationDocument> {
    const invitation = await this.prisma.invitation.update({
      where: { id },
      data: { status: 'DECLINED' },
    });
    await this.logAction(tenantId, id, 'DECLINED', 'MEMBER');
    return this.toDocument(invitation);
  }

  async cancel(tenantId: string, id: string, reason?: string): Promise<InvitationDocument> {
    const invitation = await this.prisma.invitation.update({
      where: { id },
      data: { status: 'CANCELLED', cancelledReason: reason },
    });
    await this.logAction(tenantId, id, 'CANCELLED', 'ADMIN', { reason });
    return this.toDocument(invitation);
  }

  async expire(tenantId: string, id: string): Promise<InvitationDocument> {
    const invitation = await this.prisma.invitation.update({
      where: { id },
      data: { status: 'EXPIRED' },
    });
    await this.logAction(tenantId, id, 'EXPIRED', 'SYSTEM');
    return this.toDocument(invitation);
  }

  private async logAction(
    tenantId: string,
    invitationId: string,
    action: string,
    performedBy: string,
    metadata?: any,
  ): Promise<void> {
    await this.prisma.invitationAuditLog.create({
      data: {
        tenantId,
        invitationId,
        action,
        performedBy,
        metadata: metadata || undefined,
      },
    });
  }

  private toDocument(inv: any): InvitationDocument {
    return {
      id: inv.id,
      tenantId: inv.tenantId,
      eventId: inv.eventId,
      ticketId: inv.ticketId,
      batchId: inv.batchId,
      type: inv.type,
      status: inv.status,
      recipientName: inv.recipientName,
      recipientEmail: inv.recipientEmail,
      recipientPhone: inv.recipientPhone,
      issuedByMemberId: inv.issuedByMemberId,
      issuedByRole: inv.issuedByRole,
      priceCurrency: inv.priceCurrency,
      priceAmount: inv.priceAmount,
      pointsRequired: inv.pointsRequired,
      exchangeRateId: inv.exchangeRateId,
      tableId: inv.tableId,
      seatId: inv.seatId,
      seatLocked: inv.seatLocked,
      expiresAt: inv.expiresAt ? inv.expiresAt.toISOString() : null,
      acceptedAt: inv.acceptedAt ? inv.acceptedAt.toISOString() : null,
      cancelledReason: inv.cancelledReason,
      createdAt: inv.createdAt.toISOString(),
      updatedAt: inv.updatedAt.toISOString(),
    };
  }
}

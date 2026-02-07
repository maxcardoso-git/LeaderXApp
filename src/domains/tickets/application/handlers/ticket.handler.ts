import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/persistence/prisma.service';

export interface TicketDocument {
  id: string;
  tenantId: string;
  eventId: string;
  batchId: string;
  code: string;
  price: number;
  status: string;
  holderId: string | null;
  reservedAt: string | null;
  soldAt: string | null;
  usedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TicketInventoryDocument {
  total: number;
  available: number;
  reserved: number;
  sold: number;
  used: number;
  cancelled: number;
  byBatch: {
    batchId: string;
    batchName: string;
    total: number;
    available: number;
    sold: number;
  }[];
}

@Injectable()
export class TicketHandler {
  constructor(private readonly prisma: PrismaService) {}

  async generateForEvent(tenantId: string, eventId: string): Promise<{ generated: number }> {
    // Check if tickets already exist for this event
    const existing = await this.prisma.ticket.count({ where: { tenantId, eventId } });
    if (existing > 0) {
      throw new Error('Tickets already generated for this event');
    }

    const batches = await this.prisma.ticketBatch.findMany({
      where: { tenantId, eventId },
      orderBy: { sortOrder: 'asc' },
    });

    if (batches.length === 0) {
      throw new Error('No batches found for this event');
    }

    // Generate a short event prefix from the event name
    const event = await this.prisma.event.findUnique({ where: { id: eventId }, select: { name: true } });
    const prefix = (event?.name || 'EVT')
      .replace(/[^a-zA-Z0-9]/g, '')
      .substring(0, 5)
      .toUpperCase();

    const ticketsToCreate: any[] = [];
    let totalGenerated = 0;

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      const batchNum = String(batchIndex + 1).padStart(2, '0');

      for (let seq = 1; seq <= batch.quantity; seq++) {
        ticketsToCreate.push({
          tenantId,
          eventId,
          batchId: batch.id,
          code: `${prefix}-${batchNum}-${String(seq).padStart(4, '0')}`,
          price: batch.price,
          status: 'AVAILABLE',
        });
        totalGenerated++;
      }
    }

    // Batch create in transaction
    await this.prisma.$transaction([
      this.prisma.ticket.createMany({ data: ticketsToCreate }),
      // Update batch statuses to OPEN
      this.prisma.ticketBatch.updateMany({
        where: { tenantId, eventId, status: 'PLANNING' },
        data: { status: 'OPEN' },
      }),
    ]);

    return { generated: totalGenerated };
  }

  async listByEvent(
    tenantId: string,
    eventId: string,
    params: { page?: number; size?: number; status?: string; batchId?: string },
  ): Promise<{ items: TicketDocument[]; total: number }> {
    const page = params.page || 1;
    const size = params.size || 50;
    const where: any = { tenantId, eventId };
    if (params.status) where.status = params.status;
    if (params.batchId) where.batchId = params.batchId;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.ticket.findMany({
        where,
        orderBy: { code: 'asc' },
        skip: (page - 1) * size,
        take: size,
      }),
      this.prisma.ticket.count({ where }),
    ]);

    return { items: items.map((t) => this.toDocument(t)), total };
  }

  async getInventory(tenantId: string, eventId: string): Promise<TicketInventoryDocument> {
    const [counts, batches] = await this.prisma.$transaction([
      this.prisma.ticket.groupBy({
        by: ['status'],
        where: { tenantId, eventId },
        orderBy: { status: 'asc' },
        _count: { _all: true },
      }),
      this.prisma.ticketBatch.findMany({
        where: { tenantId, eventId },
        orderBy: { sortOrder: 'asc' },
        include: {
          tickets: {
            select: { status: true },
          },
        },
      }),
    ]);

    const statusMap: Record<string, number> = {};
    for (const c of counts) {
      statusMap[c.status] = (c._count as any)?._all ?? 0;
    }

    const total = Object.values(statusMap).reduce((a, b) => a + b, 0);

    return {
      total,
      available: statusMap['AVAILABLE'] || 0,
      reserved: statusMap['RESERVED'] || 0,
      sold: statusMap['SOLD'] || 0,
      used: statusMap['USED'] || 0,
      cancelled: statusMap['CANCELLED'] || 0,
      byBatch: batches.map((b) => {
        const batchTickets = b.tickets || [];
        return {
          batchId: b.id,
          batchName: b.name,
          total: batchTickets.length,
          available: batchTickets.filter((t) => t.status === 'AVAILABLE').length,
          sold: batchTickets.filter((t) => t.status === 'SOLD').length,
        };
      }),
    };
  }

  async reserve(tenantId: string, ticketId: string, holderId: string): Promise<TicketDocument> {
    const ticket = await this.prisma.ticket.update({
      where: { id: ticketId },
      data: { status: 'RESERVED', holderId, reservedAt: new Date() },
    });
    return this.toDocument(ticket);
  }

  async sell(tenantId: string, ticketId: string): Promise<TicketDocument> {
    const ticket = await this.prisma.ticket.update({
      where: { id: ticketId },
      data: { status: 'SOLD', soldAt: new Date() },
    });
    return this.toDocument(ticket);
  }

  async cancel(tenantId: string, ticketId: string): Promise<TicketDocument> {
    const ticket = await this.prisma.ticket.update({
      where: { id: ticketId },
      data: { status: 'CANCELLED', holderId: null },
    });
    return this.toDocument(ticket);
  }

  private toDocument(ticket: any): TicketDocument {
    return {
      id: ticket.id,
      tenantId: ticket.tenantId,
      eventId: ticket.eventId,
      batchId: ticket.batchId,
      code: ticket.code,
      price: ticket.price,
      status: ticket.status,
      holderId: ticket.holderId,
      reservedAt: ticket.reservedAt ? ticket.reservedAt.toISOString() : null,
      soldAt: ticket.soldAt ? ticket.soldAt.toISOString() : null,
      usedAt: ticket.usedAt ? ticket.usedAt.toISOString() : null,
      createdAt: ticket.createdAt.toISOString(),
      updatedAt: ticket.updatedAt.toISOString(),
    };
  }
}

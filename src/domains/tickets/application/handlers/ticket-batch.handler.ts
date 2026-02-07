import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/persistence/prisma.service';

export interface TicketBatchDocument {
  id: string;
  tenantId: string;
  eventId: string;
  name: string;
  price: number;
  quantity: number;
  openDate: string;
  closeDate: string | null;
  sortOrder: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class TicketBatchHandler {
  constructor(private readonly prisma: PrismaService) {}

  async listByEvent(tenantId: string, eventId: string): Promise<TicketBatchDocument[]> {
    const batches = await this.prisma.ticketBatch.findMany({
      where: { tenantId, eventId },
      orderBy: { sortOrder: 'asc' },
    });
    return batches.map((b) => this.toDocument(b));
  }

  async create(
    tenantId: string,
    eventId: string,
    data: { name: string; price: number; quantity: number; openDate: Date; closeDate?: Date },
  ): Promise<TicketBatchDocument> {
    const maxOrder = await this.prisma.ticketBatch.aggregate({
      where: { tenantId, eventId },
      _max: { sortOrder: true },
    });

    const batch = await this.prisma.ticketBatch.create({
      data: {
        tenantId,
        eventId,
        name: data.name,
        price: data.price,
        quantity: data.quantity,
        openDate: data.openDate,
        closeDate: data.closeDate || null,
        sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
        status: 'PLANNING',
      },
    });
    return this.toDocument(batch);
  }

  async update(
    tenantId: string,
    id: string,
    data: { name?: string; price?: number; quantity?: number; openDate?: Date; closeDate?: Date },
  ): Promise<TicketBatchDocument> {
    const batch = await this.prisma.ticketBatch.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.price !== undefined && { price: data.price }),
        ...(data.quantity !== undefined && { quantity: data.quantity }),
        ...(data.openDate !== undefined && { openDate: data.openDate }),
        ...(data.closeDate !== undefined && { closeDate: data.closeDate }),
      },
    });
    return this.toDocument(batch);
  }

  async remove(tenantId: string, id: string): Promise<void> {
    await this.prisma.ticketBatch.delete({ where: { id } });
  }

  async reorder(tenantId: string, eventId: string, batchIds: string[]): Promise<void> {
    await this.prisma.$transaction(
      batchIds.map((id, index) =>
        this.prisma.ticketBatch.update({
          where: { id },
          data: { sortOrder: index },
        }),
      ),
    );
  }

  private toDocument(batch: any): TicketBatchDocument {
    return {
      id: batch.id,
      tenantId: batch.tenantId,
      eventId: batch.eventId,
      name: batch.name,
      price: batch.price,
      quantity: batch.quantity,
      openDate: batch.openDate.toISOString(),
      closeDate: batch.closeDate ? batch.closeDate.toISOString() : null,
      sortOrder: batch.sortOrder,
      status: batch.status,
      createdAt: batch.createdAt.toISOString(),
      updatedAt: batch.updatedAt.toISOString(),
    };
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@infrastructure/persistence/prisma.service';
import {
  OutboxRepositoryPort,
  OutboxEventData,
  TransactionContext,
} from '../../domain';

type PrismaClient = PrismaService | Parameters<Parameters<PrismaService['$transaction']>[0]>[0];

@Injectable()
export class OutboxRepository implements OutboxRepositoryPort {
  private readonly logger = new Logger(OutboxRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  private getClient(ctx?: TransactionContext): PrismaClient {
    return ctx?.tx as PrismaClient ?? this.prisma;
  }

  async enqueue(
    event: OutboxEventData,
    ctx?: TransactionContext,
  ): Promise<string> {
    const client = this.getClient(ctx);

    const record = await client.outboxEvent.create({
      data: {
        tenantId: event.tenantId,
        aggregateType: event.aggregateType,
        aggregateId: event.aggregateId,
        eventType: event.eventType,
        payload: event.payload as Prisma.InputJsonValue,
        status: 'PENDING',
        retryCount: 0,
        maxRetries: 3,
      },
    });

    this.logger.debug(
      `Enqueued outbox event: ${event.eventType} for ${event.aggregateType}:${event.aggregateId}`,
    );

    return record.id;
  }

  async pullPending(batchSize: number): Promise<
    Array<{
      id: string;
      eventType: string;
      payload: Record<string, unknown>;
      tenantId: string;
    }>
  > {
    // Use SKIP LOCKED to avoid contention
    const records = await this.prisma.$queryRaw<
      Array<{
        id: string;
        event_type: string;
        payload: unknown;
        tenant_id: string;
      }>
    >`
      SELECT id, event_type, payload, tenant_id
      FROM outbox_events
      WHERE status = 'PENDING'
        AND scheduled_at <= NOW()
      ORDER BY created_at ASC
      LIMIT ${batchSize}
      FOR UPDATE SKIP LOCKED
    `;

    return records.map((record) => ({
      id: record.id,
      eventType: record.event_type,
      payload: record.payload as Record<string, unknown>,
      tenantId: record.tenant_id ?? '',
    }));
  }

  async markPublished(id: string): Promise<void> {
    await this.prisma.outboxEvent.update({
      where: { id },
      data: {
        status: 'PUBLISHED',
        retryCount: { increment: 1 },
        processedAt: new Date(),
      },
    });
  }

  async markFailed(id: string, nextAttemptAt: Date): Promise<void> {
    await this.prisma.outboxEvent.update({
      where: { id },
      data: {
        status: 'PENDING', // Keep pending for retry
        retryCount: { increment: 1 },
        scheduledAt: nextAttemptAt,
        lastError: 'Failed to publish event',
      },
    });
  }
}

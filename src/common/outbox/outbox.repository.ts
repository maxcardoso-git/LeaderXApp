import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import {
  OutboxEvent,
  OutboxStatus,
  CreateOutboxEventDto,
} from './outbox.interface';

@Injectable()
export class OutboxRepository {
  private readonly logger = new Logger(OutboxRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new outbox event
   */
  async create(dto: CreateOutboxEventDto): Promise<OutboxEvent> {
    const record = await this.prisma.outboxEvent.create({
      data: {
        eventType: dto.eventType,
        aggregateType: dto.aggregateType,
        aggregateId: dto.aggregateId,
        correlationId: dto.correlationId,
        payload: dto.payload as object,
        metadata: dto.metadata as object | undefined,
        status: OutboxStatus.PENDING,
        retryCount: 0,
        maxRetries: 5,
        scheduledAt: new Date(),
      },
    });

    return this.mapToOutboxEvent(record);
  }

  /**
   * Fetch pending events with SKIP LOCKED for concurrent safety
   * This ensures multiple workers don't process the same events
   */
  async fetchPendingWithLock(limit: number = 10): Promise<OutboxEvent[]> {
    // Use raw query with FOR UPDATE SKIP LOCKED
    const events = await this.prisma.$queryRaw<OutboxEvent[]>`
      WITH claimed AS (
        SELECT id
        FROM outbox_events
        WHERE status = ${OutboxStatus.PENDING}
          AND scheduled_at <= NOW()
        ORDER BY created_at ASC
        LIMIT ${limit}
        FOR UPDATE SKIP LOCKED
      )
      UPDATE outbox_events
      SET status = ${OutboxStatus.PROCESSING},
          updated_at = NOW()
      FROM claimed
      WHERE outbox_events.id = claimed.id
      RETURNING
        outbox_events.id,
        outbox_events.event_type as "eventType",
        outbox_events.aggregate_type as "aggregateType",
        outbox_events.aggregate_id as "aggregateId",
        outbox_events.correlation_id as "correlationId",
        outbox_events.payload,
        outbox_events.metadata,
        outbox_events.status,
        outbox_events.retry_count as "retryCount",
        outbox_events.max_retries as "maxRetries",
        outbox_events.last_error as "lastError",
        outbox_events.processed_at as "processedAt",
        outbox_events.scheduled_at as "scheduledAt",
        outbox_events.created_at as "createdAt",
        outbox_events.updated_at as "updatedAt"
    `;

    return events;
  }

  /**
   * Mark an event as published
   */
  async markPublished(id: string): Promise<void> {
    await this.prisma.outboxEvent.update({
      where: { id },
      data: {
        status: OutboxStatus.PUBLISHED,
        processedAt: new Date(),
      },
    });
  }

  /**
   * Mark an event for retry with exponential backoff
   */
  async markForRetry(id: string, error: string): Promise<void> {
    const event = await this.prisma.outboxEvent.findUnique({ where: { id } });

    if (!event) return;

    const newRetryCount = event.retryCount + 1;
    const isDeadLetter = newRetryCount >= event.maxRetries;

    // Exponential backoff: 1min, 2min, 4min, 8min, 16min
    const delayMs = Math.pow(2, newRetryCount) * 60 * 1000;
    const scheduledAt = new Date(Date.now() + delayMs);

    await this.prisma.outboxEvent.update({
      where: { id },
      data: {
        status: isDeadLetter ? OutboxStatus.DEAD : OutboxStatus.PENDING,
        retryCount: newRetryCount,
        lastError: error,
        scheduledAt: isDeadLetter ? undefined : scheduledAt,
      },
    });

    if (isDeadLetter) {
      this.logger.error(
        `Outbox event ${id} moved to dead letter after ${newRetryCount} retries`,
      );
    }
  }

  /**
   * Mark an event as dead (max retries exceeded)
   */
  async markDead(id: string, error: string): Promise<void> {
    await this.prisma.outboxEvent.update({
      where: { id },
      data: {
        status: OutboxStatus.DEAD,
        lastError: error,
      },
    });
  }

  /**
   * Get dead letter events for manual reprocessing
   */
  async getDeadLetterEvents(limit: number = 100): Promise<OutboxEvent[]> {
    const records = await this.prisma.outboxEvent.findMany({
      where: { status: OutboxStatus.DEAD },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });

    return records.map(this.mapToOutboxEvent);
  }

  /**
   * Reprocess a dead letter event
   */
  async reprocessDeadLetter(id: string): Promise<void> {
    await this.prisma.outboxEvent.update({
      where: { id },
      data: {
        status: OutboxStatus.PENDING,
        retryCount: 0,
        lastError: null,
        scheduledAt: new Date(),
      },
    });
  }

  /**
   * Delete old published events (retention policy)
   */
  async deletePublished(retentionDays: number = 14): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const result = await this.prisma.outboxEvent.deleteMany({
      where: {
        status: OutboxStatus.PUBLISHED,
        createdAt: {
          lt: cutoffDate,
        },
      },
    });

    if (result.count > 0) {
      this.logger.log(`Deleted ${result.count} old published outbox events`);
    }

    return result.count;
  }

  private mapToOutboxEvent(record: {
    id: string;
    eventType: string;
    aggregateType: string;
    aggregateId: string;
    correlationId: string | null;
    payload: unknown;
    metadata: unknown;
    status: string;
    retryCount: number;
    maxRetries: number;
    lastError: string | null;
    processedAt: Date | null;
    scheduledAt: Date;
    createdAt: Date;
    updatedAt: Date;
  }): OutboxEvent {
    return {
      id: record.id,
      eventType: record.eventType,
      aggregateType: record.aggregateType,
      aggregateId: record.aggregateId,
      correlationId: record.correlationId ?? undefined,
      payload: record.payload as Record<string, unknown>,
      metadata: (record.metadata as Record<string, unknown>) ?? undefined,
      status: record.status as OutboxStatus,
      retryCount: record.retryCount,
      maxRetries: record.maxRetries,
      lastError: record.lastError ?? undefined,
      processedAt: record.processedAt ?? undefined,
      scheduledAt: record.scheduledAt,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }
}

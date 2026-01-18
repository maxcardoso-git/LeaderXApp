import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/persistence/prisma.service';
import { ReservationPolicy } from '../../domain/entities';
import { PolicyRepositoryPort } from '../../domain/ports';
import { ResourceType, TransactionContext } from '../../domain/value-objects';

type PrismaClient =
  | PrismaService
  | Parameters<Parameters<PrismaService['$transaction']>[0]>[0];

@Injectable()
export class PolicyRepository implements PolicyRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  private getClient(ctx?: TransactionContext): PrismaClient {
    return (ctx?.tx as PrismaClient) ?? this.prisma;
  }

  async findById(
    tenantId: string,
    policyId: string,
    ctx?: TransactionContext,
  ): Promise<ReservationPolicy | null> {
    const client = this.getClient(ctx);

    const record = await client.reservationPolicy.findFirst({
      where: {
        id: policyId,
        tenantId,
      },
    });

    if (!record) return null;
    return this.toDomain(record);
  }

  async findActiveByEventAndType(
    tenantId: string,
    eventId: string,
    resourceType: ResourceType,
    ctx?: TransactionContext,
  ): Promise<ReservationPolicy | null> {
    const client = this.getClient(ctx);

    const record = await client.reservationPolicy.findFirst({
      where: {
        tenantId,
        eventId,
        resourceType,
        isActive: true,
      },
    });

    if (!record) return null;
    return this.toDomain(record);
  }

  async findByEvent(
    tenantId: string,
    eventId: string,
    ctx?: TransactionContext,
  ): Promise<ReservationPolicy[]> {
    const client = this.getClient(ctx);

    const records = await client.reservationPolicy.findMany({
      where: {
        tenantId,
        eventId,
      },
    });

    return records.map((r) => this.toDomain(r));
  }

  private toDomain(record: {
    id: string;
    tenantId: string;
    eventId: string;
    resourceType: string;
    costInPoints: number;
    maxPerUser: number;
    requiresApproval: boolean;
    holdTtlSeconds: number;
    windowStart: Date | null;
    windowEnd: Date | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): ReservationPolicy {
    return ReservationPolicy.reconstitute({
      id: record.id,
      tenantId: record.tenantId,
      eventId: record.eventId,
      resourceType: record.resourceType as ResourceType,
      costInPoints: record.costInPoints,
      maxPerUser: record.maxPerUser,
      requiresApproval: record.requiresApproval,
      holdTtlSeconds: record.holdTtlSeconds,
      windowStart: record.windowStart,
      windowEnd: record.windowEnd,
      isActive: record.isActive,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}

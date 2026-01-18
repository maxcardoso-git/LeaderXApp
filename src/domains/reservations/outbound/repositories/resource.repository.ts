import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/persistence/prisma.service';
import { ReservableResource } from '../../domain/entities';
import { ResourceRepositoryPort } from '../../domain/ports';
import { ResourceType, TransactionContext } from '../../domain/value-objects';

type PrismaClient =
  | PrismaService
  | Parameters<Parameters<PrismaService['$transaction']>[0]>[0];

@Injectable()
export class ResourceRepository implements ResourceRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  private getClient(ctx?: TransactionContext): PrismaClient {
    return (ctx?.tx as PrismaClient) ?? this.prisma;
  }

  async findById(
    tenantId: string,
    resourceId: string,
    ctx?: TransactionContext,
  ): Promise<ReservableResource | null> {
    const client = this.getClient(ctx);

    const record = await client.reservableResource.findFirst({
      where: {
        id: resourceId,
        tenantId,
      },
    });

    if (!record) return null;
    return this.toDomain(record);
  }

  async findByEvent(
    tenantId: string,
    eventId: string,
    resourceType?: ResourceType,
    ctx?: TransactionContext,
  ): Promise<ReservableResource[]> {
    const client = this.getClient(ctx);

    const where: Record<string, unknown> = {
      tenantId,
      eventId,
      isActive: true,
    };

    if (resourceType) {
      where.resourceType = resourceType;
    }

    const records = await client.reservableResource.findMany({ where });
    return records.map((r) => this.toDomain(r));
  }

  async lockForUpdate(
    tenantId: string,
    resourceId: string,
    ctx: TransactionContext,
  ): Promise<void> {
    const client = this.getClient(ctx);

    await client.$queryRaw`
      SELECT 1 FROM reservable_resources WHERE id = ${resourceId} FOR UPDATE
    `;
  }

  private toDomain(record: {
    id: string;
    tenantId: string;
    eventId: string;
    resourceType: string;
    name: string;
    capacityTotal: number;
    metadata: unknown;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): ReservableResource {
    return ReservableResource.reconstitute({
      id: record.id,
      tenantId: record.tenantId,
      eventId: record.eventId,
      resourceType: record.resourceType as ResourceType,
      name: record.name,
      capacityTotal: record.capacityTotal,
      metadata: record.metadata as Record<string, unknown> | undefined,
      isActive: record.isActive,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}

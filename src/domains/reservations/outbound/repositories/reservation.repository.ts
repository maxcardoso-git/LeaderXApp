import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@infrastructure/persistence/prisma.service';
import { Reservation } from '../../domain/aggregates';
import {
  ReservationRepositoryPort,
  FindReservationFilter,
  ListReservationsFilter,
  PaginationOptions,
  PaginatedResult,
} from '../../domain/ports';
import {
  ResourceType,
  ReservationOwnerType,
  ReservationStatus,
  TransactionContext,
} from '../../domain/value-objects';

type PrismaClient =
  | PrismaService
  | Parameters<Parameters<PrismaService['$transaction']>[0]>[0];

@Injectable()
export class ReservationRepository implements ReservationRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  private getClient(ctx?: TransactionContext): PrismaClient {
    return (ctx?.tx as PrismaClient) ?? this.prisma;
  }

  async findById(
    tenantId: string,
    reservationId: string,
    ctx?: TransactionContext,
  ): Promise<Reservation | null> {
    const client = this.getClient(ctx);

    const record = await client.reservation.findFirst({
      where: {
        id: reservationId,
        tenantId,
      },
    });

    if (!record) return null;
    return this.toDomain(record);
  }

  async findByFilter(
    filter: FindReservationFilter,
    ctx?: TransactionContext,
  ): Promise<Reservation[]> {
    const client = this.getClient(ctx);

    const where: Record<string, unknown> = {
      tenantId: filter.tenantId,
    };

    if (filter.eventId) where.eventId = filter.eventId;
    if (filter.resourceId) where.resourceId = filter.resourceId;
    if (filter.ownerId) where.ownerId = filter.ownerId;

    if (filter.status) {
      if (Array.isArray(filter.status)) {
        where.status = { in: filter.status };
      } else {
        where.status = filter.status;
      }
    }

    const records = await client.reservation.findMany({ where });
    return records.map((r) => this.toDomain(r));
  }

  async countActiveByResource(
    tenantId: string,
    resourceId: string,
    ctx?: TransactionContext,
  ): Promise<number> {
    const client = this.getClient(ctx);

    return client.reservation.count({
      where: {
        tenantId,
        resourceId,
        status: {
          in: [ReservationStatus.HOLD, ReservationStatus.CONFIRMED],
        },
      },
    });
  }

  async countActiveByOwner(
    tenantId: string,
    eventId: string,
    ownerId: string,
    resourceType: ResourceType,
    ctx?: TransactionContext,
  ): Promise<number> {
    const client = this.getClient(ctx);

    return client.reservation.count({
      where: {
        tenantId,
        eventId,
        ownerId,
        resourceType,
        status: {
          in: [ReservationStatus.HOLD, ReservationStatus.CONFIRMED],
        },
      },
    });
  }

  async findExpiredHolds(
    batchSize: number,
    ctx?: TransactionContext,
  ): Promise<Reservation[]> {
    const client = this.getClient(ctx);

    const now = new Date();

    // Use raw query with SKIP LOCKED for concurrent job processing
    const records = await client.$queryRaw<
      Array<{
        id: string;
        tenant_id: string;
        event_id: string;
        resource_id: string;
        resource_type: string;
        policy_id: string;
        owner_id: string;
        owner_type: string;
        status: string;
        points_hold_id: string | null;
        expires_at: Date | null;
        confirmed_at: Date | null;
        released_at: Date | null;
        metadata: unknown;
        created_at: Date;
        updated_at: Date;
      }>
    >`
      SELECT * FROM reservations
      WHERE status = 'HOLD'
        AND expires_at <= ${now}
      ORDER BY expires_at ASC
      LIMIT ${batchSize}
      FOR UPDATE SKIP LOCKED
    `;

    return records.map((r) =>
      this.toDomain({
        id: r.id,
        tenantId: r.tenant_id,
        eventId: r.event_id,
        resourceId: r.resource_id,
        resourceType: r.resource_type,
        policyId: r.policy_id,
        ownerId: r.owner_id,
        ownerType: r.owner_type,
        status: r.status,
        pointsHoldId: r.points_hold_id,
        expiresAt: r.expires_at,
        confirmedAt: r.confirmed_at,
        releasedAt: r.released_at,
        metadata: r.metadata,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      }),
    );
  }

  async list(
    filter: ListReservationsFilter,
    pagination: PaginationOptions,
    ctx?: TransactionContext,
  ): Promise<PaginatedResult<Reservation>> {
    const client = this.getClient(ctx);

    const where: Record<string, unknown> = {
      tenantId: filter.tenantId,
    };

    if (filter.eventId) where.eventId = filter.eventId;
    if (filter.resourceId) where.resourceId = filter.resourceId;
    if (filter.ownerId) where.ownerId = filter.ownerId;
    if (filter.status) where.status = filter.status;

    const [records, total] = await Promise.all([
      client.reservation.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: pagination.page * pagination.size,
        take: pagination.size,
      }),
      client.reservation.count({ where }),
    ]);

    return {
      items: records.map((r) => this.toDomain(r)),
      page: pagination.page,
      size: pagination.size,
      total,
    };
  }

  async create(
    reservation: Reservation,
    ctx?: TransactionContext,
  ): Promise<void> {
    const client = this.getClient(ctx);

    await client.reservation.create({
      data: {
        id: reservation.id,
        tenantId: reservation.tenantId,
        eventId: reservation.eventId,
        resourceId: reservation.resourceId,
        resourceType: reservation.resourceType,
        policyId: reservation.policyId,
        ownerId: reservation.ownerId,
        ownerType: reservation.ownerType,
        status: reservation.status,
        pointsHoldId: reservation.pointsHoldId,
        expiresAt: reservation.expiresAt,
        confirmedAt: reservation.confirmedAt,
        releasedAt: reservation.releasedAt,
        metadata: reservation.metadata as Prisma.InputJsonValue ?? undefined,
        createdAt: reservation.createdAt,
        updatedAt: reservation.updatedAt,
      },
    });
  }

  async update(
    reservation: Reservation,
    ctx?: TransactionContext,
  ): Promise<void> {
    const client = this.getClient(ctx);

    await client.reservation.update({
      where: { id: reservation.id },
      data: {
        status: reservation.status,
        pointsHoldId: reservation.pointsHoldId,
        expiresAt: reservation.expiresAt,
        confirmedAt: reservation.confirmedAt,
        releasedAt: reservation.releasedAt,
        updatedAt: reservation.updatedAt,
      },
    });
  }

  async lockForUpdate(
    tenantId: string,
    reservationId: string,
    ctx: TransactionContext,
  ): Promise<void> {
    const client = this.getClient(ctx);

    await client.$queryRaw`
      SELECT 1 FROM reservations WHERE id = ${reservationId} FOR UPDATE
    `;
  }

  private toDomain(record: {
    id: string;
    tenantId: string;
    eventId: string;
    resourceId: string;
    resourceType: string;
    policyId: string;
    ownerId: string;
    ownerType: string;
    status: string;
    pointsHoldId: string | null;
    expiresAt: Date | null;
    confirmedAt: Date | null;
    releasedAt: Date | null;
    metadata: unknown;
    createdAt: Date;
    updatedAt: Date;
  }): Reservation {
    return Reservation.reconstitute({
      id: record.id,
      tenantId: record.tenantId,
      eventId: record.eventId,
      resourceId: record.resourceId,
      resourceType: record.resourceType as ResourceType,
      policyId: record.policyId,
      ownerId: record.ownerId,
      ownerType: record.ownerType as ReservationOwnerType,
      status: record.status as ReservationStatus,
      pointsHoldId: record.pointsHoldId,
      expiresAt: record.expiresAt,
      confirmedAt: record.confirmedAt,
      releasedAt: record.releasedAt,
      metadata: record.metadata as Record<string, unknown> | undefined,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}

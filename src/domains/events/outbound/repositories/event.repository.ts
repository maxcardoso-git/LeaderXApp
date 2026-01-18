import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@infrastructure/persistence/prisma.service';
import {
  EventRepositoryPort,
  FindEventsFilter,
  PaginationOptions,
  PaginatedResult,
  TransactionContext,
} from '../../domain/ports';
import { EventAggregate } from '../../domain/aggregates';
import {
  EventPhase,
  EventTable,
  EventSeat,
  EventPolicyBinding,
} from '../../domain/entities';
import {
  EventStatus,
  EventVisibility,
  ReservationMode,
  PolicyScope,
} from '../../domain/value-objects';

@Injectable()
export class EventRepository implements EventRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  private getClient(ctx?: TransactionContext) {
    return ctx?.tx ?? this.prisma;
  }

  async findById(
    tenantId: string,
    eventId: string,
    ctx?: TransactionContext,
  ): Promise<EventAggregate | null> {
    const client = this.getClient(ctx) as typeof this.prisma;

    const record = await client.event.findFirst({
      where: { id: eventId, tenantId },
    });

    if (!record) return null;

    return this.toDomain(record);
  }

  async findByIdWithRelations(
    tenantId: string,
    eventId: string,
    ctx?: TransactionContext,
  ): Promise<EventAggregate | null> {
    const client = this.getClient(ctx) as typeof this.prisma;

    const record = await client.event.findFirst({
      where: { id: eventId, tenantId },
      include: {
        phases: { orderBy: { sortOrder: 'asc' } },
        tables: {
          include: {
            seats: { orderBy: { seatNumber: 'asc' } },
          },
        },
        policyBindings: true,
      },
    });

    if (!record) return null;

    return this.toDomainWithRelations(record);
  }

  async list(
    filter: FindEventsFilter,
    pagination: PaginationOptions,
    ctx?: TransactionContext,
  ): Promise<PaginatedResult<EventAggregate>> {
    const client = this.getClient(ctx) as typeof this.prisma;

    const where: Record<string, unknown> = {
      tenantId: filter.tenantId,
    };

    if (filter.status) {
      where.status = filter.status;
    }
    if (filter.visibility) {
      where.visibility = filter.visibility;
    }
    if (filter.startsAfter) {
      where.startsAt = { gte: filter.startsAfter };
    }
    if (filter.startsBefore) {
      where.startsAt = { ...((where.startsAt as object) || {}), lte: filter.startsBefore };
    }
    if (filter.search) {
      where.OR = [
        { name: { contains: filter.search, mode: 'insensitive' } },
        { description: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    const [records, total] = await Promise.all([
      client.event.findMany({
        where,
        skip: (pagination.page - 1) * pagination.size,
        take: pagination.size,
        orderBy: { startsAt: 'asc' },
      }),
      client.event.count({ where }),
    ]);

    return {
      items: records.map((r) => this.toDomain(r)),
      total,
      page: pagination.page,
      size: pagination.size,
    };
  }

  async listPublic(
    tenantId: string,
    pagination: PaginationOptions,
    ctx?: TransactionContext,
  ): Promise<PaginatedResult<EventAggregate>> {
    const client = this.getClient(ctx) as typeof this.prisma;

    const where = {
      tenantId,
      visibility: EventVisibility.PUBLIC,
      status: {
        in: [EventStatus.PUBLISHED, EventStatus.ACTIVE],
      },
    };

    const [records, total] = await Promise.all([
      client.event.findMany({
        where,
        skip: (pagination.page - 1) * pagination.size,
        take: pagination.size,
        orderBy: { startsAt: 'asc' },
      }),
      client.event.count({ where }),
    ]);

    return {
      items: records.map((r) => this.toDomain(r)),
      total,
      page: pagination.page,
      size: pagination.size,
    };
  }

  async create(event: EventAggregate, ctx?: TransactionContext): Promise<void> {
    const client = this.getClient(ctx) as typeof this.prisma;
    const data = event.toPersistence();

    await client.event.create({
      data: {
        id: data.id as string,
        tenantId: data.tenantId as string,
        name: data.name as string,
        description: data.description as string | undefined,
        status: data.status as string,
        visibility: data.visibility as string,
        reservationMode: data.reservationMode as string,
        startsAt: data.startsAt as Date,
        endsAt: data.endsAt as Date,
        metadata: data.metadata as Prisma.InputJsonValue | undefined,
      },
    });
  }

  async update(event: EventAggregate, ctx?: TransactionContext): Promise<void> {
    const client = this.getClient(ctx) as typeof this.prisma;
    const data = event.toPersistence();

    await client.event.update({
      where: { id: data.id as string },
      data: {
        name: data.name as string,
        description: data.description as string | undefined,
        status: data.status as string,
        visibility: data.visibility as string,
        reservationMode: data.reservationMode as string,
        startsAt: data.startsAt as Date,
        endsAt: data.endsAt as Date,
        metadata: data.metadata as Prisma.InputJsonValue | undefined,
        updatedAt: data.updatedAt as Date,
      },
    });
  }

  async saveWithRelations(
    event: EventAggregate,
    ctx?: TransactionContext,
  ): Promise<void> {
    const client = this.getClient(ctx) as typeof this.prisma;
    const data = event.toPersistence();

    // Update main event
    await client.event.upsert({
      where: { id: data.id as string },
      create: {
        id: data.id as string,
        tenantId: data.tenantId as string,
        name: data.name as string,
        description: data.description as string | undefined,
        status: data.status as string,
        visibility: data.visibility as string,
        reservationMode: data.reservationMode as string,
        startsAt: data.startsAt as Date,
        endsAt: data.endsAt as Date,
        metadata: data.metadata as Prisma.InputJsonValue | undefined,
      },
      update: {
        name: data.name as string,
        description: data.description as string | undefined,
        status: data.status as string,
        visibility: data.visibility as string,
        reservationMode: data.reservationMode as string,
        startsAt: data.startsAt as Date,
        endsAt: data.endsAt as Date,
        metadata: data.metadata as Prisma.InputJsonValue | undefined,
        updatedAt: data.updatedAt as Date,
      },
    });

    // Sync phases
    const existingPhaseIds = (
      await client.eventPhase.findMany({
        where: { eventId: event.id },
        select: { id: true },
      })
    ).map((p) => p.id);

    const currentPhaseIds = event.phases.map((p) => p.id);
    const phaseIdsToDelete = existingPhaseIds.filter(
      (id) => !currentPhaseIds.includes(id),
    );

    if (phaseIdsToDelete.length > 0) {
      await client.eventPhase.deleteMany({
        where: { id: { in: phaseIdsToDelete } },
      });
    }

    for (const phase of event.phases) {
      const phaseData = phase.toPersistence();
      await client.eventPhase.upsert({
        where: { id: phaseData.id as string },
        create: {
          id: phaseData.id as string,
          tenantId: phaseData.tenantId as string,
          eventId: phaseData.eventId as string,
          name: phaseData.name as string,
          startsAt: phaseData.startsAt as Date,
          endsAt: phaseData.endsAt as Date,
          sortOrder: phaseData.sortOrder as number,
          metadata: phaseData.metadata as Prisma.InputJsonValue | undefined,
        },
        update: {
          name: phaseData.name as string,
          startsAt: phaseData.startsAt as Date,
          endsAt: phaseData.endsAt as Date,
          sortOrder: phaseData.sortOrder as number,
          metadata: phaseData.metadata as Prisma.InputJsonValue | undefined,
        },
      });
    }

    // Sync tables and seats
    const existingTableIds = (
      await client.eventTable.findMany({
        where: { eventId: event.id },
        select: { id: true },
      })
    ).map((t) => t.id);

    const currentTableIds = event.tables.map((t) => t.id);
    const tableIdsToDelete = existingTableIds.filter(
      (id) => !currentTableIds.includes(id),
    );

    if (tableIdsToDelete.length > 0) {
      await client.eventSeat.deleteMany({
        where: { tableId: { in: tableIdsToDelete } },
      });
      await client.eventTable.deleteMany({
        where: { id: { in: tableIdsToDelete } },
      });
    }

    for (const table of event.tables) {
      const tableData = table.toPersistence();
      await client.eventTable.upsert({
        where: { id: tableData.id as string },
        create: {
          id: tableData.id as string,
          tenantId: tableData.tenantId as string,
          eventId: tableData.eventId as string,
          name: tableData.name as string,
          capacity: tableData.capacity as number,
          metadata: tableData.metadata as Prisma.InputJsonValue | undefined,
        },
        update: {
          name: tableData.name as string,
          capacity: tableData.capacity as number,
          metadata: tableData.metadata as Prisma.InputJsonValue | undefined,
        },
      });

      // Sync seats for this table
      const existingSeatIds = (
        await client.eventSeat.findMany({
          where: { tableId: table.id },
          select: { id: true },
        })
      ).map((s) => s.id);

      const currentSeatIds = table.seats.map((s) => s.id);
      const seatIdsToDelete = existingSeatIds.filter(
        (id) => !currentSeatIds.includes(id),
      );

      if (seatIdsToDelete.length > 0) {
        await client.eventSeat.deleteMany({
          where: { id: { in: seatIdsToDelete } },
        });
      }

      for (const seat of table.seats) {
        const seatData = seat.toPersistence();
        await client.eventSeat.upsert({
          where: { id: seatData.id as string },
          create: {
            id: seatData.id as string,
            tenantId: seatData.tenantId as string,
            eventId: seatData.eventId as string,
            tableId: seatData.tableId as string,
            seatNumber: seatData.seatNumber as number,
            metadata: seatData.metadata as Prisma.InputJsonValue | undefined,
          },
          update: {
            seatNumber: seatData.seatNumber as number,
            metadata: seatData.metadata as Prisma.InputJsonValue | undefined,
          },
        });
      }
    }

    // Sync policy bindings
    const existingBindingIds = (
      await client.eventPolicyBinding.findMany({
        where: { eventId: event.id },
        select: { id: true },
      })
    ).map((b) => b.id);

    const currentBindingIds = event.policyBindings.map((b) => b.id);
    const bindingIdsToDelete = existingBindingIds.filter(
      (id) => !currentBindingIds.includes(id),
    );

    if (bindingIdsToDelete.length > 0) {
      await client.eventPolicyBinding.deleteMany({
        where: { id: { in: bindingIdsToDelete } },
      });
    }

    for (const binding of event.policyBindings) {
      const bindingData = binding.toPersistence();
      await client.eventPolicyBinding.upsert({
        where: { id: bindingData.id as string },
        create: {
          id: bindingData.id as string,
          tenantId: bindingData.tenantId as string,
          eventId: bindingData.eventId as string,
          policyCode: bindingData.policyCode as string,
          scope: bindingData.scope as string,
          metadata: bindingData.metadata as Prisma.InputJsonValue | undefined,
        },
        update: {
          policyCode: bindingData.policyCode as string,
          scope: bindingData.scope as string,
          metadata: bindingData.metadata as Prisma.InputJsonValue | undefined,
        },
      });
    }
  }

  private toDomain(record: {
    id: string;
    tenantId: string;
    name: string;
    description: string | null;
    status: string;
    visibility: string;
    reservationMode: string;
    startsAt: Date;
    endsAt: Date;
    metadata: unknown;
    createdAt: Date;
    updatedAt: Date;
  }): EventAggregate {
    return EventAggregate.reconstitute({
      id: record.id,
      tenantId: record.tenantId,
      name: record.name,
      description: record.description ?? undefined,
      status: record.status as EventStatus,
      visibility: record.visibility as EventVisibility,
      reservationMode: record.reservationMode as ReservationMode,
      startsAt: record.startsAt,
      endsAt: record.endsAt,
      metadata: record.metadata as Record<string, unknown> | undefined,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  private toDomainWithRelations(record: {
    id: string;
    tenantId: string;
    name: string;
    description: string | null;
    status: string;
    visibility: string;
    reservationMode: string;
    startsAt: Date;
    endsAt: Date;
    metadata: unknown;
    createdAt: Date;
    updatedAt: Date;
    phases: Array<{
      id: string;
      tenantId: string;
      eventId: string;
      name: string;
      startsAt: Date;
      endsAt: Date;
      sortOrder: number;
      metadata: unknown;
      createdAt: Date;
      updatedAt: Date;
    }>;
    tables: Array<{
      id: string;
      tenantId: string;
      eventId: string;
      name: string;
      capacity: number;
      metadata: unknown;
      createdAt: Date;
      updatedAt: Date;
      seats: Array<{
        id: string;
        tenantId: string;
        eventId: string;
        tableId: string;
        seatNumber: number;
        metadata: unknown;
        createdAt: Date;
        updatedAt: Date;
      }>;
    }>;
    policyBindings: Array<{
      id: string;
      tenantId: string;
      eventId: string;
      policyCode: string;
      scope: string;
      metadata: unknown;
      createdAt: Date;
    }>;
  }): EventAggregate {
    const phases = record.phases.map((p) =>
      EventPhase.reconstitute({
        id: p.id,
        tenantId: p.tenantId,
        eventId: p.eventId,
        name: p.name,
        startsAt: p.startsAt,
        endsAt: p.endsAt,
        sortOrder: p.sortOrder,
        metadata: p.metadata as Record<string, unknown> | undefined,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      }),
    );

    const tables = record.tables.map((t) => {
      const seats = t.seats.map((s) =>
        EventSeat.reconstitute({
          id: s.id,
          tenantId: s.tenantId,
          eventId: s.eventId,
          tableId: s.tableId,
          seatNumber: s.seatNumber,
          metadata: s.metadata as Record<string, unknown> | undefined,
          createdAt: s.createdAt,
          updatedAt: s.updatedAt,
        }),
      );

      return EventTable.reconstitute({
        id: t.id,
        tenantId: t.tenantId,
        eventId: t.eventId,
        name: t.name,
        capacity: t.capacity,
        metadata: t.metadata as Record<string, unknown> | undefined,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
        seats,
      });
    });

    const policyBindings = record.policyBindings.map((b) =>
      EventPolicyBinding.reconstitute({
        id: b.id,
        tenantId: b.tenantId,
        eventId: b.eventId,
        policyCode: b.policyCode,
        scope: b.scope as PolicyScope,
        metadata: b.metadata as Record<string, unknown> | undefined,
        createdAt: b.createdAt,
      }),
    );

    return EventAggregate.reconstitute({
      id: record.id,
      tenantId: record.tenantId,
      name: record.name,
      description: record.description ?? undefined,
      status: record.status as EventStatus,
      visibility: record.visibility as EventVisibility,
      reservationMode: record.reservationMode as ReservationMode,
      startsAt: record.startsAt,
      endsAt: record.endsAt,
      metadata: record.metadata as Record<string, unknown> | undefined,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      phases,
      tables,
      policyBindings,
    });
  }
}

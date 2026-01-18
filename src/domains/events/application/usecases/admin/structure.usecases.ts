import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@infrastructure/persistence/prisma.service';
import { EventAggregate } from '../../../domain/aggregates';
import { EventPhase, EventTable, EventSeat, EventPolicyBinding } from '../../../domain/entities';
import { EventRepositoryPort, EVENT_REPOSITORY } from '../../../domain/ports';
import { PolicyScope } from '../../../domain/value-objects';
import { EventNotFoundError } from '../../errors';

// Phase Use Cases
export interface AddPhaseInput {
  tenantId: string;
  eventId: string;
  name: string;
  startsAt: Date;
  endsAt: Date;
  sortOrder?: number;
  metadata?: Record<string, unknown>;
  actorId?: string;
}

@Injectable()
export class AddEventPhaseUseCase {
  constructor(
    @Inject(EVENT_REPOSITORY) private readonly eventRepository: EventRepositoryPort,
    private readonly prisma: PrismaService,
  ) {}

  async execute(input: AddPhaseInput): Promise<{ event: EventAggregate; phase: EventPhase }> {
    return this.prisma.$transaction(async (tx) => {
      const event = await this.eventRepository.findByIdWithRelations(input.tenantId, input.eventId, { tx });
      if (!event) throw new EventNotFoundError(input.eventId);

      const phase = event.addPhase({
        name: input.name,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        sortOrder: input.sortOrder,
        metadata: input.metadata,
      });

      await this.eventRepository.saveWithRelations(event, { tx });

      for (const de of event.domainEvents) {
        await tx.outboxEvent.create({
          data: { tenantId: input.tenantId, aggregateType: 'EVENT', aggregateId: event.id, eventType: de.eventType, payload: de.payload as Prisma.InputJsonValue, metadata: { actorId: input.actorId } as Prisma.InputJsonValue },
        });
      }
      event.clearDomainEvents();
      return { event, phase };
    });
  }
}

export interface UpdatePhaseInput {
  tenantId: string;
  eventId: string;
  phaseId: string;
  name?: string;
  startsAt?: Date;
  endsAt?: Date;
  sortOrder?: number;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class UpdateEventPhaseUseCase {
  constructor(
    @Inject(EVENT_REPOSITORY) private readonly eventRepository: EventRepositoryPort,
    private readonly prisma: PrismaService,
  ) {}

  async execute(input: UpdatePhaseInput): Promise<{ event: EventAggregate }> {
    return this.prisma.$transaction(async (tx) => {
      const event = await this.eventRepository.findByIdWithRelations(input.tenantId, input.eventId, { tx });
      if (!event) throw new EventNotFoundError(input.eventId);

      event.updatePhase(input.phaseId, { name: input.name, startsAt: input.startsAt, endsAt: input.endsAt, sortOrder: input.sortOrder, metadata: input.metadata });
      await this.eventRepository.saveWithRelations(event, { tx });
      return { event };
    });
  }
}

@Injectable()
export class RemoveEventPhaseUseCase {
  constructor(
    @Inject(EVENT_REPOSITORY) private readonly eventRepository: EventRepositoryPort,
    private readonly prisma: PrismaService,
  ) {}

  async execute(input: { tenantId: string; eventId: string; phaseId: string }): Promise<{ event: EventAggregate }> {
    return this.prisma.$transaction(async (tx) => {
      const event = await this.eventRepository.findByIdWithRelations(input.tenantId, input.eventId, { tx });
      if (!event) throw new EventNotFoundError(input.eventId);

      event.removePhase(input.phaseId);
      await this.eventRepository.saveWithRelations(event, { tx });
      return { event };
    });
  }
}

// Table Use Cases
export interface AddTableInput {
  tenantId: string;
  eventId: string;
  name: string;
  capacity: number;
  metadata?: Record<string, unknown>;
  actorId?: string;
}

@Injectable()
export class AddEventTableUseCase {
  constructor(
    @Inject(EVENT_REPOSITORY) private readonly eventRepository: EventRepositoryPort,
    private readonly prisma: PrismaService,
  ) {}

  async execute(input: AddTableInput): Promise<{ event: EventAggregate; table: EventTable }> {
    return this.prisma.$transaction(async (tx) => {
      const event = await this.eventRepository.findByIdWithRelations(input.tenantId, input.eventId, { tx });
      if (!event) throw new EventNotFoundError(input.eventId);

      const table = event.addTable({ name: input.name, capacity: input.capacity, metadata: input.metadata });
      await this.eventRepository.saveWithRelations(event, { tx });

      for (const de of event.domainEvents) {
        await tx.outboxEvent.create({
          data: { tenantId: input.tenantId, aggregateType: 'EVENT', aggregateId: event.id, eventType: de.eventType, payload: de.payload as Prisma.InputJsonValue, metadata: { actorId: input.actorId } as Prisma.InputJsonValue },
        });
      }
      event.clearDomainEvents();
      return { event, table };
    });
  }
}

@Injectable()
export class UpdateEventTableUseCase {
  constructor(
    @Inject(EVENT_REPOSITORY) private readonly eventRepository: EventRepositoryPort,
    private readonly prisma: PrismaService,
  ) {}

  async execute(input: { tenantId: string; eventId: string; tableId: string; name?: string; capacity?: number; metadata?: Record<string, unknown> }): Promise<{ event: EventAggregate }> {
    return this.prisma.$transaction(async (tx) => {
      const event = await this.eventRepository.findByIdWithRelations(input.tenantId, input.eventId, { tx });
      if (!event) throw new EventNotFoundError(input.eventId);

      event.updateTable(input.tableId, { name: input.name, capacity: input.capacity, metadata: input.metadata });
      await this.eventRepository.saveWithRelations(event, { tx });
      return { event };
    });
  }
}

@Injectable()
export class RemoveEventTableUseCase {
  constructor(
    @Inject(EVENT_REPOSITORY) private readonly eventRepository: EventRepositoryPort,
    private readonly prisma: PrismaService,
  ) {}

  async execute(input: { tenantId: string; eventId: string; tableId: string }): Promise<{ event: EventAggregate }> {
    return this.prisma.$transaction(async (tx) => {
      const event = await this.eventRepository.findByIdWithRelations(input.tenantId, input.eventId, { tx });
      if (!event) throw new EventNotFoundError(input.eventId);

      event.removeTable(input.tableId);
      await this.eventRepository.saveWithRelations(event, { tx });
      return { event };
    });
  }
}

// Seat Use Cases
export interface AddSeatInput {
  tenantId: string;
  eventId: string;
  tableId: string;
  seatNumber: number;
  metadata?: Record<string, unknown>;
  actorId?: string;
}

@Injectable()
export class AddEventSeatUseCase {
  constructor(
    @Inject(EVENT_REPOSITORY) private readonly eventRepository: EventRepositoryPort,
    private readonly prisma: PrismaService,
  ) {}

  async execute(input: AddSeatInput): Promise<{ event: EventAggregate; seat: EventSeat }> {
    return this.prisma.$transaction(async (tx) => {
      const event = await this.eventRepository.findByIdWithRelations(input.tenantId, input.eventId, { tx });
      if (!event) throw new EventNotFoundError(input.eventId);

      const seat = event.addSeat(input.tableId, { seatNumber: input.seatNumber, metadata: input.metadata });
      await this.eventRepository.saveWithRelations(event, { tx });

      for (const de of event.domainEvents) {
        await tx.outboxEvent.create({
          data: { tenantId: input.tenantId, aggregateType: 'EVENT', aggregateId: event.id, eventType: de.eventType, payload: de.payload as Prisma.InputJsonValue, metadata: { actorId: input.actorId } as Prisma.InputJsonValue },
        });
      }
      event.clearDomainEvents();
      return { event, seat };
    });
  }
}

@Injectable()
export class RemoveEventSeatUseCase {
  constructor(
    @Inject(EVENT_REPOSITORY) private readonly eventRepository: EventRepositoryPort,
    private readonly prisma: PrismaService,
  ) {}

  async execute(input: { tenantId: string; eventId: string; tableId: string; seatId: string }): Promise<{ event: EventAggregate }> {
    return this.prisma.$transaction(async (tx) => {
      const event = await this.eventRepository.findByIdWithRelations(input.tenantId, input.eventId, { tx });
      if (!event) throw new EventNotFoundError(input.eventId);

      event.removeSeat(input.tableId, input.seatId);
      await this.eventRepository.saveWithRelations(event, { tx });
      return { event };
    });
  }
}

// Policy Binding Use Cases
export interface BindPolicyInput {
  tenantId: string;
  eventId: string;
  policyCode: string;
  scope?: PolicyScope;
  metadata?: Record<string, unknown>;
  actorId?: string;
}

@Injectable()
export class BindPolicyUseCase {
  constructor(
    @Inject(EVENT_REPOSITORY) private readonly eventRepository: EventRepositoryPort,
    private readonly prisma: PrismaService,
  ) {}

  async execute(input: BindPolicyInput): Promise<{ event: EventAggregate; binding: EventPolicyBinding }> {
    return this.prisma.$transaction(async (tx) => {
      const event = await this.eventRepository.findByIdWithRelations(input.tenantId, input.eventId, { tx });
      if (!event) throw new EventNotFoundError(input.eventId);

      const binding = event.bindPolicy({ policyCode: input.policyCode, scope: input.scope ?? PolicyScope.EVENT, metadata: input.metadata });
      await this.eventRepository.saveWithRelations(event, { tx });

      for (const de of event.domainEvents) {
        await tx.outboxEvent.create({
          data: { tenantId: input.tenantId, aggregateType: 'EVENT', aggregateId: event.id, eventType: de.eventType, payload: de.payload as Prisma.InputJsonValue, metadata: { actorId: input.actorId } as Prisma.InputJsonValue },
        });
      }
      event.clearDomainEvents();
      return { event, binding };
    });
  }
}

@Injectable()
export class UnbindPolicyUseCase {
  constructor(
    @Inject(EVENT_REPOSITORY) private readonly eventRepository: EventRepositoryPort,
    private readonly prisma: PrismaService,
  ) {}

  async execute(input: { tenantId: string; eventId: string; policyCode: string; actorId?: string }): Promise<{ event: EventAggregate }> {
    return this.prisma.$transaction(async (tx) => {
      const event = await this.eventRepository.findByIdWithRelations(input.tenantId, input.eventId, { tx });
      if (!event) throw new EventNotFoundError(input.eventId);

      event.unbindPolicy(input.policyCode);
      await this.eventRepository.saveWithRelations(event, { tx });

      for (const de of event.domainEvents) {
        await tx.outboxEvent.create({
          data: { tenantId: input.tenantId, aggregateType: 'EVENT', aggregateId: event.id, eventType: de.eventType, payload: de.payload as Prisma.InputJsonValue, metadata: { actorId: input.actorId } as Prisma.InputJsonValue },
        });
      }
      event.clearDomainEvents();
      return { event };
    });
  }
}

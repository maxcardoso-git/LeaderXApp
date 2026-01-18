import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@infrastructure/persistence/prisma.service';
import { EventAggregate } from '../../../domain/aggregates';
import { EventRepositoryPort, EVENT_REPOSITORY } from '../../../domain/ports';
import { EventNotFoundError } from '../../errors';

interface LifecycleInput {
  tenantId: string;
  eventId: string;
  actorId?: string;
}

interface LifecycleOutput {
  event: EventAggregate;
}

@Injectable()
export class PublishEventUseCase {
  constructor(
    @Inject(EVENT_REPOSITORY)
    private readonly eventRepository: EventRepositoryPort,
    private readonly prisma: PrismaService,
  ) {}

  async execute(input: LifecycleInput): Promise<LifecycleOutput> {
    return this.prisma.$transaction(async (tx) => {
      const event = await this.eventRepository.findById(input.tenantId, input.eventId, { tx });
      if (!event) throw new EventNotFoundError(input.eventId);

      event.publish();
      await this.eventRepository.update(event, { tx });

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

@Injectable()
export class ActivateEventUseCase {
  constructor(
    @Inject(EVENT_REPOSITORY) private readonly eventRepository: EventRepositoryPort,
    private readonly prisma: PrismaService,
  ) {}

  async execute(input: LifecycleInput): Promise<LifecycleOutput> {
    return this.prisma.$transaction(async (tx) => {
      const event = await this.eventRepository.findById(input.tenantId, input.eventId, { tx });
      if (!event) throw new EventNotFoundError(input.eventId);

      event.activate();
      await this.eventRepository.update(event, { tx });

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

@Injectable()
export class CloseEventUseCase {
  constructor(
    @Inject(EVENT_REPOSITORY) private readonly eventRepository: EventRepositoryPort,
    private readonly prisma: PrismaService,
  ) {}

  async execute(input: LifecycleInput): Promise<LifecycleOutput> {
    return this.prisma.$transaction(async (tx) => {
      const event = await this.eventRepository.findById(input.tenantId, input.eventId, { tx });
      if (!event) throw new EventNotFoundError(input.eventId);

      event.close();
      await this.eventRepository.update(event, { tx });

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

export interface CancelEventInput extends LifecycleInput {
  reason?: string;
}

@Injectable()
export class CancelEventUseCase {
  constructor(
    @Inject(EVENT_REPOSITORY) private readonly eventRepository: EventRepositoryPort,
    private readonly prisma: PrismaService,
  ) {}

  async execute(input: CancelEventInput): Promise<LifecycleOutput> {
    return this.prisma.$transaction(async (tx) => {
      const event = await this.eventRepository.findById(input.tenantId, input.eventId, { tx });
      if (!event) throw new EventNotFoundError(input.eventId);

      event.cancel(input.reason);
      await this.eventRepository.update(event, { tx });

      for (const de of event.domainEvents) {
        await tx.outboxEvent.create({
          data: { tenantId: input.tenantId, aggregateType: 'EVENT', aggregateId: event.id, eventType: de.eventType, payload: de.payload as Prisma.InputJsonValue, metadata: { actorId: input.actorId, reason: input.reason } as Prisma.InputJsonValue },
        });
      }
      event.clearDomainEvents();
      return { event };
    });
  }
}

import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@infrastructure/persistence/prisma.service';
import { EventAggregate } from '../../../domain/aggregates';
import {
  EventRepositoryPort,
  EVENT_REPOSITORY,
} from '../../../domain/ports';
import { EventVisibility, ReservationMode } from '../../../domain/value-objects';

export interface CreateEventInput {
  tenantId: string;
  name: string;
  description?: string;
  visibility?: EventVisibility;
  reservationMode?: ReservationMode;
  startsAt: Date;
  endsAt: Date;
  metadata?: Record<string, unknown>;
  idempotencyKey?: string;
  actorId?: string;
}

export interface CreateEventOutput {
  event: EventAggregate;
}

@Injectable()
export class CreateEventUseCase {
  constructor(
    @Inject(EVENT_REPOSITORY)
    private readonly eventRepository: EventRepositoryPort,
    private readonly prisma: PrismaService,
  ) {}

  async execute(input: CreateEventInput): Promise<CreateEventOutput> {
    return this.prisma.$transaction(async (tx) => {
      const event = EventAggregate.create({
        tenantId: input.tenantId,
        name: input.name,
        description: input.description,
        visibility: input.visibility,
        reservationMode: input.reservationMode,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        metadata: input.metadata,
      });

      await this.eventRepository.create(event, { tx });

      // Publish domain events to outbox
      for (const domainEvent of event.domainEvents) {
        await tx.outboxEvent.create({
          data: {
            tenantId: input.tenantId,
            aggregateType: 'EVENT',
            aggregateId: event.id,
            eventType: domainEvent.eventType,
            payload: domainEvent.payload as Prisma.InputJsonValue,
            metadata: { actorId: input.actorId } as Prisma.InputJsonValue,
          },
        });
      }

      event.clearDomainEvents();

      return { event };
    });
  }
}

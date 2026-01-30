import { Module } from '@nestjs/common';
import { PrismaService } from '@infrastructure/persistence/prisma.service';

// Domain Services
import {
  EventLifecycleService,
  EventAvailabilityService,
  EventPolicyResolverService,
} from './domain/services';
import { EVENT_REPOSITORY, RESERVATION_READ_PORT } from './domain/ports';

// Repositories
import { EventRepository, ReservationReadAdapter } from './outbound/repositories';

// Admin Use Cases
import {
  CreateEventUseCase,
  UpdateEventUseCase,
  ListEventsUseCase,
  DeleteEventUseCase,
  PublishEventUseCase,
  ActivateEventUseCase,
  CloseEventUseCase,
  CancelEventUseCase,
  AddEventPhaseUseCase,
  UpdateEventPhaseUseCase,
  RemoveEventPhaseUseCase,
  AddEventTableUseCase,
  UpdateEventTableUseCase,
  RemoveEventTableUseCase,
  AddEventSeatUseCase,
  RemoveEventSeatUseCase,
  BindPolicyUseCase,
  UnbindPolicyUseCase,
} from './application/usecases/admin';

// Public Use Cases
import {
  ListPublicEventsUseCase,
  GetEventDetailsUseCase,
  GetEventTablesUseCase,
  GetEventSeatsUseCase,
  CheckEventAvailabilityUseCase,
} from './application/usecases/public';

// Controllers
import { AdminEventsController, PublicEventsController } from './inbound/controllers';

const domainServices = [
  EventLifecycleService,
  EventAvailabilityService,
  EventPolicyResolverService,
];

const repositories = [
  { provide: EVENT_REPOSITORY, useClass: EventRepository },
  { provide: RESERVATION_READ_PORT, useClass: ReservationReadAdapter },
];

const adminUseCases = [
  CreateEventUseCase,
  UpdateEventUseCase,
  ListEventsUseCase,
  DeleteEventUseCase,
  PublishEventUseCase,
  ActivateEventUseCase,
  CloseEventUseCase,
  CancelEventUseCase,
  AddEventPhaseUseCase,
  UpdateEventPhaseUseCase,
  RemoveEventPhaseUseCase,
  AddEventTableUseCase,
  UpdateEventTableUseCase,
  RemoveEventTableUseCase,
  AddEventSeatUseCase,
  RemoveEventSeatUseCase,
  BindPolicyUseCase,
  UnbindPolicyUseCase,
];

const publicUseCases = [
  ListPublicEventsUseCase,
  GetEventDetailsUseCase,
  GetEventTablesUseCase,
  GetEventSeatsUseCase,
  CheckEventAvailabilityUseCase,
];

@Module({
  controllers: [AdminEventsController, PublicEventsController],
  providers: [
    PrismaService,
    ...domainServices,
    ...repositories,
    ...adminUseCases,
    ...publicUseCases,
  ],
  exports: [
    EVENT_REPOSITORY,
    ...domainServices,
  ],
})
export class EventsModule {}

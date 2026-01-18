import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaService } from '@infrastructure/persistence/prisma.service';
import {
  RESERVATION_REPOSITORY,
  RESOURCE_REPOSITORY,
  POLICY_REPOSITORY,
  POINTS_PORT,
} from './domain';
import {
  ReservationRepository,
  ResourceRepository,
  PolicyRepository,
} from './outbound/repositories';
import { PointsClientAdapter } from './outbound/adapters';
import {
  CreateReservationUseCase,
  ConfirmReservationUseCase,
  ReleaseReservationUseCase,
  GetReservationUseCase,
  ListReservationsUseCase,
} from './application/usecases';
import { ExpireHoldsJob } from './application/jobs/expire-holds.job';
import { ReservationsController } from './inbound/controllers/reservations.controller';
import {
  IdempotencyRepository,
  OutboxRepository,
} from '../points/outbound/repositories';
import { PointsModule } from '../points/points.module';

@Module({
  imports: [PointsModule, ScheduleModule.forRoot()],
  controllers: [ReservationsController],
  providers: [
    // Infrastructure
    PrismaService,
    IdempotencyRepository,
    OutboxRepository,

    // Repositories
    {
      provide: RESERVATION_REPOSITORY,
      useClass: ReservationRepository,
    },
    {
      provide: RESOURCE_REPOSITORY,
      useClass: ResourceRepository,
    },
    {
      provide: POLICY_REPOSITORY,
      useClass: PolicyRepository,
    },

    // Points Port
    {
      provide: POINTS_PORT,
      useClass: PointsClientAdapter,
    },

    // Use Cases
    CreateReservationUseCase,
    ConfirmReservationUseCase,
    ReleaseReservationUseCase,
    GetReservationUseCase,
    ListReservationsUseCase,

    // Jobs
    ExpireHoldsJob,
  ],
  exports: [
    RESERVATION_REPOSITORY,
    RESOURCE_REPOSITORY,
    POLICY_REPOSITORY,
  ],
})
export class ReservationsModule {}

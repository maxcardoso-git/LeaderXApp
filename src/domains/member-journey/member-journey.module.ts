import { Module } from '@nestjs/common';
import { PrismaService } from '@infrastructure/persistence/prisma.service';

// Domain ports
import {
  JOURNEY_INSTANCE_REPOSITORY,
  TRANSITION_LOG_REPOSITORY,
  APPROVAL_REQUEST_REPOSITORY,
} from './domain';

// Outbound adapters (repositories)
import {
  JourneyInstanceRepositoryImpl,
  TransitionLogRepositoryImpl,
  ApprovalRequestRepositoryImpl,
} from './outbound/repositories';

// Application use cases
import {
  CreateJourneyInstanceUseCase,
  TransitionStateUseCase,
  CreateApprovalRequestUseCase,
  ResolveApprovalUseCase,
  ListJourneyInstancesUseCase,
  GetJourneyInstanceUseCase,
  ListApprovalRequestsUseCase,
  ListTransitionLogsUseCase,
} from './application/usecases';

// Inbound adapters (controllers)
import { MemberJourneyController } from './inbound/controllers';

const repositoryProviders = [
  {
    provide: JOURNEY_INSTANCE_REPOSITORY,
    useClass: JourneyInstanceRepositoryImpl,
  },
  {
    provide: TRANSITION_LOG_REPOSITORY,
    useClass: TransitionLogRepositoryImpl,
  },
  {
    provide: APPROVAL_REQUEST_REPOSITORY,
    useClass: ApprovalRequestRepositoryImpl,
  },
];

const useCases = [
  CreateJourneyInstanceUseCase,
  TransitionStateUseCase,
  CreateApprovalRequestUseCase,
  ResolveApprovalUseCase,
  ListJourneyInstancesUseCase,
  GetJourneyInstanceUseCase,
  ListApprovalRequestsUseCase,
  ListTransitionLogsUseCase,
];

@Module({
  controllers: [MemberJourneyController],
  providers: [
    PrismaService,
    ...repositoryProviders,
    ...useCases,
  ],
  exports: [...repositoryProviders, ...useCases],
})
export class MemberJourneyModule {}

import { Module } from '@nestjs/common';
import { PrismaService } from '@infrastructure/persistence/prisma.service';

// Domain ports
import {
  JOURNEY_INSTANCE_REPOSITORY,
  TRANSITION_LOG_REPOSITORY,
  APPROVAL_REQUEST_REPOSITORY,
  PLM_INTEGRATION_PORT,
  GOVERNANCE_POLICY_PORT,
} from './domain';

// Outbound adapters (repositories)
import {
  JourneyInstanceRepositoryImpl,
  TransitionLogRepositoryImpl,
  ApprovalRequestRepositoryImpl,
} from './outbound/repositories';

// Outbound adapters (integrations)
import { PlmIntegrationAdapter } from './outbound/adapters/plm-integration.adapter';
import { GovernancePolicyAdapter } from './outbound/adapters/governance-policy.adapter';

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
  {
    provide: PLM_INTEGRATION_PORT,
    useClass: PlmIntegrationAdapter,
  },
  {
    provide: GOVERNANCE_POLICY_PORT,
    useClass: GovernancePolicyAdapter,
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

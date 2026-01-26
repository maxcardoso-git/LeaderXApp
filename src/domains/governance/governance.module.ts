import { Module } from '@nestjs/common';
import { PrismaService } from '@infrastructure/persistence/prisma.service';

// Domain Services
import { PolicyEnforcerService } from './domain/services';
import {
  GOVERNANCE_POLICY_REPOSITORY,
  GOVERNANCE_AUDIT_LOG_REPOSITORY,
  IDENTITY_READ_PORT,
} from './domain/ports';

// Repositories
import {
  GovernancePolicyRepository,
  GovernanceAuditLogRepository,
  IdentityReadAdapter,
} from './outbound/repositories';

// Use Cases
import {
  CreatePolicyUseCase,
  UpdatePolicyUseCase,
  DeprecatePolicyUseCase,
  GetPolicyByIdUseCase,
  GetPolicyByCodeUseCase,
  ListPoliciesUseCase,
  EvaluateGovernanceUseCase,
  ListAuditLogsUseCase,
} from './application/usecases';

// Controllers
import {
  GovernanceController,
  WorkingUnitsController,
  PositionsController,
  HierarchyGroupsController,
  ScopesController,
  GovernanceStatsController,
} from './inbound/controllers';

const repositories = [
  { provide: GOVERNANCE_POLICY_REPOSITORY, useClass: GovernancePolicyRepository },
  { provide: GOVERNANCE_AUDIT_LOG_REPOSITORY, useClass: GovernanceAuditLogRepository },
  { provide: IDENTITY_READ_PORT, useClass: IdentityReadAdapter },
];

const useCases = [
  CreatePolicyUseCase,
  UpdatePolicyUseCase,
  DeprecatePolicyUseCase,
  GetPolicyByIdUseCase,
  GetPolicyByCodeUseCase,
  ListPoliciesUseCase,
  EvaluateGovernanceUseCase,
  ListAuditLogsUseCase,
];

@Module({
  controllers: [
    GovernanceController,
    WorkingUnitsController,
    PositionsController,
    HierarchyGroupsController,
    ScopesController,
    GovernanceStatsController,
  ],
  providers: [
    PrismaService,
    PolicyEnforcerService,
    ...repositories,
    ...useCases,
  ],
  exports: [
    GOVERNANCE_POLICY_REPOSITORY,
    PolicyEnforcerService,
  ],
})
export class GovernanceModule {}

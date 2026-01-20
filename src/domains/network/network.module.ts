import { Module } from '@nestjs/common';
import { PrismaService } from '@infrastructure/persistence/prisma.service';

// Controllers
import {
  NetworkController,
  StructureTypesController,
  StructuresController,
  NetworkStatsController,
} from './inbound/controllers';

// Use Cases
import {
  CreateNetworkNodeUseCase,
  UpdateNetworkNodeUseCase,
  DeactivateNetworkNodeUseCase,
  LinkNetworkNodeUseCase,
  UnlinkNetworkNodeUseCase,
  GetNetworkNodeUseCase,
  ListNetworkByOwnerUseCase,
  GetDescendantsUseCase,
  GetApprovalChainUseCase,
  ValidateApprovalAuthorityUseCase,
} from './application/usecases';

// Domain Services
import {
  HierarchyValidatorService,
  ApprovalChainCalculatorService,
} from './domain/services';

// Ports
import {
  NETWORK_NODE_REPOSITORY,
  NETWORK_RELATION_REPOSITORY,
  IDENTITY_READ_PORT,
} from './domain/ports';

// Repositories & Adapters
import {
  NetworkNodeRepository,
  NetworkRelationRepository,
  IdentityReadAdapter,
} from './outbound/repositories';

@Module({
  controllers: [NetworkController, StructureTypesController, StructuresController, NetworkStatsController],
  providers: [
    PrismaService,

    // Use Cases
    CreateNetworkNodeUseCase,
    UpdateNetworkNodeUseCase,
    DeactivateNetworkNodeUseCase,
    LinkNetworkNodeUseCase,
    UnlinkNetworkNodeUseCase,
    GetNetworkNodeUseCase,
    ListNetworkByOwnerUseCase,
    GetDescendantsUseCase,
    GetApprovalChainUseCase,
    ValidateApprovalAuthorityUseCase,

    // Domain Services
    HierarchyValidatorService,
    ApprovalChainCalculatorService,

    // Repositories
    {
      provide: NETWORK_NODE_REPOSITORY,
      useClass: NetworkNodeRepository,
    },
    {
      provide: NETWORK_RELATION_REPOSITORY,
      useClass: NetworkRelationRepository,
    },

    // Cross-Domain Read Adapters
    {
      provide: IDENTITY_READ_PORT,
      useClass: IdentityReadAdapter,
    },
  ],
  exports: [
    HierarchyValidatorService,
    ApprovalChainCalculatorService,
    NETWORK_NODE_REPOSITORY,
    NETWORK_RELATION_REPOSITORY,
  ],
})
export class NetworkModule {}

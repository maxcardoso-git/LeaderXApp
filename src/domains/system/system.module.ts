import { Module } from '@nestjs/common';
import { PrismaService } from '@infrastructure/persistence/prisma.service';

// Domain Ports
import { SYSTEM_RESOURCE_REPOSITORY } from './domain/ports';

// Repositories
import { SystemResourceRepository } from './outbound/repositories';

// Use Cases
import {
  CreateResourceUseCase,
  UpdateResourceUseCase,
  DeleteResourceUseCase,
  GetResourceByIdUseCase,
  ListResourcesUseCase,
  TestConnectionUseCase,
  TestConnectionPreviewUseCase,
  LlmCompletionUseCase,
} from './application/usecases';

// Controllers
import { ResourcesController } from './inbound/controllers';

const repositories = [
  { provide: SYSTEM_RESOURCE_REPOSITORY, useClass: SystemResourceRepository },
];

const useCases = [
  CreateResourceUseCase,
  UpdateResourceUseCase,
  DeleteResourceUseCase,
  GetResourceByIdUseCase,
  ListResourcesUseCase,
  TestConnectionUseCase,
  TestConnectionPreviewUseCase,
  LlmCompletionUseCase,
];

@Module({
  controllers: [ResourcesController],
  providers: [
    PrismaService,
    ...repositories,
    ...useCases,
  ],
  exports: [
    SYSTEM_RESOURCE_REPOSITORY,
  ],
})
export class SystemModule {}

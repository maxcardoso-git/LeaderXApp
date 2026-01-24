import { Module } from '@nestjs/common';
import { PrismaService } from '@infrastructure/persistence/prisma.service';

// Domain ports
import {
  IDENTITY_USER_REPOSITORY,
  PERMISSION_REPOSITORY,
  ROLE_REPOSITORY,
  ACCESS_ASSIGNMENT_REPOSITORY,
  NETWORK_READ_PORT,
} from './domain';

// Outbound adapters (repositories)
import {
  IdentityUserRepository,
  PermissionRepository,
  RoleRepository,
  AccessAssignmentRepository,
} from './outbound/repositories';

import { NetworkClientAdapter } from './outbound/adapters';

// Application use cases
import {
  CreateUserUseCase,
  UpdateUserUseCase,
  DeactivateUserUseCase,
  DeleteUserUseCase,
  ListUsersUseCase,
  GetUserUseCase,
  CreatePermissionUseCase,
  ListPermissionsUseCase,
  CreateRoleUseCase,
  ListRolesUseCase,
  GetRoleUseCase,
  UpdateRoleUseCase,
  UpsertRolePermissionsUseCase,
  AssignRoleUseCase,
  RevokeRoleUseCase,
  ListUserRolesUseCase,
  EvaluateAccessUseCase,
  ValidatePermissionUseCase,
} from './application/usecases';

// Inbound adapters (controllers)
import { IdentityController } from './inbound/controllers/identity.controller';

// Cross-domain dependencies (from Points domain)
import { IdempotencyRepository } from '../points/outbound/repositories/idempotency.repository';
import { OutboxRepository } from '../points/outbound/repositories/outbox.repository';

const repositoryProviders = [
  {
    provide: IDENTITY_USER_REPOSITORY,
    useClass: IdentityUserRepository,
  },
  {
    provide: PERMISSION_REPOSITORY,
    useClass: PermissionRepository,
  },
  {
    provide: ROLE_REPOSITORY,
    useClass: RoleRepository,
  },
  {
    provide: ACCESS_ASSIGNMENT_REPOSITORY,
    useClass: AccessAssignmentRepository,
  },
  {
    provide: NETWORK_READ_PORT,
    useClass: NetworkClientAdapter,
  },
];

const useCases = [
  // User
  CreateUserUseCase,
  UpdateUserUseCase,
  DeactivateUserUseCase,
  DeleteUserUseCase,
  ListUsersUseCase,
  GetUserUseCase,
  // Permission
  CreatePermissionUseCase,
  ListPermissionsUseCase,
  // Role
  CreateRoleUseCase,
  ListRolesUseCase,
  GetRoleUseCase,
  UpdateRoleUseCase,
  UpsertRolePermissionsUseCase,
  // Assignment
  AssignRoleUseCase,
  RevokeRoleUseCase,
  ListUserRolesUseCase,
  // Access Evaluation
  EvaluateAccessUseCase,
  ValidatePermissionUseCase,
];

@Module({
  controllers: [IdentityController],
  providers: [
    PrismaService,
    IdempotencyRepository,
    OutboxRepository,
    ...repositoryProviders,
    ...useCases,
  ],
  exports: [...repositoryProviders, ...useCases],
})
export class IdentityModule {}

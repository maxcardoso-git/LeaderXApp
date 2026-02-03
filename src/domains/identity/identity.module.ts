import { Module, OnModuleInit } from '@nestjs/common';
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
import { SessionsController } from './inbound/controllers/sessions.controller';

// Event Handlers
import {
  AuditOnUserCreatedHandler,
  AuditOnUserUpdatedHandler,
  AuditOnUserDeactivatedHandler,
  AuditOnUserDeletedHandler,
  AuditOnRoleCreatedHandler,
  AuditOnRolePermissionsUpsertedHandler,
  AuditOnRoleAssignedHandler,
  AuditOnRoleRevokedHandler,
} from './application/handlers';

// Cross-domain dependencies
import { IdempotencyRepository } from '../points/outbound/repositories/idempotency.repository';
import { OutboxRepository } from '../points/outbound/repositories/outbox.repository';
import { AuditModule } from '../audit/audit.module';
import { InMemoryEventBus } from '../../common/eventing/in-memory-event-bus';

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

const eventHandlers = [
  AuditOnUserCreatedHandler,
  AuditOnUserUpdatedHandler,
  AuditOnUserDeactivatedHandler,
  AuditOnUserDeletedHandler,
  AuditOnRoleCreatedHandler,
  AuditOnRolePermissionsUpsertedHandler,
  AuditOnRoleAssignedHandler,
  AuditOnRoleRevokedHandler,
];

@Module({
  imports: [AuditModule],
  controllers: [IdentityController, SessionsController],
  providers: [
    PrismaService,
    IdempotencyRepository,
    OutboxRepository,
    ...repositoryProviders,
    ...useCases,
    ...eventHandlers,
  ],
  exports: [...repositoryProviders, ...useCases],
})
export class IdentityModule implements OnModuleInit {
  constructor(
    private readonly eventBus: InMemoryEventBus,
    private readonly auditOnUserCreated: AuditOnUserCreatedHandler,
    private readonly auditOnUserUpdated: AuditOnUserUpdatedHandler,
    private readonly auditOnUserDeactivated: AuditOnUserDeactivatedHandler,
    private readonly auditOnUserDeleted: AuditOnUserDeletedHandler,
    private readonly auditOnRoleCreated: AuditOnRoleCreatedHandler,
    private readonly auditOnRolePermissionsUpserted: AuditOnRolePermissionsUpsertedHandler,
    private readonly auditOnRoleAssigned: AuditOnRoleAssignedHandler,
    private readonly auditOnRoleRevoked: AuditOnRoleRevokedHandler,
  ) {}

  onModuleInit() {
    // Register event handlers
    this.eventBus.registerHandler(this.auditOnUserCreated);
    this.eventBus.registerHandler(this.auditOnUserUpdated);
    this.eventBus.registerHandler(this.auditOnUserDeactivated);
    this.eventBus.registerHandler(this.auditOnUserDeleted);
    this.eventBus.registerHandler(this.auditOnRoleCreated);
    this.eventBus.registerHandler(this.auditOnRolePermissionsUpserted);
    this.eventBus.registerHandler(this.auditOnRoleAssigned);
    this.eventBus.registerHandler(this.auditOnRoleRevoked);
  }
}

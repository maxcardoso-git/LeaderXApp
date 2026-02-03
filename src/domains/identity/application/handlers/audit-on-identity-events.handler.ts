import { Injectable, Logger } from '@nestjs/common';
import { EventHandler, DomainEvent } from '../../../../common/eventing/domain-event.interface';
import { CreateAuditLogUseCase } from '../../../audit/application/usecases';

@Injectable()
export class AuditOnUserCreatedHandler implements EventHandler<DomainEvent> {
  readonly eventType = 'Identity.UserCreated';
  private readonly logger = new Logger(AuditOnUserCreatedHandler.name);

  constructor(private readonly createAuditLog: CreateAuditLogUseCase) {}

  async handle(event: DomainEvent): Promise<void> {
    const payload = event.toPayload() as any;
    this.logger.log(`Creating audit log for user created: ${payload.userId}`);

    try {
      await this.createAuditLog.execute({
        tenantId: payload.tenantId,
        orgId: payload.tenantId, // Using tenantId as orgId for now
        action: 'identity.user.created',
        resourceType: 'USER',
        resourceId: payload.userId,
        actorId: payload.userId, // The user themselves for creation
        metadata: {
          email: payload.email,
          fullName: payload.fullName,
          status: payload.status,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to create audit log for user created: ${error.message}`);
    }
  }
}

@Injectable()
export class AuditOnUserUpdatedHandler implements EventHandler<DomainEvent> {
  readonly eventType = 'Identity.UserUpdated';
  private readonly logger = new Logger(AuditOnUserUpdatedHandler.name);

  constructor(private readonly createAuditLog: CreateAuditLogUseCase) {}

  async handle(event: DomainEvent): Promise<void> {
    const payload = event.toPayload() as any;
    this.logger.log(`Creating audit log for user updated: ${payload.userId}`);

    try {
      await this.createAuditLog.execute({
        tenantId: payload.tenantId,
        orgId: payload.tenantId,
        action: 'identity.user.updated',
        resourceType: 'USER',
        resourceId: payload.userId,
        actorId: payload.userId, // TODO: Get actual actor from context
        metadata: {
          email: payload.email,
          fullName: payload.fullName,
          status: payload.status,
          changes: payload.changes,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to create audit log for user updated: ${error.message}`);
    }
  }
}

@Injectable()
export class AuditOnUserDeactivatedHandler implements EventHandler<DomainEvent> {
  readonly eventType = 'Identity.UserDeactivated';
  private readonly logger = new Logger(AuditOnUserDeactivatedHandler.name);

  constructor(private readonly createAuditLog: CreateAuditLogUseCase) {}

  async handle(event: DomainEvent): Promise<void> {
    const payload = event.toPayload() as any;
    this.logger.log(`Creating audit log for user deactivated: ${payload.userId}`);

    try {
      await this.createAuditLog.execute({
        tenantId: payload.tenantId,
        orgId: payload.tenantId,
        action: 'identity.user.suspended',
        resourceType: 'USER',
        resourceId: payload.userId,
        actorId: payload.userId, // TODO: Get actual actor from context
        metadata: {
          deactivatedAt: payload.deactivatedAt,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to create audit log for user deactivated: ${error.message}`);
    }
  }
}

@Injectable()
export class AuditOnUserDeletedHandler implements EventHandler<DomainEvent> {
  readonly eventType = 'Identity.UserDeleted';
  private readonly logger = new Logger(AuditOnUserDeletedHandler.name);

  constructor(private readonly createAuditLog: CreateAuditLogUseCase) {}

  async handle(event: DomainEvent): Promise<void> {
    const payload = event.toPayload() as any;
    this.logger.log(`Creating audit log for user deleted: ${payload.userId}`);

    try {
      await this.createAuditLog.execute({
        tenantId: payload.tenantId,
        orgId: payload.tenantId,
        action: 'identity.user.deleted',
        resourceType: 'USER',
        resourceId: payload.userId,
        actorId: payload.userId, // TODO: Get actual actor from context
        metadata: {
          email: payload.email,
          deletedAt: payload.deletedAt,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to create audit log for user deleted: ${error.message}`);
    }
  }
}

@Injectable()
export class AuditOnRoleCreatedHandler implements EventHandler<DomainEvent> {
  readonly eventType = 'Identity.RoleCreated';
  private readonly logger = new Logger(AuditOnRoleCreatedHandler.name);

  constructor(private readonly createAuditLog: CreateAuditLogUseCase) {}

  async handle(event: DomainEvent): Promise<void> {
    const payload = event.toPayload() as any;
    this.logger.log(`Creating audit log for role created: ${payload.roleId}`);

    try {
      await this.createAuditLog.execute({
        tenantId: payload.tenantId,
        orgId: payload.tenantId,
        action: 'identity.role.created',
        resourceType: 'ROLE',
        resourceId: payload.roleId,
        actorId: 'SYSTEM', // TODO: Get actual actor from context
        metadata: {
          code: payload.code,
          name: payload.name,
          effect: payload.effect,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to create audit log for role created: ${error.message}`);
    }
  }
}

@Injectable()
export class AuditOnRolePermissionsUpsertedHandler implements EventHandler<DomainEvent> {
  readonly eventType = 'Identity.RolePermissionsUpserted';
  private readonly logger = new Logger(AuditOnRolePermissionsUpsertedHandler.name);

  constructor(private readonly createAuditLog: CreateAuditLogUseCase) {}

  async handle(event: DomainEvent): Promise<void> {
    const payload = event.toPayload() as any;
    this.logger.log(`Creating audit log for role permissions updated: ${payload.roleId}`);

    try {
      await this.createAuditLog.execute({
        tenantId: payload.tenantId,
        orgId: payload.tenantId,
        action: 'identity.role.updated',
        resourceType: 'ROLE',
        resourceId: payload.roleId,
        actorId: 'SYSTEM', // TODO: Get actual actor from context
        metadata: {
          permissions: payload.permissions,
          permissionCount: payload.permissions.length,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to create audit log for role permissions updated: ${error.message}`);
    }
  }
}

@Injectable()
export class AuditOnRoleAssignedHandler implements EventHandler<DomainEvent> {
  readonly eventType = 'Identity.RoleAssigned';
  private readonly logger = new Logger(AuditOnRoleAssignedHandler.name);

  constructor(private readonly createAuditLog: CreateAuditLogUseCase) {}

  async handle(event: DomainEvent): Promise<void> {
    const payload = event.toPayload() as any;
    this.logger.log(`Creating audit log for role assigned: ${payload.assignmentId}`);

    try {
      await this.createAuditLog.execute({
        tenantId: payload.tenantId,
        orgId: payload.tenantId,
        action: 'identity.role.assigned',
        resourceType: 'USER',
        resourceId: payload.userId,
        actorId: payload.assignedBy || 'SYSTEM',
        metadata: {
          assignmentId: payload.assignmentId,
          roleId: payload.roleId,
          scopeType: payload.scopeType,
          scopeId: payload.scopeId,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to create audit log for role assigned: ${error.message}`);
    }
  }
}

@Injectable()
export class AuditOnRoleRevokedHandler implements EventHandler<DomainEvent> {
  readonly eventType = 'Identity.RoleRevoked';
  private readonly logger = new Logger(AuditOnRoleRevokedHandler.name);

  constructor(private readonly createAuditLog: CreateAuditLogUseCase) {}

  async handle(event: DomainEvent): Promise<void> {
    const payload = event.toPayload() as any;
    this.logger.log(`Creating audit log for role revoked: ${payload.assignmentId}`);

    try {
      await this.createAuditLog.execute({
        tenantId: payload.tenantId,
        orgId: payload.tenantId,
        action: 'identity.role.revoked',
        resourceType: 'USER',
        resourceId: payload.userId,
        actorId: 'SYSTEM', // TODO: Get actual actor from context
        metadata: {
          assignmentId: payload.assignmentId,
          roleId: payload.roleId,
          revokedAt: payload.revokedAt,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to create audit log for role revoked: ${error.message}`);
    }
  }
}

import { Inject, Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '@infrastructure/persistence/prisma.service';
import {
  AccessAssignment,
  IDENTITY_USER_REPOSITORY,
  IdentityUserRepositoryPort,
  ROLE_REPOSITORY,
  RoleRepositoryPort,
  ACCESS_ASSIGNMENT_REPOSITORY,
  AccessAssignmentRepositoryPort,
  ScopeType,
  RoleAssignedEvent,
} from '../../domain';
import { OutboxRepository } from '../../../points/outbound/repositories/outbox.repository';
import { IdempotencyRepository, IdempotencyScope } from '../../../points/outbound/repositories/idempotency.repository';
import { UserOrRoleNotFoundError, DuplicateAssignmentError, InvalidScopeError } from '../errors';

export interface AssignRoleCommand {
  tenantId: string;
  userId: string;
  roleId: string;
  scopeType: ScopeType;
  scopeId?: string;
  assignedBy?: string;
  metadata?: Record<string, unknown>;
  idempotencyKey?: string;
}

export interface AssignRoleResult {
  id: string;
  tenantId: string;
  userId: string;
  roleId: string;
  roleCode?: string;
  roleName?: string;
  scopeType: string;
  scopeId?: string;
  status: string;
  assignedBy?: string;
  assignedAt: string;
}

@Injectable()
export class AssignRoleUseCase {
  private readonly logger = new Logger(AssignRoleUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(IDENTITY_USER_REPOSITORY)
    private readonly userRepo: IdentityUserRepositoryPort,
    @Inject(ROLE_REPOSITORY)
    private readonly roleRepo: RoleRepositoryPort,
    @Inject(ACCESS_ASSIGNMENT_REPOSITORY)
    private readonly assignmentRepo: AccessAssignmentRepositoryPort,
    private readonly idempotencyRepo: IdempotencyRepository,
    private readonly outboxRepo: OutboxRepository,
  ) {}

  async execute(command: AssignRoleCommand): Promise<AssignRoleResult> {
    this.logger.debug(
      `Assigning role ${command.roleId} to user ${command.userId}`,
    );

    // Validate scope
    this.validateScope(command.scopeType, command.scopeId);

    // Check idempotency
    if (command.idempotencyKey) {
      const existing = await this.idempotencyRepo.findByKey(
        command.tenantId,
        IdempotencyScope.IDENTITY_ASSIGN_ROLE,
        command.idempotencyKey,
      );

      if (existing) {
        return existing.responseBody as AssignRoleResult;
      }
    }

    // Validate user exists
    const user = await this.userRepo.findById(command.tenantId, command.userId);
    if (!user) {
      throw new UserOrRoleNotFoundError(`User ${command.userId} not found`);
    }

    // Validate role exists
    const role = await this.roleRepo.findById(command.tenantId, command.roleId);
    if (!role) {
      throw new UserOrRoleNotFoundError(`Role ${command.roleId} not found`);
    }

    // Check for duplicate active assignment
    const exists = await this.assignmentRepo.existsActiveAssignment(
      command.tenantId,
      command.userId,
      command.roleId,
      command.scopeType,
      command.scopeId,
    );
    if (exists) {
      throw new DuplicateAssignmentError();
    }

    const assignmentId = uuidv4();

    const result = await this.prisma.$transaction(async (tx) => {
      const ctx = { tx };

      const assignment = AccessAssignment.create(assignmentId, {
        tenantId: command.tenantId,
        userId: command.userId,
        roleId: command.roleId,
        scopeType: command.scopeType,
        scopeId: command.scopeId,
        assignedBy: command.assignedBy,
        metadata: command.metadata,
      });

      await this.assignmentRepo.create(assignment, ctx);

      // Create outbox event
      const event = new RoleAssignedEvent(assignmentId, {
        assignmentId,
        tenantId: command.tenantId,
        userId: command.userId,
        roleId: command.roleId,
        scopeType: command.scopeType,
        scopeId: command.scopeId,
        assignedBy: command.assignedBy,
      });

      await this.outboxRepo.enqueue(
        {
          tenantId: command.tenantId,
          aggregateType: event.aggregateType,
          aggregateId: event.aggregateId,
          eventType: event.eventType,
          payload: event.payload,
        },
        ctx,
      );

      const response: AssignRoleResult = {
        id: assignment.id,
        tenantId: assignment.tenantId,
        userId: assignment.userId,
        roleId: assignment.roleId,
        roleCode: role.code,
        roleName: role.name,
        scopeType: assignment.scopeType,
        scopeId: assignment.scopeId,
        status: assignment.status,
        assignedBy: assignment.assignedBy,
        assignedAt: assignment.assignedAt.toISOString(),
      };

      if (command.idempotencyKey) {
        await this.idempotencyRepo.create(
          {
            tenantId: command.tenantId,
            scope: IdempotencyScope.IDENTITY_ASSIGN_ROLE,
            key: command.idempotencyKey,
            requestHash: this.hashRequest(command),
            responseBody: response,
          },
          ctx,
        );
      }

      return response;
    });

    this.logger.log(`Role assigned: ${assignmentId}`);
    return result;
  }

  private validateScope(scopeType: ScopeType, scopeId?: string): void {
    const scopesRequiringScopeId = [
      ScopeType.EVENT,
      ScopeType.COMMUNITY,
      ScopeType.TABLE,
      ScopeType.NETWORK_NODE,
      ScopeType.RESOURCE,
    ];

    if (scopesRequiringScopeId.includes(scopeType) && !scopeId) {
      throw new InvalidScopeError(
        `scopeId is required for scopeType: ${scopeType}`,
      );
    }
  }

  private hashRequest(command: AssignRoleCommand): string {
    const payload = JSON.stringify({
      tenantId: command.tenantId,
      userId: command.userId,
      roleId: command.roleId,
      scopeType: command.scopeType,
      scopeId: command.scopeId,
    });
    return Buffer.from(payload).toString('base64');
  }
}

import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  IDENTITY_USER_REPOSITORY,
  IdentityUserRepositoryPort,
  PERMISSION_REPOSITORY,
  PermissionRepositoryPort,
  ROLE_REPOSITORY,
  RoleRepositoryPort,
  ACCESS_ASSIGNMENT_REPOSITORY,
  AccessAssignmentRepositoryPort,
  NETWORK_READ_PORT,
  NetworkReadPort,
  AccessPolicyEvaluator,
  AccessContext,
  EffectiveAccess,
  AccessEvaluatedEvent,
  AccessDeniedEvent,
} from '../../domain';
import { OutboxRepository } from '../../../points/outbound/repositories/outbox.repository';
import { PrismaService } from '@infrastructure/persistence/prisma.service';

export interface EvaluateAccessCommand {
  tenantId: string;
  userId: string;
  permissionCode: string;
  context?: AccessContext;
}

export interface EvaluateAccessResult {
  decision: 'PERMIT' | 'DENY';
  matchedRules: string[];
  denyReasons: string[];
  allowReasons: string[];
}

@Injectable()
export class EvaluateAccessUseCase {
  private readonly logger = new Logger(EvaluateAccessUseCase.name);
  private readonly evaluator: AccessPolicyEvaluator;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(IDENTITY_USER_REPOSITORY)
    private readonly userRepo: IdentityUserRepositoryPort,
    @Inject(PERMISSION_REPOSITORY)
    private readonly permissionRepo: PermissionRepositoryPort,
    @Inject(ROLE_REPOSITORY)
    private readonly roleRepo: RoleRepositoryPort,
    @Inject(ACCESS_ASSIGNMENT_REPOSITORY)
    private readonly assignmentRepo: AccessAssignmentRepositoryPort,
    @Inject(NETWORK_READ_PORT)
    private readonly networkPort: NetworkReadPort,
    private readonly outboxRepo: OutboxRepository,
  ) {
    this.evaluator = new AccessPolicyEvaluator(networkPort);
  }

  async execute(command: EvaluateAccessCommand): Promise<EvaluateAccessResult> {
    this.logger.debug(
      `Evaluating access for user ${command.userId} on ${command.permissionCode}`,
    );

    // Fetch user
    const user = await this.userRepo.findById(command.tenantId, command.userId);

    // Fetch permission
    const permission = await this.permissionRepo.findByCode(
      command.tenantId,
      command.permissionCode,
    );

    // Fetch active assignments
    const assignments = user
      ? await this.assignmentRepo.findActiveByUser(command.tenantId, user.id)
      : [];

    // Fetch roles with permissions
    const roleIds = [...new Set(assignments.map((a) => a.roleId))];
    const roles =
      roleIds.length > 0
        ? await this.roleRepo.findByIdsWithPermissions(command.tenantId, roleIds)
        : [];

    // Build context
    const context: AccessContext = {
      tenantId: command.tenantId,
      ...command.context,
    };

    // Evaluate
    const effectiveAccess = await this.evaluator.evaluate({
      user,
      permission,
      assignments,
      roles,
      context,
    });

    // Log access event
    await this.logAccessEvent(command, effectiveAccess);

    return {
      decision: effectiveAccess.decision,
      matchedRules: [...effectiveAccess.matchedRules],
      denyReasons: [...effectiveAccess.denyReasons],
      allowReasons: [...effectiveAccess.allowReasons],
    };
  }

  private async logAccessEvent(
    command: EvaluateAccessCommand,
    access: EffectiveAccess,
  ): Promise<void> {
    try {
      await this.prisma.$transaction(async (tx) => {
        const ctx = { tx };

        if (access.isPermitted()) {
          const event = new AccessEvaluatedEvent(command.userId, {
            userId: command.userId,
            tenantId: command.tenantId,
            permissionCode: command.permissionCode,
            decision: access.decision,
            matchedRules: [...access.matchedRules],
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
        } else {
          const event = new AccessDeniedEvent(command.userId, {
            userId: command.userId,
            tenantId: command.tenantId,
            permissionCode: command.permissionCode,
            reason: access.denyReasons[0] ?? 'DEFAULT_DENY',
            denyReasons: [...access.denyReasons],
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
        }
      });
    } catch (error) {
      // Don't fail the evaluation if logging fails
      this.logger.warn(`Failed to log access event: ${error}`);
    }
  }
}

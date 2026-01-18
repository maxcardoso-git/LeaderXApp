import { Inject, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@infrastructure/persistence/prisma.service';
import {
  ACCESS_ASSIGNMENT_REPOSITORY,
  AccessAssignmentRepositoryPort,
  RoleRevokedEvent,
} from '../../domain';
import { OutboxRepository } from '../../../points/outbound/repositories/outbox.repository';
import { AssignmentNotFoundError } from '../errors';

export interface RevokeRoleCommand {
  tenantId: string;
  userId: string;
  assignmentId: string;
}

export interface RevokeRoleResult {
  id: string;
  tenantId: string;
  userId: string;
  roleId: string;
  status: string;
  revokedAt: string;
}

@Injectable()
export class RevokeRoleUseCase {
  private readonly logger = new Logger(RevokeRoleUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(ACCESS_ASSIGNMENT_REPOSITORY)
    private readonly assignmentRepo: AccessAssignmentRepositoryPort,
    private readonly outboxRepo: OutboxRepository,
  ) {}

  async execute(command: RevokeRoleCommand): Promise<RevokeRoleResult> {
    this.logger.debug(`Revoking assignment ${command.assignmentId}`);

    const assignment = await this.assignmentRepo.findById(
      command.tenantId,
      command.assignmentId,
    );

    if (!assignment) {
      throw new AssignmentNotFoundError(command.assignmentId);
    }

    // Validate assignment belongs to user
    if (assignment.userId !== command.userId) {
      throw new AssignmentNotFoundError(command.assignmentId);
    }

    assignment.revoke();

    const result = await this.prisma.$transaction(async (tx) => {
      const ctx = { tx };

      await this.assignmentRepo.update(assignment, ctx);

      // Create outbox event
      const event = new RoleRevokedEvent(assignment.id, {
        assignmentId: assignment.id,
        tenantId: assignment.tenantId,
        userId: assignment.userId,
        roleId: assignment.roleId,
        revokedAt: assignment.revokedAt!.toISOString(),
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

      return {
        id: assignment.id,
        tenantId: assignment.tenantId,
        userId: assignment.userId,
        roleId: assignment.roleId,
        status: assignment.status,
        revokedAt: assignment.revokedAt!.toISOString(),
      };
    });

    this.logger.log(`Assignment revoked: ${command.assignmentId}`);
    return result;
  }
}

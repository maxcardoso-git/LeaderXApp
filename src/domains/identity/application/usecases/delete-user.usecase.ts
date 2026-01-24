import { Inject, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@infrastructure/persistence/prisma.service';
import {
  IDENTITY_USER_REPOSITORY,
  IdentityUserRepositoryPort,
  UserDeletedEvent,
} from '../../domain';
import { OutboxRepository } from '../../../points/outbound/repositories/outbox.repository';
import { UserNotFoundError } from '../errors';

export interface DeleteUserCommand {
  tenantId: string;
  userId: string;
}

export interface DeleteUserResult {
  id: string;
  tenantId: string;
  deletedAt: string;
}

@Injectable()
export class DeleteUserUseCase {
  private readonly logger = new Logger(DeleteUserUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(IDENTITY_USER_REPOSITORY)
    private readonly userRepo: IdentityUserRepositoryPort,
    private readonly outboxRepo: OutboxRepository,
  ) {}

  async execute(command: DeleteUserCommand): Promise<DeleteUserResult> {
    this.logger.debug(`Deleting user ${command.userId}`);

    const user = await this.userRepo.findById(command.tenantId, command.userId);
    if (!user) {
      throw new UserNotFoundError(command.userId);
    }

    const deletedAt = new Date();

    const result = await this.prisma.$transaction(async (tx) => {
      const ctx = { tx };

      // Delete role assignments first
      await tx.accessAssignment.deleteMany({
        where: { userId: command.userId },
      });

      // Delete the user
      await this.userRepo.delete(command.tenantId, command.userId, ctx);

      // Create outbox event
      const event = new UserDeletedEvent(user.id, {
        userId: user.id,
        tenantId: user.tenantId,
        email: user.email,
        deletedAt: deletedAt.toISOString(),
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
        id: user.id,
        tenantId: user.tenantId,
        deletedAt: deletedAt.toISOString(),
      };
    });

    this.logger.log(`User deleted: ${command.userId}`);
    return result;
  }
}

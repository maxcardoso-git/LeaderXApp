import { Inject, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@infrastructure/persistence/prisma.service';
import {
  IDENTITY_USER_REPOSITORY,
  IdentityUserRepositoryPort,
  UserDeactivatedEvent,
} from '../../domain';
import { OutboxRepository } from '../../../points/outbound/repositories/outbox.repository';
import { UserNotFoundError } from '../errors';

export interface DeactivateUserCommand {
  tenantId: string;
  userId: string;
}

export interface DeactivateUserResult {
  id: string;
  tenantId: string;
  status: string;
  updatedAt: string;
}

@Injectable()
export class DeactivateUserUseCase {
  private readonly logger = new Logger(DeactivateUserUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(IDENTITY_USER_REPOSITORY)
    private readonly userRepo: IdentityUserRepositoryPort,
    private readonly outboxRepo: OutboxRepository,
  ) {}

  async execute(command: DeactivateUserCommand): Promise<DeactivateUserResult> {
    this.logger.debug(`Deactivating user ${command.userId}`);

    const user = await this.userRepo.findById(command.tenantId, command.userId);
    if (!user) {
      throw new UserNotFoundError(command.userId);
    }

    user.deactivate();

    const result = await this.prisma.$transaction(async (tx) => {
      const ctx = { tx };

      await this.userRepo.update(user, ctx);

      // Create outbox event
      const event = new UserDeactivatedEvent(user.id, {
        userId: user.id,
        tenantId: user.tenantId,
        deactivatedAt: user.updatedAt.toISOString(),
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
        status: user.status,
        updatedAt: user.updatedAt.toISOString(),
      };
    });

    this.logger.log(`User deactivated: ${command.userId}`);
    return result;
  }
}

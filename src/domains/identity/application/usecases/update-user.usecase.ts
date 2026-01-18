import { Inject, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@infrastructure/persistence/prisma.service';
import {
  IDENTITY_USER_REPOSITORY,
  IdentityUserRepositoryPort,
  UserStatus,
  UserUpdatedEvent,
} from '../../domain';
import { OutboxRepository } from '../../../points/outbound/repositories/outbox.repository';
import { UserNotFoundError, UserAlreadyExistsError } from '../errors';

export interface UpdateUserCommand {
  tenantId: string;
  userId: string;
  email?: string;
  fullName?: string;
  status?: UserStatus;
}

export interface UpdateUserResult {
  id: string;
  tenantId: string;
  externalId?: string;
  email?: string;
  fullName?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class UpdateUserUseCase {
  private readonly logger = new Logger(UpdateUserUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(IDENTITY_USER_REPOSITORY)
    private readonly userRepo: IdentityUserRepositoryPort,
    private readonly outboxRepo: OutboxRepository,
  ) {}

  async execute(command: UpdateUserCommand): Promise<UpdateUserResult> {
    this.logger.debug(`Updating user ${command.userId}`);

    const user = await this.userRepo.findById(command.tenantId, command.userId);
    if (!user) {
      throw new UserNotFoundError(command.userId);
    }

    // Check email uniqueness if changing
    if (command.email && command.email !== user.email) {
      const exists = await this.userRepo.existsByEmail(
        command.tenantId,
        command.email,
        command.userId,
      );
      if (exists) {
        throw new UserAlreadyExistsError(command.email);
      }
    }

    const changes: string[] = [];
    if (command.email !== undefined && command.email !== user.email) {
      changes.push('email');
    }
    if (command.fullName !== undefined && command.fullName !== user.fullName) {
      changes.push('fullName');
    }
    if (command.status !== undefined && command.status !== user.status) {
      changes.push('status');
    }

    // Apply updates
    user.update({
      email: command.email,
      fullName: command.fullName,
      status: command.status,
    });

    const result = await this.prisma.$transaction(async (tx) => {
      const ctx = { tx };

      await this.userRepo.update(user, ctx);

      // Create outbox event
      const event = new UserUpdatedEvent(user.id, {
        userId: user.id,
        tenantId: user.tenantId,
        status: user.status,
        email: user.email,
        fullName: user.fullName,
        changes,
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
        externalId: user.externalId,
        email: user.email,
        fullName: user.fullName,
        status: user.status,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      };
    });

    this.logger.log(`User updated: ${command.userId}`);
    return result;
  }
}

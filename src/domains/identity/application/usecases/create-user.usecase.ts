import { Inject, Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '@infrastructure/persistence/prisma.service';
import {
  IdentityUser,
  IDENTITY_USER_REPOSITORY,
  IdentityUserRepositoryPort,
  UserStatus,
  UserCreatedEvent,
} from '../../domain';
import { OutboxRepository } from '../../../points/outbound/repositories/outbox.repository';
import { IdempotencyRepository, IdempotencyScope } from '../../../points/outbound/repositories/idempotency.repository';
import { UserAlreadyExistsError } from '../errors';

export interface CreateUserCommand {
  tenantId: string;
  externalId?: string;
  email?: string;
  fullName?: string;
  status?: UserStatus;
  idempotencyKey?: string;
}

export interface CreateUserResult {
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
export class CreateUserUseCase {
  private readonly logger = new Logger(CreateUserUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(IDENTITY_USER_REPOSITORY)
    private readonly userRepo: IdentityUserRepositoryPort,
    private readonly idempotencyRepo: IdempotencyRepository,
    private readonly outboxRepo: OutboxRepository,
  ) {}

  async execute(command: CreateUserCommand): Promise<CreateUserResult> {
    this.logger.debug(`Creating user for tenant ${command.tenantId}`);

    // Check idempotency
    if (command.idempotencyKey) {
      const existing = await this.idempotencyRepo.findByKey(
        command.tenantId,
        IdempotencyScope.IDENTITY_CREATE_USER,
        command.idempotencyKey,
      );

      if (existing) {
        this.logger.debug(`Idempotent request found: ${command.idempotencyKey}`);
        return existing.responseBody as CreateUserResult;
      }
    }

    // Check email uniqueness
    if (command.email) {
      const exists = await this.userRepo.existsByEmail(
        command.tenantId,
        command.email,
      );
      if (exists) {
        throw new UserAlreadyExistsError(command.email);
      }
    }

    const userId = uuidv4();

    const result = await this.prisma.$transaction(async (tx) => {
      const ctx = { tx };

      // Create user
      const user = IdentityUser.create(userId, {
        tenantId: command.tenantId,
        externalId: command.externalId,
        email: command.email,
        fullName: command.fullName,
        status: command.status,
      });

      await this.userRepo.create(user, ctx);

      // Create outbox event
      const event = new UserCreatedEvent(userId, {
        userId,
        tenantId: command.tenantId,
        status: user.status,
        email: user.email,
        fullName: user.fullName,
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

      const response: CreateUserResult = {
        id: user.id,
        tenantId: user.tenantId,
        externalId: user.externalId,
        email: user.email,
        fullName: user.fullName,
        status: user.status,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      };

      // Save idempotency record
      if (command.idempotencyKey) {
        await this.idempotencyRepo.create(
          {
            tenantId: command.tenantId,
            scope: IdempotencyScope.IDENTITY_CREATE_USER,
            key: command.idempotencyKey,
            requestHash: this.hashRequest(command),
            responseBody: response,
          },
          ctx,
        );
      }

      return response;
    });

    this.logger.log(`User created: ${userId}`);
    return result;
  }

  private hashRequest(command: CreateUserCommand): string {
    const payload = JSON.stringify({
      tenantId: command.tenantId,
      externalId: command.externalId,
      email: command.email,
      fullName: command.fullName,
      status: command.status,
    });
    return Buffer.from(payload).toString('base64');
  }
}

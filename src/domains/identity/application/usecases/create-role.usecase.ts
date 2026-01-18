import { Inject, Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '@infrastructure/persistence/prisma.service';
import {
  Role,
  ROLE_REPOSITORY,
  RoleRepositoryPort,
  RoleEffect,
  RoleCreatedEvent,
} from '../../domain';
import { OutboxRepository } from '../../../points/outbound/repositories/outbox.repository';
import { IdempotencyRepository, IdempotencyScope } from '../../../points/outbound/repositories/idempotency.repository';
import { RoleCodeAlreadyExistsError } from '../errors';

export interface CreateRoleCommand {
  tenantId: string;
  code: string;
  name: string;
  description?: string;
  effect?: RoleEffect;
  idempotencyKey?: string;
}

export interface CreateRoleResult {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  description?: string;
  effect: string;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class CreateRoleUseCase {
  private readonly logger = new Logger(CreateRoleUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(ROLE_REPOSITORY)
    private readonly roleRepo: RoleRepositoryPort,
    private readonly idempotencyRepo: IdempotencyRepository,
    private readonly outboxRepo: OutboxRepository,
  ) {}

  async execute(command: CreateRoleCommand): Promise<CreateRoleResult> {
    this.logger.debug(`Creating role ${command.code}`);

    // Check idempotency
    if (command.idempotencyKey) {
      const existing = await this.idempotencyRepo.findByKey(
        command.tenantId,
        IdempotencyScope.IDENTITY_CREATE_ROLE,
        command.idempotencyKey,
      );

      if (existing) {
        return existing.responseBody as CreateRoleResult;
      }
    }

    // Check code uniqueness
    const exists = await this.roleRepo.existsByCode(command.tenantId, command.code);
    if (exists) {
      throw new RoleCodeAlreadyExistsError(command.code);
    }

    const roleId = uuidv4();

    const result = await this.prisma.$transaction(async (tx) => {
      const ctx = { tx };

      const role = Role.create(roleId, {
        tenantId: command.tenantId,
        code: command.code,
        name: command.name,
        description: command.description,
        effect: command.effect,
      });

      await this.roleRepo.create(role, ctx);

      // Create outbox event
      const event = new RoleCreatedEvent(roleId, {
        roleId,
        tenantId: command.tenantId,
        code: role.code,
        name: role.name,
        effect: role.effect,
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

      const response: CreateRoleResult = {
        id: role.id,
        tenantId: role.tenantId,
        code: role.code,
        name: role.name,
        description: role.description,
        effect: role.effect,
        createdAt: role.createdAt.toISOString(),
        updatedAt: role.updatedAt.toISOString(),
      };

      if (command.idempotencyKey) {
        await this.idempotencyRepo.create(
          {
            tenantId: command.tenantId,
            scope: IdempotencyScope.IDENTITY_CREATE_ROLE,
            key: command.idempotencyKey,
            requestHash: this.hashRequest(command),
            responseBody: response,
          },
          ctx,
        );
      }

      return response;
    });

    this.logger.log(`Role created: ${roleId}`);
    return result;
  }

  private hashRequest(command: CreateRoleCommand): string {
    const payload = JSON.stringify({
      tenantId: command.tenantId,
      code: command.code,
      name: command.name,
      effect: command.effect,
    });
    return Buffer.from(payload).toString('base64');
  }
}

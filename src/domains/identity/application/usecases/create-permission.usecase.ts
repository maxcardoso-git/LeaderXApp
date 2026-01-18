import { Inject, Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '@infrastructure/persistence/prisma.service';
import {
  Permission,
  PERMISSION_REPOSITORY,
  PermissionRepositoryPort,
  PermissionCreatedEvent,
} from '../../domain';
import { OutboxRepository } from '../../../points/outbound/repositories/outbox.repository';
import { IdempotencyRepository, IdempotencyScope } from '../../../points/outbound/repositories/idempotency.repository';
import { PermissionCodeAlreadyExistsError } from '../errors';

export interface CreatePermissionCommand {
  tenantId: string;
  code: string;
  name: string;
  description?: string;
  category?: string;
  idempotencyKey?: string;
}

export interface CreatePermissionResult {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  description?: string;
  category?: string;
  createdAt: string;
}

@Injectable()
export class CreatePermissionUseCase {
  private readonly logger = new Logger(CreatePermissionUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(PERMISSION_REPOSITORY)
    private readonly permissionRepo: PermissionRepositoryPort,
    private readonly idempotencyRepo: IdempotencyRepository,
    private readonly outboxRepo: OutboxRepository,
  ) {}

  async execute(command: CreatePermissionCommand): Promise<CreatePermissionResult> {
    this.logger.debug(`Creating permission ${command.code}`);

    // Check idempotency
    if (command.idempotencyKey) {
      const existing = await this.idempotencyRepo.findByKey(
        command.tenantId,
        IdempotencyScope.IDENTITY_CREATE_PERMISSION,
        command.idempotencyKey,
      );

      if (existing) {
        return existing.responseBody as CreatePermissionResult;
      }
    }

    // Check code uniqueness
    const exists = await this.permissionRepo.existsByCode(
      command.tenantId,
      command.code,
    );
    if (exists) {
      throw new PermissionCodeAlreadyExistsError(command.code);
    }

    const permissionId = uuidv4();

    const result = await this.prisma.$transaction(async (tx) => {
      const ctx = { tx };

      const permission = Permission.create(permissionId, {
        tenantId: command.tenantId,
        code: command.code,
        name: command.name,
        description: command.description,
        category: command.category,
      });

      await this.permissionRepo.create(permission, ctx);

      // Create outbox event
      const event = new PermissionCreatedEvent(permissionId, {
        permissionId,
        tenantId: command.tenantId,
        code: permission.code,
        name: permission.name,
        category: permission.category,
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

      const response: CreatePermissionResult = {
        id: permission.id,
        tenantId: permission.tenantId,
        code: permission.code,
        name: permission.name,
        description: permission.description,
        category: permission.category,
        createdAt: permission.createdAt.toISOString(),
      };

      if (command.idempotencyKey) {
        await this.idempotencyRepo.create(
          {
            tenantId: command.tenantId,
            scope: IdempotencyScope.IDENTITY_CREATE_PERMISSION,
            key: command.idempotencyKey,
            requestHash: this.hashRequest(command),
            responseBody: response,
          },
          ctx,
        );
      }

      return response;
    });

    this.logger.log(`Permission created: ${permissionId}`);
    return result;
  }

  private hashRequest(command: CreatePermissionCommand): string {
    const payload = JSON.stringify({
      tenantId: command.tenantId,
      code: command.code,
      name: command.name,
    });
    return Buffer.from(payload).toString('base64');
  }
}

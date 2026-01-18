import { Inject, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@infrastructure/persistence/prisma.service';
import {
  ROLE_REPOSITORY,
  RoleRepositoryPort,
  PERMISSION_REPOSITORY,
  PermissionRepositoryPort,
  RoleEffect,
  RolePermissionsUpsertedEvent,
} from '../../domain';
import { OutboxRepository } from '../../../points/outbound/repositories/outbox.repository';
import { RoleNotFoundError, PermissionNotFoundError } from '../errors';

export interface PermissionInput {
  permissionCode: string;
  effect?: RoleEffect;
}

export interface UpsertRolePermissionsCommand {
  tenantId: string;
  roleId: string;
  permissions: PermissionInput[];
}

export interface UpsertRolePermissionsResult {
  roleId: string;
  permissions: Array<{
    permissionId: string;
    permissionCode: string;
    effect: string;
  }>;
}

@Injectable()
export class UpsertRolePermissionsUseCase {
  private readonly logger = new Logger(UpsertRolePermissionsUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(ROLE_REPOSITORY)
    private readonly roleRepo: RoleRepositoryPort,
    @Inject(PERMISSION_REPOSITORY)
    private readonly permissionRepo: PermissionRepositoryPort,
    private readonly outboxRepo: OutboxRepository,
  ) {}

  async execute(
    command: UpsertRolePermissionsCommand,
  ): Promise<UpsertRolePermissionsResult> {
    this.logger.debug(`Upserting permissions for role ${command.roleId}`);

    // Fetch role
    const role = await this.roleRepo.findById(command.tenantId, command.roleId);
    if (!role) {
      throw new RoleNotFoundError(command.roleId);
    }

    // Fetch all permissions by code
    const permissionCodes = command.permissions.map((p) => p.permissionCode);
    const permissions = await this.permissionRepo.findByCodes(
      command.tenantId,
      permissionCodes,
    );

    // Validate all permissions exist
    const foundCodes = new Set(permissions.map((p) => p.code));
    const missingCodes = permissionCodes.filter((code) => !foundCodes.has(code.toUpperCase()));
    if (missingCodes.length > 0) {
      throw new PermissionNotFoundError(missingCodes.join(', '));
    }

    // Map codes to IDs
    const codeToPermission = new Map(permissions.map((p) => [p.code, p]));
    const permissionInputs = command.permissions.map((p) => ({
      permissionId: codeToPermission.get(p.permissionCode.toUpperCase())!.id,
      effect: p.effect ?? RoleEffect.ALLOW,
    }));

    // Update role
    role.upsertPermissions(permissionInputs);

    const result = await this.prisma.$transaction(async (tx) => {
      const ctx = { tx };

      await this.roleRepo.upsertPermissions(role.id, [...role.permissions], ctx);

      // Create outbox event
      const event = new RolePermissionsUpsertedEvent(role.id, {
        roleId: role.id,
        tenantId: command.tenantId,
        permissions: [...role.permissions].map((rp) => ({
          permissionId: rp.permissionId,
          effect: rp.effect,
        })),
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
        roleId: role.id,
        permissions: [...role.permissions].map((rp) => ({
          permissionId: rp.permissionId,
          permissionCode: codeToPermission.get(
            permissions.find((p) => p.id === rp.permissionId)?.code ?? '',
          )?.code ?? '',
          effect: rp.effect,
        })),
      };
    });

    this.logger.log(`Permissions upserted for role: ${command.roleId}`);
    return result;
  }
}

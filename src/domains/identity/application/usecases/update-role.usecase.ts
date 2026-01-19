import { Inject, Injectable } from '@nestjs/common';
import { ROLE_REPOSITORY, RoleRepositoryPort } from '../../domain';
import { RoleNotFoundError } from '../errors';

export interface UpdateRoleCommand {
  tenantId: string;
  roleId: string;
  name?: string;
  description?: string;
}

export interface UpdateRoleResult {
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
export class UpdateRoleUseCase {
  constructor(
    @Inject(ROLE_REPOSITORY)
    private readonly roleRepo: RoleRepositoryPort,
  ) {}

  async execute(command: UpdateRoleCommand): Promise<UpdateRoleResult> {
    const role = await this.roleRepo.findById(command.tenantId, command.roleId);

    if (!role) {
      throw new RoleNotFoundError(command.roleId);
    }

    // Update fields if provided
    if (command.name !== undefined) {
      role.name = command.name;
    }
    if (command.description !== undefined) {
      role.description = command.description;
    }
    role.updatedAt = new Date();

    await this.roleRepo.update(role);

    return {
      id: role.id,
      tenantId: role.tenantId,
      code: role.code,
      name: role.name,
      description: role.description,
      effect: role.effect,
      createdAt: role.createdAt.toISOString(),
      updatedAt: role.updatedAt.toISOString(),
    };
  }
}

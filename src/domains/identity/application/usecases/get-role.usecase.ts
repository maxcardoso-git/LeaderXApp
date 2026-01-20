import { Inject, Injectable } from '@nestjs/common';
import { ROLE_REPOSITORY, RoleRepositoryPort } from '../../domain';
import { RoleNotFoundError } from '../errors';

export interface GetRoleQuery {
  tenantId: string;
  roleId: string;
  includePermissions?: boolean;
}

export interface RolePermissionItem {
  id: string;
  effect: string;
}

export interface GetRoleResult {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  description?: string;
  effect: string;
  permissions: RolePermissionItem[];
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class GetRoleUseCase {
  constructor(
    @Inject(ROLE_REPOSITORY)
    private readonly roleRepo: RoleRepositoryPort,
  ) {}

  async execute(query: GetRoleQuery): Promise<GetRoleResult> {
    const role = query.includePermissions
      ? await this.roleRepo.findByIdWithPermissions(query.tenantId, query.roleId)
      : await this.roleRepo.findById(query.tenantId, query.roleId);

    if (!role) {
      throw new RoleNotFoundError(query.roleId);
    }

    return {
      id: role.id,
      tenantId: role.tenantId,
      code: role.code,
      name: role.name,
      description: role.description,
      effect: role.effect,
      permissions: (role.permissions || []).map((rp) => ({
        id: rp.permissionId,
        effect: rp.effect,
      })),
      createdAt: role.createdAt.toISOString(),
      updatedAt: role.updatedAt.toISOString(),
    };
  }
}

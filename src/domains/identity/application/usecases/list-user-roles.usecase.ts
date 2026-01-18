import { Inject, Injectable } from '@nestjs/common';
import {
  ACCESS_ASSIGNMENT_REPOSITORY,
  AccessAssignmentRepositoryPort,
  ROLE_REPOSITORY,
  RoleRepositoryPort,
  AssignmentStatus,
} from '../../domain';
import { UserNotFoundError } from '../errors';

export interface ListUserRolesQuery {
  tenantId: string;
  userId: string;
  status?: AssignmentStatus;
}

export interface UserRoleItem {
  id: string;
  roleId: string;
  roleCode: string;
  roleName: string;
  scopeType: string;
  scopeId?: string;
  status: string;
  assignedBy?: string;
  assignedAt: string;
  revokedAt?: string;
}

export interface ListUserRolesResult {
  userId: string;
  assignments: UserRoleItem[];
}

@Injectable()
export class ListUserRolesUseCase {
  constructor(
    @Inject(ACCESS_ASSIGNMENT_REPOSITORY)
    private readonly assignmentRepo: AccessAssignmentRepositoryPort,
    @Inject(ROLE_REPOSITORY)
    private readonly roleRepo: RoleRepositoryPort,
  ) {}

  async execute(query: ListUserRolesQuery): Promise<ListUserRolesResult> {
    const assignments = await this.assignmentRepo.findByFilter({
      tenantId: query.tenantId,
      userId: query.userId,
      status: query.status,
    });

    // Get role details
    const roleIds = [...new Set(assignments.map((a) => a.roleId))];
    const roles = await this.roleRepo.findByIds(query.tenantId, roleIds);
    const roleMap = new Map(roles.map((r) => [r.id, r]));

    return {
      userId: query.userId,
      assignments: assignments.map((a) => {
        const role = roleMap.get(a.roleId);
        return {
          id: a.id,
          roleId: a.roleId,
          roleCode: role?.code ?? '',
          roleName: role?.name ?? '',
          scopeType: a.scopeType,
          scopeId: a.scopeId,
          status: a.status,
          assignedBy: a.assignedBy,
          assignedAt: a.assignedAt.toISOString(),
          revokedAt: a.revokedAt?.toISOString(),
        };
      }),
    };
  }
}

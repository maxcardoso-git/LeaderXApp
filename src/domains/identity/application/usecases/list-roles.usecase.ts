import { Inject, Injectable } from '@nestjs/common';
import { ROLE_REPOSITORY, RoleRepositoryPort } from '../../domain';

export interface ListRolesQuery {
  tenantId: string;
  search?: string;
  page: number;
  size: number;
}

export interface RoleItem {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  description?: string;
  effect: string;
  createdAt: string;
  updatedAt: string;
}

export interface ListRolesResult {
  items: RoleItem[];
  page: number;
  size: number;
  total: number;
}

@Injectable()
export class ListRolesUseCase {
  constructor(
    @Inject(ROLE_REPOSITORY)
    private readonly roleRepo: RoleRepositoryPort,
  ) {}

  async execute(query: ListRolesQuery): Promise<ListRolesResult> {
    const result = await this.roleRepo.list(
      {
        tenantId: query.tenantId,
        search: query.search,
      },
      {
        page: query.page,
        size: query.size,
      },
    );

    return {
      items: result.items.map((role) => ({
        id: role.id,
        tenantId: role.tenantId,
        code: role.code,
        name: role.name,
        description: role.description,
        effect: role.effect,
        createdAt: role.createdAt.toISOString(),
        updatedAt: role.updatedAt.toISOString(),
      })),
      page: result.page,
      size: result.size,
      total: result.total,
    };
  }
}

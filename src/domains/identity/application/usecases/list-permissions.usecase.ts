import { Inject, Injectable } from '@nestjs/common';
import {
  PERMISSION_REPOSITORY,
  PermissionRepositoryPort,
} from '../../domain';

export interface ListPermissionsQuery {
  tenantId: string;
  category?: string;
  search?: string;
  page: number;
  size: number;
}

export interface PermissionItem {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  description?: string;
  category?: string;
  createdAt: string;
}

export interface ListPermissionsResult {
  items: PermissionItem[];
  page: number;
  size: number;
  total: number;
}

@Injectable()
export class ListPermissionsUseCase {
  constructor(
    @Inject(PERMISSION_REPOSITORY)
    private readonly permissionRepo: PermissionRepositoryPort,
  ) {}

  async execute(query: ListPermissionsQuery): Promise<ListPermissionsResult> {
    const result = await this.permissionRepo.list(
      {
        tenantId: query.tenantId,
        category: query.category,
        search: query.search,
      },
      {
        page: query.page,
        size: query.size,
      },
    );

    return {
      items: result.items.map((perm) => ({
        id: perm.id,
        tenantId: perm.tenantId,
        code: perm.code,
        name: perm.name,
        description: perm.description,
        category: perm.category,
        createdAt: perm.createdAt.toISOString(),
      })),
      page: result.page,
      size: result.size,
      total: result.total,
    };
  }
}

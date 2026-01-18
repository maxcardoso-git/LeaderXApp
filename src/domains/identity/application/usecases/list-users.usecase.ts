import { Inject, Injectable } from '@nestjs/common';
import {
  IDENTITY_USER_REPOSITORY,
  IdentityUserRepositoryPort,
  UserStatus,
} from '../../domain';

export interface ListUsersQuery {
  tenantId: string;
  status?: UserStatus;
  email?: string;
  page: number;
  size: number;
}

export interface UserItem {
  id: string;
  tenantId: string;
  externalId?: string;
  email?: string;
  fullName?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface ListUsersResult {
  items: UserItem[];
  page: number;
  size: number;
  total: number;
}

@Injectable()
export class ListUsersUseCase {
  constructor(
    @Inject(IDENTITY_USER_REPOSITORY)
    private readonly userRepo: IdentityUserRepositoryPort,
  ) {}

  async execute(query: ListUsersQuery): Promise<ListUsersResult> {
    const result = await this.userRepo.list(
      {
        tenantId: query.tenantId,
        status: query.status,
        email: query.email,
      },
      {
        page: query.page,
        size: query.size,
      },
    );

    return {
      items: result.items.map((user) => ({
        id: user.id,
        tenantId: user.tenantId,
        externalId: user.externalId,
        email: user.email,
        fullName: user.fullName,
        status: user.status,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      })),
      page: result.page,
      size: result.size,
      total: result.total,
    };
  }
}

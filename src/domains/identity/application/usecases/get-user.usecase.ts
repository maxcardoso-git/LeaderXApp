import { Inject, Injectable } from '@nestjs/common';
import {
  IDENTITY_USER_REPOSITORY,
  IdentityUserRepositoryPort,
} from '../../domain';
import { UserNotFoundError } from '../errors';

export interface GetUserQuery {
  tenantId: string;
  userId: string;
}

export interface GetUserResult {
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
export class GetUserUseCase {
  constructor(
    @Inject(IDENTITY_USER_REPOSITORY)
    private readonly userRepo: IdentityUserRepositoryPort,
  ) {}

  async execute(query: GetUserQuery): Promise<GetUserResult> {
    const user = await this.userRepo.findById(query.tenantId, query.userId);

    if (!user) {
      throw new UserNotFoundError(query.userId);
    }

    return {
      id: user.id,
      tenantId: user.tenantId,
      externalId: user.externalId,
      email: user.email,
      fullName: user.fullName,
      status: user.status,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }
}

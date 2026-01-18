import { OwnerType } from '../../domain';

/**
 * Base command with common fields
 */
export interface BasePointsCommand {
  tenantId: string;
  requestId?: string;
  actorId?: string;
  idempotencyKey?: string;
}

/**
 * Credit points to an account
 */
export class CreditPointsCommand implements BasePointsCommand {
  constructor(
    public readonly tenantId: string,
    public readonly ownerType: OwnerType,
    public readonly ownerId: string,
    public readonly amount: number,
    public readonly reasonCode: string,
    public readonly referenceType: string,
    public readonly referenceId: string,
    public readonly metadata?: Record<string, unknown>,
    public readonly requestId?: string,
    public readonly actorId?: string,
    public readonly idempotencyKey?: string,
  ) {}
}

/**
 * Debit points from an account
 */
export class DebitPointsCommand implements BasePointsCommand {
  constructor(
    public readonly tenantId: string,
    public readonly ownerType: OwnerType,
    public readonly ownerId: string,
    public readonly amount: number,
    public readonly reasonCode: string,
    public readonly referenceType: string,
    public readonly referenceId: string,
    public readonly metadata?: Record<string, unknown>,
    public readonly requestId?: string,
    public readonly actorId?: string,
    public readonly idempotencyKey?: string,
  ) {}
}

/**
 * Hold (reserve) points on an account
 */
export class HoldPointsCommand implements BasePointsCommand {
  constructor(
    public readonly tenantId: string,
    public readonly ownerType: OwnerType,
    public readonly ownerId: string,
    public readonly amount: number,
    public readonly reasonCode: string,
    public readonly referenceType: string,
    public readonly referenceId: string,
    public readonly expiresAt?: Date,
    public readonly metadata?: Record<string, unknown>,
    public readonly requestId?: string,
    public readonly actorId?: string,
    public readonly idempotencyKey?: string,
  ) {}
}

/**
 * Release a hold on points
 */
export class ReleaseHoldCommand implements BasePointsCommand {
  constructor(
    public readonly tenantId: string,
    public readonly ownerType: OwnerType,
    public readonly ownerId: string,
    public readonly referenceType: string,
    public readonly referenceId: string,
    public readonly reasonCode: string,
    public readonly metadata?: Record<string, unknown>,
    public readonly requestId?: string,
    public readonly actorId?: string,
    public readonly idempotencyKey?: string,
  ) {}
}

/**
 * Commit a hold (finalize the deduction)
 */
export class CommitHoldCommand implements BasePointsCommand {
  constructor(
    public readonly tenantId: string,
    public readonly ownerType: OwnerType,
    public readonly ownerId: string,
    public readonly referenceType: string,
    public readonly referenceId: string,
    public readonly reasonCode: string,
    public readonly metadata?: Record<string, unknown>,
    public readonly requestId?: string,
    public readonly actorId?: string,
    public readonly idempotencyKey?: string,
  ) {}
}

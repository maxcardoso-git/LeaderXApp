/**
 * Points Port
 * Interface for integration with the Points domain
 */
export interface HoldPointsRequest {
  tenantId: string;
  ownerType: string;
  ownerId: string;
  amount: number;
  reasonCode: string;
  referenceType: string;
  referenceId: string;
  idempotencyKey: string;
}

export interface HoldPointsResponse {
  holdId: string;
  accountId: string;
  amount: number;
}

export interface CommitHoldRequest {
  tenantId: string;
  ownerType: string;
  ownerId: string;
  referenceType: string;
  referenceId: string;
  reasonCode: string;
  idempotencyKey: string;
}

export interface CommitHoldResponse {
  holdId: string;
  status: string;
}

export interface ReleaseHoldRequest {
  tenantId: string;
  ownerType: string;
  ownerId: string;
  referenceType: string;
  referenceId: string;
  reasonCode: string;
  idempotencyKey: string;
}

export interface ReleaseHoldResponse {
  holdId: string;
  status: string;
}

export interface PointsPort {
  /**
   * Create a points hold
   */
  holdPoints(request: HoldPointsRequest): Promise<HoldPointsResponse>;

  /**
   * Commit a points hold (finalize deduction)
   */
  commitHold(request: CommitHoldRequest): Promise<CommitHoldResponse>;

  /**
   * Release a points hold (cancel)
   */
  releaseHold(request: ReleaseHoldRequest): Promise<ReleaseHoldResponse>;
}

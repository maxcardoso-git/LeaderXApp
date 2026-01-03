export enum IdempotencyStatus {
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export interface IdempotencyRecord {
  id: string;
  scope: string;
  idemKey: string;
  tenantId: string;
  status: IdempotencyStatus;
  requestHash: string;
  httpStatus?: number;
  responsePayload?: unknown;
  errorPayload?: unknown;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
}

export interface IdempotencyRunInput {
  /** Operation scope (e.g., "approvals.decide") */
  scope: string;
  /** Idempotency-Key header value */
  key: string;
  /** Tenant ID from context */
  tenantId: string;
  /** TTL in hours (default: 24) */
  ttlHours?: number;
}

export interface IdempotencyResult<T> {
  /** Whether this is a new request or a cached one */
  isNew: boolean;
  /** The idempotency record */
  record: IdempotencyRecord;
  /** Cached response (if not new) */
  cachedResponse?: T;
  /** Cached HTTP status (if not new) */
  cachedStatus?: number;
}

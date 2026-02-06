/**
 * Base interface for all Points domain events
 */
export interface PointsDomainEvent {
  readonly eventId: string;
  readonly occurredAt: Date;
  readonly tenantId: string;
  readonly requestId?: string;
  readonly actorId?: string;
  readonly domain: 'points';
  readonly type: string;
}

/**
 * Event emitted when points are credited to an account
 */
export class PointsCreditedEvent implements PointsDomainEvent {
  readonly domain = 'points' as const;
  readonly type = 'PointsCredited';
  readonly occurredAt = new Date();

  constructor(
    readonly eventId: string,
    readonly tenantId: string,
    readonly accountId: string,
    readonly amount: number,
    readonly referenceType: string,
    readonly referenceId: string,
    readonly reasonCode: string,
    readonly transactionId: string,
    readonly requestId?: string,
    readonly actorId?: string,
  ) {}

  toPayload(): Record<string, unknown> {
    return {
      eventId: this.eventId,
      occurredAt: this.occurredAt.toISOString(),
      tenantId: this.tenantId,
      requestId: this.requestId,
      actorId: this.actorId,
      domain: this.domain,
      type: this.type,
      data: {
        accountId: this.accountId,
        amount: this.amount,
        referenceType: this.referenceType,
        referenceId: this.referenceId,
        reasonCode: this.reasonCode,
        transactionId: this.transactionId,
      },
    };
  }
}

/**
 * Event emitted when points are debited from an account
 */
export class PointsDebitedEvent implements PointsDomainEvent {
  readonly domain = 'points' as const;
  readonly type = 'PointsDebited';
  readonly occurredAt = new Date();

  constructor(
    readonly eventId: string,
    readonly tenantId: string,
    readonly accountId: string,
    readonly amount: number,
    readonly referenceType: string,
    readonly referenceId: string,
    readonly reasonCode: string,
    readonly transactionId: string,
    readonly requestId?: string,
    readonly actorId?: string,
  ) {}

  toPayload(): Record<string, unknown> {
    return {
      eventId: this.eventId,
      occurredAt: this.occurredAt.toISOString(),
      tenantId: this.tenantId,
      requestId: this.requestId,
      actorId: this.actorId,
      domain: this.domain,
      type: this.type,
      data: {
        accountId: this.accountId,
        amount: this.amount,
        referenceType: this.referenceType,
        referenceId: this.referenceId,
        reasonCode: this.reasonCode,
        transactionId: this.transactionId,
      },
    };
  }
}

/**
 * Event emitted when points are held (reserved) on an account
 */
export class PointsHeldEvent implements PointsDomainEvent {
  readonly domain = 'points' as const;
  readonly type = 'PointsHeld';
  readonly occurredAt = new Date();

  constructor(
    readonly eventId: string,
    readonly tenantId: string,
    readonly accountId: string,
    readonly holdId: string,
    readonly amount: number,
    readonly referenceType: string,
    readonly referenceId: string,
    readonly expiresAt?: Date,
    readonly requestId?: string,
    readonly actorId?: string,
  ) {}

  toPayload(): Record<string, unknown> {
    return {
      eventId: this.eventId,
      occurredAt: this.occurredAt.toISOString(),
      tenantId: this.tenantId,
      requestId: this.requestId,
      actorId: this.actorId,
      domain: this.domain,
      type: this.type,
      data: {
        accountId: this.accountId,
        holdId: this.holdId,
        amount: this.amount,
        referenceType: this.referenceType,
        referenceId: this.referenceId,
        expiresAt: this.expiresAt?.toISOString(),
      },
    };
  }
}

/**
 * Event emitted when a hold is released (cancelled)
 */
export class PointsReleasedEvent implements PointsDomainEvent {
  readonly domain = 'points' as const;
  readonly type = 'PointsReleased';
  readonly occurredAt = new Date();

  constructor(
    readonly eventId: string,
    readonly tenantId: string,
    readonly accountId: string,
    readonly holdId: string,
    readonly amount: number,
    readonly referenceType: string,
    readonly referenceId: string,
    readonly requestId?: string,
    readonly actorId?: string,
  ) {}

  toPayload(): Record<string, unknown> {
    return {
      eventId: this.eventId,
      occurredAt: this.occurredAt.toISOString(),
      tenantId: this.tenantId,
      requestId: this.requestId,
      actorId: this.actorId,
      domain: this.domain,
      type: this.type,
      data: {
        accountId: this.accountId,
        holdId: this.holdId,
        amount: this.amount,
        referenceType: this.referenceType,
        referenceId: this.referenceId,
      },
    };
  }
}

/**
 * Event emitted when a hold is committed (finalized)
 */
export class PointsCommittedEvent implements PointsDomainEvent {
  readonly domain = 'points' as const;
  readonly type = 'PointsCommitted';
  readonly occurredAt = new Date();

  constructor(
    readonly eventId: string,
    readonly tenantId: string,
    readonly accountId: string,
    readonly holdId: string,
    readonly amount: number,
    readonly referenceType: string,
    readonly referenceId: string,
    readonly requestId?: string,
    readonly actorId?: string,
  ) {}

  toPayload(): Record<string, unknown> {
    return {
      eventId: this.eventId,
      occurredAt: this.occurredAt.toISOString(),
      tenantId: this.tenantId,
      requestId: this.requestId,
      actorId: this.actorId,
      domain: this.domain,
      type: this.type,
      data: {
        accountId: this.accountId,
        holdId: this.holdId,
        amount: this.amount,
        referenceType: this.referenceType,
        referenceId: this.referenceId,
      },
    };
  }
}

/**
 * Event emitted when a points ledger entry is posted (journey-aware)
 */
export class PointsEntryPostedEvent implements PointsDomainEvent {
  readonly domain = 'points' as const;
  readonly type = 'PointsEntryPosted';
  readonly occurredAt = new Date();

  constructor(
    readonly eventId: string,
    readonly tenantId: string,
    readonly entryId: string,
    readonly accountId: string,
    readonly memberId: string,
    readonly entryType: string,
    readonly amount: number,
    readonly reasonCode: string,
    readonly referenceType: string,
    readonly referenceId: string,
    readonly journeyCode: string,
    readonly journeyTrigger: string,
    readonly idempotencyKey: string,
    readonly approvalPolicyCode?: string,
    readonly approvalRequestId?: string,
    readonly sourceEventId?: string,
    readonly requestId?: string,
    readonly actorId?: string,
  ) {}

  toPayload(): Record<string, unknown> {
    return {
      eventId: this.eventId,
      occurredAt: this.occurredAt.toISOString(),
      tenantId: this.tenantId,
      requestId: this.requestId,
      actorId: this.actorId,
      domain: this.domain,
      type: this.type,
      data: {
        entryId: this.entryId,
        accountId: this.accountId,
        memberId: this.memberId,
        entryType: this.entryType,
        amount: this.amount,
        reasonCode: this.reasonCode,
        referenceType: this.referenceType,
        referenceId: this.referenceId,
        journeyCode: this.journeyCode,
        journeyTrigger: this.journeyTrigger,
        idempotencyKey: this.idempotencyKey,
        approvalPolicyCode: this.approvalPolicyCode,
        approvalRequestId: this.approvalRequestId,
        sourceEventId: this.sourceEventId,
      },
    };
  }
}

/**
 * Event emitted when a points ledger entry is reversed
 */
export class PointsEntryReversedEvent implements PointsDomainEvent {
  readonly domain = 'points' as const;
  readonly type = 'PointsEntryReversed';
  readonly occurredAt = new Date();

  constructor(
    readonly eventId: string,
    readonly tenantId: string,
    readonly originalEntryId: string,
    readonly reversalEntryId: string,
    readonly accountId: string,
    readonly memberId: string,
    readonly amount: number,
    readonly reasonCode: string,
    readonly requestId?: string,
    readonly actorId?: string,
  ) {}

  toPayload(): Record<string, unknown> {
    return {
      eventId: this.eventId,
      occurredAt: this.occurredAt.toISOString(),
      tenantId: this.tenantId,
      requestId: this.requestId,
      actorId: this.actorId,
      domain: this.domain,
      type: this.type,
      data: {
        originalEntryId: this.originalEntryId,
        reversalEntryId: this.reversalEntryId,
        accountId: this.accountId,
        memberId: this.memberId,
        amount: this.amount,
        reasonCode: this.reasonCode,
      },
    };
  }
}

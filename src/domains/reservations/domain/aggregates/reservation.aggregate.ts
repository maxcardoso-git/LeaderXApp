import {
  ResourceType,
  ReservationOwnerType,
  ReservationStatus,
} from '../value-objects';

export interface ReservationProps {
  id: string;
  tenantId: string;
  eventId: string;
  resourceId: string;
  resourceType: ResourceType;
  policyId: string;
  ownerId: string;
  ownerType: ReservationOwnerType;
  status: ReservationStatus;
  pointsHoldId: string | null;
  expiresAt: Date | null;
  confirmedAt: Date | null;
  releasedAt: Date | null;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateReservationProps {
  tenantId: string;
  eventId: string;
  resourceId: string;
  resourceType: ResourceType;
  policyId: string;
  ownerId: string;
  ownerType: ReservationOwnerType;
  expiresAt: Date;
  pointsHoldId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Reservation Aggregate Root
 * Controls the lifecycle: HOLD -> CONFIRMED or HOLD -> RELEASED/EXPIRED
 */
export class Reservation {
  private readonly _id: string;
  private readonly _tenantId: string;
  private readonly _eventId: string;
  private readonly _resourceId: string;
  private readonly _resourceType: ResourceType;
  private readonly _policyId: string;
  private readonly _ownerId: string;
  private readonly _ownerType: ReservationOwnerType;
  private _status: ReservationStatus;
  private _pointsHoldId: string | null;
  private _expiresAt: Date | null;
  private _confirmedAt: Date | null;
  private _releasedAt: Date | null;
  private readonly _metadata?: Record<string, unknown>;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  private constructor(props: ReservationProps) {
    this._id = props.id;
    this._tenantId = props.tenantId;
    this._eventId = props.eventId;
    this._resourceId = props.resourceId;
    this._resourceType = props.resourceType;
    this._policyId = props.policyId;
    this._ownerId = props.ownerId;
    this._ownerType = props.ownerType;
    this._status = props.status;
    this._pointsHoldId = props.pointsHoldId;
    this._expiresAt = props.expiresAt;
    this._confirmedAt = props.confirmedAt;
    this._releasedAt = props.releasedAt;
    this._metadata = props.metadata;
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
  }

  /**
   * Create a new reservation in HOLD status
   */
  static create(id: string, props: CreateReservationProps): Reservation {
    const now = new Date();
    return new Reservation({
      id,
      tenantId: props.tenantId,
      eventId: props.eventId,
      resourceId: props.resourceId,
      resourceType: props.resourceType,
      policyId: props.policyId,
      ownerId: props.ownerId,
      ownerType: props.ownerType,
      status: ReservationStatus.HOLD,
      pointsHoldId: props.pointsHoldId ?? null,
      expiresAt: props.expiresAt,
      confirmedAt: null,
      releasedAt: null,
      metadata: props.metadata,
      createdAt: now,
      updatedAt: now,
    });
  }

  /**
   * Reconstitute from persistence
   */
  static reconstitute(props: ReservationProps): Reservation {
    return new Reservation(props);
  }

  // Getters
  get id(): string {
    return this._id;
  }

  get tenantId(): string {
    return this._tenantId;
  }

  get eventId(): string {
    return this._eventId;
  }

  get resourceId(): string {
    return this._resourceId;
  }

  get resourceType(): ResourceType {
    return this._resourceType;
  }

  get policyId(): string {
    return this._policyId;
  }

  get ownerId(): string {
    return this._ownerId;
  }

  get ownerType(): ReservationOwnerType {
    return this._ownerType;
  }

  get status(): ReservationStatus {
    return this._status;
  }

  get pointsHoldId(): string | null {
    return this._pointsHoldId;
  }

  get expiresAt(): Date | null {
    return this._expiresAt;
  }

  get confirmedAt(): Date | null {
    return this._confirmedAt;
  }

  get releasedAt(): Date | null {
    return this._releasedAt;
  }

  get metadata(): Record<string, unknown> | undefined {
    return this._metadata;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  // Status checks
  isHold(): boolean {
    return this._status === ReservationStatus.HOLD;
  }

  isConfirmed(): boolean {
    return this._status === ReservationStatus.CONFIRMED;
  }

  isReleased(): boolean {
    return this._status === ReservationStatus.RELEASED;
  }

  isExpired(): boolean {
    return this._status === ReservationStatus.EXPIRED;
  }

  isCancelled(): boolean {
    return this._status === ReservationStatus.CANCELLED;
  }

  isActive(): boolean {
    return this.isHold() || this.isConfirmed();
  }

  /**
   * Check if the hold has expired based on expiresAt
   */
  hasExpired(now: Date = new Date()): boolean {
    if (!this.isHold()) return false;
    if (!this._expiresAt) return false;
    return now > this._expiresAt;
  }

  /**
   * Check if reservation has a points hold
   */
  hasPointsHold(): boolean {
    return this._pointsHoldId !== null;
  }

  /**
   * Confirm the reservation (HOLD -> CONFIRMED)
   */
  confirm(): void {
    if (!this.isHold()) {
      throw new Error(
        `Cannot confirm reservation: status is ${this._status}, expected HOLD`,
      );
    }

    const now = new Date();
    if (this.hasExpired(now)) {
      throw new Error('Cannot confirm reservation: hold has expired');
    }

    this._status = ReservationStatus.CONFIRMED;
    this._confirmedAt = now;
    this._expiresAt = null; // Confirmed reservations don't expire
    this._updatedAt = now;
  }

  /**
   * Release the reservation (HOLD -> RELEASED)
   */
  release(): void {
    if (!this.isHold()) {
      throw new Error(
        `Cannot release reservation: status is ${this._status}, expected HOLD`,
      );
    }

    const now = new Date();
    this._status = ReservationStatus.RELEASED;
    this._releasedAt = now;
    this._updatedAt = now;
  }

  /**
   * Expire the reservation (HOLD -> EXPIRED)
   */
  expire(): void {
    if (!this.isHold()) {
      throw new Error(
        `Cannot expire reservation: status is ${this._status}, expected HOLD`,
      );
    }

    const now = new Date();
    this._status = ReservationStatus.EXPIRED;
    this._releasedAt = now;
    this._updatedAt = now;
  }

  /**
   * Cancel a confirmed reservation (CONFIRMED -> CANCELLED)
   */
  cancel(): void {
    if (!this.isConfirmed()) {
      throw new Error(
        `Cannot cancel reservation: status is ${this._status}, expected CONFIRMED`,
      );
    }

    const now = new Date();
    this._status = ReservationStatus.CANCELLED;
    this._releasedAt = now;
    this._updatedAt = now;
  }

  /**
   * Set the points hold ID (used after creating hold)
   */
  setPointsHoldId(holdId: string): void {
    this._pointsHoldId = holdId;
    this._updatedAt = new Date();
  }
}

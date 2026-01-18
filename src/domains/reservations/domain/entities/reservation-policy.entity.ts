import {
  ResourceType,
  ReservationWindow,
  HoldTtl,
  PointsCost,
} from '../value-objects';

export interface ReservationPolicyProps {
  id: string;
  tenantId: string;
  eventId: string;
  resourceType: ResourceType;
  costInPoints: number;
  maxPerUser: number;
  requiresApproval: boolean;
  holdTtlSeconds: number;
  windowStart: Date | null;
  windowEnd: Date | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Reservation Policy Entity
 * Rules for reservations by resource type, limits, and costs
 */
export class ReservationPolicy {
  private readonly _id: string;
  private readonly _tenantId: string;
  private readonly _eventId: string;
  private readonly _resourceType: ResourceType;
  private readonly _costInPoints: PointsCost;
  private readonly _maxPerUser: number;
  private readonly _requiresApproval: boolean;
  private readonly _holdTtl: HoldTtl;
  private readonly _window: ReservationWindow;
  private readonly _isActive: boolean;
  private readonly _createdAt: Date;
  private readonly _updatedAt: Date;

  private constructor(props: ReservationPolicyProps) {
    this._id = props.id;
    this._tenantId = props.tenantId;
    this._eventId = props.eventId;
    this._resourceType = props.resourceType;
    this._costInPoints = PointsCost.create(props.costInPoints);
    this._maxPerUser = props.maxPerUser;
    this._requiresApproval = props.requiresApproval;
    this._holdTtl = HoldTtl.create(props.holdTtlSeconds);
    this._window = ReservationWindow.create(props.windowStart, props.windowEnd);
    this._isActive = props.isActive;
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
  }

  static reconstitute(props: ReservationPolicyProps): ReservationPolicy {
    return new ReservationPolicy(props);
  }

  get id(): string {
    return this._id;
  }

  get tenantId(): string {
    return this._tenantId;
  }

  get eventId(): string {
    return this._eventId;
  }

  get resourceType(): ResourceType {
    return this._resourceType;
  }

  get costInPoints(): PointsCost {
    return this._costInPoints;
  }

  get maxPerUser(): number {
    return this._maxPerUser;
  }

  get requiresApproval(): boolean {
    return this._requiresApproval;
  }

  get holdTtl(): HoldTtl {
    return this._holdTtl;
  }

  get window(): ReservationWindow {
    return this._window;
  }

  get isActive(): boolean {
    return this._isActive;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  /**
   * Check if reservations are currently allowed
   */
  isWindowOpen(now: Date = new Date()): boolean {
    return this._isActive && this._window.isOpen(now);
  }

  /**
   * Calculate expiration time for a hold
   */
  calculateExpiresAt(from: Date = new Date()): Date {
    return this._holdTtl.calculateExpiresAt(from);
  }

  /**
   * Check if points are required
   */
  requiresPoints(): boolean {
    return this._costInPoints.requiresPoints();
  }
}

import { ResourceType, Capacity } from '../value-objects';

export interface ReservableResourceProps {
  id: string;
  tenantId: string;
  eventId: string;
  resourceType: ResourceType;
  name: string;
  capacityTotal: number;
  metadata?: Record<string, unknown>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Reservable Resource Entity
 * Represents a reservable item (table, seat, slot) with capacity
 */
export class ReservableResource {
  private readonly _id: string;
  private readonly _tenantId: string;
  private readonly _eventId: string;
  private readonly _resourceType: ResourceType;
  private readonly _name: string;
  private readonly _capacityTotal: number;
  private readonly _metadata?: Record<string, unknown>;
  private readonly _isActive: boolean;
  private readonly _createdAt: Date;
  private readonly _updatedAt: Date;

  private constructor(props: ReservableResourceProps) {
    this._id = props.id;
    this._tenantId = props.tenantId;
    this._eventId = props.eventId;
    this._resourceType = props.resourceType;
    this._name = props.name;
    this._capacityTotal = props.capacityTotal;
    this._metadata = props.metadata;
    this._isActive = props.isActive;
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
  }

  static reconstitute(props: ReservableResourceProps): ReservableResource {
    return new ReservableResource(props);
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

  get name(): string {
    return this._name;
  }

  get capacityTotal(): number {
    return this._capacityTotal;
  }

  get metadata(): Record<string, unknown> | undefined {
    return this._metadata;
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
   * Calculate capacity with given active reservations count
   */
  calculateCapacity(activeReservationsCount: number): Capacity {
    return Capacity.create(this._capacityTotal, activeReservationsCount);
  }

  /**
   * Check if resource can accommodate more reservations
   */
  hasCapacity(activeReservationsCount: number): boolean {
    return activeReservationsCount < this._capacityTotal;
  }
}

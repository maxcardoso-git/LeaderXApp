import { randomUUID } from 'crypto';

export interface EventPhaseProps {
  id?: string;
  tenantId: string;
  eventId: string;
  name: string;
  startsAt: Date;
  endsAt: Date;
  sortOrder?: number;
  metadata?: Record<string, unknown>;
  createdAt?: Date;
  updatedAt?: Date;
}

export class EventPhase {
  private _id: string;
  private _tenantId: string;
  private _eventId: string;
  private _name: string;
  private _startsAt: Date;
  private _endsAt: Date;
  private _sortOrder: number;
  private _metadata?: Record<string, unknown>;
  private _createdAt: Date;
  private _updatedAt: Date;

  private constructor(props: EventPhaseProps) {
    this._id = props.id ?? randomUUID();
    this._tenantId = props.tenantId;
    this._eventId = props.eventId;
    this._name = props.name;
    this._startsAt = props.startsAt;
    this._endsAt = props.endsAt;
    this._sortOrder = props.sortOrder ?? 0;
    this._metadata = props.metadata;
    this._createdAt = props.createdAt ?? new Date();
    this._updatedAt = props.updatedAt ?? new Date();
  }

  static create(props: EventPhaseProps): EventPhase {
    if (!props.name?.trim()) {
      throw new Error('Phase name is required');
    }
    if (props.endsAt <= props.startsAt) {
      throw new Error('Phase end time must be after start time');
    }
    return new EventPhase(props);
  }

  static reconstitute(props: EventPhaseProps): EventPhase {
    return new EventPhase(props);
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
  get name(): string {
    return this._name;
  }
  get startsAt(): Date {
    return this._startsAt;
  }
  get endsAt(): Date {
    return this._endsAt;
  }
  get sortOrder(): number {
    return this._sortOrder;
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

  // Methods
  update(props: {
    name?: string;
    startsAt?: Date;
    endsAt?: Date;
    sortOrder?: number;
    metadata?: Record<string, unknown>;
  }): void {
    if (props.name !== undefined) {
      if (!props.name.trim()) {
        throw new Error('Phase name cannot be empty');
      }
      this._name = props.name;
    }
    if (props.startsAt !== undefined) {
      this._startsAt = props.startsAt;
    }
    if (props.endsAt !== undefined) {
      this._endsAt = props.endsAt;
    }
    if (this._endsAt <= this._startsAt) {
      throw new Error('Phase end time must be after start time');
    }
    if (props.sortOrder !== undefined) {
      this._sortOrder = props.sortOrder;
    }
    if (props.metadata !== undefined) {
      this._metadata = props.metadata;
    }
    this._updatedAt = new Date();
  }

  isActive(now: Date = new Date()): boolean {
    return now >= this._startsAt && now <= this._endsAt;
  }

  toPersistence(): Record<string, unknown> {
    return {
      id: this._id,
      tenantId: this._tenantId,
      eventId: this._eventId,
      name: this._name,
      startsAt: this._startsAt,
      endsAt: this._endsAt,
      sortOrder: this._sortOrder,
      metadata: this._metadata,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    };
  }
}

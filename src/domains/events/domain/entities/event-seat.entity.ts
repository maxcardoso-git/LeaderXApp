import { randomUUID } from 'crypto';

export interface EventSeatProps {
  id?: string;
  tenantId: string;
  eventId: string;
  tableId: string;
  seatNumber: number;
  metadata?: Record<string, unknown>;
  createdAt?: Date;
  updatedAt?: Date;
}

export class EventSeat {
  private _id: string;
  private _tenantId: string;
  private _eventId: string;
  private _tableId: string;
  private _seatNumber: number;
  private _metadata?: Record<string, unknown>;
  private _createdAt: Date;
  private _updatedAt: Date;

  private constructor(props: EventSeatProps) {
    this._id = props.id ?? randomUUID();
    this._tenantId = props.tenantId;
    this._eventId = props.eventId;
    this._tableId = props.tableId;
    this._seatNumber = props.seatNumber;
    this._metadata = props.metadata;
    this._createdAt = props.createdAt ?? new Date();
    this._updatedAt = props.updatedAt ?? new Date();
  }

  static create(props: EventSeatProps): EventSeat {
    if (props.seatNumber < 1) {
      throw new Error('Seat number must be at least 1');
    }
    return new EventSeat(props);
  }

  static reconstitute(props: EventSeatProps): EventSeat {
    return new EventSeat(props);
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
  get tableId(): string {
    return this._tableId;
  }
  get seatNumber(): number {
    return this._seatNumber;
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
  updateMetadata(metadata: Record<string, unknown>): void {
    this._metadata = metadata;
    this._updatedAt = new Date();
  }

  toPersistence(): Record<string, unknown> {
    return {
      id: this._id,
      tenantId: this._tenantId,
      eventId: this._eventId,
      tableId: this._tableId,
      seatNumber: this._seatNumber,
      metadata: this._metadata,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    };
  }
}

import { randomUUID } from 'crypto';
import { EventSeat } from './event-seat.entity';

export interface EventTableProps {
  id?: string;
  tenantId: string;
  eventId: string;
  name: string;
  capacity: number;
  metadata?: Record<string, unknown>;
  createdAt?: Date;
  updatedAt?: Date;
  seats?: EventSeat[];
}

export class EventTable {
  private _id: string;
  private _tenantId: string;
  private _eventId: string;
  private _name: string;
  private _capacity: number;
  private _metadata?: Record<string, unknown>;
  private _createdAt: Date;
  private _updatedAt: Date;
  private _seats: EventSeat[];

  private constructor(props: EventTableProps) {
    this._id = props.id ?? randomUUID();
    this._tenantId = props.tenantId;
    this._eventId = props.eventId;
    this._name = props.name;
    this._capacity = props.capacity;
    this._metadata = props.metadata;
    this._createdAt = props.createdAt ?? new Date();
    this._updatedAt = props.updatedAt ?? new Date();
    this._seats = props.seats ?? [];
  }

  static create(props: EventTableProps): EventTable {
    if (!props.name?.trim()) {
      throw new Error('Table name is required');
    }
    if (props.capacity < 1) {
      throw new Error('Table capacity must be at least 1');
    }
    return new EventTable(props);
  }

  static reconstitute(props: EventTableProps): EventTable {
    return new EventTable(props);
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
  get capacity(): number {
    return this._capacity;
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
  get seats(): EventSeat[] {
    return [...this._seats];
  }

  // Methods
  update(props: {
    name?: string;
    capacity?: number;
    metadata?: Record<string, unknown>;
  }): void {
    if (props.name !== undefined) {
      if (!props.name.trim()) {
        throw new Error('Table name cannot be empty');
      }
      this._name = props.name;
    }
    if (props.capacity !== undefined) {
      if (props.capacity < 1) {
        throw new Error('Table capacity must be at least 1');
      }
      if (props.capacity < this._seats.length) {
        throw new Error('Cannot reduce capacity below current seat count');
      }
      this._capacity = props.capacity;
    }
    if (props.metadata !== undefined) {
      this._metadata = props.metadata;
    }
    this._updatedAt = new Date();
  }

  addSeat(seat: EventSeat): void {
    if (this._seats.length >= this._capacity) {
      throw new Error('Table capacity exceeded');
    }
    const existingSeatNumber = this._seats.find(
      (s) => s.seatNumber === seat.seatNumber,
    );
    if (existingSeatNumber) {
      throw new Error(`Seat number ${seat.seatNumber} already exists`);
    }
    this._seats.push(seat);
    this._updatedAt = new Date();
  }

  removeSeat(seatId: string): EventSeat | null {
    const index = this._seats.findIndex((s) => s.id === seatId);
    if (index === -1) {
      return null;
    }
    const [removed] = this._seats.splice(index, 1);
    this._updatedAt = new Date();
    return removed;
  }

  getSeatByNumber(seatNumber: number): EventSeat | null {
    return this._seats.find((s) => s.seatNumber === seatNumber) ?? null;
  }

  getAvailableSeatsCount(): number {
    return this._capacity - this._seats.length;
  }

  toPersistence(): Record<string, unknown> {
    return {
      id: this._id,
      tenantId: this._tenantId,
      eventId: this._eventId,
      name: this._name,
      capacity: this._capacity,
      metadata: this._metadata,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    };
  }
}

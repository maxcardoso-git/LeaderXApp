import { randomUUID } from 'crypto';
import {
  EventStatus,
  EventVisibility,
  ReservationMode,
  PolicyScope,
  VALID_STATUS_TRANSITIONS,
} from '../value-objects';
import {
  EventPhase,
  EventPhaseProps,
  EventTable,
  EventTableProps,
  EventSeat,
  EventSeatProps,
  EventPolicyBinding,
  EventPolicyBindingProps,
} from '../entities';
import {
  EventCreatedEvent,
  EventUpdatedEvent,
  EventPublishedEvent,
  EventActivatedEvent,
  EventClosedEvent,
  EventCanceledEvent,
  EventReopenedEvent,
  EventPhaseAddedEvent,
  EventTableAddedEvent,
  EventSeatAddedEvent,
  EventPolicyBoundEvent,
  EventPolicyUnboundEvent,
  DomainEvent,
} from '../events';

export interface EventAggregateProps {
  id?: string;
  tenantId: string;
  name: string;
  description?: string;
  status?: EventStatus;
  visibility?: EventVisibility;
  reservationMode?: ReservationMode;
  startsAt: Date;
  endsAt: Date;
  metadata?: Record<string, unknown>;
  createdAt?: Date;
  updatedAt?: Date;
  phases?: EventPhase[];
  tables?: EventTable[];
  policyBindings?: EventPolicyBinding[];
}

export class EventAggregate {
  private _id: string;
  private _tenantId: string;
  private _name: string;
  private _description?: string;
  private _status: EventStatus;
  private _visibility: EventVisibility;
  private _reservationMode: ReservationMode;
  private _startsAt: Date;
  private _endsAt: Date;
  private _metadata?: Record<string, unknown>;
  private _createdAt: Date;
  private _updatedAt: Date;
  private _phases: EventPhase[];
  private _tables: EventTable[];
  private _policyBindings: EventPolicyBinding[];
  private _domainEvents: DomainEvent[] = [];

  private constructor(props: EventAggregateProps) {
    this._id = props.id ?? randomUUID();
    this._tenantId = props.tenantId;
    this._name = props.name;
    this._description = props.description;
    this._status = props.status ?? EventStatus.DRAFT;
    this._visibility = props.visibility ?? EventVisibility.PUBLIC;
    this._reservationMode = props.reservationMode ?? ReservationMode.FREE;
    this._startsAt = props.startsAt;
    this._endsAt = props.endsAt;
    this._metadata = props.metadata;
    this._createdAt = props.createdAt ?? new Date();
    this._updatedAt = props.updatedAt ?? new Date();
    this._phases = props.phases ?? [];
    this._tables = props.tables ?? [];
    this._policyBindings = props.policyBindings ?? [];
  }

  static create(
    props: Omit<EventAggregateProps, 'id' | 'status' | 'createdAt' | 'updatedAt'>,
  ): EventAggregate {
    if (!props.name?.trim()) {
      throw new Error('Event name is required');
    }
    if (props.endsAt <= props.startsAt) {
      throw new Error('Event end time must be after start time');
    }

    const event = new EventAggregate({
      ...props,
      status: EventStatus.DRAFT,
    });

    event.addDomainEvent(
      new EventCreatedEvent({
        eventId: event._id,
        tenantId: event._tenantId,
        name: event._name,
        status: event._status,
        visibility: event._visibility,
        reservationMode: event._reservationMode,
        startsAt: event._startsAt,
        endsAt: event._endsAt,
      }),
    );

    return event;
  }

  static reconstitute(props: EventAggregateProps): EventAggregate {
    return new EventAggregate(props);
  }

  // Getters
  get id(): string {
    return this._id;
  }
  get tenantId(): string {
    return this._tenantId;
  }
  get name(): string {
    return this._name;
  }
  get description(): string | undefined {
    return this._description;
  }
  get status(): EventStatus {
    return this._status;
  }
  get visibility(): EventVisibility {
    return this._visibility;
  }
  get reservationMode(): ReservationMode {
    return this._reservationMode;
  }
  get startsAt(): Date {
    return this._startsAt;
  }
  get endsAt(): Date {
    return this._endsAt;
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
  get phases(): EventPhase[] {
    return [...this._phases];
  }
  get tables(): EventTable[] {
    return [...this._tables];
  }
  get policyBindings(): EventPolicyBinding[] {
    return [...this._policyBindings];
  }
  get domainEvents(): DomainEvent[] {
    return [...this._domainEvents];
  }

  // Private helpers
  private addDomainEvent(event: DomainEvent): void {
    this._domainEvents.push(event);
  }

  clearDomainEvents(): void {
    this._domainEvents = [];
  }

  private canModifyStructure(): boolean {
    return (
      this._status === EventStatus.DRAFT ||
      this._status === EventStatus.PUBLISHED
    );
  }

  private validateStatusTransition(newStatus: EventStatus): void {
    const validTransitions = VALID_STATUS_TRANSITIONS[this._status];
    if (!validTransitions.includes(newStatus)) {
      throw new Error(
        `Invalid status transition from ${this._status} to ${newStatus}`,
      );
    }
  }

  // Update methods
  update(props: {
    name?: string;
    description?: string;
    visibility?: EventVisibility;
    reservationMode?: ReservationMode;
    startsAt?: Date;
    endsAt?: Date;
    metadata?: Record<string, unknown>;
  }): void {
    if (this._status === EventStatus.CANCELED) {
      throw new Error('Cannot update a canceled event');
    }
    if (this._status === EventStatus.CLOSED) {
      throw new Error('Cannot update a closed event');
    }

    const changes: Record<string, unknown> = {};

    if (props.name !== undefined) {
      if (!props.name.trim()) {
        throw new Error('Event name cannot be empty');
      }
      changes.name = { from: this._name, to: props.name };
      this._name = props.name;
    }
    if (props.description !== undefined) {
      changes.description = { from: this._description, to: props.description };
      this._description = props.description;
    }
    if (props.visibility !== undefined) {
      changes.visibility = { from: this._visibility, to: props.visibility };
      this._visibility = props.visibility;
    }
    if (props.reservationMode !== undefined) {
      changes.reservationMode = {
        from: this._reservationMode,
        to: props.reservationMode,
      };
      this._reservationMode = props.reservationMode;
    }
    if (props.startsAt !== undefined) {
      changes.startsAt = { from: this._startsAt, to: props.startsAt };
      this._startsAt = props.startsAt;
    }
    if (props.endsAt !== undefined) {
      changes.endsAt = { from: this._endsAt, to: props.endsAt };
      this._endsAt = props.endsAt;
    }
    if (this._endsAt <= this._startsAt) {
      throw new Error('Event end time must be after start time');
    }
    if (props.metadata !== undefined) {
      this._metadata = props.metadata;
    }

    this._updatedAt = new Date();

    if (Object.keys(changes).length > 0) {
      this.addDomainEvent(
        new EventUpdatedEvent({
          eventId: this._id,
          tenantId: this._tenantId,
          changes,
        }),
      );
    }
  }

  // Lifecycle methods
  publish(): void {
    this.validateStatusTransition(EventStatus.PUBLISHED);
    this._status = EventStatus.PUBLISHED;
    this._updatedAt = new Date();

    this.addDomainEvent(
      new EventPublishedEvent({
        eventId: this._id,
        tenantId: this._tenantId,
      }),
    );
  }

  activate(): void {
    this.validateStatusTransition(EventStatus.ACTIVE);
    this._status = EventStatus.ACTIVE;
    this._updatedAt = new Date();

    this.addDomainEvent(
      new EventActivatedEvent({
        eventId: this._id,
        tenantId: this._tenantId,
      }),
    );
  }

  close(): void {
    this.validateStatusTransition(EventStatus.CLOSED);
    this._status = EventStatus.CLOSED;
    this._updatedAt = new Date();

    this.addDomainEvent(
      new EventClosedEvent({
        eventId: this._id,
        tenantId: this._tenantId,
      }),
    );
  }

  cancel(reason?: string): void {
    this.validateStatusTransition(EventStatus.CANCELED);
    this._status = EventStatus.CANCELED;
    this._updatedAt = new Date();

    this.addDomainEvent(
      new EventCanceledEvent({
        eventId: this._id,
        tenantId: this._tenantId,
        reason,
      }),
    );
  }

  reopen(reason?: string): void {
    this.validateStatusTransition(EventStatus.DRAFT);
    this._status = EventStatus.DRAFT;
    this._updatedAt = new Date();

    this.addDomainEvent(
      new EventReopenedEvent({
        eventId: this._id,
        tenantId: this._tenantId,
        reason,
      }),
    );
  }

  // Phase management
  addPhase(props: Omit<EventPhaseProps, 'tenantId' | 'eventId'>): EventPhase {
    if (!this.canModifyStructure()) {
      throw new Error('Cannot add phases in current event status');
    }

    const phase = EventPhase.create({
      ...props,
      tenantId: this._tenantId,
      eventId: this._id,
    });

    this._phases.push(phase);
    this._updatedAt = new Date();

    this.addDomainEvent(
      new EventPhaseAddedEvent({
        eventId: this._id,
        tenantId: this._tenantId,
        phaseId: phase.id,
        phaseName: phase.name,
      }),
    );

    return phase;
  }

  updatePhase(
    phaseId: string,
    props: {
      name?: string;
      startsAt?: Date;
      endsAt?: Date;
      sortOrder?: number;
      metadata?: Record<string, unknown>;
    },
  ): void {
    if (!this.canModifyStructure()) {
      throw new Error('Cannot update phases in current event status');
    }

    const phase = this._phases.find((p) => p.id === phaseId);
    if (!phase) {
      throw new Error('Phase not found');
    }

    phase.update(props);
    this._updatedAt = new Date();
  }

  removePhase(phaseId: string): void {
    if (!this.canModifyStructure()) {
      throw new Error('Cannot remove phases in current event status');
    }

    const index = this._phases.findIndex((p) => p.id === phaseId);
    if (index === -1) {
      throw new Error('Phase not found');
    }

    this._phases.splice(index, 1);
    this._updatedAt = new Date();
  }

  // Table management
  addTable(props: Omit<EventTableProps, 'tenantId' | 'eventId'>): EventTable {
    if (!this.canModifyStructure()) {
      throw new Error('Cannot add tables in current event status');
    }

    const table = EventTable.create({
      ...props,
      tenantId: this._tenantId,
      eventId: this._id,
    });

    this._tables.push(table);
    this._updatedAt = new Date();

    this.addDomainEvent(
      new EventTableAddedEvent({
        eventId: this._id,
        tenantId: this._tenantId,
        tableId: table.id,
        tableName: table.name,
        capacity: table.capacity,
      }),
    );

    return table;
  }

  updateTable(
    tableId: string,
    props: {
      name?: string;
      capacity?: number;
      metadata?: Record<string, unknown>;
    },
  ): void {
    if (!this.canModifyStructure()) {
      throw new Error('Cannot update tables in current event status');
    }

    const table = this._tables.find((t) => t.id === tableId);
    if (!table) {
      throw new Error('Table not found');
    }

    table.update(props);
    this._updatedAt = new Date();
  }

  removeTable(tableId: string): void {
    if (!this.canModifyStructure()) {
      throw new Error('Cannot remove tables in current event status');
    }

    const index = this._tables.findIndex((t) => t.id === tableId);
    if (index === -1) {
      throw new Error('Table not found');
    }

    this._tables.splice(index, 1);
    this._updatedAt = new Date();
  }

  // Seat management
  addSeat(
    tableId: string,
    props: Omit<EventSeatProps, 'tenantId' | 'eventId' | 'tableId'>,
  ): EventSeat {
    if (!this.canModifyStructure()) {
      throw new Error('Cannot add seats in current event status');
    }

    const table = this._tables.find((t) => t.id === tableId);
    if (!table) {
      throw new Error('Table not found');
    }

    const seat = EventSeat.create({
      ...props,
      tenantId: this._tenantId,
      eventId: this._id,
      tableId,
    });

    table.addSeat(seat);
    this._updatedAt = new Date();

    this.addDomainEvent(
      new EventSeatAddedEvent({
        eventId: this._id,
        tenantId: this._tenantId,
        tableId,
        seatId: seat.id,
        seatNumber: seat.seatNumber,
      }),
    );

    return seat;
  }

  removeSeat(tableId: string, seatId: string): void {
    if (!this.canModifyStructure()) {
      throw new Error('Cannot remove seats in current event status');
    }

    const table = this._tables.find((t) => t.id === tableId);
    if (!table) {
      throw new Error('Table not found');
    }

    const removed = table.removeSeat(seatId);
    if (!removed) {
      throw new Error('Seat not found');
    }

    this._updatedAt = new Date();
  }

  // Policy binding management
  bindPolicy(
    props: Omit<EventPolicyBindingProps, 'tenantId' | 'eventId'>,
  ): EventPolicyBinding {
    const existingBinding = this._policyBindings.find(
      (b) => b.policyCode === props.policyCode,
    );
    if (existingBinding) {
      throw new Error('Policy already bound to this event');
    }

    const binding = EventPolicyBinding.create({
      ...props,
      tenantId: this._tenantId,
      eventId: this._id,
    });

    this._policyBindings.push(binding);
    this._updatedAt = new Date();

    this.addDomainEvent(
      new EventPolicyBoundEvent({
        eventId: this._id,
        tenantId: this._tenantId,
        policyCode: binding.policyCode,
        scope: binding.scope,
      }),
    );

    return binding;
  }

  unbindPolicy(policyCode: string): void {
    const index = this._policyBindings.findIndex(
      (b) => b.policyCode === policyCode,
    );
    if (index === -1) {
      throw new Error('Policy not bound to this event');
    }

    const binding = this._policyBindings[index];
    this._policyBindings.splice(index, 1);
    this._updatedAt = new Date();

    this.addDomainEvent(
      new EventPolicyUnboundEvent({
        eventId: this._id,
        tenantId: this._tenantId,
        policyCode: binding.policyCode,
      }),
    );
  }

  // Utility methods
  getTotalCapacity(): number {
    return this._tables.reduce((sum, table) => sum + table.capacity, 0);
  }

  getTotalSeats(): number {
    return this._tables.reduce((sum, table) => sum + table.seats.length, 0);
  }

  getTableById(tableId: string): EventTable | null {
    return this._tables.find((t) => t.id === tableId) ?? null;
  }

  getPhaseById(phaseId: string): EventPhase | null {
    return this._phases.find((p) => p.id === phaseId) ?? null;
  }

  hasPolicyBinding(policyCode: string): boolean {
    return this._policyBindings.some((b) => b.policyCode === policyCode);
  }

  toPersistence(): Record<string, unknown> {
    return {
      id: this._id,
      tenantId: this._tenantId,
      name: this._name,
      description: this._description,
      status: this._status,
      visibility: this._visibility,
      reservationMode: this._reservationMode,
      startsAt: this._startsAt,
      endsAt: this._endsAt,
      metadata: this._metadata,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    };
  }
}

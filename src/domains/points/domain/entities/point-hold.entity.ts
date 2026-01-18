import { HoldStatus, Reference } from '../value-objects';

export interface PointHoldProps {
  id: string;
  tenantId: string;
  accountId: string;
  reference: Reference;
  amount: number;
  status: HoldStatus;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePointHoldProps {
  tenantId: string;
  accountId: string;
  referenceType: string;
  referenceId: string;
  amount: number;
  expiresAt?: Date;
}

/**
 * Point Hold Entity
 * Represents a reservation/hold of points
 */
export class PointHold {
  private readonly _id: string;
  private readonly _tenantId: string;
  private readonly _accountId: string;
  private readonly _reference: Reference;
  private readonly _amount: number;
  private _status: HoldStatus;
  private readonly _expiresAt?: Date;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  private constructor(props: PointHoldProps) {
    this._id = props.id;
    this._tenantId = props.tenantId;
    this._accountId = props.accountId;
    this._reference = props.reference;
    this._amount = props.amount;
    this._status = props.status;
    this._expiresAt = props.expiresAt;
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
  }

  static create(id: string, props: CreatePointHoldProps): PointHold {
    if (props.amount <= 0) {
      throw new Error('Hold amount must be positive');
    }

    const now = new Date();
    return new PointHold({
      id,
      tenantId: props.tenantId,
      accountId: props.accountId,
      reference: Reference.create(props.referenceType, props.referenceId),
      amount: props.amount,
      status: HoldStatus.ACTIVE,
      expiresAt: props.expiresAt,
      createdAt: now,
      updatedAt: now,
    });
  }

  static reconstitute(props: PointHoldProps): PointHold {
    return new PointHold(props);
  }

  get id(): string {
    return this._id;
  }

  get tenantId(): string {
    return this._tenantId;
  }

  get accountId(): string {
    return this._accountId;
  }

  get reference(): Reference {
    return this._reference;
  }

  get referenceType(): string {
    return this._reference.type;
  }

  get referenceId(): string {
    return this._reference.id;
  }

  get amount(): number {
    return this._amount;
  }

  get status(): HoldStatus {
    return this._status;
  }

  get expiresAt(): Date | undefined {
    return this._expiresAt;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  isActive(): boolean {
    return this._status === HoldStatus.ACTIVE;
  }

  isExpired(): boolean {
    if (!this._expiresAt) return false;
    return new Date() > this._expiresAt;
  }

  commit(): void {
    if (!this.isActive()) {
      throw new Error(`Cannot commit hold: status is ${this._status}`);
    }
    this._status = HoldStatus.COMMITTED;
    this._updatedAt = new Date();
  }

  release(): void {
    if (!this.isActive()) {
      throw new Error(`Cannot release hold: status is ${this._status}`);
    }
    this._status = HoldStatus.RELEASED;
    this._updatedAt = new Date();
  }

  expire(): void {
    if (!this.isActive()) {
      throw new Error(`Cannot expire hold: status is ${this._status}`);
    }
    this._status = HoldStatus.EXPIRED;
    this._updatedAt = new Date();
  }
}

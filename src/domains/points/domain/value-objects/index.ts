// Enums
export enum OwnerType {
  USER = 'USER',
  ORG = 'ORG',
}

export enum AccountStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
}

export enum LedgerEntryType {
  CREDIT = 'CREDIT',
  DEBIT = 'DEBIT',
  HOLD = 'HOLD',
  RELEASE = 'RELEASE',
  COMMIT = 'COMMIT',
  REVERSAL = 'REVERSAL',
}

export enum HoldStatus {
  ACTIVE = 'ACTIVE',
  COMMITTED = 'COMMITTED',
  RELEASED = 'RELEASED',
  EXPIRED = 'EXPIRED',
}

export enum ReferenceType {
  RESERVATION = 'RESERVATION',
  PURCHASE = 'PURCHASE',
  APPROVAL = 'APPROVAL',
  ADJUSTMENT = 'ADJUSTMENT',
  REFUND = 'REFUND',
  SYSTEM = 'SYSTEM',
}

// Value Objects

/**
 * Points amount - must be positive for movements, 0 allowed only for queries
 */
export class PointsAmount {
  private constructor(private readonly _value: number) {}

  static create(value: number): PointsAmount {
    if (!Number.isInteger(value)) {
      throw new Error('PointsAmount must be an integer');
    }
    if (value < 0) {
      throw new Error('PointsAmount cannot be negative');
    }
    return new PointsAmount(value);
  }

  static createForMovement(value: number): PointsAmount {
    if (!Number.isInteger(value)) {
      throw new Error('PointsAmount must be an integer');
    }
    if (value <= 0) {
      throw new Error('PointsAmount for movements must be positive');
    }
    return new PointsAmount(value);
  }

  static zero(): PointsAmount {
    return new PointsAmount(0);
  }

  get value(): number {
    return this._value;
  }

  add(other: PointsAmount): PointsAmount {
    return new PointsAmount(this._value + other._value);
  }

  subtract(other: PointsAmount): PointsAmount {
    return new PointsAmount(this._value - other._value);
  }

  isGreaterThanOrEqual(other: PointsAmount): boolean {
    return this._value >= other._value;
  }

  isLessThan(other: PointsAmount): boolean {
    return this._value < other._value;
  }

  equals(other: PointsAmount): boolean {
    return this._value === other._value;
  }
}

/**
 * Reference - correlation key for a movement
 */
export class Reference {
  private constructor(
    private readonly _type: ReferenceType | string,
    private readonly _id: string,
  ) {}

  static create(type: ReferenceType | string, id: string): Reference {
    if (!type) {
      throw new Error('Reference type is required');
    }
    if (!id) {
      throw new Error('Reference id is required');
    }
    return new Reference(type, id);
  }

  get type(): string {
    return this._type;
  }

  get id(): string {
    return this._id;
  }

  toString(): string {
    return `${this._type}:${this._id}`;
  }

  equals(other: Reference): boolean {
    return this._type === other._type && this._id === other._id;
  }
}

/**
 * Balance - computed balance for an account
 */
export class Balance {
  constructor(
    public readonly currentBalance: number,
    public readonly heldBalance: number,
  ) {}

  get availableBalance(): number {
    return this.currentBalance - this.heldBalance;
  }

  static zero(): Balance {
    return new Balance(0, 0);
  }
}

/**
 * Account Owner - identifies the owner of a point account
 */
export class AccountOwner {
  private constructor(
    private readonly _type: OwnerType,
    private readonly _id: string,
  ) {}

  static create(type: OwnerType | string, id: string): AccountOwner {
    if (!type) {
      throw new Error('Owner type is required');
    }
    if (!id) {
      throw new Error('Owner id is required');
    }
    const ownerType = typeof type === 'string' ? (type as OwnerType) : type;
    if (!Object.values(OwnerType).includes(ownerType)) {
      throw new Error(`Invalid owner type: ${type}`);
    }
    return new AccountOwner(ownerType, id);
  }

  get type(): OwnerType {
    return this._type;
  }

  get id(): string {
    return this._id;
  }

  equals(other: AccountOwner): boolean {
    return this._type === other._type && this._id === other._id;
  }
}

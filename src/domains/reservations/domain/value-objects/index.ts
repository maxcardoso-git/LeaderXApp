// ============================================
// ENUMS
// ============================================

export enum ResourceType {
  TABLE = 'TABLE',
  SEAT = 'SEAT',
  SLOT = 'SLOT',
}

export enum ReservationOwnerType {
  MEMBER = 'MEMBER',
  LEADER = 'LEADER',
  GUEST = 'GUEST',
}

export enum ReservationStatus {
  HOLD = 'HOLD',
  CONFIRMED = 'CONFIRMED',
  RELEASED = 'RELEASED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

// ============================================
// VALUE OBJECTS
// ============================================

/**
 * Capacity value object
 */
export class Capacity {
  private constructor(
    private readonly _total: number,
    private readonly _used: number,
  ) {
    if (_total < 0) throw new Error('Capacity total cannot be negative');
    if (_used < 0) throw new Error('Capacity used cannot be negative');
    if (_used > _total) throw new Error('Capacity used cannot exceed total');
  }

  static create(total: number, used: number = 0): Capacity {
    return new Capacity(total, used);
  }

  get total(): number {
    return this._total;
  }

  get used(): number {
    return this._used;
  }

  get available(): number {
    return this._total - this._used;
  }

  hasAvailability(): boolean {
    return this.available > 0;
  }

  canReserve(count: number = 1): boolean {
    return this.available >= count;
  }

  reserve(count: number = 1): Capacity {
    if (!this.canReserve(count)) {
      throw new Error('Insufficient capacity');
    }
    return new Capacity(this._total, this._used + count);
  }

  release(count: number = 1): Capacity {
    const newUsed = Math.max(0, this._used - count);
    return new Capacity(this._total, newUsed);
  }
}

/**
 * Reservation window value object
 */
export class ReservationWindow {
  private constructor(
    private readonly _start: Date | null,
    private readonly _end: Date | null,
  ) {}

  static create(start?: Date | null, end?: Date | null): ReservationWindow {
    return new ReservationWindow(start ?? null, end ?? null);
  }

  get start(): Date | null {
    return this._start;
  }

  get end(): Date | null {
    return this._end;
  }

  isOpen(now: Date = new Date()): boolean {
    if (this._start && now < this._start) return false;
    if (this._end && now > this._end) return false;
    return true;
  }

  isBeforeWindow(now: Date = new Date()): boolean {
    return this._start !== null && now < this._start;
  }

  isAfterWindow(now: Date = new Date()): boolean {
    return this._end !== null && now > this._end;
  }
}

/**
 * Hold TTL value object (in seconds)
 */
export class HoldTtl {
  private constructor(private readonly _seconds: number) {
    if (_seconds <= 0) throw new Error('Hold TTL must be positive');
  }

  static create(seconds: number): HoldTtl {
    return new HoldTtl(seconds);
  }

  static fromMinutes(minutes: number): HoldTtl {
    return new HoldTtl(minutes * 60);
  }

  get seconds(): number {
    return this._seconds;
  }

  get milliseconds(): number {
    return this._seconds * 1000;
  }

  calculateExpiresAt(from: Date = new Date()): Date {
    return new Date(from.getTime() + this.milliseconds);
  }
}

/**
 * Points cost value object
 */
export class PointsCost {
  private constructor(private readonly _amount: number) {
    if (_amount < 0) throw new Error('Points cost cannot be negative');
  }

  static create(amount: number): PointsCost {
    return new PointsCost(amount);
  }

  static zero(): PointsCost {
    return new PointsCost(0);
  }

  get amount(): number {
    return this._amount;
  }

  requiresPoints(): boolean {
    return this._amount > 0;
  }
}

// ============================================
// TRANSACTION CONTEXT
// ============================================

export interface TransactionContext {
  tx: unknown;
}

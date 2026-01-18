import { LedgerEntryType, Reference } from '../value-objects';

export interface PointLedgerEntryProps {
  id: string;
  tenantId: string;
  accountId: string;
  entryType: LedgerEntryType;
  amount: number;
  reasonCode: string;
  reference: Reference;
  idempotencyKey?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export interface CreateLedgerEntryProps {
  tenantId: string;
  accountId: string;
  entryType: LedgerEntryType;
  amount: number;
  reasonCode: string;
  referenceType: string;
  referenceId: string;
  idempotencyKey?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Point Ledger Entry Entity
 * Append-only record of a points movement
 */
export class PointLedgerEntry {
  private readonly _id: string;
  private readonly _tenantId: string;
  private readonly _accountId: string;
  private readonly _entryType: LedgerEntryType;
  private readonly _amount: number;
  private readonly _reasonCode: string;
  private readonly _reference: Reference;
  private readonly _idempotencyKey?: string;
  private readonly _metadata?: Record<string, unknown>;
  private readonly _createdAt: Date;

  private constructor(props: PointLedgerEntryProps) {
    this._id = props.id;
    this._tenantId = props.tenantId;
    this._accountId = props.accountId;
    this._entryType = props.entryType;
    this._amount = props.amount;
    this._reasonCode = props.reasonCode;
    this._reference = props.reference;
    this._idempotencyKey = props.idempotencyKey;
    this._metadata = props.metadata;
    this._createdAt = props.createdAt;
  }

  static create(id: string, props: CreateLedgerEntryProps): PointLedgerEntry {
    if (props.amount <= 0) {
      throw new Error('Ledger entry amount must be positive');
    }

    return new PointLedgerEntry({
      id,
      tenantId: props.tenantId,
      accountId: props.accountId,
      entryType: props.entryType,
      amount: props.amount,
      reasonCode: props.reasonCode,
      reference: Reference.create(props.referenceType, props.referenceId),
      idempotencyKey: props.idempotencyKey,
      metadata: props.metadata,
      createdAt: new Date(),
    });
  }

  static reconstitute(props: PointLedgerEntryProps): PointLedgerEntry {
    return new PointLedgerEntry(props);
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

  get entryType(): LedgerEntryType {
    return this._entryType;
  }

  get amount(): number {
    return this._amount;
  }

  get reasonCode(): string {
    return this._reasonCode;
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

  get idempotencyKey(): string | undefined {
    return this._idempotencyKey;
  }

  get metadata(): Record<string, unknown> | undefined {
    return this._metadata;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  /**
   * Check if this entry increases the balance
   */
  isCredit(): boolean {
    return (
      this._entryType === LedgerEntryType.CREDIT ||
      this._entryType === LedgerEntryType.RELEASE
    );
  }

  /**
   * Check if this entry decreases the balance
   */
  isDebit(): boolean {
    return (
      this._entryType === LedgerEntryType.DEBIT ||
      this._entryType === LedgerEntryType.COMMIT
    );
  }

  /**
   * Check if this entry holds balance
   */
  isHold(): boolean {
    return this._entryType === LedgerEntryType.HOLD;
  }
}

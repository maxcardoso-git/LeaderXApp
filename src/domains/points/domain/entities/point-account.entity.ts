import {
  AccountOwner,
  AccountStatus,
  OwnerType,
} from '../value-objects';

export interface PointAccountProps {
  id: string;
  tenantId: string;
  owner: AccountOwner;
  status: AccountStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePointAccountProps {
  tenantId: string;
  ownerType: OwnerType;
  ownerId: string;
}

/**
 * Point Account Entity
 * Represents a points account for a user or organization
 */
export class PointAccount {
  private readonly _id: string;
  private readonly _tenantId: string;
  private readonly _owner: AccountOwner;
  private _status: AccountStatus;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  private constructor(props: PointAccountProps) {
    this._id = props.id;
    this._tenantId = props.tenantId;
    this._owner = props.owner;
    this._status = props.status;
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
  }

  static create(id: string, props: CreatePointAccountProps): PointAccount {
    const now = new Date();
    return new PointAccount({
      id,
      tenantId: props.tenantId,
      owner: AccountOwner.create(props.ownerType, props.ownerId),
      status: AccountStatus.ACTIVE,
      createdAt: now,
      updatedAt: now,
    });
  }

  static reconstitute(props: PointAccountProps): PointAccount {
    return new PointAccount(props);
  }

  get id(): string {
    return this._id;
  }

  get tenantId(): string {
    return this._tenantId;
  }

  get owner(): AccountOwner {
    return this._owner;
  }

  get ownerType(): OwnerType {
    return this._owner.type;
  }

  get ownerId(): string {
    return this._owner.id;
  }

  get status(): AccountStatus {
    return this._status;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  isActive(): boolean {
    return this._status === AccountStatus.ACTIVE;
  }

  suspend(): void {
    if (this._status === AccountStatus.SUSPENDED) {
      throw new Error('Account is already suspended');
    }
    this._status = AccountStatus.SUSPENDED;
    this._updatedAt = new Date();
  }

  activate(): void {
    if (this._status === AccountStatus.ACTIVE) {
      throw new Error('Account is already active');
    }
    this._status = AccountStatus.ACTIVE;
    this._updatedAt = new Date();
  }
}

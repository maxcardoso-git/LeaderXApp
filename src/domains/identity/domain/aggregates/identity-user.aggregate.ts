import { UserStatus } from '../value-objects';

export interface IdentityUserProps {
  id: string;
  tenantId: string;
  externalId?: string;
  email?: string;
  fullName?: string;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateIdentityUserProps {
  tenantId: string;
  externalId?: string;
  email?: string;
  fullName?: string;
  status?: UserStatus;
}

export interface UpdateIdentityUserProps {
  email?: string;
  fullName?: string;
  status?: UserStatus;
}

/**
 * IdentityUser Aggregate Root
 * Represents a user identity in the platform
 * Manages user status and basic information
 */
export class IdentityUser {
  private readonly _id: string;
  private readonly _tenantId: string;
  private readonly _externalId?: string;
  private _email?: string;
  private _fullName?: string;
  private _status: UserStatus;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  private constructor(props: IdentityUserProps) {
    this._id = props.id;
    this._tenantId = props.tenantId;
    this._externalId = props.externalId;
    this._email = props.email;
    this._fullName = props.fullName;
    this._status = props.status;
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
  }

  static create(id: string, props: CreateIdentityUserProps): IdentityUser {
    const now = new Date();
    return new IdentityUser({
      id,
      tenantId: props.tenantId,
      externalId: props.externalId,
      email: props.email?.toLowerCase(),
      fullName: props.fullName,
      status: props.status ?? UserStatus.ACTIVE,
      createdAt: now,
      updatedAt: now,
    });
  }

  static reconstitute(props: IdentityUserProps): IdentityUser {
    return new IdentityUser(props);
  }

  // Getters
  get id(): string {
    return this._id;
  }

  get tenantId(): string {
    return this._tenantId;
  }

  get externalId(): string | undefined {
    return this._externalId;
  }

  get email(): string | undefined {
    return this._email;
  }

  get fullName(): string | undefined {
    return this._fullName;
  }

  get status(): UserStatus {
    return this._status;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  // Status checks
  isActive(): boolean {
    return this._status === UserStatus.ACTIVE;
  }

  isInactive(): boolean {
    return this._status === UserStatus.INACTIVE;
  }

  isSuspended(): boolean {
    return this._status === UserStatus.SUSPENDED;
  }

  canAccess(): boolean {
    return this.isActive();
  }

  // Commands
  update(props: UpdateIdentityUserProps): void {
    if (props.email !== undefined) {
      this._email = props.email?.toLowerCase();
    }
    if (props.fullName !== undefined) {
      this._fullName = props.fullName;
    }
    if (props.status !== undefined) {
      this._status = props.status;
    }
    this._updatedAt = new Date();
  }

  deactivate(): void {
    if (this._status === UserStatus.INACTIVE) {
      return; // Already inactive, idempotent
    }
    this._status = UserStatus.INACTIVE;
    this._updatedAt = new Date();
  }

  suspend(): void {
    if (this._status === UserStatus.SUSPENDED) {
      return; // Already suspended, idempotent
    }
    this._status = UserStatus.SUSPENDED;
    this._updatedAt = new Date();
  }

  activate(): void {
    if (this._status === UserStatus.ACTIVE) {
      return; // Already active, idempotent
    }
    this._status = UserStatus.ACTIVE;
    this._updatedAt = new Date();
  }
}

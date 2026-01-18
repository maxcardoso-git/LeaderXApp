import { randomUUID } from 'crypto';
import { PolicyScope } from '../value-objects';

export interface EventPolicyBindingProps {
  id?: string;
  tenantId: string;
  eventId: string;
  policyCode: string;
  scope: PolicyScope;
  metadata?: Record<string, unknown>;
  createdAt?: Date;
}

export class EventPolicyBinding {
  private _id: string;
  private _tenantId: string;
  private _eventId: string;
  private _policyCode: string;
  private _scope: PolicyScope;
  private _metadata?: Record<string, unknown>;
  private _createdAt: Date;

  private constructor(props: EventPolicyBindingProps) {
    this._id = props.id ?? randomUUID();
    this._tenantId = props.tenantId;
    this._eventId = props.eventId;
    this._policyCode = props.policyCode;
    this._scope = props.scope;
    this._metadata = props.metadata;
    this._createdAt = props.createdAt ?? new Date();
  }

  static create(props: EventPolicyBindingProps): EventPolicyBinding {
    if (!props.policyCode?.trim()) {
      throw new Error('Policy code is required');
    }
    return new EventPolicyBinding(props);
  }

  static reconstitute(props: EventPolicyBindingProps): EventPolicyBinding {
    return new EventPolicyBinding(props);
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
  get policyCode(): string {
    return this._policyCode;
  }
  get scope(): PolicyScope {
    return this._scope;
  }
  get metadata(): Record<string, unknown> | undefined {
    return this._metadata;
  }
  get createdAt(): Date {
    return this._createdAt;
  }

  toPersistence(): Record<string, unknown> {
    return {
      id: this._id,
      tenantId: this._tenantId,
      eventId: this._eventId,
      policyCode: this._policyCode,
      scope: this._scope,
      metadata: this._metadata,
      createdAt: this._createdAt,
    };
  }
}

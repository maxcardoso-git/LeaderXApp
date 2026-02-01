export interface DomainEvent {
  eventType: string;
  aggregateId: string;
  aggregateType: string;
  payload: Record<string, unknown>;
  occurredAt: Date;
}

export class SystemResourceCreatedEvent implements DomainEvent {
  public readonly eventType = 'SystemResourceCreated';
  public readonly aggregateType = 'SYSTEM_RESOURCE';
  public readonly occurredAt: Date;

  constructor(
    public readonly aggregateId: string,
    public readonly payload: {
      resourceId: string;
      tenantId: string;
      name: string;
      type: string;
      subtype: string;
      environment: string;
    },
  ) {
    this.occurredAt = new Date();
  }
}

export class SystemResourceUpdatedEvent implements DomainEvent {
  public readonly eventType = 'SystemResourceUpdated';
  public readonly aggregateType = 'SYSTEM_RESOURCE';
  public readonly occurredAt: Date;

  constructor(
    public readonly aggregateId: string,
    public readonly payload: {
      resourceId: string;
      tenantId: string;
      changes: Record<string, unknown>;
    },
  ) {
    this.occurredAt = new Date();
  }
}

export class SystemResourceDeletedEvent implements DomainEvent {
  public readonly eventType = 'SystemResourceDeleted';
  public readonly aggregateType = 'SYSTEM_RESOURCE';
  public readonly occurredAt: Date;

  constructor(
    public readonly aggregateId: string,
    public readonly payload: {
      resourceId: string;
      tenantId: string;
      name: string;
    },
  ) {
    this.occurredAt = new Date();
  }
}

export class SystemResourceTestedEvent implements DomainEvent {
  public readonly eventType = 'SystemResourceTested';
  public readonly aggregateType = 'SYSTEM_RESOURCE';
  public readonly occurredAt: Date;

  constructor(
    public readonly aggregateId: string,
    public readonly payload: {
      resourceId: string;
      tenantId: string;
      status: string;
      success: boolean;
      responseTime?: number;
    },
  ) {
    this.occurredAt = new Date();
  }
}

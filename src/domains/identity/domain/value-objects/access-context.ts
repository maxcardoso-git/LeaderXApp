/**
 * AccessContext - Value Object representing the context for access evaluation
 * Contains all scope identifiers that may be relevant for permission checks
 */
export interface AccessContext {
  tenantId?: string;
  eventId?: string;
  communityId?: string;
  tableId?: string;
  networkNodeId?: string;
  resourceId?: string;
}

export class AccessContextBuilder {
  private context: AccessContext = {};

  withTenantId(tenantId: string): this {
    this.context.tenantId = tenantId;
    return this;
  }

  withEventId(eventId: string): this {
    this.context.eventId = eventId;
    return this;
  }

  withCommunityId(communityId: string): this {
    this.context.communityId = communityId;
    return this;
  }

  withTableId(tableId: string): this {
    this.context.tableId = tableId;
    return this;
  }

  withNetworkNodeId(networkNodeId: string): this {
    this.context.networkNodeId = networkNodeId;
    return this;
  }

  withResourceId(resourceId: string): this {
    this.context.resourceId = resourceId;
    return this;
  }

  build(): AccessContext {
    return { ...this.context };
  }
}

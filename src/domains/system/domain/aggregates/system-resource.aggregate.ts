import { randomUUID } from 'crypto';
import {
  ResourceType,
  ResourceSubtype,
  HttpMethod,
  AuthMode,
  ResourceStatus,
  ResourceEnvironment,
  ApiKeyConfig,
  BearerTokenConfig,
  BasicAuthConfig,
  OAuth2Config,
  LLMConfig,
  TestConnectionResult,
} from '../value-objects';
import {
  DomainEvent,
  SystemResourceCreatedEvent,
  SystemResourceUpdatedEvent,
  SystemResourceDeletedEvent,
  SystemResourceTestedEvent,
} from '../events';

export interface SystemResourceProps {
  id?: string;
  tenantId: string;
  name: string;
  type: ResourceType;
  subtype: ResourceSubtype;
  endpoint: string;
  httpMethod: HttpMethod;
  authMode?: AuthMode;
  apiKeyConfig?: ApiKeyConfig;
  bearerConfig?: BearerTokenConfig;
  basicAuthConfig?: BasicAuthConfig;
  oauth2Config?: OAuth2Config;
  llmConfig?: LLMConfig;
  connection?: Record<string, unknown>;
  configuration?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  tags?: string[];
  environment?: ResourceEnvironment;
  status?: ResourceStatus;
  lastTestedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export class SystemResourceAggregate {
  private _id: string;
  private _tenantId: string;
  private _name: string;
  private _type: ResourceType;
  private _subtype: ResourceSubtype;
  private _endpoint: string;
  private _httpMethod: HttpMethod;
  private _authMode: AuthMode;
  private _apiKeyConfig?: ApiKeyConfig;
  private _bearerConfig?: BearerTokenConfig;
  private _basicAuthConfig?: BasicAuthConfig;
  private _oauth2Config?: OAuth2Config;
  private _llmConfig?: LLMConfig;
  private _connection?: Record<string, unknown>;
  private _configuration?: Record<string, unknown>;
  private _metadata?: Record<string, unknown>;
  private _tags: string[];
  private _environment: ResourceEnvironment;
  private _status: ResourceStatus;
  private _lastTestedAt?: Date;
  private _createdAt: Date;
  private _updatedAt: Date;
  private _domainEvents: DomainEvent[] = [];

  private constructor(props: SystemResourceProps) {
    this._id = props.id ?? randomUUID();
    this._tenantId = props.tenantId;
    this._name = props.name;
    this._type = props.type;
    this._subtype = props.subtype;
    this._endpoint = props.endpoint;
    this._httpMethod = props.httpMethod;
    this._authMode = props.authMode ?? AuthMode.NONE;
    this._apiKeyConfig = props.apiKeyConfig;
    this._bearerConfig = props.bearerConfig;
    this._basicAuthConfig = props.basicAuthConfig;
    this._oauth2Config = props.oauth2Config;
    this._llmConfig = props.llmConfig;
    this._connection = props.connection;
    this._configuration = props.configuration;
    this._metadata = props.metadata;
    this._tags = props.tags ?? [];
    this._environment = props.environment ?? ResourceEnvironment.DEV;
    this._status = props.status ?? ResourceStatus.UNKNOWN;
    this._lastTestedAt = props.lastTestedAt;
    this._createdAt = props.createdAt ?? new Date();
    this._updatedAt = props.updatedAt ?? new Date();
  }

  static create(props: Omit<SystemResourceProps, 'id' | 'status' | 'lastTestedAt' | 'createdAt' | 'updatedAt'>): SystemResourceAggregate {
    if (!props.tenantId?.trim()) {
      throw new Error('Tenant ID is required');
    }
    if (!props.name?.trim()) {
      throw new Error('Resource name is required');
    }
    if (!props.endpoint?.trim()) {
      throw new Error('Endpoint is required');
    }

    const resource = new SystemResourceAggregate({
      ...props,
      status: ResourceStatus.UNKNOWN,
    });

    resource.addDomainEvent(
      new SystemResourceCreatedEvent(resource._id, {
        resourceId: resource._id,
        tenantId: resource._tenantId,
        name: resource._name,
        type: resource._type,
        subtype: resource._subtype,
        environment: resource._environment,
      }),
    );

    return resource;
  }

  static reconstitute(props: SystemResourceProps): SystemResourceAggregate {
    return new SystemResourceAggregate(props);
  }

  // Getters
  get id(): string { return this._id; }
  get tenantId(): string { return this._tenantId; }
  get name(): string { return this._name; }
  get type(): ResourceType { return this._type; }
  get subtype(): ResourceSubtype { return this._subtype; }
  get endpoint(): string { return this._endpoint; }
  get httpMethod(): HttpMethod { return this._httpMethod; }
  get authMode(): AuthMode { return this._authMode; }
  get apiKeyConfig(): ApiKeyConfig | undefined { return this._apiKeyConfig; }
  get bearerConfig(): BearerTokenConfig | undefined { return this._bearerConfig; }
  get basicAuthConfig(): BasicAuthConfig | undefined { return this._basicAuthConfig; }
  get oauth2Config(): OAuth2Config | undefined { return this._oauth2Config; }
  get llmConfig(): LLMConfig | undefined { return this._llmConfig; }
  get connection(): Record<string, unknown> | undefined { return this._connection; }
  get configuration(): Record<string, unknown> | undefined { return this._configuration; }
  get metadata(): Record<string, unknown> | undefined { return this._metadata; }
  get tags(): string[] { return [...this._tags]; }
  get environment(): ResourceEnvironment { return this._environment; }
  get status(): ResourceStatus { return this._status; }
  get lastTestedAt(): Date | undefined { return this._lastTestedAt; }
  get createdAt(): Date { return this._createdAt; }
  get updatedAt(): Date { return this._updatedAt; }
  get domainEvents(): DomainEvent[] { return [...this._domainEvents]; }

  private addDomainEvent(event: DomainEvent): void {
    this._domainEvents.push(event);
  }

  clearDomainEvents(): void {
    this._domainEvents = [];
  }

  // Update resource
  update(props: {
    name?: string;
    type?: ResourceType;
    subtype?: ResourceSubtype;
    endpoint?: string;
    httpMethod?: HttpMethod;
    authMode?: AuthMode;
    apiKeyConfig?: ApiKeyConfig;
    bearerConfig?: BearerTokenConfig;
    basicAuthConfig?: BasicAuthConfig;
    oauth2Config?: OAuth2Config;
    llmConfig?: LLMConfig;
    connection?: Record<string, unknown>;
    configuration?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
    tags?: string[];
    environment?: ResourceEnvironment;
  }): void {
    const changes: Record<string, unknown> = {};

    if (props.name !== undefined && props.name !== this._name) {
      if (!props.name.trim()) {
        throw new Error('Resource name cannot be empty');
      }
      changes.name = { from: this._name, to: props.name };
      this._name = props.name;
    }

    if (props.type !== undefined && props.type !== this._type) {
      changes.type = { from: this._type, to: props.type };
      this._type = props.type;
    }

    if (props.subtype !== undefined && props.subtype !== this._subtype) {
      changes.subtype = { from: this._subtype, to: props.subtype };
      this._subtype = props.subtype;
    }

    if (props.endpoint !== undefined && props.endpoint !== this._endpoint) {
      if (!props.endpoint.trim()) {
        throw new Error('Endpoint cannot be empty');
      }
      changes.endpoint = { from: this._endpoint, to: props.endpoint };
      this._endpoint = props.endpoint;
    }

    if (props.httpMethod !== undefined && props.httpMethod !== this._httpMethod) {
      changes.httpMethod = { from: this._httpMethod, to: props.httpMethod };
      this._httpMethod = props.httpMethod;
    }

    if (props.authMode !== undefined && props.authMode !== this._authMode) {
      changes.authMode = { from: this._authMode, to: props.authMode };
      this._authMode = props.authMode;
    }

    if (props.apiKeyConfig !== undefined) {
      this._apiKeyConfig = props.apiKeyConfig;
      changes.apiKeyConfig = 'updated';
    }

    if (props.bearerConfig !== undefined) {
      this._bearerConfig = props.bearerConfig;
      changes.bearerConfig = 'updated';
    }

    if (props.basicAuthConfig !== undefined) {
      this._basicAuthConfig = props.basicAuthConfig;
      changes.basicAuthConfig = 'updated';
    }

    if (props.oauth2Config !== undefined) {
      this._oauth2Config = props.oauth2Config;
      changes.oauth2Config = 'updated';
    }

    if (props.llmConfig !== undefined) {
      this._llmConfig = props.llmConfig;
      changes.llmConfig = 'updated';
    }

    if (props.connection !== undefined) {
      this._connection = props.connection;
      changes.connection = 'updated';
    }

    if (props.configuration !== undefined) {
      this._configuration = props.configuration;
      changes.configuration = 'updated';
    }

    if (props.metadata !== undefined) {
      this._metadata = props.metadata;
      changes.metadata = 'updated';
    }

    if (props.tags !== undefined) {
      this._tags = props.tags;
      changes.tags = 'updated';
    }

    if (props.environment !== undefined && props.environment !== this._environment) {
      changes.environment = { from: this._environment, to: props.environment };
      this._environment = props.environment;
    }

    if (Object.keys(changes).length > 0) {
      this._updatedAt = new Date();

      this.addDomainEvent(
        new SystemResourceUpdatedEvent(this._id, {
          resourceId: this._id,
          tenantId: this._tenantId,
          changes,
        }),
      );
    }
  }

  // Update test result
  updateTestResult(result: TestConnectionResult): void {
    this._status = result.status;
    this._lastTestedAt = result.testedAt;
    this._updatedAt = new Date();

    this.addDomainEvent(
      new SystemResourceTestedEvent(this._id, {
        resourceId: this._id,
        tenantId: this._tenantId,
        status: result.status,
        success: result.success,
        responseTime: result.responseTime,
      }),
    );
  }

  // Mark as deleted (for domain event)
  markAsDeleted(): void {
    this.addDomainEvent(
      new SystemResourceDeletedEvent(this._id, {
        resourceId: this._id,
        tenantId: this._tenantId,
        name: this._name,
      }),
    );
  }

  toPersistence(): Record<string, unknown> {
    return {
      id: this._id,
      tenantId: this._tenantId,
      name: this._name,
      type: this._type,
      subtype: this._subtype,
      endpoint: this._endpoint,
      httpMethod: this._httpMethod,
      authMode: this._authMode,
      apiKeyConfig: this._apiKeyConfig,
      bearerConfig: this._bearerConfig,
      basicAuthConfig: this._basicAuthConfig,
      oauth2Config: this._oauth2Config,
      llmConfig: this._llmConfig,
      connection: this._connection,
      configuration: this._configuration,
      metadata: this._metadata,
      tags: this._tags,
      environment: this._environment,
      status: this._status,
      lastTestedAt: this._lastTestedAt,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    };
  }
}

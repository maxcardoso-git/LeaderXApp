import { Inject, Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@infrastructure/persistence/prisma.service';
import { SystemResourceAggregate } from '../../domain/aggregates';
import {
  SystemResourceRepositoryPort,
  SYSTEM_RESOURCE_REPOSITORY,
  PaginationOptions,
  PaginatedResult,
  FindResourcesFilter,
} from '../../domain/ports';
import {
  ResourceType,
  ResourceSubtype,
  HttpMethod,
  AuthMode,
  ResourceEnvironment,
  ResourceStatus,
  ApiKeyConfig,
  BearerTokenConfig,
  BasicAuthConfig,
  OAuth2Config,
  LLMConfig,
  TestConnectionResult,
} from '../../domain/value-objects';
import {
  ResourceNotFoundError,
  ResourceNameAlreadyExistsError,
} from '../errors';

// ================== Create Resource ==================

export interface CreateResourceInput {
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
  actorId?: string;
}

@Injectable()
export class CreateResourceUseCase {
  private readonly logger = new Logger(CreateResourceUseCase.name);

  constructor(
    @Inject(SYSTEM_RESOURCE_REPOSITORY)
    private readonly resourceRepository: SystemResourceRepositoryPort,
    private readonly prisma: PrismaService,
  ) {}

  async execute(input: CreateResourceInput): Promise<SystemResourceAggregate> {
    this.logger.debug(`Creating resource: ${input.name}`);

    return this.prisma.$transaction(async (tx) => {
      // Check if name already exists
      const existing = await this.resourceRepository.findByName(input.tenantId, input.name, { tx });
      if (existing) {
        throw new ResourceNameAlreadyExistsError(input.name);
      }

      const resource = SystemResourceAggregate.create({
        tenantId: input.tenantId,
        name: input.name,
        type: input.type,
        subtype: input.subtype,
        endpoint: input.endpoint,
        httpMethod: input.httpMethod,
        authMode: input.authMode,
        apiKeyConfig: input.apiKeyConfig,
        bearerConfig: input.bearerConfig,
        basicAuthConfig: input.basicAuthConfig,
        oauth2Config: input.oauth2Config,
        llmConfig: input.llmConfig,
        connection: input.connection,
        configuration: input.configuration,
        metadata: input.metadata,
        tags: input.tags,
        environment: input.environment,
      });

      await this.resourceRepository.create(resource, { tx });

      // Create outbox events
      for (const de of resource.domainEvents) {
        await tx.outboxEvent.create({
          data: {
            tenantId: input.tenantId,
            aggregateType: 'SYSTEM_RESOURCE',
            aggregateId: resource.id,
            eventType: de.eventType,
            payload: de.payload as Prisma.InputJsonValue,
            metadata: { actorId: input.actorId } as Prisma.InputJsonValue,
          },
        });
      }
      resource.clearDomainEvents();

      this.logger.log(`Resource created: ${resource.id}`);
      return resource;
    });
  }
}

// ================== Update Resource ==================

export interface UpdateResourceInput {
  resourceId: string;
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
  actorId?: string;
}

@Injectable()
export class UpdateResourceUseCase {
  private readonly logger = new Logger(UpdateResourceUseCase.name);

  constructor(
    @Inject(SYSTEM_RESOURCE_REPOSITORY)
    private readonly resourceRepository: SystemResourceRepositoryPort,
    private readonly prisma: PrismaService,
  ) {}

  async execute(input: UpdateResourceInput): Promise<SystemResourceAggregate> {
    this.logger.debug(`Updating resource: ${input.resourceId}`);

    return this.prisma.$transaction(async (tx) => {
      const resource = await this.resourceRepository.findById(input.resourceId, { tx });
      if (!resource) {
        throw new ResourceNotFoundError(input.resourceId);
      }

      // Check name uniqueness if changing name
      if (input.name && input.name !== resource.name) {
        const existing = await this.resourceRepository.findByName(resource.tenantId, input.name, { tx });
        if (existing) {
          throw new ResourceNameAlreadyExistsError(input.name);
        }
      }

      resource.update({
        name: input.name,
        type: input.type,
        subtype: input.subtype,
        endpoint: input.endpoint,
        httpMethod: input.httpMethod,
        authMode: input.authMode,
        apiKeyConfig: input.apiKeyConfig,
        bearerConfig: input.bearerConfig,
        basicAuthConfig: input.basicAuthConfig,
        oauth2Config: input.oauth2Config,
        llmConfig: input.llmConfig,
        connection: input.connection,
        configuration: input.configuration,
        metadata: input.metadata,
        tags: input.tags,
        environment: input.environment,
      });

      await this.resourceRepository.update(resource, { tx });

      // Create outbox events
      for (const de of resource.domainEvents) {
        await tx.outboxEvent.create({
          data: {
            tenantId: resource.tenantId,
            aggregateType: 'SYSTEM_RESOURCE',
            aggregateId: resource.id,
            eventType: de.eventType,
            payload: de.payload as Prisma.InputJsonValue,
            metadata: { actorId: input.actorId } as Prisma.InputJsonValue,
          },
        });
      }
      resource.clearDomainEvents();

      this.logger.log(`Resource updated: ${resource.id}`);
      return resource;
    });
  }
}

// ================== Delete Resource ==================

@Injectable()
export class DeleteResourceUseCase {
  private readonly logger = new Logger(DeleteResourceUseCase.name);

  constructor(
    @Inject(SYSTEM_RESOURCE_REPOSITORY)
    private readonly resourceRepository: SystemResourceRepositoryPort,
    private readonly prisma: PrismaService,
  ) {}

  async execute(input: { resourceId: string; actorId?: string }): Promise<void> {
    this.logger.debug(`Deleting resource: ${input.resourceId}`);

    return this.prisma.$transaction(async (tx) => {
      const resource = await this.resourceRepository.findById(input.resourceId, { tx });
      if (!resource) {
        throw new ResourceNotFoundError(input.resourceId);
      }

      resource.markAsDeleted();

      await this.resourceRepository.delete(input.resourceId, { tx });

      // Create outbox events
      for (const de of resource.domainEvents) {
        await tx.outboxEvent.create({
          data: {
            tenantId: resource.tenantId,
            aggregateType: 'SYSTEM_RESOURCE',
            aggregateId: resource.id,
            eventType: de.eventType,
            payload: de.payload as Prisma.InputJsonValue,
            metadata: { actorId: input.actorId } as Prisma.InputJsonValue,
          },
        });
      }

      this.logger.log(`Resource deleted: ${input.resourceId}`);
    });
  }
}

// ================== Get Resource By ID ==================

@Injectable()
export class GetResourceByIdUseCase {
  constructor(
    @Inject(SYSTEM_RESOURCE_REPOSITORY)
    private readonly resourceRepository: SystemResourceRepositoryPort,
  ) {}

  async execute(resourceId: string): Promise<SystemResourceAggregate> {
    const resource = await this.resourceRepository.findById(resourceId);
    if (!resource) {
      throw new ResourceNotFoundError(resourceId);
    }
    return resource;
  }
}

// ================== List Resources ==================

@Injectable()
export class ListResourcesUseCase {
  constructor(
    @Inject(SYSTEM_RESOURCE_REPOSITORY)
    private readonly resourceRepository: SystemResourceRepositoryPort,
  ) {}

  async execute(
    filter: FindResourcesFilter,
    pagination: PaginationOptions,
  ): Promise<PaginatedResult<SystemResourceAggregate>> {
    return this.resourceRepository.list(filter, pagination);
  }
}

// ================== Test Connection ==================

@Injectable()
export class TestConnectionUseCase {
  private readonly logger = new Logger(TestConnectionUseCase.name);

  constructor(
    @Inject(SYSTEM_RESOURCE_REPOSITORY)
    private readonly resourceRepository: SystemResourceRepositoryPort,
    private readonly prisma: PrismaService,
  ) {}

  async execute(input: { resourceId: string; actorId?: string }): Promise<TestConnectionResult> {
    this.logger.debug(`Testing connection for resource: ${input.resourceId}`);

    const resource = await this.resourceRepository.findById(input.resourceId);
    if (!resource) {
      throw new ResourceNotFoundError(input.resourceId);
    }

    const result = await this.testResourceConnection(resource);

    // Update resource with test result
    return this.prisma.$transaction(async (tx) => {
      resource.updateTestResult(result);
      await this.resourceRepository.update(resource, { tx });

      // Create outbox events
      for (const de of resource.domainEvents) {
        await tx.outboxEvent.create({
          data: {
            tenantId: resource.tenantId,
            aggregateType: 'SYSTEM_RESOURCE',
            aggregateId: resource.id,
            eventType: de.eventType,
            payload: de.payload as Prisma.InputJsonValue,
            metadata: { actorId: input.actorId } as Prisma.InputJsonValue,
          },
        });
      }
      resource.clearDomainEvents();

      this.logger.log(`Connection tested for resource: ${resource.id}, status: ${result.status}`);
      return result;
    });
  }

  private async testResourceConnection(resource: SystemResourceAggregate): Promise<TestConnectionResult> {
    const startTime = Date.now();

    try {
      // Build headers based on auth mode
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      switch (resource.authMode) {
        case AuthMode.API_KEY:
          if (resource.apiKeyConfig) {
            headers[resource.apiKeyConfig.headerName] = resource.apiKeyConfig.apiKey;
          }
          break;
        case AuthMode.BEARER_TOKEN:
          if (resource.bearerConfig) {
            headers['Authorization'] = `Bearer ${resource.bearerConfig.token}`;
          }
          break;
        case AuthMode.BASIC_AUTH:
          if (resource.basicAuthConfig) {
            const credentials = Buffer.from(
              `${resource.basicAuthConfig.username}:${resource.basicAuthConfig.password}`,
            ).toString('base64');
            headers['Authorization'] = `Basic ${credentials}`;
          }
          break;
        // OAuth2 would require token exchange first - simplified for now
        default:
          break;
      }

      // Make HTTP request
      const response = await fetch(resource.endpoint, {
        method: resource.httpMethod,
        headers,
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });

      const responseTime = Date.now() - startTime;

      if (response.ok) {
        return {
          success: true,
          status: ResourceStatus.AVAILABLE,
          responseTime,
          message: `Connection successful (${response.status})`,
          testedAt: new Date(),
        };
      } else if (response.status >= 500) {
        return {
          success: false,
          status: ResourceStatus.UNAVAILABLE,
          responseTime,
          message: `Server error (${response.status})`,
          testedAt: new Date(),
        };
      } else {
        return {
          success: false,
          status: ResourceStatus.DEGRADED,
          responseTime,
          message: `Client error (${response.status})`,
          testedAt: new Date(),
        };
      }
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const message = error instanceof Error ? error.message : 'Unknown error';

      return {
        success: false,
        status: ResourceStatus.UNAVAILABLE,
        responseTime,
        message: `Connection failed: ${message}`,
        testedAt: new Date(),
      };
    }
  }
}

// ================== Test Connection Preview ==================

export interface TestConnectionPreviewInput {
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
}

@Injectable()
export class TestConnectionPreviewUseCase {
  private readonly logger = new Logger(TestConnectionPreviewUseCase.name);

  async execute(input: TestConnectionPreviewInput): Promise<TestConnectionResult> {
    this.logger.debug(`Testing connection preview for: ${input.endpoint}`);

    const startTime = Date.now();

    try {
      // Build headers based on auth mode
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      const authMode = input.authMode ?? AuthMode.NONE;

      switch (authMode) {
        case AuthMode.API_KEY:
          if (input.apiKeyConfig) {
            headers[input.apiKeyConfig.headerName] = input.apiKeyConfig.apiKey;
          }
          break;
        case AuthMode.BEARER_TOKEN:
          if (input.bearerConfig) {
            headers['Authorization'] = `Bearer ${input.bearerConfig.token}`;
          }
          break;
        case AuthMode.BASIC_AUTH:
          if (input.basicAuthConfig) {
            const credentials = Buffer.from(
              `${input.basicAuthConfig.username}:${input.basicAuthConfig.password}`,
            ).toString('base64');
            headers['Authorization'] = `Basic ${credentials}`;
          }
          break;
        default:
          break;
      }

      // Make HTTP request
      const response = await fetch(input.endpoint, {
        method: input.httpMethod,
        headers,
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });

      const responseTime = Date.now() - startTime;

      if (response.ok) {
        return {
          success: true,
          status: ResourceStatus.AVAILABLE,
          responseTime,
          message: `Connection successful (${response.status})`,
          testedAt: new Date(),
        };
      } else if (response.status >= 500) {
        return {
          success: false,
          status: ResourceStatus.UNAVAILABLE,
          responseTime,
          message: `Server error (${response.status})`,
          testedAt: new Date(),
        };
      } else {
        return {
          success: false,
          status: ResourceStatus.DEGRADED,
          responseTime,
          message: `Client error (${response.status})`,
          testedAt: new Date(),
        };
      }
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const message = error instanceof Error ? error.message : 'Unknown error';

      return {
        success: false,
        status: ResourceStatus.UNAVAILABLE,
        responseTime,
        message: `Connection failed: ${message}`,
        testedAt: new Date(),
      };
    }
  }
}

import {
  Controller,
  Post,
  Put,
  Get,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader } from '@nestjs/swagger';
import {
  CreateResourceDto,
  UpdateResourceDto,
  ListResourcesQueryDto,
  ResourceResponseDto,
  TestConnectionResponseDto,
  PaginatedResponseDto,
} from '../dtos';
import {
  CreateResourceUseCase,
  UpdateResourceUseCase,
  DeleteResourceUseCase,
  GetResourceByIdUseCase,
  ListResourcesUseCase,
  TestConnectionUseCase,
  TestConnectionPreviewUseCase,
} from '../../application/usecases';
import { SystemResourceAggregate } from '../../domain/aggregates';
import { BearerTokenConfig } from '../../domain/value-objects';

@ApiTags('System Resources')
@Controller('system/resources')
@ApiHeader({ name: 'X-Tenant-Id', required: true })
@ApiHeader({ name: 'X-Actor-Id', required: false })
export class ResourcesController {
  constructor(
    private readonly createResource: CreateResourceUseCase,
    private readonly updateResource: UpdateResourceUseCase,
    private readonly deleteResource: DeleteResourceUseCase,
    private readonly getResourceById: GetResourceByIdUseCase,
    private readonly listResources: ListResourcesUseCase,
    private readonly testConnection: TestConnectionUseCase,
    private readonly testConnectionPreview: TestConnectionPreviewUseCase,
  ) {}

  private toResourceResponse(resource: SystemResourceAggregate): ResourceResponseDto {
    return {
      id: resource.id,
      tenantId: resource.tenantId,
      name: resource.name,
      type: resource.type,
      subtype: resource.subtype,
      endpoint: resource.endpoint,
      httpMethod: resource.httpMethod,
      authMode: resource.authMode,
      apiKeyConfig: resource.apiKeyConfig,
      bearerTokenConfig: resource.bearerConfig,
      basicAuthConfig: resource.basicAuthConfig,
      oauth2Config: resource.oauth2Config,
      llmConfig: resource.llmConfig,
      connection: resource.connection,
      configuration: resource.configuration,
      metadata: resource.metadata,
      tags: resource.tags,
      environment: resource.environment,
      status: resource.status,
      lastTestedAt: resource.lastTestedAt?.toISOString(),
      createdAt: resource.createdAt.toISOString(),
      updatedAt: resource.updatedAt.toISOString(),
    };
  }

  @Post()
  @ApiOperation({ summary: 'Create a new system resource' })
  async create(
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-actor-id') actorId: string,
    @Body() dto: CreateResourceDto,
  ): Promise<ResourceResponseDto> {
    const resource = await this.createResource.execute({
      tenantId,
      name: dto.name,
      type: dto.type,
      subtype: dto.subtype,
      endpoint: dto.endpoint,
      httpMethod: dto.httpMethod,
      authMode: dto.authMode,
      apiKeyConfig: dto.apiKeyConfig,
      bearerConfig: dto.bearerTokenConfig as BearerTokenConfig | undefined,
      basicAuthConfig: dto.basicAuthConfig,
      oauth2Config: dto.oauth2Config,
      llmConfig: dto.llmConfig,
      connection: dto.connection,
      configuration: dto.configuration,
      metadata: dto.metadata,
      tags: dto.tags,
      environment: dto.environment,
      actorId,
    });
    return this.toResourceResponse(resource);
  }

  @Get()
  @ApiOperation({ summary: 'List system resources' })
  async list(
    @Headers('x-tenant-id') tenantId: string,
    @Query() query: ListResourcesQueryDto,
  ): Promise<PaginatedResponseDto<ResourceResponseDto>> {
    const result = await this.listResources.execute(
      {
        tenantId,
        type: query.type,
        subtype: query.subtype,
        environment: query.environment,
        status: query.status,
        search: query.search,
      },
      { page: query.page ?? 1, size: query.limit ?? 25 },
    );

    return {
      items: result.items.map((r) => this.toResourceResponse(r)),
      page: result.page,
      size: result.size,
      total: result.total,
    };
  }

  @Get(':resourceId')
  @ApiOperation({ summary: 'Get resource by ID' })
  async getById(@Param('resourceId') resourceId: string): Promise<ResourceResponseDto> {
    const resource = await this.getResourceById.execute(resourceId);
    return this.toResourceResponse(resource);
  }

  @Put(':resourceId')
  @ApiOperation({ summary: 'Update a system resource' })
  async update(
    @Headers('x-actor-id') actorId: string,
    @Param('resourceId') resourceId: string,
    @Body() dto: UpdateResourceDto,
  ): Promise<ResourceResponseDto> {
    const resource = await this.updateResource.execute({
      resourceId,
      name: dto.name,
      type: dto.type,
      subtype: dto.subtype,
      endpoint: dto.endpoint,
      httpMethod: dto.httpMethod,
      authMode: dto.authMode,
      apiKeyConfig: dto.apiKeyConfig,
      bearerConfig: dto.bearerTokenConfig as BearerTokenConfig | undefined,
      basicAuthConfig: dto.basicAuthConfig,
      oauth2Config: dto.oauth2Config,
      llmConfig: dto.llmConfig,
      connection: dto.connection,
      configuration: dto.configuration,
      metadata: dto.metadata,
      tags: dto.tags,
      environment: dto.environment,
      actorId,
    });
    return this.toResourceResponse(resource);
  }

  @Delete(':resourceId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a system resource' })
  async delete(
    @Headers('x-actor-id') actorId: string,
    @Param('resourceId') resourceId: string,
  ): Promise<void> {
    await this.deleteResource.execute({ resourceId, actorId });
  }

  @Post(':resourceId/test')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Test resource connection' })
  async test(
    @Headers('x-actor-id') actorId: string,
    @Param('resourceId') resourceId: string,
  ): Promise<TestConnectionResponseDto> {
    const result = await this.testConnection.execute({ resourceId, actorId });
    return {
      success: result.success,
      status: result.status,
      responseTime: result.responseTime,
      message: result.message,
      testedAt: result.testedAt.toISOString(),
    };
  }

  @Post('test-preview')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Test connection without saving (preview)' })
  async testPreview(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: CreateResourceDto,
  ): Promise<TestConnectionResponseDto> {
    const result = await this.testConnectionPreview.execute({
      tenantId,
      name: dto.name,
      type: dto.type,
      subtype: dto.subtype,
      endpoint: dto.endpoint,
      httpMethod: dto.httpMethod,
      authMode: dto.authMode,
      apiKeyConfig: dto.apiKeyConfig,
      bearerConfig: dto.bearerTokenConfig as BearerTokenConfig | undefined,
      basicAuthConfig: dto.basicAuthConfig,
      oauth2Config: dto.oauth2Config,
      llmConfig: dto.llmConfig,
    });
    return {
      success: result.success,
      status: result.status,
      responseTime: result.responseTime,
      message: result.message,
      testedAt: result.testedAt.toISOString(),
    };
  }
}

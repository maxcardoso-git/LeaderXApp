import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  IsObject,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  ResourceType,
  ResourceSubtype,
  HttpMethod,
  AuthMode,
  ResourceEnvironment,
  ResourceStatus,
  LLMProvider,
  ApiKeyLocation,
} from '../../domain/value-objects';

// ================== Nested Config DTOs ==================

export class ApiKeyConfigDto {
  @ApiProperty({ description: 'API key value' })
  @IsString()
  apiKey: string;

  @ApiProperty({ description: 'Header name for the API key' })
  @IsString()
  headerName: string;

  @ApiProperty({ enum: ApiKeyLocation, description: 'Where to place the API key' })
  @IsEnum(ApiKeyLocation)
  location: ApiKeyLocation;
}

export class BearerTokenConfigDto {
  @ApiProperty({ description: 'Bearer token value' })
  @IsString()
  token: string;
}

export class BasicAuthConfigDto {
  @ApiProperty({ description: 'Username' })
  @IsString()
  username: string;

  @ApiProperty({ description: 'Password' })
  @IsString()
  password: string;
}

export class OAuth2ConfigDto {
  @ApiProperty({ description: 'OAuth2 client ID' })
  @IsString()
  clientId: string;

  @ApiProperty({ description: 'OAuth2 client secret' })
  @IsString()
  clientSecret: string;

  @ApiProperty({ description: 'Token URL' })
  @IsString()
  tokenUrl: string;

  @ApiPropertyOptional({ description: 'OAuth2 scope' })
  @IsOptional()
  @IsString()
  scope?: string;
}

export class LLMConfigDto {
  @ApiProperty({ enum: LLMProvider, description: 'LLM provider' })
  @IsEnum(LLMProvider)
  provider: LLMProvider;

  @ApiProperty({ description: 'Model name' })
  @IsString()
  model: string;

  @ApiPropertyOptional({ description: 'Model description' })
  @IsOptional()
  @IsString()
  description?: string;
}

// ================== Request DTOs ==================

export class CreateResourceDto {
  @ApiProperty({ description: 'Resource name' })
  @IsString()
  name: string;

  @ApiProperty({ enum: ResourceType, description: 'Resource type' })
  @IsEnum(ResourceType)
  type: ResourceType;

  @ApiProperty({ enum: ResourceSubtype, description: 'Resource subtype' })
  @IsEnum(ResourceSubtype)
  subtype: ResourceSubtype;

  @ApiProperty({ description: 'Resource endpoint URL' })
  @IsString()
  endpoint: string;

  @ApiProperty({ enum: HttpMethod, description: 'HTTP method' })
  @IsEnum(HttpMethod)
  httpMethod: HttpMethod;

  @ApiPropertyOptional({ enum: AuthMode, default: AuthMode.NONE })
  @IsOptional()
  @IsEnum(AuthMode)
  authMode?: AuthMode;

  @ApiPropertyOptional({ type: ApiKeyConfigDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ApiKeyConfigDto)
  apiKeyConfig?: ApiKeyConfigDto;

  @ApiPropertyOptional({ type: BearerTokenConfigDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => BearerTokenConfigDto)
  bearerTokenConfig?: BearerTokenConfigDto;

  @ApiPropertyOptional({ type: BasicAuthConfigDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => BasicAuthConfigDto)
  basicAuthConfig?: BasicAuthConfigDto;

  @ApiPropertyOptional({ type: OAuth2ConfigDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => OAuth2ConfigDto)
  oauth2Config?: OAuth2ConfigDto;

  @ApiPropertyOptional({ type: LLMConfigDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => LLMConfigDto)
  llmConfig?: LLMConfigDto;

  @ApiPropertyOptional({ description: 'Connection configuration' })
  @IsOptional()
  @IsObject()
  connection?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Additional configuration' })
  @IsOptional()
  @IsObject()
  configuration?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Tags', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ enum: ResourceEnvironment, default: ResourceEnvironment.DEV })
  @IsOptional()
  @IsEnum(ResourceEnvironment)
  environment?: ResourceEnvironment;
}

export class UpdateResourceDto {
  @ApiPropertyOptional({ description: 'Resource name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ enum: ResourceType })
  @IsOptional()
  @IsEnum(ResourceType)
  type?: ResourceType;

  @ApiPropertyOptional({ enum: ResourceSubtype })
  @IsOptional()
  @IsEnum(ResourceSubtype)
  subtype?: ResourceSubtype;

  @ApiPropertyOptional({ description: 'Resource endpoint URL' })
  @IsOptional()
  @IsString()
  endpoint?: string;

  @ApiPropertyOptional({ enum: HttpMethod })
  @IsOptional()
  @IsEnum(HttpMethod)
  httpMethod?: HttpMethod;

  @ApiPropertyOptional({ enum: AuthMode })
  @IsOptional()
  @IsEnum(AuthMode)
  authMode?: AuthMode;

  @ApiPropertyOptional({ type: ApiKeyConfigDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ApiKeyConfigDto)
  apiKeyConfig?: ApiKeyConfigDto;

  @ApiPropertyOptional({ type: BearerTokenConfigDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => BearerTokenConfigDto)
  bearerTokenConfig?: BearerTokenConfigDto;

  @ApiPropertyOptional({ type: BasicAuthConfigDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => BasicAuthConfigDto)
  basicAuthConfig?: BasicAuthConfigDto;

  @ApiPropertyOptional({ type: OAuth2ConfigDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => OAuth2ConfigDto)
  oauth2Config?: OAuth2ConfigDto;

  @ApiPropertyOptional({ type: LLMConfigDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => LLMConfigDto)
  llmConfig?: LLMConfigDto;

  @ApiPropertyOptional({ description: 'Connection configuration' })
  @IsOptional()
  @IsObject()
  connection?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Additional configuration' })
  @IsOptional()
  @IsObject()
  configuration?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Tags', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ enum: ResourceEnvironment })
  @IsOptional()
  @IsEnum(ResourceEnvironment)
  environment?: ResourceEnvironment;
}

// ================== Query DTOs ==================

export class ListResourcesQueryDto {
  @ApiPropertyOptional({ enum: ResourceType })
  @IsOptional()
  @IsEnum(ResourceType)
  type?: ResourceType;

  @ApiPropertyOptional({ enum: ResourceSubtype })
  @IsOptional()
  @IsEnum(ResourceSubtype)
  subtype?: ResourceSubtype;

  @ApiPropertyOptional({ enum: ResourceEnvironment })
  @IsOptional()
  @IsEnum(ResourceEnvironment)
  environment?: ResourceEnvironment;

  @ApiPropertyOptional({ enum: ResourceStatus })
  @IsOptional()
  @IsEnum(ResourceStatus)
  status?: ResourceStatus;

  @ApiPropertyOptional({ description: 'Search term' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 25 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 25;
}

// ================== Response DTOs ==================

export class ResourceResponseDto {
  id: string;
  tenantId: string;
  name: string;
  type: ResourceType;
  subtype: ResourceSubtype;
  endpoint: string;
  httpMethod: HttpMethod;
  authMode: AuthMode;
  apiKeyConfig?: ApiKeyConfigDto;
  bearerTokenConfig?: BearerTokenConfigDto;
  basicAuthConfig?: BasicAuthConfigDto;
  oauth2Config?: OAuth2ConfigDto;
  llmConfig?: LLMConfigDto;
  connection?: Record<string, unknown>;
  configuration?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  tags: string[];
  environment: ResourceEnvironment;
  status: ResourceStatus;
  lastTestedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export class TestConnectionResponseDto {
  success: boolean;
  status: ResourceStatus;
  responseTime?: number;
  message?: string;
  testedAt: string;
}

export class PaginatedResponseDto<T> {
  items: T[];
  page: number;
  size: number;
  total: number;
}

// Resource Type enum
export enum ResourceType {
  API_HTTP_OUTBOUND = 'API_HTTP_OUTBOUND',
  API_HTTP_INBOUND = 'API_HTTP_INBOUND',
  DATABASE = 'DATABASE',
  MESSAGE_QUEUE = 'MESSAGE_QUEUE',
  STORAGE = 'STORAGE',
}

// Resource Subtype enum
export enum ResourceSubtype {
  LLM = 'LLM',
  REST = 'REST',
  GRAPHQL = 'GRAPHQL',
  WEBHOOK = 'WEBHOOK',
  POSTGRES = 'POSTGRES',
  MYSQL = 'MYSQL',
  MONGODB = 'MONGODB',
  REDIS = 'REDIS',
  S3 = 'S3',
  OTHER = 'OTHER',
}

// HTTP Method enum
export enum HttpMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  PATCH = 'PATCH',
  DELETE = 'DELETE',
}

// Auth Mode enum
export enum AuthMode {
  NONE = 'NONE',
  API_KEY = 'API_KEY',
  BEARER_TOKEN = 'BEARER_TOKEN',
  BASIC_AUTH = 'BASIC_AUTH',
  OAUTH2 = 'OAUTH2',
}

// Resource Status enum
export enum ResourceStatus {
  AVAILABLE = 'AVAILABLE',
  UNAVAILABLE = 'UNAVAILABLE',
  DEGRADED = 'DEGRADED',
  UNKNOWN = 'UNKNOWN',
}

// Resource Environment enum
export enum ResourceEnvironment {
  DEV = 'DEV',
  STAGING = 'STAGING',
  PROD = 'PROD',
}

// LLM Provider enum
export enum LLMProvider {
  OPENAI = 'OPENAI',
  ANTHROPIC = 'ANTHROPIC',
  GOOGLE = 'GOOGLE',
  AZURE = 'AZURE',
  AWS_BEDROCK = 'AWS_BEDROCK',
  COHERE = 'COHERE',
  MISTRAL = 'MISTRAL',
  OTHER = 'OTHER',
}

// API Key Location enum
export enum ApiKeyLocation {
  HEADER = 'HEADER',
  QUERY = 'QUERY',
  BODY = 'BODY',
}

// API Key Config
export interface ApiKeyConfig {
  apiKey: string;
  headerName: string;
  location: ApiKeyLocation;
}

// Bearer Token Config
export interface BearerTokenConfig {
  token: string;
}

// Basic Auth Config
export interface BasicAuthConfig {
  username: string;
  password: string;
}

// OAuth2 Config
export interface OAuth2Config {
  clientId: string;
  clientSecret: string;
  tokenUrl: string;
  scope?: string;
}

// LLM Config
export interface LLMConfig {
  provider: LLMProvider;
  model: string;
  description?: string;
}

// Test Connection Response
export interface TestConnectionResult {
  success: boolean;
  status: ResourceStatus;
  responseTime?: number;
  message?: string;
  testedAt: Date;
}

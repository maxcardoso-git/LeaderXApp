export enum OutboxStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  PUBLISHED = 'PUBLISHED',
  DEAD = 'DEAD',
}

export interface OutboxEvent {
  id: string;
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  correlationId?: string;
  payload: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  status: OutboxStatus;
  retryCount: number;
  maxRetries: number;
  lastError?: string;
  processedAt?: Date;
  scheduledAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateOutboxEventDto {
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  correlationId?: string;
  payload: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

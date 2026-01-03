export interface IRequestContext {
  requestId: string;
  tenantId: string;
  orgId: string;
  cycleId?: string;
  actorId?: string;
  correlationId: string;
  acceptLanguage: 'pt-BR' | 'en' | 'es';
  startedAt: Date;
}

export const REQUEST_CONTEXT_KEY = 'REQUEST_CONTEXT';

import { Injectable, Scope } from '@nestjs/common';
import { IRequestContext } from './request-context.interface';

@Injectable({ scope: Scope.REQUEST })
export class RequestContextService {
  private context: IRequestContext;

  setContext(context: IRequestContext): void {
    this.context = context;
  }

  getContext(): IRequestContext {
    return this.context;
  }

  get requestId(): string {
    return this.context?.requestId;
  }

  get tenantId(): string {
    return this.context?.tenantId;
  }

  get orgId(): string {
    return this.context?.orgId;
  }

  get cycleId(): string | undefined {
    return this.context?.cycleId;
  }

  get actorId(): string | undefined {
    return this.context?.actorId;
  }

  get correlationId(): string {
    return this.context?.correlationId;
  }

  get acceptLanguage(): 'pt-BR' | 'en' | 'es' {
    return this.context?.acceptLanguage || 'pt-BR';
  }
}

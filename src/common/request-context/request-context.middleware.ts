import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { RequestContextService } from './request-context.service';
import { IRequestContext } from './request-context.interface';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      context?: IRequestContext;
    }
  }
}

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  constructor(private readonly contextService: RequestContextService) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const requestId =
      (req.headers['x-request-id'] as string) || uuidv4();
    const tenantId = req.headers['x-tenant-id'] as string;
    const orgId = req.headers['x-org-id'] as string;
    const cycleId = req.headers['x-cycle-id'] as string | undefined;
    const actorId = req.headers['x-actor-id'] as string | undefined;
    const correlationId =
      (req.headers['x-correlation-id'] as string) || requestId;
    const acceptLanguage = this.parseAcceptLanguage(
      req.headers['accept-language'] as string,
    );

    const context: IRequestContext = {
      requestId,
      tenantId,
      orgId,
      cycleId,
      actorId,
      correlationId,
      acceptLanguage,
      startedAt: new Date(),
    };

    // Set context in service
    this.contextService.setContext(context);

    // Attach to request for access in guards/filters
    req.context = context;

    // Set response headers for tracing
    res.setHeader('X-Request-Id', requestId);
    res.setHeader('X-Correlation-Id', correlationId);

    next();
  }

  private parseAcceptLanguage(header?: string): 'pt-BR' | 'en' | 'es' {
    if (!header) return 'pt-BR';

    const lang = header.toLowerCase();
    if (lang.includes('pt')) return 'pt-BR';
    if (lang.includes('es')) return 'es';
    if (lang.includes('en')) return 'en';

    return 'pt-BR';
  }
}

import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { Observable, map } from 'rxjs';

export interface CreateAuditLogRequest {
  xTenantId: string;
  xOrgId: string;
  xRequestId?: string;
  body: {
    action: string;
    resourceType: string;
    resourceId: string;
    actorId: string;
    timestamp?: string;
    metadata?: Record<string, unknown>;
    correlationId?: string;
  };
}

export interface CreateAuditLogResponse {
  success: boolean;
  auditLogId?: string;
  message?: string;
}

@Injectable()
export class AuditApiClient {
  private readonly baseUrl: string;
  private readonly token: string;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {
    this.baseUrl = this.config.get<string>('CORE_API_BASE_URL', 'http://localhost:3001');
    this.token = this.config.get<string>('CORE_API_TOKEN', '');
  }

  private getHeaders(req: { xTenantId: string; xOrgId: string; xRequestId?: string }) {
    return {
      'Authorization': `Bearer ${this.token}`,
      'X-Tenant-Id': req.xTenantId,
      'X-Org-Id': req.xOrgId,
      ...(req.xRequestId && { 'X-Request-Id': req.xRequestId }),
    };
  }

  createAuditLog(req: CreateAuditLogRequest): Observable<{ data: CreateAuditLogResponse }> {
    return this.http.post<CreateAuditLogResponse>(
      `${this.baseUrl}/audit/logs`,
      req.body,
      { headers: this.getHeaders(req) },
    ).pipe(map(response => ({ data: response.data })));
  }
}

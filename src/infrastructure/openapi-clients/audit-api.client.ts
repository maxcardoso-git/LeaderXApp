import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { Observable, of, map } from 'rxjs';
import { randomUUID } from 'crypto';

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

// In-memory audit log storage for mock mode
const mockAuditLogs: Array<CreateAuditLogRequest['body'] & { id: string; createdAt: string }> = [];

@Injectable()
export class AuditApiClient {
  private readonly logger = new Logger(AuditApiClient.name);
  private readonly baseUrl: string;
  private readonly token: string;
  private readonly useMock: boolean;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {
    this.baseUrl = this.config.get<string>('CORE_API_BASE_URL', 'http://localhost:3001');
    this.token = this.config.get<string>('CORE_API_TOKEN', '');
    this.useMock = this.config.get<string>('USE_MOCK_API', 'true') === 'true';

    if (this.useMock) {
      this.logger.warn('Using MOCK API responses for Audit API');
    }
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
    if (this.useMock) {
      const auditLogId = `audit-${randomUUID().slice(0, 8)}`;

      this.logger.log(
        `[MOCK] Creating audit log: ${req.body.action} on ${req.body.resourceType}/${req.body.resourceId} by ${req.body.actorId}`,
      );

      mockAuditLogs.push({
        id: auditLogId,
        ...req.body,
        createdAt: new Date().toISOString(),
      });

      return of({
        data: {
          success: true,
          auditLogId,
          message: 'Audit log created successfully',
        },
      });
    }

    return this.http.post<CreateAuditLogResponse>(
      `${this.baseUrl}/audit/logs`,
      req.body,
      { headers: this.getHeaders(req) },
    ).pipe(map(response => ({ data: response.data })));
  }

  // Helper method to get mock audit logs (for testing)
  getMockAuditLogs(): typeof mockAuditLogs {
    return mockAuditLogs;
  }
}

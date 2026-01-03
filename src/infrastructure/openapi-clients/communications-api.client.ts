import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { Observable, map } from 'rxjs';

export interface SendNotificationRequest {
  xTenantId: string;
  xOrgId: string;
  xRequestId?: string;
  body: {
    recipientId: string;
    templateId?: string;
    channel?: 'EMAIL' | 'PUSH' | 'SMS';
    subject?: string;
    message: string;
    metadata?: Record<string, unknown>;
  };
}

export interface SendNotificationResponse {
  success: boolean;
  notificationId?: string;
  message?: string;
}

@Injectable()
export class CommunicationsApiClient {
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

  sendNotification(req: SendNotificationRequest): Observable<{ data: SendNotificationResponse }> {
    return this.http.post<SendNotificationResponse>(
      `${this.baseUrl}/communications/notifications`,
      req.body,
      { headers: this.getHeaders(req) },
    ).pipe(map(response => ({ data: response.data })));
  }
}

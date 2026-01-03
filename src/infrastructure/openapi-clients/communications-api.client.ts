import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { Observable, of, map } from 'rxjs';
import { randomUUID } from 'crypto';

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

// In-memory notification storage for mock mode
const mockNotifications: Array<SendNotificationRequest['body'] & { id: string; sentAt: string; status: string }> = [];

@Injectable()
export class CommunicationsApiClient {
  private readonly logger = new Logger(CommunicationsApiClient.name);
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
      this.logger.warn('Using MOCK API responses for Communications API');
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

  sendNotification(req: SendNotificationRequest): Observable<{ data: SendNotificationResponse }> {
    if (this.useMock) {
      const notificationId = `notif-${randomUUID().slice(0, 8)}`;
      const channel = req.body.channel || 'PUSH';

      this.logger.log(
        `[MOCK] Sending ${channel} notification to ${req.body.recipientId}: "${req.body.subject || req.body.message.slice(0, 50)}..."`,
      );

      mockNotifications.push({
        id: notificationId,
        ...req.body,
        sentAt: new Date().toISOString(),
        status: 'SENT',
      });

      return of({
        data: {
          success: true,
          notificationId,
          message: `Notification sent via ${channel}`,
        },
      });
    }

    return this.http.post<SendNotificationResponse>(
      `${this.baseUrl}/communications/notifications`,
      req.body,
      { headers: this.getHeaders(req) },
    ).pipe(map(response => ({ data: response.data })));
  }

  // Helper method to get mock notifications (for testing)
  getMockNotifications(): typeof mockNotifications {
    return mockNotifications;
  }
}

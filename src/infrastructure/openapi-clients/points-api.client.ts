import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { Observable, map } from 'rxjs';

export interface RecalculatePointsRequest {
  xTenantId: string;
  xOrgId: string;
  xCycleId?: string;
  xRequestId?: string;
  body: {
    candidateId: string;
    reason?: string;
  };
}

export interface RecalculatePointsResponse {
  success: boolean;
  message?: string;
}

@Injectable()
export class PointsApiClient {
  private readonly baseUrl: string;
  private readonly token: string;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {
    this.baseUrl = this.config.get<string>('CORE_API_BASE_URL', 'http://localhost:3001');
    this.token = this.config.get<string>('CORE_API_TOKEN', '');
  }

  private getHeaders(req: { xTenantId: string; xOrgId: string; xCycleId?: string; xRequestId?: string }) {
    return {
      'Authorization': `Bearer ${this.token}`,
      'X-Tenant-Id': req.xTenantId,
      'X-Org-Id': req.xOrgId,
      ...(req.xCycleId && { 'X-Cycle-Id': req.xCycleId }),
      ...(req.xRequestId && { 'X-Request-Id': req.xRequestId }),
    };
  }

  recalculatePoints(req: RecalculatePointsRequest): Observable<{ data: RecalculatePointsResponse }> {
    return this.http.post<RecalculatePointsResponse>(
      `${this.baseUrl}/points/recalculate`,
      req.body,
      { headers: this.getHeaders(req) },
    ).pipe(map(response => ({ data: response.data })));
  }
}

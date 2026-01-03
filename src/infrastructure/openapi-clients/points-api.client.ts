import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { Observable, of, map } from 'rxjs';

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
  newScore?: number;
  previousScore?: number;
}

@Injectable()
export class PointsApiClient {
  private readonly logger = new Logger(PointsApiClient.name);
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
      this.logger.warn('Using MOCK API responses for Points API');
    }
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
    if (this.useMock) {
      this.logger.log(`[MOCK] Recalculating points for candidate ${req.body.candidateId}`);

      const previousScore = Math.floor(Math.random() * 50) + 50;
      const newScore = previousScore + Math.floor(Math.random() * 20) + 5;

      return of({
        data: {
          success: true,
          message: `Points recalculated for candidate ${req.body.candidateId}`,
          previousScore,
          newScore,
        },
      });
    }

    return this.http.post<RecalculatePointsResponse>(
      `${this.baseUrl}/points/recalculate`,
      req.body,
      { headers: this.getHeaders(req) },
    ).pipe(map(response => ({ data: response.data })));
  }
}

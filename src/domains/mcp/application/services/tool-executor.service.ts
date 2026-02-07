import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { McpTool } from '../../domain/types';

@Injectable()
export class ToolExecutorService {
  private readonly logger = new Logger(ToolExecutorService.name);
  private readonly kongProxyUrl: string;

  constructor(private readonly httpService: HttpService) {
    this.kongProxyUrl = process.env.KONG_PROXY_URL || 'http://localhost:8000';
  }

  async execute(
    tool: McpTool,
    input: Record<string, any>,
    headers: Record<string, string>,
  ): Promise<any> {
    const url = `${this.kongProxyUrl}${tool.apiBinding.path}`;

    this.logger.log(
      `Executing tool ${tool.toolCode}: ${tool.apiBinding.method} ${url}`,
    );

    const response = await firstValueFrom(
      this.httpService.request({
        method: tool.apiBinding.method.toLowerCase(),
        url,
        data: input,
        headers,
        timeout: tool.guardrails.timeoutMs,
      }),
    );

    return response.data;
  }
}

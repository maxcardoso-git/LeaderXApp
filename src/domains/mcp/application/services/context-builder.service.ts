import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { McpTool } from '../../domain/types';

interface AgentContext {
  agentId: string;
  tenantId?: string;
  orgId?: string;
  role?: string;
}

@Injectable()
export class ContextBuilderService {
  buildHeaders(
    tool: McpTool,
    agentContext: AgentContext,
  ): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Tenant-Id': agentContext.tenantId || 'demo-tenant',
      'X-Org-Id': agentContext.orgId || 'demo-org',
      'X-Request-Id': randomUUID(),
      'X-MCP-Agent-Id': agentContext.agentId,
      'X-MCP-Tool-Code': tool.toolCode,
    };

    const mcpApiKey = process.env.MCP_API_KEY;
    if (mcpApiKey) {
      headers['apikey'] = mcpApiKey;
    }

    return headers;
  }
}

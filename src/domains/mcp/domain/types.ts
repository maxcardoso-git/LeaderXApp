export interface McpTool {
  toolCode: string;
  name: string;
  description: string;
  category: string;
  apiBinding: {
    serviceCode: string;
    method: string;
    path: string;
  };
  inputSchema: Record<string, any>;
  outputSchema: Record<string, any>;
  guardrails: {
    noWrite: boolean;
    noApproval: boolean;
    noEventEmission: boolean;
    timeoutMs: number;
  };
  audit: {
    enabled: boolean;
    fields: string[];
  };
}

export interface McpExecutionRequest {
  toolCode: string;
  input: Record<string, any>;
  agentContext: {
    agentId: string;
    tenantId?: string;
    orgId?: string;
    role?: string;
  };
}

export interface McpExecutionResult {
  toolCode: string;
  status: 'SUCCESS' | 'DENIED' | 'ERROR';
  output: Record<string, any> | null;
  error: string | null;
  executionTimeMs: number;
  traceId: string;
}

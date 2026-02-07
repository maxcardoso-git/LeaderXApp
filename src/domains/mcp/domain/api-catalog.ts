import { McpTool } from './types';

export const MCP_TOOL_CATALOG: McpTool[] = [
  {
    toolCode: 'SIMULATE_POINTS',
    name: 'Simular Pontos',
    description:
      'Executa simulação (dry-run) do motor de pontos da LeaderX. Retorna regra encontrada, pontos calculados, constraints validados e preview do lançamento no ledger — sem gravar nada no banco.',
    category: 'POINTS',
    apiBinding: {
      serviceCode: 'POINTS_SIMULATOR_API',
      method: 'POST',
      path: '/admin/points/simulate',
    },
    inputSchema: {
      type: 'object',
      required: ['eventCode'],
      properties: {
        eventCode: {
          type: 'string',
          enum: [
            'PROFILE_BLOCK_COMPLETED',
            'PROFILE_ALL_BLOCKS_COMPLETED',
            'BENEFIT_REQUESTED',
          ],
          description: 'Código do evento a simular',
        },
        payload: {
          type: 'object',
          description: 'Payload específico do evento',
          properties: {
            blockCode: { type: 'string' },
            avatar: { type: 'string' },
            benefit: { type: 'string' },
          },
        },
        context: {
          type: 'object',
          description: 'Contexto simulado para validação de constraints',
          properties: {
            assumedBalance: { type: 'number' },
            alreadyRewardedUnits: {
              type: 'array',
              items: { type: 'string' },
            },
            bonusAlreadyGranted: { type: 'boolean' },
          },
        },
      },
    },
    outputSchema: {
      type: 'object',
      properties: {
        resolved: { type: 'boolean' },
        ruleMatched: { type: 'string' },
        ruleType: { type: 'string', enum: ['EARNING', 'BONUS', 'SPENDING'] },
        points: { type: 'number' },
        action: { type: 'string', enum: ['CREDIT', 'DEBIT'] },
        requiresApproval: { type: 'boolean' },
        constraintViolations: { type: 'array' },
        ledgerCommandPreview: { type: 'object' },
        policySnapshot: { type: 'object' },
        resolverTrace: { type: 'array', items: { type: 'string' } },
      },
    },
    guardrails: {
      noWrite: true,
      noApproval: true,
      noEventEmission: true,
      timeoutMs: 3000,
    },
    audit: {
      enabled: true,
      fields: ['agentId', 'tenantId', 'toolCode', 'executionTimeMs', 'status'],
    },
  },
];

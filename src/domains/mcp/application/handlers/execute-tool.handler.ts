import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '@infrastructure/persistence/prisma.service';
import { McpExecutionRequest, McpExecutionResult } from '../../domain/types';
import { ToolRegistryService } from '../services/tool-registry.service';
import { ContextBuilderService } from '../services/context-builder.service';
import { ToolExecutorService } from '../services/tool-executor.service';

@Injectable()
export class ExecuteToolHandler {
  private readonly logger = new Logger(ExecuteToolHandler.name);

  constructor(
    private readonly registry: ToolRegistryService,
    private readonly contextBuilder: ContextBuilderService,
    private readonly executor: ToolExecutorService,
    private readonly prisma: PrismaService,
  ) {}

  async execute(
    tenantId: string,
    request: McpExecutionRequest,
  ): Promise<McpExecutionResult> {
    const startTime = Date.now();
    const traceId = randomUUID();
    const agentId = request.agentContext?.agentId || 'unknown';

    // 1. Find tool in registry
    const tool = this.registry.getTool(request.toolCode);
    if (!tool) {
      const result: McpExecutionResult = {
        toolCode: request.toolCode,
        status: 'DENIED',
        output: null,
        error: `Tool '${request.toolCode}' not found in registry`,
        executionTimeMs: Date.now() - startTime,
        traceId,
      };

      await this.logExecution(tenantId, agentId, result, request.input);
      return result;
    }

    // 2. Validate input against schema
    const validation = this.registry.validateInput(
      request.toolCode,
      request.input,
    );
    if (!validation.valid) {
      const result: McpExecutionResult = {
        toolCode: request.toolCode,
        status: 'ERROR',
        output: null,
        error: `Input validation failed: ${validation.errors.join('; ')}`,
        executionTimeMs: Date.now() - startTime,
        traceId,
      };

      await this.logExecution(tenantId, agentId, result, request.input);
      return result;
    }

    // 3. Build context headers
    const headers = this.contextBuilder.buildHeaders(tool, {
      agentId,
      tenantId: request.agentContext?.tenantId || tenantId,
      orgId: request.agentContext?.orgId,
      role: request.agentContext?.role || 'AI_AGENT',
    });

    // 4. Execute tool via Kong
    try {
      const output = await this.executor.execute(tool, request.input, headers);
      const executionTimeMs = Date.now() - startTime;

      this.logger.log(
        `Tool ${request.toolCode} executed in ${executionTimeMs}ms [${traceId}]`,
      );

      const result: McpExecutionResult = {
        toolCode: request.toolCode,
        status: 'SUCCESS',
        output,
        error: null,
        executionTimeMs,
        traceId,
      };

      await this.logExecution(tenantId, agentId, result, request.input);
      return result;
    } catch (error: any) {
      const executionTimeMs = Date.now() - startTime;
      const errorMessage =
        error.response?.data?.message || error.message || 'Unknown error';

      this.logger.error(
        `Tool ${request.toolCode} failed after ${executionTimeMs}ms: ${errorMessage} [${traceId}]`,
      );

      const result: McpExecutionResult = {
        toolCode: request.toolCode,
        status: 'ERROR',
        output: null,
        error: errorMessage,
        executionTimeMs,
        traceId,
      };

      await this.logExecution(tenantId, agentId, result, request.input);
      return result;
    }
  }

  private async logExecution(
    tenantId: string,
    agentId: string,
    result: McpExecutionResult,
    input: Record<string, any>,
  ): Promise<void> {
    try {
      await this.prisma.mcpToolExecution.create({
        data: {
          tenantId,
          toolCode: result.toolCode,
          agentId,
          status: result.status,
          inputPayload: input as any,
          outputPayload: result.output as any,
          executionTimeMs: result.executionTimeMs,
          errorMessage: result.error,
        },
      });
    } catch (err) {
      this.logger.error(`Failed to log MCP execution: ${err}`);
    }
  }
}

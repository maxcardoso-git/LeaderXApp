import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Headers,
  Query,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader, ApiResponse } from '@nestjs/swagger';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ExecuteToolDto } from '../dtos/execute-tool.dto';
import { ExecuteToolHandler } from '../../application/handlers/execute-tool.handler';
import { ToolRegistryService } from '../../application/services/tool-registry.service';
import { PrismaService } from '@infrastructure/persistence/prisma.service';

@ApiTags('MCP')
@Controller('mcp/tools')
export class McpController {
  private readonly kongAdminUrl: string;

  constructor(
    private readonly executeToolHandler: ExecuteToolHandler,
    private readonly registry: ToolRegistryService,
    private readonly prisma: PrismaService,
    private readonly httpService: HttpService,
  ) {
    this.kongAdminUrl = process.env.KONG_ADMIN_URL || 'http://localhost:8001';
  }

  @Get()
  @ApiOperation({ summary: 'List all available MCP tools' })
  async listTools() {
    return this.registry.listTools();
  }

  @Get('executions')
  @ApiOperation({ summary: 'List MCP tool execution audit logs' })
  @ApiHeader({ name: 'X-Tenant-Id', required: true })
  async listExecutions(
    @Headers('x-tenant-id') tenantId: string,
    @Query('toolCode') toolCode?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('size') size?: string,
  ) {
    const pageNum = parseInt(page || '1', 10);
    const pageSize = parseInt(size || '20', 10);

    const where: any = { tenantId };
    if (toolCode) where.toolCode = toolCode;
    if (status) where.status = status;

    const [items, total] = await Promise.all([
      this.prisma.mcpToolExecution.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.mcpToolExecution.count({ where }),
    ]);

    return { items, page: pageNum, size: pageSize, total };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get MCP execution statistics' })
  @ApiHeader({ name: 'X-Tenant-Id', required: true })
  async getStats(
    @Headers('x-tenant-id') tenantId: string,
    @Query('period') period?: string,
  ) {
    const periodMs: Record<string, number> = {
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
    };
    const ms = periodMs[period || '24h'] || periodMs['24h'];
    const periodStart = new Date(Date.now() - ms);
    const where = { tenantId, createdAt: { gte: periodStart } };

    const [statusGroups, toolGroups, kongHealth] = await Promise.all([
      this.prisma.mcpToolExecution.groupBy({
        by: ['status'],
        where,
        _count: { status: true },
        _avg: { executionTimeMs: true },
      }),
      this.prisma.mcpToolExecution.groupBy({
        by: ['toolCode', 'status'],
        where,
        _count: { toolCode: true },
        _avg: { executionTimeMs: true },
      }),
      this.getKongHealth(),
    ]);

    // Build summary
    let totalExecutions = 0;
    let successCount = 0;
    let errorCount = 0;
    let deniedCount = 0;
    let totalAvgTime = 0;
    let avgCount = 0;

    for (const g of statusGroups) {
      const count = g._count.status;
      totalExecutions += count;
      if (g.status === 'SUCCESS') successCount = count;
      if (g.status === 'ERROR') errorCount = count;
      if (g.status === 'DENIED') deniedCount = count;
      if (g._avg.executionTimeMs) {
        totalAvgTime += g._avg.executionTimeMs * count;
        avgCount += count;
      }
    }

    // Build by-tool breakdown
    const toolMap = new Map<string, { count: number; successCount: number; errorCount: number; totalTime: number; timeCount: number }>();
    for (const g of toolGroups) {
      const existing = toolMap.get(g.toolCode) || { count: 0, successCount: 0, errorCount: 0, totalTime: 0, timeCount: 0 };
      const cnt = g._count.toolCode;
      existing.count += cnt;
      if (g.status === 'SUCCESS') existing.successCount += cnt;
      if (g.status === 'ERROR') existing.errorCount += cnt;
      if (g._avg.executionTimeMs) {
        existing.totalTime += g._avg.executionTimeMs * cnt;
        existing.timeCount += cnt;
      }
      toolMap.set(g.toolCode, existing);
    }

    const byTool = Array.from(toolMap.entries()).map(([toolCode, data]) => ({
      toolCode,
      count: data.count,
      successCount: data.successCount,
      errorCount: data.errorCount,
      avgTimeMs: data.timeCount > 0 ? Math.round(data.totalTime / data.timeCount) : 0,
    }));

    return {
      period: period || '24h',
      summary: {
        totalExecutions,
        successCount,
        errorCount,
        deniedCount,
        avgExecutionTimeMs: avgCount > 0 ? Math.round(totalAvgTime / avgCount) : 0,
        successRate: totalExecutions > 0 ? Math.round((successCount / totalExecutions) * 1000) / 10 : 0,
        errorRate: totalExecutions > 0 ? Math.round((errorCount / totalExecutions) * 1000) / 10 : 0,
      },
      byTool,
      serverHealth: {
        registeredTools: this.registry.listTools().length,
        kongStatus: kongHealth,
      },
    };
  }

  private async getKongHealth(): Promise<'connected' | 'disconnected'> {
    try {
      await firstValueFrom(this.httpService.get(`${this.kongAdminUrl}/status`));
      return 'connected';
    } catch {
      return 'disconnected';
    }
  }

  @Get(':code')
  @ApiOperation({ summary: 'Get a specific MCP tool by code' })
  async getTool(@Param('code') code: string) {
    const tool = this.registry.getTool(code);
    if (!tool) {
      throw new NotFoundException(`Tool '${code}' not found`);
    }
    return tool;
  }

  @Post('execute')
  @ApiOperation({ summary: 'Execute an MCP tool' })
  @ApiHeader({ name: 'X-Tenant-Id', required: true })
  @ApiResponse({ status: 200, description: 'Tool execution result' })
  async executeTool(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: ExecuteToolDto,
  ) {
    return this.executeToolHandler.execute(tenantId, {
      toolCode: dto.toolCode,
      input: dto.input,
      agentContext: dto.agentContext || { agentId: 'anonymous' },
    });
  }
}

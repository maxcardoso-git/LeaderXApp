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
import { ExecuteToolDto } from '../dtos/execute-tool.dto';
import { ExecuteToolHandler } from '../../application/handlers/execute-tool.handler';
import { ToolRegistryService } from '../../application/services/tool-registry.service';
import { PrismaService } from '@infrastructure/persistence/prisma.service';

@ApiTags('MCP')
@Controller('mcp/tools')
export class McpController {
  constructor(
    private readonly executeToolHandler: ExecuteToolHandler,
    private readonly registry: ToolRegistryService,
    private readonly prisma: PrismaService,
  ) {}

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

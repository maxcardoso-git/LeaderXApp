import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Headers,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader } from '@nestjs/swagger';
import { ManageToolDefinitionHandler } from '../../application/handlers/manage-tool-definition.handler';
import { ToolDefinitionRepository } from '../../outbound/repositories/tool-definition.repository';
import { CreateToolDefinitionDto, UpdateToolDefinitionDto } from '../dtos/tool-definition.dto';

@ApiTags('MCP Tool Definitions')
@Controller('mcp/tool-definitions')
export class ToolDefinitionsController {
  constructor(
    private readonly handler: ManageToolDefinitionHandler,
    private readonly repo: ToolDefinitionRepository,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new MCP tool definition (DRAFT)' })
  @ApiHeader({ name: 'X-Tenant-Id', required: true })
  @ApiHeader({ name: 'X-User-Id', required: true })
  async create(
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-user-id') userId: string,
    @Body() dto: CreateToolDefinitionDto,
  ) {
    return this.handler.create({
      ...dto,
      tenantId,
      createdBy: userId || 'system',
    });
  }

  @Get()
  @ApiOperation({ summary: 'List tool definitions' })
  @ApiHeader({ name: 'X-Tenant-Id', required: true })
  async list(
    @Headers('x-tenant-id') tenantId: string,
    @Query('status') status?: string,
    @Query('category') category?: string,
    @Query('search') search?: string,
  ) {
    return this.repo.findByTenant(tenantId, { status, category, search });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get tool definition by ID' })
  async findById(@Param('id') id: string) {
    return this.repo.findById(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update tool definition (DRAFT only)' })
  @ApiHeader({ name: 'X-User-Id', required: true })
  async update(
    @Param('id') id: string,
    @Headers('x-user-id') userId: string,
    @Body() dto: UpdateToolDefinitionDto,
  ) {
    return this.handler.update(id, { ...dto, updatedBy: userId || 'system' });
  }

  @Post(':id/publish')
  @ApiOperation({ summary: 'Publish tool definition (may require approval)' })
  @ApiHeader({ name: 'X-Tenant-Id', required: true })
  @ApiHeader({ name: 'X-User-Id', required: true })
  async publish(
    @Param('id') id: string,
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-user-id') userId: string,
  ) {
    return this.handler.publish(id, tenantId, userId || 'system');
  }

  @Post(':id/deprecate')
  @ApiOperation({ summary: 'Deprecate a published tool' })
  @ApiHeader({ name: 'X-User-Id', required: true })
  async deprecate(
    @Param('id') id: string,
    @Headers('x-user-id') userId: string,
  ) {
    return this.handler.deprecate(id, userId || 'system');
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete tool definition (DRAFT only)' })
  async remove(@Param('id') id: string) {
    await this.handler.remove(id);
    return { deleted: true };
  }
}

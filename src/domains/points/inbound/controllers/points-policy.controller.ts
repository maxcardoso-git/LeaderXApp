import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Headers,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { PointsPolicyHandler } from '../../application/handlers/points-policy.handler';
import { CreatePointsPolicyDto, UpdatePointsPolicyDto } from '../dtos/points-policy.dto';

@ApiTags('Points Policy')
@Controller('admin/points-policy')
export class PointsPolicyController {
  constructor(private readonly handler: PointsPolicyHandler) {}

  @Get()
  @ApiOperation({ summary: 'Get active points policy' })
  @ApiResponse({ status: 200, description: 'Policy retrieved successfully' })
  @ApiResponse({ status: 404, description: 'No active policy found' })
  @ApiHeader({ name: 'X-Tenant-Id', required: true })
  async getActive(@Headers('x-tenant-id') tenantId: string) {
    const policy = await this.handler.getActivePolicy(tenantId);
    if (!policy) {
      throw new HttpException(
        { error: 'NO_ACTIVE_POLICY', message: 'No active points policy found' },
        HttpStatus.NOT_FOUND,
      );
    }
    return policy;
  }

  @Get('versions')
  @ApiOperation({ summary: 'List all policy versions' })
  @ApiResponse({ status: 200, description: 'Versions listed successfully' })
  @ApiHeader({ name: 'X-Tenant-Id', required: true })
  async listVersions(@Headers('x-tenant-id') tenantId: string) {
    return this.handler.listVersions(tenantId);
  }

  @Post()
  @ApiOperation({ summary: 'Create new policy version (deprecates previous)' })
  @ApiResponse({ status: 201, description: 'Policy version created successfully' })
  @ApiHeader({ name: 'X-Tenant-Id', required: true })
  async create(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: CreatePointsPolicyDto,
  ) {
    return this.handler.createVersion(tenantId, {
      name: dto.name,
      rules: dto.rules,
    });
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update policy in-place' })
  @ApiResponse({ status: 200, description: 'Policy updated successfully' })
  @ApiResponse({ status: 404, description: 'Policy not found' })
  @ApiHeader({ name: 'X-Tenant-Id', required: true })
  async update(
    @Param('id') id: string,
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: UpdatePointsPolicyDto,
  ) {
    return this.handler.updatePolicy(tenantId, id, {
      name: dto.name,
      rules: dto.rules,
    });
  }
}

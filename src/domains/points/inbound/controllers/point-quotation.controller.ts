import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  Headers,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader } from '@nestjs/swagger';
import { PointQuotationHandler } from '../../application/handlers/point-quotation.handler';

@ApiTags('Point Quotation')
@Controller('admin/points-quotation')
export class PointQuotationController {
  constructor(private readonly handler: PointQuotationHandler) {}

  @Get()
  @ApiOperation({ summary: 'Get active point quotation' })
  @ApiHeader({ name: 'X-Tenant-Id', required: true })
  async getActive(@Headers('x-tenant-id') tenantId: string) {
    return this.handler.getActive(tenantId);
  }

  @Get('list')
  @ApiOperation({ summary: 'List quotation history' })
  @ApiHeader({ name: 'X-Tenant-Id', required: true })
  async list(
    @Headers('x-tenant-id') tenantId: string,
    @Query('page') page?: string,
    @Query('size') size?: string,
    @Query('status') status?: string,
  ) {
    return this.handler.list(tenantId, {
      page: page ? parseInt(page, 10) : undefined,
      size: size ? parseInt(size, 10) : undefined,
      status,
    });
  }

  @Post()
  @ApiOperation({ summary: 'Create new quotation (deprecates previous)' })
  @ApiHeader({ name: 'X-Tenant-Id', required: true })
  async create(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: { value: number; currency?: string; effectiveFrom: string; description?: string; reason?: string },
  ) {
    if (!dto.value || !dto.effectiveFrom) {
      throw new HttpException(
        { error: 'VALIDATION_ERROR', message: 'value and effectiveFrom are required' },
        HttpStatus.BAD_REQUEST,
      );
    }
    return this.handler.create(tenantId, {
      value: dto.value,
      currency: dto.currency,
      effectiveFrom: new Date(dto.effectiveFrom),
      description: dto.description,
      reason: dto.reason,
    });
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update quotation metadata' })
  @ApiHeader({ name: 'X-Tenant-Id', required: true })
  async update(
    @Param('id') id: string,
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: { description?: string; reason?: string },
  ) {
    return this.handler.update(tenantId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deprecate a quotation' })
  @ApiHeader({ name: 'X-Tenant-Id', required: true })
  async deprecate(
    @Param('id') id: string,
    @Headers('x-tenant-id') tenantId: string,
  ) {
    return this.handler.deprecate(tenantId, id);
  }
}

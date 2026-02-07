import {
  Controller,
  Post,
  Body,
  Headers,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { PointsSimulatorHandler } from '../../application/handlers/points-simulator.handler';
import { SimulatePointsDto } from '../dtos/points-simulator.dto';

@ApiTags('Points Simulator')
@Controller('admin/points')
export class PointsSimulatorController {
  constructor(private readonly handler: PointsSimulatorHandler) {}

  @Post('simulate')
  @ApiOperation({ summary: 'Simulate a points event (dry run, no DB writes)' })
  @ApiResponse({ status: 200, description: 'Simulation result' })
  @ApiHeader({ name: 'X-Tenant-Id', required: true })
  async simulate(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: SimulatePointsDto,
  ) {
    if (!tenantId) {
      throw new HttpException(
        { error: 'MISSING_TENANT', message: 'X-Tenant-Id header is required' },
        HttpStatus.BAD_REQUEST,
      );
    }
    return this.handler.simulate(tenantId, {
      eventCode: dto.eventCode,
      payload: dto.payload || {},
      context: dto.context || {},
    });
  }
}

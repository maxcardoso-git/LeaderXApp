import { Controller, Get, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader, ApiResponse } from '@nestjs/swagger';
import { PrismaService } from '@infrastructure/persistence/prisma.service';

@ApiTags('Network - Stats')
@Controller('network')
@ApiHeader({ name: 'X-Tenant-Id', required: true })
export class NetworkStatsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get network statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getStats(@Headers('x-tenant-id') tenantId: string) {
    const [
      totalStructures,
      activeStructures,
      structureTypes,
      totalLeaders,
      pendingApprovals,
    ] = await Promise.all([
      this.prisma.structure.count({ where: { tenantId } }),
      this.prisma.structure.count({ where: { tenantId, status: 'ACTIVE' } }),
      this.prisma.structureType.count({ where: { tenantId } }),
      this.prisma.structureLeader.count({ where: { tenantId, status: 'ACTIVE' } }),
      // Approval chains is calculated based on structures with leaders that can approve
      this.prisma.structureLeader.count({ where: { tenantId, canApprove: true, status: 'ACTIVE' } }),
    ]);

    return {
      totalStructures,
      activeStructures,
      structureTypes,
      approvalChains: totalLeaders,
      pendingApprovals,
    };
  }
}

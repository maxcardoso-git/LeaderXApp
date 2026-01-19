import { Controller, Get, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader, ApiResponse } from '@nestjs/swagger';
import { PrismaService } from '@infrastructure/persistence/prisma.service';

@ApiTags('Governance - Stats')
@Controller('governance')
@ApiHeader({ name: 'X-Tenant-Id', required: true })
export class GovernanceStatsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get governance statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getStats(@Headers('x-tenant-id') tenantId: string) {
    const [
      totalGroups,
      totalNuclei,
      activeGroups,
      activeNuclei,
      totalMembers,
    ] = await Promise.all([
      this.prisma.workingUnit.count({ where: { tenantId, type: 'GROUP' } }),
      this.prisma.workingUnit.count({ where: { tenantId, type: 'NUCLEUS' } }),
      this.prisma.workingUnit.count({ where: { tenantId, type: 'GROUP', status: 'ACTIVE' } }),
      this.prisma.workingUnit.count({ where: { tenantId, type: 'NUCLEUS', status: 'ACTIVE' } }),
      this.prisma.workingUnitMembership.count({ where: { tenantId, status: 'ACTIVE' } }),
    ]);

    return {
      totalGroups,
      totalNuclei,
      activeGroups,
      activeNuclei,
      totalMembers,
    };
  }
}

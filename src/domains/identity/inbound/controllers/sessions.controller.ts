import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  HttpCode,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiHeader,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { PrismaService } from '@infrastructure/persistence/prisma.service';

interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  totalPages: number;
}

class CreateSessionDto {
  userId: string;
  deviceType?: string;
  deviceName?: string;
  browser?: string;
  browserVersion?: string;
  os?: string;
  osVersion?: string;
  ipAddress?: string;
  location?: string;
  userAgent?: string;
  expiresAt?: Date;
}

class ListSessionsQueryDto {
  page?: number;
  size?: number;
  status?: string;
  userId?: string;
}

@ApiTags('Identity - Sessions')
@Controller('identity/sessions')
export class SessionsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'List all sessions' })
  @ApiResponse({ status: 200, description: 'Sessions retrieved successfully' })
  @ApiHeader({ name: 'X-Tenant-Id', required: true })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'size', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'userId', required: false })
  async listSessions(
    @Headers('x-tenant-id') tenantId: string,
    @Query() query: ListSessionsQueryDto,
  ): Promise<PaginatedResponse<any>> {
    const page = query.page ?? 1;
    const size = query.size ?? 25;
    const skip = (page - 1) * size;

    const where: any = { tenantId };
    if (query.status) {
      where.status = query.status;
    }
    if (query.userId) {
      where.userId = query.userId;
    }

    const [items, total] = await Promise.all([
      this.prisma.userSession.findMany({
        where,
        skip,
        take: size,
        orderBy: { lastActivity: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              fullName: true,
            },
          },
        },
      }),
      this.prisma.userSession.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      size,
      totalPages: Math.ceil(total / size),
    };
  }

  @Get(':sessionId')
  @ApiOperation({ summary: 'Get session by ID' })
  @ApiResponse({ status: 200, description: 'Session retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  @ApiHeader({ name: 'X-Tenant-Id', required: true })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  async getSession(
    @Headers('x-tenant-id') tenantId: string,
    @Param('sessionId') sessionId: string,
  ) {
    const session = await this.prisma.userSession.findFirst({
      where: { id: sessionId, tenantId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
          },
        },
      },
    });

    if (!session) {
      throw new HttpException('Session not found', HttpStatus.NOT_FOUND);
    }

    return session;
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get sessions by user ID' })
  @ApiResponse({ status: 200, description: 'Sessions retrieved successfully' })
  @ApiHeader({ name: 'X-Tenant-Id', required: true })
  @ApiParam({ name: 'userId', description: 'User ID' })
  async getSessionsByUser(
    @Headers('x-tenant-id') tenantId: string,
    @Param('userId') userId: string,
    @Query('status') status?: string,
  ) {
    const where: any = { tenantId, userId };
    if (status) {
      where.status = status;
    }

    return this.prisma.userSession.findMany({
      where,
      orderBy: { lastActivity: 'desc' },
    });
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new session' })
  @ApiResponse({ status: 201, description: 'Session created successfully' })
  @ApiHeader({ name: 'X-Tenant-Id', required: true })
  async createSession(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: CreateSessionDto,
  ) {
    // Check if user exists
    const user = await this.prisma.identityUser.findFirst({
      where: { id: dto.userId, tenantId },
    });

    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    return this.prisma.userSession.create({
      data: {
        tenantId,
        userId: dto.userId,
        deviceType: dto.deviceType,
        deviceName: dto.deviceName,
        browser: dto.browser,
        browserVersion: dto.browserVersion,
        os: dto.os,
        osVersion: dto.osVersion,
        ipAddress: dto.ipAddress,
        location: dto.location,
        userAgent: dto.userAgent,
        expiresAt: dto.expiresAt,
        status: 'ACTIVE',
      },
    });
  }

  @Post(':sessionId/revoke')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke a session' })
  @ApiResponse({ status: 200, description: 'Session revoked successfully' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  @ApiHeader({ name: 'X-Tenant-Id', required: true })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  async revokeSession(
    @Headers('x-tenant-id') tenantId: string,
    @Param('sessionId') sessionId: string,
    @Body('reason') reason?: string,
  ) {
    const session = await this.prisma.userSession.findFirst({
      where: { id: sessionId, tenantId },
    });

    if (!session) {
      throw new HttpException('Session not found', HttpStatus.NOT_FOUND);
    }

    return this.prisma.userSession.update({
      where: { id: sessionId },
      data: {
        status: 'REVOKED',
        revokedAt: new Date(),
        revokedReason: reason,
      },
    });
  }

  @Post('user/:userId/revoke-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke all sessions for a user' })
  @ApiResponse({ status: 200, description: 'All sessions revoked successfully' })
  @ApiHeader({ name: 'X-Tenant-Id', required: true })
  @ApiParam({ name: 'userId', description: 'User ID' })
  async revokeAllUserSessions(
    @Headers('x-tenant-id') tenantId: string,
    @Param('userId') userId: string,
    @Body('reason') reason?: string,
  ) {
    const result = await this.prisma.userSession.updateMany({
      where: {
        tenantId,
        userId,
        status: 'ACTIVE',
      },
      data: {
        status: 'REVOKED',
        revokedAt: new Date(),
        revokedReason: reason || 'Bulk revocation',
      },
    });

    return { revokedCount: result.count };
  }

  @Delete(':sessionId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a session' })
  @ApiResponse({ status: 200, description: 'Session deleted successfully' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  @ApiHeader({ name: 'X-Tenant-Id', required: true })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  async deleteSession(
    @Headers('x-tenant-id') tenantId: string,
    @Param('sessionId') sessionId: string,
  ) {
    const session = await this.prisma.userSession.findFirst({
      where: { id: sessionId, tenantId },
    });

    if (!session) {
      throw new HttpException('Session not found', HttpStatus.NOT_FOUND);
    }

    await this.prisma.userSession.delete({
      where: { id: sessionId },
    });

    return { deleted: true };
  }

  @Post(':sessionId/activity')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update session last activity' })
  @ApiResponse({ status: 200, description: 'Activity updated successfully' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  @ApiHeader({ name: 'X-Tenant-Id', required: true })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  async updateActivity(
    @Headers('x-tenant-id') tenantId: string,
    @Param('sessionId') sessionId: string,
  ) {
    const session = await this.prisma.userSession.findFirst({
      where: { id: sessionId, tenantId, status: 'ACTIVE' },
    });

    if (!session) {
      throw new HttpException('Session not found or not active', HttpStatus.NOT_FOUND);
    }

    return this.prisma.userSession.update({
      where: { id: sessionId },
      data: { lastActivity: new Date() },
    });
  }

  @Get('stats/summary')
  @ApiOperation({ summary: 'Get sessions statistics summary' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  @ApiHeader({ name: 'X-Tenant-Id', required: true })
  async getStatsSummary(@Headers('x-tenant-id') tenantId: string) {
    const [
      totalSessions,
      activeSessions,
      expiredSessions,
      revokedSessions,
      deviceTypeStats,
    ] = await Promise.all([
      this.prisma.userSession.count({ where: { tenantId } }),
      this.prisma.userSession.count({ where: { tenantId, status: 'ACTIVE' } }),
      this.prisma.userSession.count({ where: { tenantId, status: 'EXPIRED' } }),
      this.prisma.userSession.count({ where: { tenantId, status: 'REVOKED' } }),
      this.prisma.userSession.groupBy({
        by: ['deviceType'],
        where: { tenantId, status: 'ACTIVE' },
        _count: { id: true },
      }),
    ]);

    return {
      total: totalSessions,
      active: activeSessions,
      expired: expiredSessions,
      revoked: revokedSessions,
      byDeviceType: deviceTypeStats.map((stat) => ({
        deviceType: stat.deviceType || 'UNKNOWN',
        count: stat._count.id,
      })),
    };
  }
}

import {
  Controller,
  Post,
  Put,
  Get,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  HttpCode,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader, ApiResponse } from '@nestjs/swagger';
import { PrismaService } from '@infrastructure/persistence/prisma.service';
import { Prisma } from '@prisma/client';
import {
  CreateStructureTypeDto,
  UpdateStructureTypeDto,
  ListStructureTypesQueryDto,
  StructureTypeResponseDto,
  PaginatedResponseDto,
} from '../dtos';

@ApiTags('Network - Structure Types')
@Controller('network/structure-types')
@ApiHeader({ name: 'X-Tenant-Id', required: true })
export class StructureTypesController {
  constructor(private readonly prisma: PrismaService) {}

  private toResponse(entity: any): StructureTypeResponseDto {
    return {
      id: entity.id,
      tenantId: entity.tenantId,
      code: entity.code,
      name: entity.name,
      description: entity.description,
      icon: entity.icon,
      color: entity.color,
      scope: entity.scope,
      hierarchyLevel: entity.hierarchyLevel,
      leadershipRoleId: entity.leadershipRoleId,
      leadershipRole: entity.leadershipRole
        ? { id: entity.leadershipRole.id, name: entity.leadershipRole.name }
        : undefined,
      maxLeaders: entity.maxLeaders,
      maxLevels: entity.maxLevels,
      allowNested: entity.allowNested,
      metadata: entity.metadata as Record<string, unknown>,
      status: entity.status,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
    };
  }

  @Post()
  @ApiOperation({ summary: 'Create a new structure type' })
  @ApiResponse({ status: 201, description: 'Structure type created successfully' })
  @ApiResponse({ status: 409, description: 'Structure type code already exists' })
  async create(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: CreateStructureTypeDto,
  ): Promise<StructureTypeResponseDto> {
    // Auto-generate code from name if not provided
    const code = dto.code?.toUpperCase() || dto.name.toUpperCase().replace(/[^A-Z0-9]/g, '_').substring(0, 30);

    // Check for duplicate code
    const existing = await this.prisma.structureType.findUnique({
      where: { tenantId_code: { tenantId, code } },
    });

    if (existing) {
      throw new HttpException(
        { error: 'STRUCTURE_TYPE_CODE_EXISTS', message: `Structure type with code ${code} already exists` },
        HttpStatus.CONFLICT,
      );
    }

    const structureType = await this.prisma.structureType.create({
      data: {
        tenantId,
        code,
        name: dto.name,
        description: dto.description,
        icon: dto.icon,
        color: dto.color,
        scope: dto.scope,
        hierarchyLevel: dto.hierarchyLevel,
        leadershipRoleId: dto.leadershipRoleId,
        maxLeaders: dto.maxLeaders ?? 1,
        maxLevels: dto.maxLevels ?? 5,
        allowNested: dto.allowNested ?? true,
        metadata: (dto.metadata ?? {}) as Prisma.InputJsonValue,
        status: 'ACTIVE',
      },
      include: { leadershipRole: true },
    });

    return this.toResponse(structureType);
  }

  @Get()
  @ApiOperation({ summary: 'List structure types' })
  @ApiResponse({ status: 200, description: 'Structure types retrieved successfully' })
  async list(
    @Headers('x-tenant-id') tenantId: string,
    @Query() query: ListStructureTypesQueryDto,
  ): Promise<PaginatedResponseDto<StructureTypeResponseDto>> {
    const page = query.page ?? 1;
    const size = query.size ?? 25;
    const skip = (page - 1) * size;

    const where: any = { tenantId };

    if (query.status) {
      where.status = query.status;
    }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search.toUpperCase(), mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.structureType.findMany({
        where,
        skip,
        take: size,
        orderBy: [{ hierarchyLevel: 'asc' }, { name: 'asc' }],
        include: { leadershipRole: true },
      }),
      this.prisma.structureType.count({ where }),
    ]);

    return {
      items: items.map((item) => this.toResponse(item)),
      page,
      size,
      total,
    };
  }

  @Get(':typeId')
  @ApiOperation({ summary: 'Get structure type by ID' })
  @ApiResponse({ status: 200, description: 'Structure type retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Structure type not found' })
  async getById(
    @Headers('x-tenant-id') tenantId: string,
    @Param('typeId') typeId: string,
  ): Promise<StructureTypeResponseDto> {
    const structureType = await this.prisma.structureType.findFirst({
      where: { id: typeId, tenantId },
      include: { leadershipRole: true },
    });

    if (!structureType) {
      throw new HttpException(
        { error: 'STRUCTURE_TYPE_NOT_FOUND', message: `Structure type ${typeId} not found` },
        HttpStatus.NOT_FOUND,
      );
    }

    return this.toResponse(structureType);
  }

  @Put(':typeId')
  @ApiOperation({ summary: 'Update a structure type' })
  @ApiResponse({ status: 200, description: 'Structure type updated successfully' })
  @ApiResponse({ status: 404, description: 'Structure type not found' })
  async update(
    @Headers('x-tenant-id') tenantId: string,
    @Param('typeId') typeId: string,
    @Body() dto: UpdateStructureTypeDto,
  ): Promise<StructureTypeResponseDto> {
    const existing = await this.prisma.structureType.findFirst({
      where: { id: typeId, tenantId },
    });

    if (!existing) {
      throw new HttpException(
        { error: 'STRUCTURE_TYPE_NOT_FOUND', message: `Structure type ${typeId} not found` },
        HttpStatus.NOT_FOUND,
      );
    }

    const structureType = await this.prisma.structureType.update({
      where: { id: typeId },
      data: {
        name: dto.name ?? existing.name,
        description: dto.description ?? existing.description,
        icon: dto.icon ?? existing.icon,
        color: dto.color ?? existing.color,
        scope: dto.scope ?? existing.scope,
        hierarchyLevel: dto.hierarchyLevel ?? existing.hierarchyLevel,
        leadershipRoleId: dto.leadershipRoleId ?? existing.leadershipRoleId,
        maxLeaders: dto.maxLeaders ?? existing.maxLeaders,
        maxLevels: dto.maxLevels ?? existing.maxLevels,
        allowNested: dto.allowNested ?? existing.allowNested,
        metadata: (dto.metadata ?? existing.metadata ?? {}) as Prisma.InputJsonValue,
        status: dto.status ?? existing.status,
      },
      include: { leadershipRole: true },
    });

    return this.toResponse(structureType);
  }

  @Delete(':typeId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deactivate a structure type' })
  @ApiResponse({ status: 200, description: 'Structure type deactivated successfully' })
  @ApiResponse({ status: 404, description: 'Structure type not found' })
  async delete(
    @Headers('x-tenant-id') tenantId: string,
    @Param('typeId') typeId: string,
  ): Promise<StructureTypeResponseDto> {
    const existing = await this.prisma.structureType.findFirst({
      where: { id: typeId, tenantId },
    });

    if (!existing) {
      throw new HttpException(
        { error: 'STRUCTURE_TYPE_NOT_FOUND', message: `Structure type ${typeId} not found` },
        HttpStatus.NOT_FOUND,
      );
    }

    // Check if there are structures using this type
    const structuresCount = await this.prisma.structure.count({
      where: { typeId, tenantId },
    });

    if (structuresCount > 0) {
      // Soft delete - set to INACTIVE
      const structureType = await this.prisma.structureType.update({
        where: { id: typeId },
        data: { status: 'INACTIVE' },
      });
      return this.toResponse(structureType);
    }

    // Hard delete if no structures
    await this.prisma.structureType.delete({
      where: { id: typeId },
    });

    return this.toResponse(existing);
  }
}

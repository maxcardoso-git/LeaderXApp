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
import { ApiTags, ApiOperation, ApiHeader } from '@nestjs/swagger';
import { PrismaService } from '@infrastructure/persistence/prisma.service';

class PaginatedResponse<T> {
  items: T[];
  page: number;
  size: number;
  total: number;
}

// ============================================
// SUPPLIERS CONTROLLER
// ============================================

@ApiTags('Suppliers')
@Controller('suppliers')
@ApiHeader({ name: 'X-Tenant-Id', required: true })
export class SuppliersController {
  constructor(private readonly prisma: PrismaService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new supplier' })
  async create(@Headers('x-tenant-id') tenantId: string, @Body() dto: any) {
    // Check for duplicate code
    const existingCode = await this.prisma.supplier.findUnique({
      where: { tenantId_code: { tenantId, code: dto.code.toUpperCase() } },
    });

    if (existingCode) {
      throw new HttpException(
        { error: 'SUPPLIER_CODE_EXISTS', message: `Supplier with code ${dto.code} already exists` },
        HttpStatus.CONFLICT,
      );
    }

    // Check for duplicate document if provided
    if (dto.document) {
      const existingDoc = await this.prisma.supplier.findFirst({
        where: { tenantId, document: dto.document },
      });

      if (existingDoc) {
        throw new HttpException(
          { error: 'SUPPLIER_DOCUMENT_EXISTS', message: `Supplier with document ${dto.document} already exists` },
          HttpStatus.CONFLICT,
        );
      }
    }

    return this.prisma.supplier.create({
      data: {
        tenantId,
        code: dto.code.toUpperCase(),
        name: dto.name,
        tradeName: dto.tradeName,
        document: dto.document,
        documentType: dto.documentType,
        email: dto.email,
        phone: dto.phone,
        website: dto.website,
        street: dto.street,
        number: dto.number,
        complement: dto.complement,
        neighborhood: dto.neighborhood,
        city: dto.city,
        state: dto.state,
        zipCode: dto.zipCode,
        country: dto.country ?? 'BR',
        categoryId: dto.categoryId,
        segmentId: dto.segmentId,
        status: 'ACTIVE',
        rating: dto.rating,
        notes: dto.notes,
        metadata: dto.metadata ?? {},
      },
    });
  }

  @Get()
  @ApiOperation({ summary: 'List suppliers' })
  async list(
    @Headers('x-tenant-id') tenantId: string,
    @Query('page') page = 1,
    @Query('size') size = 25,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('categoryId') categoryId?: string,
    @Query('segmentId') segmentId?: string,
  ): Promise<PaginatedResponse<any>> {
    const skip = (page - 1) * size;
    const where: any = { tenantId };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { tradeName: { contains: search, mode: 'insensitive' } },
        { code: { contains: search.toUpperCase(), mode: 'insensitive' } },
        { document: { contains: search } },
      ];
    }

    if (status) where.status = status;
    if (categoryId) where.categoryId = categoryId;
    if (segmentId) where.segmentId = segmentId;

    const [items, total] = await Promise.all([
      this.prisma.supplier.findMany({
        where,
        skip,
        take: Number(size),
        orderBy: [{ name: 'asc' }],
      }),
      this.prisma.supplier.count({ where }),
    ]);

    return { items, page: Number(page), size: Number(size), total };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get supplier by ID' })
  async getById(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string) {
    const supplier = await this.prisma.supplier.findFirst({ where: { id, tenantId } });
    if (!supplier) {
      throw new HttpException({ error: 'SUPPLIER_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    }
    return supplier;
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update supplier' })
  async update(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string, @Body() dto: any) {
    const existing = await this.prisma.supplier.findFirst({ where: { id, tenantId } });
    if (!existing) {
      throw new HttpException({ error: 'SUPPLIER_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    }

    // Check for duplicate document if changed
    if (dto.document && dto.document !== existing.document) {
      const existingDoc = await this.prisma.supplier.findFirst({
        where: { tenantId, document: dto.document, id: { not: id } },
      });

      if (existingDoc) {
        throw new HttpException(
          { error: 'SUPPLIER_DOCUMENT_EXISTS', message: `Supplier with document ${dto.document} already exists` },
          HttpStatus.CONFLICT,
        );
      }
    }

    return this.prisma.supplier.update({
      where: { id },
      data: {
        name: dto.name ?? existing.name,
        tradeName: dto.tradeName ?? existing.tradeName,
        document: dto.document ?? existing.document,
        documentType: dto.documentType ?? existing.documentType,
        email: dto.email ?? existing.email,
        phone: dto.phone ?? existing.phone,
        website: dto.website ?? existing.website,
        street: dto.street ?? existing.street,
        number: dto.number ?? existing.number,
        complement: dto.complement ?? existing.complement,
        neighborhood: dto.neighborhood ?? existing.neighborhood,
        city: dto.city ?? existing.city,
        state: dto.state ?? existing.state,
        zipCode: dto.zipCode ?? existing.zipCode,
        country: dto.country ?? existing.country,
        categoryId: dto.categoryId ?? existing.categoryId,
        segmentId: dto.segmentId ?? existing.segmentId,
        status: dto.status ?? existing.status,
        rating: dto.rating ?? existing.rating,
        notes: dto.notes ?? existing.notes,
        metadata: dto.metadata ?? existing.metadata,
      },
    });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete/deactivate supplier' })
  async delete(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string) {
    const existing = await this.prisma.supplier.findFirst({ where: { id, tenantId } });
    if (!existing) {
      throw new HttpException({ error: 'SUPPLIER_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    }

    // Soft delete - set to INACTIVE
    return this.prisma.supplier.update({
      where: { id },
      data: { status: 'INACTIVE' },
    });
  }
}

// ============================================
// CEP LOOKUP CONTROLLER
// ============================================

@ApiTags('Integrations')
@Controller('integrations')
export class IntegrationsController {
  @Get('cep/:cep')
  @ApiOperation({ summary: 'Lookup Brazilian CEP' })
  async lookupCep(@Param('cep') cep: string) {
    try {
      // Use ViaCEP API
      const cleanCep = cep.replace(/\D/g, '');
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();

      if (data.erro) {
        throw new HttpException({ error: 'CEP_NOT_FOUND' }, HttpStatus.NOT_FOUND);
      }

      return {
        zipCode: data.cep,
        street: data.logradouro,
        complement: data.complemento,
        neighborhood: data.bairro,
        city: data.localidade,
        state: data.uf,
        country: 'BR',
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException({ error: 'CEP_LOOKUP_FAILED' }, HttpStatus.SERVICE_UNAVAILABLE);
    }
  }
}

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

  // Transform database model to frontend format
  private transformSupplier(supplier: any): any {
    const metadata = (supplier.metadata as Record<string, any>) || {};

    return {
      ...supplier,
      supplierType: metadata.supplierType,
      legalName: supplier.tradeName,
      cnpj: supplier.document,
      stateRegistration: metadata.stateRegistration,
      municipalRegistration: metadata.municipalRegistration,
      profileDescription: metadata.profileDescription,
      address: {
        zip: supplier.zipCode,
        street: supplier.street,
        number: supplier.number,
        complement: supplier.complement,
        neighborhood: supplier.neighborhood,
        city: supplier.city,
        state: supplier.state,
        country: supplier.country,
      },
      contact: {
        manual: {
          name: metadata.contactName,
          email: supplier.email,
          phone: supplier.phone,
        },
      },
      pix: metadata.pix || {},
      bank: metadata.bank || {},
    };
  }

  @Post()
  @ApiOperation({ summary: 'Create a new supplier' })
  async create(@Headers('x-tenant-id') tenantId: string, @Body() dto: any) {
    // Support both frontend format (nested objects) and flat format
    const address = dto.address || {};
    const contact = dto.contact?.manual || {};

    // Map frontend fields to backend fields
    const document = dto.cnpj || dto.document;
    const tradeName = dto.legalName || dto.tradeName;
    const email = contact.email || dto.email;
    const phone = contact.phone || dto.phone;

    // Generate code from name if not provided
    const code = dto.code?.toUpperCase() ||
      dto.name.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase().substring(0, 15) + '_' + Date.now().toString(36).toUpperCase();

    // Check for duplicate code
    const existingCode = await this.prisma.supplier.findUnique({
      where: { tenantId_code: { tenantId, code } },
    });

    if (existingCode) {
      throw new HttpException(
        { error: 'SUPPLIER_CODE_EXISTS', message: `Supplier with code ${code} already exists` },
        HttpStatus.CONFLICT,
      );
    }

    // Check for duplicate document if provided
    if (document) {
      const existingDoc = await this.prisma.supplier.findFirst({
        where: { tenantId, document },
      });

      if (existingDoc) {
        throw new HttpException(
          { error: 'SUPPLIER_DOCUMENT_EXISTS', message: `Supplier with document ${document} already exists` },
          HttpStatus.CONFLICT,
        );
      }
    }

    // Build metadata with extra fields from frontend
    const metadata = {
      ...(dto.metadata || {}),
      pix: dto.pix,
      bank: dto.bank,
      stateRegistration: dto.stateRegistration,
      municipalRegistration: dto.municipalRegistration,
      contactName: contact.name,
    };

    return this.prisma.supplier.create({
      data: {
        tenantId,
        code,
        name: dto.name,
        tradeName,
        document,
        documentType: dto.documentType || (document?.length === 14 ? 'CNPJ' : 'CPF'),
        email,
        phone,
        website: dto.website,
        street: address.street || dto.street,
        number: address.number || dto.number,
        complement: address.complement || dto.complement,
        neighborhood: address.neighborhood || dto.neighborhood,
        city: address.city || dto.city,
        state: address.state || dto.state,
        zipCode: address.zipCode || dto.zipCode,
        country: address.country || dto.country || 'BR',
        categoryId: dto.categoryId,
        segmentId: dto.segmentId,
        status: 'ACTIVE',
        rating: dto.rating,
        notes: dto.notes,
        metadata,
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

    return {
      items: items.map(item => this.transformSupplier(item)),
      page: Number(page),
      size: Number(size),
      total
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get supplier by ID' })
  async getById(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string) {
    const supplier = await this.prisma.supplier.findFirst({ where: { id, tenantId } });
    if (!supplier) {
      throw new HttpException({ error: 'SUPPLIER_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    }
    return this.transformSupplier(supplier);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update supplier' })
  async update(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string, @Body() dto: any) {
    const existing = await this.prisma.supplier.findFirst({ where: { id, tenantId } });
    if (!existing) {
      throw new HttpException({ error: 'SUPPLIER_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    }

    // Support both frontend format (nested objects) and flat format
    const address = dto.address || {};
    const contact = dto.contact?.manual || {};

    // Map frontend fields to backend fields - use !== undefined to allow clearing
    const document = dto.cnpj !== undefined ? dto.cnpj : (dto.document !== undefined ? dto.document : existing.document);
    const tradeName = dto.legalName !== undefined ? dto.legalName : (dto.tradeName !== undefined ? dto.tradeName : existing.tradeName);
    const email = contact.email !== undefined ? contact.email : (dto.email !== undefined ? dto.email : existing.email);
    const phone = contact.phone !== undefined ? contact.phone : (dto.phone !== undefined ? dto.phone : existing.phone);

    // Check for duplicate document if changed
    if (document && document !== existing.document) {
      const existingDoc = await this.prisma.supplier.findFirst({
        where: { tenantId, document, id: { not: id } },
      });

      if (existingDoc) {
        throw new HttpException(
          { error: 'SUPPLIER_DOCUMENT_EXISTS', message: `Supplier with document ${document} already exists` },
          HttpStatus.CONFLICT,
        );
      }
    }

    // Merge metadata with extra fields from frontend
    const existingMeta = (existing.metadata as Record<string, any>) || {};
    const metadata = {
      ...existingMeta,
      ...(dto.metadata || {}),
      ...(dto.pix !== undefined && { pix: dto.pix }),
      ...(dto.bank !== undefined && { bank: dto.bank }),
      ...(dto.stateRegistration !== undefined && { stateRegistration: dto.stateRegistration }),
      ...(dto.municipalRegistration !== undefined && { municipalRegistration: dto.municipalRegistration }),
      ...(dto.profileDescription !== undefined && { profileDescription: dto.profileDescription }),
      ...(dto.supplierType !== undefined && { supplierType: dto.supplierType }),
      ...(contact.name !== undefined && { contactName: contact.name }),
    };

    return this.prisma.supplier.update({
      where: { id },
      data: {
        name: dto.name ?? existing.name,
        tradeName,
        document,
        documentType: dto.documentType ?? existing.documentType,
        email,
        phone,
        website: dto.website ?? existing.website,
        street: address.street !== undefined ? address.street : (dto.street !== undefined ? dto.street : existing.street),
        number: address.number !== undefined ? address.number : (dto.number !== undefined ? dto.number : existing.number),
        complement: address.complement !== undefined ? address.complement : (dto.complement !== undefined ? dto.complement : existing.complement),
        neighborhood: address.neighborhood !== undefined ? address.neighborhood : (dto.neighborhood !== undefined ? dto.neighborhood : existing.neighborhood),
        city: address.city !== undefined ? address.city : (dto.city !== undefined ? dto.city : existing.city),
        state: address.state !== undefined ? address.state : (dto.state !== undefined ? dto.state : existing.state),
        zipCode: address.zip !== undefined ? address.zip : (dto.zipCode !== undefined ? dto.zipCode : existing.zipCode),
        country: address.country !== undefined ? address.country : (dto.country !== undefined ? dto.country : existing.country),
        categoryId: dto.categoryId ?? existing.categoryId,
        segmentId: dto.segmentId ?? existing.segmentId,
        status: dto.status ?? existing.status,
        rating: dto.rating ?? existing.rating,
        notes: dto.notes ?? existing.notes,
        metadata,
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

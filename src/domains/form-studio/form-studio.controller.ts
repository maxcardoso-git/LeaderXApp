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
import { randomBytes } from 'crypto';

// ============================================
// DTOs & Types
// ============================================

class PaginatedResponse<T> {
  items: T[];
  page: number;
  size: number;
  total: number;
}

// ============================================
// FORMS CONTROLLER
// ============================================

@ApiTags('Form Studio - Forms')
@Controller('form-studio/forms')
@ApiHeader({ name: 'X-Tenant-Id', required: true })
export class FormsController {
  constructor(private readonly prisma: PrismaService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new form' })
  async create(@Headers('x-tenant-id') tenantId: string, @Body() dto: any) {
    // Generate a unique formId
    const formId = `form_${Date.now()}_${randomBytes(4).toString('hex')}`;

    return this.prisma.dataEntryForm.create({
      data: {
        tenantId,
        formId,
        name: dto.name,
        description: dto.description || null,
        entityType: dto.entityType || null,
        entityId: dto.entityId || null,
        version: '1.0.0',
        status: 'DRAFT',
        layout: dto.layout || {},
        fields: dto.fields || [],
        validationRules: dto.validationRules || null,
        metadata: dto.metadata || {},
      },
    });
  }

  @Get()
  @ApiOperation({ summary: 'List forms' })
  async list(
    @Headers('x-tenant-id') tenantId: string,
    @Query('page') page = 1,
    @Query('size') size = 25,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('entityType') entityType?: string,
  ): Promise<PaginatedResponse<any>> {
    const skip = (page - 1) * size;
    const where: any = { tenantId };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { formId: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) where.status = status;
    if (entityType) where.entityType = entityType;

    const [items, total] = await Promise.all([
      this.prisma.dataEntryForm.findMany({
        where,
        skip,
        take: Number(size),
        orderBy: [{ updatedAt: 'desc' }],
        include: {
          _count: {
            select: { submissions: true, versions: true },
          },
        },
      }),
      this.prisma.dataEntryForm.count({ where }),
    ]);

    return { items, page: Number(page), size: Number(size), total };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get form by ID' })
  async getById(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string) {
    const form = await this.prisma.dataEntryForm.findFirst({
      where: { id, tenantId },
      include: {
        _count: {
          select: { submissions: true, versions: true },
        },
      },
    });
    if (!form) throw new HttpException({ error: 'FORM_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    return form;
  }

  @Get('by-form-id/:formId')
  @ApiOperation({ summary: 'Get form by formId' })
  async getByFormId(@Headers('x-tenant-id') tenantId: string, @Param('formId') formId: string) {
    const form = await this.prisma.dataEntryForm.findFirst({
      where: { formId, tenantId },
      include: {
        _count: {
          select: { submissions: true, versions: true },
        },
      },
    });
    if (!form) throw new HttpException({ error: 'FORM_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    return form;
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update form' })
  async update(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string, @Body() dto: any) {
    const existing = await this.prisma.dataEntryForm.findFirst({ where: { id, tenantId } });
    if (!existing) throw new HttpException({ error: 'FORM_NOT_FOUND' }, HttpStatus.NOT_FOUND);

    // Only DRAFT forms can be edited directly
    if (existing.status !== 'DRAFT' && existing.status !== 'TESTING') {
      throw new HttpException(
        { error: 'FORM_NOT_EDITABLE', message: 'Only draft or testing forms can be edited' },
        HttpStatus.BAD_REQUEST,
      );
    }

    return this.prisma.dataEntryForm.update({
      where: { id },
      data: {
        name: dto.name ?? existing.name,
        description: dto.description !== undefined ? dto.description : existing.description,
        entityType: dto.entityType !== undefined ? dto.entityType : existing.entityType,
        entityId: dto.entityId !== undefined ? dto.entityId : existing.entityId,
        layout: dto.layout ?? existing.layout,
        fields: dto.fields ?? existing.fields,
        validationRules: dto.validationRules !== undefined ? dto.validationRules : existing.validationRules,
        metadata: dto.metadata ?? existing.metadata,
      },
    });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete form' })
  async delete(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string) {
    const existing = await this.prisma.dataEntryForm.findFirst({ where: { id, tenantId } });
    if (!existing) throw new HttpException({ error: 'FORM_NOT_FOUND' }, HttpStatus.NOT_FOUND);

    // Check for submissions
    const submissionsCount = await this.prisma.formSubmission.count({ where: { formId: id } });
    if (submissionsCount > 0) {
      throw new HttpException(
        { error: 'FORM_HAS_SUBMISSIONS', message: `Form has ${submissionsCount} submission(s). Archive instead.` },
        HttpStatus.BAD_REQUEST,
      );
    }

    await this.prisma.dataEntryForm.delete({ where: { id } });
    return existing;
  }

  // ============================================
  // PUBLISHING LIFECYCLE
  // ============================================

  @Post(':id/publish')
  @ApiOperation({ summary: 'Publish form' })
  async publish(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Body() dto: { changelog?: string; publishedBy?: string },
  ) {
    const form = await this.prisma.dataEntryForm.findFirst({ where: { id, tenantId } });
    if (!form) throw new HttpException({ error: 'FORM_NOT_FOUND' }, HttpStatus.NOT_FOUND);

    if (form.status === 'PUBLISHED') {
      throw new HttpException({ error: 'FORM_ALREADY_PUBLISHED' }, HttpStatus.BAD_REQUEST);
    }

    // Create version snapshot
    await this.prisma.formVersion.create({
      data: {
        tenantId,
        formId: id,
        version: form.version,
        schema: { fields: form.fields, layout: form.layout, validationRules: form.validationRules },
        changelog: dto.changelog || null,
        publishedBy: dto.publishedBy || 'system',
      },
    });

    // Update form status
    return this.prisma.dataEntryForm.update({
      where: { id },
      data: {
        status: 'PUBLISHED',
        publishedAt: new Date(),
        publishedBy: dto.publishedBy || 'system',
      },
    });
  }

  @Post(':id/unpublish')
  @ApiOperation({ summary: 'Unpublish form (back to testing)' })
  async unpublish(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string) {
    const form = await this.prisma.dataEntryForm.findFirst({ where: { id, tenantId } });
    if (!form) throw new HttpException({ error: 'FORM_NOT_FOUND' }, HttpStatus.NOT_FOUND);

    if (form.status !== 'PUBLISHED') {
      throw new HttpException({ error: 'FORM_NOT_PUBLISHED' }, HttpStatus.BAD_REQUEST);
    }

    return this.prisma.dataEntryForm.update({
      where: { id },
      data: { status: 'TESTING' },
    });
  }

  @Post(':id/deprecate')
  @ApiOperation({ summary: 'Deprecate form' })
  async deprecate(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string) {
    const form = await this.prisma.dataEntryForm.findFirst({ where: { id, tenantId } });
    if (!form) throw new HttpException({ error: 'FORM_NOT_FOUND' }, HttpStatus.NOT_FOUND);

    return this.prisma.dataEntryForm.update({
      where: { id },
      data: { status: 'DEPRECATED' },
    });
  }

  @Post(':id/new-version')
  @ApiOperation({ summary: 'Create new version from published form' })
  async createNewVersion(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string) {
    const form = await this.prisma.dataEntryForm.findFirst({ where: { id, tenantId } });
    if (!form) throw new HttpException({ error: 'FORM_NOT_FOUND' }, HttpStatus.NOT_FOUND);

    if (form.status !== 'PUBLISHED' && form.status !== 'DEPRECATED') {
      throw new HttpException(
        { error: 'FORM_NOT_PUBLISHED', message: 'Can only create new version from published or deprecated forms' },
        HttpStatus.BAD_REQUEST,
      );
    }

    // Increment version
    const versionParts = form.version.split('.').map(Number);
    versionParts[2] = (versionParts[2] || 0) + 1;
    const newVersion = versionParts.join('.');

    return this.prisma.dataEntryForm.update({
      where: { id },
      data: {
        version: newVersion,
        status: 'DRAFT',
        publishedAt: null,
        publishedBy: null,
      },
    });
  }

  @Post(':id/test-status')
  @ApiOperation({ summary: 'Move form to testing status' })
  async setTestingStatus(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string) {
    const form = await this.prisma.dataEntryForm.findFirst({ where: { id, tenantId } });
    if (!form) throw new HttpException({ error: 'FORM_NOT_FOUND' }, HttpStatus.NOT_FOUND);

    if (form.status !== 'DRAFT') {
      throw new HttpException({ error: 'FORM_NOT_DRAFT' }, HttpStatus.BAD_REQUEST);
    }

    return this.prisma.dataEntryForm.update({
      where: { id },
      data: { status: 'TESTING' },
    });
  }

  // ============================================
  // VERSIONS
  // ============================================

  @Get(':id/versions')
  @ApiOperation({ summary: 'Get form versions' })
  async getVersions(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string) {
    const form = await this.prisma.dataEntryForm.findFirst({ where: { id, tenantId } });
    if (!form) throw new HttpException({ error: 'FORM_NOT_FOUND' }, HttpStatus.NOT_FOUND);

    return this.prisma.formVersion.findMany({
      where: { formId: id },
      orderBy: { publishedAt: 'desc' },
    });
  }

  // ============================================
  // SUBMISSIONS
  // ============================================

  @Post(':id/submit')
  @ApiOperation({ summary: 'Submit form data' })
  async submit(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Body() dto: { data: any; entityType?: string; entityId?: string; submittedBy?: string },
  ) {
    const form = await this.prisma.dataEntryForm.findFirst({ where: { id, tenantId } });
    if (!form) throw new HttpException({ error: 'FORM_NOT_FOUND' }, HttpStatus.NOT_FOUND);

    if (form.status !== 'PUBLISHED' && form.status !== 'TESTING') {
      throw new HttpException(
        { error: 'FORM_NOT_ACCEPTING_SUBMISSIONS', message: 'Form must be published or in testing to accept submissions' },
        HttpStatus.BAD_REQUEST,
      );
    }

    // Validate submitted data
    const validationErrors = this.validateFormData(form.fields as any[], dto.data);

    return this.prisma.formSubmission.create({
      data: {
        tenantId,
        formId: id,
        formVersion: form.version,
        entityType: dto.entityType || form.entityType,
        entityId: dto.entityId || form.entityId,
        data: dto.data,
        status: validationErrors.length > 0 ? 'error' : 'validated',
        validationErrors: validationErrors.length > 0 ? validationErrors : undefined,
        submittedBy: dto.submittedBy,
      },
    });
  }

  @Post(':id/test')
  @ApiOperation({ summary: 'Test form submission (validate without persisting)' })
  async test(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Body() dto: { data: any },
  ) {
    const form = await this.prisma.dataEntryForm.findFirst({ where: { id, tenantId } });
    if (!form) throw new HttpException({ error: 'FORM_NOT_FOUND' }, HttpStatus.NOT_FOUND);

    const validationErrors = this.validateFormData(form.fields as any[], dto.data);

    return {
      valid: validationErrors.length === 0,
      errors: validationErrors,
      data: dto.data,
    };
  }

  @Get(':id/submissions')
  @ApiOperation({ summary: 'Get form submissions' })
  async getSubmissions(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Query('page') page = 1,
    @Query('size') size = 20,
    @Query('status') status?: string,
  ): Promise<PaginatedResponse<any>> {
    const form = await this.prisma.dataEntryForm.findFirst({ where: { id, tenantId } });
    if (!form) throw new HttpException({ error: 'FORM_NOT_FOUND' }, HttpStatus.NOT_FOUND);

    const skip = (page - 1) * size;
    const where: any = { formId: id };
    if (status) where.status = status;

    const [items, total] = await Promise.all([
      this.prisma.formSubmission.findMany({
        where,
        skip,
        take: Number(size),
        orderBy: { submittedAt: 'desc' },
      }),
      this.prisma.formSubmission.count({ where }),
    ]);

    return { items, page: Number(page), size: Number(size), total };
  }

  @Get(':id/submissions/:submissionId')
  @ApiOperation({ summary: 'Get submission by ID' })
  async getSubmissionById(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Param('submissionId') submissionId: string,
  ) {
    const submission = await this.prisma.formSubmission.findFirst({
      where: { id: submissionId, formId: id, tenantId },
    });
    if (!submission) throw new HttpException({ error: 'SUBMISSION_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    return submission;
  }

  @Put(':id/submissions/:submissionId/process')
  @ApiOperation({ summary: 'Mark submission as processed' })
  async processSubmission(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Param('submissionId') submissionId: string,
  ) {
    const submission = await this.prisma.formSubmission.findFirst({
      where: { id: submissionId, formId: id, tenantId },
    });
    if (!submission) throw new HttpException({ error: 'SUBMISSION_NOT_FOUND' }, HttpStatus.NOT_FOUND);

    return this.prisma.formSubmission.update({
      where: { id: submissionId },
      data: {
        status: 'processed',
        processedAt: new Date(),
      },
    });
  }

  // ============================================
  // SCHEMA (for external consumers/AI)
  // ============================================

  @Get(':id/schema')
  @ApiOperation({ summary: 'Get form schema (AI-consumable format)' })
  async getSchema(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string) {
    const form = await this.prisma.dataEntryForm.findFirst({ where: { id, tenantId } });
    if (!form) throw new HttpException({ error: 'FORM_NOT_FOUND' }, HttpStatus.NOT_FOUND);

    const fields = form.fields as any[];

    return {
      formId: form.formId,
      name: form.name,
      description: form.description,
      version: form.version,
      status: form.status,
      entityType: form.entityType,
      fields: fields.map((f) => ({
        name: f.name,
        label: f.label,
        type: f.type,
        required: f.required || false,
        description: f.description,
        options: f.options,
        validationRules: f.validationRules,
      })),
    };
  }

  // ============================================
  // DUPLICATE
  // ============================================

  @Post(':id/duplicate')
  @ApiOperation({ summary: 'Duplicate form' })
  async duplicate(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Body() dto: { name?: string },
  ) {
    const form = await this.prisma.dataEntryForm.findFirst({ where: { id, tenantId } });
    if (!form) throw new HttpException({ error: 'FORM_NOT_FOUND' }, HttpStatus.NOT_FOUND);

    const newFormId = `form_${Date.now()}_${randomBytes(4).toString('hex')}`;

    return this.prisma.dataEntryForm.create({
      data: {
        tenantId,
        formId: newFormId,
        name: dto.name || `${form.name} (Copy)`,
        description: form.description,
        entityType: form.entityType,
        entityId: null, // Don't duplicate entity binding
        version: '1.0.0',
        status: 'DRAFT',
        layout: form.layout || {},
        fields: form.fields || [],
        validationRules: form.validationRules || undefined,
        metadata: form.metadata || {},
      },
    });
  }

  // ============================================
  // VALIDATION HELPER
  // ============================================

  private validateFormData(fields: any[], data: any): any[] {
    const errors: any[] = [];

    for (const field of fields) {
      if (field.type === 'section') continue;

      const value = data[field.name];

      // Required validation
      if (field.required && (value === undefined || value === null || value === '')) {
        errors.push({
          field: field.name,
          rule: 'required',
          message: `${field.label || field.name} is required`,
        });
        continue;
      }

      if (value === undefined || value === null || value === '') continue;

      // Type-specific validations
      switch (field.type) {
        case 'email':
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
            errors.push({
              field: field.name,
              rule: 'email',
              message: `${field.label || field.name} must be a valid email`,
            });
          }
          break;

        case 'phone':
          if (!/^[\d\s\-\(\)\+]+$/.test(value)) {
            errors.push({
              field: field.name,
              rule: 'phone',
              message: `${field.label || field.name} must be a valid phone number`,
            });
          }
          break;

        case 'number':
          if (typeof value !== 'number' && isNaN(Number(value))) {
            errors.push({
              field: field.name,
              rule: 'number',
              message: `${field.label || field.name} must be a number`,
            });
          } else {
            const num = Number(value);
            if (field.min !== undefined && num < field.min) {
              errors.push({
                field: field.name,
                rule: 'min',
                message: `${field.label || field.name} must be at least ${field.min}`,
              });
            }
            if (field.max !== undefined && num > field.max) {
              errors.push({
                field: field.name,
                rule: 'max',
                message: `${field.label || field.name} must be at most ${field.max}`,
              });
            }
          }
          break;

        case 'text':
        case 'textarea':
          if (field.minLength && value.length < field.minLength) {
            errors.push({
              field: field.name,
              rule: 'minLength',
              message: `${field.label || field.name} must be at least ${field.minLength} characters`,
            });
          }
          if (field.maxLength && value.length > field.maxLength) {
            errors.push({
              field: field.name,
              rule: 'maxLength',
              message: `${field.label || field.name} must be at most ${field.maxLength} characters`,
            });
          }
          break;

        case 'select':
        case 'radio':
          if (field.options && Array.isArray(field.options)) {
            const validValues = field.options.map((o: any) => o.value);
            const valuesToCheck = Array.isArray(value) ? value : [value];
            for (const v of valuesToCheck) {
              if (!validValues.includes(v)) {
                errors.push({
                  field: field.name,
                  rule: 'options',
                  message: `Invalid option for ${field.label || field.name}`,
                });
                break;
              }
            }
          }
          break;
      }

      // Pattern validation (custom regex)
      if (field.pattern && typeof value === 'string') {
        try {
          const regex = new RegExp(field.pattern);
          if (!regex.test(value)) {
            errors.push({
              field: field.name,
              rule: 'pattern',
              message: field.patternMessage || `${field.label || field.name} has invalid format`,
            });
          }
        } catch (e) {
          // Invalid regex pattern, skip
        }
      }
    }

    return errors;
  }
}

// ============================================
// FIELD TYPES CONTROLLER
// ============================================

@ApiTags('Form Studio - Field Types')
@Controller('form-studio/field-types')
@ApiHeader({ name: 'X-Tenant-Id', required: true })
export class FieldTypesController {
  @Get()
  @ApiOperation({ summary: 'Get available field types' })
  async list() {
    return [
      {
        type: 'section',
        label: 'Section',
        icon: 'LayoutList',
        description: 'Group fields into sections',
        defaultConfig: { title: 'New Section', description: '', collapsible: false },
      },
      {
        type: 'text',
        label: 'Text',
        icon: 'Type',
        description: 'Single line text input',
        defaultConfig: { placeholder: '', maxLength: 255, minLength: 0 },
      },
      {
        type: 'textarea',
        label: 'Long Text',
        icon: 'AlignLeft',
        description: 'Multi-line text input',
        defaultConfig: { rows: 4, maxLength: 5000 },
      },
      {
        type: 'number',
        label: 'Number',
        icon: 'Hash',
        description: 'Numeric input',
        defaultConfig: { min: null, max: null, step: 1, decimals: 0 },
      },
      {
        type: 'email',
        label: 'Email',
        icon: 'Mail',
        description: 'Email address input',
        defaultConfig: { validateFormat: true },
      },
      {
        type: 'phone',
        label: 'Phone',
        icon: 'Phone',
        description: 'Phone number input',
        defaultConfig: { format: 'BR', mask: true },
      },
      {
        type: 'date',
        label: 'Date',
        icon: 'Calendar',
        description: 'Date picker',
        defaultConfig: { format: 'YYYY-MM-DD', minDate: null, maxDate: null },
      },
      {
        type: 'datetime',
        label: 'Date & Time',
        icon: 'Clock',
        description: 'Date and time picker',
        defaultConfig: { format: 'YYYY-MM-DD HH:mm', timezone: 'America/Sao_Paulo' },
      },
      {
        type: 'checkbox',
        label: 'Checkbox',
        icon: 'CheckSquare',
        description: 'Boolean checkbox',
        defaultConfig: { defaultValue: false },
      },
      {
        type: 'radio',
        label: 'Radio',
        icon: 'Circle',
        description: 'Single choice from options',
        defaultConfig: { options: [], layout: 'vertical' },
      },
      {
        type: 'select',
        label: 'Select',
        icon: 'ChevronDown',
        description: 'Dropdown selection',
        defaultConfig: { options: [], multiple: false, searchable: false },
      },
      {
        type: 'switch',
        label: 'Toggle',
        icon: 'ToggleLeft',
        description: 'On/Off toggle switch',
        defaultConfig: { defaultValue: false, labelOn: 'Yes', labelOff: 'No' },
      },
      {
        type: 'hidden',
        label: 'Hidden',
        icon: 'EyeOff',
        description: 'Hidden field (not visible to user)',
        defaultConfig: { defaultValue: '' },
      },
    ];
  }
}

// ============================================
// DATA SOURCES CONTROLLER
// ============================================

@ApiTags('Form Studio - Data Sources')
@Controller('form-studio/data-sources')
@ApiHeader({ name: 'X-Tenant-Id', required: true })
export class DataSourcesController {
  constructor(private readonly prisma: PrismaService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new data source' })
  async create(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: { name: string; description?: string; formDefinitionId?: string; lookupFieldId?: string },
  ) {
    // If formDefinitionId is provided, verify it exists and is not already connected
    if (dto.formDefinitionId) {
      const form = await this.prisma.dataEntryForm.findFirst({
        where: { id: dto.formDefinitionId, tenantId },
      });
      if (!form) {
        throw new HttpException({ error: 'FORM_NOT_FOUND' }, HttpStatus.NOT_FOUND);
      }

      // Check if form is already connected to another data source
      const existingConnection = await this.prisma.formDataSource.findFirst({
        where: { formDefinitionId: dto.formDefinitionId, tenantId },
      });
      if (existingConnection) {
        throw new HttpException(
          { error: 'FORM_ALREADY_CONNECTED', message: 'This form is already connected to another data source' },
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    return this.prisma.formDataSource.create({
      data: {
        tenantId,
        name: dto.name,
        description: dto.description || null,
        formDefinitionId: dto.formDefinitionId || null,
        lookupFieldId: dto.lookupFieldId || null,
      },
      include: {
        _count: { select: { entries: true } },
      },
    });
  }

  @Get()
  @ApiOperation({ summary: 'List data sources' })
  async list(
    @Headers('x-tenant-id') tenantId: string,
    @Query('page') page = 1,
    @Query('size') size = 25,
    @Query('search') search?: string,
  ): Promise<PaginatedResponse<any>> {
    const skip = (page - 1) * size;
    const where: any = { tenantId };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.formDataSource.findMany({
        where,
        skip,
        take: Number(size),
        orderBy: [{ updatedAt: 'desc' }],
        include: {
          _count: { select: { entries: true } },
        },
      }),
      this.prisma.formDataSource.count({ where }),
    ]);

    // Fetch connected form info for each data source
    const formIds = items.map((ds) => ds.formDefinitionId).filter(Boolean) as string[];
    const forms = formIds.length > 0
      ? await this.prisma.dataEntryForm.findMany({
          where: { id: { in: formIds } },
          select: { id: true, formId: true, name: true },
        })
      : [];

    const formsMap = new Map(forms.map((f) => [f.id, f]));

    const enrichedItems = items.map((ds) => ({
      ...ds,
      entryCount: ds._count.entries,
      form: ds.formDefinitionId ? formsMap.get(ds.formDefinitionId) || null : null,
    }));

    return { items: enrichedItems, page: Number(page), size: Number(size), total };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get data source by ID' })
  async getById(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string) {
    const dataSource = await this.prisma.formDataSource.findFirst({
      where: { id, tenantId },
      include: {
        _count: { select: { entries: true } },
      },
    });
    if (!dataSource) {
      throw new HttpException({ error: 'DATA_SOURCE_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    }

    // Get connected form info
    let form = null;
    if (dataSource.formDefinitionId) {
      form = await this.prisma.dataEntryForm.findFirst({
        where: { id: dataSource.formDefinitionId },
        select: { id: true, formId: true, name: true },
      });
    }

    return {
      ...dataSource,
      entryCount: dataSource._count.entries,
      form,
    };
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update data source' })
  async update(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Body() dto: { name?: string; description?: string; formDefinitionId?: string; lookupFieldId?: string },
  ) {
    const existing = await this.prisma.formDataSource.findFirst({ where: { id, tenantId } });
    if (!existing) {
      throw new HttpException({ error: 'DATA_SOURCE_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    }

    // If changing formDefinitionId, verify new form exists and is not connected elsewhere
    if (dto.formDefinitionId !== undefined && dto.formDefinitionId !== existing.formDefinitionId) {
      if (dto.formDefinitionId) {
        const form = await this.prisma.dataEntryForm.findFirst({
          where: { id: dto.formDefinitionId, tenantId },
        });
        if (!form) {
          throw new HttpException({ error: 'FORM_NOT_FOUND' }, HttpStatus.NOT_FOUND);
        }

        const existingConnection = await this.prisma.formDataSource.findFirst({
          where: { formDefinitionId: dto.formDefinitionId, tenantId, NOT: { id } },
        });
        if (existingConnection) {
          throw new HttpException(
            { error: 'FORM_ALREADY_CONNECTED', message: 'This form is already connected to another data source' },
            HttpStatus.BAD_REQUEST,
          );
        }
      }
    }

    const updated = await this.prisma.formDataSource.update({
      where: { id },
      data: {
        name: dto.name ?? existing.name,
        description: dto.description !== undefined ? dto.description : existing.description,
        formDefinitionId: dto.formDefinitionId !== undefined ? (dto.formDefinitionId || null) : existing.formDefinitionId,
        lookupFieldId: dto.lookupFieldId !== undefined ? (dto.lookupFieldId || null) : existing.lookupFieldId,
      },
      include: {
        _count: { select: { entries: true } },
      },
    });

    // Get connected form info
    let form = null;
    if (updated.formDefinitionId) {
      form = await this.prisma.dataEntryForm.findFirst({
        where: { id: updated.formDefinitionId },
        select: { id: true, formId: true, name: true },
      });
    }

    return {
      ...updated,
      entryCount: updated._count.entries,
      form,
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete data source' })
  async delete(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string) {
    const existing = await this.prisma.formDataSource.findFirst({
      where: { id, tenantId },
      include: { _count: { select: { entries: true } } },
    });
    if (!existing) {
      throw new HttpException({ error: 'DATA_SOURCE_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    }

    // Check for entries
    if (existing._count.entries > 0) {
      throw new HttpException(
        { error: 'DATA_SOURCE_HAS_ENTRIES', message: `Data source has ${existing._count.entries} entry(ies). Delete entries first.` },
        HttpStatus.BAD_REQUEST,
      );
    }

    await this.prisma.formDataSource.delete({ where: { id } });
    return existing;
  }

  // ============================================
  // ENTRIES ENDPOINTS
  // ============================================

  @Get(':id/entries')
  @ApiOperation({ summary: 'Get entries for a data source' })
  async getEntries(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Query('page') page = 1,
    @Query('size') size = 20,
  ): Promise<PaginatedResponse<any>> {
    const dataSource = await this.prisma.formDataSource.findFirst({ where: { id, tenantId } });
    if (!dataSource) {
      throw new HttpException({ error: 'DATA_SOURCE_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    }

    const skip = (page - 1) * size;
    const where = { dataSourceId: id };

    const [items, total] = await Promise.all([
      this.prisma.formDataSourceEntry.findMany({
        where,
        skip,
        take: Number(size),
        orderBy: [{ submittedAt: 'desc' }],
      }),
      this.prisma.formDataSourceEntry.count({ where }),
    ]);

    return { items, page: Number(page), size: Number(size), total };
  }

  @Get(':id/entries/search')
  @ApiOperation({ summary: 'Search entries by field value' })
  async searchEntries(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Query('field') field: string,
    @Query('value') value: string,
    @Query('page') page = 1,
    @Query('size') size = 20,
  ): Promise<PaginatedResponse<any>> {
    const dataSource = await this.prisma.formDataSource.findFirst({ where: { id, tenantId } });
    if (!dataSource) {
      throw new HttpException({ error: 'DATA_SOURCE_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    }

    if (!field || !value) {
      throw new HttpException({ error: 'FIELD_AND_VALUE_REQUIRED' }, HttpStatus.BAD_REQUEST);
    }

    // Search in JSON data field using Prisma's JSON filtering
    const skip = (page - 1) * size;

    // Get all entries and filter in memory (Prisma JSON contains search)
    const allEntries = await this.prisma.formDataSourceEntry.findMany({
      where: { dataSourceId: id, tenantId },
      orderBy: [{ submittedAt: 'desc' }],
    });

    // Filter entries where data[field] contains value (case-insensitive)
    const filteredEntries = allEntries.filter((entry) => {
      const data = entry.data as Record<string, unknown>;
      const fieldValue = data[field];
      if (fieldValue === undefined || fieldValue === null) return false;
      return String(fieldValue).toLowerCase().includes(value.toLowerCase());
    });

    const total = filteredEntries.length;
    const items = filteredEntries.slice(skip, skip + Number(size));

    return { items, page: Number(page), size: Number(size), total };
  }

  @Get(':id/entries/:entryId')
  @ApiOperation({ summary: 'Get entry by ID' })
  async getEntryById(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Param('entryId') entryId: string,
  ) {
    const entry = await this.prisma.formDataSourceEntry.findFirst({
      where: { id: entryId, dataSourceId: id, tenantId },
    });
    if (!entry) {
      throw new HttpException({ error: 'ENTRY_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    }
    return entry;
  }

  @Post(':id/entries')
  @ApiOperation({ summary: 'Create entry in data source' })
  async createEntry(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Body() dto: { data: any; submittedBy?: string; submittedByName?: string },
  ) {
    const dataSource = await this.prisma.formDataSource.findFirst({ where: { id, tenantId } });
    if (!dataSource) {
      throw new HttpException({ error: 'DATA_SOURCE_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    }

    if (!dataSource.formDefinitionId) {
      throw new HttpException(
        { error: 'NO_FORM_CONNECTED', message: 'Data source has no form connected' },
        HttpStatus.BAD_REQUEST,
      );
    }

    // Get form to get current version
    const form = await this.prisma.dataEntryForm.findFirst({
      where: { id: dataSource.formDefinitionId },
    });
    if (!form) {
      throw new HttpException({ error: 'FORM_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    }

    return this.prisma.formDataSourceEntry.create({
      data: {
        tenantId,
        dataSourceId: id,
        formDefinitionId: dataSource.formDefinitionId,
        formVersion: form.version,
        data: dto.data,
        submittedBy: dto.submittedBy || null,
        submittedByName: dto.submittedByName || null,
      },
    });
  }

  @Put(':id/entries/:entryId')
  @ApiOperation({ summary: 'Update entry in data source' })
  async updateEntry(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Param('entryId') entryId: string,
    @Body() dto: { data: any; submittedBy?: string; submittedByName?: string },
  ) {
    const entry = await this.prisma.formDataSourceEntry.findFirst({
      where: { id: entryId, dataSourceId: id, tenantId },
    });
    if (!entry) {
      throw new HttpException({ error: 'ENTRY_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    }

    return this.prisma.formDataSourceEntry.update({
      where: { id: entryId },
      data: {
        data: dto.data,
        submittedBy: dto.submittedBy ?? entry.submittedBy,
        submittedByName: dto.submittedByName ?? entry.submittedByName,
      },
    });
  }

  @Delete(':id/entries/:entryId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete entry' })
  async deleteEntry(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Param('entryId') entryId: string,
  ) {
    const entry = await this.prisma.formDataSourceEntry.findFirst({
      where: { id: entryId, dataSourceId: id, tenantId },
    });
    if (!entry) {
      throw new HttpException({ error: 'ENTRY_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    }

    await this.prisma.formDataSourceEntry.delete({ where: { id: entryId } });
    return entry;
  }
}

// ============================================
// VIEWS CONTROLLER
// ============================================

@ApiTags('Form Studio - Views')
@Controller('form-studio/views')
@ApiHeader({ name: 'X-Tenant-Id', required: true })
export class ViewsController {
  constructor(private readonly prisma: PrismaService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new view' })
  async create(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: { name: string; description?: string; config: any; createdBy?: string },
  ) {
    return this.prisma.formDataView.create({
      data: {
        tenantId,
        name: dto.name,
        description: dto.description || null,
        config: dto.config,
        createdBy: dto.createdBy || null,
      },
    });
  }

  @Get()
  @ApiOperation({ summary: 'List views' })
  async list(
    @Headers('x-tenant-id') tenantId: string,
    @Query('page') page = 1,
    @Query('size') size = 25,
    @Query('search') search?: string,
  ): Promise<PaginatedResponse<any>> {
    const skip = (page - 1) * size;
    const where: any = { tenantId };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.formDataView.findMany({
        where,
        skip,
        take: Number(size),
        orderBy: [{ updatedAt: 'desc' }],
      }),
      this.prisma.formDataView.count({ where }),
    ]);

    return { items, page: Number(page), size: Number(size), total };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get view by ID' })
  async getById(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string) {
    const view = await this.prisma.formDataView.findFirst({
      where: { id, tenantId },
    });
    if (!view) {
      throw new HttpException({ error: 'VIEW_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    }
    return view;
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update view' })
  async update(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Body() dto: { name?: string; description?: string; config?: any },
  ) {
    const existing = await this.prisma.formDataView.findFirst({ where: { id, tenantId } });
    if (!existing) {
      throw new HttpException({ error: 'VIEW_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    }

    return this.prisma.formDataView.update({
      where: { id },
      data: {
        name: dto.name ?? existing.name,
        description: dto.description !== undefined ? dto.description : existing.description,
        config: dto.config ?? existing.config,
      },
    });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete view' })
  async delete(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string) {
    const existing = await this.prisma.formDataView.findFirst({ where: { id, tenantId } });
    if (!existing) {
      throw new HttpException({ error: 'VIEW_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    }

    await this.prisma.formDataView.delete({ where: { id } });
    return existing;
  }

  @Post(':id/execute')
  @ApiOperation({ summary: 'Execute view query' })
  async execute(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Query('page') page = 1,
    @Query('size') size = 50,
  ): Promise<PaginatedResponse<any>> {
    const view = await this.prisma.formDataView.findFirst({ where: { id, tenantId } });
    if (!view) {
      throw new HttpException({ error: 'VIEW_NOT_FOUND' }, HttpStatus.NOT_FOUND);
    }

    const config = view.config as {
      sources: { id: string; dataSourceId: string; alias: string; fields: string[] }[];
      joins: { leftSourceAlias: string; leftField: string; rightSourceAlias: string; rightField: string; type: string }[];
      filters: { sourceAlias: string; field: string; operator: string; value?: string }[];
      orderBy?: { sourceAlias: string; field: string; direction: string };
      limit?: number;
    };

    // Load all entries for each source
    const sourceData: Record<string, any[]> = {};
    for (const source of config.sources) {
      const entries = await this.prisma.formDataSourceEntry.findMany({
        where: { dataSourceId: source.dataSourceId, tenantId },
      });
      sourceData[source.alias] = entries.map((e) => ({
        _id: e.id,
        _submittedAt: e.submittedAt,
        _submittedBy: e.submittedByName || e.submittedBy,
        ...(e.data as Record<string, unknown>),
      }));
    }

    // Start with first source
    let results: any[] = [];
    if (config.sources.length > 0) {
      const firstSource = config.sources[0];
      results = sourceData[firstSource.alias].map((entry) => ({
        [firstSource.alias]: entry,
      }));
    }

    // Apply joins
    for (const join of config.joins) {
      const rightData = sourceData[join.rightSourceAlias] || [];
      const newResults: any[] = [];

      for (const row of results) {
        const leftValue = row[join.leftSourceAlias]?.[join.leftField];
        const matches = rightData.filter((r) => r[join.rightField] === leftValue);

        if (join.type === 'inner') {
          for (const match of matches) {
            newResults.push({ ...row, [join.rightSourceAlias]: match });
          }
        } else if (join.type === 'left') {
          if (matches.length > 0) {
            for (const match of matches) {
              newResults.push({ ...row, [join.rightSourceAlias]: match });
            }
          } else {
            newResults.push({ ...row, [join.rightSourceAlias]: null });
          }
        }
      }
      results = newResults;
    }

    // Apply filters
    for (const filter of config.filters) {
      results = results.filter((row) => {
        const value = row[filter.sourceAlias]?.[filter.field];
        switch (filter.operator) {
          case 'equals':
            return value === filter.value;
          case 'contains':
            return String(value || '').toLowerCase().includes((filter.value || '').toLowerCase());
          case 'greater':
            return Number(value) > Number(filter.value);
          case 'less':
            return Number(value) < Number(filter.value);
          case 'not_empty':
            return value !== null && value !== undefined && value !== '';
          case 'empty':
            return value === null || value === undefined || value === '';
          default:
            return true;
        }
      });
    }

    // Apply ordering
    if (config.orderBy) {
      const { sourceAlias, field, direction } = config.orderBy;
      results.sort((a, b) => {
        const aVal = a[sourceAlias]?.[field];
        const bVal = b[sourceAlias]?.[field];
        if (aVal < bVal) return direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    // Pagination
    const total = results.length;
    const skip = (page - 1) * size;
    const limit = config.limit ? Math.min(Number(size), config.limit) : Number(size);
    const items = results.slice(skip, skip + limit);

    return { items, page: Number(page), size: limit, total };
  }
}

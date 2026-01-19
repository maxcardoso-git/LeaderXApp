import { Module } from '@nestjs/common';
import { PrismaService } from '@infrastructure/persistence/prisma.service';
import { SettingsController } from './settings.controller';
import { CategoriesController, SegmentsController, LinesController } from './taxonomy.controller';
import { CyclesController } from './workflow.controller';
import { SuppliersController, IntegrationsController } from './suppliers.controller';

@Module({
  controllers: [
    SettingsController,
    // Taxonomy
    CategoriesController,
    SegmentsController,
    LinesController,
    // Workflow
    CyclesController,
    // Suppliers
    SuppliersController,
    IntegrationsController,
  ],
  providers: [PrismaService],
  exports: [],
})
export class SettingsModule {}

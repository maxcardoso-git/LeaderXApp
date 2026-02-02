import { Module } from '@nestjs/common';
import { PrismaService } from '@infrastructure/persistence/prisma.service';
import { SettingsController } from './settings.controller';
import { CategoriesController, SegmentsController, LinesController, ClassificationsController, ProgramsController, SubscriberBenefitsController, EventTypesController, EventVenuesController, TableNamesController, AvatarsController, AvatarTypesController } from './taxonomy.controller';
import { CyclesController, AvatarBenefitConfigController } from './workflow.controller';
import { SuppliersController, IntegrationsController } from './suppliers.controller';
import { RegistrationPointsController } from './registration-points.controller';

@Module({
  controllers: [
    SettingsController,
    // Taxonomy
    CategoriesController,
    SegmentsController,
    LinesController,
    ClassificationsController,
    ProgramsController,
    SubscriberBenefitsController,
    EventTypesController,
    EventVenuesController,
    TableNamesController,
    AvatarsController,
    AvatarTypesController,
    // Workflow
    CyclesController,
    AvatarBenefitConfigController,
    // Registration
    RegistrationPointsController,
    // Suppliers
    SuppliersController,
    IntegrationsController,
  ],
  providers: [PrismaService],
  exports: [],
})
export class SettingsModule {}

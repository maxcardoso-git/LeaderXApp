import { Module } from '@nestjs/common';
import { PrismaService } from '@infrastructure/persistence/prisma.service';
import { FormsController, FieldTypesController, DataSourcesController } from './form-studio.controller';

@Module({
  controllers: [FormsController, FieldTypesController, DataSourcesController],
  providers: [PrismaService],
  exports: [],
})
export class FormStudioModule {}

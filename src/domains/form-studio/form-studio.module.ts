import { Module } from '@nestjs/common';
import { PrismaService } from '@infrastructure/persistence/prisma.service';
import { FormsController, FieldTypesController } from './form-studio.controller';

@Module({
  controllers: [FormsController, FieldTypesController],
  providers: [PrismaService],
  exports: [],
})
export class FormStudioModule {}

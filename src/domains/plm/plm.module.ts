import { Module } from '@nestjs/common';
import { PrismaService } from '@infrastructure/persistence/prisma.service';
import {
  PipelinesController,
  StagesController,
  CardsController,
  KanbanController,
  UserGroupsController,
  PermissionsController,
} from './plm.controller';

@Module({
  controllers: [
    PipelinesController,
    StagesController,
    CardsController,
    KanbanController,
    UserGroupsController,
    PermissionsController,
  ],
  providers: [PrismaService],
  exports: [],
})
export class PlmModule {}

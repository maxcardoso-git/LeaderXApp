import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { PrismaService } from '@infrastructure/persistence/prisma.service';
import { GovernanceModule } from '../governance/governance.module';
import { ToolRegistryService } from './application/services/tool-registry.service';
import { ContextBuilderService } from './application/services/context-builder.service';
import { ToolExecutorService } from './application/services/tool-executor.service';
import { ExecuteToolHandler } from './application/handlers/execute-tool.handler';
import { ManageToolDefinitionHandler } from './application/handlers/manage-tool-definition.handler';
import { ToolDefinitionRepository } from './outbound/repositories/tool-definition.repository';
import { McpController, GatewayProxyController, ToolDefinitionsController } from './inbound/controllers';

@Module({
  imports: [
    HttpModule.register({
      timeout: 5000,
      maxRedirects: 3,
    }),
    GovernanceModule,
  ],
  controllers: [McpController, GatewayProxyController, ToolDefinitionsController],
  providers: [
    PrismaService,
    ToolRegistryService,
    ContextBuilderService,
    ToolExecutorService,
    ExecuteToolHandler,
    ToolDefinitionRepository,
    ManageToolDefinitionHandler,
  ],
  exports: [ToolRegistryService],
})
export class McpModule {}

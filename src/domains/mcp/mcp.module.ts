import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { PrismaService } from '@infrastructure/persistence/prisma.service';
import { ToolRegistryService } from './application/services/tool-registry.service';
import { ContextBuilderService } from './application/services/context-builder.service';
import { ToolExecutorService } from './application/services/tool-executor.service';
import { ExecuteToolHandler } from './application/handlers/execute-tool.handler';
import { McpController, GatewayProxyController } from './inbound/controllers';

@Module({
  imports: [
    HttpModule.register({
      timeout: 5000,
      maxRedirects: 3,
    }),
  ],
  controllers: [McpController, GatewayProxyController],
  providers: [
    PrismaService,
    ToolRegistryService,
    ContextBuilderService,
    ToolExecutorService,
    ExecuteToolHandler,
  ],
  exports: [ToolRegistryService],
})
export class McpModule {}

import { Injectable, OnModuleInit, Logger, Inject, Optional } from '@nestjs/common';
import { McpTool } from '../../domain/types';
import { MCP_TOOL_CATALOG } from '../../domain/api-catalog';
import { ToolDefinitionRepository } from '../../outbound/repositories/tool-definition.repository';

@Injectable()
export class ToolRegistryService implements OnModuleInit {
  private readonly logger = new Logger(ToolRegistryService.name);
  private readonly tools: Map<string, McpTool>;

  constructor(
    @Optional() @Inject(ToolDefinitionRepository) private readonly repo?: ToolDefinitionRepository,
  ) {
    this.tools = new Map();
    for (const tool of MCP_TOOL_CATALOG) {
      this.tools.set(tool.toolCode, tool);
    }
  }

  async onModuleInit() {
    await this.reloadPublishedTools();
  }

  async reloadPublishedTools(): Promise<void> {
    if (!this.repo) return;

    try {
      const published = await this.repo.findPublished();
      for (const def of published) {
        const tool = this.repo.toMcpTool(def);
        this.tools.set(tool.toolCode, tool);
      }
      this.logger.log(`Registry loaded: ${this.tools.size} tools (${published.length} from DB)`);
    } catch (error: any) {
      this.logger.warn(`Failed to load published tools from DB: ${error.message}`);
    }
  }

  listTools(): McpTool[] {
    return Array.from(this.tools.values());
  }

  getTool(code: string): McpTool | null {
    return this.tools.get(code) ?? null;
  }

  validateInput(
    code: string,
    input: Record<string, any>,
  ): { valid: boolean; errors: string[] } {
    const tool = this.getTool(code);
    if (!tool) {
      return { valid: false, errors: [`Tool '${code}' not found in registry`] };
    }

    const errors: string[] = [];
    const schema = tool.inputSchema;

    if (schema.required) {
      for (const field of schema.required) {
        if (input[field] === undefined || input[field] === null) {
          errors.push(`Missing required field: '${field}'`);
        }
      }
    }

    if (
      schema.properties?.eventCode?.enum &&
      input.eventCode &&
      !schema.properties.eventCode.enum.includes(input.eventCode)
    ) {
      errors.push(
        `Invalid eventCode '${input.eventCode}'. Must be one of: ${schema.properties.eventCode.enum.join(', ')}`,
      );
    }

    return { valid: errors.length === 0, errors };
  }
}

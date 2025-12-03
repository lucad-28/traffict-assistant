/**
 * MCP Client for connecting to Traffic MCP Server via SSE
 * Compatible with @modelcontextprotocol/sdk v1.23.0
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';

export interface MCPTool {
  name: string;
  description: string;
  input_schema: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface ToolResult {
  content: Array<{
    type: string;
    text: string;
  }>;
}

export class TrafficMCPClient {
  private serverUrl: string;
  private toolsCache: MCPTool[] | null = null;

  constructor() {
    this.serverUrl = process.env.MCP_SERVER_URL || 'http://localhost:8080/sse';

    console.log(`[MCP Client] Initialized for server: ${this.serverUrl}`);
  }

  /**
   * Create and connect a new MCP client
   */
  private async createClient(): Promise<Client> {
    const url = new URL(this.serverUrl);
    const transport = new SSEClientTransport(url);

    const client = new Client(
      {
        name: 'traffic-chatbot-client',
        version: '1.0.0',
      },
      {
        capabilities: {}
      }
    );

    await client.connect(transport);
    return client;
  }

  /**
   * Get available tools from MCP server
   */
  async getAvailableTools(): Promise<MCPTool[]> {
    console.log('[MCP Client] Fetching available tools...');

    let client: Client | null = null;

    try {
      client = await this.createClient();

      // List tools from the server
      const toolsResponse = await client.listTools();

      // Convert to our format
      const tools: MCPTool[] = toolsResponse.tools.map((tool: any) => ({
        name: tool.name,
        description: tool.description,
        input_schema: tool.inputSchema
      }));

      this.toolsCache = tools;
      console.log(`[MCP Client] Retrieved ${tools.length} tools:`);
      tools.forEach(tool => {
        console.log(`  - ${tool.name}: ${tool.description.substring(0, 60)}...`);
      });

      // Validate expected tools are present
      const expectedTools = [
        'get_traffic_stations',
        'get_actual_traffic',
        'predict_traffic_spi',
        'suggest_routes',
        'geocode_location',
        'get_traffic_at_location'
      ];

      const missingTools = expectedTools.filter(
        expected => !tools.some(tool => tool.name === expected)
      );

      if (missingTools.length > 0) {
        console.warn(`[MCP Client] Warning: Missing expected tools: ${missingTools.join(', ')}`);
      }

      return tools;
    } catch (error) {
      console.error('[MCP Client] Error getting tools:', error);
      throw new Error(`Failed to get MCP tools: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      // Always close the connection
      if (client) {
        try {
          await client.close();
        } catch (closeError) {
          console.warn('[MCP Client] Error closing connection:', closeError);
        }
      }
    }
  }

  /**
   * Call a tool on the MCP server
   */
  async callTool(toolName: string, args: Record<string, any>): Promise<ToolResult> {
    console.log(`[MCP Client] Calling tool: ${toolName}`);
    console.log(`[MCP Client] Arguments:`, args);

    let client: Client | null = null;

    try {
      client = await this.createClient();

      // Call the tool
      const result = await client.callTool({
        name: toolName,
        arguments: args
      });

      console.log(`[MCP Client] Tool ${toolName} executed successfully`);

      return result as ToolResult;
    } catch (error) {
      console.error(`[MCP Client] Error calling tool ${toolName}:`, error);
      throw new Error(`Failed to call tool ${toolName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      // Always close the connection
      if (client) {
        try {
          await client.close();
        } catch (closeError) {
          console.warn('[MCP Client] Error closing connection:', closeError);
        }
      }
    }
  }

  /**
   * Get tools in Claude API format
   */
  getToolsForClaude(): MCPTool[] {
    if (!this.toolsCache) {
      console.warn('[MCP Client] Tools cache is empty, call getAvailableTools() first');
      return [];
    }
    return this.toolsCache;
  }

  /**
   * Format tool result for Claude
   */
  formatToolResult(result: ToolResult): string {
    if (result.content && result.content.length > 0) {
      return result.content
        .filter(item => item.type === 'text')
        .map(item => item.text)
        .join('\n');
    }
    return JSON.stringify(result);
  }
}

// Singleton instance for the application
let mcpClientInstance: TrafficMCPClient | null = null;

/**
 * Get or create the MCP client singleton
 */
export function getMCPClient(): TrafficMCPClient {
  if (!mcpClientInstance) {
    mcpClientInstance = new TrafficMCPClient();
  }
  return mcpClientInstance;
}

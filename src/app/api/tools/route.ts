/**
 * API Route: /api/tools
 * Returns available MCP tools
 */

import { NextResponse } from 'next/server';
import { getMCPClient } from '@/lib/mcp-client';

export const runtime = 'nodejs';

interface ToolInfo {
  name: string;
  description: string;
}

export async function GET() {
  try {
    console.log('[API /tools] Fetching available tools');

    const mcpClient = getMCPClient();

    // Get tools from MCP server
    const tools = await mcpClient.getAvailableTools();

    // Map to simpler format
    const toolsInfo: ToolInfo[] = tools.map(tool => ({
      name: tool.name,
      description: tool.description
    }));

    return NextResponse.json(toolsInfo);

  } catch (error) {
    console.error('[API /tools] Error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      { error: `Error fetching tools: ${errorMessage}` },
      { status: 500 }
    );
  }
}

// OPTIONS for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

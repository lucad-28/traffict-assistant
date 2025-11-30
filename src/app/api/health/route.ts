/**
 * API Route: /api/health
 * Health check endpoint
 */

import { NextResponse } from 'next/server';
import { getSessionManager } from '@/lib/session-manager';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const sessionManager = getSessionManager();

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      sessions: sessionManager.getSessionCount(),
      mcp_configured: !!process.env.MCP_SERVER_URL,
      anthropic_configured: !!process.env.ANTHROPIC_API_KEY
    });

  } catch (error) {
    console.error('[API /health] Error:', error);

    return NextResponse.json(
      {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
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

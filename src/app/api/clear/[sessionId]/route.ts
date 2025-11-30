/**
 * API Route: /api/clear/[sessionId]
 * Clears conversation history for a session
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSessionManager } from '@/lib/session-manager';

export const runtime = 'nodejs';

interface RouteParams {
  params: {
    sessionId: string;
  };
}

export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { sessionId } = params;

    console.log(`[API /clear] Clearing session: ${sessionId}`);

    const sessionManager = getSessionManager();
    const cleared = sessionManager.clearSession(sessionId);

    if (cleared) {
      return NextResponse.json({
        message: `Session ${sessionId} cleared`,
        success: true
      });
    } else {
      return NextResponse.json({
        message: `Session ${sessionId} not found`,
        success: false
      });
    }

  } catch (error) {
    console.error('[API /clear] Error:', error);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
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
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

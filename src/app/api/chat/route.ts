/**
 * API Route: /api/chat
 * Handles chat messages and returns responses from Claude via MCP
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSessionManager } from '@/lib/session-manager';
import { setSessionMeta } from '@/lib/firebase-client';

export const runtime = 'nodejs'; // Use Node.js runtime for MCP client support

interface ChatRequest {
  message: string;
  session_id?: string;
}

interface TrafficMapData {
  query_location: {
    name: string;
    latitude: number;
    longitude: number;
  };
  stations?: any[];
  map_center: {
    latitude: number;
    longitude: number;
  };
  map_zoom: number;
}

interface ToolProgress {
  tool_name: string;
  message: string;
  timestamp: number;
}

interface ChatResponse {
  response: string;
  session_id: string;
  mapData?: TrafficMapData;
  toolProgress?: ToolProgress[];
}

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body: ChatRequest = await request.json();
    const { message, session_id = 'default' } = body;

    // Validate input
    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Invalid message format' },
        { status: 400 }
      );
    }

    if (!message.trim()) {
      return NextResponse.json(
        { error: 'Message cannot be empty' },
        { status: 400 }
      );
    }

    console.log(`[API /chat] Received message from session ${session_id}`);

    // Get or create session
    const sessionManager = getSessionManager();
    const chatService = await sessionManager.getSession(session_id);

    // Ensure session document exists in Firestore (server-side) using client SDK
    try {
      await setSessionMeta(session_id, { sessionId: session_id });
    } catch (err) {
      console.warn('[API /chat] Could not update Firestore session doc', err);
    }

    // Process message
    const result = await chatService.chat(message);

    // Return response with optional map data and tool progress
    const chatResponse: ChatResponse = {
      response: result.response,
      session_id,
      mapData: result.mapData,
      toolProgress: result.toolProgress
    };

    return NextResponse.json(chatResponse);

  } catch (error) {
    console.error('[API /chat] Error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      { error: `Error processing chat: ${errorMessage}` },
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

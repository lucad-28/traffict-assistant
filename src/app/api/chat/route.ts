/**
 * API Route: /api/chat
 * Handles chat messages and returns responses from Claude via MCP
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSessionManager } from '@/lib/session-manager';

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

interface ChatResponse {
  response: string;
  session_id: string;
  mapData?: TrafficMapData;
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

    // Process message
    const result = await chatService.chat(message);

    // Return response with optional map data
    const chatResponse: ChatResponse = {
      response: result.response,
      session_id,
      mapData: result.mapData
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

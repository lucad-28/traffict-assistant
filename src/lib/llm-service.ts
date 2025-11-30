/**
 * LLM Service that integrates Claude API with MCP tools
 * TypeScript equivalent of llm_service.py
 */

import Anthropic from '@anthropic-ai/sdk';
import { TrafficMCPClient, MCPTool } from './mcp-client';

export interface Message {
  role: 'user' | 'assistant';
  content: string | any[];
}

export interface TrafficMapData {
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

export interface ChatResult {
  response: string;
  mapData?: TrafficMapData;
}

export class TrafficChatService {
  private anthropic: Anthropic;
  private mcpClient: TrafficMCPClient;
  private model: string = 'claude-sonnet-4-20250514';
  private conversationHistory: Message[] = [];
  private initialized: boolean = false;
  private readonly MAX_HISTORY_MESSAGES = 20; // Limit to last 20 messages (~10 turns)
  private readonly MAX_TOOL_RESULT_CHARS = 20000; // Limit tool results to ~5K tokens
  private currentMapData?: TrafficMapData; // Track map data from current conversation turn

  constructor(mcpClient: TrafficMCPClient) {
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY not found in environment variables');
    }

    this.anthropic = new Anthropic({ apiKey });
    this.mcpClient = mcpClient;

    console.log('[LLM Service] TrafficChatService initialized');
  }

  /**
   * Initialize the service by loading available tools
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      console.log('[LLM Service] Already initialized');
      return;
    }

    try {
      await this.mcpClient.getAvailableTools();
      this.initialized = true;
      console.log('[LLM Service] Chat service initialized with MCP tools');
    } catch (error) {
      console.error('[LLM Service] Failed to initialize:', error);
      throw error;
    }
  }

  /**
   * Clear conversation history
   */
  clearHistory(): void {
    this.conversationHistory = [];
    console.log('[LLM Service] Conversation history cleared');
  }

  /**
   * Trim conversation history to avoid token limit overflow
   * Keeps only the most recent messages while maintaining conversation coherence
   */
  private trimHistory(): void {
    if (this.conversationHistory.length > this.MAX_HISTORY_MESSAGES) {
      // Keep only the last MAX_HISTORY_MESSAGES messages
      const removed = this.conversationHistory.length - this.MAX_HISTORY_MESSAGES;
      this.conversationHistory = this.conversationHistory.slice(-this.MAX_HISTORY_MESSAGES);
      console.log(`[LLM Service] Trimmed ${removed} old messages from history. Current size: ${this.conversationHistory.length}`);
    }
  }

  /**
   * Truncate large tool results to prevent token overflow
   * @param content - The tool result content
   * @returns Truncated content if too large
   */
  private truncateToolResult(content: string): string {
    if (content.length <= this.MAX_TOOL_RESULT_CHARS) {
      return content;
    }

    const truncated = content.substring(0, this.MAX_TOOL_RESULT_CHARS);
    const remainingChars = content.length - this.MAX_TOOL_RESULT_CHARS;

    console.log(`[LLM Service] Truncated tool result from ${content.length} to ${this.MAX_TOOL_RESULT_CHARS} chars (${remainingChars} chars removed)`);

    // Try to parse as JSON and add truncation notice
    try {
      const parsed = JSON.parse(truncated + '}'); // Attempt to close JSON
      parsed._truncated = true;
      parsed._truncated_message = `Resultado truncado. Se omitieron ${remainingChars} caracteres. Usa filtros más específicos o límites menores.`;
      return JSON.stringify(parsed, null, 2);
    } catch {
      // If not JSON, just add a text notice
      return truncated + `\n\n[TRUNCADO: Se omitieron ${remainingChars} caracteres adicionales. Usa filtros más específicos.]`;
    }
  }

  /**
   * Get conversation history
   */
  getHistory(): Message[] {
    return this.conversationHistory;
  }

  /**
   * Process a user message and return the response
   */
  async chat(userMessage: string): Promise<ChatResult> {
    console.log(`[LLM Service] Processing message: ${userMessage.substring(0, 100)}...`);

    // Reset map data for new conversation turn
    this.currentMapData = undefined;
    let geocodeData: { latitude: number; longitude: number; location: string } | undefined;

    // Add user message to history
    this.conversationHistory.push({
      role: 'user',
      content: userMessage
    });

    // Trim history to prevent token overflow
    this.trimHistory();

    // Get available tools
    const tools = this.mcpClient.getToolsForClaude();

    // System prompt - concise and focused
    const systemPrompt = `Eres un asistente de tráfico vehicular. Responde de forma BREVE y DIRECTA.

CAPACIDADES DE MAPAS INTERACTIVOS:
✅ PUEDES mostrar mapas interactivos en el chat
✅ Los mapas se renderizarán automáticamente cuando uses las herramientas de geocodificación y tráfico
✅ NO digas "no puedo mostrar mapas" - SÍ puedes mostrarlos

REGLAS IMPORTANTES:
- Máximo 2-3 oraciones por respuesta
- Solo información esencial y relevante
- Evita explicaciones largas o técnicas innecesarias
- Usa las herramientas para datos actuales
- Siempre en español

HERRAMIENTAS DISPONIBLES:

1. GEOCODIFICACIÓN Y MAPAS:
   - geocode_location: Convierte nombre de lugar en coordenadas (lat/lon)
   - get_traffic_at_location: Obtiene estaciones de tráfico cercanas a unas coordenadas

   WORKFLOW para mostrar mapa con tráfico:
   a) Usa geocode_location("San Francisco") → obtiene coordenadas
   b) Usa get_traffic_at_location(lat, lon) → obtiene estaciones cercanas
   c) El mapa se mostrará AUTOMÁTICAMENTE en el chat con:
      - Punto azul: ubicación consultada
      - Puntos de colores: estaciones de tráfico (verde=fluido, rojo=congestionado)

2. CONSULTA DE ESTACIONES:
   - get_traffic_stations: Lista estaciones de monitoreo (usa limit=10-20)

3. PREDICCIONES:
   - predict_traffic_spi: Predice tráfico futuro (usa lanes y lane_type de la estación)

4. RUTAS:
   - suggest_routes: Sugiere rutas óptimas entre dos puntos

CUÁNDO USAR GEOCODE + TRAFFIC MAP:
- Usuario pregunta: "¿Cómo está el tráfico en San Francisco?"
  → USA geocode_location + get_traffic_at_location
  → El mapa se mostrará automáticamente

- Usuario pregunta: "Muéstrame un mapa de Berkeley"
  → USA geocode_location + get_traffic_at_location
  → El mapa se mostrará automáticamente

- Usuario pregunta sobre lugar específico (no una estación)
  → USA geocode_location primero para obtener coordenadas
  → Luego get_traffic_at_location para ver estaciones cercanas

EJEMPLOS DE RESPUESTAS:

BUENA (con mapa automático):
Usuario: "¿Cómo está el tráfico en San Francisco?"
[Usas geocode_location + get_traffic_at_location]
Tú: "El tráfico en San Francisco está fluido (SPI 59.6). He mostrado un mapa con las estaciones cercanas."

BUENA (usuario pide mapa):
Usuario: "¿Puedes mostrarme un mapa de Berkeley?"
[Usas geocode_location + get_traffic_at_location]
Tú: "Aquí está el mapa de Berkeley con 5 estaciones de tráfico cercanas. El tráfico está moderado."

MALA (no usar):
"No puedo mostrar mapas visuales. Soy un asistente de texto..."
→ ¡INCORRECTO! SÍ puedes mostrar mapas usando las herramientas.`;


    // Call Claude API
    let response;
    try {
      response = await this.anthropic.messages.create({
        model: this.model,
        max_tokens: 4096,
        system: systemPrompt,
        tools: tools as any[],
        messages: this.conversationHistory as any[]
      });
    } catch (error) {
      console.error('[LLM Service] Error calling Claude API:', error);
      throw new Error(`Failed to call Claude API: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Process response - may require multiple iterations if there are tool_use blocks
    let iterationCount = 0;
    const maxIterations = 10;

    while (response.stop_reason === 'tool_use' && iterationCount < maxIterations) {
      iterationCount++;
      console.log(`[LLM Service] Tool use iteration ${iterationCount}`);

      // Add assistant's response to history
      this.conversationHistory.push({
        role: 'assistant',
        content: response.content
      });

      // Process each tool_use block
      const toolResults = [];

      for (const block of response.content) {
        if (block.type === 'tool_use') {
          const toolName = block.name;
          const toolInput = block.input as Record<string, any>;
          const toolUseId = block.id;

          console.log(`[LLM Service] Executing tool: ${toolName}`);

          // Execute tool via MCP
          let toolResultContent: string;
          try {
            const result = await this.mcpClient.callTool(toolName, toolInput);
            toolResultContent = this.mcpClient.formatToolResult(result);
            console.log(`[LLM Service] Tool ${toolName} executed successfully. Result size: ${toolResultContent.length} chars`);

            // Extract map data from geocoding and traffic tools
            try {
              const parsedResult = JSON.parse(toolResultContent);

              // If geocode_location was called, store coordinates
              if (toolName === 'geocode_location' && parsedResult.status === 'success') {
                geocodeData = {
                  latitude: parsedResult.coordinates.latitude,
                  longitude: parsedResult.coordinates.longitude,
                  location: parsedResult.location
                };
                console.log(`[LLM Service] Extracted geocode data for: ${geocodeData.location}`);
              }

              // If get_traffic_at_location was called, use it for the map
              if (toolName === 'get_traffic_at_location' && parsedResult.status === 'success') {
                this.currentMapData = {
                  query_location: parsedResult.query_location,
                  stations: parsedResult.stations,
                  map_center: parsedResult.map_center,
                  map_zoom: parsedResult.map_zoom
                };
                console.log(`[LLM Service] Extracted traffic map data with ${parsedResult.stations_count} stations`);
              }
              // If we have geocode data but no traffic data yet, create a simple map
              else if (geocodeData && !this.currentMapData) {
                this.currentMapData = {
                  query_location: {
                    name: geocodeData.location,
                    latitude: geocodeData.latitude,
                    longitude: geocodeData.longitude
                  },
                  map_center: {
                    latitude: geocodeData.latitude,
                    longitude: geocodeData.longitude
                  },
                  map_zoom: 13
                };
                console.log(`[LLM Service] Created simple map from geocode data`);
              }
            } catch (parseError) {
              // Tool result is not JSON or couldn't extract map data - that's okay
            }

            // Truncate if too large
            toolResultContent = this.truncateToolResult(toolResultContent);
          } catch (error) {
            toolResultContent = `Error ejecutando herramienta: ${error instanceof Error ? error.message : 'Unknown error'}`;
            console.error(`[LLM Service] Tool execution error:`, error);
          }

          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolUseId,
            content: toolResultContent
          });
        }
      }

      // Add tool results to history
      this.conversationHistory.push({
        role: 'user',
        content: toolResults
      });

      // Trim history after adding tool results
      this.trimHistory();

      // Continue conversation with results
      try {
        response = await this.anthropic.messages.create({
          model: this.model,
          max_tokens: 4096,
          system: systemPrompt,
          tools: tools as any[],
          messages: this.conversationHistory as any[]
        });
      } catch (error) {
        console.error('[LLM Service] Error in continuation:', error);
        throw new Error(`Failed to continue conversation: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Extract final text response
    let finalResponse = '';
    for (const block of response.content) {
      if (block.type === 'text') {
        finalResponse += block.text;
      }
    }

    // Add final response to history
    this.conversationHistory.push({
      role: 'assistant',
      content: response.content
    });

    console.log(`[LLM Service] Chat completed after ${iterationCount} tool iterations`);

    // Return response with optional map data
    const result: ChatResult = {
      response: finalResponse,
      mapData: this.currentMapData
    };

    return result;
  }
}

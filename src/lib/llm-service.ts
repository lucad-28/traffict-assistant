/**
 * LLM Service that integrates Claude API with MCP tools
 * TypeScript equivalent of llm_service.py
 */

import Anthropic from "@anthropic-ai/sdk";
import { TrafficMCPClient, MCPTool } from "./mcp-client";
import { addMessageToSession, updateMessageInSession } from "./firebase-client";

export interface Message {
  role: "user" | "assistant";
  content: string | any[];
}

export interface RouteData {
  origin_marker?: {
    latitude: number;
    longitude: number;
    name: string;
  };
  destination_marker?: {
    latitude: number;
    longitude: number;
    name: string;
  };
  route_polyline?: Array<[number, number]>;
  intermediate_stations?: Array<{
    id: number;
    latitude: number;
    longitude: number;
    spi?: number;
    name?: string;
  }>;
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
  route_data?: RouteData;
}

export interface ToolProgress {
  tool_name: string;
  message: string;
  timestamp: number;
}

export interface ChatResult {
  response: string;
  mapData?: TrafficMapData;
  toolProgress?: ToolProgress[];
}

// Helper function to create friendly tool progress messages
function createToolProgressMessage(
  toolName: string,
  toolInput?: any,
  previous_explanation?: string
): string {
  if (previous_explanation) {
    const words = previous_explanation.trim().split(/\s+/);
    const maxWordsPerLine = 15;
    const lines: string[] = [];
    for (let i = 0; i < words.length; i += maxWordsPerLine) {
      lines.push(words.slice(i, i + maxWordsPerLine).join(" "));
    }
    return lines.join("\n");
  }

  const messages: Record<string, (input?: any) => string> = {
    geocode_location: (input) =>
      `Buscando ubicación de ${input?.location || "la ubicación"}...`,
    get_traffic_at_location: (input) =>
      `Obteniendo tráfico cerca de ${
        input?.location_name || "la ubicación"
      }...`,
    get_traffic_stations: (input) =>
      input?.freeway
        ? `Consultando estaciones de la autopista ${input.freeway}...`
        : "Consultando estaciones de tráfico...",
    predict_traffic_spi: () => "Calculando predicción de tráfico...",
    suggest_routes: () => "Calculando rutas óptimas...",
  };

  const messageFunc = messages[toolName];
  return messageFunc ? messageFunc(toolInput) : `⚙️ Ejecutando ${toolName}...`;
}

export class TrafficChatService {
  private anthropic: Anthropic;
  private mcpClient: TrafficMCPClient;
  private model: string = "claude-sonnet-4-20250514";
  private conversationHistory: Message[] = [];
  private initialized: boolean = false;
  private readonly MAX_HISTORY_MESSAGES = 20; // Limit to last 20 messages (~10 turns)
  private readonly MAX_TOOL_RESULT_CHARS = 20000; // Limit tool results to ~5K tokens
  private currentMapData?: TrafficMapData; // Track map data from current conversation turn
  private sessionId?: string;
  private currentDraftMessageId?: string;

  constructor(mcpClient: TrafficMCPClient, sessionId?: string) {
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY not found in environment variables");
    }

    this.anthropic = new Anthropic({ apiKey });
    this.mcpClient = mcpClient;
    this.sessionId = sessionId;

    console.log("[LLM Service] TrafficChatService initialized");
  }

  private async writeToFirestore(doc: Record<string, any>) {
    try {
      if (!this.sessionId) return;
      await addMessageToSession(this.sessionId, doc);
    } catch (err) {
      console.warn("[LLM Service] Firestore write error", err);
    }
  }

  /**
   * Initialize the service by loading available tools
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      console.log("[LLM Service] Already initialized");
      return;
    }

    try {
      await this.mcpClient.getAvailableTools();
      this.initialized = true;
      console.log("[LLM Service] Chat service initialized with MCP tools");
    } catch (error) {
      console.error("[LLM Service] Failed to initialize:", error);
      throw error;
    }
  }

  /**
   * Clear conversation history
   */
  clearHistory(): void {
    this.conversationHistory = [];
    console.log("[LLM Service] Conversation history cleared");
  }

  /**
   * Trim conversation history to avoid token limit overflow
   * Keeps only the most recent messages while maintaining conversation coherence
   */
  private trimHistory(): void {
    if (this.conversationHistory.length > this.MAX_HISTORY_MESSAGES) {
      // Keep only the last MAX_HISTORY_MESSAGES messages
      const removed =
        this.conversationHistory.length - this.MAX_HISTORY_MESSAGES;
      this.conversationHistory = this.conversationHistory.slice(
        -this.MAX_HISTORY_MESSAGES
      );
      console.log(
        `[LLM Service] Trimmed ${removed} old messages from history. Current size: ${this.conversationHistory.length}`
      );
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

    console.log(
      `[LLM Service] Truncated tool result from ${content.length} to ${this.MAX_TOOL_RESULT_CHARS} chars (${remainingChars} chars removed)`
    );

    // Try to parse as JSON and add truncation notice
    try {
      const parsed = JSON.parse(truncated + "}"); // Attempt to close JSON
      parsed._truncated = true;
      parsed._truncated_message = `Resultado truncado. Se omitieron ${remainingChars} caracteres. Usa filtros más específicos o límites menores.`;
      return JSON.stringify(parsed, null, 2);
    } catch {
      // If not JSON, just add a text notice
      return (
        truncated +
        `\n\n[TRUNCADO: Se omitieron ${remainingChars} caracteres adicionales. Usa filtros más específicos.]`
      );
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
    console.log(
      `[LLM Service] Processing message: ${userMessage.substring(0, 100)}...`
    );

    // Reset map data for new conversation turn
    this.currentMapData = undefined;
    let geocodeData:
      | { latitude: number; longitude: number; location: string }
      | undefined;
    let originLocationData:
      | {
          latitude: number;
          longitude: number;
          name: string;
          stationId?: number;
        }
      | undefined;
    let destinationLocationData:
      | {
          latitude: number;
          longitude: number;
          name: string;
          stationId?: number;
        }
      | undefined;
    let allStations: Map<number, any> = new Map(); // Track all stations by ID
    const toolProgressMessages: ToolProgress[] = []; // Track tool execution progress

    // Add user message to history
    this.conversationHistory.push({
      role: "user",
      content: userMessage,
    });

    // Persist user message to Firestore (so frontend and other clients see it)
    try {
      await this.writeToFirestore({
        role: "user",
        content: userMessage,
        source: "api",
      });

      // Create a draft assistant message that will be updated in-place
      // by tool progress/results. Store its id in `currentDraftMessageId`.
      try {
        if (this.sessionId) {
          const draftRef: any = await addMessageToSession(this.sessionId, {
            role: "assistant",
            content: "",
            status: "running",
            mapData: null,
            toolProgress: [],
            toolResults: [],
            source: "api_draft",
          });
          if (draftRef && draftRef.id) {
            this.currentDraftMessageId = draftRef.id;
            console.log(
              "[LLM Service] Created draft assistant message",
              this.currentDraftMessageId
            );
          }
        }
      } catch (err) {
        console.warn(
          "[LLM Service] Could not create draft assistant message",
          err
        );
      }
    } catch (err) {
      // already handled in writeToFirestore
    }

    // Trim history to prevent token overflow
    this.trimHistory();

    // Get available tools
    const tools = this.mcpClient.getToolsForClaude();

    // System prompt - concise and focused
    const systemPrompt = `Eres un asistente de tráfico vehicular para el área de Los Ángeles. Responde de forma BREVE y DIRECTA.

CAPACIDADES DE MAPAS INTERACTIVOS:
✅ PUEDES mostrar mapas interactivos en el chat, si es que los resultados de las herramientas lo permiten


REGLAS IMPORTANTES:
- Máximo 2-3 oraciones por respuesta
- Solo información esencial y relevante
- Evita explicaciones largas o técnicas innecesarias
- Usa las herramientas para datos actuales
- Siempre en español
- Si una herramienta devuelve un error, corrígelo en la siguiente iteración, o no dudes en pedir un nuevo lugar para buscar

HERRAMIENTAS DISPONIBLES:

1. GEOCODIFICACIÓN Y MAPAS:
   - geocode_location: Convierte nombre de lugar en coordenadas (lat/lon)
   - get_traffic_at_location: Obtiene estaciones de tráfico cercanas a unas coordenadas

   WORKFLOW para mostrar mapa con tráfico:
   a) Usa geocode_location("Downtown") → obtiene coordenadas (por defecto busca en Los Angeles)
   b) Usa get_traffic_at_location(lat, lon) → obtiene estaciones cercanas
   c) El mapa se mostrará AUTOMÁTICAMENTE en el chat con:
      - Punto azul: ubicación consultada
      - Puntos de colores: estaciones de tráfico (verde=fluido, rojo=congestionado)

2. CONSULTA DE ESTACIONES:
   - get_traffic_stations: Lista estaciones de monitoreo (usa limit=10-20)

3. PREDICCIONES:
   - predict_traffic_spi: Predice tráfico futuro (usa lanes y lane_type de la estación)

4. RUTAS ÓPTIMAS:
   - suggest_routes: Sugiere rutas óptimas entre dos estaciones

   WORKFLOW OBLIGATORIO para rutas entre dos lugares en Los Angeles:
   a) Geocodificar ORIGEN: geocode_location("Downtown") (por defecto busca en LA)
   b) Obtener estaciones cerca del ORIGEN: get_traffic_at_location(lat_origen, lon_origen)
   c) Extraer ID de la estación MÁS CERCANA al origen (campo "id")
   d) Geocodificar DESTINO: geocode_location("Santa Monica")
   e) Obtener estaciones cerca del DESTINO: get_traffic_at_location(lat_destino, lon_destino)
   f) Extraer ID de la estación MÁS CERCANA al destino (campo "id")
   g) Recopilar predicciones SPI de TODAS las estaciones encontradas
   h) Llamar suggest_routes(origin_station_id, destination_station_id, predictions_dict)
    i) Si hay un error en el uso de la herramenta, corrígelo en la siguiente iteración, buscando los IDs correctos de estaciones. si no consigues respuesta correcta, pide al un nuevo lugar a partir del cual buscar
  
   NUNCA llames suggest_routes sin antes:
   - Tener IDs numéricos válidos de estaciones (no nombres de lugares)
   - Tener un diccionario de predicciones con al menos origen y destino

   El mapa mostrará AUTOMÁTICAMENTE:
   - Marcador verde: origen
   - Marcador rojo: destino
   - Línea azul: ruta sugerida
   - Estaciones intermedias con colores según SPI

CUÁNDO USAR GEOCODE + TRAFFIC MAP:
- Usuario pregunta: "¿Cómo está el tráfico en Downtown?"
  → USA geocode_location("Downtown") + get_traffic_at_location
  → El mapa se mostrará automáticamente

- Usuario pregunta: "Muéstrame un mapa de Hollywood"
  → USA geocode_location("Hollywood") + get_traffic_at_location
  → El mapa se mostrará automáticamente

- Usuario pregunta sobre lugar específico en LA (no una estación)
  → USA geocode_location primero para obtener coordenadas
  → Luego get_traffic_at_location para ver estaciones cercanas
`;

    // Call Claude API
    let response;
    try {
      response = await this.anthropic.messages.create({
        model: this.model,
        max_tokens: 4096,
        system: systemPrompt,
        tools: tools as any[],
        messages: this.conversationHistory as any[],
      });
    } catch (error) {
      console.error("[LLM Service] Error calling Claude API:", error);
      throw new Error(
        `Failed to call Claude API: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }

    // Process response - may require multiple iterations if there are tool_use blocks
    let iterationCount = 0;
    const maxIterations = 10;

    let cumulativeToolResults: any[] = [];

    while (
      response.stop_reason === "tool_use" &&
      iterationCount < maxIterations
    ) {
      iterationCount++;
      console.log(`[LLM Service] Tool use iteration ${iterationCount}`);

      // Add assistant's response to history
      this.conversationHistory.push({
        role: "assistant",
        content: response.content,
      });

      // Process each tool_use block
      const toolResults = [];
      let previous_explanation = "";
      for (const block of response.content) {
        console.log(block);
        if (block.type === "text") {
          previous_explanation = block.text;
        }

        if (block.type === "tool_use") {
          const toolName = block.name;
          const toolInput = block.input as Record<string, any>;
          const toolUseId = block.id;

          console.log(`[LLM Service] Executing tool: ${toolName}`);

          let progressMessage = "";

          // Add tool progress message (append to in-memory list)
          if (previous_explanation && previous_explanation.length > 0) {
            progressMessage = createToolProgressMessage(
              toolName,
              toolInput,
              previous_explanation
            );
          } else {
            progressMessage = createToolProgressMessage(toolName, toolInput);
          }

          toolProgressMessages.push({
            tool_name: toolName,
            message: progressMessage,
            timestamp: Date.now(),
          });

          // Update the same draft assistant message with progress + mapData
          try {
            if (this.sessionId && this.currentDraftMessageId) {
              const draftContent =
                previous_explanation && previous_explanation.length > 0
                  ? `${previous_explanation}\n${progressMessage}`
                  : progressMessage;

              await updateMessageInSession(
                this.sessionId,
                this.currentDraftMessageId,
                {
                  content: "",
                  toolProgress: toolProgressMessages,
                  mapData: this.currentMapData || null,
                  status: "running",
                }
              );
            }
          } catch (err) {
            console.warn(
              "[LLM Service] Could not update draft assistant message with progress",
              err
            );
          }
          previous_explanation = "";

          console.log(`[LLM Service] 📝 Progress: ${progressMessage}`);

          // Execute tool via MCP
          let toolResultContent: string;
          try {
            const result = await this.mcpClient.callTool(toolName, toolInput);
            toolResultContent = this.mcpClient.formatToolResult(result);
            console.log(
              `[LLM Service] Tool ${toolName} executed successfully. Result size: ${toolResultContent.length} chars`
            );

            // Extract map data from geocoding and traffic tools
            try {
              const parsedResult = JSON.parse(toolResultContent);
              // If geocode_location was called, store coordinates
              if (
                toolName === "geocode_location" &&
                parsedResult.status === "success"
              ) {
                geocodeData = {
                  latitude: parsedResult.coordinates.latitude,
                  longitude: parsedResult.coordinates.longitude,
                  location: parsedResult.location,
                };
                console.log(
                  `[LLM Service] Extracted geocode data for: ${geocodeData.location}`
                );
              }

              // If get_traffic_at_location was called, use it for the map
              if (
                toolName === "get_traffic_at_location" &&
                parsedResult.status === "success"
              ) {
                // Track all stations for potential route planning
                if (
                  parsedResult.stations &&
                  Array.isArray(parsedResult.stations)
                ) {
                  parsedResult.stations.forEach((station: any) => {
                    if (station.id) {
                      allStations.set(station.id, station);
                    }
                  });
                }

                // Detect if this is likely an origin or destination query based on context
                const locationName = parsedResult.query_location?.name || "";
                const isFirstGeocode = !originLocationData && geocodeData;
                const isSecondGeocode =
                  originLocationData &&
                  geocodeData &&
                  geocodeData.location !== originLocationData.name;

                // Store as origin if this is the first location query
                if (isFirstGeocode && !originLocationData) {
                  const nearestStation = parsedResult.stations?.[0];
                  originLocationData = {
                    latitude: parsedResult.query_location.latitude,
                    longitude: parsedResult.query_location.longitude,
                    name: locationName,
                    stationId: nearestStation?.id,
                  };
                  console.log(
                    `[LLM Service] 🚗 Stored origin: ${locationName} (station: ${nearestStation?.id})`
                  );
                }
                // Store as destination if this is a second different location query
                else if (isSecondGeocode && !destinationLocationData) {
                  const nearestStation = parsedResult.stations?.[0];
                  destinationLocationData = {
                    latitude: parsedResult.query_location.latitude,
                    longitude: parsedResult.query_location.longitude,
                    name: locationName,
                    stationId: nearestStation?.id,
                  };
                  console.log(
                    `[LLM Service] 🏁 Stored destination: ${locationName} (station: ${nearestStation?.id})`
                  );
                }

                this.currentMapData = {
                  query_location: parsedResult.query_location,
                  stations: parsedResult.stations || [],
                  map_center: parsedResult.map_center,
                  map_zoom: parsedResult.map_zoom,
                };
                console.log(
                  `[LLM Service] ✅ Extracted traffic map data with ${parsedResult.stations_count} stations`
                );
                console.log(`[LLM Service] Map data structure:`, {
                  query: parsedResult.query_location?.name,
                  stationsCount: parsedResult.stations?.length,
                  hasStations:
                    !!parsedResult.stations && parsedResult.stations.length > 0,
                  firstStation: parsedResult.stations?.[0]?.name,
                });
              }

              // If suggest_routes was called, extract route data for map visualization
              if (
                toolName === "suggest_routes" &&
                parsedResult.routes &&
                parsedResult.routes.length > 0
              ) {
                const bestRoute = parsedResult.routes[0]; // Use first (best) route
                console.log(
                  `[LLM Service] 🗺️ Extracting route data for ${
                    bestRoute.stations?.length || 0
                  } stations`
                );

                // Build polyline from station_details (now includes coordinates)
                const polyline: Array<[number, number]> = [];
                const intermediateStations: Array<any> = [];

                if (
                  bestRoute.station_details &&
                  Array.isArray(bestRoute.station_details)
                ) {
                  console.log(
                    `[LLM Service] ✅ Using station_details from API (${bestRoute.station_details.length} stations)`
                  );

                  bestRoute.station_details.forEach(
                    (station: any, index: number) => {
                      if (station.latitude && station.longitude) {
                        polyline.push([station.latitude, station.longitude]);

                        // Add intermediate stations (skip first and last as they're origin/dest)
                        const isFirst = index === 0;
                        const isLast =
                          index === bestRoute.station_details.length - 1;
                        if (!isFirst && !isLast) {
                          intermediateStations.push({
                            id: station.id,
                            latitude: station.latitude,
                            longitude: station.longitude,
                            name: station.name,
                            freeway: station.freeway,
                            direction: station.direction,
                          });
                        }
                      }
                    }
                  );
                } else if (
                  bestRoute.stations &&
                  Array.isArray(bestRoute.stations)
                ) {
                  // Fallback to old method if station_details not available
                  console.log(
                    `[LLM Service] ⚠️ Fallback: Using allStations map`
                  );
                  bestRoute.stations.forEach((stationId: number) => {
                    const station = allStations.get(stationId);
                    if (station && station.latitude && station.longitude) {
                      polyline.push([station.latitude, station.longitude]);

                      const isFirst = polyline.length === 1;
                      const isLast =
                        polyline.length === bestRoute.stations.length;
                      if (!isFirst && !isLast) {
                        intermediateStations.push({
                          id: station.id,
                          latitude: station.latitude,
                          longitude: station.longitude,
                          spi: station.traffic?.spi,
                          name: station.name,
                        });
                      }
                    }
                  });
                }

                // Add route data to current map data
                if (this.currentMapData) {
                  this.currentMapData.route_data = {
                    origin_marker: originLocationData
                      ? {
                          latitude: originLocationData.latitude,
                          longitude: originLocationData.longitude,
                          name: originLocationData.name,
                        }
                      : undefined,
                    destination_marker: destinationLocationData
                      ? {
                          latitude: destinationLocationData.latitude,
                          longitude: destinationLocationData.longitude,
                          name: destinationLocationData.name,
                        }
                      : undefined,
                    route_polyline: polyline.length > 0 ? polyline : undefined,
                    intermediate_stations: intermediateStations,
                  };

                  // Update map center to show both origin and destination
                  if (originLocationData && destinationLocationData) {
                    this.currentMapData.map_center = {
                      latitude:
                        (originLocationData.latitude +
                          destinationLocationData.latitude) /
                        2,
                      longitude:
                        (originLocationData.longitude +
                          destinationLocationData.longitude) /
                        2,
                    };
                    this.currentMapData.map_zoom = 10; // Zoom out to show full route
                  }

                  console.log(`[LLM Service] ✅ Route data added to map:`, {
                    hasOrigin: !!this.currentMapData.route_data.origin_marker,
                    hasDestination:
                      !!this.currentMapData.route_data.destination_marker,
                    polylinePoints: polyline.length,
                    intermediateStations: intermediateStations.length,
                  });
                }
              }
              // If we have geocode data but no traffic data yet, create a simple map
              else if (geocodeData && !this.currentMapData) {
                this.currentMapData = {
                  query_location: {
                    name: geocodeData.location,
                    latitude: geocodeData.latitude,
                    longitude: geocodeData.longitude,
                  },
                  map_center: {
                    latitude: geocodeData.latitude,
                    longitude: geocodeData.longitude,
                  },
                  map_zoom: 13,
                };
                console.log(
                  `[LLM Service] Created simple map from geocode data`
                );
              }
            } catch (parseError) {
              throw new Error(
                `Hubo un error al ejecutar la herramienta ${toolName}: Resultado no es JSON válido.`
              );
            }

            // Truncate if too large
            toolResultContent = this.truncateToolResult(toolResultContent);
          } catch (error) {
            toolResultContent = `Error ejecutando herramienta: ${
              error instanceof Error ? error.message : "Unknown error"
            }`;
            console.error(`[LLM Service] Tool execution error:`, error);
          }

          toolResults.push({
            type: "tool_result",
            tool_use_id: toolUseId,
            content: toolResultContent,
          });
        }
      }

      // Add tool results to history
      this.conversationHistory.push({
        role: "user",
        content: toolResults,
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
          messages: this.conversationHistory as any[],
        });
      } catch (error) {
        console.error("[LLM Service] Error in continuation:", error);
        throw new Error(
          `Failed to continue conversation: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      }
    }

    // Extract final text response
    let finalResponse = "";
    for (const block of response.content) {
      if (block.type === "text") {
        finalResponse += block.text;
      }
    }

    // Add final response to history
    this.conversationHistory.push({
      role: "assistant",
      content: response.content,
    });

    // Persist assistant final response by updating the draft message (if any)
    try {
      if (this.sessionId && this.currentDraftMessageId) {
        await updateMessageInSession(
          this.sessionId,
          this.currentDraftMessageId,
          {
            content: finalResponse,
            mapData: this.currentMapData || null,
            toolProgress: toolProgressMessages,
            toolResults: cumulativeToolResults,
            status: "done",
          }
        );
        // clear draft id after finalizing
        this.currentDraftMessageId = undefined;
      } else {
        // fallback: create a final assistant message
        await this.writeToFirestore({
          role: "assistant",
          content: finalResponse,
          mapData: this.currentMapData,
          toolProgress: toolProgressMessages,
        });
      }
    } catch (err) {
      console.warn(
        "[LLM Service] Could not persist final assistant response",
        err
      );
    }

    console.log(
      `[LLM Service] Chat completed after ${iterationCount} tool iterations`
    );
    console.log(
      `[LLM Service] Total tool progress messages: ${toolProgressMessages.length}`
    );

    // Return response with optional map data and tool progress
    const result: ChatResult = {
      response: finalResponse,
      mapData: this.currentMapData,
      toolProgress:
        toolProgressMessages.length > 0 ? toolProgressMessages : undefined,
    };

    return result;
  }
}

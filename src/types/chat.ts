export interface Station {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  freeway: number;
  direction: string;
  lanes: number;
  type: string;
  distance_km: number;
  traffic?: {
    spi: number;
    congestion_level: number;
    congestion_label: string;
    traffic_state: string;
    confidence_level: string;
  };
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
  stations?: Station[];
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

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  mapData?: TrafficMapData;
  toolProgress?: ToolProgress[];
}

export interface Tool {
  name: string;
  description: string;
}

export interface ChatResponse {
  response: string;
  session_id: string;
  mapData?: TrafficMapData;
  toolProgress?: ToolProgress[];
}

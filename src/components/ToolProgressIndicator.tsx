'use client';

import { ToolProgress } from '@/types/chat';

interface ToolProgressIndicatorProps {
  progress: ToolProgress[];
}

const toolIcons: Record<string, string> = {
  geocode_location: '🔍',
  get_traffic_at_location: '📡',
  get_traffic_stations: '📋',
  predict_traffic_spi: '🧠',
  suggest_routes: '🗺️'
};

const toolMessages: Record<string, (input?: any) => string> = {
  geocode_location: (input) => `Buscando ubicación de ${input?.location || 'la ubicación'}...`,
  get_traffic_at_location: (input) => `Obteniendo tráfico cerca de ${input?.location_name || 'la ubicación'}...`,
  get_traffic_stations: (input) => input?.freeway
    ? `Consultando estaciones de la autopista ${input.freeway}...`
    : 'Consultando estaciones de tráfico...',
  predict_traffic_spi: () => 'Calculando predicción de tráfico...',
  suggest_routes: () => 'Calculando rutas óptimas...'
};

export function ToolProgressIndicator({ progress }: ToolProgressIndicatorProps) {
  if (!progress || progress.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2 my-3">
      {progress.map((item, index) => {
        const icon = toolIcons[item.tool_name] || '⚙️';

        return (
          <div
            key={`${item.tool_name}-${item.timestamp}-${index}`}
            className="flex items-center gap-2 text-sm text-gray-600 italic animate-pulse"
          >
            <span className="text-lg">{icon}</span>
            <span>{item.message}</span>
            <div className="flex gap-1">
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function getToolProgressMessage(toolName: string, toolInput?: any): string {
  const messageFunc = toolMessages[toolName];
  if (messageFunc) {
    return messageFunc(toolInput);
  }
  return `Ejecutando ${toolName}...`;
}

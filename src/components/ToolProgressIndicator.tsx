'use client';

import { ToolProgress } from '@/types/chat';
import { Search, Radio, List, Brain, MapPin, Cog } from 'lucide-react';

interface ToolProgressIndicatorProps {
  progress: ToolProgress[];
}

const toolIcons: Record<string, typeof Search> = {
  geocode_location: Search,
  get_traffic_at_location: Radio,
  get_traffic_stations: List,
  predict_traffic_spi: Brain,
  suggest_routes: MapPin
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
    <div className="space-y-2 my-3 bg-muted/30 rounded-lg p-3 border border-border/50">
      {progress.map((item, index) => {
        const IconComponent = toolIcons[item.tool_name] || Cog;

        return (
          <div
            key={`${item.tool_name}-${item.timestamp}-${index}`}
            className="flex items-center gap-2.5 text-sm text-muted-foreground"
          >
            <IconComponent className="h-4 w-4 text-primary animate-pulse" />
            <span className="flex-1">{item.message}</span>
            <div className="flex gap-1">
              <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
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

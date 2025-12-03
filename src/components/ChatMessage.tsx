'use client';

import dynamic from 'next/dynamic';
import { Message } from '@/types/chat';
import { ToolProgressIndicator } from './ToolProgressIndicator';
import { User, Bot, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import ReactMarkdown from 'react-markdown';

// Dynamically import TrafficMap with no SSR to avoid "window is not defined" error
const TrafficMap = dynamic(
  () => import('./TrafficMap').then(mod => mod.TrafficMap),
  { ssr: false }
);

interface ChatMessageProps {
  message: Message;
  onSelectMap?: (message: Message) => void;
  isMapSelected?: boolean;
  showInlineMap?: boolean;
}

export function ChatMessage({ message, onSelectMap, isMapSelected, showInlineMap = true }: ChatMessageProps) {
  console.log('Rendering ChatMessage:', message);
  if (message.mapData) {
    console.log('📍 Map data received:', {
      query: message.mapData.query_location?.name,
      stationsCount: message.mapData.stations?.length,
      hasStations: !!message.mapData.stations && message.mapData.stations.length > 0
    });
  }
  const isUser = message.role === 'user';

  return (
    <div className={`flex gap-3 p-4 sm:p-6 ${isUser ? 'bg-muted/30' : 'bg-background'} transition-colors`}>
      <div className={`flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shadow-sm ${
        isUser ? 'bg-primary' : 'bg-green-600'
      }`}>
        {isUser ? (
          <User className="h-4 w-4 sm:h-5 sm:w-5 text-primary-foreground" />
        ) : (
          <Bot className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
        )}
      </div>

      <div className="flex-1 min-w-0 max-w-4xl">
        <div className="flex items-center justify-between gap-2 mb-2">
          <p className="text-sm font-semibold text-foreground">
            {isUser ? 'Tú' : 'Asistente de Tráfico'}
          </p>

          {/* Map selector button - only show if message has map data and callback is provided */}
          {message.mapData && onSelectMap && (
            <Button
              variant={isMapSelected ? "default" : "outline"}
              size="sm"
              onClick={() => onSelectMap(message)}
              className="h-7 gap-1.5"
            >
              <MapPin className="h-3.5 w-3.5" />
              <span className="text-xs hidden sm:inline">
                {isMapSelected ? 'Mapa activo' : 'Ver en mapa'}
              </span>
              {isMapSelected && (
                <Badge variant="secondary" className="h-4 px-1 text-[10px] ml-1">
                  Activo
                </Badge>
              )}
            </Button>
          )}
        </div>

        {/* Render tool progress if available */}
        {message.toolProgress && message.toolProgress.length > 0 && (
          <ToolProgressIndicator progress={message.toolProgress} />
        )}

        {message.content && (
          <div className="text-sm text-foreground/90 whitespace-pre-wrap break-words leading-relaxed">
            <ReactMarkdown>
            {message.content}
            </ReactMarkdown>
          </div>
        )}

        {/* Render interactive map inline only if showInlineMap is true (for when there's no side panel) */}
        {message.mapData && showInlineMap && (
          <TrafficMap data={message.mapData} />
        )}

        <p className="text-xs text-muted-foreground mt-3">
          {message.timestamp.toLocaleTimeString()}
        </p>
      </div>
    </div>
  );
}

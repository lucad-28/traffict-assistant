'use client';

import dynamic from 'next/dynamic';
import { Message } from '@/types/chat';
import { ToolProgressIndicator } from './ToolProgressIndicator';

// Dynamically import TrafficMap with no SSR to avoid "window is not defined" error
const TrafficMap = dynamic(
  () => import('./TrafficMap').then(mod => mod.TrafficMap),
  { ssr: false }
);

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
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
    <div className={`flex gap-3 p-4 ${isUser ? 'bg-gray-50' : 'bg-white'}`}>
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
        isUser ? 'bg-blue-500' : 'bg-green-500'
      }`}>
        <span className="text-white text-sm font-bold">
          {isUser ? 'U' : 'A'}
        </span>
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 mb-1">
          {isUser ? 'Tú' : 'Asistente de Tráfico'}
        </p>

        {/* Render tool progress if available */}
        {message.toolProgress && message.toolProgress.length > 0 && (
          <ToolProgressIndicator progress={message.toolProgress} />
        )}

        <div className="text-gray-700 whitespace-pre-wrap break-words">
          {message.content}
        </div>

        {/* Render interactive map if map data is available */}
        {message.mapData && (
          <TrafficMap data={message.mapData} />
        )}

        <p className="text-xs text-gray-400 mt-2">
          {message.timestamp.toLocaleTimeString()}
        </p>
      </div>
    </div>
  );
}

'use client';

import dynamic from 'next/dynamic';
import { Message } from '@/types/chat';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const TrafficMap = dynamic(
  () => import('./TrafficMap').then(mod => mod.TrafficMap),
  { ssr: false }
);

interface MapPanelProps {
  message: Message | null;
  onClose?: () => void;
  showCloseButton?: boolean;
}

export function MapPanel({ message, onClose, showCloseButton = false }: MapPanelProps) {
  if (!message || !message.mapData) {
    return (
      <Card className="h-full flex items-center justify-center bg-muted/20">
        <CardContent className="text-center p-8">
          <MapPin className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground">
            Selecciona un mensaje con mapa para visualizarlo aquí
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col overflow-hidden">
      <CardHeader className="flex-shrink-0 pb-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <MapPin className="h-5 w-5 text-primary flex-shrink-0" />
            <CardTitle className="text-base truncate">
              {message.mapData.query_location.name}
            </CardTitle>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Badge variant="secondary" className="text-xs">
              {message.timestamp.toLocaleTimeString()}
            </Badge>
            {showCloseButton && onClose && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-0 overflow-hidden">
        <div className="h-full">
          <TrafficMap data={message.mapData} fullHeight={true} />
        </div>
      </CardContent>
    </Card>
  );
}

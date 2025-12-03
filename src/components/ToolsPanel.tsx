'use client';

import { Tool } from '@/types/chat';
import { Badge } from '@/components/ui/badge';
import { Wrench } from 'lucide-react';

interface ToolsPanelProps {
  tools: Tool[];
}

export function ToolsPanel({ tools }: ToolsPanelProps) {
  if (tools.length === 0) return null;

  return (
    <div className="bg-muted/50 border-b p-4">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-2 mb-3">
          <Wrench className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">Herramientas disponibles</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {tools.map((tool) => (
            <Badge
              key={tool.name}
              variant="secondary"
              className="cursor-help"
              title={tool.description}
            >
              {tool.name}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}

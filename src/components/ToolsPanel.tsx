'use client';

import { Tool } from '@/types/chat';

interface ToolsPanelProps {
  tools: Tool[];
}

export function ToolsPanel({ tools }: ToolsPanelProps) {
  if (tools.length === 0) return null;

  return (
    <div className="bg-gray-50 border-b p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">🔧</span>
        <span className="text-sm font-medium text-gray-700">Herramientas disponibles</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {tools.map((tool) => (
          <span
            key={tool.name}
            className="px-2 py-1 bg-white border rounded text-xs text-gray-600"
            title={tool.description}
          >
            {tool.name}
          </span>
        ))}
      </div>
    </div>
  );
}

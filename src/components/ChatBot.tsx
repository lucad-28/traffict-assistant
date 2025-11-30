'use client';

import { useEffect, useRef } from 'react';
import { useChat } from '@/hooks/useChat';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { ToolsPanel } from './ToolsPanel';

export function ChatBot() {
  const { messages, isLoading, error, tools, isConnected, send, clear } = useChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto bg-white shadow-xl">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">🚗 Traffic Assistant</h1>
            <p className="text-blue-100 text-sm">Consulta condiciones de tráfico en tiempo real</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <span className={`inline-block w-2 h-2 rounded-full ${isConnected ? 'bg-green-300' : 'bg-red-300'}`}></span>
              <span className="text-xs">{isConnected ? 'Conectado' : 'Desconectado'}</span>
            </div>
            <button
              onClick={clear}
              className="p-2 hover:bg-blue-500 rounded transition-colors"
              title="Limpiar chat"
            >
              🗑️
            </button>
          </div>
        </div>
      </div>

      {/* Tools Panel */}
      <ToolsPanel tools={tools} />

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 p-8">
            <div className="text-6xl mb-4">🛣️</div>
            <h2 className="text-xl font-medium mb-2">¡Bienvenido!</h2>
            <p className="text-center text-sm max-w-md">
              Pregúntame sobre estaciones de tráfico, predicciones de congestión
              o rutas óptimas. Por ejemplo:
            </p>
            <ul className="mt-4 space-y-2 text-sm">
              <li className="bg-gray-100 px-3 py-2 rounded">¿Cuáles son las estaciones de la autopista 101?</li>
              <li className="bg-gray-100 px-3 py-2 rounded">¿Cómo está el tráfico actualmente?</li>
              <li className="bg-gray-100 px-3 py-2 rounded">Sugiere una ruta desde la estación X a Y</li>
            </ul>
          </div>
        ) : (
          messages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))
        )}

        {isLoading && (
          <div className="flex gap-3 p-4 bg-white">
            <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            </div>
            <div className="text-gray-500">Pensando...</div>
          </div>
        )}

        {error && (
          <div className="p-4 mx-4 my-2 bg-red-50 border border-red-200 rounded-lg text-red-700">
            <strong>Error:</strong> {error}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <ChatInput onSend={send} isLoading={isLoading} disabled={!isConnected} />
    </div>
  );
}

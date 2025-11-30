'use client';

import { useState, useCallback, useEffect } from 'react';
import { Message, Tool } from '@/types/chat';
import { sendMessage, getTools, clearSession, checkHealth } from '@/lib/api';

function generateId() {
  return Math.random().toString(36).substring(2, 15);
}

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tools, setTools] = useState<Tool[]>([]);
  const [sessionId] = useState(() => generateId());
  const [isConnected, setIsConnected] = useState(false);

  // Verificar conexión al montar
  useEffect(() => {
    const init = async () => {
      const healthy = await checkHealth();
      setIsConnected(healthy);

      if (healthy) {
        try {
          const availableTools = await getTools();
          setTools(availableTools);
        } catch (e) {
          console.error('Error loading tools:', e);
        }
      }
    };

    init();
  }, []);

  const send = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);

    try {
      const response = await sendMessage(content, sessionId);

      const assistantMessage: Message = {
        id: generateId(),
        role: 'assistant',
        content: response.response,
        timestamp: new Date(),
        mapData: response.mapData
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido');
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, sessionId]);

  const clear = useCallback(async () => {
    await clearSession(sessionId);
    setMessages([]);
    setError(null);
  }, [sessionId]);

  return {
    messages,
    isLoading,
    error,
    tools,
    isConnected,
    send,
    clear,
  };
}

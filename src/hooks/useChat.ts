"use client";

import { useState, useCallback, useEffect } from "react";
import { Message, Tool } from "@/types/chat";
import { sendMessage, getTools, clearSession, checkHealth } from "@/lib/api";
import {
  listenSessionMessages,
  addMessageToSession,
} from "@/lib/firebase-client";

function generateId() {
  return Math.random().toString(36).substring(2, 15);
}

export function useChat(initialSessionId?: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tools, setTools] = useState<Tool[]>([]);
  const [sessionId, setSessionId] = useState<string | undefined>(
    () => initialSessionId || undefined
  );
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
          console.error("Error loading tools:", e);
        }
      }
    };

    init();

    // Start Firestore listener for session messages (real-time updates)
    // Only subscribe when a sessionId exists (we create sessions on send)
    let unsubscribe: any = undefined;
    if (sessionId) {
      unsubscribe = listenSessionMessages(sessionId, (docs) => {
        const mapped = docs.map((d) => {
          const createdAt =
            d.createdAt && typeof d.createdAt.toDate === "function"
              ? d.createdAt.toDate()
              : d.createdAt
              ? new Date(d.createdAt)
              : new Date();

          if (d.type === "tool_progress") {
            return {
              id: d.id,
              role: "assistant",
              content: d.message || "",
              timestamp: createdAt,
              toolProgress: [
                {
                  tool_name: d.tool_name,
                  message: d.message,
                  timestamp: d.createdAt
                    ? d.createdAt.toMillis
                      ? d.createdAt.toMillis()
                      : Date.now()
                    : Date.now(),
                },
              ],
            } as Message;
          }

          if (d.type === "tool_result") {
            return {
              id: d.id,
              role: "assistant",
              content:
                typeof d.content === "string"
                  ? d.content
                  : JSON.stringify(d.content),
              timestamp: createdAt,
            } as Message;
          }

          // default: chat message saved by client or server
          return {
            id: d.id,
            role: d.role || "assistant",
            content:
              typeof d.content === "string"
                ? d.content
                : JSON.stringify(d.content || ""),
            timestamp: createdAt,
            mapData: d.mapData,
            toolProgress: d.toolProgress,
          } as Message;
        });

        setMessages(mapped);
      });
    }

    return () => {
      try {
        unsubscribe && typeof unsubscribe === "function" && unsubscribe();
      } catch {}
    };
  }, [sessionId]);

  const send = useCallback(
    async (content: string) => {
      if (!content.trim() || isLoading) return;

      const userMessage: Message = {
        id: generateId(),
        role: "user",
        content: content.trim(),
        timestamp: new Date(),
      };

      // Optimistically add local message (listener will sync canonical data)
      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);
      setError(null);

      try {
        // If there's no active session, create one now (session is created on first send)
        let sid = sessionId;
        if (!sid) {
          sid = generateId();
          setSessionId(sid);
        }

        // Persist user message to Firestore immediately so listeners update UI
        // await addMessageToSession(sid as string, { role: 'user', content: content.trim(), source: 'client' });

        // Trigger server processing but don't wait for it — UI will update via Firestore listener
        sendMessage(content, sid).catch((e) => {
          console.error("sendMessage error:", e);
          setError(e instanceof Error ? e.message : "Error desconocido");
        });
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "Error escribiendo en Firestore"
        );
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, sessionId]
  );

  const clear = useCallback(async () => {
    if (!sessionId) {
      // Nothing to clear on the server, just reset local state
      setMessages([]);
      setError(null);
      return;
    }

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
    sessionId,
    setSessionId,
  };
}

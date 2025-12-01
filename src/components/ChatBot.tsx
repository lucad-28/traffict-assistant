"use client";

import { useEffect, useRef, useState } from "react";
import { useChat } from "@/hooks/useChat";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { ToolsPanel } from "./ToolsPanel";

export function ChatBot() {
  // Local sessions stored in localStorage (per device, no auth)
  const [sessions, setSessions] = useState<{ id: string; createdAt: number }[]>(
    []
  );
  const [currentSession, setCurrentSession] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("local_sessions");
      const parsed = raw ? JSON.parse(raw) : [];
      setSessions(parsed);

      const existing = localStorage.getItem("current_session");
      if (existing) {
        setCurrentSession(existing);
      } else {
        // Do not auto-create a session on mount. Sessions are created when the user sends a message.
      }
    } catch (e) {
      console.warn("Could not read local sessions", e);
    }
  }, []);

  const {
    messages,
    isLoading,
    error,
    tools,
    isConnected,
    send,
    clear,
    sessionId,
    setSessionId,
  } = useChat(currentSession || undefined);

  // Keep localStorage in sync when hook reports sessionId
  useEffect(() => {
    if (!sessionId) {
      localStorage.removeItem("current_session");
      return;
    }
    localStorage.setItem("current_session", sessionId);
    // Ensure sessions list contains this id
    try {
      const raw = localStorage.getItem("local_sessions");
      const parsed = raw ? JSON.parse(raw) : [];
      if (!parsed.find((s: any) => s.id === sessionId)) {
        const entry = { id: sessionId, createdAt: Date.now() };
        const updated = [entry, ...parsed];
        localStorage.setItem("local_sessions", JSON.stringify(updated));
        setSessions(updated);
      }
    } catch {}
  }, [sessionId]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Sidebar + main layout
  return (
    <div className="flex h-screen max-w-6xl mx-auto bg-white shadow-xl">
      {/* Sidebar */}
      <aside className="w-64 border-r border-gray-200 p-3 bg-gray-50">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold">Chats</h3>
          <button
            className="text-sm text-blue-600"
            onClick={() => {
              // Start a new composition without creating a persistent session yet.
              // The session document will be created when the user sends the first message.
              localStorage.removeItem("current_session");
              setCurrentSession(null);
              setSessionId(undefined as any);
            }}
          >
            + Nuevo
          </button>
        </div>

        <div
          className="space-y-2 overflow-y-auto"
          style={{ maxHeight: "calc(100vh - 100px)" }}
        >
          {sessions.length === 0 && (
            <div className="text-sm text-gray-500">No hay chats</div>
          )}
          {sessions.map((s) => (
            <button
              key={s.id}
              onClick={() => {
                setSessionId(s.id);
                setCurrentSession(s.id);
              }}
              className={`w-full text-left px-2 py-2 rounded ${
                sessionId === s.id ? "bg-blue-100" : "hover:bg-gray-100"
              }`}
            >
              <div className="text-sm font-medium">Chat {s.id.slice(0, 6)}</div>
              <div className="text-xs text-gray-500">
                {new Date(s.createdAt).toLocaleString()}
              </div>
            </button>
          ))}
        </div>
      </aside>

      <main className="flex-1 flex flex-col">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold">🚗 Traffic Assistant</h1>
                <p className="text-blue-100 text-sm">
                  Consulta condiciones de tráfico en tiempo real
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <span
                    className={`inline-block w-2 h-2 rounded-full ${
                      isConnected ? "bg-green-300" : "bg-red-300"
                    }`}
                  ></span>
                  <span className="text-xs">
                    {isConnected ? "Conectado" : "Desconectado"}
                  </span>
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
                  Pregúntame sobre estaciones de tráfico, predicciones de
                  congestión o rutas óptimas. Por ejemplo:
                </p>
                <ul className="mt-4 space-y-2 text-sm">
                  <li className="bg-gray-100 px-3 py-2 rounded">
                    ¿Cuáles son las estaciones de la autopista 101?
                  </li>
                  <li className="bg-gray-100 px-3 py-2 rounded">
                    ¿Cómo está el tráfico actualmente?
                  </li>
                  <li className="bg-gray-100 px-3 py-2 rounded">
                    Sugiere una ruta desde la estación X a Y
                  </li>
                </ul>
              </div>
            ) : (
              messages.map((message) =>
                (message.role === "user" || message.role === "assistant") &&
                message.content == "" &&
                (!message.toolProgress || message.toolProgress.length === 0) ? (
                  <div className="flex gap-3 p-4 bg-white">
                    <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    </div>
                    <div className="text-gray-500">Pensando...</div>
                  </div>
                ) : (
                  <ChatMessage key={message.id} message={message} />
                )
              )
            )}

            {error && (
              <div className="p-4 mx-4 my-2 bg-red-50 border border-red-200 rounded-lg text-red-700">
                <strong>Error:</strong> {error}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <ChatInput
            onSend={send}
            isLoading={isLoading}
            disabled={!isConnected}
          />
        </div>
      </main>
    </div>
  );
}

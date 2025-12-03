"use client";

import { useEffect, useRef, useState } from "react";
import { useChat } from "@/hooks/useChat";
import { Message } from "@/types/chat";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { ToolsPanel } from "./ToolsPanel";
import { MapPanel } from "./MapPanel";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  MessageSquare,
  Trash2,
  Menu,
  X,
  Car,
  Loader2,
  Plus
} from "lucide-react";

export function ChatBot() {
  // Local sessions stored in localStorage (per device, no auth)
  const [sessions, setSessions] = useState<{ id: string; createdAt: number }[]>(
    []
  );
  const [currentSession, setCurrentSession] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
  const [selectedMapMessage, setSelectedMapMessage] = useState<Message | null>(null);
  const [showMapPanel, setShowMapPanel] = useState(false);

  // Detect if there are any messages with map data
  const messagesWithMaps = messages.filter(m => m.mapData);
  const hasMapData = messagesWithMaps.length > 0;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-select the most recent map when new map data arrives
  useEffect(() => {
    const mWithmaps = messages.filter(m => m.mapData);
    if (mWithmaps.length > 0) {
      const latestMapMessage = mWithmaps[mWithmaps.length - 1];
      setSelectedMapMessage(latestMapMessage);
      setShowMapPanel(true);
    }
  }, [messages]);

  const handleNewChat = () => {
    localStorage.removeItem("current_session");
    setCurrentSession(null);
    setSessionId(undefined as any);
    setSidebarOpen(false);
    setSelectedMapMessage(null);
    setShowMapPanel(false);
  };

  const handleSelectSession = (id: string) => {
    setSessionId(id);
    setCurrentSession(id);
    setSidebarOpen(false);
    setSelectedMapMessage(null);
    setShowMapPanel(false);
  };

  const handleSelectMap = (message: Message) => {
    setSelectedMapMessage(message);
    setShowMapPanel(true);
  };

  const handleCloseMapPanel = () => {
    setShowMapPanel(false);
  };

  // Sidebar + main layout
  return (
    <div className="flex h-screen bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:relative inset-y-0 left-0 z-50
        w-64 lg:w-72 border-r bg-card
        transform transition-transform duration-200 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex flex-col h-full p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-foreground">Chats</h3>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={handleNewChat}
                className="h-8 w-8 p-0"
              >
                <Plus className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSidebarOpen(false)}
                className="h-8 w-8 p-0 lg:hidden"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <ScrollArea className="flex-1 -mx-2 px-2">
            <div className="space-y-2">
              {sessions.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No hay chats
                </p>
              )}
              {sessions.map((s) => (
                <button
                  key={s.id}
                  onClick={() => handleSelectSession(s.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-md transition-colors ${
                    sessionId === s.id
                      ? "bg-primary/10 border border-primary/20"
                      : "hover:bg-accent"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-foreground truncate">
                        Chat {s.id.slice(0, 8)}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {new Date(s.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    {sessionId === s.id && (
                      <Badge variant="default" className="text-xs">Activo</Badge>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-md">
            <div className="px-4 sm:px-6 py-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSidebarOpen(true)}
                    className="lg:hidden text-primary-foreground hover:bg-primary-foreground/10"
                  >
                    <Menu className="h-5 w-5" />
                  </Button>
                  <Car className="h-6 w-6 flex-shrink-0" />
                  <div className="min-w-0">
                    <h1 className="text-lg sm:text-xl font-bold truncate">Traffic Assistant</h1>
                    <p className="text-xs sm:text-sm text-primary-foreground/80 hidden sm:block">
                      Consulta condiciones de tráfico en tiempo real
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`inline-block w-2 h-2 rounded-full ${
                        isConnected ? "bg-green-300" : "bg-red-300"
                      }`}
                    ></span>
                    <span className="text-xs hidden sm:inline">
                      {isConnected ? "Conectado" : "Desconectado"}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={clear}
                    className="h-9 w-9 text-primary-foreground hover:bg-primary-foreground/10"
                    title="Limpiar chat"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Tools Panel */}
          <ToolsPanel tools={tools} />

          {/* Messages and Map Panel Container */}
          <div className={`flex-1 flex ${hasMapData && showMapPanel ? 'flex-col lg:flex-row' : 'flex-col'} min-h-0`}>
            {/* Messages */}
            <div className={`flex-1 flex flex-col min-h-0 ${hasMapData && showMapPanel ? 'lg:w-1/2' : 'w-full'}`}>
              <ScrollArea className="flex-1">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center p-4 sm:p-8">
                    <div className="max-w-md space-y-4">
                      <div className="text-5xl sm:text-6xl mb-4">🛣️</div>
                      <h2 className="text-xl sm:text-2xl font-semibold text-foreground">
                        ¡Bienvenido!
                      </h2>
                      <p className="text-sm sm:text-base text-muted-foreground">
                        Pregúntame sobre estaciones de tráfico, predicciones de
                        congestión o rutas óptimas. Por ejemplo:
                      </p>
                      <div className="space-y-2 text-sm">
                        <Card className="p-3 hover:bg-accent transition-colors cursor-pointer">
                          ¿Cuáles son las estaciones de la autopista 101?
                        </Card>
                        <Card className="p-3 hover:bg-accent transition-colors cursor-pointer">
                          ¿Cómo está el tráfico actualmente?
                        </Card>
                        <Card className="p-3 hover:bg-accent transition-colors cursor-pointer">
                          Sugiere una ruta desde la estación X a Y
                        </Card>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="pb-4">
                    {messages.map((message) =>
                      (message.role === "user" || message.role === "assistant") &&
                      message.content == "" &&
                      (!message.toolProgress || message.toolProgress.length === 0) ? (
                        <div key={message.id} className="flex gap-3 p-4 sm:p-6">
                          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-green-600 flex items-center justify-center shadow-sm">
                            <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 text-white animate-spin" />
                          </div>
                          <div className="text-sm text-muted-foreground flex items-center">
                            Pensando...
                          </div>
                        </div>
                      ) : (
                        <ChatMessage
                          key={message.id}
                          message={message}
                          onSelectMap={hasMapData ? handleSelectMap : undefined}
                          isMapSelected={selectedMapMessage?.id === message.id}
                          showInlineMap={!hasMapData || !showMapPanel}
                        />
                      )
                    )}

                    {error && (
                      <div className="mx-4 sm:mx-6 my-2">
                        <Card className="p-4 bg-destructive/10 border-destructive/20">
                          <p className="text-sm text-destructive">
                            <strong>Error:</strong> {error}
                          </p>
                        </Card>
                      </div>
                    )}

                    <div ref={messagesEndRef} />
                  </div>
                )}
              </ScrollArea>
            </div>

            {/* Map Panel - Only show when there's map data and panel is open */}
            {hasMapData && showMapPanel && (
              <div className="lg:w-1/2 h-64 lg:h-auto border-t lg:border-t-0 lg:border-l bg-muted/5">
                <div className="h-full p-2 sm:p-4">
                  <MapPanel
                    message={selectedMapMessage}
                    onClose={handleCloseMapPanel}
                    showCloseButton={true}
                  />
                </div>
              </div>
            )}
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

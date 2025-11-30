/**
 * Session Manager for handling multiple user conversations
 * In production, this should be replaced with Redis or a database
 */

import { TrafficChatService } from './llm-service';
import { getMCPClient } from './mcp-client';

interface Session {
  service: TrafficChatService;
  createdAt: Date;
  lastAccessedAt: Date;
}

class SessionManager {
  private sessions: Map<string, Session> = new Map();
  private readonly SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Start cleanup task
    this.startCleanup();
  }

  /**
   * Get or create a session
   */
  async getSession(sessionId: string): Promise<TrafficChatService> {
    // Check if session exists
    let session = this.sessions.get(sessionId);

    if (session) {
      // Update last accessed time
      session.lastAccessedAt = new Date();
      console.log(`[Session Manager] Retrieved existing session: ${sessionId}`);
      return session.service;
    }

    // Create new session
    console.log(`[Session Manager] Creating new session: ${sessionId}`);

    const mcpClient = getMCPClient();
    const service = new TrafficChatService(mcpClient);

    // Initialize the service
    await service.initialize();

    session = {
      service,
      createdAt: new Date(),
      lastAccessedAt: new Date()
    };

    this.sessions.set(sessionId, session);

    console.log(`[Session Manager] Total active sessions: ${this.sessions.size}`);

    return service;
  }

  /**
   * Clear a specific session
   */
  clearSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);

    if (session) {
      session.service.clearHistory();
      console.log(`[Session Manager] Cleared session: ${sessionId}`);
      return true;
    }

    console.log(`[Session Manager] Session not found: ${sessionId}`);
    return false;
  }

  /**
   * Delete a session
   */
  deleteSession(sessionId: string): boolean {
    const deleted = this.sessions.delete(sessionId);

    if (deleted) {
      console.log(`[Session Manager] Deleted session: ${sessionId}`);
      console.log(`[Session Manager] Remaining sessions: ${this.sessions.size}`);
    }

    return deleted;
  }

  /**
   * Get session count
   */
  getSessionCount(): number {
    return this.sessions.size;
  }

  /**
   * Get session info
   */
  getSessionInfo(sessionId: string): { exists: boolean; messageCount?: number; createdAt?: Date; lastAccessedAt?: Date } {
    const session = this.sessions.get(sessionId);

    if (!session) {
      return { exists: false };
    }

    return {
      exists: true,
      messageCount: session.service.getHistory().length,
      createdAt: session.createdAt,
      lastAccessedAt: session.lastAccessedAt
    };
  }

  /**
   * Clean up expired sessions
   */
  private cleanupExpiredSessions(): void {
    const now = new Date();
    let cleanedCount = 0;

    for (const [sessionId, session] of this.sessions.entries()) {
      const timeSinceLastAccess = now.getTime() - session.lastAccessedAt.getTime();

      if (timeSinceLastAccess > this.SESSION_TIMEOUT_MS) {
        this.sessions.delete(sessionId);
        cleanedCount++;
        console.log(`[Session Manager] Cleaned up expired session: ${sessionId}`);
      }
    }

    if (cleanedCount > 0) {
      console.log(`[Session Manager] Cleaned up ${cleanedCount} expired sessions`);
      console.log(`[Session Manager] Remaining sessions: ${this.sessions.size}`);
    }
  }

  /**
   * Start periodic cleanup
   */
  private startCleanup(): void {
    if (this.cleanupInterval) {
      return;
    }

    // Run cleanup every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredSessions();
    }, 5 * 60 * 1000);

    console.log('[Session Manager] Started periodic session cleanup');
  }

  /**
   * Stop cleanup (for testing or shutdown)
   */
  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      console.log('[Session Manager] Stopped periodic session cleanup');
    }
  }

  /**
   * Clear all sessions
   */
  clearAll(): void {
    const count = this.sessions.size;
    this.sessions.clear();
    console.log(`[Session Manager] Cleared all ${count} sessions`);
  }
}

// Singleton instance
let sessionManagerInstance: SessionManager | null = null;

/**
 * Get the session manager singleton
 */
export function getSessionManager(): SessionManager {
  if (!sessionManagerInstance) {
    sessionManagerInstance = new SessionManager();
  }
  return sessionManagerInstance;
}

export { SessionManager };

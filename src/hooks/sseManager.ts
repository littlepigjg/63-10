import type { SSEEvent, SSEListener } from './types';

class SSEManager {
  private eventSource: EventSource | null = null;
  private listeners: Map<string, SSEListener> = new Map();
  private reconnectTimer: number | null = null;
  private url: string;
  private reconnectDelay: number = 3000;
  private isConnecting: boolean = false;

  constructor() {
    if (import.meta.env.DEV) {
      this.url = 'http://localhost:3001/api/events';
    } else {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
      this.url = baseUrl ? `${baseUrl}/api/events` : '/api/events';
    }
  }

  connect(): void {
    if (this.eventSource || this.isConnecting) return;

    this.isConnecting = true;

    try {
      const eventSource = new EventSource(this.url);
      this.eventSource = eventSource;

      eventSource.onmessage = (event: MessageEvent) => {
        try {
          const data: SSEEvent = JSON.parse(event.data);
          this.emit(data);
        } catch {
          console.error('Failed to parse SSE message');
        }
      };

      eventSource.onerror = () => {
        this.disconnect();
        this.scheduleReconnect();
      };

      eventSource.onopen = () => {
        this.isConnecting = false;
      };
    } catch {
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    this.isConnecting = false;
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      window.clearTimeout(this.reconnectTimer);
    }
    this.reconnectTimer = window.setTimeout(() => {
      this.connect();
    }, this.reconnectDelay);
  }

  subscribe(id: string, listener: SSEListener): () => void {
    this.listeners.set(id, listener);

    if (!this.eventSource) {
      this.connect();
    }

    return () => {
      this.listeners.delete(id);
      if (this.listeners.size === 0) {
        this.disconnect();
      }
    };
  }

  private emit(event: SSEEvent): void {
    for (const listener of this.listeners.values()) {
      try {
        listener(event);
      } catch (err) {
        console.error('SSE listener error:', err);
      }
    }
  }

  isConnected(): boolean {
    return this.eventSource !== null && this.eventSource.readyState === EventSource.OPEN;
  }

  getListenerCount(): number {
    return this.listeners.size;
  }
}

export const sseManager = new SSEManager();

import type { Response } from 'express';

interface SSEClient {
  id: string;
  res: Response;
  connectedAt: string;
}

export class NotifyService {
  private clients: Map<string, SSEClient> = new Map();

  addClient(id: string, res: Response): void {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });
    res.write(`data: ${JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() })}\n\n`);
    this.clients.set(id, { id, res, connectedAt: new Date().toISOString() });
    res.on('close', () => {
      this.clients.delete(id);
    });
  }

  notifyChange(project: string, environment: string, changedKeys: string[]): void {
    const event = {
      type: 'config_changed',
      project,
      environment,
      changedKeys,
      timestamp: new Date().toISOString(),
    };
    const message = `data: ${JSON.stringify(event)}\n\n`;
    for (const [, client] of this.clients) {
      try {
        client.res.write(message);
      } catch {
        this.clients.delete(client.id);
      }
    }
  }

  notifyRefresh(targetClientId?: string): void {
    const event = {
      type: 'refresh',
      targetClient: targetClientId || 'all',
      timestamp: new Date().toISOString(),
    };
    const message = `data: ${JSON.stringify(event)}\n\n`;
    for (const [id, client] of this.clients) {
      if (!targetClientId || targetClientId === id || targetClientId === 'all') {
        try {
          client.res.write(message);
        } catch {
          this.clients.delete(id);
        }
      }
    }
  }

  getConnectedClients(): Array<{ id: string; connectedAt: string }> {
    return Array.from(this.clients.values()).map((c) => ({
      id: c.id,
      connectedAt: c.connectedAt,
    }));
  }

  getClientCount(): number {
    return this.clients.size;
  }
}

export const notifyService = new NotifyService();

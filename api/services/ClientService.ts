import { clientRepository } from '../repositories/ClientRepository.js';
import { logService } from './LogService.js';
import crypto from 'crypto';
import type { ClientInfo } from '../../shared/types.js';

export class ClientService {
  async getAllClients(): Promise<ClientInfo[]> {
    const clients = await clientRepository.getAllClients();
    const now = Date.now();
    for (const client of clients) {
      const lastHeartbeat = new Date(client.lastHeartbeat).getTime();
      if (now - lastHeartbeat > 60000) {
        client.online = false;
      }
    }
    return clients;
  }

  async registerClient(name: string, ip: string): Promise<ClientInfo> {
    const client: ClientInfo = {
      id: `cli_${crypto.randomUUID().slice(0, 8)}`,
      name,
      ip,
      token: crypto.randomBytes(32).toString('hex'),
      lastHeartbeat: new Date().toISOString(),
      online: true,
    };
    const result = await clientRepository.addClient(client);
    await logService.addLog('client_register', ip, name, '', '', `新客户端注册: ${name}`);
    return result;
  }

  async deleteClient(id: string): Promise<boolean> {
    return clientRepository.deleteClient(id);
  }

  async heartbeat(id: string): Promise<ClientInfo | null> {
    return clientRepository.updateHeartbeat(id);
  }

  async validateToken(token: string): Promise<ClientInfo | undefined> {
    return clientRepository.getClientByToken(token);
  }
}

export const clientService = new ClientService();

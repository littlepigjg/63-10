import { JsonRepository } from './JsonRepository.js';
import type { ClientsData, ClientInfo } from '../../shared/types.js';

export class ClientRepository {
  private repo: JsonRepository<ClientsData>;

  constructor() {
    this.repo = new JsonRepository<ClientsData>('clients.json', { clients: [] });
  }

  async getAllClients(): Promise<ClientInfo[]> {
    const data = await this.repo.read();
    return data.clients;
  }

  async getClientById(id: string): Promise<ClientInfo | undefined> {
    const data = await this.repo.read();
    return data.clients.find((c) => c.id === id);
  }

  async getClientByToken(token: string): Promise<ClientInfo | undefined> {
    const data = await this.repo.read();
    return data.clients.find((c) => c.token === token);
  }

  async addClient(client: ClientInfo): Promise<ClientInfo> {
    const data = await this.repo.read();
    data.clients.push(client);
    await this.repo.write(data);
    return client;
  }

  async updateClient(id: string, updates: Partial<ClientInfo>): Promise<ClientInfo | null> {
    const data = await this.repo.read();
    const idx = data.clients.findIndex((c) => c.id === id);
    if (idx === -1) return null;
    data.clients[idx] = { ...data.clients[idx], ...updates };
    await this.repo.write(data);
    return data.clients[idx];
  }

  async deleteClient(id: string): Promise<boolean> {
    const data = await this.repo.read();
    const idx = data.clients.findIndex((c) => c.id === id);
    if (idx === -1) return false;
    data.clients.splice(idx, 1);
    await this.repo.write(data);
    return true;
  }

  async updateHeartbeat(id: string): Promise<ClientInfo | null> {
    const data = await this.repo.read();
    const idx = data.clients.findIndex((c) => c.id === id);
    if (idx === -1) return null;
    data.clients[idx].lastHeartbeat = new Date().toISOString();
    data.clients[idx].online = true;
    await this.repo.write(data);
    return data.clients[idx];
  }
}

export const clientRepository = new ClientRepository();

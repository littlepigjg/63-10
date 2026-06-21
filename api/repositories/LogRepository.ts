import { JsonRepository } from './JsonRepository.js';
import type { LogsData, LogEntry } from '../../shared/types.js';

export class LogRepository {
  private repo: JsonRepository<LogsData>;

  constructor() {
    this.repo = new JsonRepository<LogsData>('logs.json', { logs: [] });
  }

  async getLogs(filters?: { type?: string; project?: string; from?: string; to?: string; limit?: number; offset?: number }): Promise<{ logs: LogEntry[]; total: number }> {
    const data = await this.repo.read();
    let logs = data.logs;

    if (filters?.type) {
      logs = logs.filter((l) => l.type === filters.type);
    }
    if (filters?.project) {
      logs = logs.filter((l) => l.project === filters.project);
    }
    if (filters?.from) {
      logs = logs.filter((l) => new Date(l.timestamp) >= new Date(filters.from!));
    }
    if (filters?.to) {
      logs = logs.filter((l) => new Date(l.timestamp) <= new Date(filters.to!));
    }

    const total = logs.length;
    logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const offset = filters?.offset ?? 0;
    const limit = filters?.limit ?? 50;
    logs = logs.slice(offset, offset + limit);

    return { logs, total };
  }

  async addLog(entry: LogEntry): Promise<LogEntry> {
    const data = await this.repo.read();
    data.logs.push(entry);
    if (data.logs.length > 10000) {
      data.logs = data.logs.slice(-10000);
    }
    await this.repo.write(data);
    return entry;
  }

  async getRecentLogs(count: number = 10): Promise<LogEntry[]> {
    const data = await this.repo.read();
    return data.logs
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, count);
  }
}

export const logRepository = new LogRepository();

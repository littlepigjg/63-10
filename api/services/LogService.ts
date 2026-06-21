import { logRepository } from '../repositories/LogRepository.js';
import crypto from 'crypto';
import type { LogEntry, LogType } from '../../shared/types.js';

export class LogService {
  async addLog(type: LogType, clientIp: string, clientName: string, project: string, environment: string, detail: string): Promise<LogEntry> {
    const entry: LogEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      type,
      clientIp,
      clientName,
      project,
      environment,
      detail,
    };
    return logRepository.addLog(entry);
  }

  async getLogs(filters?: { type?: string; project?: string; from?: string; to?: string; limit?: number; offset?: number }) {
    return logRepository.getLogs(filters);
  }

  async getRecentLogs(count: number = 10) {
    return logRepository.getRecentLogs(count);
  }
}

export const logService = new LogService();

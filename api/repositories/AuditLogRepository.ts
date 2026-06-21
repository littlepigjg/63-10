import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import type { AuditLogEntry, AuditLogsData, AuditOperationType } from '../../shared/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../data');
const ARCHIVE_DIR = path.resolve(DATA_DIR, 'audit-archives');

const BATCH_INTERVAL = 500;
const BATCH_MAX_SIZE = 100;
const MAX_ACTIVE_LOGS = 50000;
const ARCHIVE_CHECK_INTERVAL = 3600000;

export class AuditLogRepository {
  private repoPath: string;
  private queue: AuditLogEntry[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private archiveTimer: NodeJS.Timeout | null = null;
  private isFlushing = false;
  private defaultData: AuditLogsData = { logs: [] };

  constructor() {
    this.repoPath = path.join(DATA_DIR, 'audit-logs.json');
    this.startPeriodicTasks();
  }

  private startPeriodicTasks(): void {
    this.flushTimer = setInterval(() => {
      this.flushBatch().catch(() => {});
    }, BATCH_INTERVAL);

    this.archiveTimer = setInterval(() => {
      this.checkAndArchive().catch(() => {});
    }, ARCHIVE_CHECK_INTERVAL);

    this.checkAndArchive().catch(() => {});
  }

  private async readData(): Promise<AuditLogsData> {
    try {
      const content = await fs.readFile(this.repoPath, 'utf-8');
      return JSON.parse(content) as AuditLogsData;
    } catch {
      await this.writeData(this.defaultData);
      return { ...this.defaultData };
    }
  }

  private async writeData(data: AuditLogsData): Promise<void> {
    await fs.mkdir(path.dirname(this.repoPath), { recursive: true });
    await fs.writeFile(this.repoPath, JSON.stringify(data, null, 2), 'utf-8');
  }

  async enqueue(entry: AuditLogEntry): Promise<void> {
    this.queue.push(entry);
    if (this.queue.length >= BATCH_MAX_SIZE) {
      this.flushBatch().catch(() => {});
    }
  }

  private async flushBatch(): Promise<void> {
    if (this.isFlushing || this.queue.length === 0) return;
    this.isFlushing = true;

    try {
      const batch = this.queue.splice(0, this.queue.length);
      const data = await this.readData();
      data.logs.push(...batch);

      if (data.logs.length > MAX_ACTIVE_LOGS) {
        const excess = data.logs.length - MAX_ACTIVE_LOGS;
        const toArchive = data.logs.slice(0, excess);
        data.logs = data.logs.slice(excess);
        await this.archiveLogs(toArchive);
      }

      await this.writeData(data);
    } finally {
      this.isFlushing = false;
    }
  }

  private async archiveLogs(logs: AuditLogEntry[]): Promise<void> {
    if (logs.length === 0) return;

    await fs.mkdir(ARCHIVE_DIR, { recursive: true });

    const yearMonth = logs[0].timestamp.slice(0, 7);
    const archiveFile = path.join(ARCHIVE_DIR, `audit-${yearMonth}.json`);

    let existing: AuditLogEntry[] = [];
    try {
      const content = await fs.readFile(archiveFile, 'utf-8');
      existing = JSON.parse(content) as AuditLogEntry[];
    } catch {
      existing = [];
    }

    existing.push(...logs);
    await fs.writeFile(archiveFile, JSON.stringify(existing, null, 2), 'utf-8');
  }

  private async checkAndArchive(): Promise<void> {
    const data = await this.readData();
    if (data.logs.length <= MAX_ACTIVE_LOGS) return;

    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

    const toArchive: AuditLogEntry[] = [];
    const remaining: AuditLogEntry[] = [];

    for (const log of data.logs) {
      const logTime = new Date(log.timestamp).getTime();
      if (logTime < thirtyDaysAgo) {
        toArchive.push(log);
      } else {
        remaining.push(log);
      }
    }

    if (toArchive.length > 0) {
      await this.archiveLogs(toArchive);
      data.logs = remaining;
      data.lastArchivedAt = new Date().toISOString();
      await this.writeData(data);
    }
  }

  async getLogs(filters?: {
    operationType?: AuditOperationType | '';
    projectId?: string;
    environment?: string;
    configKey?: string;
    operatorId?: string;
    from?: string;
    to?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ logs: AuditLogEntry[]; total: number }> {
    await this.flushBatch();
    const data = await this.readData();
    let logs = [...data.logs];

    if (filters?.operationType) {
      logs = logs.filter((l) => l.operationType === filters.operationType);
    }
    if (filters?.projectId) {
      logs = logs.filter((l) => l.projectId === filters.projectId);
    }
    if (filters?.environment) {
      logs = logs.filter((l) => l.environment === filters.environment);
    }
    if (filters?.configKey) {
      logs = logs.filter((l) =>
        l.configKey.toLowerCase().includes(filters.configKey!.toLowerCase())
      );
    }
    if (filters?.operatorId) {
      logs = logs.filter((l) => l.operatorId === filters.operatorId);
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

  async getRecentLogs(count: number = 10): Promise<AuditLogEntry[]> {
    await this.flushBatch();
    const data = await this.readData();
    return [...data.logs]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, count);
  }

  async shutdown(): Promise<void> {
    if (this.flushTimer) clearInterval(this.flushTimer);
    if (this.archiveTimer) clearInterval(this.archiveTimer);
    await this.flushBatch();
  }
}

export const auditLogRepository = new AuditLogRepository();

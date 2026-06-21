import { auditLogRepository } from '../repositories/AuditLogRepository.js';
import crypto from 'crypto';
import type { AuditLogEntry, AuditOperationType, AuditValueChange, ConfigItem } from '../../shared/types.js';

function maskValue(value: string, prefixLen: number = 4): string {
  if (!value) return '****';
  if (value.length <= prefixLen) return '****';
  return value.slice(0, prefixLen) + '****';
}

export interface AuditContext {
  operatorId: string;
  operatorName: string;
  operatorToken: string;
  clientIp: string;
  userAgent: string;
}

export interface ProjectContext {
  projectId: string;
  projectName: string;
  environment: string;
}

export class AuditLogService {
  private buildChanges(
    oldItem: ConfigItem | null,
    newItem: ConfigItem | null,
    encrypted: boolean
  ): AuditValueChange[] {
    const changes: AuditValueChange[] = [];
    const fields: (keyof ConfigItem)[] = ['value', 'description', 'encrypted'];

    for (const field of fields) {
      const oldVal = oldItem ? oldItem[field] : null;
      const newVal = newItem ? newItem[field] : null;
      const oldStr = oldVal === undefined ? null : String(oldVal);
      const newStr = newVal === undefined ? null : String(newVal);

      if (oldStr !== newStr) {
        let maskedOld = oldStr;
        let maskedNew = newStr;

        if (encrypted && field === 'value' && (oldStr || newStr)) {
          if (oldStr) maskedOld = maskValue(oldStr);
          if (newStr) maskedNew = maskValue(newStr);
        }

        changes.push({
          field,
          oldValue: maskedOld,
          newValue: maskedNew,
        });
      }
    }

    return changes;
  }

  async recordConfigChange(
    operationType: AuditOperationType,
    ctx: AuditContext,
    projCtx: ProjectContext,
    oldItem: ConfigItem | null,
    newItem: ConfigItem | null,
    configKey: string
  ): Promise<void> {
    const configEncrypted = newItem ? newItem.encrypted : oldItem ? oldItem.encrypted : false;
    const changes = this.buildChanges(oldItem, newItem, configEncrypted);

    const entry: AuditLogEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      operationType,
      operatorId: ctx.operatorId,
      operatorName: ctx.operatorName,
      operatorToken: maskValue(ctx.operatorToken, 8),
      projectId: projCtx.projectId,
      projectName: projCtx.projectName,
      environment: projCtx.environment,
      configKey,
      configDescription: newItem ? newItem.description : oldItem ? oldItem.description : undefined,
      configEncrypted,
      changes,
      clientIp: ctx.clientIp,
      userAgent: ctx.userAgent,
    };

    await auditLogRepository.enqueue(entry);
  }

  async recordCreate(
    ctx: AuditContext,
    projCtx: ProjectContext,
    newItem: ConfigItem
  ): Promise<void> {
    await this.recordConfigChange('create', ctx, projCtx, null, newItem, newItem.key);
  }

  async recordUpdate(
    ctx: AuditContext,
    projCtx: ProjectContext,
    oldItem: ConfigItem,
    newItem: ConfigItem
  ): Promise<void> {
    await this.recordConfigChange('update', ctx, projCtx, oldItem, newItem, newItem.key);
  }

  async recordDelete(
    ctx: AuditContext,
    projCtx: ProjectContext,
    oldItem: ConfigItem
  ): Promise<void> {
    await this.recordConfigChange('delete', ctx, projCtx, oldItem, null, oldItem.key);
  }

  async recordEncrypt(
    ctx: AuditContext,
    projCtx: ProjectContext,
    oldItem: ConfigItem,
    newItem: ConfigItem
  ): Promise<void> {
    await this.recordConfigChange('encrypt', ctx, projCtx, oldItem, newItem, newItem.key);
  }

  async recordDecrypt(
    ctx: AuditContext,
    projCtx: ProjectContext,
    oldItem: ConfigItem,
    newItem: ConfigItem
  ): Promise<void> {
    await this.recordConfigChange('decrypt', ctx, projCtx, oldItem, newItem, newItem.key);
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
  }) {
    return auditLogRepository.getLogs(filters);
  }

  async getRecentLogs(count: number = 10) {
    return auditLogRepository.getRecentLogs(count);
  }
}

export const auditLogService = new AuditLogService();

import { configRepository } from '../repositories/ConfigRepository.js';
import { encryptionService } from './EncryptionService.js';
import { notifyService } from './NotifyService.js';
import { logService } from './LogService.js';
import { auditLogService } from './AuditLogService.js';
import crypto from 'crypto';
import type { Project, ConfigItem, PullResponse } from '../../shared/types.js';
import type { AuditContext } from './AuditLogService.js';

const SYSTEM_ADMIN_CONTEXT: AuditContext = {
  operatorId: 'system_admin',
  operatorName: 'admin',
  operatorToken: 'system_token',
  clientIp: '',
  userAgent: 'system',
};

export class ConfigService {
  async getAllProjects(): Promise<Project[]> {
    return configRepository.getAllProjects();
  }

  async getProjectById(id: string): Promise<Project | undefined> {
    return configRepository.getProjectById(id);
  }

  async createProject(name: string, description: string): Promise<Project> {
    const project: Project = {
      id: `proj_${crypto.randomUUID().slice(0, 8)}`,
      name,
      description,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      environments: [],
    };
    return configRepository.createProject(project);
  }

  async updateProject(id: string, updates: Partial<Project>): Promise<Project | null> {
    return configRepository.updateProject(id, updates);
  }

  async deleteProject(id: string): Promise<boolean> {
    return configRepository.deleteProject(id);
  }

  async getEnvironmentConfigs(projectId: string, envName: string): Promise<ConfigItem[] | null> {
    return configRepository.getEnvironmentConfigs(projectId, envName);
  }

  async addConfigItem(
    projectId: string,
    envName: string,
    key: string,
    value: string,
    description: string,
    encrypted: boolean = false,
    auditCtx?: AuditContext
  ): Promise<ConfigItem | null> {
    let storedValue = value;
    let iv: string | undefined;
    let tag: string | undefined;

    if (encrypted) {
      const result = await encryptionService.encrypt(value);
      storedValue = result.encrypted;
      iv = result.iv;
      tag = result.tag;
    }

    const operatorName = auditCtx?.operatorName || 'admin';

    const item: ConfigItem = {
      key,
      value: storedValue,
      description,
      encrypted,
      iv,
      tag,
      updatedAt: new Date().toISOString(),
      updatedBy: operatorName,
    };

    const result = await configRepository.addConfigItem(projectId, envName, item);
    if (result) {
      notifyService.notifyChange(projectId, envName, [key]);
      await logService.addLog('change', '', operatorName, projectId, envName, `新增配置项: ${key}`);

      const project = await this.getProjectById(projectId);
      auditLogService.recordCreate(
        auditCtx || SYSTEM_ADMIN_CONTEXT,
        { projectId, projectName: project?.name || projectId, environment: envName },
        result
      ).catch(() => {});
    }
    return result;
  }

  async updateConfigItem(
    projectId: string,
    envName: string,
    key: string,
    updates: Partial<ConfigItem>,
    auditCtx?: AuditContext
  ): Promise<ConfigItem | null> {
    const existingConfigs = await configRepository.getEnvironmentConfigs(projectId, envName);
    const oldItem = existingConfigs?.find((c) => c.key === key);
    if (!oldItem) return null;

    const oldItemClone: ConfigItem = JSON.parse(JSON.stringify(oldItem));

    if (updates.encrypted && updates.value) {
      const result = await encryptionService.encrypt(updates.value);
      updates.value = result.encrypted;
      updates.iv = result.iv;
      updates.tag = result.tag;
    }

    const operatorName = auditCtx?.operatorName || 'admin';
    if (updates.value !== undefined) {
      (updates as Partial<ConfigItem>).updatedBy = operatorName;
    }

    const result = await configRepository.updateConfigItem(projectId, envName, key, updates);
    if (result) {
      notifyService.notifyChange(projectId, envName, [key]);
      await logService.addLog('change', '', operatorName, projectId, envName, `更新配置项: ${key}`);

      const project = await this.getProjectById(projectId);
      auditLogService.recordUpdate(
        auditCtx || SYSTEM_ADMIN_CONTEXT,
        { projectId, projectName: project?.name || projectId, environment: envName },
        oldItemClone,
        result
      ).catch(() => {});
    }
    return result;
  }

  async deleteConfigItem(
    projectId: string,
    envName: string,
    key: string,
    auditCtx?: AuditContext
  ): Promise<boolean> {
    const existingConfigs = await configRepository.getEnvironmentConfigs(projectId, envName);
    const oldItem = existingConfigs?.find((c) => c.key === key);
    if (!oldItem) return false;

    const oldItemClone: ConfigItem = JSON.parse(JSON.stringify(oldItem));
    const operatorName = auditCtx?.operatorName || 'admin';

    const result = await configRepository.deleteConfigItem(projectId, envName, key);
    if (result) {
      notifyService.notifyChange(projectId, envName, [key]);
      await logService.addLog('change', '', operatorName, projectId, envName, `删除配置项: ${key}`);

      const project = await this.getProjectById(projectId);
      auditLogService.recordDelete(
        auditCtx || SYSTEM_ADMIN_CONTEXT,
        { projectId, projectName: project?.name || projectId, environment: envName },
        oldItemClone
      ).catch(() => {});
    }
    return result;
  }

  async pullConfigs(projectName: string, envName: string, clientIp: string, clientName: string): Promise<PullResponse | null> {
    const projects = await configRepository.getAllProjects();
    const project = projects.find((p) => p.name === projectName || p.id === projectName);
    if (!project) return null;

    const env = project.environments.find((e) => e.name === envName);
    if (!env) return null;

    const configs: Record<string, string> = {};
    for (const item of env.configs) {
      if (item.encrypted && item.iv && item.tag) {
        try {
          configs[item.key] = await encryptionService.decrypt(item.value, item.iv, item.tag);
        } catch {
          configs[item.key] = '[DECRYPT_ERROR]';
        }
      } else {
        configs[item.key] = item.value;
      }
    }

    await logService.addLog('pull', clientIp, clientName, project.name, envName, `客户端 ${clientName} 拉取了 ${env.configs.length} 个配置项`);

    return {
      configs,
      version: project.updatedAt,
      pulledAt: new Date().toISOString(),
    };
  }

  async encryptConfig(
    projectId: string,
    envName: string,
    key: string,
    auditCtx?: AuditContext
  ): Promise<ConfigItem | null> {
    const configs = await configRepository.getEnvironmentConfigs(projectId, envName);
    if (!configs) return null;
    const item = configs.find((c) => c.key === key);
    if (!item || item.encrypted) return null;

    const oldItemClone: ConfigItem = JSON.parse(JSON.stringify(item));
    const operatorName = auditCtx?.operatorName || 'admin';

    const result = await encryptionService.encrypt(item.value);
    const updated = await configRepository.updateConfigItem(projectId, envName, key, {
      value: result.encrypted,
      encrypted: true,
      iv: result.iv,
      tag: result.tag,
      updatedBy: operatorName,
    });

    if (updated) {
      await logService.addLog('encrypt', '', operatorName, projectId, envName, `加密配置项: ${key}`);

      const project = await this.getProjectById(projectId);
      auditLogService.recordEncrypt(
        auditCtx || SYSTEM_ADMIN_CONTEXT,
        { projectId, projectName: project?.name || projectId, environment: envName },
        oldItemClone,
        updated
      ).catch(() => {});
    }
    return updated;
  }

  async decryptConfig(
    projectId: string,
    envName: string,
    key: string,
    auditCtx?: AuditContext
  ): Promise<ConfigItem | null> {
    const configs = await configRepository.getEnvironmentConfigs(projectId, envName);
    if (!configs) return null;
    const item = configs.find((c) => c.key === key);
    if (!item || !item.encrypted || !item.iv || !item.tag) return null;

    const oldItemClone: ConfigItem = JSON.parse(JSON.stringify(item));
    const operatorName = auditCtx?.operatorName || 'admin';

    const decryptedValue = await encryptionService.decrypt(item.value, item.iv, item.tag);
    const updated = await configRepository.updateConfigItem(projectId, envName, key, {
      value: decryptedValue,
      encrypted: false,
      iv: undefined,
      tag: undefined,
      updatedBy: operatorName,
    });

    if (updated) {
      await logService.addLog('decrypt', '', operatorName, projectId, envName, `解密配置项: ${key}`);

      const project = await this.getProjectById(projectId);
      auditLogService.recordDecrypt(
        auditCtx || SYSTEM_ADMIN_CONTEXT,
        { projectId, projectName: project?.name || projectId, environment: envName },
        oldItemClone,
        updated
      ).catch(() => {});
    }
    return updated;
  }
}

export const configService = new ConfigService();

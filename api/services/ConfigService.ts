import { configRepository } from '../repositories/ConfigRepository.js';
import { encryptionService } from './EncryptionService.js';
import { notifyService } from './NotifyService.js';
import { logService } from './LogService.js';
import crypto from 'crypto';
import type { Project, ConfigItem, PullResponse } from '../../shared/types.js';

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

  async addConfigItem(projectId: string, envName: string, key: string, value: string, description: string, encrypted: boolean = false): Promise<ConfigItem | null> {
    let storedValue = value;
    let iv: string | undefined;
    let tag: string | undefined;

    if (encrypted) {
      const result = await encryptionService.encrypt(value);
      storedValue = result.encrypted;
      iv = result.iv;
      tag = result.tag;
    }

    const item: ConfigItem = {
      key,
      value: storedValue,
      description,
      encrypted,
      iv,
      tag,
      updatedAt: new Date().toISOString(),
      updatedBy: 'admin',
    };

    const result = await configRepository.addConfigItem(projectId, envName, item);
    if (result) {
      notifyService.notifyChange(projectId, envName, [key]);
      await logService.addLog('change', '', 'admin', projectId, envName, `新增配置项: ${key}`);
    }
    return result;
  }

  async updateConfigItem(projectId: string, envName: string, key: string, updates: Partial<ConfigItem>): Promise<ConfigItem | null> {
    if (updates.encrypted && updates.value) {
      const result = await encryptionService.encrypt(updates.value);
      updates.value = result.encrypted;
      updates.iv = result.iv;
      updates.tag = result.tag;
    }
    const result = await configRepository.updateConfigItem(projectId, envName, key, updates);
    if (result) {
      notifyService.notifyChange(projectId, envName, [key]);
      await logService.addLog('change', '', 'admin', projectId, envName, `更新配置项: ${key}`);
    }
    return result;
  }

  async deleteConfigItem(projectId: string, envName: string, key: string): Promise<boolean> {
    const result = await configRepository.deleteConfigItem(projectId, envName, key);
    if (result) {
      notifyService.notifyChange(projectId, envName, [key]);
      await logService.addLog('change', '', 'admin', projectId, envName, `删除配置项: ${key}`);
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

  async encryptConfig(projectId: string, envName: string, key: string): Promise<ConfigItem | null> {
    const configs = await configRepository.getEnvironmentConfigs(projectId, envName);
    if (!configs) return null;
    const item = configs.find((c) => c.key === key);
    if (!item || item.encrypted) return null;

    const result = await encryptionService.encrypt(item.value);
    const updated = await configRepository.updateConfigItem(projectId, envName, key, {
      value: result.encrypted,
      encrypted: true,
      iv: result.iv,
      tag: result.tag,
    });

    if (updated) {
      await logService.addLog('encrypt', '', 'admin', projectId, envName, `加密配置项: ${key}`);
    }
    return updated;
  }

  async decryptConfig(projectId: string, envName: string, key: string): Promise<ConfigItem | null> {
    const configs = await configRepository.getEnvironmentConfigs(projectId, envName);
    if (!configs) return null;
    const item = configs.find((c) => c.key === key);
    if (!item || !item.encrypted || !item.iv || !item.tag) return null;

    const decryptedValue = await encryptionService.decrypt(item.value, item.iv, item.tag);
    const updated = await configRepository.updateConfigItem(projectId, envName, key, {
      value: decryptedValue,
      encrypted: false,
      iv: undefined,
      tag: undefined,
    });

    if (updated) {
      await logService.addLog('decrypt', '', 'admin', projectId, envName, `解密配置项: ${key}`);
    }
    return updated;
  }
}

export const configService = new ConfigService();

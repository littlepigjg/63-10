import { JsonRepository } from './JsonRepository.js';
import type { ConfigData, Project, ConfigItem } from '../../shared/types.js';

export class ConfigRepository {
  private repo: JsonRepository<ConfigData>;

  constructor() {
    this.repo = new JsonRepository<ConfigData>('config.json', {
      encryptionKey: '',
      projects: [],
    });
  }

  async getData(): Promise<ConfigData> {
    return this.repo.read();
  }

  async saveData(data: ConfigData): Promise<void> {
    await this.repo.write(data);
  }

  async getAllProjects(): Promise<Project[]> {
    const data = await this.getData();
    return data.projects;
  }

  async getProjectById(id: string): Promise<Project | undefined> {
    const data = await this.getData();
    return data.projects.find((p) => p.id === id);
  }

  async createProject(project: Project): Promise<Project> {
    const data = await this.getData();
    data.projects.push(project);
    await this.saveData(data);
    return project;
  }

  async updateProject(id: string, updates: Partial<Project>): Promise<Project | null> {
    const data = await this.getData();
    const idx = data.projects.findIndex((p) => p.id === id);
    if (idx === -1) return null;
    data.projects[idx] = { ...data.projects[idx], ...updates, updatedAt: new Date().toISOString() };
    await this.saveData(data);
    return data.projects[idx];
  }

  async deleteProject(id: string): Promise<boolean> {
    const data = await this.getData();
    const idx = data.projects.findIndex((p) => p.id === id);
    if (idx === -1) return false;
    data.projects.splice(idx, 1);
    await this.saveData(data);
    return true;
  }

  async getEnvironmentConfigs(projectId: string, envName: string): Promise<ConfigItem[] | null> {
    const project = await this.getProjectById(projectId);
    if (!project) return null;
    const env = project.environments.find((e) => e.name === envName);
    return env ? env.configs : null;
  }

  async addConfigItem(projectId: string, envName: string, item: ConfigItem): Promise<ConfigItem | null> {
    const data = await this.getData();
    const project = data.projects.find((p) => p.id === projectId);
    if (!project) return null;
    let env = project.environments.find((e) => e.name === envName);
    if (!env) {
      env = { name: envName, configs: [] };
      project.environments.push(env);
    }
    const existing = env.configs.find((c) => c.key === item.key);
    if (existing) return null;
    env.configs.push(item);
    project.updatedAt = new Date().toISOString();
    await this.saveData(data);
    return item;
  }

  async updateConfigItem(projectId: string, envName: string, key: string, updates: Partial<ConfigItem>): Promise<ConfigItem | null> {
    const data = await this.getData();
    const project = data.projects.find((p) => p.id === projectId);
    if (!project) return null;
    const env = project.environments.find((e) => e.name === envName);
    if (!env) return null;
    const config = env.configs.find((c) => c.key === key);
    if (!config) return null;
    Object.assign(config, updates, { updatedAt: new Date().toISOString() });
    project.updatedAt = new Date().toISOString();
    await this.saveData(data);
    return config;
  }

  async deleteConfigItem(projectId: string, envName: string, key: string): Promise<boolean> {
    const data = await this.getData();
    const project = data.projects.find((p) => p.id === projectId);
    if (!project) return false;
    const env = project.environments.find((e) => e.name === envName);
    if (!env) return false;
    const idx = env.configs.findIndex((c) => c.key === key);
    if (idx === -1) return false;
    env.configs.splice(idx, 1);
    project.updatedAt = new Date().toISOString();
    await this.saveData(data);
    return true;
  }

  async getEncryptionKey(): Promise<string> {
    const data = await this.getData();
    return data.encryptionKey;
  }

  async setEncryptionKey(key: string): Promise<void> {
    const data = await this.getData();
    data.encryptionKey = key;
    await this.saveData(data);
  }
}

export const configRepository = new ConfigRepository();

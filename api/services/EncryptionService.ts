import crypto from 'crypto';
import { configRepository } from '../repositories/ConfigRepository.js';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;

export class EncryptionService {
  private async getOrCreateKey(): Promise<Buffer> {
    let key = await configRepository.getEncryptionKey();
    if (!key) {
      key = crypto.randomBytes(KEY_LENGTH).toString('base64');
      await configRepository.setEncryptionKey(key);
    }
    return Buffer.from(key, 'base64');
  }

  async encrypt(plaintext: string): Promise<{ encrypted: string; iv: string; tag: string }> {
    const key = await this.getOrCreateKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    const tag = cipher.getAuthTag();
    return {
      encrypted,
      iv: iv.toString('base64'),
      tag: tag.toString('base64'),
    };
  }

  async decrypt(encryptedValue: string, ivBase64: string, tagBase64: string): Promise<string> {
    const key = await this.getOrCreateKey();
    const iv = Buffer.from(ivBase64, 'base64');
    const tag = Buffer.from(tagBase64, 'base64');
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    let decrypted = decipher.update(encryptedValue, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  async getEncryptionStatus(): Promise<Array<{ project: string; environment: string; key: string; encrypted: boolean }>> {
    const projects = await configRepository.getAllProjects();
    const result: Array<{ project: string; environment: string; key: string; encrypted: boolean }> = [];
    for (const project of projects) {
      for (const env of project.environments) {
        for (const config of env.configs) {
          result.push({
            project: project.name,
            environment: env.name,
            key: config.key,
            encrypted: config.encrypted,
          });
        }
      }
    }
    return result;
  }
}

export const encryptionService = new EncryptionService();

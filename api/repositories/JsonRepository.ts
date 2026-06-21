import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../data');

export class JsonRepository<T> {
  private filePath: string;
  private defaultData: T;

  constructor(fileName: string, defaultData: T) {
    this.filePath = path.join(DATA_DIR, fileName);
    this.defaultData = defaultData;
  }

  async read(): Promise<T> {
    try {
      const content = await fs.readFile(this.filePath, 'utf-8');
      return JSON.parse(content) as T;
    } catch {
      await this.write(this.defaultData);
      return this.defaultData;
    }
  }

  async write(data: T): Promise<void> {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    await fs.writeFile(this.filePath, JSON.stringify(data, null, 2), 'utf-8');
  }
}

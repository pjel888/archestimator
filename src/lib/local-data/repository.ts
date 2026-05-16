import { readFile } from "node:fs/promises";
import path from "node:path";
import { localDatabaseSchema, type LocalDatabase } from "./schemas";

const DEFAULT_DATA_PATH = path.join(process.cwd(), "data/local/seed.json");

export type ArchestimatorRepository = {
  getDatabase(): Promise<LocalDatabase>;
};

export class JsonFileRepository implements ArchestimatorRepository {
  constructor(private readonly filePath = DEFAULT_DATA_PATH) {}

  async getDatabase(): Promise<LocalDatabase> {
    const raw = await readFile(this.filePath, "utf8");
    return localDatabaseSchema.parse(JSON.parse(raw));
  }
}

export function createLocalRepository(filePath?: string): ArchestimatorRepository {
  return new JsonFileRepository(filePath);
}

import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import { localDatabaseSchema, type LocalDatabase } from "./schemas";

const DEFAULT_DATA_PATH = path.join(process.cwd(), "data/local/seed.json");

export type ArchestimatorRepository = {
  getDatabase(): Promise<LocalDatabase>;
};

export class LocalDataRepositoryError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "LocalDataRepositoryError";
  }
}

export class JsonFileRepository implements ArchestimatorRepository {
  constructor(private readonly filePath = DEFAULT_DATA_PATH) {}

  async getDatabase(): Promise<LocalDatabase> {
    let raw: string;

    try {
      raw = await readFile(this.filePath, "utf8");
    } catch (error) {
      throw new LocalDataRepositoryError(`Unable to read local data file: ${this.filePath}`, {
        cause: error,
      });
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (error) {
      throw new LocalDataRepositoryError(`Local data file is not valid JSON: ${this.filePath}`, {
        cause: error,
      });
    }

    const result = localDatabaseSchema.safeParse(parsed);
    if (!result.success) {
      throw new LocalDataRepositoryError(`Local data file failed schema validation: ${this.filePath}`, {
        cause: result.error,
      });
    }

    return result.data;
  }
}

export function createLocalRepository(filePath?: string): ArchestimatorRepository {
  return new JsonFileRepository(filePath);
}

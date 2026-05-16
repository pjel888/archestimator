import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import * as path from "node:path";
import { localDatabaseSchema, type LocalDatabase } from "./schemas";

export class LocalDataRepositoryError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "LocalDataRepositoryError";
  }
}

export class JsonFileStore {
  constructor(private readonly filePath: string) {}

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

  async saveDatabase(database: LocalDatabase): Promise<void> {
    const result = localDatabaseSchema.safeParse(database);
    if (!result.success) {
      throw new LocalDataRepositoryError("Refusing to write invalid local database", {
        cause: result.error,
      });
    }

    await mkdir(path.dirname(this.filePath), { recursive: true });
    const tempPath = `${this.filePath}.${process.pid}.${Date.now()}.tmp`;
    await writeFile(tempPath, `${JSON.stringify(result.data, null, 2)}\n`, "utf8");
    await rename(tempPath, this.filePath);
  }
}

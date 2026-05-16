import "server-only";

import * as path from "node:path";
import { copyFile, mkdir } from "node:fs/promises";
import { constants } from "node:fs";
import { JsonFileStore, LocalDataRepositoryError } from "./json-file-store";
import type { LocalDatabase } from "./schemas";

const SEED_DATA_PATH = path.join(process.cwd(), "data/local/seed.json");
const RUNTIME_DATA_PATH = path.join(process.cwd(), "data/local/runtime.json");

export type ArchestimatorRepository = {
  getDatabase(): Promise<LocalDatabase>;
  saveDatabase(database: LocalDatabase): Promise<void>;
};

export { LocalDataRepositoryError };
export class JsonFileRepository extends JsonFileStore {}

async function ensureRuntimeDataFile(runtimePath: string, seedPath: string) {
  await mkdir(path.dirname(runtimePath), { recursive: true });
  try {
    await copyFile(seedPath, runtimePath, constants.COPYFILE_EXCL);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "EEXIST") return;
    throw new LocalDataRepositoryError(`Unable to initialize mutable local data file: ${runtimePath}`, {
      cause: error,
    });
  }
}

export function getRuntimeDataPath() {
  return process.env.ARCHESTIMATOR_DATA_PATH ?? RUNTIME_DATA_PATH;
}

export async function createMutableLocalRepository(filePath = getRuntimeDataPath()): Promise<ArchestimatorRepository> {
  await ensureRuntimeDataFile(filePath, SEED_DATA_PATH);
  return new JsonFileRepository(filePath);
}

export function createLocalRepository(filePath = SEED_DATA_PATH): ArchestimatorRepository {
  return new JsonFileRepository(filePath);
}

import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, test } from "bun:test";
import { JsonFileStore } from "@/lib/local-data/json-file-store";
import type { LocalDatabase } from "@/lib/local-data/schemas";

const database: LocalDatabase = {
  schemaVersion: 1,
  workspace: { id: "workspace_1", name: "Demo", defaultCurrency: "PHP" },
  projects: [],
  estimates: [],
  costLibraryItems: [],
  proposalSnapshots: [],
};

describe("JsonFileStore", () => {
  test("writes validated local database JSON atomically", async () => {
    const dir = await mkdtemp(join(tmpdir(), "archestimator-repo-"));
    const filePath = join(dir, "runtime.json");
    await writeFile(filePath, JSON.stringify(database), "utf8");

    try {
      const repository = new JsonFileStore(filePath);
      await repository.saveDatabase({
        ...database,
        projects: [{ id: "project_1", name: "Saved", clientName: "Client", location: "Manila", status: "active", currentEstimateId: "estimate_1" }],
      });

      const written = JSON.parse(await readFile(filePath, "utf8"));
      expect(written.projects[0].name).toBe("Saved");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const publicRepository = readFileSync("src/lib/publication/public-repository.ts", "utf8");

describe("project publication public repository", () => {
  it("keeps password verification server-side and increments open counters with public events", () => {
    expect(publicRepository).toContain("verifyProjectPublicationPasswordByToken");
    expect(publicRepository).toContain("verifyPublicationPassword");
    expect(publicRepository).toContain("resolveProjectPublicationAccessByToken");
    expect(publicRepository).toContain("resolveProjectPublicationSnapshotByToken");
    expect(publicRepository).toContain('.select("id, status, password_hash, expires_at, revoked_at, snapshot_version")');
    expect(publicRepository).toContain('rpc("increment_project_publication_open"');
  });
});

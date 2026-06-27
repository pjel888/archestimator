import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const migrationDryRun = JSON.parse(readFileSync(join(
  process.cwd(),
  ".ai/03_plans/2026-06-26-File-Upload-Audit-And-Improvement/evidence/upload-provider-migration-dry-run.json",
), "utf8")) as {
  proofBoundary: string;
  projectId: string;
  passed: boolean;
  source: string;
  command: string;
  exit: number;
  observedSignals: string[];
  providerMigrationDrift: unknown[];
  latestLocalAlignment: {
    componentImagesPrivateMigrationProviderVersion: string;
    componentImagesPrivateMigrationLocalPath: string;
  };
  evidenceLimitations: string[];
};

describe("upload provider migration dry-run evidence", () => {
  it("records linked Supabase dry-run parity without overstating provider portability", () => {
    expect(migrationDryRun).toMatchObject({
      proofBoundary: "linked-provider-dry-run",
      projectId: "ebxxqidacheyapmmzavr",
      passed: true,
      source: "supabase db push --linked --dry-run",
      command: "supabase db push --linked --dry-run",
      exit: 0,
    });
    expect(migrationDryRun.observedSignals).toEqual(expect.arrayContaining([
      "DRY RUN: migrations will *not* be pushed to the database.",
      "Remote database is up to date.",
    ]));
    expect(migrationDryRun.providerMigrationDrift).toEqual([]);
    expect(migrationDryRun.latestLocalAlignment).toMatchObject({
      componentImagesPrivateMigrationProviderVersion: "20260627010904",
      componentImagesPrivateMigrationLocalPath: "supabase/migrations/20260627010904_20260627120000_make_component_images_private.sql",
    });
    expect(migrationDryRun.evidenceLimitations.join(" ")).toContain("does not prove signed or resumable upload provider flows");
    expect(migrationDryRun.evidenceLimitations.join(" ")).toContain("does not prove S3-like multipart parity");
  });
});

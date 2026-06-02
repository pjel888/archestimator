import { describe, expect, it } from "vitest";

import {
  REQUIRED_LAUNCH_MIGRATIONS,
  checkSupabaseMigrationReadiness,
  parseSupabaseMigrationList,
} from "@/../scripts/check-supabase-migration-readiness";

const MIGRATION_LIST_WITH_LOCAL_ONLY_LAUNCH_ROWS = `
   Local          | Remote         | Time (UTC)
  ----------------|----------------|---------------------
   20260601043000 | 20260601043000 | 2026-06-01 04:30:00
   20260601182522 |                | 2026-06-01 18:25:22
   20260601184343 |                | 2026-06-01 18:43:43
   20260602005649 |                | 2026-06-02 00:56:49
   20260602083000 |                | 2026-06-02 08:30:00
   20260602084500 |                | 2026-06-02 08:45:00

A new version of Supabase CLI is available
`;

describe("Supabase migration readiness checker", () => {
  it("parses Supabase migration list rows without retaining warning text", () => {
    const rows = parseSupabaseMigrationList(MIGRATION_LIST_WITH_LOCAL_ONLY_LAUNCH_ROWS);

    expect(rows).toHaveLength(6);
    expect(rows[1]).toEqual({
      local: "20260601182522",
      remote: null,
      timeUtc: "2026-06-01 18:25:22",
    });
  });

  it("fails closed when required launch migrations are local-only", () => {
    const result = checkSupabaseMigrationReadiness({
      input: MIGRATION_LIST_WITH_LOCAL_ONLY_LAUNCH_ROWS,
      source: "test",
      projectRef: "ebxxqidacheyapmmzavr",
    });

    expect(result.linkedMigrationsReady).toBe(false);
    expect(result.requiredMigrations).toEqual([...REQUIRED_LAUNCH_MIGRATIONS]);
    expect(result.missingRemoteMigrations).toEqual([...REQUIRED_LAUNCH_MIGRATIONS]);
    expect(result.localOnlyRequiredMigrations).toEqual([...REQUIRED_LAUNCH_MIGRATIONS]);
    expect(result.remoteVersions).toContain("20260601043000");
    expect(JSON.stringify(result)).not.toContain("new version");
  });

  it("passes only when all required launch migrations appear remotely", () => {
    const rows = REQUIRED_LAUNCH_MIGRATIONS.map((version) => (
      `   ${version} | ${version} | 2026-06-02 00:00:00`
    )).join("\n");
    const result = checkSupabaseMigrationReadiness({
      input: rows,
      source: "test",
    });

    expect(result.linkedMigrationsReady).toBe(true);
    expect(result.missingRemoteMigrations).toEqual([]);
    expect(result.localOnlyRequiredMigrations).toEqual([]);
  });

  it("does not treat unparsable migration text as ready", () => {
    const result = checkSupabaseMigrationReadiness({
      input: "Connecting to remote database failed before table output.",
      source: "test",
    });

    expect(result.parsedRows).toBe(0);
    expect(result.linkedMigrationsReady).toBe(false);
    expect(result.missingRemoteMigrations).toEqual([...REQUIRED_LAUNCH_MIGRATIONS]);
  });
});

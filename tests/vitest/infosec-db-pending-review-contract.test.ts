import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, join, relative } from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();
const migrationsDir = join(repoRoot, "supabase/migrations");
const pendingReviewDir = join(repoRoot, "supabase/migrations-pending-review");
const archestimatorProjectId = "ebxxqidacheyapmmzavr";

function read(relativePath: string) {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

function listFiles(dir: string): string[] {
  return readdirSync(dir)
    .flatMap((entry) => {
      const fullPath = join(dir, entry);
      if (statSync(fullPath).isDirectory()) return listFiles(fullPath);
      return [fullPath];
    })
    .sort();
}

describe("InfoSec DB pending-review migration gate", () => {
  it("keeps pending-review SQL outside the auto-applied Supabase migrations path", () => {
    expect(existsSync(pendingReviewDir)).toBe(true);

    const pendingSql = listFiles(pendingReviewDir).filter((file) => file.endsWith(".sql"));
    expect(pendingSql.length).toBeGreaterThan(0);

    const appliedMigrationNames = new Set(
      readdirSync(migrationsDir).filter((entry) => entry.endsWith(".sql")),
    );

    for (const file of pendingSql) {
      const repoRelative = relative(repoRoot, file).replace(/\\/g, "/");
      expect(repoRelative).toMatch(/^supabase\/migrations-pending-review\//);
      expect(appliedMigrationNames.has(basename(file))).toBe(false);
    }
  });

  it("documents that provider apply is off by default and requires review evidence", () => {
    const readme = read("supabase/migrations-pending-review/README.md");
    const executionOrder = read("supabase/migrations-pending-review/AC-MOD-T4-EXECUTION_ORDER.md");

    expect(readme).toContain("OUTSIDE");
    expect(readme).toContain("supabase/migrations/");
    expect(readme).toContain("will **not** auto-apply");
    expect(readme).toContain("Do **not** re-apply");
    expect(readme).toContain(archestimatorProjectId);

    expect(executionOrder).toContain("Provider apply is OFF by default");
    expect(executionOrder).toContain("project `ebxxqidacheyapmmzavr`");
    expect(executionOrder).toContain("apply it in a maintenance window");
  });

  it("keeps destructive pending-review units guarded by preflight, post-check, and rollback notes", () => {
    const riskyUnits = [
      "supabase/migrations-pending-review/AC-MOD-T4-P1_shared_link_telemetry_retention.sql",
      "supabase/migrations-pending-review/AC-MOD-T4-P2_drop_redundant_token_hash_indexes.sql",
      "supabase/migrations-pending-review/AC-MOD-T4-P7_security_rate_limit_gc.sql",
    ];

    for (const unit of riskyUnits) {
      const sql = read(unit);
      expect(sql).toMatch(/DO NOT AUTO-APPLY/i);
      expect(sql).toMatch(/PRE-FLIGHT/i);
      expect(sql).toMatch(/POST-CHECK/i);
      expect(sql).toMatch(/ROLLBACK/i);
    }

    const tokenIndexDrop = read("supabase/migrations-pending-review/AC-MOD-T4-P2_drop_redundant_token_hash_indexes.sql");
    expect(tokenIndexDrop).toContain("DROP INDEX CONCURRENTLY IF EXISTS");
    expect(tokenIndexDrop).toContain("idx_scan = 0");
    expect(tokenIndexDrop).toContain("project_publications_token_hash_idx");
    expect(tokenIndexDrop).toContain("shared_link_recipients_token_hash_idx");

    for (const unit of [riskyUnits[0], riskyUnits[2]]) {
      const sql = read(unit);
      expect(sql).toContain("pg_cron schedule is COMMENTED OUT");
      expect(sql).toContain(`Target: project \`${archestimatorProjectId}\``);
      expect(sql).toContain("Restore from logical/PITR backup");
    }
  });

  it("records deferred and superseded SQL as non-release inputs", () => {
    const readme = read("supabase/migrations-pending-review/README.md");
    const deferredChartRpc = read("supabase/migrations-pending-review/deferred/20260614021500_get_project_chart_buckets_rpc.sql");

    expect(readme).toContain("deferred/20260528103341_ai_package_builder_memory.sql");
    expect(readme).toContain("Deferred while `AI_PACKAGE_BUILDER_MEMORY_ENABLED` remains default-off");
    expect(readme).toContain("deferred/20260614021500_get_project_chart_buckets_rpc.sql");
    expect(readme).toContain("Needs explicit public/anon execute revokes before apply");
    expect(deferredChartRpc).toContain(
      "revoke all on function public.get_project_chart_buckets(uuid[], text) from public, anon, authenticated",
    );
    expect(deferredChartRpc).toContain("grant execute on function public.get_project_chart_buckets(uuid[], text) to authenticated");
    expect(readme).toContain("superseded/20260611031500_estimate_node_sibling_order_stored.sql");
    expect(readme).toContain("do not apply as-is");
  });
});

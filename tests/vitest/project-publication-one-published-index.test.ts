import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync("supabase/migrations-pending-review/AC-MOD-06_one_published_publication_per_project.sql", "utf8");

describe("AC-MOD-06 one published publication per project", () => {
  it("requires a duplicate preflight before creating the partial unique index", () => {
    expect(migration).toMatch(/STEP 0\s*—?\s*detect existing duplicates/i);
    expect(migration).toContain("GROUP BY project_id");
    expect(migration).toContain("HAVING count(*) > 1");
  });

  it("documents a duplicate reconciliation step that keeps the newest published row", () => {
    expect(migration).toMatch(/STEP 0b\s*—?\s*reconcile duplicates/i);
    expect(migration).toContain("row_number() OVER (PARTITION BY project_id ORDER BY published_at DESC, id DESC)");
    expect(migration).toContain("SET status = 'revoked'");
    expect(migration).toContain("revoked_at = now()");
  });

  it("creates a partial unique index on project_id for published rows only", () => {
    expect(migration).toContain("CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS");
    expect(migration).toContain("project_publications_one_published_per_project_idx");
    expect(migration).toContain("ON public.project_publications (project_id)");
    expect(migration).toContain("WHERE status = 'published'");
  });

  it("includes a post-check to confirm the index exists", () => {
    expect(migration).toMatch(/POST-CHECK:/i);
    expect(migration).toContain("pg_indexes");
    expect(migration).toContain("project_publications_one_published_per_project_idx");
  });

  it("includes a rollback statement to drop the partial unique index", () => {
    expect(migration).toMatch(/ROLLBACK:/i);
    expect(migration).toContain("DROP INDEX CONCURRENTLY IF EXISTS public.project_publications_one_published_per_project_idx");
  });

  it("references the existing non-unique index that the migration hardens", () => {
    expect(migration).toContain("project_publications_project_status_idx");
    expect(migration).toContain("project_id, status, published_at desc");
  });

  it("warns that the migration must not be auto-applied and requires preflight", () => {
    expect(migration).toMatch(/DO NOT AUTO-APPLY/i);
    expect(migration).toMatch(/PRE-FLIGHT IS MANDATORY/i);
  });
});

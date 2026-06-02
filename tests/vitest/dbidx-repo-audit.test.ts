import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const script = readFileSync("scripts/audit-dbidx-repo.ts", "utf8");
const artifactPath = ".ai/09_archive/store/2026-06-02-CODEX-P0-DBIDX-001/repo-only-query-index-audit.md";

describe("repo-only DBIDX audit", () => {
  it("keeps the audit helper local-only and non-mutating", () => {
    expect(script).toContain("supabase/migrations");
    expect(script).toContain("src/lib/repositories");
    expect(script).toContain("src/lib/publication");
    expect(script).toContain("src/lib/collaboration");
    expect(script).toContain("src/lib/ai");
    expect(script).not.toContain("node:child_process");
    expect(script).not.toContain("supabase db");
    expect(script).not.toContain("CREATE INDEX CONCURRENTLY");
  });

  it("records the required DBIDX-001 sections without fabricating live metrics", () => {
    expect(existsSync(artifactPath)).toBe(true);
    const artifact = readFileSync(artifactPath, "utf8");

    expect(artifact).toContain("Output 1: repo-derived query map");
    expect(artifact).toContain("Output 2: migration-derived index inventory");
    expect(artifact).toContain("Output 3: live metrics");
    expect(artifact).toContain("Output 4: live-metrics-unavailable note");
    expect(artifact).toContain("Live Supabase metrics were not collected");
    expect(artifact).toContain("does not fabricate Supabase advisor findings");
    expect(artifact).toContain("`estimate_nodes`");
    expect(artifact).toContain("`estimate_row_items`");
    expect(artifact).toContain("`cost_library_items`");
    expect(artifact).toContain("`project_publications`");
    expect(artifact).toContain("`shared_link_recipients`");
    expect(artifact).toContain("projects_workspace_updated_at_idx");
    expect(artifact).toContain("project_publication_events_publication_created_idx");
  });
});

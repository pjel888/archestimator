import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const repositoryPath = "src/lib/repositories/project-activity-feed-repository.ts";

describe("project activity feed repository contract", () => {
  it("uses Cloudflare D1 for collaboration audit reads", () => {
    const source = readFileSync(repositoryPath, "utf8");

    expect(source).toContain('import "server-only"');
    expect(source).toContain("getCloudflareD1Database");
    expect(source).toContain("FROM collaboration_audit_events");
    expect(source).not.toContain('rpc("read_project_collaboration_audit_events"');
    expect(source).not.toContain("createSupabaseServerClient");
    expect(source).not.toContain("@/lib/supabase/server");
    expect(source).not.toContain("service_role");
    expect(source).not.toContain("supabaseAdmin");
  });

  it("does not select recipient email into the activity page DTO path", () => {
    const source = readFileSync(repositoryPath, "utf8");

    expect(source).not.toMatch(/shared_link_recipients[\s\S]{0,220}email/);
    expect(source).not.toContain("author_email");
    expect(source).not.toContain("recipient.email");
  });

  it("uses exact source counts outside the pagination cursor", () => {
    const source = readFileSync(repositoryPath, "utf8");

    expect(source).toContain("SELECT COUNT(*) AS count FROM estimate_sheet_events");
    expect(source).toContain("SELECT COUNT(*) AS count FROM shared_link_comments");
    expect(source).toContain("SELECT COUNT(*) AS count FROM collaboration_audit_events");
    expect(source).toContain("readExactCounts");
    expect(source).toContain("collaborationEventTypesForActions");
    expect(source).not.toContain('{ count: "exact", head: true }');
    expect(source).not.toContain("estimateCount(");
    expect(source).not.toContain("deriveCounts(");
  });
});

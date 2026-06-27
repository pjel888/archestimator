import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const sql = readFileSync("scripts/sql/linked-supabase-launch-readiness.sql", "utf8");

describe("linked Supabase launch readiness SQL", () => {
  it("stays read-only", () => {
    const withoutComments = sql
      .replace(/--.*$/gm, "")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/'([^']|'')*'/g, "''");

    expect(withoutComments).not.toMatch(/\b(insert|update|delete|alter|create|drop|truncate|grant|revoke|call|perform)\b/i);
  });

  it("checks the launch-critical local-only migrations and objects", () => {
    for (const version of ["20260601182522", "20260601184343", "20260602005649", "20260602083000", "20260602084500"]) {
      expect(sql).toContain(version);
    }

    expect(sql).toContain("closed_beta_allowed_emails");
    expect(sql).toContain("beta_feedback_submissions");
    expect(sql).toContain("check_closed_beta_access");
    expect(sql).toContain("unlink_estimate_row_item_from_library_with_history");
  });

  it("checks private table grants, RLS, and approved storage bucket posture", () => {
    expect(sql).toContain("relrowsecurity");
    expect(sql).toContain("has_table_privilege('anon'");
    expect(sql).toContain("has_function_privilege('anon'");
    expect(sql).toContain("storage.buckets");
    expect(sql).toContain("('component-images', false)");
    expect(sql).toContain("('project-images', false)");
    expect(sql).toContain("launch_readiness_passed");
  });
});

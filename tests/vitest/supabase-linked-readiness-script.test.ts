import { describe, expect, it } from "vitest";

import {
  checkSupabaseLinkedReadiness,
  parseSupabaseLinkedReadinessRows,
} from "../../scripts/check-supabase-linked-readiness";

const failingRows = [
  {
    category: "summary",
    check_name: "launch_readiness_passed",
    expected: "all read-only checks passed",
    actual: "failed",
    passed: false,
    details: { total_checks: 11, failed_checks: 9 },
  },
  {
    category: "migration",
    check_name: "20260601182522_closed_beta_allowed_emails",
    expected: "present in supabase_migrations.schema_migrations",
    actual: "missing",
    passed: false,
    details: { version: "20260601182522" },
  },
  {
    category: "table",
    check_name: "public.closed_beta_allowed_emails",
    expected: "table exists with row level security enabled",
    actual: "missing",
    passed: false,
    details: { table: "closed_beta_allowed_emails" },
  },
  {
    category: "grant",
    check_name: "public.closed_beta_allowed_emails:anon_select",
    expected: "anon must not have select on private beta tables",
    actual: "table_missing",
    passed: false,
    details: { role: "anon" },
  },
  {
    category: "function",
    check_name: "public.check_closed_beta_access",
    expected: "function exists and is not executable by anon",
    actual: "missing",
    passed: false,
    details: { function: "check_closed_beta_access" },
  },
  {
    category: "storage",
    check_name: "storage.buckets.component-images:public",
    expected: "bucket should be private unless explicitly approved",
    actual: "public",
    passed: false,
    details: { bucket: "component-images", public: true },
  },
];

const passingRows = [
  { category: "summary", check_name: "launch_readiness_passed", expected: "all read-only checks passed", actual: "passed", passed: true, details: {} },
  { category: "migration", check_name: "20260601182522_closed_beta_allowed_emails", expected: "present", actual: "20260601182522", passed: true, details: {} },
  { category: "table", check_name: "public.closed_beta_allowed_emails", expected: "rls", actual: "exists_rls_enabled", passed: true, details: {} },
  { category: "grant", check_name: "public.closed_beta_allowed_emails:anon_select", expected: "deny", actual: "anon_cannot_select", passed: true, details: {} },
  { category: "function", check_name: "public.check_closed_beta_access", expected: "deny anon", actual: "exists_anon_cannot_execute", passed: true, details: {} },
  { category: "storage", check_name: "storage.buckets.component-images:public", expected: "private", actual: "private", passed: true, details: {} },
];

describe("Supabase linked readiness script", () => {
  it("parses direct row arrays from the read-only SQL output", () => {
    const parsed = parseSupabaseLinkedReadinessRows(JSON.stringify(failingRows));

    expect(parsed.parseError).toBeNull();
    expect(parsed.rows).toHaveLength(failingRows.length);
    expect(parsed.rows[0]).toMatchObject({
      category: "summary",
      check_name: "launch_readiness_passed",
      passed: false,
    });
  });

  it("parses common CLI JSON envelopes around row arrays", () => {
    const parsed = parseSupabaseLinkedReadinessRows(`warning\n${JSON.stringify({ data: failingRows })}`);

    expect(parsed.parseError).toBeNull();
    expect(parsed.rows.map((row) => row.category)).toContain("storage");
  });

  it("summarizes failed migrations, grants, functions, and storage posture", () => {
    const result = checkSupabaseLinkedReadiness({
      input: JSON.stringify(failingRows),
      source: "fixture",
      projectRef: "ebxxqidacheyapmmzavr",
    });

    expect(result.projectRef).toBe("ebxxqidacheyapmmzavr");
    expect(result.parsedLinkedReadiness).toBe(true);
    expect(result.summaryPassed).toBe(false);
    expect(result.linkedSupabaseLaunchReady).toBe(false);
    expect(result.failedChecks).toContain("migration:20260601182522_closed_beta_allowed_emails=missing");
    expect(result.failedChecks).toContain("storage:storage.buckets.component-images:public=public");
    expect(result.categorySummary.storage).toEqual({ total: 1, failed: 1 });
  });

  it("passes only when every required category exists and the summary row passes", () => {
    const result = checkSupabaseLinkedReadiness({ input: JSON.stringify(passingRows) });

    expect(result.failedChecks).toEqual([]);
    expect(result.missingCategories).toEqual([]);
    expect(result.summaryPassed).toBe(true);
    expect(result.linkedSupabaseLaunchReady).toBe(true);
  });

  it("fails closed on linked CLI temp-role pooler errors", () => {
    const result = checkSupabaseLinkedReadiness({
      input: "FATAL: (ECIRCUITBREAKER) too many authentication failures\nConnect to your database by setting the env var correctly: SUPABASE_DB_PASSWORD",
    });

    expect(result.parsedLinkedReadiness).toBe(false);
    expect(result.blockedReason).toBe("Supabase temp-role pooler ECIRCUITBREAKER.");
    expect(result.linkedSupabaseLaunchReady).toBe(false);
    expect(result.parseError).toContain("No JSON");
  });
});

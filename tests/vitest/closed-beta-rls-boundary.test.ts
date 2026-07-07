import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  "supabase/migrations/20260616143000_enforce_closed_beta_at_rls_boundary.sql",
  "utf8",
);

describe("closed beta RLS boundary", () => {
  it("adds a database-local beta access helper backed by the allowlist table", () => {
    expect(migration).toContain("create or replace function public.has_closed_beta_access()");
    expect(migration).toContain("from public.closed_beta_allowed_emails beta");
    expect(migration).toContain("beta.status in ('invited', 'active')");
    expect(migration).toContain("revoke all on function public.has_closed_beta_access() from public, anon, authenticated");
    expect(migration).toContain("grant execute on function public.has_closed_beta_access() to authenticated");
  });

  it("gates workspace bootstrap and central RLS helper functions on beta access", () => {
    expect(migration).toContain(
      "with check (created_by = (select auth.uid()) and public.has_closed_beta_access())",
    );

    for (const functionName of [
      "is_workspace_member",
      "is_workspace_admin",
      "is_workspace_editor",
      "can_access_project",
      "can_edit_project",
      "can_access_estimate",
      "can_edit_estimate",
    ]) {
      const start = migration.indexOf(`create or replace function public.${functionName}`);
      expect(start).toBeGreaterThanOrEqual(0);
      const redefinition = migration.slice(start);
      expect(redefinition).toContain("public.has_closed_beta_access()");
    }

    expect(migration).toContain("create or replace function public.current_project_access_rank");
    expect(migration).toContain("create or replace function public.current_estimate_access_rank");
    expect(migration).toContain("when not public.has_closed_beta_access() then 0");
  });
});

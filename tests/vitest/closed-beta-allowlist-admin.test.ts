import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  CLOSED_BETA_ALLOWLIST_STATUSES,
  isClosedBetaAllowlistStatus,
  parseClosedBetaAllowlistCreate,
  parseClosedBetaAllowlistUpdate,
} from "@/lib/auth/beta-allowlist-admin";

const migration = readFileSync("supabase/migrations/20260602005649_beta_allowlist_admin_queue.sql", "utf8");
const hardeningMigration = readFileSync("supabase/migrations/20260602090000_harden_beta_allowlist_admin.sql", "utf8");
const pageSource = readFileSync("src/app/workshop/settings/beta-users/page.tsx", "utf8");
const helperSource = readFileSync("src/lib/auth/beta-allowlist-admin.ts", "utf8");
const actionSource = readFileSync("src/lib/auth/beta-allowlist-admin-actions.ts", "utf8");
const typesSource = readFileSync("src/lib/supabase/types.ts", "utf8");

describe("closed beta allowlist admin", () => {
  it("keeps the status contract narrow", () => {
    expect(CLOSED_BETA_ALLOWLIST_STATUSES).toEqual(["invited", "active", "revoked"]);
    expect(isClosedBetaAllowlistStatus("active")).toBe(true);
    expect(isClosedBetaAllowlistStatus("deleted")).toBe(false);
  });

  it("parses create and update forms without rewriting plus-addressed emails", () => {
    const create = new FormData();
    create.set("email", "  Beta+Pilot@Example.COM ");
    create.set("status", "invited");
    create.set("notes", "Investor reviewer");

    expect(parseClosedBetaAllowlistCreate(create)).toEqual({
      ok: true,
      email: "beta+pilot@example.com",
      notes: "Investor reviewer",
      status: "invited",
    });

    create.set("status", "deleted");
    expect(parseClosedBetaAllowlistCreate(create)).toEqual({ ok: false });

    const update = new FormData();
    update.set("id", "row-1");
    update.set("status", "revoked");
    update.set("notes", "Paused");
    expect(parseClosedBetaAllowlistUpdate(update)).toEqual({
      ok: true,
      id: "row-1",
      notes: "Paused",
      status: "revoked",
    });
  });

  it("hardened allowlist access uses RPCs instead of direct authenticated table grants", () => {
    expect(migration).toContain('create policy "platform admins can review closed beta allowlist"');
    expect(hardeningMigration).toContain("revoke insert, update, delete on table public.profiles from authenticated");
    expect(hardeningMigration).toContain("grant update (display_name, default_workspace_id) on table public.profiles to authenticated");
    expect(hardeningMigration).toContain("revoke all on table public.closed_beta_allowed_emails from anon, authenticated");
    expect(hardeningMigration).toContain('drop policy if exists "platform admins can review closed beta allowlist"');
    expect(hardeningMigration).toContain("create or replace function public.read_closed_beta_allowlist_queue");
    expect(hardeningMigration).toContain("create or replace function public.create_closed_beta_allowlist_entry");
    expect(hardeningMigration).toContain("create or replace function public.update_closed_beta_allowlist_entry");
    expect(hardeningMigration).toContain("actor_id uuid := auth.uid()");
    expect(hardeningMigration).toContain("if actor_id is null or not public.is_platform_admin() then");
    expect(hardeningMigration).toContain("grant execute on function public.create_closed_beta_allowlist_entry(text, text, text) to authenticated");
    expect(hardeningMigration).not.toContain("grant delete");
  });

  it("keeps app management platform-admin scoped and route-backed", () => {
    expect(helperSource).toContain('role === "ceo" || role === "admin"');
    expect(helperSource).toContain('rpc("read_closed_beta_allowlist_queue"');
    expect(actionSource).toContain("canManageClosedBetaAllowlist");
    expect(actionSource).toContain('rpc("create_closed_beta_allowlist_entry"');
    expect(actionSource).toContain('rpc("update_closed_beta_allowlist_entry"');
    expect(pageSource).toContain("Only platform admins can manage beta users.");
    expect(pageSource).toContain("Manage the closed beta email allowlist");
    expect(pageSource).toContain("Showing {queue.rows.length} latest beta allowlist rows.");
    expect(typesSource).toContain("closed_beta_allowed_emails: {");
    expect(typesSource).toContain("read_closed_beta_allowlist_queue: {");
    expect(typesSource).toContain("create_closed_beta_allowlist_entry: {");
    expect(typesSource).toContain("update_closed_beta_allowlist_entry: {");
  });
});

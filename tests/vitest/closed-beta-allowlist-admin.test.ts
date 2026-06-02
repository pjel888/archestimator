import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  CLOSED_BETA_ALLOWLIST_STATUSES,
  isClosedBetaAllowlistStatus,
  parseClosedBetaAllowlistCreate,
  parseClosedBetaAllowlistUpdate,
} from "@/lib/auth/beta-allowlist-admin";

const migration = readFileSync("supabase/migrations/20260602005649_beta_allowlist_admin_queue.sql", "utf8");
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

  it("opens allowlist table access only to platform admins", () => {
    expect(migration).toContain("grant select on table public.closed_beta_allowed_emails to authenticated");
    expect(migration).toContain("grant insert (normalized_email, status, invited_by, notes, metadata)");
    expect(migration).toContain("grant update (status, notes, metadata)");
    expect(migration).toContain('create policy "platform admins can review closed beta allowlist"');
    expect(migration).toContain("for select");
    expect(migration).toContain("using (public.is_platform_admin())");
    expect(migration).toContain('create policy "platform admins can add closed beta allowlist rows"');
    expect(migration).toContain("for insert");
    expect(migration).toContain("with check (public.is_platform_admin())");
    expect(migration).toContain('create policy "platform admins can update closed beta allowlist rows"');
    expect(migration).toContain("for update");
    expect(migration).not.toContain("grant delete");
  });

  it("keeps app management platform-admin scoped and route-backed", () => {
    expect(helperSource).toContain('role === "ceo" || role === "admin"');
    expect(helperSource).toContain('from("closed_beta_allowed_emails")');
    expect(actionSource).toContain("canManageClosedBetaAllowlist");
    expect(actionSource).toContain('from("closed_beta_allowed_emails").insert');
    expect(actionSource).toContain("update({");
    expect(pageSource).toContain("Only platform admins can manage beta users.");
    expect(pageSource).toContain("Manage the closed beta email allowlist");
    expect(pageSource).toContain("Showing {queue.rows.length} latest beta allowlist rows.");
    expect(typesSource).toContain("closed_beta_allowed_emails: {");
  });
});

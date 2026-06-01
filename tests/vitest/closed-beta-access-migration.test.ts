import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

function readClosedBetaMigration() {
  const file = readdirSync("supabase/migrations").find((name) => name.endsWith("_closed_beta_allowed_emails.sql"));
  if (!file) throw new Error("Closed beta allowlist migration was not found.");
  return readFileSync(join("supabase/migrations", file), "utf8");
}

describe("closed beta allowlist migration", () => {
  it("creates the allowlist table with the expected status contract", () => {
    const migration = readClosedBetaMigration();

    expect(migration).toContain("create table if not exists public.closed_beta_allowed_emails");
    expect(migration).toContain("normalized_email text not null");
    expect(migration).toContain("status text not null");
    expect(migration).toContain("check (status in ('invited', 'active', 'revoked'))");
    expect(migration).toContain("unique (normalized_email)");
    expect(migration).toContain("invited_by uuid references auth.users(id)");
    expect(migration).toContain("metadata jsonb not null default '{}'::jsonb");
  });

  it("enables RLS without exposing allowlist enumeration to normal users", () => {
    const migration = readClosedBetaMigration();

    expect(migration).toContain("alter table public.closed_beta_allowed_emails enable row level security");
    expect(migration).toContain("revoke all on public.closed_beta_allowed_emails from anon, authenticated");
    expect(migration).not.toContain("grant select on public.closed_beta_allowed_emails to authenticated");
    expect(migration).not.toContain("create policy");
  });

  it("defines a security-definer access RPC constrained to the caller email", () => {
    const migration = readClosedBetaMigration();

    expect(migration).toContain("create or replace function public.check_closed_beta_access(raw_email text)");
    expect(migration).toContain("security definer");
    expect(migration).toContain("set search_path = ''");
    expect(migration).toContain("auth.jwt() ->> 'email'");
    expect(migration).toContain("grant execute on function public.check_closed_beta_access(text) to authenticated");
    expect(migration).not.toContain("grant execute on function public.check_closed_beta_access(text) to anon");
  });
});

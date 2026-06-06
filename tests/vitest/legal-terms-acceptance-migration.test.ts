import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

function readTermsAcceptanceMigration() {
  const migrationsDir = join(process.cwd(), "supabase/migrations");
  const fileName = readdirSync(migrationsDir)
    .filter((entry) => entry.endsWith(".sql"))
    .find((entry) => readFileSync(join(migrationsDir, entry), "utf8").includes("legal_terms_acceptances"));

  if (!fileName) return null;
  return {
    fileName,
    sql: readFileSync(join(migrationsDir, fileName), "utf8"),
  };
}

describe("legal Terms acceptance migration", () => {
  it("creates an append-only authenticated acceptance table with version evidence", () => {
    const migration = readTermsAcceptanceMigration();

    expect(migration, "missing migration containing legal_terms_acceptances").not.toBeNull();
    expect(migration?.fileName).toMatch(/legal_terms_acceptance|terms_acceptance/);
    expect(migration?.sql).toMatch(/create table (if not exists )?public\.legal_terms_acceptances/i);
    expect(migration?.sql).toMatch(/user_id uuid not null/i);
    expect(migration?.sql).toMatch(/terms_key text not null/i);
    expect(migration?.sql).toMatch(/terms_version text not null/i);
    expect(migration?.sql).toMatch(/terms_effective_date date not null/i);
    expect(migration?.sql).toMatch(/terms_content_hash text not null/i);
    expect(migration?.sql).toMatch(/privacy_policy_version text not null/i);
    expect(migration?.sql).toMatch(/accepted_at timestamptz not null default now\(\)/i);
    expect(migration?.sql).toMatch(/unique\s*\(\s*user_id\s*,\s*terms_key\s*,\s*terms_version\s*\)/i);
    expect(migration?.sql).not.toMatch(/\bip_address\b/i);
    expect(migration?.sql).not.toMatch(/\buser_agent\b(?!_)/i);
  });

  it("enables least-privilege RLS without user update/delete policies", () => {
    const migration = readTermsAcceptanceMigration();
    const sql = migration?.sql ?? "";

    expect(existsSync(join(process.cwd(), "src/lib/supabase/types.ts"))).toBe(true);
    expect(sql).toMatch(/alter table public\.legal_terms_acceptances enable row level security/i);
    expect(sql).toMatch(/revoke all on public\.legal_terms_acceptances from public/i);
    expect(sql).toMatch(/revoke all on public\.legal_terms_acceptances from anon/i);
    expect(sql).toMatch(/grant select on public\.legal_terms_acceptances to authenticated/i);
    expect(sql).not.toMatch(/grant insert on public\.legal_terms_acceptances to authenticated/i);
    expect(sql).not.toMatch(/grant .* on public\.legal_terms_acceptances to anon/i);
    expect(sql).toMatch(/for select to authenticated[\s\S]*\(select auth\.uid\(\)\) = user_id/i);
    expect(sql).not.toMatch(/for insert to authenticated/i);
    expect(sql).not.toMatch(/for update to authenticated/i);
    expect(sql).not.toMatch(/for delete to authenticated/i);
  });
});

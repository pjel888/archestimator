import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function latestMigration(suffix: string) {
  const migration = readdirSync(join(process.cwd(), "supabase/migrations"))
    .filter((file) => file.endsWith(suffix))
    .sort()
    .at(-1);
  if (!migration) throw new Error(`Missing migration: ${suffix}`);
  return readFileSync(join(process.cwd(), "supabase/migrations", migration), "utf8");
}

const migration = latestMigration("_library_trust_governance.sql");
const variantAssetsMigration = latestMigration("_component_variant_assets_cost_entries.sql");
const d1ActionSupportMigration = readFileSync(join(process.cwd(), "migrations/0028_component_library_action_support.sql"), "utf8");
const actions = readFileSync(join(process.cwd(), "src/lib/component-library/actions.ts"), "utf8");

describe("component library cost governance actions", () => {
  it("adds durable cost-review status, assignments, locks, and event history", () => {
    expect(migration).toContain("create type public.cost_library_cost_review_status as enum");
    expect(migration).toContain("'proposed'");
    expect(migration).toContain("'needs_review'");
    expect(migration).toContain("'accepted'");
    expect(migration).toContain("'rejected'");
    expect(migration).toContain("'superseded'");
    expect(migration).toContain("add column if not exists review_status public.cost_library_cost_review_status");
    expect(migration).toContain("add column if not exists assigned_to uuid references auth.users(id) on delete set null");
    expect(migration).toContain("add column if not exists locked_by uuid references auth.users(id) on delete set null");
    expect(migration).toContain("add column if not exists review_revision integer not null default 1");
    expect(migration).toContain("create table if not exists public.cost_library_cost_review_events");
    expect(migration).toContain("cost_library_cost_review_events_entry_idx");
  });

  it("hardens cost-entry writes behind admin-only revision-aware RPCs", () => {
    const rpcNames = [
      "assign_cost_library_cost_refresh",
      "accept_cost_library_cost_entry",
      "lock_cost_library_cost_entry",
      "unlock_cost_library_cost_entry",
      "reject_cost_library_cost_entry",
      "supersede_cost_library_cost_entry",
    ];

    expect(migration).toContain('drop policy if exists "members can manage variant cost entries"');
    expect(migration).toContain('create policy "members can view variant cost entries"');
    expect(migration).toContain("revoke all on public.cost_library_item_variant_cost_entries from public, anon, authenticated");
    expect(migration).toContain("grant select on public.cost_library_item_variant_cost_entries to authenticated");
    expect(migration).toContain("public.require_cost_library_governance_admin(target_row.workspace_id)");
    expect(migration).toContain("public.is_platform_admin() or public.is_workspace_admin(target_workspace_id)");

    for (const rpcName of rpcNames) {
      expect(migration).toContain(`create or replace function public.${rpcName}`);
      expect(migration).toContain(`grant execute on function public.${rpcName}`);
    }

    expect(migration.match(/expected_review_revision/g)?.length).toBeGreaterThanOrEqual(6);
    expect(migration.match(/for update/g)?.length).toBeGreaterThanOrEqual(8);
    expect(migration).toContain("raise exception 'Cost review revision conflict.' using errcode = '40001'");
  });

  it("keeps accepted-current selection deterministic with existing current-cost uniqueness", () => {
    expect(migration).toContain("cost_entries_one_accepted_current_per_option");
    expect(variantAssetsMigration).toContain("cost_library_variant_cost_entries_current_key");
    expect(migration).toContain("and competitor.is_current");
    expect(migration).not.toContain("and competitor.review_status = 'accepted'");
    expect(migration).toContain("competitor_prior_status := competitor_row.review_status");
    expect(migration).toContain("replacement_prior_status := replacement_row.review_status");
    expect(migration).toContain("active_cost_entry_id = target_row.id");
    expect(migration).toContain("active_cost_entry_id = replacement_row.id");
  });

  it("keeps active D1 cost-entry persistence aligned with the migrated governance subset", () => {
    expect(d1ActionSupportMigration).toContain("CREATE TABLE IF NOT EXISTS cost_library_item_variant_cost_entries");
    expect(d1ActionSupportMigration).toContain("unit_cost REAL NOT NULL DEFAULT 0 CHECK (unit_cost >= 0)");
    expect(d1ActionSupportMigration).toContain("misc_cost REAL NOT NULL DEFAULT 0 CHECK (misc_cost >= 0)");
    expect(d1ActionSupportMigration).toContain("is_current INTEGER NOT NULL DEFAULT 0 CHECK (is_current IN (0, 1))");
    expect(d1ActionSupportMigration).toContain("CREATE INDEX IF NOT EXISTS idx_cost_library_variant_cost_entries_option_current");
    expect(actions).toContain("INSERT INTO cost_library_item_variant_cost_entries");
    expect(actions).toContain("INSERT OR IGNORE INTO cost_library_item_price_history");
    expect(actions).not.toMatch(/assign_cost_library_cost_refresh|accept_cost_library_cost_entry|lock_cost_library_cost_entry|unlock_cost_library_cost_entry|reject_cost_library_cost_entry|supersede_cost_library_cost_entry|supabase\.rpc/);
  });
});

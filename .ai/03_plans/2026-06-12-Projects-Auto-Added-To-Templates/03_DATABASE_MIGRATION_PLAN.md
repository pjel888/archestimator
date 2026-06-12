# 03 — Database Migration Plan

**Date:** 2026-06-12 · **Scope:** local migration plan only. **No migration files are created by this pass.** Remote/linked Supabase apply is a separately authorized step (see §11).
Grounding: [01_CURRENT_STATE_AUDIT.md](01_CURRENT_STATE_AUDIT.md) §1–2, §12; architecture: [02_TARGET_ARCHITECTURE.md](02_TARGET_ARCHITECTURE.md) §3.

---

## 1. Current schema facts the migration must respect (verified)

- `estimate_nodes`: `id, estimate_id, parent_id, kind, name, sort_order, metadata, created_at, updated_at`; CHECK `kind in ('group','area')` (`supabase/migrations/20260520222038:5-26`); deferrable uniques `estimate_nodes_unique_sort (estimate_id, parent_id, sort_order)` (`20260518090000:93`) and `estimate_nodes_unique_sort_with_root … nulls not distinct` (`20260519192045:26-40`); index `estimate_nodes_estimate_parent_sort_idx` (`20260518090000:125`); constraint trigger `estimate_nodes_enforce_tree` → `validate_estimate_node_tree(estimate_id)` (`20260520222038:106-129`).
- `estimate_row_items`: unique `(node_id, sort_order)` deferrable (`20260518090000:117`); area-only trigger `estimate_row_items_enforce_area_node` (`20260520222038:131-156`); `row_revision` (`20260524033151:8-9`).
- RLS family: `can_access_estimate` / `can_edit_estimate` policies on estimates/nodes/rows (`20260526142913:726-754`) + platform-admin policies (`20260518100000:145-152`).
- updated_at convention: `public.set_updated_at()` trigger per table (`20260518090000:128-143`).
- History RPC family (SECURITY DEFINER) keys everything by `target_estimate_id` and authorizes via `resolve_estimate_workspace` (`20260524033151:77-122`).
- Dormant version stack: `estimate_sheet_snapshot` v2 (`20260524050746:131-180`), `create_estimate_sheet_version` (`:182-312`), `restore_estimate_sheet_version_as_copy` (`:1193-1454`) — zero app call sites (01 §12).
- Composite-FK precedent for cross-parent safety: `estimates(id, project_id)` unique + child composite FKs (`20260526142913:26-34, 57-79`); same-template composite FK in template tables (`20260522091621:30-31, 57-58`).
- Seed/RLS ordering precedent: `set constraints all immediate` before enabling RLS after seeding (`20260522091621:570-573`).

## 2. Schema options evaluated

### Option A — first-class `estimate_tabs` + `estimate_nodes.estimate_tab_id` (RECOMMENDED)

Insert a tab entity between estimates and nodes. Estimates keep their identity, URLs, collaboration, publication selection, export route, `sheet_code`.

- **Pros:** zero change to every surface keyed by `estimate_id` (collaboration tables, publications `selected_estimate_ids`, export route params, AI audit columns, invite deep links — 01 §11–14); backfill is additive; rollback is cheap; matches the product mental model (estimate = document, tabs = worksheets).
- **Cons:** touches the node unique-sort constraints and the tree-validation function; history RPCs need a tab-aware pass.

### Option B — treat each existing estimate as a tab; add a parent `estimate_group`/`estimate_package`

- **Rejected.** The estimate is load-bearing as the collaboration boundary (`estimate_sheet_members` PK `(estimate_id, user_id)`), the publication selection unit (`project_publications.selected_estimate_ids uuid[]`, `20260527120000:15-38`), the export route param, the AI audit target, and the invite deep-link target (`src/app/invite/[token]/page.tsx:68-72`). Re-parenting all of that under a new container is a far larger blast radius than Option A, breaks the "estimate = commercial/revision container" intent, and would force URL rewrites (`/estimates/[nodeId]` link builders key estimate ids). The share page already presents estimates as top-level tabs (`SharePageTabs.tsx:245`) — Option B would collapse two product concepts into one.

### Option C — alternatives discovered from the codebase

- **C1: virtual tabs via root-group convention** (treat each root group as a "tab", no schema change). Rejected: root groups are user-editable content ("Project Scope" seed, `actions.ts:992-1004`); users can have many root groups per logical worksheet; reordering/renaming semantics collide with tree editing; export naming becomes content-coupled; no place for tab metadata (is_default, archived_at).
- **C2: `estimate_nodes.metadata->>'tabId'` JSON tagging.** Rejected: no FK integrity, no indexable sort, invisible to RLS/constraints, and `validate_estimate_node_tree` could not enforce per-tab root rules cheaply.

**Decision: Option A**, as the prompt's favored direction — and the audit strengthens rather than disproves it.

## 3. Recommended DDL shape (to be written as a real migration in Phase 1, not now)

```sql
-- estimate_tabs
create table public.estimate_tabs (
  id          uuid primary key default gen_random_uuid(),
  estimate_id uuid not null references public.estimates(id) on delete cascade,
  name        text not null check (length(trim(name)) > 0),
  sort_order  integer not null default 0,
  is_default  boolean not null default false,
  archived_at timestamptz,
  metadata    jsonb not null default '{}'::jsonb,
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (estimate_id, id)                                   -- composite-FK anchor
);
create unique index estimate_tabs_one_default_per_estimate
  on public.estimate_tabs (estimate_id) where is_default;     -- exactly one default
create unique index estimate_tabs_estimate_sort_key
  on public.estimate_tabs (estimate_id, sort_order);          -- deterministic order (deferrable variant if reorder RPC needs it)
create index estimate_tabs_estimate_id_sort_idx
  on public.estimate_tabs (estimate_id, sort_order);
create trigger estimate_tabs_set_updated_at before update on public.estimate_tabs
  for each row execute function public.set_updated_at();

-- nodes gain the tab dimension (nullable first; NOT NULL after backfill)
alter table public.estimate_nodes add column estimate_tab_id uuid;
alter table public.estimate_nodes
  add constraint estimate_nodes_tab_same_estimate_fkey
  foreign key (estimate_id, estimate_tab_id)
  references public.estimate_tabs (estimate_id, id) on delete cascade;
create index estimate_nodes_tab_parent_sort_idx
  on public.estimate_nodes (estimate_tab_id, parent_id, sort_order);

-- events gain optional tab attribution
alter table public.estimate_sheet_events
  add column estimate_tab_id uuid references public.estimate_tabs(id) on delete set null;
```

Notes (directional guidance, not final SQL):
- `tab_code` omitted in v1 (02 §3 rationale). `estimate_sheet_versions` untouched (dormant; §9).
- The deferrable unique-sort pair on nodes must be **replaced**, not augmented: drop `estimate_nodes_unique_sort` / `estimate_nodes_unique_sort_with_root` and recreate as `(estimate_tab_id, parent_id, sort_order)` (nulls-not-distinct variant for roots), deferrable initially deferred — the reorder RPC relies on deferral (`20260520231000:4-205`; `set constraints` usage at `20260522091621:279`). This happens **after** the NOT NULL flip so the new key is never null during enforcement.
- `estimate_row_items` unchanged (tab derived via `node_id`; 02 §3).

## 4. Constraint strategy (cross-estimate / cross-tab safety)

1. **Node ↔ tab same-estimate:** composite FK `(estimate_id, estimate_tab_id) → estimate_tabs(estimate_id, id)` makes "node points at another estimate's tab" unrepresentable.
2. **Parent ↔ child same-tab:** extend `validate_estimate_node_tree` to also assert `child.estimate_tab_id = parent.estimate_tab_id` for every parented node, and per-tab root rules (each tab's roots must be groups). Today's function validates per-estimate (`20260520222038:28-104`); the natural evolution is `validate_estimate_node_tree(estimate_id)` iterating per tab, or a narrower `validate_estimate_tab_tree(estimate_tab_id)` invoked per affected tab — choose during implementation based on trigger plumbing (the trigger currently collects distinct estimate ids; collecting distinct tab ids is symmetric). **[D]**
3. **Row ↔ area:** unchanged trigger `estimate_row_items_enforce_area_node`; tab consistency is inherited from the node constraint.
4. **Exactly one default tab:** partial unique index (`is_default`) above + backfill proof query (§7).
5. **Reorder safety:** `reorder_estimate_nodes_with_history`'s inner `reorder_estimate_nodes` simulates the final tree (`20260520231000`) — extend simulation to reject moves whose target parent is in a different tab, mirroring the app-side check that must be added next to `canNestEstimateNodeKind` (`src/lib/estimates/actions.ts:1300-1319`).

## 5. RLS strategy

`estimate_tabs` policies mirror `estimate_nodes` exactly (`20260526142913:740-746` family):

- `estimate_tabs_select_authenticated`: FOR SELECT TO authenticated USING `public.can_access_estimate(estimate_id)`.
- `estimate_tabs_write_authenticated`: FOR ALL TO authenticated USING/WITH CHECK `public.can_edit_estimate(estimate_id)`.
- Platform-admin policy mirroring `20260518100000:149-150`.
- `enable row level security` + `grant select, insert, update, delete … to authenticated` consistent with node grants.
- New/updated SECURITY DEFINER tab RPCs (create/rename/duplicate/reorder/archive) follow the history-RPC pattern (`resolve_estimate_workspace` + correlation idempotency, `20260524033151:77-122`) **and** add the `can_edit_estimate` check that the existing family lacks — see [08_ACCESS_SECURITY_RLS_PLAN.md](08_ACCESS_SECURITY_RLS_PLAN.md) §4 for the closure of that asymmetry.
- No `force row level security` (repo convention; definer functions rely on owner bypass — 01 evidence, migrations audit).

## 6. Index strategy

| Index | Purpose |
|---|---|
| `estimate_tabs (estimate_id, sort_order)` | tab strip listing per estimate |
| partial unique `estimate_tabs (estimate_id) where is_default` | default-tab invariant + fast default lookup |
| `estimate_nodes (estimate_tab_id, parent_id, sort_order)` | per-tab tree load (replaces the per-estimate read path for the editor) |
| keep `estimate_nodes (estimate_id, parent_id, sort_order)` | whole-estimate reads remain (export all-tabs, snapshots, aggregates `listProjectEstimates` at `workspace-repository.ts:1345-1350`) |
| `estimate_sheet_events (estimate_tab_id, created_at desc)` partial where not null | tab-scoped activity (add only with the events column; evaluate necessity vs existing `(estimate_id, created_at desc, id desc)` — **[D]** measure first) |

`estimate_row_items` indexes unchanged.

## 7. Backfill SQL strategy + proof queries

Single transaction (sizes are closed-beta scale; the load-limit ceilings imply ≤ thousands of nodes per estimate — `route.ts:12-13`):

```sql
-- 1) one default tab per estimate
insert into public.estimate_tabs (estimate_id, name, sort_order, is_default, created_by)
select e.id, 'Main', 0, true, e.created_by from public.estimates e;

-- 2) attach every node to its estimate's default tab
update public.estimate_nodes n
set estimate_tab_id = t.id
from public.estimate_tabs t
where t.estimate_id = n.estimate_id and t.is_default;

-- 3) flip NOT NULL after proofs pass
alter table public.estimate_nodes alter column estimate_tab_id set not null;
```

**Proof queries (run before the NOT NULL flip; all must return 0 rows / expected counts):**

```sql
-- P1: every estimate has exactly one default tab
select e.id from public.estimates e
left join public.estimate_tabs t on t.estimate_id = e.id and t.is_default
group by e.id having count(t.id) <> 1;

-- P2: every node is attached to a tab
select count(*) from public.estimate_nodes where estimate_tab_id is null;  -- expect 0

-- P3: no node crosses estimate/tab boundaries
select n.id from public.estimate_nodes n
join public.estimate_tabs t on t.id = n.estimate_tab_id
where t.estimate_id <> n.estimate_id;                                       -- expect 0 rows

-- P4: no parent/child tab mismatch
select c.id from public.estimate_nodes c
join public.estimate_nodes p on p.id = c.parent_id
where c.estimate_tab_id <> p.estimate_tab_id;                                -- expect 0 rows

-- P5: no row attached to a node outside its estimate (pre-existing invariant re-check)
select r.id from public.estimate_row_items r
join public.estimate_nodes n on n.id = r.node_id
where n.estimate_id <> r.estimate_id;                                        -- expect 0 rows
```

Default-tab name `'Main'` is a planning decision (02 §3); revisit copy in [05_ESTIMATE_TABS_UI_UX_PLAN.md](05_ESTIMATE_TABS_UI_UX_PLAN.md) §10. New-estimate creation (`createEstimateWithDefaultTree`, `actions.ts:962-1068`) must create the default tab alongside the seeded tree in the same phase.

## 8. RPC / function evolution

| Function | Change | When |
|---|---|---|
| `validate_estimate_node_tree(estimate_id)` (`20260520222038:28-104`) | per-tab root rules + same-tab parent assertion (§4.2) | Phase 1 |
| `reorder_estimate_nodes` + `_with_history` (`20260520231000`; `20260524033151:942-998`) | reject cross-tab parents in simulation; stamp `estimate_tab_id` on the event | Phase 1 (validation) / Phase 2 (event stamping) |
| `create_estimate_node_with_history` (current def `20260611031500:47-184`) | accept `target_tab_id` for root creates; derive from parent otherwise; sibling renormalization scoped per tab | Phase 1–2 |
| `insert_estimate_template_into_estimate(+_with_history)` (`20260522091621:207-407`; `20260524033151:1000-1064`) | root-rank sort base = max sibling within the **target parent's tab**; copied nodes inherit the parent's `estimate_tab_id` | Phase 1 (correctness) |
| row `*_with_history` RPCs | no signature change (rows derive tab via node); optionally stamp `estimate_tab_id` on events | Phase 2 |
| `duplicateEstimateSheet` app action (`actions.ts:1383-1497`) | replay tabs then nodes per tab (direct-write path, no RPC) | Phase 2 |
| `preview/execute_bulk_delete_estimate_sheets` (`20260603160000:199,276`) | cascade covers tabs automatically (FK); verify preview counts mention tabs only if surfaced — likely no change | Phase 1 verify |
| **Dormant:** `estimate_sheet_snapshot` v2, `create_estimate_sheet_version`, `restore_estimate_sheet_version_as_copy` | see §9 | deferred, documented |
| NEW: `create_estimate_tab_with_history`, `rename_estimate_tab_with_history`, `reorder_estimate_tabs_with_history`, `duplicate_estimate_tab_with_history`, `archive_estimate_tab_with_history`, `delete_estimate_tab_with_history` | SECURITY DEFINER, correlation-idempotent, `resolve_estimate_workspace` + `can_edit_estimate`, event-writing — modeled on the existing family | Phase 1 |

**Required handling note for the four named functions (prompt requirement):** `reorder_estimate_nodes_with_history` is the only live one — it gets cross-tab validation and event stamping. `estimate_sheet_snapshot`, `create_estimate_sheet_version`, and `restore_estimate_sheet_version_as_copy` have zero app call sites (01 §12); they MUST NOT be awakened until updated to a v3 snapshot schema that carries `tabs[]` and per-node `estimateTabId`, and `restore_…_as_copy` must rebuild `estimate_tabs` before nodes (its temp-map insert order extends naturally, `20260524033151:1313-1555`). A guard comment in the Phase 1 migration should state this explicitly. Restoring a **v2 (tab-less) snapshot** after tabs exist must synthesize a default tab — that rule belongs in the v3 restore implementation.

## 9. Versions/snapshot deferral

No change to `estimate_sheet_versions` in this feature. Document in-migration: snapshot schemaVersion stays `'2026-05-24.v2'` until a deliberate v3; the version feature remains dormant and filtered from activity (`actions.ts:430-445`). Risk accepted and tracked in [11_RISK_REGISTER.md](11_RISK_REGISTER.md) (R-VERS).

## 10. Migration rollout sequence

1. **M1 (Phase 1):** create `estimate_tabs` + RLS + indexes + trigger; add nullable `estimate_nodes.estimate_tab_id` + composite FK + index; backfill; run proofs P1–P5; flip NOT NULL; swap node unique-sort constraints to tab-scoped; update `validate_estimate_node_tree`; update template-insert + node-create + reorder RPC validation; add tab RPCs; add `estimate_sheet_events.estimate_tab_id`.
   - Consider splitting into M1a (table + column + backfill + proofs) and M1b (constraint swap + function updates) for reviewability — both land in the same release window. **[D]**
2. **M2 (Phase 6, optional):** export-supporting index tweaks only if EXPLAIN shows need.
3. **No data-destructive statement appears anywhere in the sequence.**

## 11. Remote/linked apply boundary

- This pass: **plan only — no files under `supabase/migrations/` were created or modified.**
- Local authoring + local proof first (§13). Linked apply to project `ebxxqidacheyapmmzavr` follows the documented process (`npx supabase@2.98.2 db push`, then `migration list`, then type regen — `.ai/00_system/VALIDATION_MATRIX.md:165-179`) and is **separately authorized** per repo policy (broad `db push` blocked while migration history has drift, `.ai/10_state/decisions.md` 2026-06-06 Terms entry; memory: hosted SQL is approval-gated for agents). Label any future claim correctly: local-only vs provider-proven. **[M]**

## 12. Risks and how old estimates keep working

- Backfill + wrappers mean every old estimate is a one-tab estimate; loaders' compatibility wrappers (04 §5) return that tab's tree for all existing call sites; export single-tab shape is unchanged (07 §4). Old URLs resolve identically (02 §9).
- Top risks (full register: [11_RISK_REGISTER.md](11_RISK_REGISTER.md)): constraint-swap window on unique sorts (R-MIG2), `validate_estimate_node_tree` regression breaking every node write (R-MIG1), reorder RPC cross-tab gap (R-PERM2), stale generated types after apply (R-TYPES).
- Rollback notes: before NOT NULL flip — `alter table estimate_nodes drop column estimate_tab_id; drop table estimate_tabs cascade;` restores the prior world (events column likewise droppable). After the constraint swap, rollback requires recreating the original unique constraints from `20260518090000:93`/`20260519192045:26-40` — keep both definitions in the migration's down-notes. Application phases ship behind wrappers so an app rollback never needs the DB rollback.

## 13. How to test the migration locally

- **Primary channel (no Docker required):** the repo's proven ephemeral-Postgres pattern — `scripts/prove-notification-rls-postgres.mjs` spins a throwaway Homebrew Postgres 16 cluster, applies real migration files, impersonates roles, asserts RLS, and tears down. Phase 1 should add `scripts/prove-estimate-tabs-postgres.mjs` cloning that harness: apply core-schema + dependency migrations + M1, seed two estimates × two users, run proofs P1–P5 as SQL asserts, plus RLS allow/deny cases from [08_ACCESS_SECURITY_RLS_PLAN.md](08_ACCESS_SECURITY_RLS_PLAN.md) §7.
- **Static gate (always-on):** a `tests/vitest/estimate-tabs-schema.test.ts` source-contract test in the established style (`component-library-templates-schema.test.ts:29` pattern) asserting the migration text contains RLS enables, policies, composite FK, partial unique default index, and proof comments.
- **Optional:** `RUN_SUPABASE_INTEGRATION=1` mutation test against a local Supabase if available (pattern: `estimate-sheet-version-control-db.test.ts`).

## 14. How to regenerate Supabase types

After linked apply (separately authorized): `npx supabase@2.98.2 gen types typescript --project-id ebxxqidacheyapmmzavr > src/lib/supabase/types.ts` (`.ai/00_system/VALIDATION_MATRIX.md:168-172`). Known pre-existing staleness: `profile_role_hardening_audit` (created `20260602090000:14-22`) is absent from current `types.ts` — regeneration will pull it in; treat that diff as expected, not a regression. Then `bun run type-check`.

## Evidence Used

- `supabase/migrations/20260518090000_archestimator_core_schema.sql` (tables, uniques, indexes, set_updated_at)
- `supabase/migrations/20260519192045_atomic_estimate_node_moves.sql`; `20260520231000_reorder_estimate_nodes_rpc.sql`; `20260520222038_enforce_two_kind_estimate_nodes.sql` (constraints + validators)
- `supabase/migrations/20260522091621_component_library_templates.sql` (insertion RPC, composite FK + seed/RLS ordering precedents)
- `supabase/migrations/20260524033151_estimate_sheet_version_control.sql`, `20260524050746_…` (events/versions/snapshot/history RPC family)
- `supabase/migrations/20260526142913_project_sheet_collaboration_access.sql` (RLS helper family, composite unique on estimates)
- `supabase/migrations/20260602090000_harden_beta_allowlist_admin.sql` (profile_role_hardening_audit context)
- `supabase/migrations/20260611031500_estimate_node_sibling_order_stored.sql` (current create-node RPC + sibling renormalization)
- `src/lib/estimates/actions.ts` (app-side validation + action inventory); `src/lib/supabase/types.ts` (generated-type anchors)
- `scripts/prove-notification-rls-postgres.mjs`; `scripts/check-supabase-migration-readiness.ts`; `.ai/00_system/VALIDATION_MATRIX.md:165-179`

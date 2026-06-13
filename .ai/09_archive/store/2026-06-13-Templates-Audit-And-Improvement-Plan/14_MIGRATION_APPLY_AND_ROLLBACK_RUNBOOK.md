# 14 — Migration Apply & Rollback Runbook (D-A)

**What this is:** The owner-gated procedure to apply the `estimate_tabs` foundation (`supabase/migrations/20260612094734_estimate_tabs_foundation.sql`) to the live database, verify it, and roll back if needed. **Provider action — requires explicit owner authorization.** Live env: Supabase project `ebxxqidacheyapmmzavr`, **Postgres 17.6** ([15](15_VERIFICATION_LOG_AND_ASSUMPTIONS_CLOSURE.md)).

**Decision context (D-A):** applying flips the active path from the legacy single-"Main"-tab fallback to real tabs across **export, AI read-context, publication snapshots, node-route, and the reusable-source outline** ([06](06_BLAST_RADIUS_ANALYSIS.md)). High value, high blast radius. The [12](12_FIRST_SLICE_IMPLEMENTATION_SPEC.md) U1 fallback makes the app correct **without** this apply, so the apply can be scheduled deliberately rather than rushed.

> Project boundary (AGENTS.md): `ebxxqidacheyapmmzavr` only — never SlateCamp or any other provider project. Closed-beta posture: PITR is disabled; rely on a **manual logical dump** before applying.

---

## 1. Pre-apply checklist

1. Confirm the migration is unapplied: live `list_migrations` ends at `20260606095935_legal_terms_acceptance` ([05](05_DATABASE_RLS_SECURITY_AUDIT.md), [15](15_VERIFICATION_LOG_AND_ASSUMPTIONS_CLOSURE.md)). No intervening estimate-tabs migration is live.
2. **Take a manual logical dump** of the affected tables (`estimates`, `estimate_nodes`, `estimate_row_items`, `estimate_sheet_events`) — PITR is off, so this is the restore path.
3. Land [12](12_FIRST_SLICE_IMPLEMENTATION_SPEC.md) **U4** (hardened gate) and ideally **U1** first, so the app is already correct and the apply is not a hotfix.
4. Verify the dormant snapshot/version stack guard is intact — the migration header (`:3-6`) warns the `estimate_sheet_snapshot` / `create_estimate_sheet_version` / `restore_estimate_sheet_version_as_copy` v2 stack must **not** be awakened. Do not enable it during this apply.
5. Stage a regen of `src/lib/supabase/types.ts` (do not commit stale types).

---

## 2. Apply sequence (owner-gated commands)

Per the process in the implementation prompt (`.ai/08_prompts/IMPLEMENT-2026-06-12-Projects-Auto-Added-To-Templates.md`) and `.ai/00_system/VALIDATION_MATRIX.md`:

1. `npx supabase@2.98.2 db push` (applies `20260612094734_estimate_tabs_foundation.sql`).
   - The migration runs the **P1–P5 backfill proofs inside a `do $$` block before the NOT NULL flip** (`:82-132`), so a bad backfill aborts the migration *before* constraints harden. Watch for any `Pn failed:` exception.
2. `npx supabase@2.98.2 migration list` — confirm `20260612094734` now applied.
3. `npx supabase@2.98.2 gen types typescript --project-id ebxxqidacheyapmmzavr > src/lib/supabase/types.ts` — regen. (Note: a pre-existing stale-types diff on `profile_role_hardening_audit` is expected, [05](05_DATABASE_RLS_SECURITY_AUDIT.md) SEC-3.)
4. `bun run type-check && bun run build` — confirm the regenerated types compile.

---

## 3. Post-apply verification SQL (read-only)

Re-run the migration's own invariants as standalone checks (these mirror the in-migration P1–P5 proofs at `:82-132`):

```sql
-- exists & shape
select to_regclass('public.estimate_tabs') is not null as tabs_table_present,
       (select count(*) from information_schema.columns
          where table_name='estimate_nodes' and column_name='estimate_tab_id') = 1 as node_tab_col_present;

-- P1: exactly one default tab per estimate
select count(*) as p1_failures from (
  select e.id from public.estimates e
  left join public.estimate_tabs t on t.estimate_id=e.id and t.is_default
  group by e.id having count(t.id) <> 1) x;            -- expect 0

-- P2: every node attached to a tab
select count(*) as p2_failures from public.estimate_nodes where estimate_tab_id is null;  -- expect 0

-- P3: no node crosses estimate/tab
select count(*) as p3_failures from public.estimate_nodes n
  join public.estimate_tabs t on t.id=n.estimate_tab_id where t.estimate_id<>n.estimate_id; -- expect 0

-- P4: parent/child stay in same tab
select count(*) as p4_failures from public.estimate_nodes c
  join public.estimate_nodes p on p.id=c.parent_id where c.estimate_tab_id<>p.estimate_tab_id; -- expect 0

-- P5: row items belong to nodes in the same estimate
select count(*) as p5_failures from public.estimate_row_items r
  join public.estimate_nodes n on n.id=r.node_id where n.estimate_id<>r.estimate_id; -- expect 0

-- hardened gate + (if U2 shipped) subtree RPC present
select (select count(*) from pg_proc where proname='assert_can_edit_estimate_for_history') as hardened_gate,
       (select count(*) from pg_proc where proname='insert_estimate_subtree_into_estimate_with_history') as subtree_rpc;
```

All `*_failures` must be **0**; `tabs_table_present`/`node_tab_col_present` true.

---

## 4. Coupled-surface regression checklist (post-apply)

Run after apply — these are the surfaces the blast-radius analysis flagged ([06](06_BLAST_RADIUS_ANALYSIS.md)):

- **Reusable outline** — live: expand project→estimate, now hits **real tabs** (U1 fallback dormant); 0 errors.
- **XLSX export** — `bunx vitest run tests/vitest/proposal-*.test.ts`; single-tab byte-shape unchanged; multi-tab worksheet names/order correct; old-bookmark export still works (manual).
- **AI / Ask Flip / package-builder** — `ai-ask-read-context.test.ts`; node→tab attribution correct; `"legacy-main"` fallback no longer the active path. **Note (U4):** once the insert RPC gate is hardened, package-builder `fill_current_estimate` correctly **denies** filling a restricted estimate the user can't edit ([16](16_IMPLEMENTATION_RISK_AND_EDGE_CASE_CATALOG.md) U4-3) — verify owned-fill still works; this is a behavior change, not a regression.
- **Publication / shared-link snapshots** — `project-publication-snapshot.test.ts`; a **pre-tab (v1.1) snapshot still renders**, and new (v1.2) snapshots embed tabs.
- **Node-route** — old node-id URL resolves to the node's tab; old estimate-id URL → default tab.
- **RLS** — `node scripts/prove-estimate-tabs-postgres.mjs` against the applied schema (denials 1–3, 9).
- **Full gate** — `bun run validate && bun run build`; zero new failures vs the documented baseline.

---

## 5. Rollback

The migration is additive (new table, new column, constraint swap, RPCs) **plus a NOT NULL flip and a unique-constraint swap** — so rollback is **not** a trivial `drop`. Two paths:

- **Forward-fix (preferred for additive RPC/constraint issues):** `create or replace` the offending function or re-add the prior constraint; the data is intact.
- **Structural rollback (if the schema must be reverted) — order is load-bearing ([16](16_IMPLEMENTATION_RISK_AND_EDGE_CASE_CATALOG.md) U14-1/U14-2):**
  1. **Drop the NEW tab-scoped constraints + composite FK FIRST** — `estimate_nodes_tab_unique_sort` / `_with_root` (`:142-149`) and the composite FK (`:66-70`). Doing this before re-adding the old constraints prevents the table from briefly carrying both sets (which can abort the rollback mid-way).
  2. `alter table public.estimate_nodes alter column estimate_tab_id drop not null;`
  3. **⚠ Re-sequence `sort_order` per estimate to resolve cross-tab collisions BEFORE re-adding the estimate-scoped constraint.** Post-apply, sort_order is computed per-tab, so two nodes in different tabs can legitimately share `(estimate_id, parent_id, sort_order)`; re-adding `estimate_nodes_unique_sort` / `_with_root` then fails with a unique violation. **If multi-tab data exists and cannot be safely re-sequenced, estimate-scoped uniqueness is irrecoverable — the only safe revert is the logical-dump restore (below).**
  4. Re-add the pre-migration `estimate_nodes_unique_sort` / `_with_root` constraints (the migration dropped these at `:137-140`).
  5. `alter table public.estimate_nodes drop column estimate_tab_id;` then `drop table public.estimate_tabs cascade;`.
  6. Drop the added functions/RPCs; restore the prior bodies of `validate_estimate_node_tree`, `insert_estimate_template_into_estimate[_with_history]`, and `reorder_estimate_nodes[_with_history]` — **pin the exact source migration** for each (the foundation also replaced `reorder_estimate_nodes` at `:322` with cross-tab logic at `:393`; prior `validate` lives at `20260519192045_atomic_estimate_node_moves.sql:42+`). Body-pinning is error-prone — **forward-fix is preferred** (U14-3).
  7. Regen types.
  - **If backfilled tab data must be preserved**, export `estimate_tabs` + `estimate_nodes.estimate_tab_id` first.
- **Last resort:** restore from the §1 logical dump (loses writes since the dump — acceptable only in a true emergency, and only with owner sign-off).

The app remains correct throughout because the U1 fallback handles the no-`estimate_tabs` state.

---

## 6. Post-stability cleanup (later)

Once the applied schema is proven stable for an agreed window:
- Remove the `asEstimateTabsReadClient` compatibility casts (`workspace-repository.ts:1573-1577`) and the U1 missing-schema fallbacks (they become dead code).
- Per `04` of the archived pack, the optional `EstimateSheet*`→`EstimateTab*` rename batches ship **with** their source-contract test updates or not at all.

## Truth & integrity

- **VERIFIED:** the migration's P1–P5 proofs, constraint swaps, NOT NULL flip, and RPC bodies are read from `20260612094734_estimate_tabs_foundation.sql` (cited line ranges); the unapplied state and PG 17.6 are live-confirmed ([15](15_VERIFICATION_LOG_AND_ASSUMPTIONS_CLOSURE.md)).
- **PROVIDER-GATED / manual-proof-pending:** the apply itself, type regen, and the post-apply regression run require owner authorization and a running provider/spreadsheet — none performed in this pass; the rollback SQL is directional and must be reviewed against the final migration before use.

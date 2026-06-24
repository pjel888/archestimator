# 16 — Data Migration Plan

**Author**: Wave 1 · A6 (data-migration specialist)
**Date**: 2026-06-24
**Scope**: The three database/schema migrations required by `10-IMPLEMENTATION-PLAN.md` — closing finding-gap **G-04** from `13-PLAN-AUDIT-AND-SCORECARD.md` §4.
**Mode**: **Documentation only.** Every SQL block below is a **SKETCH — not runnable as-is; a real migration file is required** (per the task's MUST NOT). No migration file is created, modified, or applied by this document.

**Authorization context**: Per `AGENTS.md`, Philip grants standing DB authorization for Archestimator Supabase/Postgres project `ebxxqidacheyapmmzavr`. These migrations are permitted without per-change owner approval. However, two of the three (M-01, M-03) modify security-definer RPCs, so they benefit from the **F-10 RPC audit** (P1.3) running alongside them — see §2.4 and `00-README.md` §11. Cost posture: PITR disabled; rely on daily physical backups + a manual logical dump taken immediately before each migration (`pg_dump` of the affected tables).

---

## 1. Migration Scope Summary

| ID | Finding | Phase | What changes | Risk | Effort |
|----|---------|-------|--------------|------|--------|
| **M-01** | F-06 (P1) | P1.2 | `delete_estimate_node_with_history` RPC output adds server-authoritative `deletedNodeIds` (+ optional `fallbackNodeId`) | MEDIUM | M |
| **M-02** | F-04 (P2) | P2.2 | `estimate_nodes.sort_order` column: `integer` → `numeric`; dependent unique constraint + index rebuilt | HIGH | M |
| **M-03** | F-18 (P2) | P1.4 | `create_estimate_node_with_history` RPC signature `initial_sort_order integer` → `numeric`; server-action sort scheme `+1` → `+10` | MEDIUM | S |

**Only these three findings are DB-touching.** F-03 (P2.3) is action-only; F-10 (P1.3) is a read-only RPC audit and does not itself require a migration (it *informs* M-01/M-03). All other findings are client-side. This plan deliberately covers F-03/F-04/F-06/F-10/F-18 references only, per task scope.

**RPC locatability**: All target RPCs and the `sort_order` column were located in `supabase/migrations/` (see §10). No fabrication.

---

## 2. Migration M-01 — `delete_estimate_node_with_history` RPC output change (F-06)

### 2.1 Why

**Finding F-06** (`09-PRIORITIZED-FINDINGS.md` §F-06, P1): `deleteEstimateNode` returns the CLIENT-PROJECTED `deletedNodeIds` (`actions.ts:2166,2182-2184`) because the RPC does not output them. If the server cascade diverges from the client's `planEstimateTreeDelete` projection (soft-archive vs hard-delete, cross-tab guard drop, etc.), selection desyncs and the route URL can point at a deleted node.

**Acceptance criterion** (`13-PLAN-AUDIT-AND-SCORECARD.md` §8, F-06 row): "Server RPC returns authoritative `deletedNodeIds`; client uses server values."

### 2.2 What changes — SQL DDL sketch

The RPC already collects every cascaded descendant id into a temp table (`estimate_sheet_deleted_node_ids`, line 1234 of the latest definition). M-01 surfaces that existing data in the return payload; it does **not** change the cascade semantics.

```sql
-- SKETCH — not runnable as-is; real migration file required.
-- Source of current shape: 20260524033151_estimate_sheet_version_control.sql:1180
create or replace function public.delete_estimate_node_with_history(
  target_project_id uuid,
  target_estimate_id uuid,
  target_node_id uuid,
  acting_user_id uuid default null,
  correlation_id uuid default gen_random_uuid()
)
returns jsonb   -- payload GROWS: adds deletedNodeIds, fallbackNodeId
language plpgsql
security definer
set search_path = public
as $$
declare
  -- ... existing declares unchanged ...
  deleted_node_ids uuid[];
  deleted_parent_id uuid;
  fallback_id uuid;
begin
  -- ... existing idempotency cache check + target validation unchanged ...
  -- ... existing recursive CTE that populates estimate_sheet_deleted_node_ids ...

  -- NEW: capture the deleted node's parent_id BEFORE rows are removed,
  --      so fallback can be computed from surviving siblings.
  select node.parent_id into deleted_parent_id
  from public.estimate_nodes node
  where node.id = target_node_id;

  select array_agg(tbl.id order by tbl.id) into deleted_node_ids
  from estimate_sheet_deleted_node_ids tbl;

  -- ... existing DELETE + estimate_sheet_events insert unchanged ...

  -- NEW: pick a surviving sibling of the deleted node's parent as fallback.
  select node.id into fallback_id
  from public.estimate_nodes node
  where node.estimate_id = target_estimate_id
    and node.parent_id is not distinct from deleted_parent_id
    and not (node.id = any(deleted_node_ids))
  order by node.sort_order, node.id
  limit 1;

  return jsonb_build_object(
    'idempotent', coalesce(committed_result is not null, false),
    'eventId', inserted_event_id,
    'deletedNodeIds', to_jsonb(deleted_node_ids),   -- NEW, server-authoritative
    'fallbackNodeId', fallback_id                   -- NEW, nullable
  );
end;
$$;

-- Re-grant with identical arg signature (unchanged arity/types):
revoke execute on function public.delete_estimate_node_with_history(uuid, uuid, uuid, uuid, uuid) from public, anon;
grant execute on function public.delete_estimate_node_with_history(uuid, uuid, uuid, uuid, uuid) to authenticated;
```

### 2.3 Action-side changes

`src/lib/estimates/actions.ts:2155-2185` (`deleteEstimateNode`):
- Stop computing `deletePlan` via client `planEstimateTreeDelete` for the return shape (the pre-delete double-fetch removed by F-03/P2.3 reinforces this).
- Read `deletedNodeIds` and `fallbackNodeId` from the RPC result and return them as `deletePlan.deletedNodeIds` / `deletePlan.fallbackNodeId` (L2182-2184).
- The client reconciler (`EstimateSheetTree.tsx:1129-1143`) is unchanged in shape — it already consumes `deletePlan.*`; it now consumes server truth instead of projection.

### 2.4 F-10 audit coupling

`delete_estimate_node_with_history` is one of the four RPCs the **F-10 audit** (P1.3) must verify for self-parent / cycle / cross-tab / max-depth / orphan-prevention guards. The recursive cascade CTE (lines 1223-1235) has **no explicit cycle guard** (relies on `parent_id` acyclicity); the F-10 audit should confirm this invariant before M-01 reshapes the return. Recommend **M-01 lands after or with P1.3**, not before. See `00-README.md` §11 ("No migration audit").

### 2.5 Backfill

None. M-01 changes a return payload, not row data. Existing `estimate_sheet_events` rows are untouched.

### 2.6 Types regeneration

`bun supabase gen types` (part of repo workflow) — the generated `Database` type's `delete_estimate_node_with_history` Returns row gains `deletedNodeIds: string[]` and `fallbackNodeId: string | null`.

### 2.7 Rollback

```sql
-- SKETCH — down-migration: drop the two new keys from the return payload.
-- Re-declare the function with the prior RETURN body (eventId only).
-- Safe: clients tolerate extra keys, so a staged deploy can ship M-01 first;
-- the down-migration only matters if a caller depends on the OLD shape.
```
Action-side revert: restore the client-projection path at `actions.ts:2166,2182-2184`.

### 2.8 Validation gate

`tests/vitest/estimate-tree-delete-cascade.test.ts` (EC-022, per `10-IMPLEMENTATION-PLAN.md` P7.2 + `13-…` §8): assertion that when the RPC soft-archives a subtree (divergence scenario), the action returns the **server-provided** `deletedNodeIds`, and the client reconciler selects `fallbackNodeId` only when the original id is absent from `confirmed.tree`.

### 2.9 Risk: **MEDIUM**

Modifies a `security definer` RPC invoked on every single-node delete. The cascade CTE itself is unchanged, but the new `SELECT … FOR` fallback query adds one indexed read. Return-shape additions are backward-compatible (extra keys), so staged rollout is safe.

---

## 3. Migration M-02 — `estimate_nodes.sort_order` integer → numeric (F-04)

### 3.1 Why

**Finding F-04** (`09-…` §F-04, P2): `buildSiblingUpdates` rewrites `sortOrder` for **all** siblings on every reorder (`estimate-tree-reorder.ts:199-207`), because integer sort_order forces full-sibling normalization. Acceptance (`13-…` §6): "Reorder payload size, 30-sibling move ≤ 2 UPDATE rows (not 30)." That requires fractional/numeric sort_order.

### 3.2 What changes — SQL DDL sketch

Current definition (`20260518090000_archestimator_core_schema.sql:88,93,125`):
- Column: `sort_order integer not null default 0`
- Constraint: `estimate_nodes_unique_sort unique (estimate_id, parent_id, sort_order) deferrable initially deferred`
- Index: `estimate_nodes_estimate_parent_sort_idx on (estimate_id, parent_id, sort_order)`

```sql
-- SKETCH — not runnable as-is; real migration file required.

-- 0. PRE-MIGRATION PROBE (read-only; run first to size the backfill threshold):
--    select min(sort_order), max(sort_order), count(distinct sort_order)
--    from public.estimate_nodes;

-- 1. Backfill (see §3.3 for idempotency discussion).
update public.estimate_nodes
set sort_order = sort_order * 10
where sort_order < 10;   -- ponytail: threshold validated by the probe above;
                         -- aligns legacy +1 scheme into the multiples-of-10 scheme
                         -- without touching rows already on the 10-scale.

-- 2. Drop dependent objects (column type change is not free under them).
alter table public.estimate_nodes drop constraint if exists estimate_nodes_unique_sort;
drop index if exists public.estimate_nodes_estimate_parent_sort_idx;

-- 3. Type change.
alter table public.estimate_nodes
  alter column sort_order type numeric(20,4)
  using sort_order::numeric;

-- 4. Recreate dependent objects (preserve deferrable initially deferred).
alter table public.estimate_nodes
  add constraint estimate_nodes_unique_sort
  unique (estimate_id, parent_id, sort_order) deferrable initially deferred;
create index if not exists estimate_nodes_estimate_parent_sort_idx
  on public.estimate_nodes (estimate_id, parent_id, sort_order);
```

**Out of scope**: `estimate_row_items.sort_order` (also `integer`, line 100 of the core schema) is **not** touched by F-04; row-item reordering is a separate workstream.

### 3.3 Backfill strategy

The task specifies: "Existing integer sort_order values multiply by 10 to align with the new multiples-of-10 scheme; idempotent."

- **Idempotency guard**: `where sort_order < 10`. Rows already on the multiples-of-10 scale (10, 20, 30, … produced by the create-RPC's internal rebalance) are skipped; legacy consecutive values (1, 2, 3, … from the old action-side `+1` scheme per F-18) become 10, 20, 30.
- **Edge case**: `sort_order = 0` → `0 * 10 = 0`; no change; re-running the guard still skips it. Safe.
- **One-time guard**: the real migration file should rely on the `alter type` being non-repeatable as the natural idempotency boundary (a fresh DB starts integer, runs the backfill once, then becomes numeric). If the `update` could ever re-run against a numeric column, wrap it in a guard table/flag. Ponytail: real data distribution decides the threshold; leave the probe knob in.

### 3.4 Action-side changes

`src/lib/estimates/estimate-tree-reorder.ts:199-207` (`buildSiblingUpdates`): rewrite to emit only the moved node's new numeric sort_order (midpoint between neighbors) plus a rebalance trigger when neighbors get within a configured epsilon (e.g. `0.0001`). `09-…` §F-04 "Recommended correction" is the reference. This is code, not migration — listed here because the migration unblocks it.

### 3.5 Types regeneration

`bun supabase gen types` — generated `estimate_nodes.sort_order` type stays `number` (numeric maps to JS `number` in the generated types). **Call sites that `Math.floor` or assume integer sort_order must be audited** — flag in the migration PR description.

### 3.6 Rollback

```sql
-- SKETCH — down-migration: numeric -> integer (lossy; only use if M-02 is rejected).
drop index if exists public.estimate_nodes_estimate_parent_sort_idx;
alter table public.estimate_nodes drop constraint if exists estimate_nodes_unique_sort;
alter table public.estimate_nodes
  alter column sort_order type integer using sort_order::integer;
alter table public.estimate_nodes
  add constraint estimate_nodes_unique_sort
  unique (estimate_id, parent_id, sort_order) deferrable initially deferred;
create index if not exists estimate_nodes_estimate_parent_sort_idx
  on public.estimate_nodes (estimate_id, parent_id, sort_order);
```
**Note**: rollback is **lossy** — any fractional sort_order values are truncated. Take a logical dump before M-02; rollback is a last resort. Action-side revert: restore `buildSiblingUpdates` integer normalization.

### 3.7 Validation gate

- SQL-level: a vitest schema test asserting `information_schema.columns` reports `numeric` for `estimate_nodes.sort_order`, and the unique constraint + index exist with `deferrable initially deferred`.
- Behavior: `tests/vitest/estimate-tree-reorder-payload.test.ts` (new, per P2.2 validation): a 30-sibling move emits ≤ 2 UPDATE rows in the RPC payload (the F-04 acceptance bar from `13-…` §6).

### 3.8 Risk: **HIGH**

Column type change on a hot table with a deferrable unique constraint and a composite index, plus a non-idempotent backfill. Every caller that assumes integer sort_order (reorder RPC, reorder RPC's own `(index+1)*10` math, export, charts) must be re-verified. The reorder RPC (`reorder_estimate_nodes_with_history`) takes sort_order inputs and must be checked for integer assumptions — coordinate with the F-04 code change in P2.2.

---

## 4. Migration M-03 — server create sort-order scheme standardization (F-18)

### 4.1 Why

**Finding F-18** (`09-…` §F-18, P2): the server action computes `initial_sort_order = maxSiblingSortOrder + 1` (`actions.ts:2090-2097`) while the client uses multiples of 10 (`estimate-tree-reorder.ts:204`). The schemes are incompatible; the next reorder renumbers ALL siblings. **Acceptance**: standardize on multiples-of-10 on both sides — server uses `(maxSiblingSortOrder + 10)`.

**Why M-03 is a migration and not pure TS**: after M-02 lands, `estimate_nodes.sort_order` is `numeric`, so the RPC's `initial_sort_order integer` parameter (6th arg of `create_estimate_node_with_history`, line 7 of `20260524132800_estimate_node_activity_history.sql`) must become `numeric` to match. The grant/revoke statements (lines 248-250) cite the arg signature and must be re-issued. **This is why M-03 depends on M-02.**

### 4.2 What changes — SQL DDL sketch

```sql
-- SKETCH — not runnable as-is; real migration file required.
-- Source: 20260524132800_estimate_node_activity_history.sql:1
create or replace function public.create_estimate_node_with_history(
  target_project_id uuid,
  target_estimate_id uuid,
  parent_node_id uuid,
  node_kind public.estimate_node_kind,
  node_name text,
  initial_sort_order numeric,   -- CHANGED: was integer (line 7)
  acting_user_id uuid default null,
  correlation_id uuid default gen_random_uuid()
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
-- Body is UNCHANGED: the rebalance CTE (line 61-86) already normalizes
-- siblings to row_number()*10 after insert, so the insert value's scheme
-- matters only for the transient pre-rebalance window. Keep the body byte-for-byte.
$$;

-- Re-grant with the NEW arg signature (Postgres functions are identified by arg types):
revoke execute on function public.create_estimate_node_with_history(
  uuid, uuid, uuid, public.estimate_node_kind, text, numeric, uuid, uuid
) from public, anon;
grant execute on function public.create_estimate_node_with_history(
  uuid, uuid, uuid, public.estimate_node_kind, text, numeric, uuid, uuid
) to authenticated;
```

### 4.3 Action-side changes

`src/lib/estimates/actions.ts:2090-2097` (`createEstimateNode`):
- Change `initial_sort_order = maxSiblingSortOrder + 1` to `maxSiblingSortOrder + 10`.
- Pass the value as a JS number (numeric is wire-compatible); no TS cast needed beyond the generated type already reflecting `numeric`.
- This is the **core** of F-18; the RPC signature change is the migration tail that follows M-02.

### 4.4 F-10 audit coupling

`create_estimate_node_with_history` is the second of the four RPCs in the F-10 audit scope (P1.3). Its parent-existence check (lines 32-39) exists but there is **no max-depth guard** and **no self-parent guard** (parent can equal a node that does not yet exist, but cannot equal the new node's own id since it's generated — still worth confirming). The F-10 audit should land alongside M-03.

### 4.5 Backfill

None. The create-RPC's internal rebalance CTE already normalizes siblings to multiples of 10 on every create, so existing rows are already on-scheme; M-03 only stops the *action* from injecting off-scale values during the transient pre-rebalance window.

### 4.6 Types regeneration

`bun supabase gen types` — the `create_estimate_node_with_history` Args row changes `initial_sort_order: number` (no TS-visible change, but the underlying Postgres arg type is now numeric).

### 4.7 Rollback

```sql
-- SKETCH — down-migration: numeric -> integer arg (requires M-02 to also roll back first).
-- Re-declare the function with `initial_sort_order integer` and re-issue the
-- integer-arg grant/revoke pair. Only valid if estimate_nodes.sort_order is integer again.
```
Action-side revert: restore `maxSiblingSortOrder + 1`.

### 4.8 Validation gate

`tests/vitest/estimate-tree-create-sort-scheme.test.ts` (new): assert that creating a node when `maxSiblingSortOrder = 30` yields an initial sort_order whose value equals 40 (not 31), and that the next single-sibling reorder does NOT renumber all siblings. Coupled with the M-02 payload test (§3.7) to prove the end-to-end scheme is stable.

### 4.9 Risk: **MEDIUM**

The RPC body is unchanged (the rebalance CTE already normalizes), so the migration risk is concentrated in the grant/revoke arg-type signature and the action-side arithmetic. The main hazard is deploying M-03's action change before M-02 lands — the action would pass a fractional value to an integer column. **Enforce the ordering in §5.**

---

## 5. Migration Ordering and Dependencies

```
M-02 (sort_order integer -> numeric)   ── must ship FIRST
        │
        └──> M-03 (RPC arg + action +10)   depends on numeric column
                                                   
M-01 (delete RPC output)              ── INDEPENDENT; may ship in any order
```

**Rationale**:
- **M-02 before M-03**: M-03 changes the create-RPC's `initial_sort_order` arg to `numeric`, which is only valid once the column it feeds is numeric. Shipping M-03 first would either fail (cast error) or force an interim integer-arg variant — wasteful.
- **M-01 independent**: touches a different RPC (`delete_estimate_node_with_history`) with no shared arg or column dependency on M-02/M-03. Can ship before, between, or after.
- **Recommended sequence for the minimum viable launch** (`10-…` "Minimum viable launch": P0+P1+P2+P3): **M-01 → M-02 → M-03**, with P1.3 (F-10 audit) concluding before or alongside M-01 and M-03.

---

## 6. Backfill Strategy (consolidated)

| Migration | Row-data backfill? | Idempotent? | Notes |
|-----------|--------------------|-------------|-------|
| M-01 | No | n/a | Return-shape change only |
| M-02 | Yes: `sort_order * 10 where sort_order < 10` | Yes, **with guard** | Threshold must be validated by a pre-migration probe (§3.3); non-repeatable without the guard |
| M-03 | No | n/a | Internal rebalance CTE already aligns existing rows |

**Pre-migration dump** (all three): `pg_dump --table=public.estimate_nodes --table=public.estimate_sheet_events` (and the full DB for M-02) immediately before applying. PITR is disabled per cost posture, so the logical dump is the recovery source.

---

## 7. Rollback Strategy (per migration)

| Migration | Down-migration cost | Data loss? | Action-side revert |
|-----------|--------------------|------------|--------------------|
| M-01 | LOW (drop two return keys) | No | Restore client-projection path (`actions.ts:2166,2182-2184`) |
| M-02 | MEDIUM (numeric→integer) | **Yes — fractional values truncated** | Restore `buildSiblingUpdates` integer normalization |
| M-03 | LOW (numeric→integer arg) — only valid post-M-02-rollback | No | Restore `maxSiblingSortOrder + 1` |

**Rollback ordering**: if both M-02 and M-03 shipped, roll back M-03 first (restore integer arg), then M-02 (restore integer column). Reversing this order breaks the create-RPC.

---

## 8. Validation Gates (per migration)

| Migration | Test file | Asserts | Source |
|-----------|-----------|---------|--------|
| M-01 | `tests/vitest/estimate-tree-delete-cascade.test.ts` (EC-022) | RPC returns authoritative `deletedNodeIds`; client uses server values under cascade divergence | P7.2, `13-…` §8 F-06 row |
| M-02 | `tests/vitest/estimate-tree-reorder-payload.test.ts` (new) + schema vitest | Column is `numeric`; 30-sibling move ≤ 2 UPDATE rows | P2.2, `13-…` §6 |
| M-03 | `tests/vitest/estimate-tree-create-sort-scheme.test.ts` (new) | New node gets `maxSiblingSortOrder + 10`; scheme matches client multiples-of-10 | P1.4, F-18 |

All three also require `bun supabase gen types` (types regen) + `bun run validate` (the repo gate per `10-…` Definition of Done).

---

## 9. Open Questions / Decisions Required

- **Q-M02-1** (coordinates with **Q-20**, `12-OPEN-QUESTIONS-AND-DECISIONS.md`): Does the numeric sort_order precision (`numeric(20,4)` in the sketch) match the chosen max-depth (Q-20 default 100)? At depth 100 with midpoint rebalancing, 4 decimal places survive ~13 halvings before hitting epsilon — sufficient, but the final decision is Q-20's. Default if no answer: `numeric(20,4)`.
- **Q-M02-2**: Backfill threshold. The sketch uses `where sort_order < 10`. The pre-migration probe (§3.2 step 0) determines whether any legitimate value sits in `[1,9]`. Default: keep `< 10`; escalate to Philip only if the probe finds an unexpected distribution.
- **Q-M01-1**: Should `fallbackNodeId` be server-computed (M-01 sketch) or remain a client responsibility? The sketch computes it server-side for single-source-of-truth; F-06's recommended correction does not mandate either. Default: server-computed (matches "server-authoritative" acceptance language).
- **Q-F10-coupling**: Does P1.3 (F-10 RPC audit) land **before** M-01/M-03, or **alongside**? `00-README.md` §11 and `13-…` §13 limitation #2 flag the missing audit. Default: alongside (the migrations do not weaken existing guards; the audit confirms that).

---

## 10. References

**Plan-pack docs** (same folder):
- `00-README.md` §11 (audit limitations — no migration audit), §3 critical risks
- `09-PRIORITIZED-FINDINGS.md` — F-03 (L60), F-04 (L85), F-06 (L128), F-10 (L217), F-18 (L339)
- `10-IMPLEMENTATION-PLAN.md` — P1.2 (M-01), P2.2 (M-02), P1.4 (M-03), P1.3 (F-10 audit)
- `13-PLAN-AUDIT-AND-SCORECARD.md` §4 G-04 (this doc's charter), §8 traceability, §13 limitation #2

**Source files (action-side)**:
- `src/lib/estimates/actions.ts:2090-2097` (M-03 action), `:2155-2185` (M-01 action), `:2163-2164` (F-03, action-only sibling)
- `src/lib/estimates/estimate-tree-reorder.ts:199-207` (M-02 unblocks F-04 code fix)

**Existing migrations (located, read-only — NOT modified by this doc)**:
- `supabase/migrations/20260518090000_archestimator_core_schema.sql:88,93,125` — `estimate_nodes.sort_order integer`, unique constraint `estimate_nodes_unique_sort`, index `estimate_nodes_estimate_parent_sort_idx`
- `supabase/migrations/20260524132800_estimate_node_activity_history.sql:1-143,248-250` — `create_estimate_node_with_history` definition + grants (M-03 target)
- `supabase/migrations/20260524033151_estimate_sheet_version_control.sql:1180-1259` — `delete_estimate_node_with_history` latest definition (M-01 target; an earlier definition exists at `20260524050746_add_estimate_row_contingency_percentage.sql:1060` and is superseded)
- `supabase/migrations/20260520171544_reorder_estimate_nodes_rpc.sql` — `reorder_estimate_nodes_with_history` (F-10 audit target; integer-assumption check needed post-M-02)
- `supabase/migrations/20260621122125_estimate_sheet_bulk_delete_and_edit_rpc_hardening.sql:72` — `delete_estimate_nodes_bulk_with_history` (F-10 audit target; not modified by M-01/M-02/M-03)

**Governance**:
- `AGENTS.md` — standing DB authorization for project `ebxxqidacheyapmmzavr`; PITR-disabled cost posture
- `.ai/AGENTS.md` — `.ai` working rules (additive edits, no secrets)

---

**Document status**: Wave 1 · A6 deliverable complete. Closes gap **G-04** (`13-…` §4). Pending Wave 2 adversarial review (B1) and final verification (B2).

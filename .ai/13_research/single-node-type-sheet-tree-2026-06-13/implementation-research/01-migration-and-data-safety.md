Confirmed. The AI package-builder RPC (`create_project_estimate_package_with_history`, 20260528003000) inserts into `estimate_nodes` with NO `estimate_tab_id` (grep returns nothing) — so it is already broken against the post-tabs NOT NULL column and is dormant/disabled, consistent with the out-of-scope beta note. I now have all anchors needed to write the complete, exact migration plan.

---

# DATABASE MIGRATION & DATA SAFETY — Unified Estimate Node Migration Plan

## Source-of-truth reconnaissance (current authoritative definitions)

The "two-kind" contract is enforced in **four live function/trigger families** plus one column check. The estimate-tabs migration (`20260612094734`) is the newest and re-defines the estimate-side functions, so its versions are authoritative — NOT the `20260520222038` versions in the prompt. Exact current locations:

| Object | Authoritative definition (file:line) | Two-kind rule(s) to strip |
|---|---|---|
| `validate_estimate_node_tree(uuid)` | `20260612094734_estimate_tabs_foundation.sql:208-295` | hierarchy block `:241-255`; rows-must-be-area block `:257-267` |
| `reorder_estimate_nodes(uuid,jsonb)` | `20260612094734:322-532` | inline hierarchy block `:427-451` |
| `enforce_estimate_row_item_area_node()` + trigger | `20260519192045_atomic_estimate_node_moves.sql:145-170` (never re-defined since) | whole function + trigger |
| `insert_estimate_row_item_with_history(...)` | `20260524050746_add_estimate_row_contingency_percentage.sql:314-...` (area guard `:344-352`) | area guard `:344-352` |
| `insert_estimate_template_into_estimate(...)` | `20260612094734:771-...` (group-target requirement `:819-828`) | `and node.kind='group'` + error |
| `estimate_nodes_active_kind_check` | added `20260520222038:17-26` (`check (kind in ('group','area'))`) | drop or relax |
| Template parallel: `validate_estimate_template_tree`, `enforce_estimate_template_row_item_area_node`, `estimate_template_nodes_active_kind_check` | `20260522091621_component_library_templates.sql:77-205` and table DDL `:27` | hierarchy + area rules |
| AI `create_project_estimate_package_with_history` | `20260528003000:40-...` (kind='area' gates `:345,:372`) | **OUT OF SCOPE — do not change app side** |

Two facts that shape the whole plan:

1. **The snapshot/version/restore v2 stack is already dormant.** `20260612094734:4-6` header: *"the dormant estimate_sheet_snapshot/create_estimate_sheet_version/restore_estimate_sheet_version_as_copy v2 stack must not be awakened until a deliberate v3 snapshot schema carries tabs[] plus per-node estimateTabId."* The latest `restore_estimate_sheet_version_as_copy` (`20260524050746:1193`) and `estimate_sheet_snapshot` (`:131`) **pre-date tabs** and insert `estimate_nodes` with no `estimate_tab_id`, so they already cannot run against the NOT-NULL column. They are frozen, not in the hot path. This migration must NOT touch them (re-defining them would risk "awakening" them) and they require no change for the kind collapse — `estimate_sheet_snapshot` writes `kind` as a passthrough JSON field, restore reads it back verbatim. **No restore/share regression.**

2. **The AI RPC is already broken post-tabs** (inserts nodes with no `estimate_tab_id`) and is gated off (`f1a80c8d Keep Codex multi-agent v2 disabled`). It is out of scope. Its only kind coupling is two string guards (`:345`, `:372`) that read `node_payload->>'kind' = 'area'` from the AI draft payload — these are app-payload assertions, not DB-tree constraints, so the kind collapse does not break them and **no DB change is required** for it. (When it is eventually re-enabled it will need an `estimate_tab_id` fix regardless of this work; that is the same pre-existing debt, not new.)

---

## (1) EXACT ORDERED DDL — one new migration

Create one file: `supabase/migrations/20260613XXXXXX_unify_estimate_node_kinds.sql`. Single transaction (default for Supabase migrations). Order matters: drop the row-item area trigger first (so any later same-tx row writes don't trip it), relax the column check, then `create or replace` the four functions, then the template family, then enum. Every `create or replace` below is a **full-body replacement** of the authoritative version — copy the current body and remove only the marked blocks.

```sql
-- 20260613XXXXXX_unify_estimate_node_kinds.sql
-- Collapse the group/area two-kind contract into ONE unified estimate node type.
-- Every node may hold BOTH child nodes AND estimate_row_items.
-- PRESERVED invariants: cycle prevention, missing-parent, cross-tab isolation,
-- RPC-owned create/rename with history, RLS, canonical cost formula, SECURITY DEFINER grants.
-- Snapshot/version/restore v2 stack is dormant (see 20260612094734 header) and is NOT touched here.

------------------------------------------------------------------------
-- A. estimate_nodes: drop the row-item area trigger + its function
------------------------------------------------------------------------
drop trigger if exists estimate_row_items_enforce_area_node on public.estimate_row_items;
drop function if exists public.enforce_estimate_row_item_area_node();

------------------------------------------------------------------------
-- B. estimate_nodes: relax the active-kind CHECK
--    Recommendation (see section 2): keep 'kind' but stop constraining it to group/area.
--    Default new unified nodes to 'group'. Allow any legacy enum value so historical
--    rows (lot/general/structure/level/assembly) stay valid with zero data movement.
------------------------------------------------------------------------
alter table public.estimate_nodes
  drop constraint if exists estimate_nodes_active_kind_check;

alter table public.estimate_nodes
  alter column kind set default 'group'::public.estimate_node_kind;
-- (no new CHECK; the enum type itself remains the only domain guard)

------------------------------------------------------------------------
-- C. validate_estimate_node_tree: keep ONLY cycle + missing-parent + cross-tab
------------------------------------------------------------------------
create or replace function public.validate_estimate_node_tree(target_estimate_id uuid)
returns void
language plpgsql
set search_path = public
as $$
begin
  if target_estimate_id is null then
    raise exception 'Estimate id is required.';
  end if;

  -- KEEP: missing-parent reference (within same estimate)
  if exists (
    select 1
    from public.estimate_nodes child
    left join public.estimate_nodes parent
      on parent.id = child.parent_id
      and parent.estimate_id = child.estimate_id
    where child.estimate_id = target_estimate_id
      and child.parent_id is not null
      and parent.id is null
  ) then
    raise exception 'Estimate node tree contains a missing parent reference.';
  end if;

  -- KEEP: cross-tab isolation (parent must be in same tab as child)
  if exists (
    select 1
    from public.estimate_nodes child
    join public.estimate_nodes parent on parent.id = child.parent_id
    where child.estimate_id = target_estimate_id
      and child.estimate_tab_id <> parent.estimate_tab_id
  ) then
    raise exception 'Estimate node tree contains a parent from another tab.';
  end if;

  -- REMOVED: hierarchy rules block (root-must-be-group / group-only-parents)
  -- REMOVED: rows-must-belong-to-area block

  -- KEEP: cycle prevention
  if exists (
    with recursive tree_nodes as (
      select node.id, node.parent_id
      from public.estimate_nodes node
      where node.estimate_id = target_estimate_id
    ),
    walk(origin_id, parent_id, path, has_cycle) as (
      select tree_nodes.id, tree_nodes.parent_id, array[tree_nodes.id], false
      from tree_nodes
      union all
      select walk.origin_id, parent.parent_id, walk.path || parent.id,
             parent.id = any(walk.path)
      from walk
      join tree_nodes parent on parent.id = walk.parent_id
      where not walk.has_cycle
    )
    select 1 from walk where has_cycle
  ) then
    raise exception 'Estimate node tree creates a cycle.';
  end if;
end;
$$;
```

`enforce_estimate_node_tree()` and its constraint trigger (`20260612094734:297-320`) **do not change** — they call `validate_estimate_node_tree`, which now permits the unified shape.

```sql
------------------------------------------------------------------------
-- D. reorder_estimate_nodes: strip the inline hierarchy block (:427-451)
--    Keep: payload validation, cross-tab guard (:387-396), missing-parent (:403-425),
--    cycle (:453-484), duplicate-sibling-slot (:486-507), the UPDATE, final validate.
------------------------------------------------------------------------
create or replace function public.reorder_estimate_nodes(target_estimate_id uuid, move_updates jsonb)
returns integer
language plpgsql
set search_path = public
as $$
declare
  input_count integer;
  distinct_id_count integer;
  updated_count integer;
begin
  -- ... [identical to 20260612094734:331-425 up to and INCLUDING the
  --      "missing parent reference" exists() block] ...

  -- >>> DELETE the entire "violates hierarchy rules" exists() block at
  --     20260612094734:427-451 (the final_nodes / parent.kind in ('group') CTE). <<<

  -- ... [identical to 20260612094734:453-531: cycle CTE, duplicate-sibling CTE,
  --      set constraints, UPDATE, get diagnostics, final perform validate, return] ...
end;
$$;
```

```sql
------------------------------------------------------------------------
-- E. insert_estimate_row_item_with_history: drop the area guard (:344-352)
--    Replace the "kind = 'area'" existence check with a plain
--    "node belongs to this estimate" existence check.
------------------------------------------------------------------------
create or replace function public.insert_estimate_row_item_with_history(
  target_project_id uuid,
  target_estimate_id uuid,
  target_node_id uuid,
  row_payload jsonb,
  acting_user_id uuid default null,
  correlation_id uuid default gen_random_uuid()
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
-- ... [identical declare/begin/resolve_workspace/idempotency, 20260524050746:327-343] ...
  if target_node_id is null or not exists (
    select 1
    from public.estimate_nodes node
    where node.id = target_node_id
      and node.estimate_id = target_estimate_id        -- DROPPED: and node.kind = 'area'
  ) then
    raise exception 'Target node not found in the current estimate.';
  end if;
-- ... [rest identical to 20260524050746 body: insert into estimate_row_items, event, return] ...
$$;
```

```sql
------------------------------------------------------------------------
-- F. insert_estimate_template_into_estimate: drop the group-target requirement (:819-828)
--    Resolve the target parent tab from ANY node in the estimate, not only kind='group'.
------------------------------------------------------------------------
create or replace function public.insert_estimate_template_into_estimate(
  target_project_id uuid,
  target_estimate_id uuid,
  target_parent_node_id uuid,
  source_template_id uuid
)
returns jsonb
language plpgsql
set search_path = public
as $$
-- ... [identical 20260612094734:781-817 declare + workspace/template checks] ...
  select node.estimate_tab_id
    into target_parent_tab_id
  from public.estimate_nodes node
  where node.id = target_parent_node_id
    and node.estimate_id = target_estimate_id;       -- DROPPED: and node.kind = 'group'

  if target_parent_tab_id is null then
    raise exception 'Target node not found in the current estimate.';   -- was "Target Group Node not found"
  end if;
-- ... [rest identical: validate_estimate_template_tree, copy map, inserts, final validate, return] ...
$$;
```

**Re-grant after each `create or replace`** to match the existing pattern (the bodies are SECURITY DEFINER / RPC-owned). At the end of the migration, replay the exact revoke/grant lines those functions already carry:

```sql
revoke execute on function public.validate_estimate_node_tree(uuid) from public, anon;
grant  execute on function public.validate_estimate_node_tree(uuid) to authenticated;
revoke execute on function public.reorder_estimate_nodes(uuid, jsonb) from public, anon, authenticated;
revoke execute on function public.insert_estimate_row_item_with_history(uuid, uuid, uuid, jsonb, uuid, uuid) from public, anon;
grant  execute on function public.insert_estimate_row_item_with_history(uuid, uuid, uuid, jsonb, uuid, uuid) to authenticated;
revoke execute on function public.insert_estimate_template_into_estimate(uuid, uuid, uuid, uuid) from public, anon;
grant  execute on function public.insert_estimate_template_into_estimate(uuid, uuid, uuid, uuid) to authenticated;
```
(`reorder_estimate_nodes` is intentionally not granted to `authenticated` directly — it's called by SECURITY DEFINER `reorder_estimate_nodes_with_history`; keep that pattern, i.e. only revoke, no grant to authenticated.)

**AI RPC (`create_project_estimate_package_with_history`):** no change in this migration. Its `kind='area'` checks at `:345`/`:372` are reads of the AI draft payload, not tree constraints. Its real DB defect is the missing `estimate_tab_id` on insert (pre-existing, from the tabs migration), which is out of scope here.

---

## (2) THE `kind` COLUMN DECISION → **Keep it as a vestigial, unconstrained column. Do NOT drop, do NOT repurpose.**

Reasoning:

- **Generated types** (`src/lib/supabase/types.ts:1467,1809,3186,3510,3679`) type `kind` as a required `estimate_node_kind` on `estimate_nodes` Row/Insert and on the `create_estimate_node_with_history` `node_kind` arg. Dropping the column forces a regen and a coordinated app deploy; keeping it nullable-by-default-`'group'` means **zero app-side breakage** in the same release. The decision says app changes for kind are a separate facet — keeping the column lets the DB migration ship independently.
- **RPC signature coupling:** `create_estimate_node_with_history(..., node_kind public.estimate_node_kind, ...)` (`20260611031500:47-56`, granted `:188`) takes `kind` as a positional arg and inserts it (`:90,:97`). Dropping the column would force dropping/recreating this RPC and changing every caller. Keeping the column means the RPC keeps working untouched; callers can pass `'group'` (the new default) indefinitely.
- **Snapshot passthrough:** `estimate_sheet_snapshot` (`20260524050746:131`, and the dormant `20260524033151:210`) emit `'kind', node.kind`. Keeping the column keeps these JSON snapshots structurally stable; dropping it would make new snapshots schema-divergent from historical ones for no benefit.
- **History payloads:** `create_estimate_node_with_history` writes `'kind', inserted_node.kind` into `estimate_sheet_events` (`20260611031500:159,166,179`). Historical events already contain `kind`; keeping the column keeps new events consistent.
- **Why not repurpose:** there's no second axis worth encoding — the whole point is one undifferentiated node. Repurposing invites a new implicit two-kind model.
- **Net:** make it a no-op — drop the `group/area` CHECK (section B), set default `'group'`, leave the enum type attached. The column becomes informational/legacy. A *later, optional* cleanup migration can drop it once the app stops reading it; that is explicitly deferred and not required for correctness.

---

## (3) PARALLEL TEMPLATE TREE — exact changes

All three live in `20260522091621_component_library_templates.sql` and were never re-defined. Apply the symmetric collapse in the same migration:

**3a. `validate_estimate_template_tree` (`:77-153`)** — `create or replace` keeping only missing-parent (`:87-98`) and cycle (`:127-151`); **delete** the hierarchy block (`:100-113`) and the rows-must-be-area block (`:115-125`):

```sql
create or replace function public.validate_estimate_template_tree(target_template_id uuid)
returns void language plpgsql set search_path = public as $$
begin
  if target_template_id is null then
    raise exception 'Template id is required.';
  end if;
  -- KEEP missing-parent block (20260522091621:87-98)
  -- REMOVE hierarchy block (:100-113)
  -- REMOVE rows-must-be-area block (:115-125)
  -- KEEP cycle block (:127-151)
end;
$$;
```
`enforce_estimate_template_node_tree()` + trigger (`:155-178`) unchanged.

**3b. `enforce_estimate_template_row_item_area_node()` + trigger (`:180-205`)** — drop both:
```sql
drop trigger if exists estimate_template_row_items_enforce_area_node on public.estimate_template_row_items;
drop function if exists public.enforce_estimate_template_row_item_area_node();
```

**3c. `estimate_template_nodes_active_kind_check` (table DDL `:27`, `check (kind in ('group','area'))`)** — relax + set default:
```sql
alter table public.estimate_template_nodes
  drop constraint if exists estimate_template_nodes_active_kind_check;
alter table public.estimate_template_nodes
  alter column kind set default 'group'::public.estimate_node_kind;
```

**Important interaction:** `insert_estimate_template_into_estimate` (section F) copies the template tree into the estimate and then calls `validate_estimate_node_tree` (`20260612094734:970`). Since the estimate-side validator is now permissive, a template that holds rows on a former-group node copies in cleanly. No other change needed in the copy logic — it already copies `kind` verbatim (`:886`) and copies rows onto their mapped nodes regardless of kind.

---

## (4) EXISTING BETA DATA — zero movement required; here is the proof obligation

**No `UPDATE`/`DELETE` of data is needed.** Every existing row is already valid under the new permissive rules — collapsing kinds only *removes* constraints, never tightens them. Specifically:

- Existing `group` and `area` nodes: both remain legal `estimate_nodes`. The new validator accepts any `kind` for any parent/child relationship, so no tree that validated before can newly fail. (Strictly: the new rule set ⊂ the old rule set, so the valid-tree set only grows.)
- Existing rows: all currently sit on `area` nodes (old guard enforced it). The new `insert_estimate_row_item_with_history` and validator no longer require that, so they stay valid trivially. No orphans created.
- Missing-parent / cross-tab / cycle: all three checks are **kept**, so any tree that satisfied them still does.
- The `20260520222038:5-7` normalization (`lot/general/structure/level/assembly → group`) already ran historically; remaining live `kind` values are only `group`/`area`. After this migration both are simply un-constrained labels.
- Snapshots/share: `estimate_sheet_snapshot` and the share/reconstruct path read `kind` as an opaque passthrough and (per the already-established facts) **derive** kind from structure on the read side. Removing DB kind constraints cannot invalidate an existing snapshot JSON. Dormant restore is untouched.

**Recommended guard (defensive, not corrective)** — add a transactional assertion block at the END of the migration that proves no tree became invalid (it should always pass; if it ever fails the whole migration rolls back):

```sql
do $$
declare bad_count integer;
begin
  -- every node's parent is in the same tab (cross-tab invariant still holds)
  select count(*) into bad_count
  from public.estimate_nodes c
  join public.estimate_nodes p on p.id = c.parent_id
  where c.estimate_tab_id <> p.estimate_tab_id;
  if bad_count <> 0 then raise exception 'Post-unify: % cross-tab parent links', bad_count; end if;

  -- no orphan rows (row.node points at a real node in the same estimate)
  select count(*) into bad_count
  from public.estimate_row_items r
  left join public.estimate_nodes n on n.id = r.node_id and n.estimate_id = r.estimate_id
  where n.id is null;
  if bad_count <> 0 then raise exception 'Post-unify: % orphan row items', bad_count; end if;

  -- no missing parents
  select count(*) into bad_count
  from public.estimate_nodes c
  left join public.estimate_nodes p on p.id = c.parent_id and p.estimate_id = c.estimate_id
  where c.parent_id is not null and p.id is null;
  if bad_count <> 0 then raise exception 'Post-unify: % missing parents', bad_count; end if;
end;
$$;
```
Optionally also `perform public.validate_estimate_node_tree(e.id)` in a loop over all `estimates` to prove every live tree passes the new validator before commit. Cheap on beta-scale data, and it converts "should be fine" into a hard gate.

---

## (5) ENUM HANDLING — the safe sequence (do NOTHING to the enum)

**Recommendation: leave `public.estimate_node_kind` exactly as-is** — all 7 values (`lot, general, structure, level, area, group, assembly`, per `types.ts:3510-3517,3679-3687`).

- PostgreSQL **cannot drop enum values in place** (`ALTER TYPE ... DROP VALUE` does not exist). The only way to shrink an enum is the heavy ritual: create a new type, `ALTER TABLE ... ALTER COLUMN ... TYPE new_type USING ...` for **every** column that uses it (`estimate_nodes.kind`, `estimate_template_nodes.kind`, plus the `create_estimate_node_with_history` / AI RPC parameter types), drop the old type, rename. That touches RPC signatures, regenerated types, and the dormant snapshot stack — high blast radius for zero functional gain.
- Since the decision is to keep `kind` as a vestigial column (section 2), the enum's *extra* values are harmless: nothing is required to *write* them, the column just defaults to `'group'`. Legacy snapshot/event JSON that contains `'lot'`/`'assembly'` etc. remains readable.
- **If a value must be added later** (e.g. a future repurpose), `ALTER TYPE public.estimate_node_kind ADD VALUE IF NOT EXISTS '...';` is safe and was already used at `20260518105000:3`. Note the standing caveat: an `ADD VALUE` cannot be used in the same transaction that then writes that new value — but we are not adding any value, so this does not apply.

Net: **the enum is frozen and untouched.** This is the safest path and avoids the one-way enum-shrink trap entirely.

---

## (6) ROLLBACK STORY & ONE-WAY RISKS

**The DDL itself is fully reversible** (it only relaxes constraints and rebuilds function bodies). A down-migration is straightforward: `create or replace` each of the five functions back to their pre-unify authoritative bodies, recreate `enforce_estimate_row_item_area_node()` + trigger and `enforce_estimate_template_row_item_area_node()` + trigger, and re-add `estimate_nodes_active_kind_check` / `estimate_template_nodes_active_kind_check` as `... not valid` then `validate constraint`.

**The one-way risk is DATA, not DDL.** Once the constraints are relaxed and shipped, users will create trees the old rules forbade:
- rows attached to former-`group` nodes (or to root nodes),
- `area` nodes with child nodes,
- non-`group` roots.

The moment any such tree exists, **re-adding the old CHECK / triggers will fail** (`validate constraint` and the `not valid → validate` path both error on the first offending row), and `validate_estimate_node_tree`'s old hierarchy/area blocks would start raising on every mutation of those estimates. So:

- **Rolling back DDL is only clean while no post-unify-shaped data exists.** After real usage, a true rollback requires a *data remediation* pass (e.g. auto-wrapping orphaned rows back under synthetic area nodes, demoting child-bearing areas) — i.e. exactly the auto-wrap/convert machinery the decision is deleting. There is no automatic, lossless inverse.
- **Mitigation / point of no return:** treat the moment this ships to users as the commit point. Before that, the down-migration is safe. Capture a logical backup (or a Supabase branch snapshot) of `estimate_nodes`, `estimate_row_items`, `estimate_template_nodes`, `estimate_template_row_items` immediately pre-deploy so a worst-case recovery is "restore tables," not "rebuild a converter."
- **Enum:** because we touch nothing on the enum, there is **no enum rollback risk** — this is the main reason to leave it alone (an enum shrink would itself be a one-way operation).
- **AI / snapshot stacks:** untouched, so they carry no rollback exposure from this migration. (They retain their own pre-existing `estimate_tab_id` debt independent of this change.)

**Bottom line:** ship as one transactional migration; it is constraint-relaxing and data-safe (zero movement, validated by the section-4 guard block). The only irreversibility is behavioral — once users author unified trees, you cannot mechanically reconstitute the two-kind shape, which is the intended, accepted consequence of the committed decision.
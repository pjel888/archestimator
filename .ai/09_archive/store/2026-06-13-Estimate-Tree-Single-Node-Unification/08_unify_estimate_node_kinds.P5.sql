-- ============================================================================
-- Unify estimate node kinds — RELAX-ONLY migration (Phase 5)
-- ============================================================================
-- DELIVERABLE P0.3. This is the COMPLETE, applyable DDL for the Phase-5
-- relax-only migration. It is authored by copying the CURRENT authoritative
-- function bodies (verified 2026-06-13 against live source) and removing
-- exactly the two-kind enforcement blocks.
--
-- WHERE THE AUTHORITATIVE DEFINITIONS LIVE (ground-truthed — see 06_GROUND_TRUTH):
--   validate_estimate_node_tree              20260612094734_estimate_tabs_foundation.sql:208-295
--   reorder_estimate_nodes                   20260612094734_estimate_tabs_foundation.sql:322-532
--   enforce_estimate_row_item_area_node      20260520222038_enforce_two_kind_estimate_nodes.sql:131-150
--   validate_estimate_template_tree          20260522091621_component_library_templates.sql:77-153  (NOT the tabs migration)
--   enforce_estimate_template_row_item_area_node  20260522091621_component_library_templates.sql:180-199
--
-- IMPLEMENTATION NOTE: At P5 time, run `supabase migration new unify_estimate_node_kinds`
-- and paste this body into the generated file (do NOT hand-pick a timestamp).
--
-- SCOPE DECISION (see 09_P1_DESIGN_DECISIONS §D5-RPC-SPLIT — adopted plan contract):
--   This file relaxes the VALIDATORS + ROW TRIGGERS + REORDER only. The three
--   RPC kind-guards (insert_estimate_row_item_with_history :349,
--   insert_estimate_template_into_estimate :824, insert_estimate_subtree_into_estimate :87)
--   are deliberately LEFT IN PLACE here so they keep ROW/TEMPLATE writes withheld
--   until Phase 6 (enable-writes). The exact P6 edits are at the bottom of this file.
--   The original "single DB migration in P5" alternative would append the P6
--   block to this file, but that is not the active plan.
--
-- `create or replace function` PRESERVES existing privileges, so the trigger
-- wiring and grants do not need to be dropped/recreated; we replay grants at the
-- end purely as idempotent insurance (invariant I5).
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- 1. validate_estimate_node_tree  [REMOVE hierarchy block; RELAX rows block to orphan-only]
--    PRESERVED: missing-parent (I3), cross-tab (I2), cycle (I1).
-- ----------------------------------------------------------------------------
create or replace function public.validate_estimate_node_tree(target_estimate_id uuid)
returns void
language plpgsql
set search_path = public
as $$
begin
  if target_estimate_id is null then
    raise exception 'Estimate id is required.';
  end if;

  -- [PRESERVED · I3] missing-parent / referential integrity
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

  -- [PRESERVED · I2] cross-tab isolation (parent must be in the same tab)
  if exists (
    select 1
    from public.estimate_nodes child
    join public.estimate_nodes parent on parent.id = child.parent_id
    where child.estimate_id = target_estimate_id
      and child.estimate_tab_id <> parent.estimate_tab_id
  ) then
    raise exception 'Estimate node tree contains a parent from another tab.';
  end if;

  -- [REMOVED] two-kind hierarchy block (was 20260612094734:241-255):
  --   "root must be group / only group may parent group|area".
  --   Unification: any node may be a root and any node may parent any node.

  -- [RELAXED] row-items must belong to a node IN the estimate (was :257-267).
  --   The `node.kind <> 'area'` clause is dropped; the orphan/same-estimate
  --   half is KEPT (this is the only DB guard that runs on row-item writes via
  --   the validator path — the per-row trigger below carries the write-time half).
  if exists (
    select 1
    from public.estimate_row_items row_item
    left join public.estimate_nodes node
      on node.id = row_item.node_id
      and node.estimate_id = row_item.estimate_id
    where row_item.estimate_id = target_estimate_id
      and node.id is null
  ) then
    raise exception 'Estimate row items must belong to a node in the same estimate.';
  end if;

  -- [PRESERVED · I1] cycle detection
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
      select
        walk.origin_id,
        parent.parent_id,
        walk.path || parent.id,
        parent.id = any(walk.path)
      from walk
      join tree_nodes parent on parent.id = walk.parent_id
      where not walk.has_cycle
    )
    select 1
    from walk
    where has_cycle
  ) then
    raise exception 'Estimate node tree creates a cycle.';
  end if;
end;
$$;

-- ----------------------------------------------------------------------------
-- 2. reorder_estimate_nodes  [REMOVE the inline hierarchy block (was :427-451)]
--    Everything else verbatim: missing-parent, cycle, duplicate-sort, the
--    update, and the trailing validate_estimate_node_tree() call (which is the
--    authoritative gate the reorder pre-checks merely front-run).
-- ----------------------------------------------------------------------------
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
  if target_estimate_id is null then
    raise exception 'Estimate id is required.';
  end if;

  if move_updates is null or jsonb_typeof(move_updates) <> 'array' then
    raise exception 'Estimate node reorder updates must be a JSON array.';
  end if;

  select count(*), count(distinct input.id)
    into input_count, distinct_id_count
  from jsonb_to_recordset(move_updates) as input(id uuid, parent_id uuid, sort_order integer);

  if input_count = 0 then
    raise exception 'At least one estimate node reorder update is required.';
  end if;

  if input_count <> distinct_id_count then
    raise exception 'duplicate estimate node reorder ids';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(move_updates) as input(id uuid, parent_id uuid, sort_order integer)
    where input.id is null
      or input.sort_order is null
      or input.sort_order < 0
  ) then
    raise exception 'Invalid estimate node reorder payload.';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(move_updates) as input(id uuid, parent_id uuid, sort_order integer)
    left join public.estimate_nodes node
      on node.id = input.id
      and node.estimate_id = target_estimate_id
    where node.id is null
  ) then
    raise exception 'all estimate node reorder ids must belong to the target estimate';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(move_updates) as input(id uuid, parent_id uuid, sort_order integer)
    where input.parent_id is not null
      and not exists (
        select 1
        from public.estimate_nodes parent_node
        where parent_node.id = input.parent_id
          and parent_node.estimate_id = target_estimate_id
      )
  ) then
    raise exception 'all estimate node reorder parents must belong to the target estimate';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(move_updates) as input(id uuid, parent_id uuid, sort_order integer)
    join public.estimate_nodes node on node.id = input.id and node.estimate_id = target_estimate_id
    join public.estimate_nodes parent_node on parent_node.id = input.parent_id and parent_node.estimate_id = target_estimate_id
    where input.parent_id is not null
      and parent_node.estimate_tab_id <> node.estimate_tab_id
  ) then
    raise exception 'Estimate node reorder cannot move nodes across tabs.';
  end if;

  perform 1
  from public.estimate_nodes node
  where node.estimate_id = target_estimate_id
  for update;

  -- [PRESERVED · I3] missing-parent on the projected (post-move) tree
  if exists (
    with input as (
      select *
      from jsonb_to_recordset(move_updates) as input(id uuid, parent_id uuid, sort_order integer)
    ),
    final_nodes as (
      select
        node.id,
        case when input.id is not null then input.parent_id else node.parent_id end as parent_id,
        node.kind,
        node.estimate_tab_id
      from public.estimate_nodes node
      left join input on input.id = node.id
      where node.estimate_id = target_estimate_id
    )
    select 1
    from final_nodes child
    left join final_nodes parent on parent.id = child.parent_id and parent.estimate_tab_id = child.estimate_tab_id
    where child.parent_id is not null
      and parent.id is null
  ) then
    raise exception 'Estimate node reorder creates a missing parent reference.';
  end if;

  -- [REMOVED] inline two-kind hierarchy block (was 20260612094734:427-451):
  --   "root must be group / only group may parent group|area".
  --   The trailing validate_estimate_node_tree() call remains the single source
  --   of truth for tree legality; with the validator relaxed (step 1) this
  --   pre-check is now both wrong and redundant, so it is removed.

  -- [PRESERVED · I1] cycle detection on the projected tree
  if exists (
    with recursive input as (
      select *
      from jsonb_to_recordset(move_updates) as input(id uuid, parent_id uuid, sort_order integer)
    ),
    final_nodes as (
      select
        node.id,
        case when input.id is not null then input.parent_id else node.parent_id end as parent_id
      from public.estimate_nodes node
      left join input on input.id = node.id
      where node.estimate_id = target_estimate_id
    ),
    walk(origin_id, parent_id, path, has_cycle) as (
      select final_nodes.id, final_nodes.parent_id, array[final_nodes.id], false
      from final_nodes
      union all
      select
        walk.origin_id,
        parent.parent_id,
        walk.path || parent.id,
        parent.id = any(walk.path)
      from walk
      join final_nodes parent on parent.id = walk.parent_id
      where not walk.has_cycle
    )
    select 1
    from walk
    where has_cycle
  ) then
    raise exception 'Estimate node reorder creates a cycle.';
  end if;

  if exists (
    with input as (
      select *
      from jsonb_to_recordset(move_updates) as input(id uuid, parent_id uuid, sort_order integer)
    ),
    final_nodes as (
      select
        node.id,
        node.estimate_tab_id,
        case when input.id is not null then input.parent_id else node.parent_id end as parent_id,
        case when input.id is not null then input.sort_order else node.sort_order end as sort_order
      from public.estimate_nodes node
      left join input on input.id = node.id
      where node.estimate_id = target_estimate_id
    )
    select 1
    from final_nodes
    group by estimate_tab_id, coalesce(parent_id::text, '__estimate_tree_root__'), sort_order
    having count(*) > 1
  ) then
    raise exception 'Estimate node reorder creates duplicate sibling sort orders.';
  end if;

  set constraints estimate_nodes_tab_unique_sort, estimate_nodes_tab_unique_sort_with_root deferred;

  with input as (
    select *
    from jsonb_to_recordset(move_updates) as input(id uuid, parent_id uuid, sort_order integer)
  )
  update public.estimate_nodes node
  set parent_id = input.parent_id,
      sort_order = input.sort_order
  from input
  where node.id = input.id
    and node.estimate_id = target_estimate_id;

  get diagnostics updated_count = row_count;

  if updated_count <> input_count then
    raise exception 'Estimate node reorder did not update every requested node.';
  end if;

  perform public.validate_estimate_node_tree(target_estimate_id);

  return updated_count;
end;
$$;

-- ----------------------------------------------------------------------------
-- 3. enforce_estimate_row_item_area_node  [RELAX, do NOT drop]
--    The plan (02 §B step 1) said "drop the trigger + function". GROUND-TRUTH
--    CORRECTION: this trigger is the ONLY DB guard that runs on a row-item
--    write (the validator fires only on estimate_nodes changes). Dropping it
--    removes the same-estimate referential guard for direct row writes. We keep
--    the trigger and relax it to an existence check (drop only `kind='area'`).
--    Vestigial name retained (rename deferred to Phase 7 hygiene).
-- ----------------------------------------------------------------------------
create or replace function public.enforce_estimate_row_item_area_node()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.estimate_nodes node
    where node.id = new.node_id
      and node.estimate_id = new.estimate_id
  ) then
    raise exception 'Estimate row items must belong to a node in the same estimate.';
  end if;

  return null;
end;
$$;

-- ----------------------------------------------------------------------------
-- 4. validate_estimate_template_tree  [REMOVE hierarchy; RELAX rows to orphan-only]
--    PRESERVED: missing-parent, cycle. (Template tree has no cross-tab block.)
-- ----------------------------------------------------------------------------
create or replace function public.validate_estimate_template_tree(target_template_id uuid)
returns void
language plpgsql
set search_path = public
as $$
begin
  if target_template_id is null then
    raise exception 'Template id is required.';
  end if;

  -- [PRESERVED] missing-parent / referential integrity
  if exists (
    select 1
    from public.estimate_template_nodes child
    left join public.estimate_template_nodes parent
      on parent.id = child.parent_id
      and parent.template_id = child.template_id
    where child.template_id = target_template_id
      and child.parent_id is not null
      and parent.id is null
  ) then
    raise exception 'Template node tree contains a missing parent reference.';
  end if;

  -- [REMOVED] two-kind hierarchy block (was 20260522091621:100-113).

  -- [RELAXED] template row-items must belong to a node in the template (was :115-125).
  if exists (
    select 1
    from public.estimate_template_row_items row_item
    left join public.estimate_template_nodes node
      on node.id = row_item.template_node_id
      and node.template_id = row_item.template_id
    where row_item.template_id = target_template_id
      and node.id is null
  ) then
    raise exception 'Template row items must belong to a node in the same template.';
  end if;

  -- [PRESERVED] cycle detection
  if exists (
    with recursive tree_nodes as (
      select node.id, node.parent_id
      from public.estimate_template_nodes node
      where node.template_id = target_template_id
    ),
    walk(origin_id, parent_id, path, has_cycle) as (
      select tree_nodes.id, tree_nodes.parent_id, array[tree_nodes.id], false
      from tree_nodes
      union all
      select
        walk.origin_id,
        parent.parent_id,
        walk.path || parent.id,
        parent.id = any(walk.path)
      from walk
      join tree_nodes parent on parent.id = walk.parent_id
      where not walk.has_cycle
    )
    select 1
    from walk
    where has_cycle
  ) then
    raise exception 'Template node tree creates a cycle.';
  end if;
end;
$$;

-- ----------------------------------------------------------------------------
-- 5. enforce_estimate_template_row_item_area_node  [RELAX, do NOT drop]
-- ----------------------------------------------------------------------------
create or replace function public.enforce_estimate_template_row_item_area_node()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.estimate_template_nodes node
    where node.id = new.template_node_id
      and node.template_id = new.template_id
  ) then
    raise exception 'Template row items must belong to a node in the same template.';
  end if;

  return null;
end;
$$;

-- ----------------------------------------------------------------------------
-- 6. Grant replay (invariant I5 — idempotent insurance; create-or-replace
--    already preserves these, but we restate the authoritative posture).
-- ----------------------------------------------------------------------------
revoke execute on function public.validate_estimate_node_tree(uuid) from public, anon;
grant  execute on function public.validate_estimate_node_tree(uuid) to authenticated;

revoke execute on function public.reorder_estimate_nodes(uuid, jsonb) from public, anon, authenticated;

revoke execute on function public.enforce_estimate_row_item_area_node() from public;

revoke execute on function public.validate_estimate_template_tree(uuid) from public;
grant  execute on function public.validate_estimate_template_tree(uuid) to authenticated;

revoke execute on function public.enforce_estimate_template_row_item_area_node() from public, anon, authenticated;

-- ----------------------------------------------------------------------------
-- 7. Transactional integrity assertion block (converts "should be fine" into a
--    hard gate). Aborts the migration if prod data already violates a PRESERVED
--    invariant, or if a mixed node somehow already exists (which would void the
--    reversible-until-first-write guarantee).
-- ----------------------------------------------------------------------------
do $$
declare
  orphan_rows           bigint;
  cross_tab_parents     bigint;
  missing_parents       bigint;
  tmpl_orphan_rows      bigint;
  mixed_estimate_nodes  bigint;
  mixed_template_nodes  bigint;
begin
  -- orphan row items (estimate)
  select count(*) into orphan_rows
  from public.estimate_row_items r
  left join public.estimate_nodes n on n.id = r.node_id and n.estimate_id = r.estimate_id
  where n.id is null;

  -- cross-tab parents
  select count(*) into cross_tab_parents
  from public.estimate_nodes child
  join public.estimate_nodes parent on parent.id = child.parent_id
  where child.estimate_tab_id <> parent.estimate_tab_id;

  -- missing parents
  select count(*) into missing_parents
  from public.estimate_nodes child
  left join public.estimate_nodes parent on parent.id = child.parent_id
  where child.parent_id is not null and parent.id is null;

  -- orphan template row items
  select count(*) into tmpl_orphan_rows
  from public.estimate_template_row_items r
  left join public.estimate_template_nodes n on n.id = r.template_node_id and n.template_id = r.template_id
  where n.id is null;

  -- mixed nodes (a node with BOTH children AND its own rows) — MUST be 0 pre-P6.
  -- If > 0 here, a mixed node was created out-of-band; abort so rollback stays clean.
  select count(*) into mixed_estimate_nodes
  from public.estimate_nodes n
  where exists (select 1 from public.estimate_nodes c where c.parent_id = n.id)
    and exists (select 1 from public.estimate_row_items r where r.node_id = n.id);

  select count(*) into mixed_template_nodes
  from public.estimate_template_nodes n
  where exists (select 1 from public.estimate_template_nodes c where c.parent_id = n.id)
    and exists (select 1 from public.estimate_template_row_items r where r.template_node_id = n.id);

  if orphan_rows <> 0 or cross_tab_parents <> 0 or missing_parents <> 0 or tmpl_orphan_rows <> 0 then
    raise exception 'Integrity pre-flight FAILED: orphan_rows=%, cross_tab=%, missing_parents=%, tmpl_orphan_rows=%',
      orphan_rows, cross_tab_parents, missing_parents, tmpl_orphan_rows;
  end if;

  if mixed_estimate_nodes <> 0 or mixed_template_nodes <> 0 then
    raise exception 'Integrity pre-flight FAILED: a mixed-content node already exists (estimate=%, template=%) — rollback would no longer be clean. ABORT.',
      mixed_estimate_nodes, mixed_template_nodes;
  end if;

  raise notice 'Integrity assertions passed: 0 orphan/cross-tab/missing-parent/mixed nodes (estimate + template).';
end;
$$;

commit;

-- ============================================================================
-- PHASE 6 RPC-GUARD RELAXATION (ships WITH the create-flow UI — enable-writes).
-- ============================================================================
-- These three RPCs hold the `kind` guard that keeps ROW/TEMPLATE writes withheld
-- after Phase 5. Relaxing them is the act that ENABLES creating mixed content,
-- so they belong with the Phase-6 write flow. Each edit is a single-clause drop;
-- at P6 time copy the CURRENT full body via `supabase migration new` and delete
-- the marked line (do not hand-transcribe the large bodies).
--
--   (a) insert_estimate_row_item_with_history
--       20260524050746_add_estimate_row_contingency_percentage.sql:349
--       DROP:  `      and node.kind = 'area'`
--       KEEP:  the `node.id = target_node_id and node.estimate_id = target_estimate_id`
--              existence check (and the `raise 'Target ... not found'`, reworded).
--
--   (b) insert_estimate_template_into_estimate
--       20260612094734_estimate_tabs_foundation.sql:824
--       DROP:  `    and node.kind = 'group'`
--       KEEP:  the parent-in-estimate lookup + `raise 'Target ... not found'` (reworded).
--
--   (c) insert_estimate_subtree_into_estimate   ⚠ NEWER THAN THE RESEARCH — was
--       missing from the plan's migration list (added 20260613134852).
--       20260613134852_insert_estimate_subtree_rpc.sql:87
--       DROP:  `    and node.kind = 'group'`
--       KEEP:  the parent-in-estimate lookup + `raise 'Target ... not found'` (reworded).
--
-- OUT OF SCOPE (dormant AI; do NOT touch — it inherits the relaxed RPCs if
-- reawakened): create_project_estimate_package_with_history
-- (20260528003000_ai_package_builder_apply_rpc.sql:372) carries `<> 'area'`.
-- ============================================================================

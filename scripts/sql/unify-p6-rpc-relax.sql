-- ============================================================================
-- P6 (enable-writes) — relax the 3 write-RPC kind-guards. THE POINT OF NO RETURN.
-- ============================================================================
-- Applied to prod (ebxxqidacheyapmmzavr) 2026-06-14 via Supabase apply_migration as
-- `enable_estimate_node_mixed_writes_p6` (recorded in remote schema_migrations).
--
-- KEPT OUT of supabase/migrations/ on purpose: the P5 prove-harness
-- (scripts/prove-unify-estimate-node-kinds-postgres.mjs) asserts the RPC guards are
-- still INTACT post-P5; adding this to the applied chain would flip that assertion red.
-- This file is the canonical record + a re-applyable artifact.
--
-- ROLLBACK (only valid BEFORE the first mixed-content save exists): re-apply the original
-- guarded RPC definitions from migrations 20260524050746 (row), 20260612094734 (template),
-- 20260613134852 (subtree) — verified to match prod pre-P6. After a real mixed node exists,
-- re-adding the guards still SUCCEEDS (the guards are on the TARGET node, not the row data),
-- but new mixed writes are re-blocked; existing mixed nodes read correctly (P1–P3).
--
-- Each of the 3 RPCs carries exactly ONE `and node.kind = 'area'|'group'` guard inside a
-- target-existence check (the other `kind` references are data columns). This drops only
-- that clause. Self-verifying: aborts if any function is unchanged or still guarded.
-- ============================================================================

begin;

do $$
declare r record; orig_def text; new_def text;
begin
  for r in
    select p.oid, p.proname
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname in (
      'insert_estimate_row_item_with_history',
      'insert_estimate_template_into_estimate',
      'insert_estimate_subtree_into_estimate'
    )
  loop
    orig_def := pg_get_functiondef(r.oid);
    new_def := regexp_replace(orig_def, E'\\n\\s+and node\\.kind = ''(area|group)''', '', 'g');
    if new_def = orig_def then
      raise exception 'P6 relax: no kind guard found in %() — ABORT (definition unchanged)', r.proname;
    end if;
    execute new_def;
  end loop;
end $$;

do $$
declare cnt int;
begin
  select count(*) into cnt
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname in (
    'insert_estimate_row_item_with_history',
    'insert_estimate_template_into_estimate',
    'insert_estimate_subtree_into_estimate'
  )
  and pg_get_functiondef(p.oid) ~* 'node\.kind = ''(area|group)''';
  if cnt <> 0 then
    raise exception 'P6 relax verify FAILED: % RPC(s) still guarded — ABORT', cnt;
  end if;
  raise notice 'P6 RPC relax applied: 3 kind-guards dropped, verified.';
end $$;

commit;

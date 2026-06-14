-- ============================================================================
-- P6 (enable-writes): relax estimate insert RPC kind gates.
-- ============================================================================
-- Applied to hosted Archestimator project ebxxqidacheyapmmzavr on 2026-06-14
-- as remote migration version 20260614013638_enable_estimate_node_mixed_writes_p6.
--
-- This committed migration intentionally matches that hosted version so fresh
-- environments reach the same single-node write behavior while hosted prod
-- skips it as already recorded in schema_migrations.
--
-- Scope: drop only the stale target-node kind clauses from the three insert
-- RPCs. Same-estimate, same-workspace, tab, source access, orphan, cycle, and
-- cross-tab guards remain owned by the surrounding function bodies and P5
-- validators.
-- ============================================================================

begin;

do $$
declare
  function_count integer;
  function_record record;
  original_definition text;
  relaxed_definition text;
  relaxed_count integer := 0;
begin
  select count(*)
    into function_count
  from pg_proc proc
  join pg_namespace namespace on namespace.oid = proc.pronamespace
  where namespace.nspname = 'public'
    and proc.proname in (
      'insert_estimate_row_item_with_history',
      'insert_estimate_template_into_estimate',
      'insert_estimate_subtree_into_estimate'
    );

  if function_count <> 3 then
    raise exception 'P6 RPC relax expected 3 target functions, found %.', function_count;
  end if;

  for function_record in
    select proc.oid, proc.proname
    from pg_proc proc
    join pg_namespace namespace on namespace.oid = proc.pronamespace
    where namespace.nspname = 'public'
      and proc.proname in (
        'insert_estimate_row_item_with_history',
        'insert_estimate_template_into_estimate',
        'insert_estimate_subtree_into_estimate'
      )
    order by proc.proname
  loop
    original_definition := pg_get_functiondef(function_record.oid);
    relaxed_definition := regexp_replace(
      original_definition,
      E'\\n\\s+and node\\.kind = ''(area|group)''',
      '',
      'g'
    );

    if relaxed_definition <> original_definition then
      execute relaxed_definition;
      relaxed_count := relaxed_count + 1;
    end if;
  end loop;

  raise notice 'P6 RPC relax completed; % function(s) changed, already-relaxed functions skipped.', relaxed_count;
end $$;

do $$
declare
  remaining_guard_count integer;
begin
  select count(*)
    into remaining_guard_count
  from pg_proc proc
  join pg_namespace namespace on namespace.oid = proc.pronamespace
  where namespace.nspname = 'public'
    and proc.proname in (
      'insert_estimate_row_item_with_history',
      'insert_estimate_template_into_estimate',
      'insert_estimate_subtree_into_estimate'
    )
    and pg_get_functiondef(proc.oid) ~* E'\\n\\s+and node\\.kind = ''(area|group)''';

  if remaining_guard_count <> 0 then
    raise exception 'P6 RPC relax verify failed: % RPC(s) still have target kind guards.', remaining_guard_count;
  end if;
end $$;

commit;

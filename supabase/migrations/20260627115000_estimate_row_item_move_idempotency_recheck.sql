begin;
do $$
declare
  function_definition text;
  post_lock_marker text := $marker$
  if not found then
    raise exception 'Estimate not found in the current project.';
  end if;

  set constraints estimate_row_items_unique_sort deferred;
$marker$;
  post_lock_recheck text := $patch$
  if not found then
    raise exception 'Estimate not found in the current project.';
  end if;

  committed_result := public.estimate_sheet_event_result(target_estimate_id, correlation_id);
  if committed_result is not null then
    return committed_result || jsonb_build_object(
      'updatedRowCount', coalesce(nullif(committed_result #>> '{payload,updatedRowCount}', '')::integer, 0),
      'rows', coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'rowId', row_item.id,
            'nodeId', row_item.node_id,
            'sortOrder', row_item.sort_order,
            'rowRevision', row_item.row_revision
          )
          order by row_item.node_id, row_item.sort_order, row_item.id
        )
        from public.estimate_row_items row_item
        where row_item.estimate_id = target_estimate_id
          and row_item.node_id in (source_node_id, target_node_id)
      ), '[]'::jsonb)
    );
  end if;

  set constraints estimate_row_items_unique_sort deferred;
$patch$;
begin
  select pg_get_functiondef('public.move_estimate_row_item_with_history(uuid, uuid, uuid, jsonb, uuid, uuid, uuid, uuid)'::regprocedure)
    into function_definition;

  if function_definition is null then
    raise exception 'move_estimate_row_item_with_history RPC was not found.';
  end if;

  if position(post_lock_recheck in function_definition) = 0 then
    if position(post_lock_marker in function_definition) = 0 then
      raise exception 'move_estimate_row_item_with_history idempotency patch marker was not found.';
    end if;

    function_definition := replace(function_definition, post_lock_marker, post_lock_recheck);
    execute function_definition;
  end if;
end;
$$;
revoke all on function public.move_estimate_row_item_with_history(uuid, uuid, uuid, jsonb, uuid, uuid, uuid, uuid) from public, anon;
grant execute on function public.move_estimate_row_item_with_history(uuid, uuid, uuid, jsonb, uuid, uuid, uuid, uuid) to authenticated;
commit;

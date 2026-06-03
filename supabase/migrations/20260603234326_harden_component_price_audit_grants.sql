begin;

alter table public.cost_library_item_price_options enable row level security;
alter table public.cost_library_item_price_history enable row level security;

drop policy if exists "members can manage component price options" on public.cost_library_item_price_options;
drop policy if exists "members can view component price options" on public.cost_library_item_price_options;
drop policy if exists "members can view component price history" on public.cost_library_item_price_history;
drop policy if exists "members can insert component price history" on public.cost_library_item_price_history;

create policy "members can view component price options" on public.cost_library_item_price_options
  for select to authenticated
  using (public.is_workspace_member(workspace_id));

create policy "members can view component price history" on public.cost_library_item_price_history
  for select to authenticated
  using (public.is_workspace_member(workspace_id));

revoke all on public.cost_library_item_price_options from public;
revoke all on public.cost_library_item_price_history from public;
revoke all on public.cost_library_item_price_options from anon;
revoke all on public.cost_library_item_price_history from anon;
revoke insert, update, delete on public.cost_library_item_price_options from authenticated;
revoke insert, update, delete on public.cost_library_item_price_history from authenticated;
revoke truncate, references, trigger on public.cost_library_item_price_options from authenticated;
revoke truncate, references, trigger on public.cost_library_item_price_history from authenticated;

grant select on public.cost_library_item_price_options to authenticated;
grant select on public.cost_library_item_price_history to authenticated;

revoke execute on function public.upsert_cost_library_component_price_option(uuid, uuid, jsonb) from public;
revoke execute on function public.upsert_cost_library_component_price_option(uuid, uuid, jsonb) from anon;
grant execute on function public.upsert_cost_library_component_price_option(uuid, uuid, jsonb) to authenticated;

commit;

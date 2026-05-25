-- Tighten executable grants for component-library mutation helpers. These
-- functions are called by authenticated app actions and should not be exposed
-- through anon/default public EXECUTE grants.

revoke execute on function public.create_cost_library_component(uuid, jsonb, jsonb) from public;
revoke execute on function public.create_cost_library_component(uuid, jsonb, jsonb) from anon;
grant execute on function public.create_cost_library_component(uuid, jsonb, jsonb) to authenticated;

revoke execute on function public.update_cost_library_component(uuid, uuid, jsonb) from public;
revoke execute on function public.update_cost_library_component(uuid, uuid, jsonb) from anon;
grant execute on function public.update_cost_library_component(uuid, uuid, jsonb) to authenticated;

revoke execute on function public.upsert_cost_library_component_price_option(uuid, uuid, jsonb) from public;
revoke execute on function public.upsert_cost_library_component_price_option(uuid, uuid, jsonb) from anon;
grant execute on function public.upsert_cost_library_component_price_option(uuid, uuid, jsonb) to authenticated;

revoke execute on function public.sync_cost_library_item_brand_ref() from public;
revoke execute on function public.sync_cost_library_item_brand_ref() from anon;
revoke execute on function public.sync_cost_library_item_brand_ref() from authenticated;

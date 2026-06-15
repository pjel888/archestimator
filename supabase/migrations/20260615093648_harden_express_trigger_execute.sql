-- Express Components hardening: trigger helpers are not public RPC endpoints.

begin;

revoke execute on function public.rekey_copied_express_component_row_metadata() from public, anon, authenticated;

commit;

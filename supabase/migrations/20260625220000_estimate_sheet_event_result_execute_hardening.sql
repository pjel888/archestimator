-- ============================================================================
-- Harden estimate-sheet idempotency helper execute grants.
--
-- estimate_sheet_event_result is an internal RPC helper used by history
-- mutations to return prior results for repeated correlation IDs. Keep it out
-- of the anonymous API surface while preserving authenticated/service-role
-- execution for server-side RPC chains and diagnostics.
-- ============================================================================

begin;

revoke execute on function public.estimate_sheet_event_result(uuid, uuid) from public, anon;
grant execute on function public.estimate_sheet_event_result(uuid, uuid) to authenticated, service_role;

commit;

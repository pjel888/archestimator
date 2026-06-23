-- Remove unconditional service-role RLS policies. The service role already
-- bypasses RLS; table grants are the correct privilege boundary.
drop policy if exists "project publication service role can insert events" on public.project_publication_events;
drop policy if exists "service role can insert shared link events" on public.shared_link_events;
drop policy if exists "security rate limits service role can manage events" on public.security_rate_limit_events;
drop policy if exists "publication digest log service role can manage" on public.publication_digest_log;

alter table if exists public.profile_role_hardening_audit enable row level security;
revoke all on table public.profile_role_hardening_audit from public, anon, authenticated;
grant select, insert, update, delete on table public.profile_role_hardening_audit to service_role;

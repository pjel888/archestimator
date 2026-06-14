revoke all on table public.account_security_events from public, anon, authenticated;
revoke all on table public.closed_beta_allowed_emails from public, anon, authenticated;
revoke all on table public.collaboration_audit_events from public, anon, authenticated;
revoke all on table public.collaboration_invitation_tokens from public, anon, authenticated;
revoke all on table public.profile_role_hardening_audit from public, anon, authenticated;

drop policy if exists "deny direct api access" on public.account_security_events;
create policy "deny direct api access"
on public.account_security_events
as restrictive
for all
to public
using (false)
with check (false);

drop policy if exists "deny direct api access" on public.closed_beta_allowed_emails;
create policy "deny direct api access"
on public.closed_beta_allowed_emails
as restrictive
for all
to public
using (false)
with check (false);

drop policy if exists "deny direct api access" on public.collaboration_audit_events;
create policy "deny direct api access"
on public.collaboration_audit_events
as restrictive
for all
to public
using (false)
with check (false);

drop policy if exists "deny direct api access" on public.collaboration_invitation_tokens;
create policy "deny direct api access"
on public.collaboration_invitation_tokens
as restrictive
for all
to public
using (false)
with check (false);

drop policy if exists "deny direct api access" on public.profile_role_hardening_audit;
create policy "deny direct api access"
on public.profile_role_hardening_audit
as restrictive
for all
to public
using (false)
with check (false);

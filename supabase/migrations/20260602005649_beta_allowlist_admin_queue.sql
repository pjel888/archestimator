-- Let platform admins manage closed beta allowlist rows from the app.

grant select on table public.closed_beta_allowed_emails to authenticated;
grant insert (normalized_email, status, invited_by, notes, metadata) on table public.closed_beta_allowed_emails to authenticated;
grant update (status, notes, metadata) on table public.closed_beta_allowed_emails to authenticated;

drop policy if exists "platform admins can review closed beta allowlist" on public.closed_beta_allowed_emails;
create policy "platform admins can review closed beta allowlist"
on public.closed_beta_allowed_emails
for select
to authenticated
using (public.is_platform_admin());

drop policy if exists "platform admins can add closed beta allowlist rows" on public.closed_beta_allowed_emails;
create policy "platform admins can add closed beta allowlist rows"
on public.closed_beta_allowed_emails
for insert
to authenticated
with check (public.is_platform_admin());

drop policy if exists "platform admins can update closed beta allowlist rows" on public.closed_beta_allowed_emails;
create policy "platform admins can update closed beta allowlist rows"
on public.closed_beta_allowed_emails
for update
to authenticated
using (public.is_platform_admin())
with check (public.is_platform_admin());

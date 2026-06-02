-- Let platform admins review and triage beta feedback after the base feedback table exists.

grant select on table public.beta_feedback_submissions to authenticated;
grant update (status) on table public.beta_feedback_submissions to authenticated;

drop policy if exists "platform admins can review beta feedback" on public.beta_feedback_submissions;
create policy "platform admins can review beta feedback"
on public.beta_feedback_submissions
for select
to authenticated
using (public.is_platform_admin());

drop policy if exists "platform admins can update beta feedback status" on public.beta_feedback_submissions;
create policy "platform admins can update beta feedback status"
on public.beta_feedback_submissions
for update
to authenticated
using (public.is_platform_admin())
with check (public.is_platform_admin());

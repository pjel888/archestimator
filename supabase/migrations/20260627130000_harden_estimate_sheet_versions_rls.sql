-- Keep named sheet versions at the same estimate-scoped read boundary as sheet activity events.

alter table public.estimate_sheet_versions enable row level security;

drop policy if exists estimate_sheet_versions_select_authenticated on public.estimate_sheet_versions;
drop policy if exists "estimate version sheet readers can read versions" on public.estimate_sheet_versions;

create policy "estimate version sheet readers can read versions" on public.estimate_sheet_versions
  for select to authenticated
  using (public.can_access_estimate(estimate_id));

revoke all on public.estimate_sheet_versions from public, anon, authenticated;
grant select on public.estimate_sheet_versions to authenticated;

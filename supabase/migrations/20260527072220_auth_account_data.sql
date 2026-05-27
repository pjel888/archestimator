create table public.user_onboarding_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  display_name text not null check (length(trim(display_name)) between 1 and 120),
  user_category text not null check (
    user_category in (
      'architect',
      'contractor',
      'engineer',
      'quantity_surveyor',
      'owner_developer',
      'student_educator',
      'other'
    )
  ),
  country_region text not null check (length(trim(country_region)) between 1 and 80),
  primary_use text check (
    primary_use is null
    or primary_use in (
      'project_estimating',
      'cost_library',
      'proposal_packages',
      'learning',
      'other'
    )
  ),
  student_educator_detail text check (student_educator_detail is null or length(trim(student_educator_detail)) <= 160),
  marketing_consent_at timestamptz,
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspace_account_settings (
  workspace_id uuid primary key references public.workspaces(id) on delete cascade,
  organization_name text not null check (length(trim(organization_name)) between 1 and 160),
  organization_type text not null check (
    organization_type in (
      'architecture_design',
      'construction_contractor',
      'engineering_consultancy',
      'quantity_surveying',
      'owner_developer',
      'education',
      'solo_practice',
      'other'
    )
  ),
  country_region text not null check (length(trim(country_region)) between 1 and 80),
  company_size text check (
    company_size is null
    or company_size in ('solo', '2_10', '11_50', '51_200', '201_plus')
  ),
  default_currency text not null default 'PHP' check (default_currency ~ '^[A-Z]{3}$'),
  primary_use text check (
    primary_use is null
    or primary_use in (
      'project_estimating',
      'cost_library',
      'proposal_packages',
      'learning',
      'other'
    )
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.account_security_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (length(trim(event_type)) > 0),
  user_id uuid references public.profiles(id) on delete set null,
  workspace_id uuid references public.workspaces(id) on delete set null,
  request_id text,
  ip_hash text,
  user_agent_hash text,
  metadata_json jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata_json) = 'object'),
  created_at timestamptz not null default now()
);

create index user_onboarding_profiles_completed_idx
  on public.user_onboarding_profiles(user_id, onboarding_completed_at);

create index workspace_account_settings_country_idx
  on public.workspace_account_settings(country_region);

create index account_security_events_user_created_idx
  on public.account_security_events(user_id, created_at desc);

create index account_security_events_workspace_created_idx
  on public.account_security_events(workspace_id, created_at desc);

create or replace function public.can_access_workspace_account_scope(target_workspace_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.is_workspace_member(target_workspace_id)
  or exists (
    select 1
    from public.project_members pm
    where pm.workspace_id = target_workspace_id
      and pm.user_id = auth.uid()
  )
  or exists (
    select 1
    from public.estimate_sheet_members esm
    join public.projects p on p.id = esm.project_id
    where p.workspace_id = target_workspace_id
      and esm.user_id = auth.uid()
  );
$$;

drop policy if exists "members can view workspaces" on public.workspaces;
drop policy if exists "workspace account participants can view workspaces" on public.workspaces;
create policy "workspace account participants can view workspaces"
  on public.workspaces
  for select to authenticated
  using (public.can_access_workspace_account_scope(id));

drop trigger if exists user_onboarding_profiles_set_updated_at on public.user_onboarding_profiles;
create trigger user_onboarding_profiles_set_updated_at
  before update on public.user_onboarding_profiles
  for each row execute function public.set_updated_at();

drop trigger if exists workspace_account_settings_set_updated_at on public.workspace_account_settings;
create trigger workspace_account_settings_set_updated_at
  before update on public.workspace_account_settings
  for each row execute function public.set_updated_at();

alter table public.user_onboarding_profiles enable row level security;
alter table public.workspace_account_settings enable row level security;
alter table public.account_security_events enable row level security;

create policy user_onboarding_profiles_select_own
  on public.user_onboarding_profiles
  for select to authenticated
  using (auth.uid() = user_id);

create policy workspace_account_settings_select_member
  on public.workspace_account_settings
  for select to authenticated
  using (public.can_access_workspace_account_scope(workspace_id));

create policy workspace_account_settings_insert_admin
  on public.workspace_account_settings
  for insert to authenticated
  with check (public.is_workspace_admin(workspace_id));

create policy workspace_account_settings_update_admin
  on public.workspace_account_settings
  for update to authenticated
  using (public.is_workspace_admin(workspace_id))
  with check (public.is_workspace_admin(workspace_id));

grant select on public.user_onboarding_profiles to authenticated;
grant select, insert, update on public.workspace_account_settings to authenticated;

revoke insert, update, delete on public.user_onboarding_profiles from authenticated;
revoke all on public.account_security_events from anon, authenticated;
revoke insert, update, delete on public.account_security_events from authenticated;

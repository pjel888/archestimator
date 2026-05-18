-- Supabase Auth integration and CEO/platform access bootstrap.
-- Philip's email receives CEO access automatically after sign-in.

create type public.app_role as enum ('ceo', 'admin', 'member');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  role public.app_role not null default 'member',
  default_workspace_id uuid references public.workspaces(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_email_lowercase check (email = lower(email))
);

create index profiles_email_idx on public.profiles(email);
create index profiles_role_idx on public.profiles(role);

create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();

create or replace function public.resolve_app_role_for_email(raw_email text)
returns public.app_role
language sql
stable
as $$
  select case
    when lower(coalesce(raw_email, '')) = 'philipjonlewis@gmail.com' then 'ceo'::public.app_role
    else 'member'::public.app_role
  end;
$$;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, role)
  values (
    new.id,
    lower(coalesce(new.email, '')),
    coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'full_name'),
    public.resolve_app_role_for_email(new.email)
  )
  on conflict (id) do update
    set email = excluded.email,
        display_name = coalesce(public.profiles.display_name, excluded.display_name),
        role = case
          when public.profiles.role = 'ceo' or excluded.role = 'ceo' then 'ceo'::public.app_role
          when public.profiles.role = 'admin' or excluded.role = 'admin' then 'admin'::public.app_role
          else 'member'::public.app_role
        end,
        updated_at = now();

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

insert into public.profiles (id, email, display_name, role)
select
  u.id,
  lower(coalesce(u.email, '')),
  coalesce(u.raw_user_meta_data->>'display_name', u.raw_user_meta_data->>'full_name'),
  public.resolve_app_role_for_email(u.email)
from auth.users u
on conflict (id) do update
  set email = excluded.email,
      display_name = coalesce(public.profiles.display_name, excluded.display_name),
      role = case
        when public.profiles.email = 'philipjonlewis@gmail.com' or excluded.email = 'philipjonlewis@gmail.com' then 'ceo'::public.app_role
        else public.profiles.role
      end,
      updated_at = now();

create or replace function public.is_platform_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('ceo', 'admin')
  )
  or lower(coalesce(auth.jwt()->>'email', '')) = 'philipjonlewis@gmail.com';
$$;

create or replace function public.current_user_profile()
returns public.profiles
language sql
security definer
set search_path = public
stable
as $$
  select p
  from public.profiles p
  where p.id = auth.uid();
$$;

alter table public.profiles enable row level security;

create policy "users can view own profile" on public.profiles
  for select using (id = auth.uid() or public.is_platform_admin());
create policy "users can update own display name" on public.profiles
  for update using (id = auth.uid() or public.is_platform_admin())
  with check (id = auth.uid() or public.is_platform_admin());
create policy "platform admins can manage profiles" on public.profiles
  for all using (public.is_platform_admin()) with check (public.is_platform_admin());

create policy "platform admins can manage all workspaces" on public.workspaces
  for all using (public.is_platform_admin()) with check (public.is_platform_admin());
create policy "platform admins can manage all memberships" on public.workspace_members
  for all using (public.is_platform_admin()) with check (public.is_platform_admin());
create policy "platform admins can manage all projects" on public.projects
  for all using (public.is_platform_admin()) with check (public.is_platform_admin());
create policy "platform admins can manage all estimates" on public.estimates
  for all using (public.is_platform_admin()) with check (public.is_platform_admin());
create policy "platform admins can manage all cost library items" on public.cost_library_items
  for all using (public.is_platform_admin()) with check (public.is_platform_admin());
create policy "platform admins can manage all estimate nodes" on public.estimate_nodes
  for all using (public.is_platform_admin()) with check (public.is_platform_admin());
create policy "platform admins can manage all estimate row items" on public.estimate_row_items
  for all using (public.is_platform_admin()) with check (public.is_platform_admin());

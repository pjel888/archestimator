-- Explicit, user-visible package-builder memory signals.
-- This stores accepted/rejected component/template source preferences only.
-- It does not store raw prompts, provider responses, retrieved rows, or hidden auth data.

create table if not exists public.ai_package_builder_memory_preferences (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  actor_user_id uuid not null references public.profiles(id) on delete cascade,
  signal text not null check (signal in ('accepted', 'rejected')),
  source_type text not null check (source_type in ('library_item', 'template')),
  source_id uuid not null,
  source_label text not null check (char_length(source_label) between 1 and 160),
  room_name text check (room_name is null or char_length(room_name) <= 160),
  operation_type text check (operation_type is null or char_length(operation_type) <= 80),
  draft_id text not null check (char_length(draft_id) between 1 and 160),
  draft_hash text not null check (draft_hash like 'sha256:%'),
  weight integer not null default 1 check (weight between 1 and 10),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists ai_package_builder_memory_workspace_actor_created_idx
  on public.ai_package_builder_memory_preferences(workspace_id, actor_user_id, created_at desc);

create index if not exists ai_package_builder_memory_workspace_actor_source_idx
  on public.ai_package_builder_memory_preferences(workspace_id, actor_user_id, source_type, source_id, created_at desc);

alter table public.ai_package_builder_memory_preferences enable row level security;

drop policy if exists "actors can view own package-builder memory" on public.ai_package_builder_memory_preferences;
drop policy if exists "actors can insert own package-builder memory" on public.ai_package_builder_memory_preferences;
drop policy if exists "workspace admins can view package-builder memory" on public.ai_package_builder_memory_preferences;

create policy "actors can view own package-builder memory" on public.ai_package_builder_memory_preferences
  for select
  using (actor_user_id = auth.uid() and public.is_workspace_member(workspace_id));

create policy "workspace admins can view package-builder memory" on public.ai_package_builder_memory_preferences
  for select
  using (public.is_workspace_admin(workspace_id));

create policy "actors can insert own package-builder memory" on public.ai_package_builder_memory_preferences
  for insert
  with check (actor_user_id = auth.uid() and public.is_workspace_member(workspace_id));

revoke all on public.ai_package_builder_memory_preferences from public;
revoke all on public.ai_package_builder_memory_preferences from anon;
grant select, insert on public.ai_package_builder_memory_preferences to authenticated;

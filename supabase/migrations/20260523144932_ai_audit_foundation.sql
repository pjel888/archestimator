-- Minimal AI audit foundation for Ask/Draft/Apply observability.
-- This migration stores metadata only; raw prompts, hidden prompts, and full
-- retrieved content stay out of production tables until retention is approved.

do $$
begin
  if not exists (select 1 from pg_type where typnamespace = 'public'::regnamespace and typname = 'ai_interaction_mode') then
    create type public.ai_interaction_mode as enum ('ask', 'draft', 'apply', 'eval');
  end if;

  if not exists (select 1 from pg_type where typnamespace = 'public'::regnamespace and typname = 'ai_run_status') then
    create type public.ai_run_status as enum ('started', 'completed', 'failed', 'blocked');
  end if;

  if not exists (select 1 from pg_type where typnamespace = 'public'::regnamespace and typname = 'ai_redaction_status') then
    create type public.ai_redaction_status as enum ('metadata_only', 'redacted', 'synthetic', 'blocked');
  end if;
end;
$$;

create table if not exists public.ai_action_runs (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null unique default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  actor_user_id uuid not null references auth.users(id) on delete cascade,
  mode public.ai_interaction_mode not null,
  status public.ai_run_status not null default 'started',
  provider text not null default '',
  model text not null default '',
  provider_response_id text,
  request_message_hash text,
  route_context_hash text,
  provider_send_categories text[] not null default '{}'::text[],
  redaction_status public.ai_redaction_status not null default 'metadata_only',
  usage jsonb not null default '{}'::jsonb,
  error_class text,
  blocked_reason text,
  request_host text,
  user_agent_hash text,
  metadata jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint ai_action_runs_request_message_hash_not_raw check (request_message_hash is null or request_message_hash like 'sha256:%'),
  constraint ai_action_runs_route_context_hash_not_raw check (route_context_hash is null or route_context_hash like 'sha256:%')
);

create table if not exists public.ai_tool_calls (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.ai_action_runs(run_id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  actor_user_id uuid not null references auth.users(id) on delete cascade,
  tool_name text not null check (char_length(trim(tool_name)) > 0),
  mode public.ai_interaction_mode not null,
  status public.ai_run_status not null default 'started',
  target_project_id uuid references public.projects(id) on delete set null,
  target_estimate_id uuid references public.estimates(id) on delete set null,
  target_node_id uuid references public.estimate_nodes(id) on delete set null,
  target_row_id uuid references public.estimate_row_items(id) on delete set null,
  args_hash text,
  result_hash text,
  validation_errors jsonb not null default '[]'::jsonb,
  safe_summary text not null default '',
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint ai_tool_calls_args_hash_not_raw check (args_hash is null or args_hash like 'sha256:%'),
  constraint ai_tool_calls_result_hash_not_raw check (result_hash is null or result_hash like 'sha256:%')
);

create table if not exists public.ai_data_access_events (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.ai_action_runs(run_id) on delete cascade,
  tool_call_id uuid references public.ai_tool_calls(id) on delete set null,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  actor_user_id uuid not null references auth.users(id) on delete cascade,
  event_name text not null check (char_length(trim(event_name)) > 0),
  source_tables text[] not null default '{}'::text[],
  target_project_id uuid references public.projects(id) on delete set null,
  target_estimate_id uuid references public.estimates(id) on delete set null,
  target_node_id uuid references public.estimate_nodes(id) on delete set null,
  target_row_id uuid references public.estimate_row_items(id) on delete set null,
  filter_hash text,
  row_count integer not null default 0 check (row_count >= 0),
  blocked_attempt boolean not null default false,
  blocked_reason text,
  redaction_status public.ai_redaction_status not null default 'metadata_only',
  safe_summary text not null default '',
  created_at timestamptz not null default now(),
  constraint ai_data_access_events_filter_hash_not_raw check (filter_hash is null or filter_hash like 'sha256:%')
);

create index if not exists ai_action_runs_workspace_actor_created_idx
  on public.ai_action_runs(workspace_id, actor_user_id, created_at desc);
create index if not exists ai_action_runs_status_created_idx
  on public.ai_action_runs(status, created_at desc);
create index if not exists ai_tool_calls_run_created_idx
  on public.ai_tool_calls(run_id, created_at);
create index if not exists ai_tool_calls_workspace_tool_created_idx
  on public.ai_tool_calls(workspace_id, tool_name, created_at desc);
create index if not exists ai_data_access_events_run_created_idx
  on public.ai_data_access_events(run_id, created_at);
create index if not exists ai_data_access_events_workspace_event_created_idx
  on public.ai_data_access_events(workspace_id, event_name, created_at desc);

create or replace function public.enforce_ai_tool_call_workspace_refs()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.ai_action_runs run
    where run.run_id = new.run_id
      and run.workspace_id = new.workspace_id
      and run.actor_user_id = new.actor_user_id
  ) then
    raise exception 'AI tool call must reference an action run from the same workspace and actor.';
  end if;

  if new.target_project_id is not null and not exists (
    select 1
    from public.projects project
    where project.id = new.target_project_id
      and project.workspace_id = new.workspace_id
  ) then
    raise exception 'AI tool call project target must belong to the same workspace.';
  end if;

  if new.target_estimate_id is not null and not exists (
    select 1
    from public.estimates estimate
    join public.projects project on project.id = estimate.project_id
    where estimate.id = new.target_estimate_id
      and project.workspace_id = new.workspace_id
  ) then
    raise exception 'AI tool call estimate target must belong to the same workspace.';
  end if;

  if new.target_node_id is not null and not exists (
    select 1
    from public.estimate_nodes node
    join public.estimates estimate on estimate.id = node.estimate_id
    join public.projects project on project.id = estimate.project_id
    where node.id = new.target_node_id
      and project.workspace_id = new.workspace_id
  ) then
    raise exception 'AI tool call node target must belong to the same workspace.';
  end if;

  if new.target_row_id is not null and not exists (
    select 1
    from public.estimate_row_items row_item
    join public.estimates estimate on estimate.id = row_item.estimate_id
    join public.projects project on project.id = estimate.project_id
    where row_item.id = new.target_row_id
      and project.workspace_id = new.workspace_id
  ) then
    raise exception 'AI tool call row target must belong to the same workspace.';
  end if;

  return new;
end;
$$;

create or replace function public.enforce_ai_data_access_workspace_refs()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.ai_action_runs run
    where run.run_id = new.run_id
      and run.workspace_id = new.workspace_id
      and run.actor_user_id = new.actor_user_id
  ) then
    raise exception 'AI data access event must reference an action run from the same workspace and actor.';
  end if;

  if new.tool_call_id is not null and not exists (
    select 1
    from public.ai_tool_calls tool_call
    where tool_call.id = new.tool_call_id
      and tool_call.run_id = new.run_id
      and tool_call.workspace_id = new.workspace_id
      and tool_call.actor_user_id = new.actor_user_id
  ) then
    raise exception 'AI data access event tool call must belong to the same run, workspace, and actor.';
  end if;

  if new.target_project_id is not null and not exists (
    select 1
    from public.projects project
    where project.id = new.target_project_id
      and project.workspace_id = new.workspace_id
  ) then
    raise exception 'AI data access project target must belong to the same workspace.';
  end if;

  if new.target_estimate_id is not null and not exists (
    select 1
    from public.estimates estimate
    join public.projects project on project.id = estimate.project_id
    where estimate.id = new.target_estimate_id
      and project.workspace_id = new.workspace_id
  ) then
    raise exception 'AI data access estimate target must belong to the same workspace.';
  end if;

  if new.target_node_id is not null and not exists (
    select 1
    from public.estimate_nodes node
    join public.estimates estimate on estimate.id = node.estimate_id
    join public.projects project on project.id = estimate.project_id
    where node.id = new.target_node_id
      and project.workspace_id = new.workspace_id
  ) then
    raise exception 'AI data access node target must belong to the same workspace.';
  end if;

  if new.target_row_id is not null and not exists (
    select 1
    from public.estimate_row_items row_item
    join public.estimates estimate on estimate.id = row_item.estimate_id
    join public.projects project on project.id = estimate.project_id
    where row_item.id = new.target_row_id
      and project.workspace_id = new.workspace_id
  ) then
    raise exception 'AI data access row target must belong to the same workspace.';
  end if;

  return new;
end;
$$;

drop trigger if exists ai_tool_calls_enforce_workspace_refs on public.ai_tool_calls;
create constraint trigger ai_tool_calls_enforce_workspace_refs
after insert on public.ai_tool_calls
deferrable initially deferred
for each row execute function public.enforce_ai_tool_call_workspace_refs();

drop trigger if exists ai_data_access_events_enforce_workspace_refs on public.ai_data_access_events;
create constraint trigger ai_data_access_events_enforce_workspace_refs
after insert on public.ai_data_access_events
deferrable initially deferred
for each row execute function public.enforce_ai_data_access_workspace_refs();

alter table public.ai_action_runs enable row level security;
alter table public.ai_tool_calls enable row level security;
alter table public.ai_data_access_events enable row level security;

drop policy if exists "actors can view own ai action runs" on public.ai_action_runs;
drop policy if exists "actors can insert own ai action runs" on public.ai_action_runs;
drop policy if exists "workspace admins can view ai action runs" on public.ai_action_runs;
drop policy if exists "actors can view own ai tool calls" on public.ai_tool_calls;
drop policy if exists "actors can insert own ai tool calls" on public.ai_tool_calls;
drop policy if exists "workspace admins can view ai tool calls" on public.ai_tool_calls;
drop policy if exists "actors can view own ai data access events" on public.ai_data_access_events;
drop policy if exists "actors can insert own ai data access events" on public.ai_data_access_events;
drop policy if exists "workspace admins can view ai data access events" on public.ai_data_access_events;

create policy "actors can view own ai action runs" on public.ai_action_runs
  for select to authenticated
  using (actor_user_id = auth.uid() and public.is_workspace_member(workspace_id));
create policy "workspace admins can view ai action runs" on public.ai_action_runs
  for select to authenticated
  using (public.is_workspace_admin(workspace_id));
create policy "actors can insert own ai action runs" on public.ai_action_runs
  for insert to authenticated
  with check (actor_user_id = auth.uid() and public.is_workspace_member(workspace_id));

create policy "actors can view own ai tool calls" on public.ai_tool_calls
  for select to authenticated
  using (actor_user_id = auth.uid() and public.is_workspace_member(workspace_id));
create policy "workspace admins can view ai tool calls" on public.ai_tool_calls
  for select to authenticated
  using (public.is_workspace_admin(workspace_id));
create policy "actors can insert own ai tool calls" on public.ai_tool_calls
  for insert to authenticated
  with check (actor_user_id = auth.uid() and public.is_workspace_member(workspace_id));

create policy "actors can view own ai data access events" on public.ai_data_access_events
  for select to authenticated
  using (actor_user_id = auth.uid() and public.is_workspace_member(workspace_id));
create policy "workspace admins can view ai data access events" on public.ai_data_access_events
  for select to authenticated
  using (public.is_workspace_admin(workspace_id));
create policy "actors can insert own ai data access events" on public.ai_data_access_events
  for insert to authenticated
  with check (actor_user_id = auth.uid() and public.is_workspace_member(workspace_id));

revoke all on public.ai_action_runs from public;
revoke all on public.ai_tool_calls from public;
revoke all on public.ai_data_access_events from public;
revoke all on public.ai_action_runs from anon, authenticated;
revoke all on public.ai_tool_calls from anon, authenticated;
revoke all on public.ai_data_access_events from anon, authenticated;

revoke execute on function public.enforce_ai_tool_call_workspace_refs() from public;
revoke execute on function public.enforce_ai_data_access_workspace_refs() from public;
revoke execute on function public.enforce_ai_tool_call_workspace_refs() from anon, authenticated;
revoke execute on function public.enforce_ai_data_access_workspace_refs() from anon, authenticated;

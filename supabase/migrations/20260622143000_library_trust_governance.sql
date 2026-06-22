-- Library-to-estimate durable trust governance.
-- Adds reviewed cost and attachment lifecycle state behind admin-only RPCs.

set lock_timeout = '5s';
set statement_timeout = '30s';

do $$
begin
  if not exists (select 1 from pg_type where typnamespace = 'public'::regnamespace and typname = 'cost_library_cost_review_status') then
    create type public.cost_library_cost_review_status as enum (
      'proposed',
      'needs_review',
      'accepted',
      'rejected',
      'superseded'
    );
  end if;

  if not exists (select 1 from pg_type where typnamespace = 'public'::regnamespace and typname = 'cost_library_cost_review_event_type') then
    create type public.cost_library_cost_review_event_type as enum (
      'proposed',
      'marked_needs_review',
      'assigned',
      'accepted',
      'locked',
      'unlocked',
      'rejected',
      'superseded'
    );
  end if;

  if not exists (select 1 from pg_type where typnamespace = 'public'::regnamespace and typname = 'cost_library_attachment_review_status') then
    create type public.cost_library_attachment_review_status as enum (
      'uploaded',
      'approved',
      'rejected',
      'superseded'
    );
  end if;

  if not exists (select 1 from pg_type where typnamespace = 'public'::regnamespace and typname = 'cost_library_attachment_review_event_type') then
    create type public.cost_library_attachment_review_event_type as enum (
      'uploaded',
      'approved',
      'rejected',
      'superseded',
      'download_url_issued'
    );
  end if;
end;
$$;

alter table public.cost_library_item_variant_cost_entries
  add column if not exists review_status public.cost_library_cost_review_status not null default 'proposed',
  add column if not exists reviewed_by uuid references auth.users(id) on delete set null,
  add column if not exists reviewed_at timestamptz,
  add column if not exists review_note text,
  add column if not exists assigned_to uuid references auth.users(id) on delete set null,
  add column if not exists review_due_at timestamptz,
  add column if not exists locked_by uuid references auth.users(id) on delete set null,
  add column if not exists locked_at timestamptz,
  add column if not exists lock_reason text,
  add column if not exists superseded_by uuid references public.cost_library_item_variant_cost_entries(id) on delete set null,
  add column if not exists review_revision integer not null default 1;

alter table public.cost_library_item_variant_attachments
  add column if not exists review_status public.cost_library_attachment_review_status not null default 'uploaded',
  add column if not exists applicable_cost_entry_id uuid references public.cost_library_item_variant_cost_entries(id) on delete set null,
  add column if not exists is_current_approved boolean not null default false,
  add column if not exists reviewed_by uuid references auth.users(id) on delete set null,
  add column if not exists reviewed_at timestamptz,
  add column if not exists review_note text,
  add column if not exists superseded_by uuid references public.cost_library_item_variant_attachments(id) on delete set null,
  add column if not exists review_revision integer not null default 1;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'cost_library_cost_review_lock_consistency') then
    alter table public.cost_library_item_variant_cost_entries
      add constraint cost_library_cost_review_lock_consistency
      check (
        (locked_at is null and locked_by is null and lock_reason is null)
        or (review_status = 'accepted' and locked_at is not null and locked_by is not null)
      ) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'cost_library_cost_review_reviewed_consistency') then
    alter table public.cost_library_item_variant_cost_entries
      add constraint cost_library_cost_review_reviewed_consistency
      check (
        review_status not in ('accepted', 'rejected', 'superseded')
        or (reviewed_by is not null and reviewed_at is not null)
      ) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'cost_library_cost_review_supersede_consistency') then
    alter table public.cost_library_item_variant_cost_entries
      add constraint cost_library_cost_review_supersede_consistency
      check (review_status <> 'superseded' or superseded_by is not null) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'cost_library_cost_review_revision_positive') then
    alter table public.cost_library_item_variant_cost_entries
      add constraint cost_library_cost_review_revision_positive
      check (review_revision > 0) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'cost_library_attachment_review_current_consistency') then
    alter table public.cost_library_item_variant_attachments
      add constraint cost_library_attachment_review_current_consistency
      check (is_current_approved is false or review_status = 'approved') not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'cost_library_attachment_review_reviewed_consistency') then
    alter table public.cost_library_item_variant_attachments
      add constraint cost_library_attachment_review_reviewed_consistency
      check (
        review_status not in ('approved', 'rejected', 'superseded')
        or (reviewed_by is not null and reviewed_at is not null)
      ) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'cost_library_attachment_review_supersede_consistency') then
    alter table public.cost_library_item_variant_attachments
      add constraint cost_library_attachment_review_supersede_consistency
      check (review_status <> 'superseded' or superseded_by is not null) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'cost_library_attachment_review_revision_positive') then
    alter table public.cost_library_item_variant_attachments
      add constraint cost_library_attachment_review_revision_positive
      check (review_revision > 0) not valid;
  end if;
end;
$$;

create unique index if not exists cost_entries_one_accepted_current_per_option
  on public.cost_library_item_variant_cost_entries(price_option_id)
  where deleted_at is null and is_current and review_status = 'accepted';

create index if not exists cost_library_items_sidebar_lite_idx
  on public.cost_library_items(workspace_id, updated_at desc, id)
  where lifecycle_state <> 'archived';

create index if not exists cost_library_price_options_sidebar_item_idx
  on public.cost_library_item_price_options(workspace_id, item_id, is_default desc, variant_sort_order, created_at);

create index if not exists cost_library_cost_entries_sidebar_item_idx
  on public.cost_library_item_variant_cost_entries(workspace_id, item_id, is_current desc, pricing_date desc, created_at desc)
  where deleted_at is null;

create index if not exists cost_library_cost_review_queue_idx
  on public.cost_library_item_variant_cost_entries(workspace_id, review_status, review_due_at, updated_at desc);

create unique index if not exists cost_library_attachments_one_current_item_scope
  on public.cost_library_item_variant_attachments(workspace_id, item_id)
  where is_current_approved and price_option_id is null and applicable_cost_entry_id is null;

create unique index if not exists cost_library_attachments_one_current_option_scope
  on public.cost_library_item_variant_attachments(workspace_id, item_id, price_option_id)
  where is_current_approved and price_option_id is not null and applicable_cost_entry_id is null;

create unique index if not exists cost_library_attachments_one_current_cost_entry_scope
  on public.cost_library_item_variant_attachments(workspace_id, item_id, price_option_id, applicable_cost_entry_id)
  where is_current_approved and applicable_cost_entry_id is not null;

create index if not exists cost_library_attachment_review_queue_idx
  on public.cost_library_item_variant_attachments(workspace_id, review_status, reviewed_at desc);

create or replace function public.enforce_cost_library_cost_review_scope()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  replacement_row public.cost_library_item_variant_cost_entries%rowtype;
begin
  if new.superseded_by is not null then
    select *
    into replacement_row
    from public.cost_library_item_variant_cost_entries
    where id = new.superseded_by;

    if not found then
      raise exception 'Replacement cost entry does not exist.' using errcode = '23503';
    end if;

    if replacement_row.workspace_id <> new.workspace_id
      or replacement_row.price_option_id <> new.price_option_id
      or replacement_row.item_id <> new.item_id then
      raise exception 'Replacement cost entry must share workspace, item, and price option.' using errcode = '23514';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_cost_library_cost_review_scope on public.cost_library_item_variant_cost_entries;
create trigger enforce_cost_library_cost_review_scope
  before insert or update of workspace_id, item_id, price_option_id, superseded_by
  on public.cost_library_item_variant_cost_entries
  for each row execute function public.enforce_cost_library_cost_review_scope();

create or replace function public.enforce_cost_library_attachment_review_scope()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  replacement_row public.cost_library_item_variant_attachments%rowtype;
  cost_row public.cost_library_item_variant_cost_entries%rowtype;
begin
  if new.applicable_cost_entry_id is not null then
    select *
    into cost_row
    from public.cost_library_item_variant_cost_entries
    where id = new.applicable_cost_entry_id;

    if not found then
      raise exception 'Applicable cost entry does not exist.' using errcode = '23503';
    end if;

    if cost_row.workspace_id <> new.workspace_id
      or cost_row.item_id <> new.item_id
      or cost_row.price_option_id <> new.price_option_id then
      raise exception 'Applicable cost entry must share workspace, item, and price option.' using errcode = '23514';
    end if;
  end if;

  if new.superseded_by is not null then
    select *
    into replacement_row
    from public.cost_library_item_variant_attachments
    where id = new.superseded_by;

    if not found then
      raise exception 'Replacement attachment does not exist.' using errcode = '23503';
    end if;

    if replacement_row.workspace_id <> new.workspace_id
      or replacement_row.item_id <> new.item_id
      or replacement_row.price_option_id <> new.price_option_id
      or replacement_row.applicable_cost_entry_id is distinct from new.applicable_cost_entry_id then
      raise exception 'Replacement attachment must share workspace, item, price option, and cost-entry scope.' using errcode = '23514';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_cost_library_attachment_review_scope on public.cost_library_item_variant_attachments;
create trigger enforce_cost_library_attachment_review_scope
  before insert or update of workspace_id, item_id, price_option_id, applicable_cost_entry_id, superseded_by
  on public.cost_library_item_variant_attachments
  for each row execute function public.enforce_cost_library_attachment_review_scope();

create table if not exists public.cost_library_cost_review_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  price_option_id uuid not null references public.cost_library_item_price_options(id) on delete cascade,
  cost_entry_id uuid not null references public.cost_library_item_variant_cost_entries(id) on delete cascade,
  event_type public.cost_library_cost_review_event_type not null,
  actor_id uuid references auth.users(id) on delete set null,
  from_status public.cost_library_cost_review_status,
  to_status public.cost_library_cost_review_status,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists cost_library_cost_review_events_entry_idx
  on public.cost_library_cost_review_events(cost_entry_id, created_at desc);

create index if not exists cost_library_cost_review_events_workspace_idx
  on public.cost_library_cost_review_events(workspace_id, created_at desc);

create table if not exists public.cost_library_attachment_review_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  item_id uuid not null references public.cost_library_items(id) on delete cascade,
  price_option_id uuid not null references public.cost_library_item_price_options(id) on delete cascade,
  applicable_cost_entry_id uuid references public.cost_library_item_variant_cost_entries(id) on delete set null,
  attachment_id uuid not null references public.cost_library_item_variant_attachments(id) on delete cascade,
  event_type public.cost_library_attachment_review_event_type not null,
  actor_id uuid references auth.users(id) on delete set null,
  from_status public.cost_library_attachment_review_status,
  to_status public.cost_library_attachment_review_status,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists cost_library_attachment_review_events_attachment_idx
  on public.cost_library_attachment_review_events(attachment_id, created_at desc);

create index if not exists cost_library_attachment_review_events_workspace_idx
  on public.cost_library_attachment_review_events(workspace_id, created_at desc);

alter table public.cost_library_cost_review_events enable row level security;
alter table public.cost_library_attachment_review_events enable row level security;

drop policy if exists "members can manage variant cost entries" on public.cost_library_item_variant_cost_entries;
drop policy if exists "members can manage variant attachments" on public.cost_library_item_variant_attachments;
drop policy if exists "members can view variant cost entries" on public.cost_library_item_variant_cost_entries;
drop policy if exists "members can view variant attachments" on public.cost_library_item_variant_attachments;

create policy "members can view variant cost entries" on public.cost_library_item_variant_cost_entries
  for select to authenticated
  using (public.is_workspace_member(workspace_id));

create policy "members can view variant attachments" on public.cost_library_item_variant_attachments
  for select to authenticated
  using (public.is_workspace_member(workspace_id));

drop policy if exists "admins can view cost review events" on public.cost_library_cost_review_events;
drop policy if exists "admins can view attachment review events" on public.cost_library_attachment_review_events;

create policy "admins can view cost review events" on public.cost_library_cost_review_events
  for select to authenticated
  using (public.is_platform_admin() or public.is_workspace_admin(workspace_id));

create policy "admins can view attachment review events" on public.cost_library_attachment_review_events
  for select to authenticated
  using (public.is_platform_admin() or public.is_workspace_admin(workspace_id));

revoke all on public.cost_library_item_variant_cost_entries from public, anon, authenticated;
revoke all on public.cost_library_item_variant_attachments from public, anon, authenticated;
revoke all on public.cost_library_cost_review_events from public, anon, authenticated;
revoke all on public.cost_library_attachment_review_events from public, anon, authenticated;

grant select on public.cost_library_item_variant_cost_entries to authenticated;
grant select on public.cost_library_item_variant_attachments to authenticated;
grant select on public.cost_library_cost_review_events to authenticated;
grant select on public.cost_library_attachment_review_events to authenticated;

grant usage on type public.cost_library_cost_review_status to authenticated;
grant usage on type public.cost_library_cost_review_event_type to authenticated;
grant usage on type public.cost_library_attachment_review_status to authenticated;
grant usage on type public.cost_library_attachment_review_event_type to authenticated;

create or replace function public.require_cost_library_governance_admin(target_workspace_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  actor_id uuid := auth.uid();
begin
  if actor_id is null then
    raise exception 'Authentication is required for Library governance.' using errcode = '42501';
  end if;

  if not (public.is_platform_admin() or public.is_workspace_admin(target_workspace_id)) then
    raise exception 'Only workspace admins can change Library trust governance.' using errcode = '42501';
  end if;

  return actor_id;
end;
$$;

create or replace function public.assign_cost_library_cost_refresh(
  target_cost_entry_id uuid,
  assignee_id uuid,
  target_review_due_at timestamptz,
  expected_review_revision integer,
  reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_row public.cost_library_item_variant_cost_entries%rowtype;
  actor_id uuid;
  prior_status public.cost_library_cost_review_status;
  next_status public.cost_library_cost_review_status;
begin
  select * into target_row
  from public.cost_library_item_variant_cost_entries
  where id = target_cost_entry_id
  for update;

  if not found then
    raise exception 'Cost entry was not found.' using errcode = 'P0002';
  end if;

  actor_id := public.require_cost_library_governance_admin(target_row.workspace_id);

  if target_row.review_revision <> expected_review_revision then
    raise exception 'Cost review revision conflict.' using errcode = '40001';
  end if;

  if assignee_id is not null and not exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = target_row.workspace_id
      and wm.user_id = assignee_id
  ) then
    raise exception 'Assignee must belong to the same workspace.' using errcode = '42501';
  end if;

  prior_status := target_row.review_status;
  next_status := case when target_row.review_status = 'proposed' then 'needs_review' else target_row.review_status end;

  update public.cost_library_item_variant_cost_entries
  set review_status = next_status,
      assigned_to = assignee_id,
      review_due_at = target_review_due_at,
      review_revision = review_revision + 1,
      updated_at = now()
  where id = target_row.id
  returning * into target_row;

  insert into public.cost_library_cost_review_events (
    workspace_id, price_option_id, cost_entry_id, event_type, actor_id, from_status, to_status, reason, metadata
  )
  values (
    target_row.workspace_id, target_row.price_option_id, target_row.id, 'assigned', actor_id, prior_status, target_row.review_status, reason,
    jsonb_build_object('assigneeId', assignee_id, 'reviewDueAt', target_review_due_at)
  );

  return jsonb_build_object('costEntryId', target_row.id, 'reviewStatus', target_row.review_status, 'reviewRevision', target_row.review_revision);
end;
$$;

create or replace function public.accept_cost_library_cost_entry(
  target_cost_entry_id uuid,
  expected_review_revision integer,
  reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_row public.cost_library_item_variant_cost_entries%rowtype;
  actor_id uuid;
  competitor_row public.cost_library_item_variant_cost_entries%rowtype;
  prior_status public.cost_library_cost_review_status;
  competitor_prior_status public.cost_library_cost_review_status;
begin
  select * into target_row
  from public.cost_library_item_variant_cost_entries
  where id = target_cost_entry_id
  for update;

  if not found then
    raise exception 'Cost entry was not found.' using errcode = 'P0002';
  end if;

  actor_id := public.require_cost_library_governance_admin(target_row.workspace_id);

  if target_row.review_revision <> expected_review_revision then
    raise exception 'Cost review revision conflict.' using errcode = '40001';
  end if;

  if target_row.deleted_at is not null then
    raise exception 'Deleted cost entries cannot be accepted.' using errcode = '23514';
  end if;

  for competitor_row in
    select *
    from public.cost_library_item_variant_cost_entries competitor
    where competitor.price_option_id = target_row.price_option_id
      and competitor.id <> target_row.id
      and competitor.deleted_at is null
      and competitor.is_current
    order by competitor.id
    for update
  loop
    competitor_prior_status := competitor_row.review_status;

    update public.cost_library_item_variant_cost_entries
    set review_status = 'superseded',
        is_current = false,
        reviewed_by = actor_id,
        reviewed_at = now(),
        superseded_by = target_row.id,
        review_revision = review_revision + 1,
        updated_at = now()
    where id = competitor_row.id
    returning * into competitor_row;

    insert into public.cost_library_cost_review_events (
      workspace_id, price_option_id, cost_entry_id, event_type, actor_id, from_status, to_status, reason, metadata
    )
    values (
      competitor_row.workspace_id, competitor_row.price_option_id, competitor_row.id, 'superseded', actor_id, competitor_prior_status, 'superseded', reason,
      jsonb_build_object('supersededBy', target_row.id)
    );
  end loop;

  prior_status := target_row.review_status;

  update public.cost_library_item_variant_cost_entries
  set review_status = 'accepted',
      is_current = true,
      reviewed_by = actor_id,
      reviewed_at = now(),
      review_note = reason,
      superseded_by = null,
      review_revision = review_revision + 1,
      updated_at = now()
  where id = target_row.id
  returning * into target_row;

  update public.cost_library_item_price_options
  set active_cost_entry_id = target_row.id,
      updated_at = now()
  where id = target_row.price_option_id
    and workspace_id = target_row.workspace_id;

  insert into public.cost_library_cost_review_events (
    workspace_id, price_option_id, cost_entry_id, event_type, actor_id, from_status, to_status, reason
  )
  values (
    target_row.workspace_id, target_row.price_option_id, target_row.id, 'accepted', actor_id, prior_status, 'accepted', reason
  );

  return jsonb_build_object('costEntryId', target_row.id, 'reviewStatus', target_row.review_status, 'reviewRevision', target_row.review_revision);
end;
$$;

create or replace function public.lock_cost_library_cost_entry(
  target_cost_entry_id uuid,
  expected_review_revision integer,
  reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_row public.cost_library_item_variant_cost_entries%rowtype;
  actor_id uuid;
begin
  select * into target_row
  from public.cost_library_item_variant_cost_entries
  where id = target_cost_entry_id
  for update;

  if not found then
    raise exception 'Cost entry was not found.' using errcode = 'P0002';
  end if;

  actor_id := public.require_cost_library_governance_admin(target_row.workspace_id);

  if target_row.review_revision <> expected_review_revision then
    raise exception 'Cost review revision conflict.' using errcode = '40001';
  end if;

  if target_row.review_status <> 'accepted' then
    raise exception 'Only accepted cost entries can be locked.' using errcode = '23514';
  end if;

  update public.cost_library_item_variant_cost_entries
  set locked_by = actor_id,
      locked_at = now(),
      lock_reason = reason,
      review_revision = review_revision + 1,
      updated_at = now()
  where id = target_row.id
  returning * into target_row;

  insert into public.cost_library_cost_review_events (
    workspace_id, price_option_id, cost_entry_id, event_type, actor_id, from_status, to_status, reason
  )
  values (
    target_row.workspace_id, target_row.price_option_id, target_row.id, 'locked', actor_id, target_row.review_status, target_row.review_status, reason
  );

  return jsonb_build_object('costEntryId', target_row.id, 'reviewStatus', target_row.review_status, 'lockedAt', target_row.locked_at, 'reviewRevision', target_row.review_revision);
end;
$$;

create or replace function public.unlock_cost_library_cost_entry(
  target_cost_entry_id uuid,
  expected_review_revision integer,
  reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_row public.cost_library_item_variant_cost_entries%rowtype;
  actor_id uuid;
begin
  select * into target_row
  from public.cost_library_item_variant_cost_entries
  where id = target_cost_entry_id
  for update;

  if not found then
    raise exception 'Cost entry was not found.' using errcode = 'P0002';
  end if;

  actor_id := public.require_cost_library_governance_admin(target_row.workspace_id);

  if target_row.review_revision <> expected_review_revision then
    raise exception 'Cost review revision conflict.' using errcode = '40001';
  end if;

  if target_row.review_status <> 'accepted' or target_row.locked_at is null then
    raise exception 'Only locked accepted cost entries can be unlocked.' using errcode = '23514';
  end if;

  update public.cost_library_item_variant_cost_entries
  set locked_by = null,
      locked_at = null,
      lock_reason = null,
      review_revision = review_revision + 1,
      updated_at = now()
  where id = target_row.id
  returning * into target_row;

  insert into public.cost_library_cost_review_events (
    workspace_id, price_option_id, cost_entry_id, event_type, actor_id, from_status, to_status, reason
  )
  values (
    target_row.workspace_id, target_row.price_option_id, target_row.id, 'unlocked', actor_id, target_row.review_status, target_row.review_status, reason
  );

  return jsonb_build_object('costEntryId', target_row.id, 'reviewStatus', target_row.review_status, 'lockedAt', target_row.locked_at, 'reviewRevision', target_row.review_revision);
end;
$$;

create or replace function public.reject_cost_library_cost_entry(
  target_cost_entry_id uuid,
  expected_review_revision integer,
  reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_row public.cost_library_item_variant_cost_entries%rowtype;
  actor_id uuid;
  prior_status public.cost_library_cost_review_status;
begin
  select * into target_row
  from public.cost_library_item_variant_cost_entries
  where id = target_cost_entry_id
  for update;

  if not found then
    raise exception 'Cost entry was not found.' using errcode = 'P0002';
  end if;

  actor_id := public.require_cost_library_governance_admin(target_row.workspace_id);

  if target_row.review_revision <> expected_review_revision then
    raise exception 'Cost review revision conflict.' using errcode = '40001';
  end if;

  if target_row.locked_at is not null then
    raise exception 'Locked accepted cost entries must be unlocked before rejection.' using errcode = '23514';
  end if;

  prior_status := target_row.review_status;

  update public.cost_library_item_variant_cost_entries
  set review_status = 'rejected',
      is_current = false,
      reviewed_by = actor_id,
      reviewed_at = now(),
      review_note = reason,
      review_revision = review_revision + 1,
      updated_at = now()
  where id = target_row.id
  returning * into target_row;

  update public.cost_library_item_price_options
  set active_cost_entry_id = null,
      updated_at = now()
  where active_cost_entry_id = target_row.id;

  insert into public.cost_library_cost_review_events (
    workspace_id, price_option_id, cost_entry_id, event_type, actor_id, from_status, to_status, reason
  )
  values (
    target_row.workspace_id, target_row.price_option_id, target_row.id, 'rejected', actor_id, prior_status, 'rejected', reason
  );

  return jsonb_build_object('costEntryId', target_row.id, 'reviewStatus', target_row.review_status, 'reviewRevision', target_row.review_revision);
end;
$$;

create or replace function public.supersede_cost_library_cost_entry(
  target_cost_entry_id uuid,
  replacement_cost_entry_id uuid,
  expected_review_revision integer,
  reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_row public.cost_library_item_variant_cost_entries%rowtype;
  replacement_row public.cost_library_item_variant_cost_entries%rowtype;
  competitor_row public.cost_library_item_variant_cost_entries%rowtype;
  actor_id uuid;
  prior_status public.cost_library_cost_review_status;
  replacement_prior_status public.cost_library_cost_review_status;
  competitor_prior_status public.cost_library_cost_review_status;
begin
  if target_cost_entry_id = replacement_cost_entry_id then
    raise exception 'Replacement cost entry must be different.' using errcode = '23514';
  end if;

  perform 1
  from public.cost_library_item_variant_cost_entries
  where id in (target_cost_entry_id, replacement_cost_entry_id)
  order by id
  for update;

  select * into target_row from public.cost_library_item_variant_cost_entries where id = target_cost_entry_id;
  if not found then
    raise exception 'Cost entry was not found.' using errcode = 'P0002';
  end if;

  select * into replacement_row from public.cost_library_item_variant_cost_entries where id = replacement_cost_entry_id;
  if not found then
    raise exception 'Replacement cost entry was not found.' using errcode = 'P0002';
  end if;

  actor_id := public.require_cost_library_governance_admin(target_row.workspace_id);

  if target_row.review_revision <> expected_review_revision then
    raise exception 'Cost review revision conflict.' using errcode = '40001';
  end if;

  if replacement_row.workspace_id <> target_row.workspace_id
    or replacement_row.item_id <> target_row.item_id
    or replacement_row.price_option_id <> target_row.price_option_id
    or replacement_row.deleted_at is not null then
    raise exception 'Replacement cost entry must share workspace, item, and price option.' using errcode = '23514';
  end if;

  prior_status := target_row.review_status;
  replacement_prior_status := replacement_row.review_status;

  update public.cost_library_item_variant_cost_entries
  set review_status = 'superseded',
      is_current = false,
      reviewed_by = actor_id,
      reviewed_at = now(),
      superseded_by = replacement_row.id,
      review_note = reason,
      review_revision = review_revision + 1,
      updated_at = now()
  where id = target_row.id
	  returning * into target_row;

  for competitor_row in
    select *
    from public.cost_library_item_variant_cost_entries competitor
    where competitor.price_option_id = replacement_row.price_option_id
      and competitor.id not in (target_row.id, replacement_row.id)
      and competitor.deleted_at is null
      and competitor.is_current
    order by competitor.id
    for update
  loop
    competitor_prior_status := competitor_row.review_status;

    update public.cost_library_item_variant_cost_entries
    set review_status = 'superseded',
        is_current = false,
        reviewed_by = actor_id,
        reviewed_at = now(),
        superseded_by = replacement_row.id,
        review_revision = review_revision + 1,
        updated_at = now()
    where id = competitor_row.id
    returning * into competitor_row;

    insert into public.cost_library_cost_review_events (
      workspace_id, price_option_id, cost_entry_id, event_type, actor_id, from_status, to_status, reason, metadata
    )
    values (
      competitor_row.workspace_id, competitor_row.price_option_id, competitor_row.id, 'superseded', actor_id, competitor_prior_status, 'superseded', reason,
      jsonb_build_object('supersededBy', replacement_row.id)
    );
  end loop;

  update public.cost_library_item_variant_cost_entries
  set review_status = 'accepted',
      is_current = true,
      reviewed_by = actor_id,
      reviewed_at = now(),
      review_note = reason,
      superseded_by = null,
      review_revision = review_revision + 1,
      updated_at = now()
  where id = replacement_row.id
  returning * into replacement_row;

  update public.cost_library_item_price_options
  set active_cost_entry_id = replacement_row.id,
      updated_at = now()
  where id = replacement_row.price_option_id
    and workspace_id = replacement_row.workspace_id;

  insert into public.cost_library_cost_review_events (
    workspace_id, price_option_id, cost_entry_id, event_type, actor_id, from_status, to_status, reason, metadata
  )
  values (
    target_row.workspace_id, target_row.price_option_id, target_row.id, 'superseded', actor_id, prior_status, 'superseded', reason,
    jsonb_build_object('supersededBy', replacement_row.id)
  );

  insert into public.cost_library_cost_review_events (
    workspace_id, price_option_id, cost_entry_id, event_type, actor_id, from_status, to_status, reason, metadata
  )
  values (
    replacement_row.workspace_id, replacement_row.price_option_id, replacement_row.id, 'accepted', actor_id, replacement_prior_status, 'accepted', reason,
    jsonb_build_object('supersedes', target_row.id)
  );

  return jsonb_build_object('costEntryId', target_row.id, 'reviewStatus', target_row.review_status, 'replacementCostEntryId', replacement_row.id, 'replacementReviewRevision', replacement_row.review_revision);
end;
$$;

create or replace function public.approve_cost_library_attachment(
  target_attachment_id uuid,
  expected_review_revision integer,
  target_applicable_cost_entry_id uuid default null,
  reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_row public.cost_library_item_variant_attachments%rowtype;
  actor_id uuid;
  prior_status public.cost_library_attachment_review_status;
  selected_cost_entry_id uuid;
  competitor_row public.cost_library_item_variant_attachments%rowtype;
  cost_row public.cost_library_item_variant_cost_entries%rowtype;
begin
  select * into target_row
  from public.cost_library_item_variant_attachments
  where id = target_attachment_id
  for update;

  if not found then
    raise exception 'Attachment was not found.' using errcode = 'P0002';
  end if;

  actor_id := public.require_cost_library_governance_admin(target_row.workspace_id);

  if target_row.review_revision <> expected_review_revision then
    raise exception 'Attachment review revision conflict.' using errcode = '40001';
  end if;

  if target_row.storage_bucket <> 'component-attachments'
    or target_row.storage_path !~ '^[0-9a-f-]+/[0-9a-f-]+/'
    or target_row.content_type not in (
      'application/pdf',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ) then
    raise exception 'Attachment is not valid for approval.' using errcode = '23514';
  end if;

  selected_cost_entry_id := coalesce(target_applicable_cost_entry_id, target_row.applicable_cost_entry_id);

  if selected_cost_entry_id is not null then
    select * into cost_row
    from public.cost_library_item_variant_cost_entries
    where id = selected_cost_entry_id;

    if not found
      or cost_row.workspace_id <> target_row.workspace_id
      or cost_row.item_id <> target_row.item_id
      or cost_row.price_option_id <> target_row.price_option_id then
      raise exception 'Applicable cost entry must share workspace, item, and price option.' using errcode = '23514';
    end if;
  end if;

  for competitor_row in
    update public.cost_library_item_variant_attachments competitor
    set review_status = 'superseded',
        is_current_approved = false,
        reviewed_by = actor_id,
        reviewed_at = now(),
        superseded_by = target_row.id,
        review_revision = competitor.review_revision + 1,
        updated_at = now()
    where competitor.id <> target_row.id
      and competitor.workspace_id = target_row.workspace_id
      and competitor.item_id = target_row.item_id
      and competitor.price_option_id = target_row.price_option_id
      and competitor.applicable_cost_entry_id is not distinct from selected_cost_entry_id
      and competitor.is_current_approved
    returning competitor.*
  loop
    insert into public.cost_library_attachment_review_events (
      workspace_id, item_id, price_option_id, applicable_cost_entry_id, attachment_id, event_type,
      actor_id, from_status, to_status, reason, metadata
    )
    values (
      competitor_row.workspace_id, competitor_row.item_id, competitor_row.price_option_id, competitor_row.applicable_cost_entry_id,
      competitor_row.id, 'superseded', actor_id, 'approved', 'superseded', reason,
      jsonb_build_object('supersededBy', target_row.id)
    );
  end loop;

  prior_status := target_row.review_status;

  update public.cost_library_item_variant_attachments
  set review_status = 'approved',
      applicable_cost_entry_id = selected_cost_entry_id,
      is_current_approved = true,
      reviewed_by = actor_id,
      reviewed_at = now(),
      review_note = reason,
      superseded_by = null,
      review_revision = review_revision + 1,
      updated_at = now()
  where id = target_row.id
  returning * into target_row;

  insert into public.cost_library_attachment_review_events (
    workspace_id, item_id, price_option_id, applicable_cost_entry_id, attachment_id, event_type,
    actor_id, from_status, to_status, reason
  )
  values (
    target_row.workspace_id, target_row.item_id, target_row.price_option_id, target_row.applicable_cost_entry_id,
    target_row.id, 'approved', actor_id, prior_status, 'approved', reason
  );

  return jsonb_build_object('attachmentId', target_row.id, 'reviewStatus', target_row.review_status, 'isCurrentApproved', target_row.is_current_approved, 'reviewRevision', target_row.review_revision);
end;
$$;

create or replace function public.reject_cost_library_attachment(
  target_attachment_id uuid,
  expected_review_revision integer,
  reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_row public.cost_library_item_variant_attachments%rowtype;
  actor_id uuid;
  prior_status public.cost_library_attachment_review_status;
begin
  select * into target_row
  from public.cost_library_item_variant_attachments
  where id = target_attachment_id
  for update;

  if not found then
    raise exception 'Attachment was not found.' using errcode = 'P0002';
  end if;

  actor_id := public.require_cost_library_governance_admin(target_row.workspace_id);

  if target_row.review_revision <> expected_review_revision then
    raise exception 'Attachment review revision conflict.' using errcode = '40001';
  end if;

  prior_status := target_row.review_status;

  update public.cost_library_item_variant_attachments
  set review_status = 'rejected',
      is_current_approved = false,
      reviewed_by = actor_id,
      reviewed_at = now(),
      review_note = reason,
      review_revision = review_revision + 1,
      updated_at = now()
  where id = target_row.id
  returning * into target_row;

  insert into public.cost_library_attachment_review_events (
    workspace_id, item_id, price_option_id, applicable_cost_entry_id, attachment_id, event_type,
    actor_id, from_status, to_status, reason
  )
  values (
    target_row.workspace_id, target_row.item_id, target_row.price_option_id, target_row.applicable_cost_entry_id,
    target_row.id, 'rejected', actor_id, prior_status, 'rejected', reason
  );

  return jsonb_build_object('attachmentId', target_row.id, 'reviewStatus', target_row.review_status, 'reviewRevision', target_row.review_revision);
end;
$$;

create or replace function public.supersede_cost_library_attachment(
  target_attachment_id uuid,
  replacement_attachment_id uuid,
  expected_review_revision integer,
  reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_row public.cost_library_item_variant_attachments%rowtype;
  replacement_row public.cost_library_item_variant_attachments%rowtype;
  competitor_row public.cost_library_item_variant_attachments%rowtype;
  actor_id uuid;
  prior_status public.cost_library_attachment_review_status;
  replacement_prior_status public.cost_library_attachment_review_status;
begin
  if target_attachment_id = replacement_attachment_id then
    raise exception 'Replacement attachment must be different.' using errcode = '23514';
  end if;

  perform 1
  from public.cost_library_item_variant_attachments
  where id in (target_attachment_id, replacement_attachment_id)
  order by id
  for update;

  select * into target_row from public.cost_library_item_variant_attachments where id = target_attachment_id;
  if not found then
    raise exception 'Attachment was not found.' using errcode = 'P0002';
  end if;

  select * into replacement_row from public.cost_library_item_variant_attachments where id = replacement_attachment_id;
  if not found then
    raise exception 'Replacement attachment was not found.' using errcode = 'P0002';
  end if;

  actor_id := public.require_cost_library_governance_admin(target_row.workspace_id);

  if target_row.review_revision <> expected_review_revision then
    raise exception 'Attachment review revision conflict.' using errcode = '40001';
  end if;

  if replacement_row.workspace_id <> target_row.workspace_id
    or replacement_row.item_id <> target_row.item_id
    or replacement_row.price_option_id <> target_row.price_option_id
    or replacement_row.applicable_cost_entry_id is distinct from target_row.applicable_cost_entry_id then
    raise exception 'Replacement attachment must share workspace, item, price option, and cost-entry scope.' using errcode = '23514';
  end if;

  for competitor_row in
    update public.cost_library_item_variant_attachments competitor
    set review_status = 'superseded',
        is_current_approved = false,
        reviewed_by = actor_id,
        reviewed_at = now(),
        superseded_by = replacement_row.id,
        review_revision = competitor.review_revision + 1,
        updated_at = now()
	    where competitor.id not in (target_row.id, replacement_row.id)
      and competitor.workspace_id = replacement_row.workspace_id
      and competitor.item_id = replacement_row.item_id
      and competitor.price_option_id = replacement_row.price_option_id
      and competitor.applicable_cost_entry_id is not distinct from replacement_row.applicable_cost_entry_id
      and competitor.is_current_approved
    returning competitor.*
  loop
    insert into public.cost_library_attachment_review_events (
      workspace_id, item_id, price_option_id, applicable_cost_entry_id, attachment_id, event_type,
      actor_id, from_status, to_status, reason, metadata
    )
    values (
      competitor_row.workspace_id, competitor_row.item_id, competitor_row.price_option_id, competitor_row.applicable_cost_entry_id,
      competitor_row.id, 'superseded', actor_id, 'approved', 'superseded', reason,
      jsonb_build_object('supersededBy', replacement_row.id)
    );
  end loop;

  prior_status := target_row.review_status;
  replacement_prior_status := replacement_row.review_status;

  update public.cost_library_item_variant_attachments
  set review_status = 'superseded',
      is_current_approved = false,
      reviewed_by = actor_id,
      reviewed_at = now(),
      review_note = reason,
      superseded_by = replacement_row.id,
      review_revision = review_revision + 1,
      updated_at = now()
  where id = target_row.id
  returning * into target_row;

  update public.cost_library_item_variant_attachments
  set review_status = 'approved',
      is_current_approved = true,
      reviewed_by = actor_id,
      reviewed_at = now(),
      review_note = reason,
      superseded_by = null,
      review_revision = review_revision + 1,
      updated_at = now()
  where id = replacement_row.id
  returning * into replacement_row;

  insert into public.cost_library_attachment_review_events (
    workspace_id, item_id, price_option_id, applicable_cost_entry_id, attachment_id, event_type,
    actor_id, from_status, to_status, reason, metadata
  )
  values (
    target_row.workspace_id, target_row.item_id, target_row.price_option_id, target_row.applicable_cost_entry_id,
    target_row.id, 'superseded', actor_id, prior_status, 'superseded', reason,
    jsonb_build_object('supersededBy', replacement_row.id)
  );

  insert into public.cost_library_attachment_review_events (
    workspace_id, item_id, price_option_id, applicable_cost_entry_id, attachment_id, event_type,
    actor_id, from_status, to_status, reason, metadata
  )
  values (
    replacement_row.workspace_id, replacement_row.item_id, replacement_row.price_option_id, replacement_row.applicable_cost_entry_id,
    replacement_row.id, 'approved', actor_id, replacement_prior_status, 'approved', reason,
    jsonb_build_object('supersedes', target_row.id)
  );

  return jsonb_build_object('attachmentId', target_row.id, 'reviewStatus', target_row.review_status, 'replacementAttachmentId', replacement_row.id, 'replacementReviewRevision', replacement_row.review_revision);
end;
$$;

revoke execute on function public.require_cost_library_governance_admin(uuid) from public, anon, authenticated;
revoke execute on function public.assign_cost_library_cost_refresh(uuid, uuid, timestamptz, integer, text) from public, anon;
revoke execute on function public.accept_cost_library_cost_entry(uuid, integer, text) from public, anon;
revoke execute on function public.lock_cost_library_cost_entry(uuid, integer, text) from public, anon;
revoke execute on function public.unlock_cost_library_cost_entry(uuid, integer, text) from public, anon;
revoke execute on function public.reject_cost_library_cost_entry(uuid, integer, text) from public, anon;
revoke execute on function public.supersede_cost_library_cost_entry(uuid, uuid, integer, text) from public, anon;
revoke execute on function public.approve_cost_library_attachment(uuid, integer, uuid, text) from public, anon;
revoke execute on function public.reject_cost_library_attachment(uuid, integer, text) from public, anon;
revoke execute on function public.supersede_cost_library_attachment(uuid, uuid, integer, text) from public, anon;

grant execute on function public.assign_cost_library_cost_refresh(uuid, uuid, timestamptz, integer, text) to authenticated;
grant execute on function public.accept_cost_library_cost_entry(uuid, integer, text) to authenticated;
grant execute on function public.lock_cost_library_cost_entry(uuid, integer, text) to authenticated;
grant execute on function public.unlock_cost_library_cost_entry(uuid, integer, text) to authenticated;
grant execute on function public.reject_cost_library_cost_entry(uuid, integer, text) to authenticated;
grant execute on function public.supersede_cost_library_cost_entry(uuid, uuid, integer, text) to authenticated;
grant execute on function public.approve_cost_library_attachment(uuid, integer, uuid, text) to authenticated;
grant execute on function public.reject_cost_library_attachment(uuid, integer, text) to authenticated;
grant execute on function public.supersede_cost_library_attachment(uuid, uuid, integer, text) to authenticated;

alter table public.cost_library_item_variant_cost_entries validate constraint cost_library_cost_review_lock_consistency;
alter table public.cost_library_item_variant_cost_entries validate constraint cost_library_cost_review_reviewed_consistency;
alter table public.cost_library_item_variant_cost_entries validate constraint cost_library_cost_review_supersede_consistency;
alter table public.cost_library_item_variant_cost_entries validate constraint cost_library_cost_review_revision_positive;
alter table public.cost_library_item_variant_attachments validate constraint cost_library_attachment_review_current_consistency;
alter table public.cost_library_item_variant_attachments validate constraint cost_library_attachment_review_reviewed_consistency;
alter table public.cost_library_item_variant_attachments validate constraint cost_library_attachment_review_supersede_consistency;
alter table public.cost_library_item_variant_attachments validate constraint cost_library_attachment_review_revision_positive;

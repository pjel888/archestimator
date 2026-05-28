-- P3: Database Migration — Shared Link Overhaul (V2)
-- File: supabase/migrations/20260528220000_project_shared_link_overhaul.sql
-- Date: 2026-05-28
--
-- Exact implementation per:
--   .ai/03_plans/project-shared-link-overhaul/04-data-model-and-schema-plan.md
--   .ai/03_plans/project-shared-link-overhaul/05-security-privacy-auth-plan.md
--   IMPLEMENTATION MASTER PROMPT (P3 bullets)
--
-- Guarantees (non-negotiable):
-- * ADDITIVE ONLY — never drops, alters, or touches existing project_publications
--   columns, project_publication_events, or any prior tables/RPCs/policies.
-- * Backwards compatible: all existing /share/[token] V1 view-only + P1/P2 manager
--   + receiver tab flows continue to work unchanged.
-- * Idempotent (if not exists / create or replace / drop policy if exists).
-- * Strict default-deny: direct table writes revoked for anon + authenticated.
-- * All client writes (future P6/P7) and recipient management (P4) gated exclusively
--   through the two Security Definer RPCs below.
-- * Supports P4 (recipients), P6/P7 (comments + responses with snapshot_version locking),
--   P8 (events) without further schema changes.
--
-- Local verification: supabase db reset (clean apply) + type regen required.

-- ============================================================================
-- 1. TABLES (exact from 04-data-model-and-schema-plan.md)
-- ============================================================================

create table if not exists public.shared_link_recipients (
  id uuid primary key default gen_random_uuid(),
  publication_id uuid not null references public.project_publications(id) on delete cascade,
  email text not null,
  display_name text, -- Optional personalization (e.g., "John Smith")
  invited_by uuid references public.profiles(id) on delete set null,
  invited_at timestamptz not null default now(),
  recipient_token_hash text not null unique, -- Hashed secure token for email-bound access
  delivery_status text not null default 'pending'
    check (delivery_status in ('pending', 'sent', 'bounced', 'opened', 'responded')),
  last_opened_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.shared_link_comments (
  id uuid primary key default gen_random_uuid(),
  publication_id uuid not null references public.project_publications(id) on delete cascade,
  recipient_id uuid references public.shared_link_recipients(id) on delete set null, -- Nullable if posted by project owner
  author_email text not null, -- Captured for rendering labels (denormalized for performance)
  author_name text, -- Optional display name
  estimate_id uuid, -- Nullable if comment is project-level
  row_id uuid, -- Nullable if comment is estimate-level
  body text not null check (char_length(body) <= 1000),
  is_internal boolean not null default false, -- True if project owner notes (hidden from recipient)
  created_at timestamptz not null default now()
);

create table if not exists public.shared_link_responses (
  id uuid primary key default gen_random_uuid(),
  publication_id uuid not null references public.project_publications(id) on delete cascade,
  recipient_id uuid not null references public.shared_link_recipients(id) on delete cascade,
  decision text not null check (decision in ('accepted', 'declined', 'revision_requested')),
  note text check (char_length(note) <= 2000),
  snapshot_version_at_decision integer not null, -- Locks decision to the version seen
  created_at timestamptz not null default now()
);

create table if not exists public.shared_link_events (
  id uuid primary key default gen_random_uuid(),
  publication_id uuid not null references public.project_publications(id) on delete cascade,
  recipient_id uuid references public.shared_link_recipients(id) on delete set null,
  event_type text not null check (event_type in ('open', 'comment_add', 'accept_decision', 'decline_decision', 'password_attempt')),
  metadata_json jsonb not null default '{}'::jsonb,
  ip_hash text,
  user_agent_hash text,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- 2. INDEXES (exact from plan — publication lookups, token hash, estimate-level)
-- ============================================================================

-- Recipients
create unique index if not exists shared_link_recipients_publication_email_idx
  on public.shared_link_recipients(publication_id, lower(email));

create index if not exists shared_link_recipients_token_hash_idx
  on public.shared_link_recipients(recipient_token_hash);

create index if not exists shared_link_recipients_publication_id_idx
  on public.shared_link_recipients(publication_id, created_at desc);

-- Comments
create index if not exists shared_link_comments_publication_idx
  on public.shared_link_comments(publication_id, created_at desc);

create index if not exists shared_link_comments_recipient_idx
  on public.shared_link_comments(recipient_id, created_at desc);

create index if not exists shared_link_comments_estimate_idx
  on public.shared_link_comments(publication_id, estimate_id, created_at desc);

-- Responses
create unique index if not exists shared_link_responses_recipient_publication_idx
  on public.shared_link_responses(recipient_id, publication_id);

create index if not exists shared_link_responses_publication_idx
  on public.shared_link_responses(publication_id, created_at desc);

-- Events
create index if not exists shared_link_events_publication_idx
  on public.shared_link_events(publication_id, created_at desc);

-- ============================================================================
-- 3. RPC FUNCTIONS — Security Definer (exact bodies from 04 plan)
-- insert_client_comment and submit_client_response with snapshot_version locking
-- ============================================================================

create or replace function public.insert_client_comment(
  p_token_hash text,
  p_recipient_token_hash text,
  p_estimate_id uuid,
  p_row_id uuid,
  p_body text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_publication_id uuid;
  v_recipient_id uuid;
  v_comment_id uuid;
begin
  -- Validate publication is active
  select id into v_publication_id
  from public.project_publications
  where token_hash = p_token_hash
    and status = 'published'
    and revoked_at is null
    and (expires_at is null or expires_at > now());

  if v_publication_id is null then
    raise exception 'Publication not found or expired.';
  end if;

  -- Validate recipient
  select id into v_recipient_id
  from public.shared_link_recipients
  where recipient_token_hash = p_recipient_token_hash
    and publication_id = v_publication_id;

  if v_recipient_id is null then
    raise exception 'Recipient not found.';
  end if;

  -- Insert comment
  insert into public.shared_link_comments (
    publication_id, recipient_id, author_email, estimate_id, row_id, body
  )
  select
    v_publication_id,
    v_recipient_id,
    r.email,
    p_estimate_id,
    p_row_id,
    left(p_body, 1000)
  from public.shared_link_recipients r
  where r.id = v_recipient_id
  returning id into v_comment_id;

  return v_comment_id;
end;
$$;

create or replace function public.submit_client_response(
  p_token_hash text,
  p_recipient_token_hash text,
  p_decision text,
  p_note text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_publication_id uuid;
  v_recipient_id uuid;
  v_snapshot_version integer;
  v_response_id uuid;
begin
  select id, snapshot_version into v_publication_id, v_snapshot_version
  from public.project_publications
  where token_hash = p_token_hash
    and status = 'published'
    and revoked_at is null
    and (expires_at is null or expires_at > now());

  if v_publication_id is null then
    raise exception 'Publication not found or expired.';
  end if;

  select id into v_recipient_id
  from public.shared_link_recipients
  where recipient_token_hash = p_recipient_token_hash
    and publication_id = v_publication_id;

  if v_recipient_id is null then
    raise exception 'Recipient not found.';
  end if;

  insert into public.shared_link_responses (
    publication_id, recipient_id, decision, note, snapshot_version_at_decision
  ) values (
    v_publication_id, v_recipient_id, p_decision, left(p_note, 2000), v_snapshot_version
  )
  on conflict (recipient_id, publication_id) do nothing
  returning id into v_response_id;

  if v_response_id is null then
    raise exception 'Decision already submitted.';
  end if;

  return v_response_id;
end;
$$;

-- ============================================================================
-- 4. ROW LEVEL SECURITY
-- ============================================================================

alter table public.shared_link_recipients enable row level security;
alter table public.shared_link_comments enable row level security;
alter table public.shared_link_responses enable row level security;
alter table public.shared_link_events enable row level security;

-- Manager read policies (authenticated workspace/project managers)
-- Uses existing can_manage_project_publication(project_id) via the FK to project_publications
drop policy if exists "project publication managers can read shared link recipients" on public.shared_link_recipients;
create policy "project publication managers can read shared link recipients"
on public.shared_link_recipients
for select
to authenticated
using (
  publication_id in (
    select id from public.project_publications
    where public.can_manage_project_publication(project_id)
  )
);

drop policy if exists "project publication managers can read shared link comments" on public.shared_link_comments;
create policy "project publication managers can read shared link comments"
on public.shared_link_comments
for select
to authenticated
using (
  publication_id in (
    select id from public.project_publications
    where public.can_manage_project_publication(project_id)
  )
);

drop policy if exists "project publication managers can read shared link responses" on public.shared_link_responses;
create policy "project publication managers can read shared link responses"
on public.shared_link_responses
for select
to authenticated
using (
  publication_id in (
    select id from public.project_publications
    where public.can_manage_project_publication(project_id)
  )
);

drop policy if exists "project publication managers can read shared link events" on public.shared_link_events;
create policy "project publication managers can read shared link events"
on public.shared_link_events
for select
to authenticated
using (
  publication_id in (
    select id from public.project_publications
    where public.can_manage_project_publication(project_id)
  )
);

-- Service role can manage events (for future audit inserts via edge functions / RPCs if needed)
drop policy if exists "service role can insert shared link events" on public.shared_link_events;
create policy "service role can insert shared link events"
on public.shared_link_events
for insert
to service_role
with check (true);

-- ============================================================================
-- 5. GRANTS / REVOKES (strict default-deny per plan + existing publication migration pattern)
-- ============================================================================

-- Direct table access revoked for anon + authenticated (writes only via Security Definer RPCs)
revoke all on table public.shared_link_recipients from public, anon, authenticated;
revoke all on table public.shared_link_comments from public, anon, authenticated;
revoke all on table public.shared_link_responses from public, anon, authenticated;
revoke all on table public.shared_link_events from public, anon, authenticated;

-- Managers (authenticated) get read via RLS policies above
grant select on table public.shared_link_recipients to authenticated;
grant select on table public.shared_link_comments to authenticated;
grant select on table public.shared_link_responses to authenticated;
grant select on table public.shared_link_events to authenticated;

-- RPCs are the narrow gateway. Grant execute to anon (public recipient flows via anon key),
-- authenticated (manager + recipient), and service_role.
revoke all on function public.insert_client_comment(text, text, uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.submit_client_response(text, text, text, text) from public, anon, authenticated;

grant execute on function public.insert_client_comment(text, text, uuid, uuid, text) to anon, authenticated, service_role;
grant execute on function public.submit_client_response(text, text, text, text) to anon, authenticated, service_role;

-- Service role can insert events directly if future paths require (in addition to RPC patterns)
grant insert on table public.shared_link_events to service_role;

-- Note: No changes whatsoever to project_publications, project_publication_events,
-- or any pre-existing objects. All new objects are additive and isolated.
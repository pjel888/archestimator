# Data Model & Schema Plan — Shared Link Overhaul

**Date:** 2026-05-28
**Status:** Ready for migration generation.

This document outlines the database schema, DDL statements, indexes, Row Level Security (RLS) policies, and cleanup approach for the V2 Shared Link interactive features.

---

## 1. Existing Schema Baseline (Verified)

As verified in migration `20260527120000_project_client_publication.sql`, the `project_publications` table already contains:
- `selected_estimate_ids uuid[] not null default '{}'::uuid[]`
- `snapshot_json jsonb not null`
- `snapshot_version integer`

We will reuse these columns to store the selected estimates array and snapshot data.

**Important Constraint**: All schema changes for V2 must be **additive only**. No existing `project_publications` columns may be dropped or altered.

---

## 2. New Data Tables Schema (Proposed)

We will introduce three new tables to manage recipients, comments, and responses.

### 2.1. Shared Link Recipients (`shared_link_recipients`)
Stores the email addresses of the specific clients invited to review the link, along with their delivery status.

```sql
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

-- Unique index to prevent duplicate recipient entries on the same link
create unique index if not exists shared_link_recipients_publication_email_idx
  on public.shared_link_recipients(publication_id, lower(email));

-- Index for fast recipient lookups by token hash
create index if not exists shared_link_recipients_token_hash_idx
  on public.shared_link_recipients(recipient_token_hash);

-- Index for listing recipients by publication
create index if not exists shared_link_recipients_publication_id_idx
  on public.shared_link_recipients(publication_id, created_at desc);
```

### 2.2. Shared Link Comments (`shared_link_comments`)
Allows recipients and project owners to post questions and answers.

```sql
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

create index if not exists shared_link_comments_publication_idx
  on public.shared_link_comments(publication_id, created_at desc);

create index if not exists shared_link_comments_recipient_idx
  on public.shared_link_comments(recipient_id, created_at desc);

create index if not exists shared_link_comments_estimate_idx
  on public.shared_link_comments(publication_id, estimate_id, created_at desc);
```

**Design Decision — Flat Comments**: V2 uses flat chronological comments (no threading). Threading adds significant UI complexity and is deferred to a future release.

### 2.3. Shared Link Responses (`shared_link_responses`)
Holds the formal client decisions (Accept or Decline/Revise).

```sql
create table if not exists public.shared_link_responses (
  id uuid primary key default gen_random_uuid(),
  publication_id uuid not null references public.project_publications(id) on delete cascade,
  recipient_id uuid not null references public.shared_link_recipients(id) on delete cascade,
  decision text not null check (decision in ('accepted', 'declined', 'revision_requested')),
  note text check (char_length(note) <= 2000),
  snapshot_version_at_decision integer not null, -- Locks decision to the version seen
  created_at timestamptz not null default now()
);

-- One formal response per recipient per link to prevent spamming decisions
create unique index if not exists shared_link_responses_recipient_publication_idx
  on shared_link_responses(recipient_id, publication_id);

-- Index for loading all responses on a publication
create index if not exists shared_link_responses_publication_idx
  on shared_link_responses(publication_id, created_at desc);
```

### 2.4. Shared Link Events (`shared_link_events`) — Optional Extension
For an audit trail of owner-facing activity (opens, comments, decisions) that can power an in-app notification feed.

```sql
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

create index if not exists shared_link_events_publication_idx
  on public.shared_link_events(publication_id, created_at desc);
```

---

## 3. Row-Level Security (RLS) Posture

We maintain a strict default-deny security posture for all client write operations:

1. **Table Permissions**: Direct `INSERT`, `UPDATE`, or `DELETE` on the new tables is revoked for `anon` and `authenticated` roles.
2. **Access Gateway**: All recipient comment entries and decisions must route through narrow PostgreSQL RPC functions with **Security Definer** attributes, validating:
   - The token matches `project_publications.token_hash`.
   - The recipient token matches `shared_link_recipients.recipient_token_hash`.
   - The `project_publications.status` is `'published'` and has not expired.
3. **Internal Reads**: Project managers (authenticated workspace members) read comments/responses via standard Supabase queries, governed by standard membership-check RLS policies.
4. **RPC Functions**:

```sql
-- Insert a client comment
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

-- Submit a client response (decision)
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
```

---

## 4. Data Retention & Cleanup

- **On Publication Revoke / Delete**: All `shared_link_recipients`, `shared_link_comments`, `shared_link_responses`, and `shared_link_events` rows are automatically deleted via `ON DELETE CASCADE`.
- **Soft Delete Alternative**: If we want to preserve comment history for audit after revocation, we should remove `ON DELETE CASCADE` and add a `deleted_at` column. **Decision for V2**: Use `ON DELETE CASCADE` to keep the data model simple. If audit retention is required later, we can add a soft-delete migration.
- **Event Log Pruning**: `shared_link_events` may grow quickly. Consider a scheduled job (pg_cron or edge function) that prunes events older than 90 days.

---

## 5. Database Migration Index

- **File name**: `supabase/migrations/20260528220000_project_shared_link_overhaul.sql`
- **Contains**:
  - Table definitions (`shared_link_recipients`, `shared_link_comments`, `shared_link_responses`, `shared_link_events`).
  - Indexes on token hashes, foreign keys, and query patterns.
  - Revoking public table grants.
  - RPC function declarations (`insert_client_comment`, `submit_client_response`).
  - Optional: `updated_at` trigger for `shared_link_recipients` if we want automatic timestamp updates.

---

## 6. Performance Targets

| Query Pattern | Target P95 | Index Coverage |
|---------------|------------|----------------|
| Load recipients by publication | < 20ms | `shared_link_recipients_publication_id_idx` |
| Verify recipient token | < 10ms | `shared_link_recipients_token_hash_idx` |
| Load comments by publication | < 30ms | `shared_link_comments_publication_idx` |
| Load comments by estimate | < 30ms | `shared_link_comments_estimate_idx` |
| Load responses by publication | < 20ms | `shared_link_responses_publication_idx` |

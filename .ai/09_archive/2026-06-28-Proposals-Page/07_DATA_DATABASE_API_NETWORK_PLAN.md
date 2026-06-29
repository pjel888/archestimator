# 07 — Data, Database, API, and Network Plan

## Database Change Blueprint

### Migration 1: `supabase/migrations/20260629000000_recipient_proposals_rpc.sql`

**Purpose**: Add the supporting index and the Security Definer RPCs needed for the signed-in recipient inbox.

**Ordering dependencies**: Applies after `20260628231500_project_activity_collaboration_audit_rpc_project_created_id_idx.sql` (the latest existing migration when this plan was written). Filename timestamp must be greater.

**Idempotence**: Statements use `if not exists` / `create or replace` / `drop function if exists` first.

### Credential material taxonomy

| Value | Storage/source | Client-visible? | Use |
|---|---|---:|---|
| Raw publication token | Generated in app memory; recoverable server-side from `project_publications.encrypted_token` | Yes, only as `/share/[token]` after authorized redirect | Existing public share URL |
| `project_publications.token_hash` | HMAC of the raw publication token | No | Server-side lookup key for `/share/[token]`; never a URL token |
| `project_publications.encrypted_token` | AES-GCM envelope of the raw publication token | No | Server-only recovery of raw token for emails and authorized redirects |
| Raw recipient token | Email link query param `?recipient=`; not stored raw | No for this inbox flow | Existing recipient session bootstrap |
| `shared_link_recipients.recipient_token_hash` | HMAC of raw recipient token | No | Existing recipient-token verification; not needed by the inbox bridge |
| Shared-link session cookie | Signed payload from `getSharedLinkSessionCookieParts()` | HttpOnly value is not client-readable; `_ok` companion is non-secret | Lets `/share/[token]` recognize the recipient session |

**Load-bearing correction from council review**: `project_publications.token_hash` is not part of `/share/[token]`. The URL requires the raw publication token. Returning `token_hash` to the client would create dead URLs and leak unnecessary hash material.

#### SQL sketch

```sql
-- ============================================================================
-- 1. Supporting index for email-only lookups
-- ============================================================================

create index if not exists shared_link_recipients_lower_email_idx
  on public.shared_link_recipients(lower(email));

-- ============================================================================
-- 2. RPC: list_recipient_publications_for_current_user
-- Returns the recipient's publication inbox. NEVER exposes token_hash,
-- encrypted_token, or recipient_token_hash.
-- ============================================================================

drop function if exists public.list_recipient_publications_for_current_user(int);

create or replace function public.list_recipient_publications_for_current_user(
  page_limit integer default 50
)
returns table (
  publication_id uuid,
  project_id uuid,
  project_name text,
  project_code text,
  workspace_id uuid,
  workspace_name text,
  sender_display_name text,
  status text,
  has_opened boolean,
  decision text,
  last_activity_at timestamptz,
  published_at timestamptz,
  expires_at timestamptz,
  revoked_at timestamptz,
  snapshot_version integer
)
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_caller_id uuid := auth.uid();
  v_caller_email text;
  v_safe_limit integer := least(100, greatest(1, coalesce(page_limit, 50)));
begin
  if v_caller_id is null then
    raise exception 'unauthorized' using errcode = '42501';
  end if;

  select lower(email) into v_caller_email
  from auth.users
  where id = v_caller_id;

  if v_caller_email is null then
    raise exception 'unauthorized' using errcode = '42501';
  end if;

  return query
  select
    pub.id as publication_id,
    proj.id as project_id,
    proj.name as project_name,
    proj.project_code as project_code,
    ws.id as workspace_id,
    ws.name as workspace_name,
    inv.display_name as sender_display_name,
    case
      when pub.status = 'revoked' or pub.revoked_at is not null then 'revoked'
      when pub.status = 'expired' or (pub.expires_at is not null and pub.expires_at <= now()) then 'expired'
      else 'published'
    end as status,
    (rec.last_opened_at is not null) as has_opened,
    (
      select slr.decision
      from public.shared_link_responses slr
      where slr.recipient_id = rec.id
        and slr.publication_id = pub.id
      order by slr.created_at desc
      limit 1
    ) as decision,
    (
      select greatest(
        coalesce(pub.published_at, '-infinity'::timestamptz),
        coalesce(rec.last_opened_at, '-infinity'::timestamptz),
        coalesce((
          select max(sle.created_at)
          from public.shared_link_events sle
          where sle.publication_id = pub.id
            and sle.recipient_id = rec.id
        ), '-infinity'::timestamptz),
        coalesce((
          select max(slc.created_at)
          from public.shared_link_comments slc
          where slc.publication_id = pub.id
            and slc.recipient_id = rec.id
        ), '-infinity'::timestamptz),
        coalesce((
          select max(slr2.created_at)
          from public.shared_link_responses slr2
          where slr2.publication_id = pub.id
            and slr2.recipient_id = rec.id
        ), '-infinity'::timestamptz)
      )
    ) as last_activity_at,
    pub.published_at,
    pub.expires_at,
    pub.revoked_at,
    pub.snapshot_version
  from public.shared_link_recipients rec
  join public.project_publications pub on pub.id = rec.publication_id
  join public.projects proj on proj.id = pub.project_id
  join public.workspaces ws on ws.id = proj.workspace_id
  left join public.profiles inv on inv.id = rec.invited_by
  where lower(rec.email) = v_caller_email
    and pub.status in ('published', 'expired', 'revoked')
  order by pub.published_at desc nulls last, pub.id desc
  limit v_safe_limit;
end;
$$;

revoke execute on function public.list_recipient_publications_for_current_user(integer) from public, anon;
grant execute on function public.list_recipient_publications_for_current_user(integer) to authenticated;

-- ============================================================================
-- 3. RPC: authorize_recipient_publication_for_current_user
-- Server-action-only authorization. Returns only non-secret row identifiers.
-- The action separately resolves encrypted_token with a server-only admin client.
-- ============================================================================

drop function if exists public.authorize_recipient_publication_for_current_user(uuid);

create or replace function public.authorize_recipient_publication_for_current_user(
  p_publication_id uuid
)
returns table (
  publication_id uuid,
  recipient_id uuid
)
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_caller_id uuid := auth.uid();
  v_caller_email text;
begin
  if v_caller_id is null then
    raise exception 'unauthorized' using errcode = '42501';
  end if;

  select lower(email) into v_caller_email
  from auth.users
  where id = v_caller_id;

  if v_caller_email is null then
    raise exception 'unauthorized' using errcode = '42501';
  end if;

  return query
  select rec.publication_id, rec.id as recipient_id
  from public.shared_link_recipients rec
  where rec.publication_id = p_publication_id
    and lower(rec.email) = v_caller_email
  limit 1;
end;
$$;

revoke execute on function public.authorize_recipient_publication_for_current_user(uuid) from public, anon;
grant execute on function public.authorize_recipient_publication_for_current_user(uuid) to authenticated;
```

### Backfill strategy

No backfill needed. The new index automatically covers existing rows.

### Data-volume assumptions

- Pre-launch MVP: <100 publications total, <50 recipients per publication, <10 publications per recipient.
- 10x: 1,000 publications, 500 recipients per publication, 100 publications per recipient.
- 100x: 10,000 publications.

The list RPC's `limit 50` (capped at 100) handles v1 without pagination.

### Concurrency and lock strategy

`create index if not exists` is metadata-only if the index exists. On first creation, Postgres takes a SHARE lock on `shared_link_recipients`. Table is small in the current pre-launch posture; implementation must still capture provider lock/time evidence.

`create or replace function` is metadata-only.

### Expected query count per route/action

- `/workshop/proposals` GET: 1 RPC call.
- Client focus refresh: 1 Server Function call that wraps the same list repository.
- `openRecipientProposalAction`: 1 authorization RPC + 1 server-only admin read of `project_publications`.

### Generated type impact

After `bun run gen:types`, generated `Database["public"]["Functions"]` includes:

- `list_recipient_publications_for_current_user`
- `authorize_recipient_publication_for_current_user`

## API / Network plan

### No new HTTP routes

Per `API-001`, do not create a new `src/app/api/*` route. App Router may still generate Server Function/Action transport endpoints internally.

### Client-callable read transport

`proposals-page-client.tsx` must not import the `server-only` repository directly. Add a small `"use server"` wrapper:

```ts
// src/lib/recipient-proposals/actions.ts
"use server";

import { listRecipientProposals } from "@/lib/repositories/recipient-proposals-repository";

export async function loadRecipientProposals() {
  return listRecipientProposals();
}
```

TanStack Query may call this wrapper for focus refresh using query key `["recipient-proposals", userEmail]`.

### Server Action contract: `openRecipientProposalAction`

**Location**: `src/lib/publication/actions.ts` (extended).

**Signature**:

```ts
export async function openRecipientProposalAction(
  prevState: { ok: false; error: string } | null,
  formData: FormData
): Promise<{ ok: false; error: "invalid" | "not-a-recipient" | "unavailable" | "unknown" }>;
```

Successful execution calls `redirect()` and therefore does not return.

**Input (formData)**:

- `publicationId: string` (UUID)

**Internal flow**:

1. `requireCurrentUserContext()`; unauthenticated users follow the normal login flow.
2. Validate `publicationId` with `isUuid`.
3. Call `authorize_recipient_publication_for_current_user(p_publication_id)` via `createSupabaseServerClient`.
4. If no row is returned, return `{ ok: false, error: "not-a-recipient" }`.
5. Use the existing server-only publication admin/client pattern to read `project_publications.id, encrypted_token, password_hash, status, revoked_at, expires_at` for that publication ID.
6. If the row is missing, revoked, expired, or not `published`, return `{ ok: false, error: "unavailable" }`.
7. Decrypt `encrypted_token` with `decryptPublicationToken(..., readPublicationTokenEncryptionSecret())` to recover the raw publication token.
8. Derive `credentialVersion` from `password_hash` using `deriveCredentialVersion`.
9. Call `getSharedLinkSessionCookieParts({ token, publicationId, credentialVersion, recipientId })`.
10. Set the HttpOnly session cookie and the non-secret `${parts.name}_ok` companion cookie exactly as `src/app/api/share/[token]/session/route.ts` does.
11. `redirect(`/share/${encodeURIComponent(token)}`)` for same-tab navigation.

**Forbidden**:

- Do not return `recipient_token_hash`.
- Do not return `project_publications.token_hash`.
- Do not put either hash in props, form state, URLs, logs, or network payloads.
- Do not build `/share/[token]` from a hash.

### Existing RPCs unchanged

- `insert_client_comment` — unchanged.
- `submit_client_response` — unchanged.
- Public `/share/[token]` route handlers — unchanged.

## Per-table/RPC access-path matrix

| Source | Chosen API/client | Client role | Required grants | Latest RLS posture | Proof source | Fallback |
|---|---|---|---|---|---|---|
| `shared_link_recipients` list by email | `list_recipient_publications_for_current_user` | authenticated | Execute on RPC | Manager-only direct SELECT unchanged; RPC bypasses via `security definer` | Provider SQL readback | None — RPC mandatory |
| `shared_link_recipients` authorize publication | `authorize_recipient_publication_for_current_user` | authenticated | Execute on RPC | Same as above | Provider SQL readback | None — RPC mandatory |
| `project_publications` denormalized list read | Inside list RPC | RPC definer context | None direct | Manager-only RLS unchanged | Provider SQL readback | None |
| `project_publications.encrypted_token` action read | Existing server-only publication admin/client after authorization RPC | server-only service/admin path | No client grant | Manager-only RLS unchanged | Action test + provider/browser proof | Abort with `unavailable` |
| `projects`, `workspaces`, `profiles` | Inside list RPC | RPC definer context | None direct | Existing RLS unchanged | Provider SQL readback | None |

## Provider proof boundary

Apply only to project `ebxxqidacheyapmmzavr` during implementation:

```bash
npx supabase db push --linked
bun run gen:types
```

Then capture SQL evidence:

1. RPC signatures and grants exist for both functions.
2. `shared_link_recipients_lower_email_idx` exists.
3. Direct authenticated non-manager read of `recipient_token_hash` is denied.
4. Fixture recipient with two workspaces sees both rows.
5. Distinct-email user sees none.
6. Mixed-case email matches.
7. Revoked and expired publications appear with disabled statuses in the list.
8. `EXPLAIN ANALYZE` uses the lower-email index and meets the budget.
9. No list RPC return column includes `token_hash`, `encrypted_token`, or `recipient_token_hash`.

## Rollback / fix-forward strategy

```sql
drop function if exists public.list_recipient_publications_for_current_user(int);
drop function if exists public.authorize_recipient_publication_for_current_user(uuid);
drop index if exists public.shared_link_recipients_lower_email_idx;
```

The migration creates no tables and modifies no rows. Fix-forward is preferred for signature/body mistakes because `create or replace function` is low-risk.

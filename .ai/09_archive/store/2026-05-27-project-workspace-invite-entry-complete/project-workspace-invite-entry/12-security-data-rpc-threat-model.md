# 12 - Security, Data, RPC, And Threat Model

## Security Objectives

- A valid token proves only that a recipient may view a bounded invite preview.
- Membership is granted only to the authenticated user whose verified email matches the invited email.
- Acceptance is atomic, idempotent for the same user, and non-replayable by others.
- RLS remains the final data-access boundary.
- Raw tokens never enter stored data, logs, analytics, or audit metadata.

## Data Model Decision

Use a child token table rather than storing token lifecycle directly on `collaboration_invitations`.

Reason:

- the invitation row is the business object;
- token rows are delivery credentials;
- resend, refresh, revoke, and copy actions inspect or rotate token state without corrupting invitation history;
- the model supports one active token per pending invite while preserving old token audit facts.

## Required Tables And Columns

Existing table to preserve:

```txt
collaboration_invitations
```

Required additional fields on `collaboration_invitations`:

```txt
lifecycle_state text not null default 'pending' check in ('pending', 'direct_granted_existing_user', 'accepted_by_recipient', 'revoked', 'expired')
accepted_via text null check in ('invite_route', 'auth_trigger', 'manager_direct_grant')
direct_granted_at timestamptz null
direct_granted_user_id uuid null references profiles(id)
last_opened_at timestamptz null
```

New table:

```txt
collaboration_invitation_tokens
```

Required columns:

```txt
id uuid primary key default gen_random_uuid()
invitation_id uuid not null references collaboration_invitations(id) on delete cascade
token_hash text not null unique
token_hint text null
delivery_method text not null check in ('email', 'copy_url')
created_by uuid not null references profiles(id)
created_at timestamptz not null default now()
expires_at timestamptz not null
last_opened_at timestamptz null
used_at timestamptz null
revoked_at timestamptz null
revoked_by uuid null references profiles(id)
```

Indexes:

```txt
unique(token_hash)
index(invitation_id)
index(expires_at)
partial unique(invitation_id) where used_at is null and revoked_at is null
```

No raw token column is allowed.

Active invitation uniqueness must use `lifecycle_state = 'pending'` or an equivalent materialized active state. A derived `expires_at <= now()` check is not sufficient for a partial unique index. Before creating a replacement invite for the same project/email/scope, the implementation must materialize the prior expired row as `lifecycle_state = 'expired'` or revoke it through an audited manager action.

## Token Generation

Generation:

- 32 bytes minimum random entropy;
- base64url encoded for URL use;
- app server generates the raw token and hashes it with SHA-256 plus the required server-only pepper before any database call;
- use the server-side app boundary to hash the raw route token before database calls;
- require `ARCHESTIMATOR_INVITE_TOKEN_PEPPER` or the approved deployment secret name before invite entry can be enabled;
- display only a short `token_hint`, such as last 6 non-sensitive characters of the public token, for manager audit rows.

Storage:

- store `token_hash`;
- never store raw token;
- never include raw token in audit metadata;
- never include raw token in thrown errors.

## RPC Contract

## Server-Only Token Boundary

The browser UI must never call token RPCs directly. Next.js server routes/actions generate or receive raw tokens, hash them in server memory, and pass only peppered hashes to PostgreSQL.

Required server secret:

```txt
ARCHESTIMATOR_INVITE_TOKEN_PEPPER
```

Rules:

- invite entry is disabled when the pepper is missing;
- token hash uses a versioned peppered digest, for example `sha256("v1:" + pepper + ":" + rawToken)`;
- there is no unpeppered fallback hash;
- app code never exposes `token_hash` to client components, browser logs, analytics, or copied URLs;
- direct browser-style RPC attempts that pass the raw route token or an unpeppered hash return `invalid` and cannot accept;
- database grants are not the app trust boundary. The peppered server hash plus route/server-action ownership is the trust boundary.

## RPC Contract

Next.js server routes/actions are the only application callers for token resolution, token issuance, delivery recording, and token acceptance.

Database functions:

```sql
public.resolve_collaboration_invitation(invitation_token_hash text)
public.accept_collaboration_invitation(invitation_token_hash text)
public.revoke_collaboration_invitation(invitation_id uuid)
public.issue_collaboration_invitation_token(invitation_id uuid, invitation_token_hash text, token_hint text, delivery_method text, token_expires_at timestamptz, revoke_existing boolean)
public.record_collaboration_invitation_delivery(invitation_id uuid, token_id uuid, delivery_method text)
```

All security-definer functions must set:

```sql
set search_path = public, pg_temp
```

### `resolve_collaboration_invitation`

Purpose:

- return bounded preview data for a valid active token;
- return terminal reason code for expired, revoked, used, or invalid states.

Validation:

- token hash exists;
- token not revoked;
- invitation not revoked;
- invitation not deleted;
- route never returns private project data for invalid token.

Return shape:

```txt
state text check in ('invalid', 'active', 'expired', 'revoked', 'already_used')
invitation_id uuid null
project_id uuid null
estimate_id uuid null
project_name text null
project_code text null
estimate_name text null
role text null
scope text null
inviter_label text null
invited_email text null
expires_at timestamptz null
token_id uuid null
```

### `accept_collaboration_invitation`

Purpose:

- validate token and current authenticated user;
- create or confirm membership;
- mark invitation/token accepted in one transaction.

Validation:

- caller is authenticated;
- `auth.uid()` exists in `profiles`;
- verified auth email equals `collaboration_invitations.email` case-insensitively;
- token hash exists;
- token not expired;
- token not revoked;
- invitation not revoked;
- invitation not accepted by a different user;
- role assignment does not downgrade existing access.

Transaction requirements:

- lock the invitation token row and invitation row before membership writes;
- perform token hash, lifecycle, expiry, revocation, accepted-state, and email checks in the same transaction;
- same-user retry after a prior successful acceptance returns an idempotent `already_member` or `accepted` result;
- different-user replay returns a denied result and writes `collaboration_invite_replay_blocked`;
- no membership write happens before the guarded token/invitation update succeeds.

Side effects:

- upsert `project_members` for project-scope invites;
- upsert `estimate_sheet_members` for estimate-scope invites;
- preserve higher existing role;
- set `accepted_at`, `invited_user_id`, and `accepted_via = 'invite_route'`;
- set `lifecycle_state = 'accepted_by_recipient'`;
- set token `used_at`;
- write audit event without raw token.

### `revoke_collaboration_invitation`

Purpose:

- manager revokes an invitation and active token.

Validation:

- caller can manage the target project;
- caller rank can manage the target role.

Side effects:

- set invitation `revoked_at`;
- set active token `revoked_at` and `revoked_by`;
- write audit event.

### `issue_collaboration_invitation_token`

Purpose:

- store a server-generated token hash for initial invite creation or explicit `Refresh link`.

Validation:

- caller can manage the target project;
- invitation remains pending;
- when `revoke_existing = true`, active old tokens are revoked before the new token row is inserted.

Side effects:

- insert new token hash;
- revoke prior active token only when `revoke_existing = true`;
- write audit event.

This function never generates or returns a raw token. The app server creates the raw token, sends only the hash and hint to this function, and returns the raw token to the email/copy-link path exactly once.

### `record_collaboration_invitation_delivery`

Purpose:

- record that an existing active token was sent or copied without rotating it.

Validation:

- caller can manage the target project;
- token belongs to the invitation;
- token is active.

Side effects:

- update delivery timestamps;
- write `collaboration_invite_email_sent` or `collaboration_invite_link_copied`;
- do not revoke or create token rows.

## Grant And RLS Posture

Required revokes:

```sql
revoke all on table public.collaboration_invitation_tokens from public, anon, authenticated;
revoke insert, update, delete on table public.collaboration_invitations from anon, authenticated;
revoke insert, update, delete on table public.collaboration_audit_events from public, anon, authenticated;
revoke all on function public.apply_pending_collaboration_invitations(uuid, text) from anon, authenticated;
revoke all on function public.apply_pending_collaboration_invitations(uuid, text) from public;
```

Required grants:

```sql
grant execute on function public.resolve_collaboration_invitation(text) to anon, authenticated;
grant execute on function public.accept_collaboration_invitation(text) to authenticated;
grant execute on function public.revoke_collaboration_invitation(uuid) to authenticated;
grant execute on function public.issue_collaboration_invitation_token(uuid, text, text, text, timestamptz, boolean) to authenticated;
grant execute on function public.record_collaboration_invitation_delivery(uuid, uuid, text) to authenticated;
```

These grants support Supabase role execution from server routes/actions. They are safe only because the functions accept peppered token hashes, not raw tokens, and because direct browser-style attempts without the server pepper resolve to `invalid`. Red tests must prove raw-token and unpeppered-hash RPC attempts cannot resolve or accept an invite.

The broad pending-application function must be trigger-only or service-only. It must not let a normal client submit arbitrary `target_user_id` and `target_email`.

RLS:

- direct table selects by token are not allowed from browser clients;
- manager reads of invitation rows remain limited to manageable projects;
- invited-email reads remain limited to authenticated matching email, and the public route does not rely on browser table reads;
- token table must not have browser select policies by token hash;
- membership writes stay manager/RPC controlled.
- `collaboration_audit_events` is server/RPC-write only and manager-readable only where project policy allows.

## Existing-User Direct Grant Contract

Current behavior grants existing profiles immediately. Future implementation must change its lifecycle semantics:

- manager direct grant may upsert `project_members` or `estimate_sheet_members`;
- direct grant sets `lifecycle_state = 'direct_granted_existing_user'`;
- direct grant sets `direct_granted_at` and `direct_granted_user_id`;
- direct grant does not set recipient-click `accepted_at`;
- when the recipient later opens the invite link with the matching account, the accept RPC marks `accepted_at`, `invited_user_id`, and `accepted_via = 'invite_route'` without duplicating or downgrading membership.

This keeps access immediate for existing users while preserving truthful invite analytics.

## Migration And Backfill Contract

Migration order:

1. Add `lifecycle_state`, `accepted_via`, `direct_granted_at`, `direct_granted_user_id`, and `last_opened_at` to `collaboration_invitations`.
2. Create `collaboration_invitation_tokens`.
3. Create `collaboration_audit_events`.
4. Add or replace active unique indexes so only `lifecycle_state = 'pending'` rows block duplicate pending invites.
5. Create narrow RPCs with explicit `set search_path`.
6. Revoke broad function/table access and grant only named RPC access.
7. Backfill lifecycle fields for existing rows.
8. Generate token rows for active pending invitations only when invite creation, copy-link enablement, explicit refresh, or audited backfill requires it.
9. Regenerate Supabase types.
10. Verify linked database grants, RLS policies, function definitions, and migration history before rollout.

Backfill rules:

- existing `accepted_at is not null` rows become `lifecycle_state = 'accepted_by_recipient'` only when there is evidence the recipient accepted through the route or auth trigger; existing historical rows without that evidence may remain classified by legacy metadata during migration review;
- existing unaccepted and unrevoked rows with `expires_at <= now()` become `lifecycle_state = 'expired'`;
- existing unaccepted and unrevoked rows with `expires_at > now()` remain `pending`;
- old Supabase Auth invite emails that point directly at project routes remain safe but are not treated as app-owned `/invite/[token]` entries;
- Teamspaces `Resend` after implementation sends the existing active `/invite/[token]` link and records delivery. `Refresh link` rotates to a new `/invite/[token]`.

Forward-safe rollback:

- disable `PROJECT_INVITE_ENTRY_ENABLED`;
- stop creating token rows;
- hide `Copy invite link`;
- keep tables and audit rows in place for forensic review;
- do not drop membership rows that were granted by valid acceptance;
- revoke active token rows if leakage or replay risk is suspected.

## Audit Storage Contract

Create:

```txt
collaboration_audit_events
```

Required columns:

```txt
id uuid primary key default gen_random_uuid()
event_name text not null
workspace_id uuid null
project_id uuid null
estimate_id uuid null
invitation_id uuid null
token_id uuid null
actor_user_id uuid null
target_user_id uuid null
target_email_hash text null
result_code text not null
metadata jsonb not null default '{}'::jsonb
created_at timestamptz not null default now()
```

Rules:

- invite lifecycle events write here;
- auth callback and account security events continue to write to `account_security_events`;
- browser clients have no write grants;
- manager reads are scoped by project/workspace permission;
- request IP and user agent may be stored only as hashes or coarse metadata when needed for abuse review;
- audit writes are best-effort for open events and required for accept/revoke/replay events.

## Threat Model

| Threat | Risk | Mitigation |
| --- | --- | --- |
| Token guessing | Unauthorized preview or access | 32-byte random token, hash storage, shape validation, generic invalid copy |
| Raw token leak in logs | Replay before expiry | never log raw token, audit only token id/hint/hash prefix if needed |
| Link forwarded to wrong account | Unauthorized access | email-bound acceptance using verified auth email |
| Signed-in wrong account confusion | User stuck or grants wrong user | explicit mismatch state, sign-out CTA, no membership write |
| Replay after acceptance | Duplicate or unauthorized access | token `used_at`, accepted invitation lifecycle, transaction lock |
| Race double-accept | Conflicting membership writes | single transaction, row-level lock on token/invitation |
| Expired pending invite still shown | False manager confidence | materialize expired lifecycle before reissue and exclude expired from active pending list |
| Existing-user direct grant counted as acceptance | Bad analytics and lifecycle | separate `direct_granted_at` and `accepted_via` |
| Security-definer abuse | Arbitrary membership grant | revoke broad function, narrow RPC validates auth uid/email/token |
| Project data enumeration | Project/email leak | generic invalid state, bounded preview only after token hash match |
| Manager over-invites above rank | Privilege escalation | role-rank checks in action and RPC |
| Sheet-only sees project charts | Data overexposure | charts require project-level access in v1 |

## Audit Events

Required event names:

```txt
collaboration_invite_created
collaboration_invite_email_sent
collaboration_invite_link_copied
collaboration_invite_token_refreshed
collaboration_invite_opened
collaboration_invite_wrong_account
collaboration_invite_accepted
collaboration_invite_already_member
collaboration_invite_expired_open
collaboration_invite_revoked
collaboration_invite_replay_blocked
```

Audit metadata may include:

- invitation id;
- token id;
- token hint;
- project id;
- estimate id;
- invited email hash or normalized email only where policy already allows;
- actor user id;
- result code.

Audit metadata must not include:

- raw token;
- magic link;
- auth callback code;
- OTP;
- service-role key;
- provider payload.

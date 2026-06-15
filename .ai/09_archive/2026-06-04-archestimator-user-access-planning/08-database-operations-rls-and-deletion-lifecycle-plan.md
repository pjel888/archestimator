# 08 — Database Operations Plan: Immutable Snapshots, RLS, Entitlements, and Deletion Lifecycle

**Status:** Second-pass planning  
**Last updated:** 2026-06-04  
**Scope:** Database architecture and operational plan for Type 3 deletion-independent client archives.

---

## 1. Core Database Principle

Type 3 archive reads must not depend on live project rows, live estimate rows, live publication rows, or project collaboration membership.

The database must model three independent axes:

- **Identity:** authenticated user / recipient / anonymous viewer.
- **Permission:** live project CRUD role or share-link action permission.
- **Entitlement:** paid subscription or other account-bound archive right.

Therefore, Type 3 belongs in a **client archive entitlement domain**, not in `project_members`, `estimate_sheet_members`, or public share-link tables.

---

## 2. Current Repo Database Findings

Audited migrations/source:

- `supabase/migrations/20260518090000_archestimator_core_schema.sql`
- `supabase/migrations/20260518100000_auth_profiles_ceo_access.sql`
- `supabase/migrations/20260526142913_project_sheet_collaboration_access.sql`
- `supabase/migrations/20260527120000_project_client_publication.sql`
- `supabase/migrations/20260528220000_project_shared_link_overhaul.sql`
- `supabase/migrations/20260601003000_security_rate_limit_events.sql`
- `supabase/migrations/20260603160000_mass_deletion_governance.sql`
- `src/lib/publication/public-repository.ts`
- `src/lib/publication/security.ts`
- `src/lib/mass-deletion/bulk-action.ts`
- `src/lib/email/resend-webhooks.ts`

### Existing strengths

- `project_members` and `estimate_sheet_members` provide Type 2 collaboration permissions.
- `project_publications` stores publication snapshots for public/client share flows.
- `shared_link_recipients`, `shared_link_comments`, decisions/responses/events provide the early recipient interaction model.
- Public share cookies and recipient session cookies are hashed/signed and separate from live Supabase auth sessions.
- Mass deletion governance already has preview/execute RPCs and active-publication blockers.
- Security rate-limit events are service-role scoped, RLS-enabled, and inaccessible to anon/authenticated users.
- Resend webhook route verifies the provider webhook payload and bounds body size.

### Current gaps for Type 3

- No client archive subscription table.
- No account-bound client archive entitlement table.
- No deletion-independent archive snapshot table.
- Current shared-link rows are tied to `project_publications` by cascading foreign keys.
- Comments/decisions tied to publications are not durable archive events after source deletion.
- Mass deletion blockers do not yet account for active archive subscribers.
- Webhook idempotency for a future billing system needs a durable event ledger, not only “last event” fields.

---

## 3. Research Anchors Used

- PostgreSQL RLS: enabling RLS with no policy defaults to deny; policies can be command-specific; table owners and BYPASSRLS roles can bypass unless operationally guarded.
- Supabase RLS: application data access should be policy-driven; service-role operations must remain server-only and should not leak to client/browser flows.
- OWASP Authorization: use least privilege, deny-by-default, validate authorization on every request, and prefer ABAC/ReBAC for relationship-heavy domains.
- Stripe webhook docs: verify signatures, store processed event IDs, avoid order dependence, listen only to required events, and return quickly before slow work.

---

## 4. Proposed Database Domain

### 4.1 `client_archive_accounts`

Purpose: durable client identity record separate from contractor workspace membership.

Suggested columns:

- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `primary_email text not null`
- `display_name text`
- `status text not null check (...)` — active, suspended, merged, deleted
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Notes:

- This may be optional if `profiles` is enough, but a separate table helps keep client account metadata out of workspace/collaboration logic.
- Never use this row as project permission.

### 4.2 `client_archive_entitlements`

Purpose: access right that determines whether a client can read archive snapshots.

Suggested columns:

- `id uuid primary key default gen_random_uuid()`
- `client_user_id uuid not null references auth.users(id) on delete cascade`
- `status text not null` — pending, trialing, active, past_due, canceled, expired, revoked
- `entitlement_type text not null` — archive_subscription, owner_grant, support_override
- `provider text` — stripe/null
- `provider_customer_id text`
- `provider_subscription_id text`
- `current_period_start timestamptz`
- `current_period_end timestamptz`
- `grace_ends_at timestamptz`
- `canceled_at timestamptz`
- `revoked_at timestamptz`
- `metadata_json jsonb not null default '{}'::jsonb`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Important:

- Entitlement status is not permission role.
- Type 3 paid archive access should be checked against this table or an equivalent subscription table.

### 4.3 `client_archive_snapshots`

Purpose: immutable saved estimate/proposal copy.

Suggested columns:

- `id uuid primary key default gen_random_uuid()`
- `client_user_id uuid not null references auth.users(id) on delete cascade`
- `entitlement_id uuid references public.client_archive_entitlements(id) on delete set null`
- `source_workspace_id uuid not null`
- `source_project_id uuid not null`
- `source_estimate_id uuid`
- `source_publication_id uuid`
- `source_snapshot_version integer not null default 1`
- `snapshot_kind text not null` — proposal, estimate_sheet, activity_history
- `snapshot_json jsonb not null`
- `source_metadata_json jsonb not null default '{}'::jsonb`
- `source_deleted_at timestamptz`
- `sealed_at timestamptz not null default now()`
- `created_at timestamptz not null default now()`

Deletion-independence rule:

- Do **not** add foreign keys from `client_archive_snapshots.source_project_id` or `source_publication_id` to live `projects`/`project_publications` if hard deletion must preserve archives.
- If FKs are required for temporary validation, use a separate staging table, not the sealed archive table.

### 4.4 `client_archive_activity_events`

Purpose: immutable client-visible activity history.

Suggested columns:

- `id uuid primary key default gen_random_uuid()`
- `snapshot_id uuid references public.client_archive_snapshots(id) on delete cascade`
- `client_user_id uuid not null references auth.users(id) on delete cascade`
- `event_type text not null`
- `event_actor_type text not null` — owner, collaborator, client, system
- `event_json jsonb not null default '{}'::jsonb`
- `occurred_at timestamptz not null default now()`

### 4.5 `client_archive_deletion_tombstones`

Purpose: owner/project deletion record that preserves source identity without live rows.

Suggested columns:

- `id uuid primary key default gen_random_uuid()`
- `entity_type text not null` — project, estimate, publication
- `entity_id uuid not null`
- `workspace_id uuid`
- `deleted_by uuid references auth.users(id) on delete set null`
- `deleted_at timestamptz not null default now()`
- `active_archive_snapshot_count integer not null default 0`
- `active_archive_entitlement_count integer not null default 0`
- `reason text`
- `metadata_json jsonb not null default '{}'::jsonb`

### 4.6 `billing_webhook_events`

Purpose: idempotent billing event ledger.

Suggested columns:

- `id uuid primary key default gen_random_uuid()`
- `provider text not null`
- `provider_event_id text not null`
- `event_type text not null`
- `object_id text`
- `received_at timestamptz not null default now()`
- `processed_at timestamptz`
- `status text not null default 'received'`
- `payload_json jsonb not null`
- `error text`
- `unique (provider, provider_event_id)`

This protects against duplicate webhook delivery. For Stripe specifically, also handle cases where multiple Event objects represent the same logical object transition by checking `(event_type, object_id, provider_subscription_id)` when appropriate.

---

## 5. RLS and Authorization Design

### 5.1 Default posture

- Enable RLS on every new archive/billing/audit table.
- Revoke broad access from `anon` and `authenticated` unless a policy explicitly grants it.
- Client-facing policies should be SELECT-only except for narrowly scoped profile/account updates.
- Archive snapshot INSERT/UPDATE/DELETE should be service-role or controlled RPC only.

### 5.2 Example policy intentions

For `client_archive_snapshots`:

- `authenticated` can SELECT rows where:
  - `client_user_id = auth.uid()`; and
  - there is an entitlement for `auth.uid()` in an allowed access state; and
  - snapshot is not revoked/retention-expired.

- `authenticated` cannot INSERT/UPDATE/DELETE snapshots.

For `client_archive_entitlements`:

- `authenticated` can SELECT own entitlement rows.
- `authenticated` cannot directly change status.
- status updates come from server-side billing webhook handler or support/admin tools.

For `billing_webhook_events`:

- no client access.
- service role only.

### 5.3 Security-definer RPC safeguards

If SQL RPCs are used:

- use `security definer` only when necessary;
- set `search_path` explicitly;
- validate caller identity and intended action inside the function;
- avoid returning broad JSON from service-role context;
- write contract tests that inspect function definitions for unsafe `search_path` omissions.

---

## 6. Immutable Snapshot Rules

A sealed archive snapshot should be append-only.

Allowed operations:

- insert new snapshot version;
- mark source deleted through metadata or tombstone linkage;
- append activity event;
- revoke access through entitlement status;
- add correction event that points to replacement snapshot.

Disallowed operations:

- client update to `snapshot_json`;
- owner update to client's sealed `snapshot_json` after publication;
- cascade deletion through source project/publication;
- using `project_members` role to authorize archive reads.

Implementation tools:

- RLS + grants;
- table permissions;
- immutable trigger blocking update/delete except service maintenance role;
- versioned replacement rows instead of in-place content edits;
- audit event rows for corrections.

---

## 7. Deletion Lifecycle

### Current deletion model

The existing mass deletion migration has preview/execute governance and active-publication blockers. That is the right pattern to extend.

### Required extension

Deletion preview must compute:

- active publications;
- active archive snapshots;
- active archive entitlements/subscribers;
- whether hard deletion is blocked;
- whether tombstone-preserving deletion is allowed;
- storage cleanup impact.

### Recommended phases

1. **Phase 1 — Block hard deletion when active archive subscribers exist.**
   - Simplest, safest behavior.

2. **Phase 2 — Preserve sealed snapshots and create tombstones.**
   - Source project may be removed only after snapshot independence is proven.

3. **Phase 3 — Retention policy and purge job.**
   - Archive expiration/purge follows product/legal policy.

---

## 8. Operational Jobs

Needed eventually:

- billing webhook processor/idempotency job;
- subscription grace-period expiration job;
- retention-expiry job;
- tombstone integrity audit job;
- orphan snapshot audit job;
- archive access audit export;
- storage cleanup worker that does not delete archive assets still referenced by snapshots.

---

## 9. Migration Order

Recommended order:

1. Add enums/status domains.
2. Add account/entitlement/snapshot/tombstone/webhook-event tables.
3. Add RLS/grants/policies.
4. Add indexes and unique idempotency constraints.
5. Add immutable snapshot trigger or restricted update policy.
6. Add test fixtures and schema contract tests.
7. Generate/update Supabase TypeScript types if the repo workflow requires it.
8. Add repository layer behind feature flag.
9. Add UI/API.
10. Integrate deletion preview/execute logic after archive read path is proven.

---

## 10. Indexing Plan

Minimum indexes:

- `client_archive_snapshots(client_user_id, sealed_at desc)`
- `client_archive_snapshots(source_project_id, sealed_at desc)`
- `client_archive_snapshots(source_publication_id, source_snapshot_version)`
- `client_archive_entitlements(client_user_id, status)`
- `client_archive_entitlements(provider, provider_subscription_id)` unique where provider subscription id is not null
- `billing_webhook_events(provider, provider_event_id)` unique
- `client_archive_deletion_tombstones(entity_type, entity_id)`

---

## 11. Database Acceptance Criteria

The database plan is implementation-ready only if:

- Type 3 archive access can be proven without joining live project membership tables.
- Sealed snapshots survive deletion of source publications/projects.
- RLS prevents cross-client snapshot reads.
- Service-role writes are isolated to server routes/RPCs.
- Billing webhooks are idempotent and order-tolerant.
- Deletion preview includes archive subscriber impact.
- Existing Type 1/2/4 behavior remains unchanged until the upgrade flow is explicitly enabled.

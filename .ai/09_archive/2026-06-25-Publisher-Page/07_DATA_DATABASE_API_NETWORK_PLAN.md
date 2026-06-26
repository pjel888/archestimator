# 07 — Data, Database, API, and Network Plan

> **PASS-2 AUDIT BANNER (2026-06-25), updated by PASS-3 owner decisions.** This document has 6 CRITICAL corrections and 2 HIGH corrections recorded in `18_AUDIT_FINDINGS_AND_CORRECTIONS_2026-06-25.md`. Before reading this document as authoritative, read the audit doc. Headline corrections: FAB-A01 (action-surface names fabricated — see corrected list below), FAB-A02 (`atomic_publish_and_digest_slot` → `shared_link_atomic_publish_and_digest_slot`), FAB-A03 (lock migration timestamp 145000 not 151500), FAB-A04 (no `isBeforeSharedLinkActivityCursor` helper exists — use `parseSharedLinkActivityCursor`/`encodeSharedLinkActivityCursor` at activity-helpers.ts:256/246), FAB-A05 (service-role IS used in 10 src/lib files — Publisher must not add new paths), FAB-A06 (8 share/[token] endpoints, not 7 — `route.ts` GET handler is the missing entry), ARCH-DEFECT-03 (rotate-token race is resolved by D-ARCH-05: DB-level per-publication rotate serialization/lock), ARCH-DEFECT-06 (Phase 2 RPC SECURITY DEFINER needs explicit force_rls or rank-check policy citation).
>
> **Corrected server-action surface (FAB-A01 — supersedes §"Server action surface" table later in this doc):**
> - **publication/actions.ts**: `createProjectPublication` (:533), `republishProjectPublication` (:592), `rotateProjectPublicationLink` (:673), `revokeProjectPublication` (:733), `refreshProjectPublicationSummary` (:758), `listSharedLinkRecipients` (:1041), `addSharedLinkRecipients` (plural, :1064), `resendSharedLinkRecipientEmail` (:1235), `removeSharedLinkRecipient` (:1326), `loadSharedLinkActivity` (:1479), `maybeTriggerSharedLinkActivityDigest` (:1631), `readSharedLinkEmailDeliveryReadiness` (:253).
> - **collaboration/actions.ts**: `readProjectInviteDeliveryReadiness` (:454), `inviteProjectCollaborator` (:473), `inviteEstimateSheetCollaborator` (:612), `copyProjectInviteLink` (:754), `resendProjectInviteEmail` (:795), `updateProjectCollaboratorRole` (:854), `removeProjectCollaborator` (:945), `setEstimateSheetAccessMode` (:1024).
> - **Fabricated names that do NOT exist anywhere in src/lib**: `publishProjectPublication`, `rotateSharedLinkToken`, `revokePublication`, `republishSnapshot`, `addSharedLinkRecipient` (singular), `setPublicationPassword`, `setPublicationSheetSelection`, `expirePublication`, `setSheetAccessMode`, `addSheetMember`, `removeSheetMember`, `inviteProjectMember`, `revokeInvitation`. If you find these names in the body of this document, treat them as aliases for the corrected names above.

> **PASS-3 REFINEMENT (2026-06-25, see `18_AUDIT_FINDINGS_AND_CORRECTIONS_2026-06-25.md` §"Pass 3 refinement").** NX-GAP-02: Next.js 16 does NOT ship a built-in logging-redaction config — SEC-02 mitigation must be middleware-level redactor in `src/proxy.ts` or log-pipeline filter (Vercel/Axiom/Sentry). NX-GAP-05: verified `src/lib/auth/session.ts:40` uses `supabase.auth.getUser()` ✅ — Supabase 2025 best practice is still `getUser` for protected routes. NX-GAP-06: Phase 2 RPC `workspace_publications_summary` SECURITY DEFINER draft should add `force_rls` on `project_publications` (Supabase 2025 blessed pattern) OR document why rank predicates suffice; cite the Supabase "Postgres Security" guide at implementation time.

## Data ownership

| Data | Owner table | Publisher reads | Publisher writes |
|---|---|---|---|
| Workspace membership | `workspace_members` | Indirect (via `workspace_projects_summary` RPC) | Never |
| Project membership | `project_members` | Direct (RSC rollup) | Never directly — via existing collaboration actions |
| Estimate sheet access | `estimate_sheet_access_settings`, `estimate_sheet_members` | Direct (Phase 3) | Phase 3 via existing actions |
| Publications | `project_publications` | Direct (roster) | Never directly — via existing publication actions |
| Recipients | `shared_link_recipients` | Direct (drawer) | Never directly — via existing actions |
| Comments | `shared_link_comments` | Direct (timeline) | Never (receiver-side only) |
| Decisions | `shared_link_responses` | Direct (timeline) | Never (receiver-side only) |
| Open events | `shared_link_events` | Direct (timeline) | Never (receiver-side only) |
| Audit | `collaboration_audit_events`, `account_security_events` | Direct (timeline) | Indirect — via existing action layer |
| Estimate history | `estimate_sheet_events` | Direct (timeline) | Never |

**Rule:** Publisher UI never issues INSERT/UPDATE/DELETE on these tables. Only existing server actions in `src/lib/{publication,collaboration}/actions.ts` mutate, and only after passing RBAC gates.

## Schema changes required

### Phase 1 — NONE

Phase 1 is **schema-stable**. No migration files. All required columns already exist:
- `project_publications.{token_hash, encrypted_token, password_hash, status, expires_at, snapshot_version, snapshot_generated_at, selected_estimate_ids, location_visibility}`
- `shared_link_recipients.{publication_id, email, display_name, delivered_at, opened_at, unsubscribed_at}`
- `shared_link_events.{publication_id, recipient_id, event_type, created_at, context}`
- `estimate_sheet_access_settings.{estimate_id, access_mode}` (enum: inherits-project | sheet-overrides | restricted)
- `estimate_sheet_members.{estimate_id, profile_id, role}`
- `project_members.{project_id, profile_id, role}`
- `collaboration_audit_events.{project_id, actor_id, action, target_type, target_id, created_at, metadata}`
- `account_security_events.{workspace_id, actor_id, action, target_type, target_id, created_at, metadata}`

### Phase 2 (optional, measurement-gated) — `workspace_publications_summary` RPC

If PERF-01 fails (roster render > 1.2s at p95 on 50-project workspace), add a new RPC:

```sql
-- File: supabase/migrations/<TS>_workspace_publications_summary.sql
create or replace function public.workspace_publications_summary(
  target_workspace_id uuid
) returns table (
  publication_id uuid,
  project_id uuid,
  project_name text,
  status text,
  recipient_count integer,
  open_count integer,
  latest_opened_at timestamptz,
  latest_activity_at timestamptz,
  snapshot_version integer,
  snapshot_generated_at timestamptz,
  stale_snapshot_days integer,
  can_manage_publication boolean
) language sql stable security definer set search_path = public as $$
  select
    p.id,
    p.project_id,
    pr.name,
    p.status,
    (select count(*) from shared_link_recipients where publication_id = p.id and unsubscribed_at is null),
    (select count(*) from shared_link_events where publication_id = p.id and event_type = 'view'),
    (select max(created_at) from shared_link_events where publication_id = p.id and event_type = 'view'),
    greatest(
      (select max(created_at) from shared_link_comments where publication_id = p.id),
      (select max(created_at) from shared_link_responses where publication_id = p.id),
      (select max(created_at) from shared_link_events where publication_id = p.id)
    ),
    p.snapshot_version,
    p.snapshot_generated_at,
    case
      when p.snapshot_generated_at is null then null
      else extract(day from (now() - p.snapshot_generated_at))::integer
    end,
    public.current_project_access_rank(p.project_id) >= 30
  from project_publications p
  join projects pr on pr.id = p.project_id
  where pr.workspace_id = target_workspace_id
    and p.status in ('published', 'expired', 'revoked')
    and public.current_project_access_rank(p.project_id) >= 20  -- Publisher read floor
  order by 8 desc nulls last;  -- latest_activity_at desc
$$;

grant execute on function public.workspace_publications_summary(uuid) to authenticated;
```

**Security notes:**
- `SECURITY DEFINER` to avoid N+1 RLS subqueries per row — but **must** respect `Launch-Readiness-Audit/RLS-RPC-And-DB-Security` guidelines (no service-role bypass).
- The `current_project_access_rank(p.project_id) >= 20` predicate enforces the Publisher non-viewer read floor at the SQL level (defense in depth); viewers must receive zero Publisher roster rows per SEC-01.
- The function is `STABLE` (read-only) and `SECURITY DEFINER` only to fold RLS subqueries; it does not elevate writes.

### Phase 2 (optional, measurement-gated) — `workspace_activity_feed` RPC

If DATA-02 application-layer union proves slow at scale, add:

```sql
create or replace function public.workspace_activity_feed(
  target_workspace_id uuid,
  page_size integer default 50,
  cursor_at timestamptz default null
) returns table (
  event_type text,
  event_id uuid,
  actor_id uuid,
  target_type text,
  target_id uuid,
  created_at timestamptz,
  metadata jsonb
) language sql stable security definer set search_path = public as $$
  -- union of 5 audit/event sources filtered by workspace
  -- implementation details omitted for brevity; pattern matches
  -- workspace_homebase_summary
$$;
```

**Phase 1 fallback:** application-layer union in TypeScript. Performance acceptable at < 50 projects.

### Phase 3 — access-mode toggle UI only

No schema change. The existing `estimate_sheet_access_settings.access_mode` enum is the surface.

### Phase 3 — sheet-member bulk-add RPC (optional)

If adding 5+ members to a sheet in one action becomes common, add:

```sql
create or replace function public.bulk_set_estimate_sheet_members(
  target_estimate_id uuid,
  member_inputs jsonb
) returns void language plpgsql security invoker as $$
  -- iterate member_inputs, insert/update estimate_sheet_members
  -- emit one audit row per member added/removed
$$;
```

**`SECURITY INVOKER`** to inherit caller RLS. Phase 1 does not need this.

### Phase 4+ (future, decision-gated) — per-recipient capabilities (D1)

If recipient edit-grant moves past MVP:

```sql
-- Decision D1: add capabilities column to shared_link_recipients
alter table shared_link_recipients
  add column capabilities text[] not null default array['view']::text[];
-- allowed values: 'view', 'comment', 'decision', 'edit' (future)
check (capabilities <@ array['view','comment','decision','edit']::text[]);
```

Then extend receiver-side API + UI to honor `edit` capability. **Not in this plan's scope.**

## Constraints

| Constraint | Source | Enforcement |
|---|---|---|
| Every user-data table has RLS | repo convention | `supabase/migrations/2026*` pattern |
| Every manager action emits audit | SEC-07, DATA-05 | `account_security_events` INSERT in action body |
| Audit tables are insert-only | SEC-07 | RLS UPDATE/DELETE denied |
| No new service-role paths from Publisher | repo convention + FAB-A05 | Existing app code has limited service-role usage; Publisher must not add new service-role reads or client factories |
| Snapshot immutability post-publish | `20260603214151_*`, `20260603210653_*` | Locked snapshot_version on comment/response rows |
| Recipient credentials locked down | `20260601151500_lock_down_shared_link_recipient_credentials.sql` | Recipient email + name not editable post-delivery |
| Token hashing always via `hashPublicationToken` | publication/security.ts:71 | Verified by `security-findings-proof-contracts.test.ts` |

## Validation rules

| Rule | Source | Enforcement |
|---|---|---|
| Password minimum 4 chars | `security.ts:126 MIN_PUBLICATION_PASSWORD_LENGTH = 4` | `validatePublicationPassword` |
| Recipient email RFC-valid | `RecipientEmailComposer` | Client + server validate |
| Role enum constrained | DB enum | `project_members.role` check |
| Access-mode enum constrained | DB enum | `estimate_sheet_access_settings.access_mode` check |
| Token hash prefix matches | `security.ts:5 tokenHashPrefix` | Verified on read |
| Recopy-token prefix matches | `security.ts:6 tokenEncryptionPrefix` | Verified on read |
| Password hash prefix matches | `security.ts:7 passwordHashPrefix` | Verified on read |
| Invite token hash peppered | `teamspaces-collaboration-spec.md:53` | `sha256(v1:{pepper}:{rawToken})` |

## Indexes (existing, verified sufficient for Phase 1)

| Table | Index | Used by |
|---|---|---|
| `project_publications` | `project_publications_project_id_idx` | Roster project rollup |
| `shared_link_recipients` | `shared_link_recipients_publication_id_idx` | Drawer recipient list |
| `shared_link_events` | `shared_link_events_publication_id_created_at_idx` | Open count, latest open |
| `shared_link_comments` | `shared_link_comments_publication_id_created_at_idx` | Latest comment |
| `shared_link_responses` | `shared_link_responses_publication_id_created_at_idx` | Latest decision |
| `collaboration_audit_events` | `collaboration_audit_events_project_id_created_at_idx` | Timeline |
| `estimate_sheet_events` | `estimate_sheet_events_estimate_id_created_at_idx` | Timeline |

**Phase 2 candidate index** (if RPC surface is added):
```sql
create index if not exists project_publications_workspace_status_idx
  on project_publications (status)
  where status in ('published', 'expired', 'revoked');
```

## Transaction boundaries

| Operation | Transaction scope |
|---|---|
| Publish | Single transaction: INSERT `project_publications` + INSERT `shared_link_recipients`[] + INSERT audit row. Existing `shared_link_atomic_publish_and_digest_slot` RPC handles digest slot reservation. |
| Rotate token | Single transaction: acquire D-ARCH-05 per-publication rotate lock, compare `expected_encrypted_token`, UPDATE `project_publications` token_hash + encrypted_token + snapshot fields, INSERT audit row |
| Revoke | Single transaction: UPDATE `project_publications` status='revoked' + revoked_at + INSERT audit row |
| Add recipient | Single transaction: INSERT `shared_link_recipients` + INSERT `shared_link_events` (event_type='added') + INSERT audit |
| Remove recipient | Single transaction: DELETE `shared_link_recipients` + INSERT audit |
| Toggle access mode | Single transaction: UPDATE `estimate_sheet_access_settings.access_mode` + INSERT audit |
| Add member | Single transaction: INSERT `project_members` OR `estimate_sheet_members` + INSERT audit + (optional) INSERT `collaboration_invitations` |

All atomic per operation. Bulk operations (Phase 3+) loop at application layer with per-row transaction.

## Concurrency

| Risk | Mitigation |
|---|---|
| Two managers rotate the same publication simultaneously | D-ARCH-05 requires DB-level per-publication serialization/locking inside the rotate transaction. The second rotate waits or cleanly returns the existing encrypted-token conflict message; no manager receives a newly generated dead link. |
| Manager adds recipient while recipient unsubscribes | INSERT…ON CONFLICT DO NOTHING on `(publication_id, email)`. Unsubscribe state preserved. |
| Manager revokes while recipient comments | Comment attempt returns 410 Gone (publication revoked). Existing behavior. |
| Bulk publish to N recipients | Existing `shared_link_atomic_publish_and_digest_slot` RPC handles slot reservation. |

## Referential integrity

All FKs are `on delete cascade` for publication-scoped rows (`shared_link_*`) — deleting a publication removes its recipients, comments, responses, events. Verified via `20260528220000_project_shared_link_overhaul.sql`.

`project_publications.project_id` is `on delete restrict` initially, then `on delete cascade` after `20260616180000_allow_project_deletion_with_active_publications.sql` allowed project deletion with active publications (with audit warning).

## Migration sequencing (Phase 2+ only)

If Phase 2 RPCs are added:
1. `workspace_publications_summary.sql` — depends on existing RLS + `current_project_access_rank` RPC.
2. `workspace_activity_feed.sql` — depends on existing audit table schema.
3. (Optional) `workspace_publications_workspace_status_idx.sql` — index-only, safe.

All Phase 2 migrations are **additive** and **reversible** (drop function / drop index).

## Backfills

None required for Phase 1. Phase 2 RPCs are pure functions; no data migration.

## Existing-data compatibility

Phase 1 reads existing rows. All existing publications become visible in the roster immediately on first load. **No data conversion.**

For Phase 4+ recipient-edit-grant (D1), the `capabilities` column defaults to `array['view']`, preserving existing behavior.

## Data retention

Governed by existing policies. Phase 1 adds no new retention rules. Publisher's activity feed reads recent N events (paginated); historical data remains in the audit tables indefinitely per existing policy.

## Deletion behavior

| Operation | Behavior |
|---|---|
| Manager revokes publication | UPDATE status='revoked'. Row retained for audit. Recipients see revoked state. |
| Manager hard-deletes publication (future, Phase 5+) |CASCADE removes recipients, comments, responses, events. Audit rows retained via separate audit table. NOT in this plan. |
| User deletes account | Existing DSAR flow (see `Launch-Readiness-Audit/DSAR-Account-Deletion-Data-Export/`). Publisher is unaffected. |
| Project deleted | Cascade per `20260616180000_*`. Audit warning emitted. |

## API contracts

### Phase 1 — NO new HTTP API

Publisher invokes server actions directly. No `/api/*` route added.

### Server action surface (existing, consumed by Publisher)

| Action | File | RBAC gate |
|---|---|---|
| `createProjectPublication` | `src/lib/publication/actions.ts` | `assertProjectPublicationManager` |
| `republishProjectPublication` | same | same |
| `rotateProjectPublicationLink` | same | same |
| `revokeProjectPublication` | same | same |
| `refreshProjectPublicationSummary` | same | same |
| `listSharedLinkRecipients` | same | same |
| `addSharedLinkRecipients` | same | same |
| `removeSharedLinkRecipient` | same | same |
| `resendSharedLinkRecipientEmail` | same | same |
| `loadSharedLinkActivity` | same | same |
| `setEstimateSheetAccessMode` | `src/lib/collaboration/actions.ts` | rank ≥ 30 (admin) |
| `inviteProjectCollaborator` / `inviteEstimateSheetCollaborator` | same | same |
| `updateProjectCollaboratorRole` / `removeProjectCollaborator` | same | same |
| `copyProjectInviteLink` / `resendProjectInviteEmail` | same | same |

### Existing receiver-side HTTP API (untouched)

| Endpoint | Method | Rate limit |
|---|---|---|
| `/api/share/[token]/password` | POST | 5 attempts / 15 min lockout |
| `/api/share/[token]/session` | POST | standard |
| `/api/share/[token]/activity` | GET | standard |
| `/api/share/[token]/comment` | POST | 5/min, 20/hr |
| `/api/share/[token]/decision` | POST | standard |
| `/api/share/[token]/events` | GET (SSE) | standard |
| `/api/share/[token]/unsubscribe` | GET | standard |
| `/api/share/[token]` | GET | standard |

## Versioning

- Database schema: dated migration files, forward-only, additive preferred.
- API: no `/api/*` added in Phase 1; future additions follow existing `/api/v*/` pattern (none currently).
- Server action signatures: stable; any change is additive (optional params).

## Pagination

- Roster: 50 publications per page (client-side; full list is typically < 50).
- Drawer recipients: 100 recipients per publication (sufficient for MVP; paginate if exceeded).
- Activity feed: 50 events per page, cursor-based using existing `parseSharedLinkActivityCursor` / `encodeSharedLinkActivityCursor` helpers.

## Retries / timeouts / cancellation

- Supabase client default timeout: 10s.
- Server actions: no explicit timeout (Next.js default).
- Drawer lazy load: 30s timeout, then error boundary.
- Client mutations: no auto-retry (user-driven Retry button).
- Read queries: 1 silent retry on transient failure.

## Network latency assumptions

- Same-region (Vercel → Supabase AWS Singapore): p95 < 80ms per query.
- Roster (4 queries in parallel): p95 < 200ms.
- Drawer (3 queries in parallel): p95 < 150ms.
- Activity feed (5 queries unioned): p95 < 300ms.

These are planning targets; Phase 1 implementation measures actuals.

## Third-party failure behavior

| Failure | Behavior |
|---|---|
| Supabase unavailable | Roster renders `WorkshopRouteErrorState`; mutations surface Retry toast. |
| Resend unavailable | Recipient add still succeeds; digest email queued (existing graceful fallback). |
| Vercel deploy in progress | Standard Next.js error boundary. |

## Backward compatibility

Phase 1 is **fully backward-compatible**:
- Existing `/share/[token]` receiver routes unchanged.
- Existing `ProjectPublicationHeader` + `ProjectTeamspaceHeader` modals unchanged.
- Existing `/workshop/projects/[projectId]` page unchanged.
- Existing `/api/share/[token]/*` endpoints unchanged.

## Webhooks / event delivery

Existing Resend webhook at `/api/webhooks/resend` (delivery confirmation). Publisher does not add webhooks.

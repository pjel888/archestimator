# 07 — Data, Database, API, and Network Plan

## Standing database authority

- Per `AGENTS.md`, the standing DB mandate applies to Archestimator Supabase project `ebxxqidacheyapmmzavr` only.
- **This plan requires one scoped migration for v1:** a security-definer RPC that exposes only authorized, display-safe `collaboration_audit_events` rows. Direct table reads remain denied.
- No denormalized activity table, broad schema redesign, or unrelated provider mutation is authorized.

## Source tables (read-only for v1)

### `estimate_sheet_events`
- Migrations: `20260524132800_estimate_node_activity_history.sql`, `20260528220000_project_shared_link_overhaul.sql`, `20260619105250_project_dashboard_activity_location.sql`.
- Columns used: `id`, `workspace_id`, `project_id`, `estimate_id`, `estimate_node_id`, `estimate_tab_id`, `target_row_id`, `event_type`, `event_source`, `actor_user_id`, `changed_fields`, `old_snapshot`, `new_snapshot`, `payload`, `row_context`, `total_delta`, `correlation_id`, `created_at`.
- Project scoping: `project_id` (NOT NULL since `20260619105250`).
- Index: `estimate_sheet_events_project_created_idx` on `(project_id, created_at desc, id desc)`.
- RLS: `can_access_estimate(estimate_id)`.
- Notes: dormant event types `sheet_version_created`, `sheet_restored_as_copy` are excluded by default to match existing dashboard preview behavior. v1 keeps this exclusion by ODD-10.

### `project_publications`
- Migrations: `20260527120000_project_client_publication.sql`, `20260528220000_project_shared_link_overhaul.sql`, `20260620064601_project_publication_activity_target_labels.sql`, `20260621133000_shared_link_atomic_publish_and_digest_slot.sql`.
- Columns used: `id`, `workspace_id`, `project_id`, `status`, `snapshot_version`, `published_at`, `activity_target_labels_json`.
- Project scoping: `project_id`.
- Use: (a) published-publication feed entries (the "shared" action), (b) join key for comments/responses/events back to project, (c) `activity_target_labels_json` for estimate-scope membership check.

### `shared_link_comments`
- Migrations: `20260528220000_project_shared_link_overhaul.sql`, `20260621042221_shared_link_event_context.sql`.
- Columns used: `id`, `publication_id`, `recipient_id`, `author_email`, `author_name`, `body`, `is_internal`, `estimate_id`, `row_id`, `target_kind`, `target_label`, `target_secondary_label`, `snapshot_version_at_comment`, `created_at`.
- Project scoping: indirect via `publication_id → project_publications.project_id`.
- Notes: PII — `author_email` is NOT displayed on the activity page. Use `shared_link_recipients.display_name` for actor label.

### `shared_link_responses`
- Migrations: `20260528220000_project_shared_link_overhaul.sql`, `20260621042221_shared_link_event_context.sql`.
- Columns used: `id`, `publication_id`, `recipient_id`, `decision`, `note`, `signer_name`, `estimate_id`, `row_id`, `target_kind`, `target_label`, `target_secondary_label`, `snapshot_version_at_decision`, `created_at`.
- Project scoping: indirect via `publication_id`.

### `shared_link_events`
- Migrations: `20260528220000_project_shared_link_overhaul.sql`, `20260601011500_resend_shared_link_delivery_webhooks.sql`, `20260621042221_shared_link_event_context.sql`.
- Columns used: `id`, `publication_id`, `recipient_id`, `event_type`, `metadata_json`, `created_at`.
- Project scoping: indirect via `publication_id`.
- Typical event types: `publication_opened`, `publication_viewed`, `recipient_unsubscribed`, `delivery_succeeded`, `delivery_failed`, etc.

### `collaboration_audit_events`
- Migrations: `20260527115342_project_invite_entry_tokens.sql` creates table/indexes; `20260614152946_explicit_internal_table_deny_policies.sql` revokes direct table access and adds a restrictive deny policy.
- Columns used: `id`, `project_id`, `estimate_id`, `actor_user_id`, `event_type`, `metadata`, `created_at`.
- Project scoping: `project_id`.
- Access path: **not** direct `.from("collaboration_audit_events")`; use new `read_project_collaboration_audit_events(...)` RPC with `can_edit_project(target_project_id)` authorization.

### `shared_link_recipients` (label resolution)
- Columns used: `id`, `publication_id`, `email`, `display_name`.
- Use: resolve recipient display name; populate the client filter dropdown.

### `profiles` (actor label resolution)
- Columns used: `id`, `display_name`, `email`.
- Use: resolve internal-user actor labels.

### `estimates` (scope dropdown)
- Columns used: `id`, `project_id`, `name`, `sheet_code`.
- Use: populate the scope dropdown.

## Required migration contract for v1

| Step | Required? | Reason |
|---|---|---|
| Add `estimate_sheet_events.project_id` | **Already exists** | Migration `20260619105250` |
| Add `estimate_sheet_events_project_created_idx` | **Already exists** | Same migration |
| Add `shared_link_comments.target_kind/label` | **Already exists** | Migration `20260621042221` |
| Add `shared_link_responses.estimate_id/row_id/target_*` | **Already exists** | Same migration |
| Add `project_publications.activity_target_labels_json` | **Already exists** | Migration `20260620064601` |
| Add `collaboration_audit_events.project_id` | **Already exists** | Migration `20260601023000` |
| Add `read_project_collaboration_audit_events(...)` RPC | **Required** | Direct table access is revoked and denied |
| Update generated Supabase types | **Required if RPC migration lands** | Type-safe repository call |
| Add `collaboration_audit_events(project_id, created_at desc, id desc)` | **Conditional** | Add only if `EXPLAIN` shows existing `(project_id, created_at desc)` index is insufficient for cursor order/filter |

**Conclusion:** v1 writes a narrow RPC migration and generated types only. DATA-01 acceptance is satisfied by the RPC keeping direct table access denied and proving authorized/unauthorized behavior, not by absence of migration files.

## RLS coverage (last line of defense)

| Table | RLS policy | Verified by |
|---|---|---|
| `estimate_sheet_events` | `can_access_estimate(estimate_id)` for SELECT | Repository test + manual `EXPLAIN` |
| `project_publications` | existing publication RLS | Repository test |
| `shared_link_comments` | existing recipient/publication RLS | Repository test |
| `shared_link_responses` | existing recipient/publication RLS | Repository test |
| `shared_link_events` | existing publication RLS | Repository test |
| `collaboration_audit_events` | direct table grants revoked + restrictive deny policy; scoped security-definer RPC authorizes with `can_edit_project(target_project_id)` | Migration test + local/provider RPC denial proof |
| `shared_link_recipients` | existing publication RLS | Repository test |
| `profiles` | existing authenticated RLS | (existing) |
| `estimates` | existing project RLS | (existing) |

## Index usage plan

| Query | Index used |
|---|---|
| `estimate_sheet_events` by project_id, created_at desc, id desc | `estimate_sheet_events_project_created_idx` |
| `shared_link_comments` by publication_id, created_at desc | existing index |
| `shared_link_responses` by publication_id, created_at desc | existing index |
| `shared_link_events` by publication_id, created_at desc | existing index |
| `collaboration_audit_events` by project_id, created_at desc, id desc | RPC query uses existing `collaboration_audit_events_project_idx`; add narrower 3-column index only if `EXPLAIN` requires |
| `project_publications` by workspace_id, project_id, published_at desc | existing index |
| `shared_link_recipients` by id (bulk IN) | PK |

If `collaboration_audit_events` needs `(project_id, created_at desc, id desc)` for stable cursor order, include that index in the same RPC migration or a follow-up migration with EXPLAIN evidence.

## Cardinality assumptions

| Source | Current rows | 10× | 100× | 1000× |
|---|---|---|---|---|
| `estimate_sheet_events` per project | ~100 | ~1,000 | ~10,000 | ~100,000 |
| `shared_link_comments` per project | ~10 | ~100 | ~1,000 | ~10,000 |
| `shared_link_responses` per project | ~5 | ~50 | ~500 | ~5,000 |
| `shared_link_events` per project | ~50 | ~500 | ~5,000 | ~50,000 |
| `collaboration_audit_events` per project | ~10 | ~100 | ~1,000 | ~10,000 |
| `project_publications` per project | ~3 | ~30 | ~300 | ~3,000 |

At 1000× the largest source is ~100K rows; with the existing index and a `LIMIT 50+1`, the query plan is still index-only. v1 does not require partitioning or materialized views.

## Query count per route render

| Step | Queries | Notes |
|---|---|---|
| Ownership + permission | 2 | `getCurrentWorkspaceProject`, `can_edit_project` RPC |
| Multi-source fan-out | 5 | `Promise.all` over estimate/publication/comment/response/shared-event plus collab RPC |
| Publication lookup | 1 | Required to map `publication_id → project_id` for shared-link sources |
| Actor labels bulk | 1 | `profiles.in(...)`, skipped if no actor_user_ids |
| Recipient labels bulk | 1 | `shared_link_recipients.in(...)`, skipped if no recipient_ids |
| Estimate dropdown | 1 | `estimates where project_id = ...` |
| Project members dropdown | 1 | `project_members where project_id = ...` join `profiles` |
| Recipient dropdown | 1 | `shared_link_recipients` via publications on this project |
| Count metadata | up to 6 | Exact `filteredTotalCount` / `scopeTotalCount` per source; use RPC window/count output for collaboration audit |
| **Total per render** | **~13 data queries + up to 6 count queries** | Acceptable at closed-beta scale; performance evaluator must confirm |

## Database blueprint (DATA-01: scoped RPC migration)

The implementation migration should follow this shape:

```sql
create or replace function public.read_project_collaboration_audit_events(
  target_project_id uuid,
  target_estimate_id uuid default null,
  page_limit integer default 51,
  cursor_created_at timestamptz default null,
  cursor_id uuid default null
)
returns table (
  id uuid,
  project_id uuid,
  estimate_id uuid,
  actor_user_id uuid,
  event_type text,
  metadata jsonb,
  created_at timestamptz,
  filtered_total_count bigint
)
language sql
security definer
set search_path = public
stable
as $$
  with base as (
    select
      cae.id,
      cae.project_id,
      cae.estimate_id,
      cae.actor_user_id,
      cae.event_type,
      cae.metadata,
      cae.created_at
    from public.collaboration_audit_events cae
    where public.can_edit_project(target_project_id)
      and cae.project_id = target_project_id
      and (target_estimate_id is null or cae.estimate_id = target_estimate_id)
  ),
  page as (
    select *
    from base
    where (
      cursor_created_at is null
      or (created_at, id) < (cursor_created_at, cursor_id)
    )
    order by created_at desc, id desc
    limit least(greatest(page_limit, 1), 51)
  )
  select
    page.id,
    page.project_id,
    page.estimate_id,
    page.actor_user_id,
    page.event_type,
    page.metadata,
    page.created_at,
    (select count(*) from base) as filtered_total_count
  from page;
$$;

revoke all on function public.read_project_collaboration_audit_events(uuid, uuid, integer, timestamptz, uuid) from public, anon;
grant execute on function public.read_project_collaboration_audit_events(uuid, uuid, integer, timestamptz, uuid) to authenticated;

-- Include only if EXPLAIN shows the existing index is not enough for the cursor order.
create index if not exists collaboration_audit_events_project_created_idx
  on public.collaboration_audit_events(project_id, created_at desc, id desc);
```

Rollback/fix-forward:

```sql
revoke all on function public.read_project_collaboration_audit_events(uuid, uuid, integer, timestamptz, uuid) from public, anon, authenticated;
drop function if exists public.read_project_collaboration_audit_events(uuid, uuid, integer, timestamptz, uuid);
drop index if exists public.collaboration_audit_events_project_created_idx;
```

## API / network plan

- One authenticated read-only GET Route Handler for cursor pagination only (per API-01).
- **No new Server Action** for v1 (read-only page).
- Filter/scope changes go through RSC navigation (`router.replace`) which triggers a server-side re-render.
- Pagination uses the authenticated loader so the cursor stays out of the shareable URL.

## Pagination contract

- Limit clamp: max 50 per page (mirrors `PUBLISHER_ACTIVITY_LIMIT`).
- Cursor: opaque string encoding `(created_at, id)` per source.
- "Load more" appends through the authenticated loader; filter/scope changes reset the list.
- Shareable URLs include filters and scope only, not cursor.

## Count contract

The repository and route props must include:

| Field | Meaning | Required for |
|---|---|---|
| `counts.loadedCount` | Number of items in the current response page | Loader/result bookkeeping |
| `counts.filteredTotalCount` | Exact total after current scope + action/actor/client filters | "Showing X of Y" |
| `counts.scopeTotalCount` | Exact total for current scope before action/actor/client filters | Distinguish "no activity yet" from "no matches" |

Exact counts may be gathered with source-level `count: "exact"` calls or equivalent SQL/RPC count output. If a count source fails, mark `partial=true`, include the source in `unavailableSources`, and render partial-data copy rather than a misleading exact count.

## Data verification plan

- Repository unit tests assert: scope filtering, action filtering, actor filtering, recipient filtering, cursor stability, count semantics, partial-source resilience.
- Migration/schema tests assert direct table access remains revoked/denied and the RPC grant exists only for `authenticated`.
- Local or provider SQL proof verifies authorized RPC call succeeds and unauthorized/direct table read fails. Artifact path recorded in `19_RESEARCH_REVIEW_AND_QA_EVIDENCE.md`.
- A manual `EXPLAIN (ANALYZE)` once during implementation verifies index usage on the primary path.

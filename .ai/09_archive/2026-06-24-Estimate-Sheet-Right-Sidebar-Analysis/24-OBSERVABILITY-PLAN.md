# 24 — Observability Plan

> Closes the audit-prompt gap: "Logging, monitoring, tracing, and alerting."
> Builds on the existing telemetry allow-list (`recordLibraryEvent` in `library-telemetry.ts`) and adds the events, metrics, and alerts needed to verify Phase 1's persistence-honesty fixes work in production.

## Current state (from [15-SECURITY-AND-INTEGRITY-AUDIT.md](./15-SECURITY-AND-INTEGRITY-AUDIT.md))

- `recordLibraryEvent` is the only structured event emitter for the sidebar.
- The allow-list sanitizes free-text, strips URLs/paths/filenames, caps strings at 120 chars.
- Events land in the `library_telemetry_events` table (or equivalent; verify in `supabase/migrations/`).
- No alerting wired.
- No dashboard for sidebar behavior.

## Phase 1 new events

All events follow the existing `recordLibraryEvent` contract: structured payload, allow-list keys only, no PII.

| Event name | Trigger | Keys | Purpose |
|---|---|---|---|
| `sidebar_persistence_honesty_v1_archive_invoked` | User clicks Delete (single or bulk) | `count`, `view_mode`, `source` ("context_menu" / "preview" / "bulk") | Count of archive attempts |
| `sidebar_persistence_honesty_v1_archive_succeeded` | `executeBulkArchiveLibraryComponents` resolves success | `count`, `duration_ms` | Success rate + latency |
| `sidebar_persistence_honesty_v1_archive_failed` | RPC rejects or throws | `count`, `error_code`, `duration_ms` | Failure-mode classification |
| `sidebar_persistence_honesty_v1_restore_invoked` | User clicks Restore on toast | `count` | Undo usage |
| `sidebar_persistence_honesty_v1_restore_succeeded` | Restore RPC resolves | `count`, `duration_ms` | Restore success rate |
| `sidebar_persistence_honesty_v1_edit_via_modal_opened` | Edit opens AddComponentModal | `has_variants`, `has_attachments` | Field-preservation coverage |
| `sidebar_persistence_honesty_v1_edit_via_modal_saved` | `updateCostLibraryComponent` resolves | `duration_ms` | Edit persistence latency |
| `sidebar_persistence_honesty_v1_edit_via_modal_failed` | RPC rejects | `error_code`, `duration_ms` | Failure rate |
| `sidebar_persistence_honesty_v1_duplicate_via_modal_opened` | Duplicate opens modal | `source` | Usage of duplicate path |
| `sidebar_persistence_honesty_v1_duplicate_via_modal_saved` | `createCostLibraryComponent` resolves for duplicate | `duration_ms` | Duplicate persistence latency |
| `sidebar_persistence_honesty_v1_search_request` | Search effect fires `searchReusableProjectSources` | `query_length_bucket` (not raw query — privacy) | Search volume |
| `sidebar_persistence_honesty_v1_search_response_applied` | Response passes the request-id guard | `result_count_bucket`, `duration_ms` | Fresh-response rate |
| `sidebar_persistence_honesty_v1_search_response_dropped` | Response rejected by guard | `age_ms` | Race-condition frequency (proves the fix works) |
| `sidebar_persistence_honesty_v1_template_group_affordance_removed` | Mount under V1 flag (confirms button is gone) | — | Deployment verification |

Buckets (avoid free-text): `query_length_bucket ∈ {0-2, 3-5, 6-10, 11-20, 20+}`; `result_count_bucket ∈ {0, 1-5, 6-20, 21-50, 50+}`; `duration_ms` is integer milliseconds.

## Metrics

Computed from the events above via SQL views or Vercel analytics.

| Metric | Definition | Source events | Alert threshold |
|---|---|---|---|
| `archive_failure_rate` | `archive_failed / (archive_succeeded + archive_failed)` over 5-min window | archive_* | > 5% for 10 min |
| `archive_p95_latency_ms` | p95 of `duration_ms` from `archive_succeeded` over 1h | archive_succeeded | > 2000ms |
| `edit_via_modal_failure_rate` | `edit_via_modal_failed / (saved + failed)` | edit_* | > 5% for 10 min |
| `search_drop_rate` | `search_response_dropped / (applied + dropped)` | search_* | > 20% sustained (would indicate user is typing faster than server; not necessarily a bug) |
| `restore_success_rate` | `restore_succeeded / restore_invoked` | restore_* | < 90% for 1h |
| `persistence_honesty_adoption` | distinct workspaces with ≥1 `archive_invoked` event since deploy | archive_invoked | not alerted; reviewed weekly |

## Alerts

Wired in Vercel / Supabase / whatever monitoring is on the production deploy. If no alerting infra exists at launch, defer to manual dashboard review during the 48-hour hold period.

| Alert | Trigger | Severity | Action |
|---|---|---|---|
| Archive RPC failing | `archive_failure_rate > 5%` for 10 min | Page Eng | Diagnose; consider flag flip |
| Edit modal failing | `edit_via_modal_failure_rate > 5%` | Page Eng | Diagnose; consider flag flip |
| Restore failing | `restore_success_rate < 90%` | Warn Eng | Diagnose; user-visible impact (Undo broken) |
| Telemetry pipeline lag | No `*_invoked` events for >24h while session traffic is normal | Warn Eng | Diagnose telemetry ingestion |

## Dashboards

Single dashboard: **Sidebar Persistence Honesty v1**.

Panels:
1. Archive success rate (line chart, 7d)
2. Edit success rate (line chart, 7d)
3. Restore success rate (line chart, 7d)
4. Search drop rate (line chart, 7d — proves the race fix is active)
5. Event volume by type (stacked bar, 24h)
6. P95 latency: archive, edit, duplicate, restore (4-stat panel)
7. Adoption: distinct workspaces with persistence-honesty events (counter)

Owner: Eng builds; Philip has read access.

## Logging

Server-action logs already log to the existing logger with `throwActionError` wrapping. No new server logging needed for Phase 1.

Client-side: keep error logs at `console.error` for development; do not ship a client-side log forwarder in Phase 1 (defer to a separate observability initiative if needed).

## Tracing

Phase 1 does not introduce distributed tracing. The RPC calls (`executeBulkArchiveLibraryComponents`, `updateCostLibraryComponent`, `createCostLibraryComponent`) are single-hop Supabase RPCs; correlation id (`correlation_id` for project-source insert) and duration metrics suffice.

If end-to-end tracing becomes a goal, add OpenTelemetry spans at the server-action boundary in a separate initiative.

## Data retention

Telemetry events follow the existing `library_telemetry_events` retention policy. If no policy exists, default to 90 days rolling, aggregated monthly beyond that. No PII in events by design (allow-list enforced).

## Privacy review

- No raw search queries logged (only length buckets).
- No component names, supplier names, or user-entered fields in events.
- The `recordLibraryEvent` allow-list already strips URL/path/filename patterns.
- Workspace and user ids are stored (necessary for adoption metrics); both are internal ids, not PII.

## Out of scope

- Real-user-monitoring (RUM) for client-side latency — separate initiative.
- Session replay — privacy-sensitive, not pursued.
- Synthetic monitoring — defer until production traffic exists.

## Open dependencies

- Verify `library_telemetry_events` table exists and has the expected schema (migration check). If it does not, create a migration as part of Phase 1 — but only if events cannot be stored any other way. **Philip grants standing authorization for this kind of scoped schema addition** under the AGENTS.md database mandate.
- Alerting infra: if Vercel/Supabase has no alerting at launch, document the dashboard URL and review cadence in the rollout runbook.

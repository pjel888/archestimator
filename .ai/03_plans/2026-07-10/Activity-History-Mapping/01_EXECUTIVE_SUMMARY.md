# 01 - Executive Summary

## Verdict

Activity history is a **substantially built, production-grade feature** with mature data infrastructure, a polished presentation layer, and hardened shared-link/client-collaboration surfaces. However, it has **one critical systematic defect** (the event-type naming split) that silently breaks filtering and human-readable copy rendering for the majority of estimate mutation events, plus several moderate gaps in restore functionality, test coverage, and shared-link interaction completeness.

The feature is **not currently MVP-ready** because of the naming split: most events that users create by editing estimates will appear as generic "recorded estimate activity" and cannot be filtered. This is invisible to a developer who doesn't cross-reference write and read paths, but immediately visible to any user who filters the activity panel by "Node created" or "Tab created" and gets an empty list.

## Current Strengths

1. **Rich append-only event log.** `estimate_sheet_events` (`migrations/0025:8-51`) stores 19 columns including `changed_fields`, `old_snapshot`, `new_snapshot`, `payload`, `row_context`, `total_delta`, and a unique `correlation_id` for idempotency. Four purpose-built indexes serve project/workspace/estimate-scoped reads.

2. **Multi-source unified feed.** The project activity page (`project-activity-feed-repository.ts:1091`) merges six distinct source tables (estimate events, publications, shared-link comments, shared-link responses, shared-link events, collaboration audit events) into a single timeline with filtered/unfiltered counts, cursor pagination, and graceful per-source degradation.

3. **Complete presentation layer.** `src/lib/activity/` provides a polished, XSS-safe view-model composition system (`activity-composer.ts:543` lines) with human-readable titles, summaries, audit-fact diffs, and audience-aware visibility (internal vs client).

4. **Hardened shared-link system.** Token-based (not Better Auth) guest access with HMAC-hashed tokens, AES-GCM encrypted storage, scrypt password hashing, per-credential-version cookie invalidation, CSRF double-submit, rate limiting, snapshot-version optimistic locking (409 on stale), and owner digest emails.

5. **Working restore from history.** Both row restore (`restoreDeletedRowsMutation`) and node restore (`restoreDeletedEstimateNodes` via direct callback in `EstimateSheetContent`) are fully wired from button → handler → server action → D1, with old_snapshot reconstruction and collision guards.

6. **Comprehensive idempotency.** `prepareHistoryEventInsert` (`d1-action-client.ts:437-505`) uses a unique index on `(estimate_id, correlation_id)` to make history writes replay-safe. A proof router (`estimate-history-proof-router.ts`) exercises idempotency, cross-workspace denial, and transaction rollback.

7. **Strong test coverage for core paths.** `fetchEstimateSheetVersionControl` (cursor, filters, dormant filtering, actor enrichment), `readProjectActivityFeed` (pagination, counts, degradation), activity composer (security, copy regression), shared-link comment posting (CSRF, rate limiting, sanitization, snapshot lock), and shared-link decisions (409 duplicate, rate limiting).

## Critical Gaps

### P0 — Event-type naming split (CRITICAL)

The D1 write layer emits `estimate_`-prefixed event types; the UI read/display layer expects non-prefixed names. The read path does no translation. Result: **23 of ~31 writable event types are invisible to filters and render as generic fallback copy.** Tab events, node events, row-insert events, bulk-delete events, template events, and sheet-adjustment events are all affected. See `04_EVENT_TAXONOMY_AND_NAMING_AUDIT.md`.

### P0 — Bulk row delete is unrestorable

The UI restore guard (`RESTORABLE_ROW_DELETE_EVENT_TYPES = {"row_deleted", "rows_bulk_deleted"}`) includes `rows_bulk_deleted`, but the writer emits `rows_deleted`. Bulk-deleted rows can never show a Restore button. Additionally, `restore_deleted_estimate_rows_with_history` is a hard-coded throw (`d1-action-client.ts:2404-2406`) — row restore from D1 snapshots is unimplemented, though the UI exposes row Undo.

### P1 — D1 row restore unimplemented

`restore_deleted_estimate_rows_with_history` throws immediately. The UI's `restoreDeletedRowsMutation` (`use-estimate-row-mutations.ts:1044`) works through a different path (likely optimistic/in-memory restore), but the D1-backed restore from `old_snapshot` is not available. Node restore works; row restore does not.

### P1 — Shared-link interaction gaps

- **No owner reply to client comments on the public surface** — `is_internal`/`author_type` fields exist but no route/action lets a manager post an inline reply visible on `/share/[token]`.
- **No comment edit/delete** — comments are insert-only for both clients and owners.
- **No decision retraction** — the `(recipient_id, publication_id)` unique index makes a decision final with no owner-side reset.
- **`signature_intent_hash` is scaffolded but never computed** — the schema stores it, but no submit path populates it.
- **No real-time update on the share page** — clients must reload to see new comments or owner updates.
- **`download_attempt_blocked` event type is defined but never emitted** — reserved for a future client download feature.

### P1 — Test coverage gaps

- No integration test for the **activity-history node-restore button → handler → tree-swap** path (the handler `restoreDeletedNodesFromHistory` at `EstimateSheetContent.tsx:1855` has no test).
- No tests for D1 `restoreDeletedEstimateNodes` error branches (collision, empty snapshot, wrong event type, batch oversize).
- No test for read-only user gating of restore buttons.
- No e2e coverage for the workshop activity panel at all.
- The duplicate-decision race test is skipped.

### P2 — Dual parallel repositories

`project-activity-repository.ts` (simple dashboard feed) and `project-activity-feed-repository.ts` (full multi-source feed) are two parallel implementations of "project activity" with different features, filters, and event-type handling. This is tech debt that should be consolidated.

### P2 — Legacy Supabase read path still wired

`fetchEstimateSheetVersionControl` (`actions.ts:2029`) uses a PostgREST-style `dataStore.from("estimate_sheet_events")` client and is still imported by the UI component `activity-history.tsx`. Whether both paths point at the same physical store depends on the `dataStore` binding and should be verified.

### P2 — AI package-builder event-type variant spellings

`src/lib/ai/package-builder/apply.ts` emits `estimate_row_inserted`, `estimate_row_updated`, `estimate_row_deleted`, `estimate_template_inserted` — variant spellings that don't match either the `estimate_`-prefixed D1 names or the non-prefixed UI names. These events will render as generic activity.

## Recommended Priorities

**P0 (must fix for MVP):**
- Fix the event-type naming split so all estimate mutations are filterable and render readable copy. (`UNIT-001`)
- Fix bulk-delete event type + restore guard mismatch. (`UNIT-002`)
- Verify and align AI package-builder event-type spellings. (`UNIT-003`)

**P1 (should fix for MVP):**
- Implement or remove the D1 row-restore stub. (`UNIT-002`)
- Standardize idempotency and INSERT-shape across all write paths. (`UNIT-004`)
- Fill critical test gaps for restore paths and error branches. (`UNIT-005`)
- Add missing composer/filter entries for `estimate_nodes_restored`, `row_component_moved`, `rows_moved`, `sheet_adjustment_updated`. (`UNIT-006`)

**P2 (post-MVP improvement):**
- Owner reply to client comments on shared links. (`UNIT-007`)
- Comment edit/delete and decision retraction. (`UNIT-007`)
- Compute `signature_intent_hash` on decision submit. (`UNIT-007`)
- Consolidate dual project-activity repositories. (`UNIT-006`)
- Remove or wire the unused `Timeline` UI primitive. (`UNIT-006`)
- Remove the stub `AdminAuditTable`. (`UNIT-006`)

## Readiness

**Package status:** `NOT_READY` — the audit is complete and the naming split is verified at source level, but units are `PLANNED` (not yet `READY`). The implementation DAG is defined and executable from `UNIT-001` once the first unit is promoted to `READY`.

**Implementation status:** `NOT_STARTED` — no application source has been changed by this planning run.

**Release status:** `NOT_EVALUATED` — hosted/provider proof for shared-link activity changes is runtime evidence produced by `UNIT-008`, not a plan-readiness cap.

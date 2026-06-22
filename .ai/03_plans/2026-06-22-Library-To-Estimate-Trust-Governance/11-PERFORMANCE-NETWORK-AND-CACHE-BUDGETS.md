# Performance, Network, And Cache Budgets

This file turns performance concerns into measurable budgets. The goal is fast
Estimate Sheet reuse without cache bleed, duplicate network work, or unbounded
render/file-transfer costs.

## Product Budgets

| Area | Budget | Evidence |
| --- | --- | --- |
| Warm sidebar tab switch | <= 300 ms to usable content after cached data exists. | DOM/perf test or browser trace if UI timing is claimed. |
| Sidebar filter/search | <= 100 ms p95 for 5,000 Library items in jsdom/unit harness. | Large fixture test. |
| Mounted row cards | <= 150 visible/mounted row cards per source tab unless virtualization/windowing is present. | DOM assertion or render-count test. |
| Compare dialog open | <= 100 ms from action to dialog content with warm source data. | DOM timing test or browser trace. |
| Mutation retry UI | Visible failed/retry state within one render after error. | DOM test. |
| Attachment signed URL metadata | <= 500 ms p95 for metadata/download-link fetch in local/provider-adjacent test when that path is implemented. | Provider/browser proof only if actual provider call is tested. |
| Attachment list payload | <= 50 KB metadata payload for 100 attachments; no binary eager-load in list/compare. | Unit fixture or network proof. |
| Upload concurrency | Max 3 concurrent client uploads. | DOM/unit test or upload helper test. |

Budgets may be adjusted only with a new measured baseline recorded in this pack's
evidence folder.

## Lite Dataset Contract

The Estimate Sheet sidebar uses the lite dataset. It may include:

- IDs needed to insert/replace.
- Display name and unit.
- Unit cost summary.
- Pricing date and freshness tier.
- Lifecycle state.
- Safe source label or source-present boolean.
- Accepted-cost status enum.
- Thumbnail pointer already safe for the authorized private UI.
- Counts for attachments or warnings.

The lite dataset must not include:

- Full version history.
- Full attachment graph or binary data.
- Raw storage paths.
- Raw source URL in broad list rows.
- Confidence prose in broad list rows.
- Public/proposal projection data.
- Cross-workspace/project records.

## Large Fixture Contract

Performance tests for this plan use a named large fixture with at least:

| Entity | Count |
| --- | ---: |
| Library components | 5,000 |
| Templates | 500 |
| Project sources | 500 |
| Suppliers/brands/folders | 1,000 combined |
| Estimate rows | 1,000 |
| Attachment metadata rows | 100 |

The fixture can be generated in test code; it does not need provider seed data
unless the evidence row explicitly claims provider performance.

## Cache Invalidation Matrix

| Mutation | Query key or prefix | Exact or prefix | Refetch type | Visible requirement |
| --- | --- | --- | --- | --- |
| Insert Library item into estimate | Estimate rows/tree query plus source row status if needed. | Exact estimate keys. | Active when row must appear immediately. | Estimate shows saved/failed state; Library cache not broadly refetched. |
| Replace row from Library | Estimate rows/tree query; source snapshot/link state. | Exact estimate keys. | Active for current estimate. | Row reflects replacement or rollback. |
| Sidebar Library item mutation | `workspaceComponentLibraryQueryKey(workspaceId)` scoped prefix. | Prefix within workspace. | Prefer stale-only/none unless visible data must refresh now. | No cross-workspace invalidation. |
| Lite sidebar source mutation | `workspaceComponentLibraryLiteQueryKey(workspaceId, projectId)`. | Exact or scoped project prefix. | Active when current sidebar must update. | Current sidebar warnings update without loading full graph. |
| Project source mutation | Rows management/project source key. | Scoped by workspace/project. | Active for current project. | Project tab reflects source change. |
| Template insert/source update | `workspaceEstimateTemplatesQueryKey({ userId, workspaceId })`. | Exact user/workspace. | Active only for template surface. | Template tab remains scoped. |
| Cost accept/reject/supersede | Full Library detail key plus lite warning/cost summary key. | Scoped workspace/project. | Active for visible item; stale-only for hidden lists. | Accepted-cost label updates where visible. |
| Attachment approve/supersede/delete draft | Full Library detail key plus attachment metadata query if separate. | Exact item/variant when available. | Active for visible item. | Current approved attachment updates without binary eager-load. |
| Telemetry-only event | None. | None. | None. | No cache churn. |

Consumers must use key factory helpers. Direct ad hoc arrays are not allowed.

## Mutation Reliability Contract

| Failure mode | Required behavior |
| --- | --- |
| Network timeout | Show failed state and retry action; retry revalidates source and target. |
| 429/rate limit | Back off with jitter if automatic retry is used; otherwise show manual retry. |
| 500/server error | Roll back optimistic UI or keep draft with explicit failed state. |
| Stale row revision | Reject replace; show refetch/compare again. |
| Source archived after load | Block or require explicit non-fresh decision; no silent fresh snapshot. |
| Workspace switch during mutation | Cancel/ignore stale response if workspace no longer matches. |
| Duplicate submit | Use client pending guard and server idempotency/row revision where available; no double insert. |
| Partial attachment upload failure | Keep successful drafts visible, failed files retryable, and cleanup only owned draft paths. |

If an operation can run twice due to retry or mobile resume, it needs either an
operation ID/idempotency key, a row revision guard, or a deterministic duplicate
prevention rule.

## Network Adversity Matrix

| Scenario | Expected result | Evidence |
| --- | --- | --- |
| Offline before submit | Action disabled or fails with visible offline/failed copy; no local false-saved state. | QA-011 |
| Timeout after optimistic insert | UI reconciles saved vs failed from server result; retry uses same intended target after revalidation. | QA-011 |
| 429 on source refresh | Backoff/manual retry; no repeated tight loop. | PERF-006 |
| 500 on replace | Previous row restored and conflict/refetch path shown. | QA-002 |
| Stale revision | Replace rejects and compare can be reopened with fresh row data. | QA-002 |
| Workspace switch | Prior workspace data is cleared and mutation response is ignored/rejected. | QA-005 |
| Upload interrupted | File row shows failed/retry; persisted approved files unaffected. | QA-010 |
| Partial success | Successful operations are recorded; failed operations retain explicit retry state. | QA-011 |

## Attachment Transfer Budgets

| Area | Budget/rule |
| --- | --- |
| File size | Preserve current 20 MB max unless owner explicitly changes it. |
| MIME validation | Magic-MIME validation remains required. |
| List/compare | Metadata only; no binary eager-load. |
| Concurrent uploads | Max 3 client-side. |
| Progress | Show progress/cancel if upload exceeds 2 seconds. |
| Memory | Server route must not buffer unbounded multi-file batches; one uploaded file respects the existing max. |
| Delete | Delete calls are scoped, draft-only, and never run as broad prefix deletes. |

## Performance No-Go Gates

| Gate | No-go condition |
| --- | --- |
| PERF-1 Cache scope | Any consumer reads/writes unscoped `workspace-component-library` data outside the key factory. |
| PERF-2 Payload | Lite sidebar ships full history or attachment graph by default. |
| PERF-3 Render | Large fixture produces unusable tab/filter behavior without measured mitigation. |
| PERF-4 Network | Mutation retry can double-insert or loop indefinitely. |
| PERF-5 Attachment | List/compare eagerly fetches attachment binaries or exposes storage paths. |
| PERF-6 Workspace switch | Stale in-flight response can repopulate prior workspace data. |


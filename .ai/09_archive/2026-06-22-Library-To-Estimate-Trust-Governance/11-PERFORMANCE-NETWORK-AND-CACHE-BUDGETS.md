# Performance, Network, And Cache Budgets

This file turns performance concerns into measurable budgets. The goal is fast
Estimate Sheet reuse without cache bleed, duplicate network work, or unbounded
render/file-transfer costs.

## Product Budgets

| Area | Budget | Evidence |
| --- | --- | --- |
| Warm sidebar tab switch | <= 300 ms to usable content after cached data exists. | DOM/perf test or browser trace if UI timing is claimed. |
| Sidebar first page provider-adjacent | <= 500 ms p95 at 5,000 Library items. | SQL-006A query-plan proof plus provider-adjacent/local Postgres timing when claimed. |
| Sidebar filtered next page | <= 300 ms p95 at 5,000 Library items. | Large fixture/provider-adjacent proof when claimed. |
| Sidebar filter/search | <= 100 ms p95 for 5,000 Library items in jsdom/unit harness; <=150 ms desktop browser and <=250 ms mobile browser keystroke-to-paint when real UI responsiveness is claimed. | Large fixture test; browser proof only for real UI timing claims. |
| Mounted row cards | At >=500 source rows, virtualization/windowing is active; at 5,000 Library items, mounted source cards stay <=75 desktop and <=50 mobile unless a documented component constraint justifies higher. | DOM assertion, render-count test, or browser trace. |
| Compare dialog open | <= 100 ms from action to dialog content with warm source data. | DOM timing test or browser trace. |
| Lite sidebar DB round trips | <= 2 DB round trips for a 50-row first page and <= 2 DB round trips for a 50-row filtered next page, including accepted-cost summary, warning counts, attachment counts, supplier/source labels, and thumbnail pointers. | Query-count test, provider log assertion, or instrumented repository/RPC proof. |
| Compare dialog source query count | Warm open uses 0 additional list-wide queries and <= 1 item-detail query when detail is not already cached. | Query-count test or instrumented data-loader proof. |
| Lite sidebar payload | <= 75 KB uncompressed JSON for 50 rows, excluding HTTP overhead; target <= 50 KB when thumbnails are pointers. | Fixture serialization test. |
| Compare payload | <= 25 KB unless the user explicitly opens attachment metadata. | Fixture serialization test. |
| Initial Estimate Sheet route bundle | U1-U3 add <= 25 KB gzip to the initial Estimate Sheet route chunk unless a measured baseline justifies more. | Route bundle diff evidence before release readiness. |
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

## Query Scaling And Pagination Contract

| Source | Default page size | Maximum page size | Sort/filter contract |
| --- | ---: | ---: | --- |
| Library sidebar lite | 50 | 100 | Workspace-scoped, stable cursor by `updated_at` plus `id`; filters use indexed workspace/project/status fields. |
| Project source sidebar | 50 | 100 | Project/workspace-scoped cursor; no unbounded select-all. |
| Templates sidebar | 25 | 100 | Workspace/user-scoped cursor; dependency health loaded lazily. |
| Cost governance queue | 50 | 100 | Workspace-scoped filters by review status, assignee, due date, and updated time. |
| Attachment metadata | 50 | 100 | Item/price-option/workspace-scoped; metadata only, no binary eager-load. |

Rules:

- No Library-to-Estimate list query may use unbounded select-all for workspace
  datasets.
- List payload telemetry records result-count and byte-size buckets, never raw
  names or search text.
- SQL-006A/SQL-006B or an adapted EXPLAIN probe is required for
  provider-adjacent large dataset claims.
- SQL-006A must prove the implemented sidebar lite query/RPC, including joins or
  aggregates used by the lite row shape. An id-only `cost_library_items` probe is
  not enough for release claims.
- SQL-006B must prove the implemented governance queue query/RPC when U4 ships,
  including review status, assignee, due date, updated-time, and conflict
  filters where implemented.
- Hidden tabs may be marked stale, but they do not actively refetch unless their
  visible data is affected.

## Query Count And Bundle Contract

| Surface | Query-count budget | Bundle rule |
| --- | --- | --- |
| Library sidebar lite first page | <= 2 DB round trips for 50 rows. | Preserve the existing lazy sidebar boundary. |
| Library sidebar filtered next page | <= 2 DB round trips for 50 rows. | No heavy manager-only imports in the Estimate Sheet initial route. |
| Compare dialog warm open | 0 list-wide queries and <= 1 item-detail query if detail is not cached. | Compare UI can load lazily; it must not pull governance queues into first render. |
| Cost governance queue | <= 2 DB round trips for 50 rows when U4 ships. | Governance queue UI stays out of the initial Estimate Sheet route unless visible on first render. |
| Attachment review metadata | <= 2 DB round trips for a 50-row metadata page. | Attachment parsing/review UI stays out of Estimate Sheet first render unless visible. |

No-go: importing attachment parsing, governance queue UI, or heavy manager-only
components synchronously into `src/components/workshop/EstimateSheetContent.tsx`.

## Realtime And Automatic Refetch Policy

Default for U1-U3: no Supabase realtime subscriptions are required. Use explicit
invalidation, stale markers, and retry/refetch actions.

If realtime, polling, broadcast invalidation, focus refetch, or reconnect
refetch is added later:

- use at most one workspace/project-scoped channel per visible Estimate Sheet
  session;
- do not create per-row subscriptions;
- hidden tabs are stale-only on focus/reconnect;
- visible-tab refetches are debounced or coalesced to one request per query
  shape;
- QA-024 records active refetch counts and discarded workspace-switch responses.

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
| Sidebar Library item mutation | `workspaceComponentLibraryQueryKey(workspaceId)` scoped prefix. | Prefix within workspace. | Stale-only for hidden lists; active only when visible item changed. | No cross-workspace invalidation. |
| Lite sidebar source mutation | `workspaceComponentLibraryLiteQueryKey(workspaceId, projectId)`. | Exact current project key. | Active when current sidebar must update; stale-only for hidden tabs. | Current sidebar warnings update without loading full graph. |
| Project source mutation | Rows management/project source key. | Scoped by workspace/project. | Active for current project. | Project tab reflects source change. |
| Template insert/source update | `workspaceEstimateTemplatesQueryKey({ userId, workspaceId })`. | Exact user/workspace. | Active only for template surface. | Template tab remains scoped. |
| Cost accept/reject/supersede | Full Library detail key plus lite warning/cost summary key. | Scoped workspace/project. | Active for visible item; stale-only for hidden lists. | Accepted-cost label updates where visible. |
| Attachment approve/supersede/delete draft | Full Library detail key plus attachment metadata query if separate. | Exact item/variant when available. | Active for visible item. | Current approved attachment updates without binary eager-load. |
| Telemetry-only event | None. | None. | None. | No cache churn. |

Consumers must use key factory helpers. Direct ad hoc arrays are not allowed.
Each mutation test must assert the exact key or prefix invalidated and the
maximum invalidation fanout. Telemetry-only events perform zero invalidations.

Numeric fanout ceilings:

| Mutation | Maximum invalidated key groups | Maximum active refetch groups |
| --- | ---: | ---: |
| Telemetry-only event | 0 | 0 |
| Insert Library item into estimate | 2 | 1 |
| Replace row from Library | 2 | 1 |
| Sidebar Library item mutation | 2 within current workspace | 1 when visible, hidden tabs stale-only |
| Project source mutation | 2 within current project/workspace | 1 when visible |
| Template insert/source update | 1 exact user/workspace template group plus touched estimate group when relevant | 1 |
| Cost accept/reject/supersede | 2 scoped key groups | 1 when visible |
| Attachment approve/supersede/delete draft | 2 scoped key groups | 1 when visible; no binary list refetch |

## Cache Lifecycle Contract

| Key shape | stale behavior | garbage/retention behavior | Workspace switch |
| --- | --- | --- | --- |
| Full Library dataset | Stale after trust-changing mutation; do not refetch unless visible. | Keep only while Library manager/detail needs it. | Cancel/ignore all prior workspace responses. |
| Lite sidebar dataset | Fresh enough for fast tab switch; stale after source/cost/attachment mutation affecting visible summary. | Retain warm data for the active workspace/project only. | Clear visible data and reject stale responses. |
| Estimate rows/tree | Active refetch after successful insert/replace. | Keep per current estimate. | Prior estimate/workspace responses ignored. |
| Templates | Stale only after template mutation. | User/workspace scoped. | Prior workspace/user responses ignored. |

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

Automatic retries cap at 3 attempts with jittered backoff and never retry 4xx
authorization, scope, validation, or lifecycle failures.

## Mutation Idempotency Matrix

| Mutation | Duplicate-prevention mechanism | Retry rule |
| --- | --- | --- |
| Insert Library item into estimate | Operation ID or target+source+client-intent key, plus server target revalidation. | Retry revalidates source and target; no double insert. |
| Replace row from Library | Expected row revision. | Stale revision blocks and reopens compare/refetch path. |
| Promote/detach/project-source add | Existing source/link-state revision or deterministic duplicate rule. | Retry verifies current link state. |
| Accept/reject/supersede cost | `expected_review_revision` plus DB constraint/RPC transaction. | Conflict returns visible stale-review state. |
| Lock/unlock accepted cost | `expected_review_revision`. | Unauthorized/stale revision never retries automatically. |
| Assign stale-cost refresh | `expected_review_revision`; assignee workspace validation. | 4xx denied; 5xx can manual retry. |
| Upload attachment | Client file intent ID and server path ownership checks. | Failed files retry individually; successful drafts are not reuploaded silently. |
| Approve/reject/supersede attachment | `expected_review_revision` plus same-scope validation. | Conflict returns stale-review state. |
| Signed URL issuance | No idempotent write; audit event emits reason code only once per user intent where feasible. | Denied calls do not reveal path existence. |

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
| PERF-7 Query scaling | Sidebar/governance queries fetch unbounded rows or lack query-plan proof for large-dataset claims. |
| PERF-8 Observability | Runtime timing/retry/cache/signed-URL metrics are absent or include raw private fields. |
| PERF-9 Query count | Sidebar lite or governance queue paths exceed the query-count budgets for the implemented page shape. |
| PERF-10 Bundle | Governance, attachment, or manager-only code increases the initial Estimate Sheet route chunk beyond the budget without recorded baseline evidence. |

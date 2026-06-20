# Shared Link Feature Performance/Speed Audit

Date: 2026-06-20

Dedicated sub-goal: comprehensive performance/speed audit for public shared links and manager publication actions.

This is a read-only audit of the current worktree. Multiple agents are active; this report does not stage, commit, revert, or edit source. Existing unrelated dirty files were present while inspecting, so findings describe the current checked-out state and note uncertainty where evidence is indirect.

## 1. Audit scope and exact files inspected

Required context inspected:

- `AGENTS.md`
- `.ai/10_state/current-state.md` FAST PATH block only

Primary share/publication source inspected:

- `src/app/share/[token]/page.tsx`
- `src/app/api/share/[token]/route.ts`
- `src/app/api/share/[token]/password/route.ts`
- `src/app/api/share/[token]/session/route.ts`
- `src/app/api/share/[token]/comment/route.ts`
- `src/app/api/share/[token]/decision/route.ts`
- `src/app/api/share/[token]/activity/route.ts`
- `src/app/api/share/[token]/events/route.ts`
- `src/components/share/SharePageTabs.tsx`
- `src/components/share/ShareEstimateTreePanel.tsx`
- `src/components/share/ShareEstimateTreeView.tsx`
- `src/components/share/SharePageComments.tsx`
- `src/components/share/SharePageDecision.tsx`
- `src/components/share/SharedLinkActivityFeed.tsx`
- `src/components/share/SharePageRecipientSessionInitializer.tsx`
- `src/components/share/SharePageSessionBanner.tsx`
- `src/hooks/use-shared-link-session.ts`
- `src/lib/publication/public-repository.ts`
- `src/lib/publication/actions.ts`
- `src/lib/publication/snapshot.ts`
- `src/lib/publication/security.ts`
- `src/lib/share/reconstruct-share-tree.ts`
- `src/lib/share/aggregate-share-chart-buckets.ts`

Performance/prior evidence inspected:

- `.ai/03_plans/2026-06-14-Overall-Site-Performance-And-Optimization/06_DATABASE_API_AND_SERVER_ACTION_PERFORMANCE_AUDIT.md`
- `.ai/03_plans/2026-06-14-Overall-Site-Performance-And-Optimization/08_CACHING_PREFETCH_AND_ROUTE_TRANSITION_AUDIT.md`
- `.ai/03_plans/2026-06-14-Overall-Site-Performance-And-Optimization/12_OPTIMIZATION_BACKLOG.md`
- `.ai/03_plans/2026-06-14-Overall-Site-Performance-And-Optimization/evidence/findings-index.md`
- `tests/vitest/shared-link-activity-benchmark.test.ts`
- `tests/vitest/project-publication-public-repository.test.ts`
- `tests/vitest/share/share-page-get-routes-contract.test.ts`
- `scripts/benchmark-shared-link-activity.ts`
- `supabase/migrations/20260528220000_project_shared_link_overhaul.sql`
- `supabase/migrations/20260616094500_shared_link_rotation_and_viewed_snapshot_rpc.sql`

## 2. Hot path map

### First public page load

1. `src/app/share/[token]/page.tsx:131` resolves params and token.
2. `src/app/share/[token]/page.tsx:139` calls `resolveProjectPublicationAccessByToken`.
3. If password protected, cookie verification runs at `src/app/share/[token]/page.tsx:142` through `src/app/share/[token]/page.tsx:150`.
4. Password-gate telemetry is deferred with `after()` at `src/app/share/[token]/page.tsx:151` through `src/app/share/[token]/page.tsx:168`.
5. Recipient session cookie validation runs at `src/app/share/[token]/page.tsx:177` through `src/app/share/[token]/page.tsx:195`.
6. Snapshot and recipient identity are fetched in parallel at `src/app/share/[token]/page.tsx:197` through `src/app/share/[token]/page.tsx:209`.
7. View token creation happens at `src/app/share/[token]/page.tsx:212` through `src/app/share/[token]/page.tsx:216`.
8. Visit/open telemetry is deferred with `after()` at `src/app/share/[token]/page.tsx:218` through `src/app/share/[token]/page.tsx:251`.
9. The main view renders summary, decision, hero, tabs, and comments at `src/app/share/[token]/page.tsx:81` through `src/app/share/[token]/page.tsx:93`.
10. The route is explicitly dynamic at `src/app/share/[token]/page.tsx:46`.

Indirect metadata cost: `generateMetadata` also resolves access at `src/app/share/[token]/page.tsx:280` through `src/app/share/[token]/page.tsx:290` and reads the snapshot when unprotected at `src/app/share/[token]/page.tsx:292` through `src/app/share/[token]/page.tsx:303`. The repository wraps these reads in React cache at `src/lib/publication/public-repository.ts:92` through `src/lib/publication/public-repository.ts:134`, so duplicate DB work may be deduped per request in production RSC, but the audit did not run a production trace to prove it.

### Password unlock

1. Same-origin check at `src/app/api/share/[token]/password/route.ts:34` through `src/app/api/share/[token]/password/route.ts:38`.
2. Password body parse at `src/app/api/share/[token]/password/route.ts:40` through `src/app/api/share/[token]/password/route.ts:42`.
3. Durable password rate limit check at `src/app/api/share/[token]/password/route.ts:46` through `src/app/api/share/[token]/password/route.ts:55`.
4. In-memory failure lock check and event write on lock at `src/app/api/share/[token]/password/route.ts:57` through `src/app/api/share/[token]/password/route.ts:66`.
5. Password verification at `src/app/api/share/[token]/password/route.ts:68` through `src/app/api/share/[token]/password/route.ts:69`, backed by `scrypt` verification at `src/lib/publication/security.ts:150` through `src/lib/publication/security.ts:158`.
6. Attempt analytics are written before response at `src/app/api/share/[token]/password/route.ts:71` through `src/app/api/share/[token]/password/route.ts:84`.
7. Failed attempts record failure and may delay response at `src/app/api/share/[token]/password/route.ts:86` through `src/app/api/share/[token]/password/route.ts:92`.
8. Success clears failures and returns the access cookie at `src/app/api/share/[token]/password/route.ts:95` through `src/app/api/share/[token]/password/route.ts:108`.

### Recipient session init

1. The page renders `SharePageRecipientSessionInitializer` when a recipient token is present at `src/app/share/[token]/page.tsx:75`.
2. The client posts to `/session` at `src/components/share/SharePageRecipientSessionInitializer.tsx:14` through `src/components/share/SharePageRecipientSessionInitializer.tsx:23`.
3. On success, the browser navigates to the clean share URL at `src/components/share/SharePageRecipientSessionInitializer.tsx:26`.
4. The session route checks same-origin and body at `src/app/api/share/[token]/session/route.ts:38` through `src/app/api/share/[token]/session/route.ts:49`.
5. It resolves access and password state at `src/app/api/share/[token]/session/route.ts:51` through `src/app/api/share/[token]/session/route.ts:68`.
6. It verifies the recipient token at `src/app/api/share/[token]/session/route.ts:70`.
7. It creates response cookies at `src/app/api/share/[token]/session/route.ts:75` through `src/app/api/share/[token]/session/route.ts:90`.
8. It awaits analytics before responding at `src/app/api/share/[token]/session/route.ts:92` through `src/app/api/share/[token]/session/route.ts:99`.

### Comments, decision, and activity

Comments:

- Client loads comments after hydration at `src/components/share/SharePageComments.tsx:122` through `src/components/share/SharePageComments.tsx:132`.
- Comment GET resolves access, verifies password/session, rate-limits, then loads comments at `src/app/api/share/[token]/comment/route.ts:134` through `src/app/api/share/[token]/comment/route.ts:182`.
- Comment POST validates body/session/access, checks view snapshot version, rate-limits, sanitizes, inserts through RPC, and returns at `src/app/api/share/[token]/comment/route.ts:191` through `src/app/api/share/[token]/comment/route.ts:313`.
- Post-fix, successful comment POST returns the canonical inserted comment and the client reconciles the optimistic row without reloading the full comments list.
- Repository comment loads are capped at 200 rows at `src/lib/publication/public-repository.ts:859` through `src/lib/publication/public-repository.ts:875`.

Decision:

- Client loads the current decision at `src/components/share/SharePageDecision.tsx:82` through `src/components/share/SharePageDecision.tsx:120`.
- Decision GET resolves access, verifies password/session, rate-limits, then loads response at `src/app/api/share/[token]/decision/route.ts:69` through `src/app/api/share/[token]/decision/route.ts:121`.
- Decision POST resolves access/session/view token, rate-limits, submits through RPC, and returns at `src/app/api/share/[token]/decision/route.ts:154` through `src/app/api/share/[token]/decision/route.ts:219`.

Activity:

- Public activity route is dynamic at `src/app/api/share/[token]/activity/route.ts:30`.
- It rate-limits at `src/app/api/share/[token]/activity/route.ts:86` through `src/app/api/share/[token]/activity/route.ts:96`.
- It caps page limit at 100 at `src/app/api/share/[token]/activity/route.ts:98` through `src/app/api/share/[token]/activity/route.ts:101`.
- Post-fix: it selects compact `activity_target_labels_json` rather than full `snapshot_json` at `src/app/api/share/[token]/activity/route.ts:113`.
- Post-fix: public activity no longer selects or returns comment bodies, so it cannot bypass the recipient-session comments API.
- It runs comments, responses, and events queries in parallel at `src/app/api/share/[token]/activity/route.ts:181` through `src/app/api/share/[token]/activity/route.ts:190`.
- Post-fix: it creates labels from `activity_target_labels_json` at `src/app/api/share/[token]/activity/route.ts:211`.
- It merges, sorts, and slices bounded rows at `src/app/api/share/[token]/activity/route.ts:213` through `src/app/api/share/[token]/activity/route.ts:255`.
- Post-fix: the owner feed uses the same compact-label shape through the server action and no longer selects `snapshot_json` for activity labels.
- The synthetic benchmark locks expected fanout at 3 anonymous public queries, 5 recipient-session public queries, and 6 owner queries in `tests/vitest/shared-link-activity-benchmark.test.ts:13` through `tests/vitest/shared-link-activity-benchmark.test.ts:19`.

### Manager publish, republish, rotate, and recipients

Publish:

- Manager authorization reads project/workspace state at `src/lib/publication/actions.ts:149` through `src/lib/publication/actions.ts:196`.
- Latest publication lookup runs at `src/lib/publication/actions.ts:351` through `src/lib/publication/actions.ts:360`.
- Snapshot build loads estimates first at `src/lib/publication/actions.ts:365` through `src/lib/publication/actions.ts:374`.
- Rows, tree nodes, and tabs load in parallel at `src/lib/publication/actions.ts:384` through `src/lib/publication/actions.ts:402`.
- Post-fix: row thumbnail extraction selects `source_snapshot->>imageUrl` instead of full `source_snapshot` JSON.
- Existing publications are revoked at `src/lib/publication/actions.ts:540` through `src/lib/publication/actions.ts:548`.
- New publication insert, including optional password hash and `snapshot_json`, runs at `src/lib/publication/actions.ts:550` through `src/lib/publication/actions.ts:561`.

Republish:

- Latest publication lookup at `src/lib/publication/actions.ts:590`.
- Snapshot rebuild at `src/lib/publication/actions.ts:603`.
- Optional password hash at `src/lib/publication/actions.ts:612` through `src/lib/publication/actions.ts:617`.
- Publication update at `src/lib/publication/actions.ts:622` through `src/lib/publication/actions.ts:633`.

Rotate:

- Snapshot rebuild at `src/lib/publication/actions.ts:660`.
- Token/hash and password hashing at `src/lib/publication/actions.ts:666` through `src/lib/publication/actions.ts:673`.
- RPC call at `src/lib/publication/actions.ts:679` through `src/lib/publication/actions.ts:687`.
- The RPC locks the publication row at `supabase/migrations/20260616094500_shared_link_rotation_and_viewed_snapshot_rpc.sql:26` through `supabase/migrations/20260616094500_shared_link_rotation_and_viewed_snapshot_rpc.sql:30` and updates all recipients for the publication at `supabase/migrations/20260616094500_shared_link_rotation_and_viewed_snapshot_rpc.sql:56` through `supabase/migrations/20260616094500_shared_link_rotation_and_viewed_snapshot_rpc.sql:63`.

Recipients:

- Post-fix: add-recipient action processes per-recipient insert, email send, and sent-status update with bounded concurrency (`SHARED_LINK_RECIPIENT_ADD_CONCURRENCY = 4`) while keeping each recipient pipeline ordered.

## 3. Findings table

| ID | Severity | Evidence | Impact | Recommendation | Verification needed |
| --- | --- | --- | --- | --- | --- |
| PERF-01 | P2 | `src/components/share/SharePageRecipientSessionInitializer.tsx`, `src/app/api/share/[token]/session/route.ts` | Partially reduced: recipient-specific links still require an initial page render, a client POST, and a full reload to the clean URL, but recipient session-start analytics no longer blocks the POST response. | Evaluate a server route/redirect flow that sets cookies before rendering the share page only after token-leakage and cookie-setting review. Keep this as a high-blast-radius change. | Measure recipient link p50/p95 from first request to interactive recipient view. Count server renders and `/session` latency after analytics deferral. |
| PERF-02 | P1 | `src/app/api/share/[token]/route.ts`, `tests/vitest/project-publication-route.test.ts` | Fixed in this implementation pass: the public snapshot API schedules view telemetry with `after()` and preserves response/failure isolation. | Keep non-essential telemetry off the response path. | Route contract test proves the JSON response remains valid if event write rejects. |
| PERF-03 | P1 | `src/lib/publication/public-repository.ts` | Fixed in this implementation pass: expired-row cleanup is throttled and single-flight in-process instead of run on every protected attempt. | Keep DB-side index/cardinality measurement on the beta-readiness checklist. | Provider `EXPLAIN` still useful once realistic rows exist. |
| PERF-04 | P2 | `src/app/api/share/[token]/activity/route.ts`, `src/lib/publication/actions.ts`, `supabase/migrations/20260620064601_project_publication_activity_target_labels.sql` | Fixed in this implementation pass: activity reads use compact target-label metadata instead of full `snapshot_json`. | Apply/reconcile the local migration safely in provider history, then measure p95 with large snapshots. | Provider migration proof and hosted p95 measurement remain open. |
| PERF-05 | P2 | `src/app/api/share/[token]/comment/route.ts:215`, `src/lib/publication/public-repository.ts:941`, `src/lib/publication/public-repository.ts:954`, `supabase/migrations/20260616094500_shared_link_rotation_and_viewed_snapshot_rpc.sql:133`, `supabase/migrations/20260616094500_shared_link_rotation_and_viewed_snapshot_rpc.sql:148`; analogous decision path at `src/app/api/share/[token]/decision/route.ts:154`, `src/lib/publication/public-repository.ts:1011`, `src/lib/publication/public-repository.ts:1024` | Comment and decision writes perform app-layer access/session lookups, then helper publication/recipient lookups, then RPC-side publication/recipient lookups. This is secure but adds serial DB round trips to the interaction path. | Consolidate write validation into one RPC call or pass already-validated publication/recipient identifiers to an RPC variant that still enforces snapshot/version constraints. Treat as security-sensitive. | Query-count test for comment/decision POST. p95 comparison of current path vs one-RPC prototype. Security review that rejected/revoked/password-gated sessions still fail. |
| PERF-06 | P2 | `src/lib/publication/actions.ts:365`, `src/lib/publication/actions.ts:384`, `src/lib/publication/actions.ts:402`, `src/lib/publication/snapshot.ts:212`, `src/lib/publication/snapshot.ts:241`, `src/lib/publication/snapshot.ts:260` | Partially reduced: snapshot generation now selects only `source_snapshot->>imageUrl` for thumbnails, but publish/republish remains O(estimates + rows + nodes + tabs) and stores row data both at estimate level and inside tab payloads. | First add measurement and byte-size budgets. For vNext, store a normalized snapshot shape where rows are referenced by tab/node instead of duplicated, or materialize only the public shapes needed by the UI. | Snapshot byte-size histogram for small/median/large projects. Publish/republish duration with 1k/10k/50k rows. Public page payload and hydration time before/after normalized snapshot prototype. |
| PERF-07 | P2 | `src/components/share/ShareEstimateTreeView.tsx`, `src/components/share/ShareEstimateTreePanel.tsx` | Fixed in this implementation pass: inline tree rows are capped for desktop/mobile views with a status summary for hidden rows. | Consider full virtualization only if hosted/mobile INP still shows a problem. | DOM node count/hydration measurement remains useful for very large snapshots. |
| PERF-07B | P2 | `src/components/share/SharePageTabs.tsx` | Fixed in this implementation pass: Grid Preview renders only the first 250 matching rows with an explicit refine-filter summary. | Consider virtualization only if recipients need full unfiltered tables in-browser at larger row counts. | DOM node count/hydration measurement remains useful for very large snapshots. |
| PERF-08 | P2 | `src/lib/publication/actions.ts` | Fixed in this implementation pass: recipient insert/send/status pipelines run with bounded concurrency and preserve per-recipient partial failure reporting. | Batch insert/background queue remains a later scale optimization, not beta-blocking. | Benchmark 1/10/50 recipients once provider/email mocks are available. |
| PERF-09 | P3 | `src/app/api/share/[token]/password/route.ts:68`, `src/lib/publication/security.ts:150`, `src/lib/publication/security.ts:157`, `src/app/api/share/[token]/password/route.ts:71`, `src/app/api/share/[token]/password/route.ts:84` | Password unlock intentionally pays `scrypt` plus synchronous attempt/event writes. This is appropriate for security, but successful unlock latency may be noticeable on low-power/serverless instances. | Do not weaken password hashing. Move non-security analytics off-path where possible and measure `scrypt` cost under production runtime. | p50/p95 unlock latency for correct and incorrect password, separated into hash time, DB time, and intentional backoff. |
| PERF-10 | P3 | `src/components/share/SharePageComments.tsx`, `src/app/api/share/[token]/comment/route.ts`, `src/lib/publication/public-repository.ts` | Fixed in this implementation pass: successful comment POST returns the canonical inserted comment, and the client replaces the optimistic row without a second comments GET. | Add pagination if comment volume exceeds 50-100 per link. | `tests/vitest/project-publication-comments.test.tsx` covers the route response and one-GET client submit path. |
| PERF-11 | P3 | `src/app/share/[token]/loading.tsx`, `tests/vitest/share-no-store-invariants.test.ts` | Fixed in this implementation pass: the dynamic share page now has a proposal-shaped route loading boundary. | Keep manual/browser proof optional for a future UI lane; static route coverage is enough for this pass. | Static invariant test covers the boundary file. |
| PERF-12 | P3 | `supabase/migrations/20260616094500_shared_link_rotation_and_viewed_snapshot_rpc.sql:26`, `supabase/migrations/20260616094500_shared_link_rotation_and_viewed_snapshot_rpc.sql:56` | Link rotation locks the publication and updates all recipient tokens for that publication. This is correct for security, but recipient-heavy publications make rotate cost O(recipient count). | Accept for MVP if recipient counts are low; otherwise measure and consider chunked recipient invalidation or a credential-version model that avoids rewriting every recipient token on rotate. | Rotation duration at 10/100/1,000 recipients and lock wait metrics under concurrent recipient actions. |

Positive performance notes:

- The server page already defers view/open telemetry with `after()` at `src/app/share/[token]/page.tsx:218` through `src/app/share/[token]/page.tsx:251`.
- Snapshot and recipient identity are fetched in parallel on page load at `src/app/share/[token]/page.tsx:197` through `src/app/share/[token]/page.tsx:209`.
- Activity route fanout is bounded by page limit and benchmarked at the query-count level in `tests/vitest/shared-link-activity-benchmark.test.ts:13` through `tests/vitest/shared-link-activity-benchmark.test.ts:19`.
- Comment reads are capped at 200 rows in `src/lib/publication/public-repository.ts:859` through `src/lib/publication/public-repository.ts:875`.

## 4. Quick wins vs high-blast-radius optimizations

Quick wins:

- Preserve non-blocking telemetry writes on the `/api/share/[token]` GET response path.
- Preserve non-blocking recipient session-start analytics on the `/session` response path.
- Keep the canonical comment response path so successful comment submits do not reload the bounded comments list.
- Add measurement around snapshot byte size and publish/republish duration before changing data shape. Evidence: snapshot build at `src/lib/publication/actions.ts:365` through `src/lib/publication/actions.ts:481`.
- Add or confirm DB indexes for rate-limit cleanup/count paths before traffic increases. Evidence: `src/lib/publication/public-repository.ts:282` through `src/lib/publication/public-repository.ts:309`.
- Run the existing activity benchmark with larger synthetic counts and record its output in the plan evidence directory.
- Keep the deferred print-package pattern so full proposal print output does not inflate the normal receiver DOM.
- Keep public activity comment bodies out of the unauthenticated receiver feed; the comments API remains the session-gated body surface.

High-blast-radius optimizations:

- Replace duplicated app-layer plus RPC-layer comment/decision validation with a one-round-trip secure RPC design.
- Normalize or version the public snapshot payload to reduce duplicated row JSON.
- Keep compact activity target labels in sync when future publish/rotate paths are added.
- Change recipient session initialization to a server redirect/cookie-setting flow.
- Move recipient invitation workflows to a background queue if closed-beta usage exceeds bounded-concurrency latency targets.
- Change rotate semantics to avoid O(recipient count) credential rewrites.
- Consider full virtualization only if the current tree/grid caps still show hosted/mobile INP problems on large snapshots.

## 5. Suggested measurement commands and metrics

No build or browser automation was run for this audit/implementation pass. Suggested follow-up commands:

```bash
bunx vitest run \
  tests/vitest/project-publication-public-repository.test.ts \
  tests/vitest/share/share-page-get-routes-contract.test.ts \
  tests/vitest/shared-link-activity-benchmark.test.ts \
  --maxWorkers=1
```

```bash
SHARED_LINK_ACTIVITY_BENCHMARK_ROWS=100,500,1000,2500 \
SHARED_LINK_ACTIVITY_BENCHMARK_LIMIT=100 \
MARKDOWN_FILE=.ai/03_plans/2026-06-20-Shared-Link-Feature/evidence/shared-link-activity-benchmark.md \
bun scripts/benchmark-shared-link-activity.ts
```

Suggested Supabase/Postgres measurements:

```sql
explain (analyze, buffers)
select id, status, revoked_at, expires_at, password_hash, snapshot_json, snapshot_version
from project_publications
where token_hash = '<hash>'
limit 1;

explain (analyze, buffers)
delete from security_rate_limit_events
where expires_at <= now();

explain (analyze, buffers)
select count(*)::integer
from security_rate_limit_events
where scope = '<scope>'
  and key_hash = '<hash>'
  and occurred_at >= now() - interval '1 minute';

explain (analyze, buffers)
select id, publication_id, created_at
from shared_link_comments
where publication_id = '<publication-id>'
  and is_internal = false
order by created_at desc
limit 101;
```

Metrics to capture:

- Public share page TTFB, server render duration, and p95 for open links.
- Recipient-link time from first request to recipient-authenticated UI.
- `/api/share/:token`, `/session`, `/password`, `/comment`, `/decision`, and `/activity` p50/p95.
- Supabase query count per route and per manager action.
- `snapshot_json` bytes, sanitized snapshot bytes, and client payload bytes.
- Publish/republish duration vs row/node/tab counts.
- Rate-limit table row count, cleanup duration, count duration, and index usage.
- Activity route heap usage and JSON response size at 50/100 item limits.
- Share tree DOM node count, hydration time, and key interaction latency at 500/2,500/10,000 rows.
- Recipient add duration at 1/10/50 recipients with mocked email latencies.

Measurement caveat: `scripts/benchmark-shared-link-activity.ts` is useful for CPU/query-shape regression, but it states that it is local CPU-only and does not prove Supabase latency, RLS overhead, or hosted function duration at `scripts/benchmark-shared-link-activity.ts:347` through `scripts/benchmark-shared-link-activity.ts:354`.

## 6. Handoffs/conflicts for other lanes

- Existing unrelated dirty files were present in the worktree during this audit/implementation pass. This pass did not revert, stage, commit, or edit unrelated source.
- Coordinate with the security lane before changing password unlock, recipient session, comment/decision RPC validation, or rotate semantics. Several performance wins overlap with security invariants.
- Coordinate with the receiver UX/UI lane before changing tree rendering defaults. The share loading boundary is now implemented; browser proof remains optional future UI evidence.
- Coordinate with the database lane before changing rate-limit cleanup/count design, activity label storage, snapshot normalization, or recipient rotation strategy.
- Coordinate with email/provider lanes before moving recipient sends beyond the current bounded-concurrency pipeline; current action preserves per-recipient status and error behavior.
- The prior performance plan identified DB08 for synchronous public share API event recording and RT03 for the missing share loading boundary. This pass fixed both locally with non-blocking API telemetry and `share/[token]/loading.tsx`.

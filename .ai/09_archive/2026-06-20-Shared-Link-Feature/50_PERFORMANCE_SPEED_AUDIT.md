# Shared Link Feature Performance/Speed Audit

Date: 2026-06-20 · **As-of remediation: 2026-06-21**

> **Status banner (updated 2026-06-22).** IDs, severities, and statuses below are bound to the
> canonical registry [`75_FINDING_ID_REGISTRY.md`](75_FINDING_ID_REGISTRY.md) §5 — **75 wins** on any
> disagreement. Current beta-close evidence now exists for the formerly stale hosted/provider gaps:
> PERF-01A hosted recipient-link p95 `1622.11 ms` vs `2500 ms`, PERF-04 provider activity query p95
> `4.47 ms` vs `1200 ms`, PERF-09 hosted password route p95 `2327.11 ms` vs `2500 ms`, PERF-12
> provider rotate p95 `67.36/68.42/143.29 ms` for `10/100/1000` recipients, and PERF-06 local
> 10k snapshot bytes `2.55 MiB` vs `4 MiB`. Rows without committed measurement remain
> code-shape addressed only. Cross-links: migration ordering for PERF-04 in
> [`90_DEPLOY_AND_MIGRATION_RUNBOOK.md`](90_DEPLOY_AND_MIGRATION_RUNBOOK.md); production signals/
> thresholds in [`92_OBSERVABILITY_AND_ALERTING.md`](92_OBSERVABILITY_AND_ALERTING.md).
>
> Anchor note (per [`_COORDINATION.md` §4.12](_COORDINATION.md)): `actions.ts` is 1538 lines,
> `public-repository.ts` is 1124 lines. Drifted citations in this doc were re-anchored against current
> source on 2026-06-21.

Dedicated sub-goal: comprehensive performance/speed audit for public shared links and manager publication actions.

This is a read-only audit of the current worktree. Multiple agents are active; this report does not stage, commit, revert, or edit source. Existing unrelated dirty files were present while inspecting, so findings describe the current checked-out state and note uncertainty where evidence is indirect.

<a id="evidence-pointer"></a>
**Evidence pointer.** Deferred measurements land in [`evidence/`](evidence/):
- `evidence/shared-link-activity-benchmark.md` — output of the §5 `scripts/benchmark-shared-link-activity.ts` run.
- `evidence/perf-explain-queries.md` — output of the four §5 `EXPLAIN (ANALYZE, BUFFERS)` queries against realistic rows.
- `evidence/perf-budgets.md` — captured p95 / byte / duration numbers vs the §3a budget table. Snapshot bytes, local password-unlock CPU cost, and local rotate token-hash cost are measured locally and pass.
- `evidence/perf-archive-readiness-2026-06-21/hosted-recipient-activity-summary.md` — hosted recipient-link proof for PERF-01A.
- `evidence/perf-provider-archive-readiness-2026-06-21/provider-perf-summary.md` — provider publish/republish, PERF-04, and PERF-12 proof.
- `evidence/perf-hosted-password-route-2026-06-21/hosted-password-route-summary.md` — hosted password route proof for PERF-09.

Rows whose numbers are still missing stay **perf UNVERIFIED**. The beta archive blocker is no longer PERF-01A/PERF-04/PERF-09/PERF-12 timing; it is the remaining `90` runbook/provider-drift disposition.

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
- `src/app/api/share/[token]/session/route.ts`
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

1. When a recipient query is present after any password gate, `src/app/share/[token]/page.tsx`
   redirects to `/api/share/[token]/session?recipient=...` before rendering the receiver.
2. The session route validates the recipient token, password access, and publication state, then
   creates HttpOnly session + non-secret `_ok` cookies and redirects to the clean share URL.
3. Invalid recipient tokens redirect back to the clean share URL with `recipientSession=invalid`;
   the page renders a non-secret alert and does not echo the raw recipient token.
4. POST session creation remains available for compatibility and is same-origin/CSRF guarded.

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
- Latest publication lookup runs in `readLatestProjectPublication` at `src/lib/publication/actions.ts:362` through `src/lib/publication/actions.ts:373`, ordered by `published_at` descending (`actions.ts:368`). (Re-anchored 2026-06-21; prior `:351-360` was inside an unrelated publisher-profile read.)
- Snapshot build loads estimates first in `buildSnapshotForProject` at `src/lib/publication/actions.ts:376` through `src/lib/publication/actions.ts:389`.
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

Status vocabulary in this table is bound to [`75` §5](75_FINDING_ID_REGISTRY.md): **Open**, **Fixed**
(code landed + a test), and the perf-specific qualifier **Code-shape addressed; perf UNVERIFIED**
(code shape changed but no latency/byte/query/`EXPLAIN` evidence captured yet — see the banner). Where
75 records a status, **75 wins**.

| ID | Severity | Status (bound to 75) | Evidence | Impact | Recommendation | Verification gate (binary pass/fail) |
| --- | --- | --- | --- | --- | --- | --- |
| PERF-01A | P2 | Fixed for beta | `src/app/share/[token]/page.tsx`, `src/app/api/share/[token]/session/route.ts`, `tests/vitest/project-publication-page.test.tsx`, `tests/vitest/project-publication-actions.test.ts`, `evidence/perf-archive-readiness-2026-06-21/hosted-recipient-activity-summary.md` | Recipient-specific links redirect to the server session route before receiver render; the deleted client initializer/client POST/full reload path is gone. Hosted recipient-link p95 is `1622.11 ms` vs `2500 ms`. | Keep the server redirect flow and remeasure if the receiver entry path changes. | PASS = hosted recipient-link p95 stays within §3a budget and no token leakage/client reload path returns. |
| PERF-02 | P1 | Fixed | `src/app/api/share/[token]/route.ts`, `tests/vitest/project-publication-route.test.ts` | Code-shape: the public snapshot API schedules view telemetry with `after()` and preserves response/failure isolation. Prior-plan id **DB08** ([75 §5](75_FINDING_ID_REGISTRY.md)). | Keep non-essential telemetry off the response path. | PASS = route contract test proves the JSON response stays valid if the event write rejects: `bunx vitest run tests/vitest/project-publication-route.test.ts --maxWorkers=1`. |
| PERF-03 | P1 | Fixed (code) / measure-open | `src/lib/publication/public-repository.ts:292`–`:298` (cleanup delete), `:305`–`:319` (single-flight throttle) | Code-shape: expired-row cleanup is throttled and single-flight in-process instead of run on every protected attempt. Latency/`EXPLAIN` UNVERIFIED. | Keep DB-side index/cardinality measurement on the beta-readiness checklist. | PASS = `evidence/perf-explain-queries.md` holds the `delete … where expires_at <= now()` `EXPLAIN` against realistic rows. UNVERIFIED ⇒ FAIL. |
| PERF-04 | P2 | Fixed for beta | `src/app/api/share/[token]/activity/route.ts`, `src/lib/publication/actions.ts`, `supabase/migrations/20260620064601_project_publication_activity_target_labels.sql`, `evidence/perf-provider-archive-readiness-2026-06-21/provider-perf-summary.md` | Activity reads use compact `activity_target_labels_json` instead of full `snapshot_json`; provider query-shape p95 is `4.47 ms` vs `1200 ms`. | Keep the compact query shape and do not reintroduce `snapshot_json` selection on activity. | PASS = migration confirmed applied in `90` + provider activity p95 stays within budget. |
| PERF-05 | P2 | Deferred for beta / GA optimization backlog | comment view-snapshot/RPC path at `src/app/api/share/[token]/comment/route.ts:216`–`:236` (the `viewedSnapshotVersion` block; **`:215` re-anchored** — it was a `SESSION_INVALID` log + return, not the RPC path), `src/lib/publication/public-repository.ts:941`, `:954`, `supabase/migrations/20260616094500_shared_link_rotation_and_viewed_snapshot_rpc.sql:133`, `:148`; analogous decision path at `src/app/api/share/[token]/decision/route.ts:154`, `public-repository.ts:1011`, `:1024` | Comment and decision writes perform app-layer access/session lookups, then helper publication/recipient lookups, then RPC-side publication/recipient lookups. This is intentionally conservative defense-in-depth on a public write path. | Keep current defense-in-depth for closed beta. Consolidate to one RPC only after security review proves identical rejected/revoked/password-gated/stale-snapshot behavior. | PASS for beta = current route/RPC security tests stay green. GA optimization PASS = reviewed one-RPC redesign with authz parity and p95 improvement evidence. |
| PERF-06 | P2 | Fixed | `src/lib/publication/snapshot.ts`, `src/components/share/SharePageTabs.tsx`, `tests/vitest/project-publication-snapshot.test.ts`, `tests/vitest/shared-link-perf-budgets-script.test.ts`, `evidence/perf-budgets.md` | Publish/republish remains O(estimates + rows + nodes + tabs), but compact schema v1.3 no longer stores duplicated tab row objects. Tabs store `rowIds`, while estimate-level rows remain for legacy consumers and v1.2 `tab.rows` remains readable. Local synthetic measurement: 100 rows 29.7 KiB PASS, 1k rows 263.1 KiB PASS, 10k rows 2.55 MiB PASS vs 4 MiB. (Thumbnail-only select is now **PERF-13**, a distinct row.) | Keep v1.3 compact tab membership and legacy v1.2 read support. | PASS = snapshot byte histogram for small/median/large projects in `evidence/perf-budgets.md` is at or below the §3a budget. |
| PERF-07 | P2 | Fixed | `src/components/share/ShareEstimateTreeView.tsx`, `src/components/share/ShareEstimateTreePanel.tsx` | Code-shape: inline tree rows capped for desktop/mobile with a hidden-row status summary. | Consider full virtualization only if hosted/mobile INP still shows a problem. | PASS = a test asserts the desktop/mobile row cap; DOM node-count measurement at large snapshots stays optional. |
| PERF-07B | P2 | Fixed | `src/components/share/SharePageTabs.tsx` | Code-shape: Grid Preview renders only the first 250 matching rows with a refine-filter summary. | Consider virtualization only if recipients need full unfiltered tables at larger row counts. | PASS = a test asserts the 250-row cap + refine copy. |
| PERF-08 | P2 | Fixed | `src/lib/publication/actions.ts` (`SHARED_LINK_RECIPIENT_ADD_CONCURRENCY = 4`) | Code-shape: recipient insert/send/status pipelines run with bounded concurrency and preserve per-recipient partial-failure reporting. | Batch insert/background queue remains a later scale optimization, not beta-blocking. | PASS = a test asserts bounded concurrency + per-recipient failure isolation; 1/10/50 recipient timing in `evidence/perf-budgets.md` is the §3a budget check. |
| PERF-09 | P3 | Fixed for beta | `src/app/api/share/[token]/password/route.ts`, `src/lib/publication/security.ts`, `evidence/perf-hosted-password-route-2026-06-21/hosted-password-route-summary.md` | Password unlock intentionally pays `scrypt` plus synchronous security-critical lockout clearing; success analytics is now off-path. Local CPU-only scrypt verify passes (10k p95 30.46 ms vs 500 ms) and hosted preview route proof passes (p95 2327.11 ms vs 2500 ms). | Do not weaken password hashing; keep durable lockout clearing synchronous before cookie issue. | PASS = hosted password route p95 remains within the §3a budget and hashing parameters are unchanged. |
| PERF-10 | P3 | Fixed | `src/components/share/SharePageComments.tsx`, `src/app/api/share/[token]/comment/route.ts`, `src/lib/publication/public-repository.ts` | Code-shape: successful comment POST returns the canonical inserted comment; the client replaces the optimistic row without a second comments GET. | Add pagination if comment volume exceeds 50–100 per link. | PASS = `bunx vitest run tests/vitest/project-publication-comments.test.tsx --maxWorkers=1` covers the route response + one-GET client submit path. |
| PERF-11 | P3 | Fixed | `src/app/share/[token]/loading.tsx`, `tests/vitest/share-no-store-invariants.test.ts` | Code-shape: the dynamic share page now has a proposal-shaped route loading boundary. Prior-plan id **RT03** ([75 §5](75_FINDING_ID_REGISTRY.md)). | Keep manual/browser proof optional for a future UI lane; static route coverage is enough for this pass. | PASS = `bunx vitest run tests/vitest/share-no-store-invariants.test.ts --maxWorkers=1` covers the boundary file. |
| PERF-12 | P3 | Fixed for beta / GA scale backlog | `supabase/migrations/20260616094500_shared_link_rotation_and_viewed_snapshot_rpc.sql:26`, `:56`, `evidence/perf-provider-archive-readiness-2026-06-21/provider-perf-summary.md` | Rotation locks the publication and updates recipient tokens for that publication — correct for security. Provider measurement now passes beta assumptions at 10/100/1000 recipients (p95 67.36/68.42/143.29 ms). | Accept for beta; keep credential-version or chunked invalidation as GA scale backlog if recipient counts exceed beta assumptions. | PASS = provider-backed rotation duration at 10/100/1,000 recipients stays within §3a budget. |
| PERF-13 | P2 | Fixed | `src/lib/publication/actions.ts` row-thumbnail extraction (`source_snapshot->>imageUrl` projection) | Code-shape: snapshot row-thumbnail extraction selects `source_snapshot->>imageUrl` instead of pulling full `source_snapshot` JSON, cutting per-row transfer/parse. (Promoted to a first-class id per [75 §5](75_FINDING_ID_REGISTRY.md); 50 previously folded this into PERF-06.) | None beyond keeping the narrow projection; do not re-introduce a full `source_snapshot` select. | PASS = a test (or grep guard) asserts the snapshot builder selects `source_snapshot->>imageUrl` and not the full column. Byte delta vs full-column baseline is the §3a budget check in `evidence/perf-budgets.md`. |
| PERF-14 | P2 | Fixed | `src/app/share/[token]/` print-package component, mounted on `beforeprint` (deferred print package; ties to RUX-04) | Code-shape: the full proposal print package is deferred to `beforeprint` instead of mounting on first render, so the normal receiver DOM is not inflated by all-row print output. (Promoted to a first-class id per [75 §5](75_FINDING_ID_REGISTRY.md); 50 previously listed this only as a positive note.) | Keep the deferred-print pattern; do not eagerly mount the print DOM. | PASS = a test asserts the print package is absent from first-render DOM and arms on `beforeprint`; receiver DOM node-count delta is the §3a budget check. |

Positive performance notes:

- The server page already defers view/open telemetry with `after()` at `src/app/share/[token]/page.tsx:218` through `src/app/share/[token]/page.tsx:251`.
- Snapshot and recipient identity are fetched in parallel on page load at `src/app/share/[token]/page.tsx:197` through `src/app/share/[token]/page.tsx:209`.
- Activity route fanout is bounded by page limit and benchmarked at the query-count level in `tests/vitest/shared-link-activity-benchmark.test.ts:13` through `tests/vitest/shared-link-activity-benchmark.test.ts:19`.
- Comment reads are capped at 200 rows in `src/lib/publication/public-repository.ts:859` through `src/lib/publication/public-repository.ts:875`.

(Two items previously listed here — deferred print package and `source_snapshot->>imageUrl` thumbnail
selection — are now first-class findings **PERF-14** and **PERF-13** in §3 per [75 §5](75_FINDING_ID_REGISTRY.md).)

## 3a. Performance budget table (beta gates)

Each budget is **UNVERIFIED** until its number is captured in [`evidence/perf-budgets.md`](evidence/).
A row whose number is missing or breaches the target is a binary **FAIL**. As of 2026-06-21, snapshot
bytes are measured locally and the 10k tier is a **PASS**. Production thresholds/alerts
for these signals live in [`92_OBSERVABILITY_AND_ALERTING.md`](92_OBSERVABILITY_AND_ALERTING.md).

| Budget | Dimension | Target | Beta-blocking? | Bound finding | Capture method |
| --- | --- | --- | :--: | --- | --- |
| Public page p95 | open (no-password) link, hosted in-region | ≤ 1200 ms TTFB-to-interactive p95 | **Yes** | PERF-01A, PERF-04 | hosted RUM / synthetic; current protected-preview activity smoke is not the PERF-04 close gate |
| Public page p95 | recipient link (server session redirect + clean receiver render) | ≤ 2500 ms first-request-to-interactive p95 | **Yes** | PERF-01A | hosted synthetic. **Current preview p95: 1622.11 ms PASS.** |
| Snapshot bytes | small project (≤ 100 rows) | ≤ 64 KB `snapshot_json` | No | PERF-06, PERF-13 | DB `octet_length(snapshot_json)`; `evidence/perf-budgets.md` |
| Snapshot bytes | median project (~1k rows) | ≤ 512 KB `snapshot_json` | **Yes** | PERF-06, PERF-13 | DB `octet_length` |
| Snapshot bytes | large project (≥ 10k rows) | ≤ 4 MB `snapshot_json` (else normalize) | **Yes** | PERF-06 | DB `octet_length` / local synthetic helper. **Current local fixture: 2.55 MiB PASS.** |
| Publish/republish duration | by row count | ≤ 1.5 s @ 1k rows · ≤ 6 s @ 10k · ≤ 20 s @ 50k | **Yes** (10k tier) | PERF-06, PERF-13 | provider timing. **Current 10k publish/republish p95: 68.61/61.94 ms PASS.** |
| Activity query p95 | 100 public comments + recipient labels | ≤ 1200 ms provider query-shape p95 | **Yes** | PERF-04 | provider query-shape timing. **Current p95: 4.47 ms PASS.** |
| Rotate duration | by recipient count | ≤ 500 ms @ 10 · ≤ 2 s @ 100 · ≤ 8 s @ 1k recipients | **Yes** (100 tier) | PERF-12 | provider timing. **Current 10/100/1000 p95: 67.36/68.42/143.29 ms PASS.** |

Gate command for the test-backed budgets (run before claiming any PERF row PASS):

```bash
bunx vitest run \
  tests/vitest/project-publication-public-repository.test.ts \
  tests/vitest/share/share-page-get-routes-contract.test.ts \
  tests/vitest/shared-link-activity-benchmark.test.ts \
  tests/vitest/project-publication-comments.test.tsx \
  --maxWorkers=1
bun run type-check
```

Owner-lane: **Performance lane** owns capturing every budget number; **Database lane** owns the snapshot/
rotate-cost numbers and the §5 `EXPLAIN` output; **Release lane** flips the beta-blocking gates in
[`99_QUALITY_SCORECARD_AND_SIGNOFF.md`](99_QUALITY_SCORECARD_AND_SIGNOFF.md).

## 4. Quick wins vs high-blast-radius optimizations

Quick wins:

- Preserve non-blocking telemetry writes on the `/api/share/[token]` GET response path.
- Preserve non-blocking recipient session-start analytics on the `/session` response path.
- Keep the canonical comment response path so successful comment submits do not reload the bounded comments list.
- Add measurement around snapshot byte size and publish/republish duration before changing data shape. Evidence: snapshot build at `src/lib/publication/actions.ts:365` through `src/lib/publication/actions.ts:481`.
- Add or confirm DB indexes for rate-limit cleanup/count paths before traffic increases. Evidence (re-anchored 2026-06-21): cleanup `delete` in `cleanupExpiredRateLimitEvents` at `src/lib/publication/public-repository.ts:292` through `src/lib/publication/public-repository.ts:298`, and the count query in `countRateLimitEvents` at `src/lib/publication/public-repository.ts:323` through `src/lib/publication/public-repository.ts:341`. (Prior `:282` pointed at `genericRateLimitMessage`, a string helper, not the DB path.) `EXPLAIN` output goes in `evidence/perf-explain-queries.md`.
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

## 5. Measurement commands and metrics

No build or browser automation was run for this audit/implementation pass. The executable beta-budget helper
contract is owned by [`91_FORWARD_EXECUTION_PLAN.md`](91_FORWARD_EXECUTION_PLAN.md) §0.1. Use these commands
to close the performance gates; the output file is the canonical evidence source for [99](99_QUALITY_SCORECARD_AND_SIGNOFF.md).

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

```bash
bun scripts/measure-shared-link-perf-budgets.ts \
  --mode recipient-session-tti \
  --samples 20 \
  --out .ai/03_plans/2026-06-20-Shared-Link-Feature/evidence/perf-budgets.md

bun scripts/measure-shared-link-perf-budgets.ts \
  --mode snapshot-bytes \
  --rows 500,2500,10000 \
  --samples 5 \
  --out .ai/03_plans/2026-06-20-Shared-Link-Feature/evidence/perf-budgets.md

bun scripts/measure-shared-link-perf-budgets.ts \
  --mode password-unlock \
  --rows 500,2500,10000 \
  --samples 20 \
  --append \
  --out .ai/03_plans/2026-06-20-Shared-Link-Feature/evidence/perf-budgets.md

bun scripts/measure-shared-link-perf-budgets.ts \
  --mode rotate-cost \
  --rows 1,10,50,100 \
  --samples 10 \
  --append \
  --out .ai/03_plans/2026-06-20-Shared-Link-Feature/evidence/perf-budgets.md
```

Supabase/Postgres measurements for the provider query-shape gate:

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

# 10 — Technical Deep Audit

> Audit date: 2026-07-12. Bundle/code-splitting, production monitoring, analytics,
> mobile/responsive, abuse/enumeration, cross-surface consistency, and
> variants/snapshot handling — the concerns the original 4-artifact pack did not
> deeply cover. Every finding cites `file:line`.

## 1. Bundle / code-splitting — NOT A RISK (confirmed)

### 1.1 The 1,978-line `actions.ts` does NOT ship to the client
`src/lib/publication/actions.ts:1` is `"use server"`. Per the installed Next.js docs:
- `node_modules/next/dist/docs/01-app/02-guides/server-actions.md:78`: *"At build time, the `'use server'` directive tells the compiler to swap the function's implementation in client bundles for a reference (an action ID plus a dispatcher)… The implementation stays on the server."*
- `:84`: *"Unused Server Functions are stripped from client bundles so they have no public endpoint."*

So `ProposalRow.tsx:17` importing `openRecipientProposalAction` ships **only an encrypted action ID + dispatcher stub** — not the 1,977-line body, not the other 15 actions, not the heavy server imports (`node:crypto`, D1 clients, email clients). **My original concern was wrong; this is a non-issue.**

### 1.2 All proposals-tree imports are clean
Every `@/lib/publication/*` and `@/lib/recipient-proposals/*` import in the proposals tree is either a server-action reference (value, but ships only an ID) or a `type`-only import (erased at compile). `proposals-data.tsx` is a clean RSC; `recipient-proposals-repository.ts` correctly declares `"server-only"`.

### 1.3 Minor: no `dynamic()` code-splitting
Zero `next/dynamic` imports in the proposals tree (vs projects page which lazy-loads 3 modals). Low impact today given the small tree; worth noting if `ProposalRow` grows.

## 2. Production error monitoring — ONE MAJOR GAP

### 2.1 Inventory
No Sentry/LogRocket/Datadog/Bugsnag. Mechanisms that exist:
- `postClientErrorReport` → `POST /api/internal/client-error` → D1 + console (`src/lib/observability/client-error-report.ts:55`). Used by `global-error.tsx:20` and `WorkshopRouteErrorState.tsx:34`.
- `logAppError`/`emitLogRecord` → **dev ndjson only** (`logger.ts:57-62` gates to non-prod); in prod only `console.error/warn/info`.
- `instrumentation.node.ts:7` `onRequestError` → `logAppError` → console.
- Cloudflare Workers observability: `wrangler.jsonc:98-112` — logs enabled 100% sampling + persist; **traces disabled**; no `tail_consumers` (logs live in CF dashboard, not shipped externally).
- `reportRealtimeEvent` and `recordExpressComponentEvent` are **dev console stubs, never wired to a prod sink**.

### 2.2 The inbox swallowed-error is COMPLETELY SILENT in production [HIGH]
`recipient-proposals-repository.ts:160-162` — bare `catch`, no binding, **no `logAppError`, no `emitLogRecord`, no `console.error`, no analytics**. No logger is even imported (only `server-only`, `getCurrentUserContext`, `getCloudflareD1Database`, `traced`). A D1 outage or SQL regression = broken inbox with **zero operator visibility** beyond a user report. This is the single largest production-readiness gap in the inbox. (Already P2-2 in `02`; elevated emphasis here.)

### 2.3 Route error boundary reports — but only render-path errors
`WorkshopRouteErrorState.tsx:33-40` calls `postClientErrorReport`. But the React Query refresh path (`proposals-page-client.tsx:31-35`) catches failures client-side and shows a toast **without calling `postClientErrorReport`**. A recipient who loads the inbox successfully but cannot refresh gets zero production signal.

### 2.4 New bug: P2-10
Client-side refresh failure (`proposals-page-client.tsx:79,98-108`) triggers no `postClientErrorReport`. Add it alongside the existing error-state render.

## 3. Analytics / telemetry — INBOX IS DARK [HIGH]

### 3.1 Inventory
- GA4 + Microsoft Clarity mounted **only on public pages** via `PublicPageShell`/`LandingAnalyticsLoader`. **Not in the workshop layout** → `/workshop/proposals` has zero client-side analytics.
- No PostHog/Vercel Analytics/Plausible.
- `project_publication_events` + `recordProjectPublicationEvent` = share-surface product analytics (open/password events). **Not fired from the inbox.**
- `shared_link_events` = a per-recipient event schema (`open`/`comment_add`/`accept_decision`/`decline_decision`) — **but it is write-dead** (see 3.3).

### 3.2 Inbox funnel is unmeasurable [HIGH]
No "inbox viewed" event, no "proposal opened from inbox" event (the open is attributed to the share surface's `page_visit`), no "decision submitted from inbox" event. The inbox → open → decision funnel **cannot be measured**. For a startup preparing for first users, this is a significant GTM blind spot.

### 3.3 `shared_link_events` is write-dead [MEDIUM]
`insertSharedLinkEvent` is defined at `d1-store.ts:433-461` but has **zero callers** (grep confirms). The decision route (`/api/share/[token]/decision`) and comment route write to data tables and emit `console` logs but never call `insertSharedLinkEvent`. So despite a carefully designed per-recipient funnel schema, the table is always empty. You cannot answer "how many recipients who opened also decided."

### 3.4 New bugs
- **P2-11** — no inbox-side analytics (view/open-from-inbox events). Cannot measure the recipient funnel.
- **P2-12** — `shared_link_events` is write-dead; the per-recipient decision/comment funnel schema records nothing.

## 4. Mobile / responsive — SOUND BUT BASIC

### 4.1 Current state
`ProposalRow.tsx` uses only **two** `md:` breakpoints (`:86` grid, `:152` button `w-full md:w-auto`). No `sm:`/`lg:`/`xl:`, no `@media(hover:none)` touch adaptation, no `content-visibility`. At 375px it stacks to one column — **gracefully** (all chip/meta rows use `flex-wrap min-w-0`; error paragraph capped `max-w-[18rem]`; Review button is full-width). Viewport meta is correct (`layout.tsx:9-13`).

### 4.2 Gap vs projects page
`LiveProjectCard.tsx` is far more sophisticated: `sm`/`md`/`lg` ladder, `[@media(hover:none)]` touch adaptation, `[content-visibility:auto]` scroll perf, progressive column disclosure. The proposals page is noticeably less polished responsively.

### 4.3 No mobile tests
`tests/vitest/recipient-proposals-page.test.tsx` has zero viewport/breakpoint/mobile assertions. No Playwright visual test at mobile width.

### 4.4 New bug: P3-9
Responsive design is single-breakpoint (`md`) with no touch adaptation or content-visibility — less polished than `LiveProjectCard`. The redesign (`05` Track B) should adopt the `sm`/`md`/`lg` + `@media(hover:none)` ladder. Not a defect in the current mobile layout (which works), but a polish gap.

## 5. Abuse / enumeration / rate-limiting — TWO REAL GAPS

### 5.1 Share surface is well-covered
`src/lib/publication/public-repository.ts` has 13 rate-limit functions covering password (5/hr + progressive delay), opens/events (60/min), comments (5/min, 20/hr), decisions (5/min), session start (10/min, 50/hr), unsubscribe (5/min, 20/hr), export (12/min, 120/hr). All enforced. ✓

### 5.2 `openRecipientProposalAction` is NOT rate-limited — enumeration oracle [HIGH]
`actions.ts:304-380`: no `checkRecordedRateLimit` anywhere. A logged-in user can submit arbitrary `publicationId` UUIDs as fast as the server-action round-trip allows. UUIDs are 122 bits (blind guessing impractical), **but the action returns distinct errors that form an enumeration/membership oracle:**

| Outcome | Error | Reveals |
|---|---|---|
| Not a recipient | `not-a-recipient` | "doesn't exist OR not mine" |
| Exists but unavailable | `unavailable` | "exists, IS mine, but revoked/expired" |
| DB error | `unknown` | nothing |
| Not UUID | `invalid` | nothing |

The `not-a-recipient` vs `unavailable` distinction **leaks existence + status**. Combined with no rate limit, a user with candidate UUIDs (from logs/screenshots/URL leaks) can classify each. Timing also differs (the second `project_publications` SELECT at `:334-345` only runs when auth succeeds).

### 5.3 `listRecipientProposals` / `loadRecipientProposals` not rate-limited [MEDIUM]
A malicious client can bypass React Query and spam the server action to hammer D1 with the 4-join + lateral-subquery query. Bounded (LIMIT 50, indexed on `lower(email)`), so medium-low, but no application-level DoS protection.

### 5.4 New bugs
- **P1-6** — `openRecipientProposalAction` has no rate limit AND returns distinct errors forming an enumeration/membership oracle. Fix: collapse `not-a-recipient` + `unavailable` into one generic error + add a per-user/per-IP rate limit.
- **P2-13** — `loadRecipientProposals` has no rate limit (authenticated DoS vector against a 4-join D1 query).

## 6. Cross-surface decision consistency — ONE CRITICAL DIVERGENCE

### 6.1 Decision propagates correctly (good)
Inbox reads latest `shared_link_responses.decision` (`recipient-proposals-repository.ts:138-146`, `ORDER BY created_at DESC LIMIT 1`). Share surface writes to the same table (`submitClientResponse` `d1-store.ts:791-810`). After refetch, the inbox reflects the decision. ✓

### 6.2 D1 vs Postgres uniqueness divergence [CRITICAL]
- **D1 path** (`d1-store.ts:760-765`): app-level pre-check `SELECT … WHERE recipient_id=? AND publication_id=?`; if exists returns null. Then `INSERT` a fresh UUID. **No DB-level unique constraint** on `(recipient_id, publication_id)` in D1 (`0014:149-151` is non-unique). Under concurrency, two submissions can race past the pre-check → **two rows inserted** → "Decision submitted" could flip to whichever has the later timestamp.
- **Postgres path** (`supabase/migrations/20260616094500…sql:220-226`): `INSERT … ON CONFLICT (recipient_id, publication_id) DO NOTHING` — DB-enforced first-write-wins.

### 6.3 New bug: P1-7
D1 has no unique constraint on `shared_link_responses(recipient_id, publication_id)`; the app-level duplicate check (`d1-store.ts:760`) races under concurrency. Fix: add a D1 migration with `CREATE UNIQUE INDEX … ON shared_link_responses(recipient_id, publication_id) WHERE recipient_id IS NOT NULL` and make the INSERT `INSERT OR IGNORE` (or catch the constraint violation).

### 6.4 Decision finality — UI-locked (good)
`SharePageDecision.tsx` locks after first submit (`:209,350-377`); no un-Accept flow; 409 "already submitted" refetches and closes. A recipient cannot reverse a decision through any supported flow. ✓

## 7. Variants / snapshot_version / revisions

### 7.1 `snapshot_version` bumping (good)
- `replace_project_publication`: `coalesce(max(snapshot_version),0)+1` across all rows for the project (monotonic per project).
- `rotate_project_publication_credentials`: bumps in place on the same row.

### 7.2 Republish = supersede (new row, old revoked); rotate = in-place update
- Republish (`20260621133000…sql:104-143`): `UPDATE … SET status='revoked'` then `INSERT` new row. Old row stays as `revoked`.
- Rotate (`20260616094500…sql:45-54`): `UPDATE` same row (keeps recipient FK bindings).

### 7.3 Inbox can show TWO rows for the same project [MEDIUM]
The inbox query (`recipient-proposals-repository.ts:128-150`) filters `status IN ('published','expired','revoked')` but does NOT de-dupe by `project_id`. The partial unique index `idx_project_publications_one_published_per_project WHERE status='published'` allows unlimited revoked/expired rows. **So a recipient on v1 (revoked) who is re-invited to v2 (published) sees two inbox rows for the same project** — one "Revoked," one "New." The `LIMIT 50` means a heavily-republished project could crowd out others. Recipients are NOT migrated on republish.

### 7.4 New bug: P2-14
Inbox shows multiple rows per project across versions (revoked v1 + published v2). Fix: either (a) collapse to latest-per-`project_id` in the SQL, or (b) migrate recipient rows on republish. Needs a DEC-AUTO (does the recipient want to see history, or only the latest?).

### 7.5 Snapshot is frozen at publish (good)
`buildSnapshotForProject` (`actions.ts:609-733`) reads estimate data once, serializes to `snapshot_json`. Read path (`resolveProjectPublicationSnapshotByToken`) reads `snapshot_json`, never re-joins live estimates. **Recipients always see the version they were invited to.** ✓ Decision/comment paths lock to `expectedSnapshotVersion` (`d1-store.ts:746-748`, returns 409 on mismatch). ✓

### 7.6 Revision comparison — correctly absent
No diff/compare feature exists. Correctly classified Enterprise MVP P1 (`ENTERPRISE-P1-PROD-001`). The `snapshot_version_at_comment`/`snapshot_version_at_decision` columns record version context for future diff work. ✓

## 8. Summary of new bugs introduced by this deep audit

| ID | Bug | Severity | New track/unit |
|---|---|---|---|
| P1-4 | Recipient removal leaves PII behind (SET NULL, not anonymize) | P1 | Track A (privacy) |
| P1-5 | `project_publication_events` has no retention TTL | P1 | Track A (retention) |
| P1-6 | `openRecipientProposalAction` no rate limit + enumeration oracle | P1 | Track A (security) |
| P1-7 | D1 `shared_link_responses` no unique constraint → race can flip decision | P1 | Track A (data integrity) |
| P2-8 | Console log path leaks un-redacted record | P2 | Track A (privacy) |
| P2-10 | Client refresh failure emits no production signal | P2 | Track A (observability) |
| P2-11 | No inbox-side analytics | P2 | Track B or separate |
| P2-12 | `shared_link_events` is write-dead | P2 | Track A or separate |
| P2-13 | `loadRecipientProposals` no rate limit | P2 | Track A (security) |
| P2-14 | Inbox shows multiple rows per project across versions | P2 | Track A or B |
| P3-9 | Mobile responsive is single-breakpoint, less polished than projects | P3 | Track B |

**Total bugs in the pack now: 25** (was 14). The deep audit added **4 new P1s** and **6 new P2s** and **1 new P3** — validating the honest "no, I'm not 100% satisfied" answer. The original pack covered architecture and surface defects well but missed privacy, enumeration, data-integrity, observability, and analytics gaps that matter for first users.

## 9. Confirmed non-issues (my original concerns that turned out fine)
- **The 1,978-line `actions.ts` import does NOT bloat the client bundle** — server actions ship only an encrypted ID. (My original concern was wrong.)
- Share-surface rate limits are comprehensive.
- Decision finality is UI-enforced.
- Snapshot is correctly frozen; version locking works.
- Mobile layout works at 375px (just basic).
- Revision/diff correctly absent for beta.

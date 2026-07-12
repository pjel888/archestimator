# 02 — Findings: Performance + Correctness Bugs

> Severity: **P0** correctness/security/data · **P1** real bug w/ user impact or notable
> perf · **P2** quality/consistency/tech-debt · **P3** minor/nit. All citations
> `file:line` vs commit `2dab33405d`.

## Performance

### PERF-1 — No virtualization in tree views [P1]
**Evidence:**
- `src/components/workshop/workshop-tree.tsx:237-259` — `WorkshopTree` recurses
  unconditionally over all expanded children; every expanded node + every inline row
  is mounted.
- `src/components/share/ShareEstimateTreeView.tsx:100-196` — inline rows rendered
  per node, capped at `DESKTOP_INLINE_ROW_LIMIT = 250` / `MOBILE_INLINE_ROW_LIMIT = 100`.
- `src/components/share/ShareEstimateTreePanel.tsx:356-358` — "Expand All" is one
  click and **uncapped**.
- Performance budget doc (`27-performance-budget-and-regression-gates.md`) rule #2/#3:
  *"large trees … must NOT bloat initial public/workshop route bundles"* and *"every
  feature touching … share receiver … must include a benchmark."*

**Impact:** On a sheet with hundreds of nodes / thousands of rows all expanded, DOM
size balloons → slow first paint, janky scroll, high memory on mobile (the receiver
surface is often 320–390px inside email/browser chrome).

**Fix shape (UNIT-9):** virtualize the flattened expanded-node list (e.g.
`@tanstack/react-virtual` — already a TanStack shop) or cap "Expand All" + lazy-mount
children on expand. Measure bundle impact per budget rule #1.

### PERF-2 — Entire snapshot embedded in SSR HTML [P2, monitor]
**Evidence:** `src/app/share/[token]/page.tsx:343-352` passes `snapshot.estimates`
straight into `<ProjectPublicationView>` → `ShareReviewWorkspace`. The full estimate
tree + all rows ship inline in the RSC payload. No client fetch on first paint.

**Trade-off:** This is *good* for first paint (no waterfall) but means the HTML
document size scales with snapshot size. For a proposal with thousands of rows this
is a large initial document. Not a bug today; flag for monitoring. If snapshot sizes
grow, consider streaming the tree and lazy-loading off-screen estimates/tabs.

### PERF-3 — Duplicate snapshot read on the write path [P2]
**Evidence:** `insertSharedLinkComment` calls `resolvePublicationContextByTokenHash`
(1 SELECT with `snapshot_json`), then `insertClientComment` re-SELECTs the publication
by `token_hash` again for the optimistic-version check (`d1-store.ts:657-665`). Same
pattern in `submitClientResponse`. Two reads of the same row per comment/decision.

**Fix shape:** Pass the already-resolved snapshot/version into the store method, or
read only the version column on the second pass.

### PERF-4 — Per-isolate rate-limit cleanup [P3]
**Evidence:** `lastRateLimitCleanupAt` / `rateLimitCleanupPromise`
(`public-repository.ts:308-310`) are module-level. On Cloudflare Workers each isolate
has its own copy, so the 60s cleanup throttle is per-isolate, not global. Not a bug,
but the comment implies a stronger guarantee than reality.

### PERF-5 — Loading skeleton drift [P3]
**Evidence:** `src/app/share/[token]/loading.tsx:47` grid track is 280px; real panel
is 260px (`SharePageTabs.tsx:917`). Skeleton also has a 6-cell stats grid with no real
counterpart and no donut placeholder → minor CLS.

## Correctness bugs

### BUG-1 — Cross-widget cache staleness [P1]
**Evidence:** Zero `invalidateQueries` calls across all three widgets:
- `src/components/share/SharePageComments.tsx` — optimistic add/confirm/revert only.
- `src/components/share/SharePageDecision.tsx:330-341` — updates local reducer only.
- `src/components/share/SharedLinkActivityFeed.tsx` — no invalidation.

**Impact:** Posting a comment updates the comments list but the activity widget (if
mounted) and decision widget stay stale until window refocus/manual refresh.

**Fix shape (UNIT-6):** After a successful comment POST, invalidate
`["share-activity"]`. After a successful decision POST, invalidate `["share-comments"]`
and `["share-activity"]`.

### BUG-2 — Silent tree degradation at >500 rows [P1]
**Evidence:** `src/lib/share/reconstruct-share-tree.ts:29` `MAX_ROWS_FOR_TREE = 500`;
`:352-354` flips to `reconstructTreeByDiscipline` with no user signal. A 499-row and
501-row sheet render structurally completely different.

**Fix shape (UNIT-5):** Either (a) raise/remove the cap now that the snapshot carries
real `treeNodes` (rung 1 doesn't need the cap — it's only the fallback rungs that are
O(n²)-ish), or (b) surface a non-blocking "Showing grouped by discipline (large
sheet)" notice. Prefer (a): the cap was a guard for the fragile designation parser;
rung 1 (snapshot nodes) has no such cost.

### BUG-3 — Decision has no undo / change-response; drafts not persisted [P1]
**Evidence:**
- `src/components/share/SharePageDecision.tsx:350-377` — once `decided` is truthy,
  the button row is replaced by a locked badge. No undo control.
- Decision drafts (note + signer name) have **no sessionStorage mirror**, unlike
  comment drafts (`SharePageComments.tsx:326-334`). A stale-snapshot 409 mid-decision
  forces `window.location.reload()` (`SharePageDecision.tsx:311`) and loses the typed
  note.

**Fix shape (UNIT-7):** (a) Persist decision drafts in sessionStorage keyed by token.
(b) Decide owner-policy on undo: the server keeps "latest" decision
(`getLatestRecipientDecision`, `public-repository.ts:942`) but the unique index allows
only one row — an "undo" would need an update path or a soft-reopen. Record as a
product decision in the unit.

### BUG-4 — Designation-text delimiter fragility [P2]
**Evidence:** `src/lib/share/reconstruct-share-tree.ts:36`
`DELIMITER_REGEX = /\s*[>\/\-–—]\s*/`. Hyphens/slashes collide with real names
(`"2-Drawer Cabinet"`, `"Half-bath"`, `"A-Frame"`). Masked for modern snapshots (rung
1) but bites pre-v1.1 snapshots or any case where `treeNodes` is absent. Siblings are
also re-sorted alphabetically (`:176`), losing workshop order.

**Fix shape:** Since rung 1 (snapshot nodes) is the authoritative path and is robust,
the designation parser is only a legacy fallback. Tighten the regex to require
whitespace around the delimiter (`/\s+[>\/\-–—]\s+/`) and document it as
legacy-only. Low priority once BUG-2's cap is addressed.

### BUG-5 — `activeNodeId` highlight path is dead in production [P2]
**Evidence:** `ShareEstimateTreeView` supports `activeNodeId`
(`ShareEstimateTreeView.tsx:85-86,207`) but `SharePageTabs` always passes
`activeNodeId={undefined}` (`SharePageTabs.tsx:923`). Panel→view scroll works
(`handleTreeNavigate` `:288-293`), but the destination node is never visually
highlighted.

**Fix shape (UNIT-11):** Wire `activeNodeId` state in `SharePageTabs`, set it on
`handleTreeNavigate`, clear on manual scroll/estimate switch. One-line-per-change UX
polish.

### BUG-6 — Optimistic append vs server ordering jitter [P2]
**Evidence:** Optimistic comments appended at end (`SharePageComments.tsx:195`),
then `commentConfirmed` replaces temp id in place (`:200-208`). Server list is
oldest→newest (`public-repository.ts:905`). On `refetchOnWindowFocus`, the list
re-sorts by server `created_at` and a comment may visibly "jump."

**Fix shape:** Acceptable for now (visual only, not a data bug). If it bothers users,
match the optimistic `created_at` to server ordering or suppress refetch-reorder
while an optimistic item is unconfirmed.

### BUG-7 — Password failure backoff blocks the worker [P2]
**Evidence:** `src/app/api/share/[token]/password/route.ts:103-105`
`await new Promise(resolve => setTimeout(resolve, delayMs))` for up to 30s. Consumes
wall-clock/CPU budget on the request. Naive anti-brute-force that the durable
rate-limit already covers.

**Fix shape (UNIT-11):** Drop the blocking sleep; rely on the D1-backed rate limit
(5/hr + backoff delays returned to caller). Or cap the sleep to a small constant.

### BUG-8 — Manager mutations throw on D1 error with no recovery [P2, cross-ref]
**Evidence:** Confirmed in sibling Publisher pack (BUG-3). `assertProjectPublicationManager`
and manager mutations throw on D1 error with no try/catch; `usePublisherDrawer` has no
`onError`. A D1 blip surfaces as an unhandled error. Mentioned here because the share
preview route (`/workshop/publisher/preview/[projectId]`) reuses `ShareReviewWorkspace`.

### BUG-9 — Dead/aspirational snapshot schema [P2]
**Evidence:** `issuance` block (`types.ts:121-134`) is declared but never populated
by `buildProjectPublicationSnapshot` (grep confirms no write path). `schemaVersion: 1.2`
is never produced (builder emits only `1` or `1.3`, `snapshot.ts:504`). Consumers
never see these. Dead schema that can mislead future agents.

**Fix shape (UNIT-11):** Either populate `issuance` (it carries useful proposal
identity: issue number, version, assumptions, exclusions) or remove the type +
document the deprecation.

### BUG-10 — Dead store methods [P3]
**Evidence:**
- `listPublicComments` (`d1-store.ts:518-531`) — no callers (activity/comment loaders
  use `listPublicActivityComments` / `loadSharedLinkPublicComments`).
- `markRecipientOpened` non-activation variant (`d1-store.ts:372-383`) — only
  `markRecipientOpenedWithActivation` is called.
- `insertSharedLinkEvent` (`d1-store.ts:433-458`) — appears unused by public routes.

**Fix shape (UNIT-11):** Confirm with a final grep at execution time, then delete.

### BUG-11 — Type weaknesses / unsafe casts [P3]
**Evidence:**
- `public-repository.ts:686,1004,1043,1091` cast `snapshot_json as ProjectPublicationSnapshot`
  with no runtime validation.
- `public-repository.ts:820,847` redundant `pub as PublicationLookupRow` casts.
- `activity/route.ts:80` `request as unknown as Request`.

**Fix shape (UNIT-11):** Add a lightweight runtime guard (zod or hand-rolled) on the
snapshot read path; remove redundant casts.

### BUG-12 — Code duplication across comment + decision routes [P3]
**Evidence:** `parseCookieValue`, `readSessionPayload`, `getIpHash`, `logStructured`,
`readOptionalReviewTargetId`, `scheduleOwnerDigest`, `readErrorMessage`, and the
`PUBLIC_REVIEW_TARGET_ERROR_MESSAGES` / `CANONICAL_UUID_PATTERN` /
`PUBLIC_REVIEW_TARGET_ID_PATTERN` constants are copy-pasted verbatim between
`comment/route.ts` and `decision/route.ts`.

**Fix shape (UNIT-11):** Extract to a shared `src/lib/publication/route-helpers.ts`.

### BUG-13 — Supabase-pattern residue in admin write path [P3, informational]
**Evidence:** `createPublicationAdminD1Client` (`actions.ts`) still uses a
Supabase-style `.from().select().eq().maybeSingle()` chained client layered over D1.
Comments reference "Security Definer style" (`actions.ts:1059-1061`) and
"service role bypasses RLS" (`actions.ts:1844`) — RLS is a Postgres concept; on D1
there is no RLS, so those comments describe intent, not enforced behavior.
Authorization is enforced in app code. Not a bug; flag for doc accuracy.

## Security (share-page-specific)

### SEC-1 — No explicit Cache-Control on the HTML page route [P1]
**Evidence:** `src/app/share/[token]/page.tsx:35` `export const dynamic = "force-dynamic"`
but **no `Cache-Control: no-store` header** is set on the page response. API routes
set it (`api/share/[token]/route.ts:16-18`). A password-unlocked page's HTML could be
CDN-cached if edge rules are loose. (Also flagged as SEC-1 in the sibling Publisher
pack.)

**Fix shape (UNIT-8):** Set `Cache-Control: no-store` on the page response (via
`headers()` export or middleware). Low-risk, high-value.

### SEC-2 — Snapshot read lacks runtime shape validation [P2]
See BUG-11. A corrupted `snapshot_json` is cast unchecked. Defense-in-depth: add a
guard.

### SEC-3 — viewToken is client-provided (soft binding) [P3, informational]
**Evidence:** `viewToken` is a client-provided string used to detect stale snapshots
(`comment/route.ts:311-336`). It IS validated via `readPublicationViewSnapshotVersion`
against token+publication, so not a pure trust issue. Documented for completeness.

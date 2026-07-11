# IMPLEMENTATION_PLAN.md — Canonical Execution Artifact

This is the sole canonical implementation plan. Every `UNIT-*` is an execution
unit packet runnable from bounded context. Units follow the dependency DAG in
`plan-pack.json`. The workstreams below are presentation and file-ownership
groups, not implicit dependency barriers; only explicit `depends_on` edges in
this document and the manifest establish execution dependencies.

## Status

`implementation_status=COMPLETE`, `package_status=IMPLEMENTATION_READY`.
The dependency-closed `SLICE-001` contains five unaffected `READY` units:
`UNIT-001`, `UNIT-002`, `UNIT-003`, `UNIT-006`, and `UNIT-010`. The other 18
units are `PLANNED` because their current contracts overlap, depend on, or
finalize work affected by Program `PUB-DELTA-01..04`; `UNIT-008` also requires a
current durable migration-generation receipt. The exact resume point is
`UNIT-001`. Criteria and gates remain `FAIL` until implementation evidence is
collected. Last observed scope is `PLAN_ONLY`; action ceiling is `IMPLEMENT_LOCAL`.

## Execution DAG

```text
Workstream A — Security hardening (serialized across shared route/repository files)
  UNIT-001 body-size limits (SEC-001) [READY]
  UNIT-002 status-code consistency (SEC-002) [READY]
  UNIT-003 durable decision rate-limit authority (SEC-003) [READY]
  UNIT-005 snapshot reentrance fix (SEC-005) [PLANNED: delta overlap]
  UNIT-006 runtime/provider secret readiness (SEC-006) [READY]
  UNIT-007 dead code removal (SEC-007) [PLANNED: funnel telemetry overlap]

Workstream B — Data
  UNIT-004 comment pagination (SEC-004) [PLANNED: recipient/comment delta overlap]
  UNIT-008 fail-closed FK migration (DATA-001) [PLANNED: delta + migration receipt]
  UNIT-009 roster GROUP BY optimization (DATA-002, PERF-002) [PLANNED; depends on UNIT-008]

Workstream C — Publisher UX
  UNIT-010 terminology + sidebar label (REQ-004) [READY]
  UNIT-011 ShareWizard (REQ-001, REQ-002) [PLANNED; depends on UNIT-010]
  UNIT-012 publisher roster cards + pagination (REQ-005, REQ-006, REQ-007) [PLANNED; depends on UNIT-010 and UNIT-011]
  UNIT-013 dashboard publish CTA (REQ-008) [PLANNED; depends on UNIT-011]
  UNIT-014 preview-as-client (REQ-003) [PLANNED; depends on UNIT-011]

Workstream D — Shared link UX
  UNIT-015 share page header + status + branding (UX-002, UX-009) [PLANNED; depends on UNIT-010]
  UNIT-016 sticky decision bar + session banner fix (UX-001, UX-003) [PLANNED; depends on UNIT-010]
  UNIT-017 estimate table row-action redesign (UX-005) [PLANNED; depends on UNIT-010]
  UNIT-018 comments improvements (UX-006) [PLANNED; depends on UNIT-004]
  UNIT-019 print button + currency + misc share fixes (UX-007, UX-008, UX-010, UX-011) [PLANNED; depends on UNIT-010]
  UNIT-020 password gate improvements (UX-010) [PLANNED; depends on UNIT-010]

Workstream E — Recipient inbox + share-page extras
  UNIT-021 inbox dead-end + fail-closed integrity + email-mismatch (UX-012) [PLANNED]
  UNIT-023 mobile tree nav + JS-disabled fallback + signer-name (UX-013, UX-016, UX-019) [PLANNED; depends on UNIT-010 and UNIT-017]

Workstream F — Integration
  UNIT-022 full integration verification + receipts [PLANNED; depends on all other units]
```

## Critical Path

```text
UNIT-010 (terminology) → UNIT-011 (wizard) → UNIT-014 (preview) → UNIT-022
UNIT-008 (migration) → UNIT-009 (query optimization)
UNIT-018 (comments) depends on UNIT-004 (pagination)
```

The tied longest chains are `UNIT-010 → UNIT-011 → UNIT-012 → UNIT-022`,
`UNIT-010 → UNIT-011 → UNIT-013 → UNIT-022`,
`UNIT-010 → UNIT-011 → UNIT-014 → UNIT-022`, and
`UNIT-010 → UNIT-017 → UNIT-023 → UNIT-022`. These chains describe
explicit manifest edges only; workstream membership adds no edge.

## Unit Packets

---

### UNIT-001: Bounded request bodies on public POST routes

**Goal:** Enforce route-specific limits on bytes actually read, independent of
`Content-Length`.
**Linked requirements:** SEC-001, AC-040
**Non-goals:** Changing authorization or mutation semantics after successful parse.
**Exact paths and current symbols:**
- `src/app/api/share/[token]/password/route.ts` — POST handler
- `src/app/api/share/[token]/comment/route.ts` — POST handler
- `src/app/api/share/[token]/decision/route.ts` — POST handler
- `src/app/api/share/[token]/session/route.ts` — POST handler
- `src/app/api/share/[token]/unsubscribe/route.ts` — POST handler (form-data)
**Dependencies:** None.
**Owned scope:** The five route files above + `src/lib/http/read-bounded-body.ts`.
**Approach:**
1. Create a typed streaming reader that counts actual bytes, cancels immediately
   above the limit, and returns bytes only after a bounded read.
2. Reject unsupported non-identity `Content-Encoding` with 415.
3. Decode JSON/form data from the returned bytes; never call `request.json()` or
   `request.formData()` first.
4. Limits: password 256 B, session 256 B, comment 2 KiB, decision 4 KiB,
   unsubscribe 1 KiB.
**Expected postconditions:** Oversized requests return 413 even when the length
header is absent, invalid, truthful, or understated; chunked bodies cannot bypass.
**Test/proof:** `bun test tests/vitest/publication-body-size.test.ts` covers every
route, exact/over boundaries, misleading headers, chunked streams, encoding, and
early cancellation.
**Evidence class:** automated test.
**Failure response:** Any reader/decoder ambiguity fails closed with a typed 400,
413, or 415 and no mutation call.
**Checkpoint/resume:** This unit is self-contained; no intermediate checkpoint.

---

### UNIT-002: Status-code consistency (423 for password-required)

**Goal:** Comment GET and decision GET return 423, not 401, for password-required.
**Linked requirements:** SEC-002, AC-041
**Exact paths:** `comment/route.ts:193`, `decision/route.ts:150`
**Approach:** Change `401` to `423` and update the error body to match other routes.
**Test/proof:** `tests/vitest/publication-status-codes.test.ts` — assert 423 from
both GETs when password required and no cookie.
**Evidence class:** automated test.

---

### UNIT-003: Durable decision admission authority

**Goal:** Make the existing D1-backed decision rate limiter the explicit
cross-isolate authority and remove any claim that module state is global.
**Linked requirements:** SEC-003, AC-042
**Exact paths:** `src/app/api/share/[token]/decision/route.ts`,
`src/lib/publication/public-repository.ts` (`checkSharedLinkDecisionRateLimit`),
`src/app/api/share/[token]/comment/route.ts`,
`tests/vitest/project-publication-decision.test.tsx`, and
`tests/vitest/publication-comment-isolate-shedding.test.ts`.
**Approach:**
1. Preserve the durable limiter call before decision mutation and normalize its
   status and retry metadata.
2. Retain comment shedding in `comment/route.ts`; consolidate the current local
   counters/pruning/open-state functions behind the route-local
   `bestEffortIsolateFailureShedding` helper. Do not extract a shared module.
   Document and test that isolate lifecycle resets this optional shedding state.
3. Do not add a process-global singleton or claim cross-isolate parity from it.
**Test/proof:** `bunx vitest run tests/vitest/project-publication-decision.test.tsx
tests/vitest/publication-comment-isolate-shedding.test.ts` proves durable denial
happens before mutation and two isolated route modules do not share optional
local state. Persist the redacted receipt at
`.ai/99_scratch/publisher/unit-003-admission.json`.
**Evidence class:** automated test.

---

### UNIT-004: Comment cursor pagination

**Goal:** Replace the 200-cap on `loadSharedLinkPublicComments` with cursor pagination.
**Linked requirements:** SEC-004, AC-043, AC-044
**Exact paths:** `src/lib/publication/public-repository.ts:868`,
`src/app/api/share/[token]/comment/route.ts:GET`,
`src/components/share/SharePageComments.tsx:SharePageCommentsInner,SharePageComments`,
and `src/lib/publication/activity-helpers.ts:encodeSharedLinkActivityCursor,
parseSharedLinkActivityCursor,decodeSharedLinkActivityCursor,
isBeforeSharedLinkActivityCursor,sharedLinkActivityCursorFilter`.
**Approach:**
1. Add `loadSharedLinkPublicComments(publicationId, {cursor, limit})` returning
   `{comments, hasMore, nextCursor}`.
2. Reuse the five named cursor helpers from `activity-helpers.ts` unchanged.
3. Update the comment GET route to accept `?cursor=` and return pagination fields.
4. Update `SharePageComments` with a `Load more` button that preserves the
   current list and disables while loading. Do not implement infinite scroll.
**Dependencies:** None (but UNIT-018 comments UX depends on this).
**Test/proof:** `bunx vitest run tests/vitest/publication-comment-pagination.test.ts
tests/vitest/project-publication-comments.test.tsx
tests/vitest/project-publication-public-repository.test.ts`; persist the receipt
at `.ai/99_scratch/publisher/unit-004-comment-pagination.md`.
**Evidence class:** automated test + DOM test. The `Load more` interaction is
covered by `project-publication-comments.test.tsx`; no browser proof is claimed.

---

### UNIT-005: Snapshot sanitization reentrance fix

**Goal:** Remove module-global mutable `currentSanitizeIdMaps`; pass ID map as parameter.
**Linked requirements:** SEC-005, AC-045
**Exact paths:** `src/lib/publication/snapshot.ts:282` and the sanitization call chain.
**Approach:**
1. Change `currentSanitizeIdMaps` from module-level `let` to a function parameter.
2. Thread it through `sanitizeProjectPublicationSnapshotForPublicRead` and
   `createPublicationSnapshotIdMaps`.
3. Each call creates and owns its own map.
**Test/proof:** `tests/vitest/publication-snapshot-reentrance.test.ts` — two
concurrent sanitization calls, verify no ID corruption.
**Evidence class:** automated test.

---

### UNIT-006: Runtime and provider secret readiness

**Goal:** Fail release readiness when required Worker secret bindings are absent,
while retaining request-time fail-closed readers.
**Linked requirements:** SEC-006, AC-046
**Exact paths/symbols:**
- `scripts/check-cloudflare-worker-readiness.ts:DEPLOYED_WORKER_SECRET_NAMES,checkCloudflareWorkerReadiness`;
- `src/lib/publication/security.ts:readPublicationTokenEncryptionSecret,readPublicationTokenHashSecret,readPublicationAccessCookieSecret`;
- `tests/vitest/cloudflare-worker-readiness-script.test.ts`;
- `tests/vitest/project-publication-security.test.ts`;
- new `tests/vitest/publication-runtime-readiness.test.ts`.
**Approach:** Extend `bun run cf:check-readiness` for
`PUBLICATION_TOKEN_ENCRYPTION_SECRET`, `PUBLICATION_TOKEN_HASH_SECRET`, and
`PUBLICATION_ACCESS_COOKIE_SECRET`. Missing provider-secret names keep
`deploymentSecretsReady` and `deploymentReady` false; each request-time reader
throws in production when its binding/fallback is absent. Do not use a
module-import `process.env` guard as Worker startup proof.
**Test/proof:** run `bunx vitest run
tests/vitest/cloudflare-worker-readiness-script.test.ts
tests/vitest/project-publication-security.test.ts
tests/vitest/publication-runtime-readiness.test.ts`, then
`env -u CLOUDFLARE_WORKER_SECRET_LIST_FILE
-u CLOUDFLARE_WORKER_SECRET_LIST_TEXT
OUTPUT_FILE=.ai/99_scratch/publisher/unit-006-worker-readiness.json
MARKDOWN_FILE=.ai/99_scratch/publisher/unit-006-runtime-readiness.md bun run
cf:check-readiness`; assert `deploymentSecretsReady=false` and
`deploymentReady=false`. Hosted binding presence remains `NOT_EVALUATED` and is
owned by Release `UNIT-007` plus production proof.
**Evidence class:** automated test.

---

### UNIT-007: Dead route and event-contract removal

**Goal:** Remove the unconsumed events API, dead event type, and dead disabled state.
**Linked requirements:** SEC-007, AC-047
**Exact paths:** `src/app/api/share/[token]/events/route.ts` (remove),
`src/components/workshop/publisher/PublisherEmptyState.tsx`,
`src/lib/publication/public-repository.ts`, `src/lib/publication/d1-store.ts`.
**Approach:**
1. Grep for any consumer of the `events` route (`rg "api/share.*events" src/`).
   Confirm zero consumers. Remove the route file.
2. Grep for `PublisherDisabledEmptyState` imports. Confirm zero. Remove the export.
3. Remove `download_attempt_blocked` from both TypeScript event unions. UNIT-008
   removes it from the rebuilt current CHECK; migration 0014 remains immutable.
**Test/proof:** `bun test tests/vitest/publication-dead-code.test.ts` plus
`rg -n 'download_attempt_blocked|api/share.*events' src tests` returns only the
intentional zero-consumer assertion.
**Evidence class:** static review.

---

### UNIT-008: FK migration via SQLite table-rebuild pattern

**Status:** `PLANNED` until `PUB-DELTA-01..04` data impacts are incorporated and
the durable Program migration-generation artifact validates.
**Goal:** Add foreign keys to seven publication tables with a fail-closed,
transactional, explicit-column SQLite rebuild.
**Linked requirements:** DATA-001, AC-048, AC-049
**Exact paths:** `migrations/0066_publication_foreign_keys.sql` (NEW).
**Immediate precondition:** Immediately before the first migration edit, read
`.ai/03_plans/2026-07-10/Beta-Readiness-Program/MIGRATION_LEASE_GENERATION.json`
and validate its canonical receipt hash, monotonic generation, current sorted
migration-tail digest, Publisher owner package ID and manifest file/self hashes,
and the `0066_publication_foreign_keys.sql` allocation's exact path, `unclaimed`
status, allocation digest, allocation-set digest, and receipt digest. Any stale
generation, tail/manifest drift, claimed slot, path mismatch, digest mismatch,
or newly colliding migration blocks the edit; preserve consumed facts and have
the Program reissue a new generation before retrying.
**Approach:**
1. Follow the exact table order, column lists, FK actions, and CHECK change in
   `07_DATA_DATABASE_API_NETWORK_PLAN.md`; `SELECT *` is forbidden.
2. Preflight counts, canonical row SHA-256 digests, FK findings, indexes, and
   triggers. Abort on any orphan; never delete, filter, or repair it.
3. Rebuild and verify all seven tables in one transaction with FK enforcement on.
4. Postflight asserts counts/digests plus FK/index/trigger/CHECK/default/nullability
   parity before the transaction is accepted.
5. Prove clean upgrade, per-edge orphan failure, mid-copy failure rollback,
   cascade/SET NULL behavior, and reverse rebuild on disposable local D1.
**Dependencies:** None.
**Test/proof:** `bun test tests/vitest/publication-fk-migration.test.ts`.
**Evidence class:** local D1 proof.
**Rollback:** Tested reverse rebuild or D1 restore evidence; never `DROP CONSTRAINT`.

---

### UNIT-009: Roster GROUP BY optimization

**Goal:** Replace row-scan counts with SQL aggregation; add performance evaluator.
**Linked requirements:** DATA-002, PERF-002, AC-050, AC-051, AC-053
**Exact paths:** `src/lib/publisher/roster-repository.ts:477-559`.
**Approach:**
1. Rewrite `readRecipientCountsByPublicationId` to use `GROUP BY publication_id`.
2. Rewrite `readLatestCommentAtByPublicationId` and `readLatestResponseAtByPublicationId`
   to use `MAX(created_at) ... GROUP BY`.
3. Create `tests/vitest/perf/publisher-roster-evaluator.test.ts` seeding 10/50/100 pubs.
**Dependencies:** UNIT-008 (migration should be applied first for clean schema).
**Test/proof:** run `bunx vitest run
tests/vitest/perf/publisher-roster-evaluator.test.ts
tests/vitest/publisher-roster-d1-repository.test.ts
tests/vitest/publisher-roster-repository.test.ts
tests/vitest/publisher-roster-filter.test.ts
tests/vitest/publisher-roster-client.test.tsx`; persist the query-plan/budget
receipt at `.ai/99_scratch/publisher/unit-009-roster-performance.json`.
**Evidence class:** local D1 evaluator.

---

### UNIT-010: Terminology + sidebar label

**Goal:** Rename sidebar "Publisher" → "Share"; update all user-facing jargon.
**Linked requirements:** REQ-004, AC-009, AC-010
**Exact user-facing source inventory:**
- `src/components/sidebar/MainSidebar.tsx:MainSidebar`;
- `src/components/workshop/ProjectChromeAsync.tsx:ProjectPublisherHeaderActions`;
- `src/app/workshop/publisher/page.tsx:PublisherPage`;
- `src/app/workshop/publisher/error.tsx:Error`;
- `src/components/workshop/publisher/PublisherActivityFeed.tsx:PublisherActivityFeed`;
- `src/components/workshop/publisher/PublisherRosterSkeleton.tsx:PublisherRosterSkeleton`;
- `src/components/workshop/publisher/PublisherDrawer.tsx:PublisherDrawer`;
- `src/components/workshop/publisher/PublisherEmptyState.tsx:PublisherDisabledEmptyState,PublisherNoRowsEmptyState`;
- `src/components/workshop/publisher/PublisherRosterRow.tsx:PublisherRosterRow`;
- `src/components/workshop/publisher/PublisherRosterClient.tsx:PublisherRosterClient`;
- `src/components/share/SharePageTabs.tsx:SharePageTabs`.
**Approach:**
1. Change sidebar/page `Publisher` to `Share` and `NewspaperClipping` to
   `ShareNetwork`.
2. Change manager-facing `Publication` to `Shared link` and roster `Sheet scope`
   to `Estimates`.
3. Change receiver toggles `Scope outline` to `Summary` and `Line item table` to
   `Details`.
4. Keep internal identifiers, types, and file names unchanged; only user-facing
   strings and the sidebar icon change.
**Dependencies:** None (but all UX units depend on this for consistency).
**Test/proof:** run `bunx vitest run tests/vitest/publisher-terminology.test.ts
tests/vitest/main-sidebar-proposals-item.test.tsx
tests/vitest/publisher-roster-client.test.tsx
tests/vitest/publisher-activity-feed.test.tsx
tests/vitest/publisher-drawer.test.tsx
tests/vitest/project-publication-page.test.tsx`. The new terminology test parses
the exact source allowlist above and the DOM tests assert rendered text and
accessible names. Persist the reviewed mapping at
`.ai/99_scratch/publisher/unit-010-terminology.md`.
**Evidence class:** static-literal + DOM test. This copy/icon-only unit does not
require browser automation under the repository verification guardrail.

---

### UNIT-011: ShareWizard (guided publish flow)

**Goal:** Create a step-by-step publish wizard replacing the buried-tab flow.
**Linked requirements:** REQ-001, REQ-002, REQ-009, REQ-010, REQ-011, REQ-012,
REQ-013, REQ-014, REQ-016, AC-001 through AC-006, AC-055 through AC-068
**Exact paths:** `src/components/workshop/publisher/ShareWizard.tsx` (NEW),
`ShareLinkDisplay.tsx` (NEW), `PublisherRosterClient.tsx` (modified to wire wizard),
`src/app/workshop/publisher/page.tsx` (modified to forward `?wizard=`/`?step=` params).
**Approach:**
1. Create `ShareWizard` component (modal on desktop, bottom-sheet on mobile per
   REQ-012) with 4 steps: SheetSelection → AccessSettings → Generate → Success.
2. Reuse `SheetPickerList` and existing server actions (`republishProjectPublication`).
3. Reuse the **existing `RecipientEmailComposer`** component (765 lines) in the
   Success step — do NOT invent a new `RecipientQuickAdd`. The composer already
   handles email chips, send/resend/remove, and `readSharedLinkEmailDeliveryReadiness`
   degradation.
4. Create `ShareLinkDisplay` with selectable URL, labeled Copy, and progressive
   native Web Share. Do not add QR code or a package dependency.
5. Wire wizard open via URL `?wizard=<projectId>&step=<n>`. Modify `page.tsx` to
   forward these params to `PublisherRosterClient`.
6. Wire "Share" buttons (consistent verb per REQ-016) on roster cards + dashboard.
7. Handle empty-project state (AC-057: no estimates → disabled Generate + explanation).
8. Handle email-not-configured state (AC-058: show copy-link path, reuse
   `readSharedLinkEmailDeliveryReadiness`).
9. Wizard a11y (REQ-011): focus trap, `aria-live` step-change announcements (AC-060),
   focus management between steps, keyboard navigation.
10. The wizard handles BOTH first-publish AND republish (REQ-014: "Update link"
    opens the wizard pre-filled, not the buried drawer tab).
**Dependencies:** UNIT-010 (terminology).
**Test/proof:** `bun test tests/vitest/publisher-wizard.test.tsx`; targeted browser
proof is reserved for responsive focus movement and native Web Share fallback.
**Evidence class:** browser-proven (interaction flow + a11y + mobile).

---

### UNIT-012: Publisher roster cards + pagination + debounce + labeled actions

**Goal:** Replace desktop-only table with responsive cards; add pagination; debounce
search; use labeled buttons; fix aria-live noise.
**Linked requirements:** REQ-005, REQ-006, REQ-007, REQ-009, REQ-015, UX-020, UX-021,
AC-011 through AC-017, AC-055, AC-056, AC-067, AC-083, AC-084
**Exact paths:** `PublisherRosterClient.tsx`, `PublisherRosterCard.tsx` (NEW),
`PublisherPagination.tsx` (NEW), `PublisherRosterRow.tsx` (modified for table variant),
`PublisherEmptyState.tsx` (modified — `PublisherDisabledEmptyState` already removed by UNIT-007).
**Approach:**
1. Create `PublisherRosterCard` (responsive card layout with **labeled** action
   buttons per UX-020/AC-083, not icon-only).
2. Card shows the share URL persistently per REQ-009/AC-055 (selectable text or
   one-click copy with visible URL).
3. Add card/table toggle (cards default, table optional on desktop).
4. Add `PublisherPagination` (prev/next + page indicator).
5. Add 300ms debounce to search input.
6. Fix the aria-live region (AC-084: announce only most recent copy, not all pubs).
7. Remove the `<768px` hard block; cards work on mobile.
**Dependencies:** UNIT-010 (terminology), UNIT-011 (wizard wiring).
**Test/proof:** Component tests + browser proof at 375px/768px/1440px + screen reader.
**Evidence class:** browser-proven (responsive + a11y).

---

### UNIT-013: Dashboard publish CTA

**Goal:** Show unpublished manageable projects with a "Share" CTA on the dashboard.
**Linked requirements:** REQ-008, AC-018
**Exact paths:** `src/components/workshop/dashboard/WorkshopDashboard.tsx`.
**Approach:** Add a section parallel to `PublishedProjectLinks` for unpublished
manageable projects, each with a "Share" button deep-linking to `?wizard=<id>`.
**Dependencies:** UNIT-011 (wizard must exist).
**Test/proof:** Browser proof.
**Evidence class:** browser-proven.

---

### UNIT-014: Authenticated manager preview route

**Goal:** Manager previews recipient rendering without a new bearer credential.
**Linked requirements:** REQ-003, SEC-008, AC-007, AC-008, AC-085, AC-086, AC-087
**Exact paths:** `src/app/workshop/publisher/preview/[projectId]/page.tsx` (NEW),
the existing project-manager authorization helper and publication snapshot loader,
`ProjectPublicationView` (explicit preview mode), and `ClientPreviewBanner.tsx`.
**Approach:**
1. Resolve current Better Auth context and run `assertProjectPublicationManager`
   for route `projectId` on every render, before loading snapshot data.
2. Server-load the current sanitized snapshot and reuse the recipient presentation
   with `previewMode="manager-read-only"`.
3. Omit/disable comment and decision mutations, show the persistent banner, and
   navigate back normally on exit.
4. Do not create/read a preview cookie, query token, recipient invitation, or
   public share credential. Public `/share/[token]` behavior remains independent.
5. Add the preview link to wizard success and roster card actions.
**Dependencies:** UNIT-011 (wizard).
**Test/proof:** `bun test tests/vitest/publisher-manager-preview-route.test.tsx`
covers unauthenticated, non-manager, wrong-workspace, revoked-role, route mismatch,
and public-token/recipient-cookie-only denial; targeted browser proof covers the
preview banner and disabled controls.
**Evidence class:** automated test + browser.

---

### UNIT-015: Share page header + status + branding

**Goal:** Dynamic header status; sender branding; cover fallback.
**Linked requirements:** UX-002, UX-009, AC-020, AC-032, AC-033
**Exact paths:** `SharePageProposalHeader.tsx`, `SharePageHero.tsx`,
`SharePageSummaryCard.tsx`, `ProposalStatusBadge.tsx` (NEW),
`CoverImagePlaceholder.tsx` (NEW).
**Approach:**
1. `ProposalStatusBadge`: reads decision state, shows "Pending"/"Approved"/etc.
2. Header: add workspace/sender name from snapshot.
3. Hero: add `CoverImagePlaceholder` for missing cover.
4. Summary card: add expiry date if set.
**Dependencies:** UNIT-010 (terminology).
**Test/proof:** Component tests + browser proof.
**Evidence class:** browser-proven.

---

### UNIT-016: Sticky decision bar + session banner fix

**Goal:** Prominent decision CTA; actionable session banner.
**Linked requirements:** UX-001, UX-003, UX-018, AC-019, AC-021, AC-022, AC-079, AC-080
**Exact paths:** `StickyDecisionBar.tsx` (NEW), `SharePageSessionBanner.tsx`,
`SharePageDecision.tsx`.
**Approach:**
1. `StickyDecisionBar`: desktop floating CTA that appears on scroll; mirrors
   decision buttons; clicking scrolls to decision section or opens inline.
   - Must be `role="region" aria-label="Quick response"` (AC-079).
   - Must add `scroll-padding-bottom` to prevent obscuring the decision section (AC-080).
2. Session banner: **preserve the existing "Not you?" clear-session button**
   (it already exists in `SharePageSessionBanner.tsx:30-52`). The fix is additive:
   the anonymous-state banner gets a "get your personalized link" CTA explaining
   the email mechanism. Do NOT rewrite the banner from scratch — the existing
   clear-session affordance must stay.
**Dependencies:** UNIT-010.
**Test/proof:** Browser proof (scroll + screen reader).
**Evidence class:** browser-proven.

---

### UNIT-017: Estimate table row-action redesign + keyboard model

**Goal:** Replace per-row "Ask about item" button with row-click select using a
roving-tabindex model (NOT a per-row tabIndex trap).
**Linked requirements:** UX-005, UX-017, AC-024, AC-025, AC-077, AC-078
**Exact paths:** `SharePageTabs.tsx` (collated table section, lines 730-842).
**Approach:**
1. Make rows selectable via click + keyboard. Use a **roving-tabindex** model:
   the table has ONE tab stop (the currently-focused row), Arrow keys move between
   rows, Enter/Space selects the review target (AC-077/AC-078). Do NOT set
   `tabIndex=0` on every row (250 tab stops is a keyboard trap).
2. Clicking a row sets it as the review target (existing context).
3. Selected row gets visual highlight (existing `data-review-target-selected`).
4. Remove the per-row "Ask about item" button; add a subtle hover indicator.
**Dependencies:** UNIT-010.
**Test/proof:** Component test + browser proof (keyboard-only test: Tab to table,
arrow through rows, Enter to select).
**Evidence class:** browser-proven (keyboard).

---

### UNIT-018: Comments improvements + load-more UI

**Goal:** Comment dates, author badges, page scroll (not nested), load-more pagination.
**Linked requirements:** UX-006, UX-015, AC-026, AC-027, AC-028, AC-073, AC-074
**Exact paths:** `SharePageComments.tsx`.
**Approach:**
1. Timestamps: include date (`toLocaleDateString` + time).
2. Author badge: visual distinction for owner-authored vs recipient-authored.
3. Remove `max-h-[420px]` nested scroll; let comments use page scroll.
4. Wire "Load more" to the cursor pagination from UNIT-004 (AC-073/AC-074):
   when `hasMore` is true, show a "Load more" button that fetches via cursor.
**Dependencies:** UNIT-004 (pagination).
**Test/proof:** Component test + browser proof.
**Evidence class:** browser-proven.

---

### UNIT-019: Print / Save as PDF button + currency + collated-row load-more

**Goal:** Visible Print / Save as PDF button; currency fix; expiry; collated-row
"show more".
**Linked requirements:** UX-007, UX-008, UX-011, UX-014, SEC-007, AC-029, AC-030,
AC-031, AC-036, AC-071, AC-072
**Exact paths:** `SharePrintButton.tsx` (NEW), `src/components/charts/CostDonutChart.tsx`
(fix hardcoded symbol map at `:142`, not the `Intl.NumberFormat` at `:119`),
`SharePageSummaryCard.tsx`, `print.css`, `SharePageTabs.tsx` (COLLATED_ROW_LIMIT at `:28`).
**Approach:**
1. `SharePrintButton`: visible "Print / Save as PDF" button that calls
   `window.print()`; it must not claim to download a server-generated artifact.
2. `CostDonutChart`: replace the hardcoded `currencyCode === "PHP" ? "₱" : ...` at
   line 142 with `new Intl.NumberFormat("en-PH", { style: "currency", currency: currencyCode })`.
3. Summary card: show expiry (consolidate with UNIT-015).
4. Collated table: replace the "Showing first 250" dead-end with a "Show more" /
   "Load all" control (AC-071/AC-072).
5. Emit no print telemetry; UNIT-007/008 already remove the dead event contract.
**Dependencies:** UNIT-010.
**Test/proof:** Component test (currency) + browser proof (print + load-more).
**Evidence class:** automated test (currency) + browser (print + load-more).

---

### UNIT-020: Password gate improvements

**Goal:** Show-password toggle; "don't have password?" hint.
**Linked requirements:** UX-010, AC-034, AC-035
**Exact paths:** `ProjectPublicationPasswordForm.tsx`.
**Approach:** Add reveal toggle (eye icon); add hint text directing to contact sender.
**Dependencies:** UNIT-010.
**Test/proof:** Component test + browser proof.
**Evidence class:** browser-proven.

---

### UNIT-021: Recipient inbox fixes

**Goal:** Fix legitimate expired/revoked/email-mismatch dead ends while preserving
fail-closed repository integrity.
**Linked requirements:** UX-012, AC-037, AC-038, AC-039, AC-069
**Exact paths:** `src/lib/repositories/recipient-proposals-repository.ts`,
`src/components/workshop/proposals-page/ProposalRow.tsx`,
`ProposalsEmptyState.tsx`.
**Approach:**
1. Repository: keep the all-or-nothing security boundary. Any malformed,
   unnormalizable, unauthorized, or inconsistent row returns typed unavailable
   with no partial list or metadata (AC-038).
2. ProposalRow: show state label + "contact sender" guidance for expired/revoked
   (AC-037). The disabled "Review" button gets a tooltip/aria-label explaining why.
3. Empty state: clarify "This inbox shows proposals sent to your email" (AC-039).
4. Email-mismatch dead-end (AC-069): when `openRecipientProposalAction` returns
   `not-a-recipient`, show actionable guidance: "Open the link from your email
   invitation" or "ask the sender to invite {your-email}" — not just the raw error.
5. **Preserve** the existing route-gate test (`recipient-proposals-route-gate.test.ts`).
**Dependencies:** None.
**Test/proof:** `bun test tests/vitest/recipient-inbox-dead-end.test.tsx` and
`bun test tests/vitest/recipient-proposals-route-gate.test.ts`; the malformed-row
case asserts typed unavailable and no partial IDs/titles.
**Evidence class:** automated test + browser.

---

### UNIT-023: Mobile estimate-tree navigation + JS-disabled fallback + signer-name

**Goal:** Mobile tree nav parity (UX-013); JS-disabled share page (UX-019);
decision signer-name consistency (UX-016).
**Linked requirements:** UX-013, UX-016, UX-019, AC-070, AC-075, AC-076, AC-081, AC-082
**Exact paths:** `SharePageTabs.tsx` (mobile tree nav), `ShareEstimateTreePanel.tsx`
(mobile variant), `src/app/share/[token]/page.tsx` (server-render fallback content),
`src/app/api/share/[token]/decision/route.ts` (signer-name for declined),
`SharePageDecision.tsx` + `SharePageDecisionConfirmDialog.tsx` (signer-name UI).
**Approach:**
1. Mobile tree nav (AC-070): below 1024px, provide a collapsible section navigator
   so recipients can jump between estimate sections instead of traversing a flat tree.
2. JS-disabled (AC-081/AC-082): ensure the RSC payload includes estimate data (not
   empty client-component shells). The server component already has the snapshot;
   render the estimate table server-side. Comments/decisions show a message directing
   to the email link.
3. Signer-name (AC-075/AC-076): `decision/route.ts` currently requires signerName
   only for `accepted` (line 306). Add the same requirement for `declined`. Keep
   `revision_requested` advisory (no name). Update the confirm dialog UI accordingly.
**Dependencies:** UNIT-010 (terminology), UNIT-017 (row-action redesign, for mobile
tree context).
**Test/proof:** Component test (signer-name) + browser proof (mobile tree, JS-disabled).
**Evidence class:** automated test + browser.

---

### UNIT-022: Full integration verification

**Status:** `VERIFIED`. Current receipt, focused/static, and browser-scoped
evidence is recorded in `18_FINAL_COMPLETION_AUDIT.md`; the broader repository
validation boundary is recorded without being misattributed to this pack.
**Goal:** Verify all units work together and collect only evidence needed for the
mapped acceptance claims.
**Linked requirements:** All.
**Preconditions:**
1. A current content-addressed Publisher incorporated-delta receipt proves
   `PUB-DELTA-01`, `PUB-DELTA-02`, `PUB-DELTA-03`, and `PUB-DELTA-04` were
   serialized into this pack, names their exact requirement/unit/test ownership,
   and rechecks manifest, artifact-set, scoped-diff, contract-version, validator,
   and canonical receipt hashes. Missing or stale delta evidence keeps this unit
   `PLANNED`.
2. Consume the Activity incorporated-delta handoff for public comment/decision
   accessibility. Publisher remains the exclusive UI/mutation owner; Activity
   supplies only applicable findings and append-only event contracts. Record the
   changed Publisher paths, exact tests, and independent verifier result.
3. The frozen `ACTIVATION-PRODUCER-CONTRACT-v1` version and content hash are
   available. A missing or mismatched contract yields a safe `not_available`
   integration state rather than fabricated activation progress.
**Approach:**
1. Run every exact focused command listed in
   `12_TEST_AND_VALIDATION_STRATEGY.md`, then `bun run type-check`, `bun run lint`,
   `bun run validate:error-handling`, and `git diff --check`.
2. Run `bun run validate` because the work touches shared auth/data/UI contracts.
3. Run only the targeted browser cases for claims not provable statically or in
   DOM/unit tests: responsive wizard/card composition, manager preview interaction,
   sticky decision behavior, row keyboard navigation, JS-disabled recipient
   fallback, and print output.
4. Run `bun run validate:plan-pack -- .ai/03_plans/2026-07-10/Publisher-And-Shared-Pages`.
5. Emit `ACT-RECEIPT-PUBLISHER-v1` only after the Activation contract is frozen.
   Bind the Publisher manifest hash; Activation contract version/hash;
   `publication_created`, `recipient_opened`, `recipient_engaged`, and
   `recipient_decided` producer paths and exact tests; the same-transaction
   activation-outbox guarantee; retry/dead-letter semantics; deterministic
   fixture results; and safe unavailable behavior. Missing/stale/mismatched
   producer evidence reports `not_available`, emits no fabricated milestone,
   and blocks Program integration/release.
6. Emit the `BETA-P1-10` **REQUIRED** maintainability receipt. It must include a
   caller map, pre-change characterization, extraction-versus-retention decision,
   changed files, regression owner, exact focused tests, and independent verifier
   result. The durable admission anchor is `UNIT-003` and
   `tests/vitest/project-publication-decision.test.tsx`; the receipt must name
   the exact bounded extraction or justified retention decision for that path,
   not a nonexistent circuit-breaker test.
**Dependencies:** All units.
**Test/proof:** Full suite + browser sweep.
**Evidence class:** automated test + browser.

---

## Execution Serialization

The manifest slice is dependency-closed, not a license for concurrent writes.
Execute one unit at a time by default. Before every unit, refresh `git status`,
re-read its exact paths, and acquire exclusive ownership for every file it may
touch. Only independent read-only discovery or test analysis may run in parallel.

Shared route/repository files (`public-repository.ts`, share route handlers,
`ProjectPublicationView`, `SharePageTabs.tsx`, `SharePageComments.tsx`, publisher
roster components, workshop/share `page.tsx` files, migrations, and manifest/docs)
are always serialized. No implementation unit edits `package.json` or the lockfile.
UNIT-022 begins only after every dependency is verified and the workspace is
re-read for concurrent changes.

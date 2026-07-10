# IMPLEMENTATION_PLAN.md — Canonical Execution Artifact

This is the sole canonical implementation plan. Every `UNIT-*` is an execution
unit packet runnable from bounded context. Units follow a dependency DAG; each
layer must complete before dependents start.

## Status

`implementation_status=NOT_STARTED`, `package_status=NOT_READY` (no ready slice
until UNIT-001 is VERIFIED). First unit: UNIT-001.

## Execution DAG

```text
Layer 0 — Security hardening (parallel-safe, disjoint files)
  UNIT-001 body-size limits (SEC-001)
  UNIT-002 status-code consistency (SEC-002)
  UNIT-003 circuit breaker extraction + decision parity (SEC-003)
  UNIT-005 snapshot reentrance fix (SEC-005)
  UNIT-006 startup secret validation (SEC-006)
  UNIT-007 dead code removal (SEC-007)

Layer 1 — Data (sequential, migration owns D1)
  UNIT-004 comment pagination (SEC-004) [depends on nothing in L0]
  UNIT-008 FK migration + orphan cleanup (DATA-001) [depends on nothing]
  UNIT-009 roster GROUP BY optimization (DATA-002, PERF-002) [depends on UNIT-008]

Layer 2 — Publisher UX (depends on L0/L1 for hardening, but UX is UI-only)
  UNIT-010 terminology + sidebar label (REQ-004)
  UNIT-011 ShareWizard (REQ-001, REQ-002) [depends on UNIT-010]
  UNIT-012 publisher roster cards + pagination (REQ-005, REQ-006, REQ-007)
  UNIT-013 dashboard publish CTA (REQ-008)
  UNIT-014 preview-as-client (REQ-003) [depends on UNIT-011]

Layer 3 — Shared link UX (depends on L0 hardening)
  UNIT-015 share page header + status + branding (UX-002, UX-009)
  UNIT-016 sticky decision bar + session banner fix (UX-001, UX-003)
  UNIT-017 estimate table row-action redesign (UX-005)
  UNIT-018 comments improvements (UX-006) [depends on UNIT-004]
  UNIT-019 print button + currency + misc share fixes (UX-007, UX-008, UX-010, UX-011)
  UNIT-020 password gate improvements (UX-010)

Layer 4 — Recipient inbox + share-page extras
  UNIT-021 inbox dead-end + skip-bad-rows + email-mismatch (UX-012)
  UNIT-023 mobile tree nav + JS-disabled fallback + signer-name (UX-013, UX-016, UX-019)

Layer 5 — Integration
  UNIT-022 full integration verification + browser sweep
```

## Critical Path

```text
UNIT-010 (terminology) → UNIT-011 (wizard) → UNIT-014 (preview) → UNIT-022
UNIT-008 (migration) → UNIT-009 (query optimization)
UNIT-018 (comments) depends on UNIT-004 (pagination)
```

The longest chain is: UNIT-010 → UNIT-011 → UNIT-014 → UNIT-022.

## Unit Packets

---

### UNIT-001: Body-size limits on public POST routes

**Goal:** Add explicit `Content-Length` caps to all public POST routes.
**Linked requirements:** SEC-001, AC-040
**Non-goals:** Changing route logic beyond the early body-size check.
**Exact paths and current symbols:**
- `src/app/api/share/[token]/password/route.ts` — POST handler
- `src/app/api/share/[token]/comment/route.ts` — POST handler
- `src/app/api/share/[token]/decision/route.ts` — POST handler
- `src/app/api/share/[token]/session/route.ts` — POST handler
- `src/app/api/share/[token]/unsubscribe/route.ts` — POST handler (form-data)
**Dependencies:** None.
**Owned scope:** The five route files above + a shared helper.
**Approach:**
1. Create `src/lib/publication/body-size-limit.ts` with `assertBodySize(request, maxBytes)`
   that reads `Content-Length` and returns `null` or a `413` Response.
2. Call it at the top of each POST handler before `request.json()`.
3. Limits: password 256, comment 2048, decision 4096, session 256.
**Expected postconditions:** Oversized POST bodies return 413 before parsing.
**Test/proof:** `tests/vitest/publication-body-size.test.ts` — send oversized body
to each route, assert 413.
**Evidence class:** automated test.
**Failure response:** If `Content-Length` header is absent (chunked encoding), fall
back to reading the body with a size cap in the stream reader.
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

### UNIT-003: Circuit breaker extraction + decision parity

**Goal:** Extract the in-memory circuit breaker from `comment/route.ts` into a
shared module; apply to `decision/route.ts` POST.
**Linked requirements:** SEC-003, AC-042
**Exact paths:** `comment/route.ts:26-74` (extract), `decision/route.ts` (apply).
**Approach:**
1. Create `src/lib/publication/circuit-breaker.ts` with `createPublicationCircuitBreaker(name, config)`.
2. Move the module-level mutable state + threshold logic into the factory.
3. Import and use in both comment and decision POST handlers.
**Test/proof:** `tests/vitest/publication-circuit-breaker.test.ts` — simulate 5
consecutive 500s on both routes, assert 503 + Retry-After.
**Evidence class:** automated test.

---

### UNIT-004: Comment cursor pagination

**Goal:** Replace the 200-cap on `loadSharedLinkPublicComments` with cursor pagination.
**Linked requirements:** SEC-004, AC-043, AC-044
**Exact paths:** `src/lib/publication/public-repository.ts:868`,
`src/app/api/share/[token]/comment/route.ts` GET, `src/components/share/SharePageComments.tsx`.
**Approach:**
1. Add `loadSharedLinkPublicComments(publicationId, {cursor, limit})` returning
   `{comments, hasMore, nextCursor}`.
2. Reuse the cursor crypto from `activity-helpers.ts`.
3. Update the comment GET route to accept `?cursor=` and return pagination fields.
4. Update `SharePageComments` to fetch more via cursor ("Load more" or infinite scroll).
**Dependencies:** None (but UNIT-018 comments UX depends on this).
**Test/proof:** `tests/vitest/publication-comment-pagination.test.ts`.
**Evidence class:** automated test + browser proof.

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

### UNIT-006: Startup secret validation

**Goal:** Validate publication secrets at module init in production.
**Linked requirements:** SEC-006, AC-046
**Exact paths:** `src/lib/publication/security.ts:100-112`.
**Approach:** Add a module-level guard that checks
`PUBLICATION_TOKEN_HASH_SECRET` and `PUBLICATION_TOKEN_ENCRYPTION_SECRET` at import
time when `NODE_ENV === 'production'`. Throw if missing. Dev keeps fallback.
**Test/proof:** `tests/vitest/publication-startup-secrets.test.ts` — verify import
throws in production env without secrets.
**Evidence class:** automated test.

---

### UNIT-007: Dead code removal (events route scope only)

**Goal:** Remove `events/route.ts` (it has no consumer — confirmed dead). Remove
`PublisherDisabledEmptyState` (dead component, never imported). Leave
`download_attempt_blocked` enum in place for now — UNIT-019 (Layer 3) decides
whether to wire or remove it after the Download PDF button is implemented.
**Linked requirements:** SEC-007, AC-047 (partial — events route + disabled state)
**Exact paths:** `src/app/api/share/[token]/events/route.ts` (remove),
`src/components/workshop/publisher/PublisherEmptyState.tsx:9-20` (remove `PublisherDisabledEmptyState`).
**DO NOT remove:** `download_attempt_blocked` from `public-repository.ts:28`,
`d1-store.ts:93`, or the migration CHECK — UNIT-019 owns that decision.
**Approach:**
1. Grep for any consumer of the `events` route (`rg "api/share.*events" src/`).
   Confirm zero consumers. Remove the route file.
2. Grep for `PublisherDisabledEmptyState` imports. Confirm zero. Remove the export.
3. Grep for `download_attempt_blocked` emitters — if none, leave the enum in place
   (UNIT-019 will decide).
**Test/proof:** `tests/vitest/publication-dead-code.test.ts` — grep assertions
for removed routes/components; verify `download_attempt_blocked` still compiles.
**Evidence class:** static review.

---

### UNIT-008: FK migration via SQLite table-rebuild pattern

**Goal:** Add foreign-key constraints to the 7 publication tables using the SQLite
table-rebuild pattern (CREATE with FKs → INSERT SELECT → DROP → RENAME → recreate
indexes). SQLite/D1 does NOT support `ALTER TABLE ADD CONSTRAINT`.
**Linked requirements:** DATA-001, AC-048, AC-049
**Exact paths:** `migrations/0050_publication_foreign_keys.sql` (NEW).
**Approach:**
1. Pre-migration: query for orphaned rows (`SELECT COUNT(*) FROM
   project_publications WHERE project_id NOT IN (SELECT id FROM projects)`). If
   any, delete them.
2. For each of the 7 tables (`project_publications`, `shared_link_recipients`,
   `shared_link_comments`, `shared_link_responses`, `shared_link_events`,
   `project_publication_events`, `publication_digest_log`):
   a. CREATE TABLE `<name>__0050` with all original columns + `REFERENCES` FKs.
   b. INSERT INTO `<name>__0050` SELECT * FROM `<name>`.
   c. DROP TABLE `<name>`.
   d. ALTER TABLE `<name>__0050` RENAME TO `<name>`.
   e. Recreate all original indexes (indexes don't survive rename).
3. Follow the pattern established in `migrations/0040_operational_incidents.sql:42-103`.
4. Apply to local D1.
**Dependencies:** None.
**Test/proof:** `tests/vitest/publication-fk-migration.test.ts` — apply migration,
delete a project, verify cascade deletes publication + child rows.
**Evidence class:** local D1 proof.
**Risk:** 7 table rebuilds temporarily double storage. Fine for expected row
counts. The copy is data-preserving — if the FK causes issues, a reverse rebuild
removes it.

---

### UNIT-009: Roster GROUP BY optimization

**Goal:** Replace row-scan counts with SQL aggregation; add performance evaluator.
**Linked requirements:** DATA-002, PERF-002, AC-050, AC-051, AC-053
**Exact paths:** `src/lib/publisher/roster-repository.ts:477-559`.
**Approach:**
1. Rewrite `readRecipientCountsByPublicationId` to use `GROUP BY publication_id`.
2. Rewrite `readLatestCommentAtByPublicationId` and `readLatestResponseAtByPublicationId`
   to use `MAX(created_at) ... GROUP BY`.
3. Create `tests/perf/publisher-roster-evaluator.test.ts` seeding 10/50/100 pubs.
**Dependencies:** UNIT-008 (migration should be applied first for clean schema).
**Test/proof:** Performance evaluator + existing roster tests pass.
**Evidence class:** local D1 evaluator.

---

### UNIT-010: Terminology + sidebar label

**Goal:** Rename sidebar "Publisher" → "Share"; update all user-facing jargon.
**Linked requirements:** REQ-004, AC-009, AC-010
**Exact paths:** `src/components/sidebar/MainSidebar.tsx:59`,
all publisher/share components with jargon labels.
**Approach:**
1. Change sidebar label + icon.
2. Grep for jargon terms ("Publisher", "Publication", "Scope outline", "Sheet scope")
   in user-facing strings (button labels, headings, breadcrumbs).
3. Replace with plain-language equivalents per the terminology mapping in `05_UX_UI_ACCESSIBILITY_PLAN.md`.
4. Keep internal code identifiers (variable names, file names) unchanged — only
   user-facing strings change.
**Dependencies:** None (but all UX units depend on this for consistency).
**Test/proof:** Static grep audit + browser proof of labels.
**Evidence class:** static review + browser.

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
4. Create `ShareLinkDisplay` (selectable URL + copy button + QR on desktop only per
   REQ-013; Web Share API on mobile).
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
**Test/proof:** `tests/vitest/publisher-wizard.test.tsx` + browser proof (incl.
375px mobile, keyboard-only, screen reader).
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

### UNIT-014: Preview-as-client mode

**Goal:** Manager can preview the interactive recipient experience.
**Linked requirements:** REQ-003, SEC-008, AC-007, AC-008, AC-085, AC-086, AC-087
**Exact paths:** `src/lib/publication/actions.ts` (new `createClientPreviewSession`),
`src/lib/publication/security.ts` (preview cookie helpers),
`src/app/share/[token]/page.tsx` (read preview cookie — UNIT-014 OWNS this change),
`SharePageSessionBanner.tsx` or new `ClientPreviewBanner.tsx` (preview-mode banner),
`SharePageDecision.tsx` + `SharePageComments.tsx` (disabled actions in preview mode).
**Approach:**
1. Add `createClientPreviewSession(projectId)` server action (manager RBAC via
   `assertProjectPublicationManager`).
2. Add preview cookie (`ae_publication_preview_*`, HMAC-signed, 1h TTL, HttpOnly,
   SameSite=Lax, Secure in prod).
3. **UNIT-014 owns the `src/app/share/[token]/page.tsx` change**: read the preview
   cookie alongside the existing session cookie, pass `previewMode` flag to
   `<ProjectPublicationView>`.
4. **Preview-cookie precedence (SEC-008):** if a valid `shared_link_session_*`
   recipient cookie exists, the real session wins — preview mode does NOT activate
   (AC-085/AC-086). Preview only activates when no valid recipient session exists.
5. "Exit preview" clears the preview cookie (AC-087).
6. In preview mode: render preview banner + disable submit buttons (DEC-AUTO-002).
7. Add "Preview as client" button in wizard success step + publisher card.
**Dependencies:** UNIT-011 (wizard).
**Test/proof:** `tests/vitest/share-page-preview-mode.test.tsx` + browser proof.
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

### UNIT-019: Print button + currency + collated-row-load-more + download_attempt_blocked decision

**Goal:** Visible Download PDF button; currency fix; expiry; collated-row "show more";
resolve the `download_attempt_blocked` enum (wire or remove).
**Linked requirements:** UX-007, UX-008, UX-011, UX-014, SEC-007, AC-029, AC-030,
AC-031, AC-036, AC-071, AC-072
**Exact paths:** `SharePrintButton.tsx` (NEW), `CostDonutChart.tsx` (fix hardcoded
symbol map at `:142`, not the `Intl.NumberFormat` at `:119`),
`SharePageSummaryCard.tsx`, `print.css`, `SharePageTabs.tsx` (COLLATED_ROW_LIMIT area).
**Approach:**
1. `SharePrintButton`: visible button that calls `window.print()`.
2. `CostDonutChart`: replace the hardcoded `currencyCode === "PHP" ? "₱" : ...` at
   line 142 with `new Intl.NumberFormat("en-PH", { style: "currency", currency: currencyCode })`.
3. Summary card: show expiry (consolidate with UNIT-015).
4. Collated table: replace the "Showing first 250" dead-end with a "Show more" /
   "Load all" control (AC-071/AC-072).
5. **`download_attempt_blocked` resolution:** If the Download PDF button should emit
   telemetry (e.g., tracking print attempts), wire the enum. Otherwise, remove it
   from `public-repository.ts:28`, `d1-store.ts:93`, and `events/route.ts:14` (the
   route was removed by UNIT-007). The migration CHECK constraint stays (harmless).
   This is the final remove-or-wire decision deferred from UNIT-007.
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

**Goal:** Fix dead-end for expired/revoked; skip bad rows; clarify empty state; fix
email-mismatch dead-end.
**Linked requirements:** UX-012, AC-037, AC-038, AC-039, AC-069
**Exact paths:** `src/lib/repositories/recipient-proposals-repository.ts`,
`src/components/workshop/proposals-page/ProposalRow.tsx`,
`ProposalsEmptyState.tsx`.
**Approach:**
1. Repository: skip rows that fail normalization instead of failing the entire list
   (AC-038). Change the all-or-nothing model to filter-and-continue.
2. ProposalRow: show state label + "contact sender" guidance for expired/revoked
   (AC-037). The disabled "Review" button gets a tooltip/aria-label explaining why.
3. Empty state: clarify "This inbox shows proposals sent to your email" (AC-039).
4. Email-mismatch dead-end (AC-069): when `openRecipientProposalAction` returns
   `not-a-recipient`, show actionable guidance: "Open the link from your email
   invitation" or "ask the sender to invite {your-email}" — not just the raw error.
5. **Preserve** the existing route-gate test (`recipient-proposals-route-gate.test.ts`).
**Dependencies:** None.
**Test/proof:** `tests/vitest/recipient-inbox-dead-end.test.ts` + route-gate test passes.
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
1. Mobile tree nav (AC-070): below 1024px, provide a collapsible section accordion
   or dropdown so recipients can navigate between estimate sections (not just a flat
   tree with no jump nav).
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

### UNIT-022: Full integration verification + browser sweep

**Goal:** Verify all units work together; full test suite; browser sweep.
**Linked requirements:** All.
**Approach:**
1. Run `bun run type-check`, `bun run lint`.
2. Run all publication/share/publisher tests.
3. Run `bun run validate` (full suite).
4. Browser sweep: publisher wizard flow, share page, preview mode, mobile.
5. Run `bun run validate:plan-pack`.
**Dependencies:** All units.
**Test/proof:** Full suite + browser sweep.
**Evidence class:** automated test + browser.

---

## Parallelism Guide

**Layer 0 (UNIT-001 through UNIT-007):** All disjoint files. Can run in parallel
with file-scope ownership. Serialize any shared file (e.g., if two units touch
`public-repository.ts`).

**Layer 1 (UNIT-008, UNIT-009):** Migration must complete before query optimization.
UNIT-004 (comment pagination) can run in parallel with Layer 1.

**Layer 2 (Publisher UX):** UNIT-010 (terminology) is the gate. UNIT-011 (wizard)
and UNIT-012 (cards) can run in parallel after UNIT-010. UNIT-013 depends on
UNIT-011. UNIT-014 depends on UNIT-011.

**Layer 3 (Share UX):** All can run in parallel after UNIT-010. UNIT-018 depends
on UNIT-004.

**Safe parallel sets:**
- Set A: UNIT-001, UNIT-002, UNIT-003, UNIT-005, UNIT-006, UNIT-007 (Layer 0, disjoint)
- Set B: UNIT-010, UNIT-008 (terminology + migration, disjoint)
- Set C: UNIT-011, UNIT-012, UNIT-015, UNIT-016, UNIT-017, UNIT-019, UNIT-020, UNIT-021 (after UNIT-010, disjoint component scopes)

**Serialize:**
- Any unit touching `MainSidebar.tsx`, `WorkshopDashboard.tsx`, `page.tsx` files,
  `package.json` (shared files — one integrator each).

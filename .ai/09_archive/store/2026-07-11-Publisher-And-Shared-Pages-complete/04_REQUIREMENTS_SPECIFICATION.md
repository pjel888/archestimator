# 04 — Requirements Specification

All requirements are `ACCEPTED` unless marked. Each carries source IDs, unit IDs,
acceptance criteria, and evidence class. Status follows the schema state machine.

## REQ — Functional Requirements

### REQ-001: Primary "Share" CTA and guided publish wizard
**Source:** UX-PUB-01, UX-PUB-04, UX-PUB-05
**Outcome:** A manager sees a prominent "Share" / "New shared link" button that
opens a guided step flow: (1) select sheets, (2) set access (password/expiry),
(3) generate link, (4) send to recipients or copy link, (5) success with
next-step guidance. The current buried-tab flow is replaced.
**Acceptance criteria:**
- AC-001: A "Share" button is visible on the Publisher roster, project header,
  and dashboard for any manageable unpublished project.
- AC-002: Clicking it opens a wizard/modal with numbered steps and clear progress.
- AC-003: After link generation, a success state shows the link prominently with
  copy/send/preview actions.
- **Evidence class:** browser-proven (Playwright/manual interaction proof).

### REQ-002: Prominent share-link display and device-native transfer
**Source:** UX-PUB-06
**Outcome:** The generated `/share/<token>` URL is displayed as selectable text
with a prominent copy button and native Web Share when supported. No QR feature,
QR renderer, or new package is introduced.
**Acceptance criteria:**
- AC-004: The share URL is rendered as selectable text after generation.
- AC-005: Copy button has visible success feedback (not just aria-live).
- AC-006: The link can be transferred with native Web Share on supported devices,
  with selectable text and Copy as the universal fallback.
- **Evidence class:** browser-proven.

### REQ-003: "Preview as client" mode
**Source:** UX-PUB-07
**Outcome:** A manager can preview the recipient rendering through a dedicated,
currently authenticated manager route without minting a recipient or preview
bearer credential. Recipient mutations are disabled in preview.
**Acceptance criteria:**
- AC-007: A "Preview as client" button opens the authenticated manager preview
  route after project-manager RBAC is checked.
- AC-008: Preview mode is visually distinct from the live recipient view (banner
  indicating "Preview mode").
- **Evidence class:** browser-proven.

### REQ-004: Plain-language terminology and navigation labels
**Source:** UX-PUB-02, UX-SHR-09
**Outcome:** All user-facing labels use plain language. "Publisher" nav item is
renamed (e.g., "Share" or "Client Links"). "Scope outline" → "Summary" or "By
section." "Line item table" → "Details" or "By item." Internal jargon is removed
from all client-facing and occasional-user surfaces.
**Acceptance criteria:**
- AC-009: No product-internal jargon appears on user-facing surfaces (audited by
  grep for known jargon terms).
- AC-010: Nav labels, button labels, and section headers are plain-language.
- **Evidence class:** static review + browser-proven.

### REQ-005: Mobile-responsive publisher
**Source:** UX-PUB-03, NEW-14
**Outcome:** The Publisher roster and publish wizard work on screens under 768px.
At minimum, a manager can: view publications, generate a link, and copy it from
a phone. The "needs more width" hard block is replaced with a functional (possibly
simplified) mobile experience.
**Acceptance criteria:**
- AC-011: The publisher roster renders a functional card/list layout below 768px.
- AC-012: The publish wizard is usable on mobile (responsive modal/sheet).
- AC-013: Copy link works on mobile (fallback for Clipboard API).
- **Evidence class:** browser-proven (responsive breakpoint testing).

### REQ-006: Working pagination controls
**Source:** UX-PUB-09
**Outcome:** The Publisher roster renders pagination controls (prev/next, page
indicator) when results exceed `pageSize`.
**Acceptance criteria:**
- AC-014: Pagination controls appear when `totalRows > pageSize`.
- AC-015: Navigating pages updates the URL `?page=` and re-renders the roster.
- **Evidence class:** browser-proven.

### REQ-007: Debounced search
**Source:** UX-PUB-11
**Outcome:** The Publisher search input debounces before triggering `router.replace`.
**Acceptance criteria:**
- AC-016: Typing in search does not trigger a server re-render per keystroke.
- AC-017: Search submits after a debounce window (e.g., 300ms) of inactivity.
- **Evidence class:** browser-proven or unit test.

### REQ-008: Dashboard publish CTA for unpublished projects
**Source:** UX-PUB-14
**Outcome:** The dashboard shows manageable unpublished projects with a "Share"
CTA, not just published ones. The existing `PublishedProjectQuickActions`
(copy/preview/rotate/revoke) for published projects is preserved without
duplication — the wizard is the entry point for creating/updating links; the
dashboard quick actions are for managing existing links.
**Acceptance criteria:**
- AC-018: Unpublished manageable projects appear on the dashboard with a share
  action.
- **Evidence class:** browser-proven.

### REQ-009: Persistent share-link visibility on roster
**Source:** UX-PUB-01, UX-PUB-06 (core user complaint: "can't get to the shared link page")
**Outcome:** After a project is published, its `/share/<token>` URL is **persistently
visible** on the roster card — not just in a transient wizard success state. The
link must be reachable and copyable at any time without re-opening the wizard.
**Acceptance criteria:**
- AC-055: A published project's roster card shows the share URL as selectable text
  (or a one-click copy button with the URL visible in a tooltip/expandable).
- AC-056: The link remains accessible after the wizard closes and the page refreshes.
- **Evidence class:** browser-proven.

### REQ-010: Wizard handles empty-project and email-not-configured states
**Source:** UX-PUB-04 (dead-end prevention), FN (email delivery readiness)
**Outcome:** The wizard does not dead-end when a project has no estimates or when
email delivery is not configured.
**Acceptance criteria:**
- AC-057: If a project has zero estimates, the wizard's sheet-selection step shows
  an empty state explaining the project needs at least one estimate, and the
  "Generate" button is disabled.
- AC-058: If email delivery is not configured, the wizard's send step shows a clear
  "Copy the link manually" path instead of a "Send invitations" button that would
  fail. The wizard reuses the existing `readSharedLinkEmailDeliveryReadiness`
  check (not a new implementation).
- **Evidence class:** browser-proven.

### REQ-011: Wizard accessibility — focus, keyboard, announcements
**Source:** accessibility audit, WCAG 2.1 AA (4.1.3 Status Messages, 2.4.3 Focus Order)
**Outcome:** The wizard is fully accessible: focus trap, step-change announcements,
keyboard navigation, and focus management between steps.
**Acceptance criteria:**
- AC-059: Opening the wizard traps focus inside the modal; closing returns focus to
  the trigger button.
- AC-060: When the wizard transitions between steps, the new step heading is
  announced via `aria-live` / `role="status"` and focus moves to the step heading
  or first interactive element.
- AC-061: All wizard controls (checkboxes, radios, inputs, buttons) are reachable
  via keyboard with visible focus rings.
- **Evidence class:** browser-proven (keyboard + screen reader verification).

### REQ-012: Wizard mobile form factor
**Source:** REQ-005, UX-PUB-03
**Outcome:** The wizard is designed for mobile, not just shrunk from desktop.
**Acceptance criteria:**
- AC-062: On viewports under 768px, the wizard renders as a bottom sheet or
  full-screen modal with a sticky step indicator and Cancel/Next footer.
- AC-063: The wizard's success step stacks its affordances (Copy/Preview/Send/Done)
  vertically on mobile.
- **Evidence class:** browser-proven (375px viewport test).

### REQ-013: Device-appropriate link transfer
**Source:** DEC-AUTO-003
**Outcome:** The same dependency-free link controls work across devices. Native
Web Share is progressive enhancement; selectable text and Copy always remain.
**Acceptance criteria:**
- AC-064: Desktop exposes selectable URL text and Copy without rendering a QR code.
- AC-065: On devices with Web Share support, a "Share link" control calls the
  native API; unsupported or rejected calls leave Copy available.
- **Evidence class:** browser-proven (responsive).

### REQ-014: Republish path uses wizard, not buried drawer tab
**Source:** UX-PUB-04
**Outcome:** Updating an already-shared project (adding/removing estimates,
changing access) uses the same wizard flow as first publish — not the buried
Sheets tab in the drawer. The drawer remains for advanced management (recipient
lists, activity, rotate/revoke) but NOT for the primary "update link" action.
**Acceptance criteria:**
- AC-066: The "Update link" / "Edit shared link" button on a published project's
  roster card opens the wizard (pre-filled with current settings), not the drawer.
- **Evidence class:** browser-proven.

### REQ-015: Roster "Access" tab renamed to avoid recipient/member confusion
**Source:** UX-PUB-10
**Outcome:** The Publisher drawer's "Access" tab (which shows internal project
members, not share recipients) is renamed or reorganized to eliminate the
three-concept collision ("Access" vs "Recipients" vs "Settings → password").
**Acceptance criteria:**
- AC-067: The internal-members tab is clearly labeled (e.g., "Team access") to
  distinguish from "Recipients" (external clients) and "Settings" (password/expiry).
- **Evidence class:** browser-proven.

### REQ-016: Consistent primary-action verb across publish flow
**Source:** UX-SHR-04, audit terminology review
**Outcome:** The wizard uses ONE consistent verb for the primary action across the
header CTA, draft-card CTA, wizard step buttons, and success state.
**Acceptance criteria:**
- AC-068: The same verb (e.g., "Share") is used for the header CTA, draft-card CTA,
  and wizard step 3 button. No mixing of "Share project" / "Create link" /
  "Generate shared link" within the same flow.
- **Evidence class:** static review + browser-proven.

## UX — UX/Accessibility Requirements (recipient side)

### UX-001: Actionable recipient session banner
**Source:** UX-SHR-01
**Outcome:** The "sign in as a recipient" banner provides an actionable path. If
the recipient arrived via a non-personalized link, the banner explains how to get
their personalized link (open the email, or "enter your email to receive a link"
if email delivery is configured).
**Acceptance criteria:**
- AC-019: The banner either links to a "request access" flow or clearly explains
  the email-link mechanism with no dead-end text.
- **Evidence class:** browser-proven.

### UX-002: Decision state reflected in header
**Source:** UX-SHR-02
**Outcome:** The proposal header reflects the actual decision state — "Awaiting
your review" before, "Approved"/"Changes requested"/"Declined" after.
**Acceptance criteria:**
- AC-020: Header status pill updates to match the recipient's submitted decision.
- **Evidence class:** browser-proven.

### UX-003: Prominent decision CTA
**Source:** UX-SHR-03
**Outcome:** The decision/action CTA (Approve/Request changes/Decline) is visible
through a desktop sticky decision bar and the persistent mobile Respond anchor.
**Acceptance criteria:**
- AC-021: The decision CTA is reachable from above the fold or via a persistent
  UI element on desktop.
- AC-022: Mobile bottom-nav "Respond" anchor scrolls to the decision section.
- **Evidence class:** browser-proven.

### UX-004: Consistent decision language
**Source:** UX-SHR-04
**Outcome:** Button and recorded-decision labels use the frozen mappings:
"Approve"/"Approved", "Request changes"/"Changes requested", and
"Decline"/"Declined".
**Acceptance criteria:**
- AC-023: Button label → badge label mapping is obvious and consistent.
- **Evidence class:** static review + browser-proven.

### UX-005: Reduce estimate table visual noise
**Source:** UX-SHR-05
**Outcome:** Replace the per-row "Ask about item" button with row selection, a
roving-tabindex keyboard model, and a selected-row indicator. A 250-row table
does not render 250 action buttons.
**Acceptance criteria:**
- AC-024: The estimate table does not render a visible action button on every row
  by default.
- AC-025: Row-scoped review is still accessible via a clear interaction.
- **Evidence class:** browser-proven.

### UX-006: Improved comments experience
**Source:** UX-SHR-14, UX-SHR-15, UX-SHR-16, NEW-03
**Outcome:** Comments show dates (not just time), distinguish author type (owner
vs recipient) visually, and the comment list uses page scroll instead of nested
scroll. Threading/@mentions are non-goals for this plan but the structure allows
future addition.
**Acceptance criteria:**
- AC-026: Comment timestamps include dates.
- AC-027: Owner-authored and recipient-authored comments are visually distinguishable.
- AC-028: Comment list does not use a fixed-height nested scroll container.
- **Evidence class:** browser-proven.

### UX-007: Print / Save as PDF proposal button
**Source:** UX-SHR-23, NEW-01
**Outcome:** A visible "Print / Save as PDF" button triggers the browser print
path with clear labeling (not just relying on the user knowing to Ctrl+P). It
does not claim to download a server-generated PDF artifact. The existing
`print.css` and print-package rendering are preserved and improved.
**Acceptance criteria:**
- AC-029: A "Print / Save as PDF" button is visible on the share page.
- AC-030: Clicking it triggers `window.print()` or equivalent with the print
  package rendered.
- **Evidence class:** browser-proven.

### UX-008: Expiry visibility for recipients
**Source:** UX-SHR-12
**Outcome:** If the publication has an expiry date, the recipient sees it in the
summary card or header.
**Acceptance criteria:**
- AC-031: Expiry date is displayed to the recipient when set.
- **Evidence class:** browser-proven.

### UX-009: Cover image fallback and sender branding
**Source:** UX-SHR-13, UX-SHR-17
**Outcome:** Missing cover images show a branded placeholder (project initials or
default graphic). The proposal header shows the sender's firm/workspace name.
**Acceptance criteria:**
- AC-032: Missing cover image renders a non-null placeholder.
- AC-033: Sender/workspace name is visible in the proposal header.
- **Evidence class:** browser-proven.

### UX-010: Password gate improvements
**Source:** UX-SHR-10, UX-SHR-11
**Outcome:** Password gate has a "show password" toggle and a "don't have the
password?" hint directing the recipient to contact the sender.
**Acceptance criteria:**
- AC-034: Password input has a reveal toggle.
- AC-035: A hint/contact path is shown when the recipient doesn't have the password.
- **Evidence class:** browser-proven.

### UX-011: Currency formatting fix
**Source:** UX-SHR-24
**Outcome:** Cost donut chart and all currency displays use consistent
locale-aware formatting for any currency code, not just PHP/USD.
**Acceptance criteria:**
- AC-036: Non-PHP/USD currencies display with correct symbol and format.
- **Evidence class:** unit test + browser-proven.

### UX-012: Recipient inbox dead-end fix
**Source:** UX-PROP-01, UX-PROP-02, UX-PROP-03, UX-PROP-04
**Outcome:** Expired/revoked proposals in the inbox show their state with a
"contact sender" path. Repository integrity remains fail-closed: a malformed or
unauthorized row produces a typed unavailable result and no partial list. The
empty state explains the inbox is recipient-only. The email-mismatch dead-end
(`not-a-recipient`) provides a recovery path.
**Acceptance criteria:**
- AC-037: Expired/revoked proposals show state + "contact sender" guidance.
- AC-038: A malformed, unnormalizable, or unauthorized row returns the typed
  unavailable state and exposes no partial recipient metadata.
- AC-039: Empty state clarifies the inbox is for received proposals.
- AC-069: The `not-a-recipient` error (signed-in email ≠ invited email) shows
  guidance: "Open the link from your email invitation" or "ask the sender to
  invite {your-email}" — not a dead-end error string.
- **Evidence class:** browser-proven + unit test.

### UX-013: Mobile estimate-tree navigation parity
**Source:** UX-SHR-07
**Outcome:** The estimate tree sidebar (`ShareEstimateTreePanel`) is currently
`hidden lg:flex` — invisible below 1024px. The mobile "Summary" view gets a
navigation equivalent (collapsible accordion, dropdown, or a drawer-triggered
tree) so recipients on phones can navigate between estimate sections.
**Acceptance criteria:**
- AC-070: On viewports below 1024px, the tree/summary view provides section
  navigation (not just a flat tree with no way to jump between sections).
- **Evidence class:** browser-proven (768px + 375px).

### UX-014: Collated table "show more" beyond 250 rows
**Source:** UX-SHR-08
**Outcome:** The `COLLATED_ROW_LIMIT = 250` dead-end ("Showing first 250 of N")
is replaced with a "Show more" / "Load all" control so recipients can browse all
line items without guessing filter terms.
**Acceptance criteria:**
- AC-071: When a sheet has > 250 rows, a "Show more" or "Load all" control appears
  below the table.
- AC-072: Clicking it expands the table (or paginates) to show the remaining rows.
- **Evidence class:** browser-proven.

### UX-015: Comment "load more" client-side pagination UI
**Source:** SEC-004 (server cursor pagination), UX-006
**Outcome:** The comment component provides a visible "Load more" button or
infinite-scroll trigger to fetch subsequent comment pages via the SEC-004 cursor.
This is the client-side counterpart to the server-side pagination.
**Acceptance criteria:**
- AC-073: When `hasMore` is true from the comment API, a "Load more" control appears.
- AC-074: Clicking it fetches the next page via cursor and appends to the list.
- **Evidence class:** browser-proven.

### UX-016: Decision signer-name consistency
**Source:** UX-SHR-20
**Outcome:** The signer-name requirement is consistent across decision types.
Currently `accepted` requires a name but `declined`/`revision_requested` do not —
an asymmetric audit trail. Either all three require a name (preferred for audit
completeness) or none do. This plan requires: all binding decisions (accept,
decline) capture a signer name; revision_requested is advisory and does not.
**Acceptance criteria:**
- AC-075: The `declined` decision requires a signer name (matching `accepted`).
- AC-076: The `revision_requested` decision does not require a signer name
  (advisory feedback, not a binding response).
- **Evidence class:** automated test (decision route) + browser-proven.

### UX-017: Row-click keyboard model (no tab trap)
**Source:** UX-005, accessibility audit (keyboard accessibility)
**Outcome:** The row-click select pattern (UNIT-017) does not create a keyboard
tab trap. Instead of making every row `tabIndex=0` (250 tab stops), use a roving-
tabindex model: one tab stop per table, arrow keys to move between rows, Enter to
select.
**Acceptance criteria:**
- AC-077: The estimate table has at most one tab stop (not one per row).
- AC-078: Arrow keys move focus between rows; Enter/Space selects the review target.
- **Evidence class:** browser-proven (keyboard-only test).

### UX-018: Sticky decision bar — accessibility and non-occlusion
**Source:** UX-003, accessibility audit
**Outcome:** The sticky decision bar is discoverable by screen readers and does not
obscure content at the bottom of the page.
**Acceptance criteria:**
- AC-079: The sticky bar is an `aria-label`'d region (e.g., `role="region"
  aria-label="Quick response"`).
- AC-080: `scroll-padding-bottom` (or equivalent) prevents the bar from obscuring
  the decision section when scrolled to the bottom.
- **Evidence class:** browser-proven (scroll test + screen reader).

### UX-019: JS-disabled share page graceful degradation
**Source:** FN (client-only components on share page)
**Outcome:** Without JavaScript, the recipient can still see the proposal content
(header, summary, estimate tables). Interactive elements (comments, decisions)
show a message directing to the email link or phone contact. The server-rendered
RSC payload must include the estimate data, not just empty client-component shells.
**Acceptance criteria:**
- AC-081: With JS disabled, the proposal header, summary card, and estimate tables
  are visible (server-rendered).
- AC-082: With JS disabled, the comments/decision sections show a message instead
  of blank space.
- **Evidence class:** browser-proven (JS disabled test).

### UX-020: Roster card labeled actions (no icon-only)
**Source:** UX-PUB-08
**Outcome:** The roster card actions (Copy/Preview/Manage) use labeled buttons, not
icon-only — addressing the "three tiny unlabeled icons" gap.
**Acceptance criteria:**
- AC-083: Roster card actions have visible text labels (or icon + label), not
  icon-only with tooltip.
- **Evidence class:** browser-proven.

### UX-021: Roster copy-state aria-live cleanup
**Source:** UX-PUB-15
**Outcome:** The copy-state `aria-live` region announces only the most recent copy
action, not a concatenated string of all publications' states.
**Acceptance criteria:**
- AC-084: After copying a link, the aria-live region announces only that one
  publication's copy state (e.g., "Link copied"), not all publications.
- **Evidence class:** browser-proven (screen reader).

## SEC — Security/Privacy Requirements

### SEC-001: Stream-enforced body-size limits on public POST routes
**Source:** FN-03
**Outcome:** All retained public POST routes (`password`, `comment`, `decision`,
`session`, `unsubscribe`) use a shared bounded stream reader before parsing. The
reader never trusts `Content-Length`; it rejects unsupported content encodings
and stops reading as soon as the route-specific byte limit is exceeded.
**Acceptance criteria:**
- AC-040: Each retained public POST route rejects oversized bodies with 413 for
  absent, invalid, understated, or truthful `Content-Length`, including chunked
  requests and the explicitly limited unsubscribe form-data route.
- **Evidence class:** automated test (route handler test).

### SEC-002: Status-code consistency for password-required
**Source:** FN-04
**Outcome:** All JSON API routes return 423 (Locked) — not 401 — when a password
is required and the access cookie is absent.
**Acceptance criteria:**
- AC-041: Comment GET and decision GET return 423 for password-required (matching
  other routes).
- **Evidence class:** automated test.

### SEC-003: Durable decision overload authority
**Source:** FN-05
**Outcome:** The existing D1-backed decision rate limiter remains the authoritative
cross-isolate admission control. Optional isolate-local failure shedding may reduce
load in one isolate, but is best effort and never claimed as global protection.
**Acceptance criteria:**
- AC-042: Decision POST consults the durable limiter before mutation, returns its
  denial status and retry metadata consistently, and tests prove isolate-local
  state is not treated as cross-isolate authority.
- **Evidence class:** automated test.

### SEC-004: Comment pagination
**Source:** FN-07
**Outcome:** The comment GET endpoint supports cursor-based pagination instead
of a hard 200-cap.
**Acceptance criteria:**
- AC-043: Comment list returns a cursor when more than the page limit exist.
- AC-044: Client fetches subsequent pages via cursor.
- **Evidence class:** automated test + browser-proven.

### SEC-005: Snapshot sanitization reentrance safety
**Source:** FN-08
**Outcome:** The module-global mutable `currentSanitizeIdMaps` is replaced with a
request-scoped or parameter-passed approach to prevent concurrent-sanitization
data corruption.
**Acceptance criteria:**
- AC-045: No module-level mutable state in snapshot sanitization.
- **Evidence class:** static review + unit test (concurrent sanitization).

### SEC-006: Runtime/provider readiness for publication secrets
**Source:** FN-11
**Outcome:** `bun run cf:check-readiness` and the provider secret readiness path
verify required publication secret bindings before a Worker release. Request-time
secret readers remain fail-closed for runtime defense; no module-import
`process.env` assertion is used as a Worker startup guarantee.
**Acceptance criteria:**
- AC-046: Missing or invalid required bindings fail the explicit release readiness
  command, while request-time readers still reject absent bindings.
- **Evidence class:** automated readiness-script test + request-time unit test.

### SEC-007: Dead code cleanup — events route and download_attempt_blocked
**Source:** FN-01, FN-02, G.5
**Outcome:** Remove the unconsumed `events/route.ts`, remove
`download_attempt_blocked` from both TypeScript event unions, and remove it from
the rebuilt `shared_link_events` CHECK in migration 0053. The print control does
not create client telemetry.
**Acceptance criteria:**
- AC-047: No unused API routes or dead event types remain in the publication surface.
- **Evidence class:** static review (grep for consumers).

### SEC-008: Authenticated manager preview isolation
**Source:** DEC-AUTO-001, DEC-AUTO-002, DEC-AUTO-009
**Outcome:** Preview lives under `/workshop/publisher/preview/[projectId]`, uses the
current Better Auth manager session, and rechecks project-manager RBAC on every
read. It never reads or writes recipient-session or preview bearer cookies.
**Acceptance criteria:**
- AC-085: An unauthenticated, wrong-workspace, or non-manager request cannot read
  preview data even if it possesses a public share or recipient-session cookie.
- AC-086: Every preview render resolves the current user and reruns
  `assertProjectPublicationManager` before loading the publication snapshot.
- AC-087: Exiting preview navigates back to the manager surface; no preview
  credential exists to clear, persist, or compete with a recipient session.
- **Evidence class:** automated test + browser-proven.

### SEC-009: Unsubscribe surface explicitly scoped
**Source:** FN (unsubscribe route absent from plan)
**Outcome:** The `/api/share/[token]/unsubscribe` route (GET interstitial + POST
mutation) is explicitly in-scope for SEC-001 body-size limits and is acknowledged
as part of the recipient email experience. Its inline-HTML GET interstitial is
preserved as-is (it is the email-client-safe confirmation page). No redesign of
the unsubscribe surface is in scope — only the body-size hardening.
**Acceptance criteria:**
- AC-088: The unsubscribe POST route enforces the body-size limit (SEC-001).
- **Evidence class:** automated test.



## DATA — Data/Integrity Requirements

### DATA-001: Foreign key constraints on publication tables
**Source:** FN-09
**Outcome:** Rebuild publication/shared-link tables with explicit columns and
`REFERENCES ... ON DELETE CASCADE`. The migration fails closed on any orphan and
never deletes or silently repairs source rows.
**Acceptance criteria:**
- AC-048: Migration adds FK constraints; existing data passes constraint check.
- AC-049: Deleting a project cascades to its publications and shared-link rows.
- **Evidence class:** D1 migration test + local D1 proof.

### DATA-002: Roster query optimization
**Source:** G.1 (roster post-processing), FN (performance)
**Outcome:** Move recipient/comment/response counts from row-scan-in-JS to
`GROUP BY publication_id` SQL aggregation. Add SQL-level pagination support.
**Acceptance criteria:**
- AC-050: Roster query uses `GROUP BY` aggregation instead of shipping up to 1000
  child rows per table.
- AC-051: SQL-level pagination (LIMIT/OFFSET or cursor) is available.
- **Evidence class:** local D1 query proof + performance evaluator.

## PERF — Performance Requirements

### PERF-001: Debounced search and reduced re-renders
**Source:** UX-PUB-11
**Outcome:** Publisher search debounces; roster re-renders are reduced.
**Acceptance criteria:**
- AC-052: Search triggers at most one server re-render per debounce window.
- **Evidence class:** browser-proven (interaction timing).

### PERF-002: Roster query evaluator baseline
**Source:** DATA-002
**Outcome:** A performance evaluator measures roster query time at 10/50/100
publications and asserts no regression from the optimized query.
**Acceptance criteria:**
- AC-053: Evaluator runs and reports query time at scale thresholds.
- **Evidence class:** local D1 evaluator.

## OPS — Operations Requirements

### OPS-001: No deploy in this plan
**Outcome:** This plan produces local implementation and browser-proven UX.
Hosted D1 migration and production deploy are explicit release boundaries.
**Acceptance criteria:**
- AC-054: No `wrangler deploy` or hosted mutation is performed by this plan.
- **Evidence class:** N/A (boundary).

## Deferred Requirements (explicitly out of scope)

| ID | Requirement | Reason |
|---|---|---|
| REQ-DEFER-01 | Real-time comment/decision updates (SSE/WebSocket) | Separate future effort; window-focus refetch is adequate |
| REQ-DEFER-02 | Server-generated PDF (Puppeteer on Workers) | Workers runtime constraint; browser print path is used |
| REQ-DEFER-03 | E-signature / legal-grade signing | Future compliance feature |
| REQ-DEFER-04 | Full i18n / multi-language | Currency fix is in scope; translation is future |
| REQ-DEFER-05 | Custom white-label branding (per-firm) | Sender name from data is in scope; full white-label is future |
| REQ-DEFER-06 | Proposal comparison view | Future feature |
| REQ-DEFER-07 | Bulk publish / template | Future feature |
| REQ-DEFER-08 | Audit trail export | Future compliance feature |

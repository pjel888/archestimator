# 11 — Decisions, Assumptions, And Alternatives

## DEC-AUTO-001: Preview-as-client mechanism

**Question:** How should the "preview as client" mode be implemented to let
managers see the recipient experience without emailing themselves?

**Affected IDs:** REQ-003, AC-007, AC-008

**Evidence and freshness:** `src/lib/publication/security.ts` (cookie model),
`src/app/share/[token]/page.tsx` (session reading), `actions.ts` (RBAC). Current
as of HEAD 081a0757a.

**Options:**
1. **Preview cookie** — `createClientPreviewSession` sets a signed
   `ae_publication_preview_*` cookie; share page reads it alongside session cookie.
2. **Query param** — `/share/<token>?preview=1`; share page conditionally enables features.
3. ** Separate preview route** — `/workshop/preview/<projectId>` renders a parallel
   component tree.

**Decision:** Option 1 (preview cookie).

**Why this option:** Manager-auth-gated (RBAC at cookie creation). Doesn't expose
a public URL pattern that could be guessed. Distinct from real recipient session.
Clean separation of concerns.

**Rejected alternatives:**
- Option 2 (query param) blurs the security boundary — a public URL with `?preview=1`
  could be shared, and the share page server component would need to trust it.
- Option 3 (separate route) duplicates the entire share component tree — high
  maintenance cost for a preview feature.

**Confidence:** High.

**Consequences:** One new server action (`createClientPreviewSession`) + one new
cookie type. Share page reads the preview cookie and renders a banner + enables
non-persistent UI.

**Rollback/revision trigger:** If the preview cookie causes confusion or security
concerns, switch to Option 3 (separate route) which fully isolates preview from
the public surface.

**Responsible role:** architect + executor.

---

## DEC-AUTO-002: Preview mode action handling

**Question:** Should managers be able to submit comments/decisions in preview mode?

**Affected IDs:** REQ-003, AC-008

**Evidence and freshness:** `comment/route.ts`, `decision/route.ts` (write paths).

**Options:**
1. **Disable submit** — buttons render but are disabled with "Preview mode —
   actions are not saved" messaging.
2. **Non-persistent submit** — POST returns 200 with fake success but doesn't
   write to D1.
3. **Allow real submit** — preview mode uses the manager's real identity.

**Decision:** Option 1 (disable submit).

**Why this option:** Simplest, clearest, zero risk of preview writes polluting
real data. The manager sees the full UI (what the recipient sees) but can't
accidentally create a real comment or decision.

**Rejected alternatives:**
- Option 2 (fake success) is misleading and adds complexity to the API routes.
- Option 3 (real submit) pollutes the publication with manager-authored test data.

**Confidence:** High.

**Consequences:** Preview mode is view-only with visible-but-disabled action UI.

**Rollback/revision trigger:** If managers need to test the submission flow,
add Option 2 with a clear "test comment" marker.

**Responsible role:** architect.

---

## DEC-AUTO-003: QR code implementation

**Question:** How to render QR codes for the share link?

**Affected IDs:** REQ-002, AC-006

**Evidence and freshness:** No existing QR code dependency in `package.json`.

**Options:**
1. **`qrcode` npm package** — ~30KB minified, MIT, well-maintained.
2. **Client-side SVG QR encoder** — no dependency, ~100-150 lines of code.
3. **No QR code** — drop the feature (URL + copy is enough).

**Decision:** Option 1 (`qrcode` npm package) if bundle evaluation is acceptable;
otherwise Option 2.

**Why this option:** The `qrcode` package is battle-tested, small, and generates
SVG output (no canvas needed). The dependency is low-risk. If the bundle size is
unacceptable, a lightweight SVG encoder is the fallback.

**Rejected alternatives:**
- Option 3 (no QR) drops a useful mobile-to-desktop transfer feature that Philip's
  request implies ("I can't even get to the shared link page").

**Confidence:** Medium (pending bundle evaluation).

**Consequences:** One new dependency (evaluate license/security/maintenance per
GATE-CONTRACT-01). Bundle size impact measured before merge.

**Rollback/revision trigger:** If the dependency causes issues, remove and use
Option 2 or Option 3.

**Responsible role:** dependency-expert + executor.

---

## DEC-AUTO-004: Publisher roster layout — cards vs table

**Question:** Should the redesigned roster use cards or keep the table layout?

**Affected IDs:** REQ-005, UX-PUB-03, UX-PUB-08

**Evidence and freshness:** Current table is `min-w-[920px]` and desktop-only.
Cards are more mobile-friendly.

**Options:**
1. **Cards only** — replace the table entirely with responsive cards.
2. **Cards on mobile, table on desktop** — responsive switch.
3. **Table only** — keep table, add horizontal scroll for mobile.

**Decision:** Option 2 (cards on mobile, optional table on desktop).

**Why this option:** Cards are scannable and mobile-friendly. Power users on
desktop may prefer the dense table. Offering both respects different workflows.
The card layout is the default; the table is a toggle.

**Rejected alternatives:**
- Option 1 (cards only) removes the dense view power users may want.
- Option 3 (table only) doesn't solve the mobile problem — horizontal scroll is
  poor UX.

**Confidence:** Medium.

**Consequences:** Two layout components (`PublisherRosterCard` + existing table).
Slightly more maintenance, but both reuse the same data and actions.

**Rollback/revision trigger:** If maintaining two layouts is burdensome, drop the
table and use cards only.

**Responsible role:** architect.

---

## DEC-AUTO-005: Sidebar label — "Share" vs "Client Links"

**Question:** What should the sidebar nav item be renamed to?

**Affected IDs:** REQ-004, UX-PUB-02

**Options:**
1. **"Share"** — short, clear, action-oriented.
2. **"Client Links"** — descriptive, noun-oriented.
3. **"Shared Links"** — past-tense, matches the feature name.

**Decision:** Option 1 ("Share").

**Why this option:** Shortest, clearest, action-oriented. Matches the primary
verb the user wants to do. "Client Links" is descriptive but longer. "Shared
Links" is past-tense and less action-oriented.

**Rejected alternatives:** Options 2 and 3 are valid but less crisp.

**Confidence:** Medium (Philip may prefer a different label — this is easily
changed, one line in `MainSidebar.tsx`). This is classified DEC-AUTO because it is
fully reversible (one-line change) and does not block implementation. Philip can
override at any time during review.

**Consequences:** Nav label, page title, and breadcrumb update.

**Rollback/revision trigger:** Philip's preference overrides this decision at any
time (design decision, alpha-stage `DESIGN.md`).

**Responsible role:** architect (Philip has final say on labels).

---

## DEC-AUTO-006: Comment pagination — cursor vs offset

**Question:** How to paginate comments beyond the 200 cap?

**Affected IDs:** SEC-004, AC-043, AC-044

**Options:**
1. **Cursor-based** (encrypted, like the activity cursor) — stable under inserts.
2. **Offset-based** (`?page=2`) — simpler but unstable under new inserts.

**Decision:** Option 1 (cursor-based), reusing the existing `activity-helpers.ts`
cursor crypto pattern.

**Why this option:** Comments are append-mostly. Cursor pagination is stable when
new comments arrive between page fetches. The codebase already has the cursor
crypto infrastructure.

**Rejected alternatives:** Offset is simpler but can skip/duplicate comments when
new ones arrive mid-pagination.

**Confidence:** High.

**Consequences:** Comment GET returns `{comments, hasMore, nextCursor}`. Client
uses cursor for "load more" or infinite scroll.

**Rollback/revision trigger:** If cursor complexity is unwarranted for typical
comment volumes, fall back to a higher fixed cap (e.g., 500).

**Responsible role:** architect + executor.

---

## DEC-AUTO-007: Estimate table row-action redesign

**Question:** How to replace the per-row "Ask about item" button to reduce noise?

**Affected IDs:** UX-005, AC-024, AC-025

**Options:**
1. **Row click selects** — clicking a row sets it as the review target; a detail
   panel or inline indicator shows "Reviewing: {item}".
2. **Hover action** — button appears on hover (desktop) / long-press (mobile).
3. **Bulk action bar** — select rows via checkboxes, then "Ask about selected".

**Decision:** Option 1 (row click selects) with a visible indicator on the
selected row.

**Why this option:** Clicking a row is the most natural interaction. The selected
row gets a visual highlight (existing `data-review-target-selected` + `bg-surfaceMuted`).
The "Reviewing: {item}" bar in `ShareReviewWorkspace` already exists. This removes
250 buttons and adds one click pattern.

**Rejected alternatives:**
- Option 2 (hover) doesn't work on touch devices.
- Option 3 (bulk) is overkill for the typical use case (asking about one item).

**Confidence:** High.

**Consequences:** Rows are clickable (with appropriate `role` and keyboard support).
The existing review-target context flows through unchanged.

**Rollback/revision trigger:** If row-click conflicts with other row interactions
(e.g., cell copy), refine to a dedicated "select" affordance.

**Responsible role:** UX architect + executor.

---

## DEC-AUTO-008: Dead events route disposition

**Question:** Wire or remove `src/app/api/share/[token]/events/route.ts`?

**Affected IDs:** SEC-007, FN-01, FN-02

**Options:**
1. **Remove entirely** — no consumer exists; telemetry is non-critical.
2. **Wire to Download PDF button** — emit `download_attempt_blocked` if print is
   blocked, or `open` as a client-side telemetry companion.
3. **Keep as-is** — forward-looking infrastructure.

**Decision:** Option 1 (remove) unless the Download PDF button (REQ: UX-007)
naturally emits telemetry during implementation.

**Why this option:** Dead code is attack surface and maintenance burden. The
existing server-side telemetry (in `page.tsx` `after()` and route handlers) already
captures open/password/decision events. Client-side telemetry via a public POST
endpoint adds risk without clear value.

**Rejected alternatives:**
- Option 2 (wire) is valid only if there's a concrete telemetry need.
- Option 3 (keep) accumulates technical debt.

**Confidence:** Medium.

**Consequences:** Remove `events/route.ts` (UNIT-007). The `download_attempt_blocked`
enum decision is deferred to UNIT-019 (Layer 3) to avoid a layer race — UNIT-007
leaves the enum in place, UNIT-019 decides wire-or-remove after the Download PDF
button is implemented.

**Rollback/revision trigger:** If Philip wants client-side event tracking, re-add
with a concrete consumer.

**Responsible role:** architect.

---

## DEC-AUTO-009: Preview-cookie precedence (manager who is also a recipient)

**Question:** If a manager has both a preview cookie and a real recipient session
cookie, which takes precedence?

**Affected IDs:** REQ-003, SEC-008, AC-085, AC-086, AC-087

**Evidence and freshness:** `security.ts` (session cookie model), `page.tsx`
(cookie reading). Current as of HEAD 081a0757a.

**Options:**
1. **Real session wins** — preview mode only activates when no valid recipient
   session exists. If a manager is also a recipient, their real session takes
   precedence and they can comment/decide normally.
2. **Preview wins** — preview mode always activates when the preview cookie is
   present, overriding any real session.
3. **Prompt the user** — show a "You have a real session. Continue as recipient
   or switch to preview?" dialog.

**Decision:** Option 1 (real session wins).

**Why this option:** Prevents a legitimate recipient from having their
comment/decision ability silently disabled by clicking "Preview." A manager who
is also a recipient should never lose their real capabilities. Preview is a
manager-only convenience; it should not override a real session.

**Rejected alternatives:**
- Option 2 (preview wins) silently disables real capabilities — dangerous.
- Option 3 (prompt) adds friction for an edge case that rarely matters.

**Confidence:** High.

**Consequences:** The share page checks the real session cookie first. If valid,
preview mode is not activated. Preview only activates when no valid recipient
session exists. The preview cookie is cleared via an explicit "Exit preview"
action (AC-087).

**Rollback/revision trigger:** If the precedence check causes confusion (e.g., a
manager expects preview but gets their real session), add a banner "You're
viewing as a real recipient, not in preview mode" with a link to clear the session.

**Responsible role:** architect + executor.

---

## Assumptions

### ASSUMP-001: Existing publication server actions are stable
**Status:** ACTIVE
**Claim:** The server actions in `actions.ts` (create/republish/rotate/revoke,
recipient management) work correctly and their signatures don't change.
**Validation trigger:** If an action's behavior is found broken during
implementation, create a fix unit and re-validate.

### ASSUMP-002: SQLite table-rebuild pattern works for FK migration
**Status:** VALIDATED
**Claim:** D1 (SQLite) does NOT support `ALTER TABLE ADD CONSTRAINT` — verified
by parse-error test against local sqlite3 v3.54.0. The table-rebuild pattern
(CREATE with FKs → INSERT SELECT → DROP → RENAME → recreate indexes) is the
correct approach, following the convention in `migrations/0040_operational_incidents.sql:42-103`.
**Validation trigger:** Applied and tested in UNIT-008.

### ASSUMP-003: `qrcode` package bundle size is acceptable
**Status:** ACTIVE
**Claim:** The `qrcode` npm package adds < 50KB to the client bundle.
**Validation trigger:** Measure bundle size after addition. If > 50KB, switch to
Option 2 (hand-rolled SVG encoder).

### ASSUMP-004: Browser print path is adequate for "Download PDF"
**Status:** ACTIVE
**Claim:** The existing `print.css` + `window.print()` produces acceptable PDF
output via browser "Save as PDF." No server-side PDF generation is needed.
**Validation trigger:** Test print output in Chrome/Safari. If quality is
unacceptable, escalate to a future server-PDF plan (out of scope here).

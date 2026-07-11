# 11 - Decisions, Assumptions, And Alternatives

All decisions below are `DEC-AUTO-*` implementation choices inside the
`IMPLEMENT_LOCAL` ceiling. None grants hosted mutation or production deploy
authority.

## DEC-AUTO-001 - Dedicated Authenticated Manager Preview Route

**Affected:** REQ-003, AC-007, AC-008

**Decision:** Preview uses `/workshop/publisher/preview/[projectId]`. Each server
render resolves the current Better Auth context, runs
`assertProjectPublicationManager`, loads the current sanitized publication
snapshot, and renders the existing recipient presentation in explicit read-only
preview mode.

**Rejected:** A signed preview cookie or query bearer because it creates a second
share-capable credential and precedence rules. A real recipient invitation is
also rejected because preview must not mutate recipient or delivery state.

**Revision trigger:** Revisit only if the protected route cannot reuse the
recipient presentation without duplicating security-sensitive view-model logic.

## DEC-AUTO-002 - Preview Mutations Are Disabled

**Affected:** REQ-003, AC-007, AC-008

**Decision:** Preview renders comment and decision states but omits or disables
their mutations. A persistent banner identifies preview mode and links back to
the manager surface.

**Rejected:** Simulated writes because they risk being mistaken for durable
recipient activity. Real writes are reserved for the public route after its own
recipient authorization.

## DEC-AUTO-003 - Dependency-Free Link Transfer

**Affected:** REQ-002, REQ-013, AC-004, AC-005, AC-006, AC-064, AC-065

**Decision:** Show selectable URL text and a labeled Copy control everywhere.
Expose a labeled native Web Share control when `navigator.share` exists, retaining
Copy when the API is absent, rejected, or fails.

**Rejected:** QR generation, a QR package, a hand-built encoder, or server-side
QR output. The transfer outcome is met by existing platform capabilities without
bundle, maintenance, privacy, or lockfile cost.

## DEC-AUTO-004 - Cards First, Optional Dense Table

**Affected:** REQ-005, UX-005

**Decision:** Cards are the responsive default; a dense table remains optional
on desktop for scanning. Both variants use labeled actions and the same query
state.

**Rejected:** Desktop-only table and mobile hard-block because they preserve the
current failure. Cards-only is rejected because it removes a useful dense view.

## DEC-AUTO-005 - User-Facing Label Is Share

**Affected:** REQ-004, AC-009

**Decision:** Navigation and primary commands use "Share". Internal module names
may remain `publisher` where renaming would add risk without user value.

**Rejected:** "Publisher" because it is product-internal jargon. "Proposals" is
too narrow for the management surface.

## DEC-AUTO-006 - Opaque Cursor Comment Pagination

**Affected:** SEC-004, AC-043, AC-044

**Decision:** The comment feed uses a server-validated opaque cursor derived from
`{createdAt,id}`, deterministic ordering, and a bounded page size. The first-page
response remains backward compatible and the client appends later pages.

**Rejected:** Offset pagination because concurrent inserts shift pages. An
unbounded response is rejected because it retains the current cap failure.

## DEC-AUTO-007 - Roving-Tabindex Row Selection

**Affected:** UX-005, AC-024, AC-025

**Decision:** Clicking a non-interactive row area selects the review target. One
row is keyboard-focusable at a time; arrow keys move and Enter/Space selects.
Nested controls stop propagation and retain their native behavior.

**Rejected:** One action button in every row because it creates visual and tab
noise. Making every row `tabIndex=0` is rejected as a keyboard trap.

## DEC-AUTO-008 - Remove Dead Events Surface Now

**Affected:** SEC-007, AC-047

**Decision:** UNIT-007 removes `events/route.ts`, both TypeScript
`download_attempt_blocked` union members, and the unused disabled-state export.
UNIT-008's rebuilt event table excludes the dead value from its current CHECK.
The print control emits no telemetry.

**Rejected:** Wiring telemetry to justify dead code and deferring the event type
to UNIT-019. Both create unnecessary coupling and leave an unowned contract.

## DEC-AUTO-009 - Preview Has No Credential Precedence

**Affected:** REQ-003, SEC-008, AC-085, AC-086, AC-087

**Decision:** The protected manager preview route and public recipient route are
separate authorization domains. Preview reads only the current manager session;
it never reads or writes preview, public-token, or recipient-session authority.
Exit is normal navigation, so no preview credential requires cleanup.

**Rejected:** "Recipient session wins" and "preview cookie wins" policies because
both accept an unnecessary credential collision. Route isolation removes the
collision instead of ordering it.

## Assumptions

### ASSUMP-001 - Existing Publish Actions Are Stable

**Status:** ACTIVE

The existing publication actions, token/password controls, snapshot builder, and
email composer remain the implementation base. Validate their signatures before
UNIT-011; if source has drifted, update the unit paths and tests before editing.

### ASSUMP-002 - SQLite Requires Table Rebuild For Foreign Keys

**Status:** VALIDATED

SQLite/D1 does not support `ALTER TABLE ... ADD CONSTRAINT` for this change.
Migration 0053 therefore uses a fail-closed explicit-column table rebuild with
row-digest, count, FK, index, trigger, and failure-injection proof.

### ASSUMP-003 - QR Package Is Needed

**Status:** RETIRED

The product outcome does not require QR rendering. DEC-AUTO-003 resolves transfer
with URL, Copy, and native Web Share. No bundle-size assumption or dependency
evaluation remains.

### ASSUMP-004 - Browser Print Is Adequate For This Scope

**Status:** ACTIVE

The existing print stylesheet plus a visible `window.print()` control is the
local implementation. A server-generated PDF remains explicitly deferred. The
claim is not proven until the targeted Chrome/Safari print review runs in the
execution stage.

## Decision Revalidation

Re-evaluate a decision only on source drift, a failed mapped test, a security
invariant conflict, or a material product-scope change. Label preference, new
dependency adoption, hosted mutation, and production deploy are not implied by
this plan's implementation-ready status.

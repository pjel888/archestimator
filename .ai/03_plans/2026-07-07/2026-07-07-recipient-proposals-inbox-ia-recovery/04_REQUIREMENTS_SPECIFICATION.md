# 04 — Requirements Specification

Every requirement has a stable ID, a source-strength tag, objective acceptance criteria, the failure UX, the failure-system record, and the proof method. Source-strength vocabulary: `brief`, `repo evidence`, `official docs`, `provider proof`, `assumption`, `derived`, `owner-delegated`.

Categories: FR (functional), UX, A11Y, ARCH, DATA, API, SEC, PERF, REL, OPS, TEST, DOC.

## FR — Functional requirements

### FR-01 — Map recipient personas and entry points
- **Statement:** The system must document and reconcile exactly two recipient entry points: (a) the signed-in inbox at `/workshop/proposals` (email-keyed), and (b) the public share link at `/share/[token]?recipient=…` (token-keyed). A recipient reaching the inbox from a share page must be able to, and a recipient reaching the share page from the inbox must already have a valid session.
- **Rationale:** PROMPT.md "Map recipient personas, email matching." Two distinct auth surfaces (app session vs P5 share session) currently do not coordinate identity.
- **Source:** brief + repo evidence (`proposals-page-client.tsx`, `share/[token]/page.tsx`, `openRecipientProposalAction`).
- **Priority:** Must.
- **Dependencies:** FR-02, FR-03, FR-05, SEC-02.
- **Acceptance criteria:**
  - AC-FR-01a: A diagram in `06_ARCHITECTURE_AND_TECHNICAL_DESIGN.md` shows both entry points and the bridging actions.
  - AC-FR-01b: The "View all your proposals" link appears on the share session banner when a valid P5 session exists (links to `/workshop/proposals`).
- **Failure UX:** If the bridge fails (e.g. session expired mid-click), the user lands on the inbox empty/error state with the standard recovery copy.
- **Failure-system record:** Existing `RecipientProposalsQueryError` (`unauthorized`/`unknown`) is sufficient; no new event.
- **Validation:** DOM test asserting the banner link renders when `isValid` and is absent otherwise. See TEST-01.
- **Affected code areas:** `SharePageSessionBanner.tsx`, `proposals-page-client.tsx` (consumer of any bridge cookie).
- **Risks:** Linking from share → inbox could confuse a recipient who has no account. Mitigation: only show when a valid P5 session exists (which implies a recipient record).
- **Status:** pending.

### FR-02 — Email-link → inbox continuity (share → inbox)
- **Statement:** A recipient with a valid P5 share session who navigates to `/workshop/proposals` must see the proposal they just acted on in their inbox (no manual refresh beyond the existing debounced focus/visibility refresh). Conversely, a "View all your proposals" affordance on the share page links to the inbox.
- **Rationale:** PROMPT.md "email-link continuity."
- **Source:** brief + repo evidence (TanStack Query `staleTime: 30_000` + debounced refresh).
- **Priority:** Must.
- **Dependencies:** FR-01, FR-05.
- **Acceptance criteria:**
  - AC-FR-02a: After submitting a decision on `/share/[token]`, navigating to `/workshop/proposals` shows the decision chip within one debounced refresh (≤ ~1s of focus/visibility or manual refresh).
  - AC-FR-02b: The share session banner shows "View all your proposals" → `/workshop/proposals` when `isValid`.
- **Failure UX:** If the inbox query fails, the soft-error banner offers Retry (existing).
- **Failure-system record:** Existing error typing.
- **Validation:** DOM/integration test simulating decision-then-navigate; see TEST-02.
- **Affected code areas:** `SharePageSessionBanner.tsx`, `proposals-page-client.tsx`.
- **Status:** pending.

### FR-03 — Inbox → share continuity (open action)
- **Statement:** The existing `openRecipientProposalAction` must continue to mint the P5 session cookies for passwordless publications and redirect to `/share/[token]`. For password-protected publications, it must redirect to the share page where the password gate is shown (current behavior).
- **Rationale:** PROMPT.md "email-link continuity"; existing behavior is correct; this requirement pins it against regression.
- **Source:** repo evidence (`openRecipientProposalAction` lines 304–380).
- **Priority:** Must.
- **Dependencies:** SEC-02.
- **Acceptance criteria:**
  - AC-FR-03a: Clicking "Review" on a published, passwordless proposal sets both `shared_link_session_*` cookies and redirects to `/share/[token]` with `isValid:true`.
  - AC-FR-03b: Clicking "Review" on a password-protected publication redirects to `/share/[token]` without minting the session cookie; the password gate renders.
- **Failure UX:** `not-a-recipient` / `unavailable` / `invalid` inline row messages (existing) plus the new wrong-account recovery CTA (FR-06).
- **Validation:** Existing `recipient-proposals-action.test.ts` covers mint/no-mint; extend with wrong-account branch. See TEST-03.
- **Status:** pending (pins existing behavior; new wrong-account branch under FR-06).

### FR-04 — No-proposal empty state must distinguish "no proposals" from "wrong email"
- **Statement:** When the inbox query returns zero rows, the empty state must distinguish "you have no proposals at this email" (current copy) from "you may be signed in as a different email than the one that received the proposal." The distinction is informational, not a proactive mismatch scan (the system cannot know which other email a proposal was sent to without leaking recipient data).
- **Rationale:** PROMPT.md "no-proposal empty state." Currently a wrong-account recipient sees an identical empty state to a genuinely-empty inbox.
- **Source:** brief + repo evidence (`ProposalsEmptyState.tsx`).
- **Priority:** Must.
- **Dependencies:** FR-06.
- **Acceptance criteria:**
  - AC-FR-04a: The empty state shows a secondary line/callout: "Not seeing a proposal you were expecting? It may have been sent to a different email." with a link to sign out / switch account.
  - AC-FR-04b: The empty state copy remains non-leaky (does not confirm or deny that a proposal exists for any other email).
- **Failure UX:** N/A (this *is* the empty/recovery state).
- **Validation:** DOM test asserting both branches of copy and the sign-out link. See TEST-04.
- **Affected code areas:** `ProposalsEmptyState.tsx`.
- **Status:** pending.

### FR-05 — Recipient matching model (email-string for listing)
- **Statement:** For V1, recipient listing continues to match on `lower(recipient.email) = lower(signed-in email)` in D1. The acting path (open, decide) remains session-bound where applicable. This is the recommended hybrid (OPEN-IA-01).
- **Rationale:** Changing the listing query to session-bound `recipientId` would break the "list all my proposals" use case (a session cookie is per-token). The email match is backed by the `idx_shared_link_recipients_lower_email` index.
- **Source:** repo evidence + owner-delegated (OPEN-IA-01).
- **Priority:** Must.
- **Dependencies:** SEC-02.
- **Acceptance criteria:**
  - AC-FR-05a: The listing query is unchanged in shape (still `lower(recipient.email) = ?`, still no credential columns).
  - AC-FR-05b: The decision API continues to require a valid P5 session cookie (`verifySharedLinkSessionCookieValue`), not the app session, for the acting path.
- **Validation:** Existing `recipient-proposals-repository.test.ts` (credential-free assertion) + a new assertion that the acting path rejects app-session-only. See TEST-05.
- **Status:** pending.

### FR-06 — Wrong-account recovery flow
- **Statement:** When `openRecipientProposalAction` returns `not-a-recipient`, the inbox row must show a differentiated recovery CTA — "This proposal was sent to a different email. Sign in with the right account." — with a sign-out/switch-account action, modeled on the invite flow's wrong-account denial. The system must **not** reveal which email the proposal was sent to.
- **Rationale:** PROMPT.md "wrong-account states." Currently a bare inline message with no recovery.
- **Source:** brief + repo evidence (invite `page.tsx` wrong-account pattern; `ProposalRow.readActionErrorMessage`).
- **Priority:** Must.
- **Dependencies:** SEC-04.
- **Acceptance criteria:**
  - AC-FR-06a: The `not-a-recipient` row message renders a sign-out/switch-account CTA (link or button) that routes to `/login` (or the sign-out path).
  - AC-FR-06b: The CTA never discloses the intended recipient email.
  - AC-FR-06c: The CTA is keyboard-reachable and announced to assistive tech.
- **Failure UX:** This *is* the recovery UX.
- **Failure-system record:** Existing `error:"not-a-recipient"`.
- **Validation:** DOM test asserting the CTA renders for `not-a-recipient` and not for `unavailable`/`invalid`. See TEST-06.
- **Affected code areas:** `ProposalRow.tsx` (`readActionErrorMessage` + new CTA).
- **Status:** pending.

### FR-07 — Decision visibility in the inbox
- **Statement:** Each inbox row must show the recipient's latest decision via the existing decision chip (accepted/declined/revision_requested) and reflect the decision in "Last activity." The chip must be present whenever `proposal.decision` is non-null.
- **Rationale:** PROMPT.md "review decision states." Existing behavior; pin against regression.
- **Source:** repo evidence (`ProposalRow.decisionLabels`, lines 122–127).
- **Priority:** Must.
- **Dependencies:** DATA-03.
- **Acceptance criteria:**
  - AC-FR-07a: A row with `decision:"accepted"` shows a green "Accepted" chip and a "Decision submitted" status.
  - AC-FR-07b: A row with `decision:null` shows no decision chip.
- **Validation:** Existing `recipient-proposals-page.test.tsx` covers accepted state; extend to declined/revision_requested. See TEST-07.
- **Status:** pending.

### FR-08 — Decision visibility on the share page
- **Statement:** The share page must show the recorded decision in the locked badge (existing) with finality copy aligned to OPEN-IA-03 (immutable for V1). The copy-contract test that currently asserts the dialog does NOT warn "final and cannot be changed" must be reconciled: the *dialog* may stay neutral, but the *locked badge* should communicate "Decision recorded" (not "you can change this").
- **Rationale:** PROMPT.md "review decision states"; conflict between immutability and existing copy-contract test.
- **Source:** repo evidence + owner-delegated (OPEN-IA-03).
- **Priority:** Must.
- **Dependencies:** OPEN-IA-03, DATA-03.
- **Acceptance criteria:**
  - AC-FR-08a: The locked badge shows the decision label + "Decision recorded" + (for accepted) "Approved by {signerName} on {date}".
  - AC-FR-08b: The locked badge does not imply the decision can be changed.
  - AC-FR-08c: The confirm dialog copy-contract test is updated to assert the *dialog* is neutral while the *badge* communicates finality.
- **Validation:** Update `share-page-decision-bar-copy-contract.test.tsx` + assert badge copy. See TEST-08.
- **Status:** pending.

### FR-09 — Differentiated expired-link copy
- **Statement:** When a recipient opens an expired publication (via share link or inbox "Review" on an expired row), the terminal page must show expired-specific copy: "This proposal has expired." + "Ask the sender for a fresh link." (not the generic "unavailable").
- **Rationale:** PROMPT.md "expired/revoked/error pages." Currently collapsed into generic.
- **Source:** brief + repo evidence (`not-found.tsx` + `isActivePublication`).
- **Priority:** Must.
- **Dependencies:** OPEN-IA-02, SEC-05.
- **Acceptance criteria:**
  - AC-FR-09a: An expired publication renders expired-specific copy on `/share/[token]/not-found.tsx` (or a differentiated terminal route).
  - AC-FR-09b: The copy includes a recovery action ("Ask the sender for a fresh link").
- **Failure UX:** This *is* the recovery UX.
- **Validation:** DOM/route test asserting expired copy differs from unknown-token copy. See TEST-09.
- **Affected code areas:** `src/app/share/[token]/not-found.tsx`, possibly `page.tsx` to pass a reason to `notFound()` (Next 16 supports `notFound()` with no payload; differentiation may need a query param or a terminal route — see ARCH-04).
- **Status:** pending.

### FR-10 — Differentiated revoked-link copy + share-level error boundary
- **Statement:** (a) A revoked publication renders revoked-specific copy: "This proposal is no longer available." + "Ask the sender for a fresh link." (b) A share-level `error.tsx` is added so a server error in `page.tsx` does not fall through to the global error page.
- **Rationale:** PROMPT.md "expired/revoked/error pages." No share-level error boundary exists today.
- **Source:** brief + repo evidence.
- **Priority:** Must.
- **Dependencies:** OPEN-IA-02, FR-09.
- **Acceptance criteria:**
  - AC-FR-10a: A revoked publication renders revoked-specific copy.
  - AC-FR-10b: `src/app/share/[token]/error.tsx` exists and renders a recovery surface (with a "Try again"/"Ask the sender" CTA).
  - AC-FR-10c: Unknown/invalid tokens continue to render the generic "unavailable" copy (anti-enumeration).
- **Validation:** DOM/route test for revoked copy + error boundary. See TEST-10.
- **Affected code areas:** `src/app/share/[token]/not-found.tsx`, new `src/app/share/[token]/error.tsx`.
- **Status:** pending.

### FR-11 — Decision history (V1: latest-only; V2: full history)
- **Statement:** V1 surfaces only the latest decision (current schema enforces one row). The inbox row's decision chip + the share-page locked badge are the V1 history surface. V2 (out of scope) would allow revision and show a history timeline.
- **Rationale:** PROMPT.md "decision history"; OPEN-IA-03 defers revision.
- **Source:** repo evidence + owner-delegated.
- **Priority:** Should (V1 latest-only is existing behavior; this requirement documents it).
- **Acceptance criteria:**
  - AC-FR-11a: No V1 UI claims to show prior decisions (there can be only one).
  - AC-FR-11b: A code comment/ADR records that V2 revision is deferred.
- **Validation:** Static review. See TEST-11.
- **Status:** pending.

### FR-12 — Decision immutability (V1)
- **Statement:** A recipient may submit exactly one decision per publication. The 409 "Decision already submitted" path reloads and locks to the existing decision (existing behavior). No "change your decision" affordance exists in V1.
- **Rationale:** PROMPT.md "review decision states"; schema constraint.
- **Source:** repo evidence (`idx_shared_link_responses_recipient_publication`).
- **Priority:** Must (pins existing).
- **Acceptance criteria:**
  - AC-FR-12a: A second decision POST returns 409 and the UI locks to the existing decision.
  - AC-FR-12b: No UI affordance offers to change a submitted decision.
- **Validation:** Existing `project-publication-decision.test.tsx` 409 test. See TEST-12.
- **Status:** pending.

### FR-13 — Anonymous/read-only recipient state
- **Statement:** A recipient viewing a share link without a valid P5 session sees the read-only `decision-anonymous-state` with the existing copy. No change required; pin against regression.
- **Source:** repo evidence.
- **Priority:** Must (pin).
- **Acceptance criteria:**
  - AC-FR-13a: `isValid:false` renders the anonymous read-only state with no action buttons.
- **Validation:** Existing `share-page-decision-anonymous.test.tsx`. See TEST-13.
- **Status:** pending.

### FR-14 — Notifications (email-only V1)
- **Statement:** Recipient-facing notification of a new proposal is email-only (existing `sendSharedLinkRecipientInvitationEmail`). In-app notification dispatch (`publication_activity` kind) is a downstream dependency of the client-ready-proposal-workflow Phase 5 / DATA-04 and is out of scope for V1.
- **Source:** repo evidence + owner-delegated (OPEN-IA-04).
- **Priority:** Should (documents the V1 boundary).
- **Acceptance criteria:**
  - AC-FR-14a: No V1 code wires recipient events to the in-app notification bell.
  - AC-FR-14b: The pack records the dependency on the notification dispatch work.
- **Validation:** Static review. See TEST-14.
- **Status:** pending.

## UX — User-experience requirements

### UX-01 — Reconciled inbox IA
- **Statement:** The inbox is the single signed-in home for "proposals sent to me." Navigation, header, and empty/error states all reinforce this framing (decision `:931` — "proposal review portal, not a technical viewer").
- **Source:** repo evidence + decision `:931`.
- **Acceptance:** Header copy + breadcrumb ("Proposals") + empty/error states all use review-portal language. See TEST-01.

### UX-02 — Status chip differentiation
- **Statement:** Row status chips (New / Opened / Decision submitted / Expired / Revoked) must be visually distinct (existing color cascade) and each must have a non-color cue (icon or text label).
- **Acceptance:** DOM assertion of chip text + aria-label per state. See TEST-15.

### UX-03 — Empty state fork
- See FR-04.

### UX-04 — Wrong-account recovery CTA
- See FR-06.

### UX-05 — Decision finality communication
- See FR-08.

### UX-06 — Differentiated terminal copy
- See FR-09, FR-10.

### UX-07 — Loading states
- **Statement:** Inbox uses `ProposalsListSkeleton` (existing). Share page uses its skeleton (existing). No change; pin against regression.
- **Acceptance:** Skeletons render with `role="status" aria-live="polite"`. See TEST-16.

### UX-08 — Mobile/responsive
- **Statement:** Inbox and share recovery surfaces must remain usable on mobile widths. Existing share mobile nav (`#share-summary` etc.) is unaffected.
- **Acceptance:** Static review of Tailwind classes; browser proof only if interaction changes (none in V1). See TEST-17.

### UX-09 — Decision-history affordance (V1: none)
- See FR-11.

## A11Y — Accessibility requirements

### A11Y-01 — Keyboard operability
- **Statement:** Every recovery CTA (wrong-account sign-out, "View all your proposals", terminal-page "ask sender") is keyboard-reachable with visible focus.
- **Acceptance:** DOM keyboard test (Tab/Enter). See TEST-18.

### A11Y-02 — Focus management
- **Statement:** The existing retry-focus behavior (`focusRetryAfterFailureRef`) is preserved. New CTAs do not trap focus.
- **Acceptance:** Existing test extended. See TEST-18.

### A11Y-03 — Screen-reader semantics
- **Statement:** Status chips use `role="status"` or equivalent; terminal pages use heading hierarchy; the locked badge uses `role="status"` (existing).
- **Acceptance:** DOM assertion of roles. See TEST-19.

### A11Y-04 — Non-color cues
- See UX-02.

## ARCH — Architecture requirements

### ARCH-01 — Server/Client boundary preserved
- **Statement:** The inbox client remains the only `"use client"` boundary on the inbox surface. New CTAs are server-action forms or links. No new client state stores.
- **Acceptance:** Static review — no new `"use client"` files. See TEST-20.

### ARCH-02 — Share↔inbox bridge via link, not new state
- **Statement:** The share→inbox bridge is a plain link (`/workshop/proposals`), not a new cookie or store. The inbox→share bridge remains the existing `openRecipientProposalAction` redirect.
- **Acceptance:** Static review. See TEST-20.

### ARCH-03 — No new auth surface
- **Statement:** V1 introduces no new auth path. Listing stays email-keyed; acting stays session-bound (FR-05).
- **Acceptance:** Static review.

### ARCH-04 — Terminal-state differentiation mechanism
- **Statement:** Differentiated expired/revoked copy requires a mechanism to pass the reason to the terminal UI. Options: (a) terminal route segments; (b) `notFound()` + a search-param reason set before the redirect; (c) render inline in `page.tsx` instead of `notFound()`. **Recommendation: (c) render inline terminal states in `page.tsx`** (avoids not-found routing complexity, keeps the reason server-side and non-leaky). See OPEN-IA-02.
- **Acceptance:** Chosen mechanism documented in `06_ARCHITECTURE_AND_TECHNICAL_DESIGN.md`; implemented without token enumeration risk.

## DATA — Data requirements

### DATA-01 — No V1 migration
- **Statement:** No schema change is required for V1. The pack is UI/copy/routing.
- **Acceptance:** `ls migrations/ | tail` unchanged by this pack (modulo sibling packs).

### DATA-02 — Credential-free DTO (preserved)
- **Statement:** The recipient DTO never includes token hashes, encrypted tokens, recipient tokens, or password hashes. Existing assertion preserved.
- **Acceptance:** Existing `recipient-proposals-repository.test.ts` credential-free test stays green.

### DATA-03 — Decision immutability (preserved)
- See FR-12. The partial unique index is load-bearing.

## API — API requirements

### API-01 — No new API route for V1
- **Statement:** V1 adds no new `/api/` route. Recovery CTAs are server-action forms or links. The decision/session/password/activity routes are unchanged.
- **Acceptance:** Static review.

## SEC — Security requirements

### SEC-01 — Token handling unchanged
- **Statement:** Publication/recipient raw tokens remain credentials: URL + `?recipient=` email link only; never logged/rendered/persisted raw. See `08_SECURITY_PRIVACY_THREAT_MODEL.md`.
- **Acceptance:** Static review + existing credential-free test.

### SEC-02 — Recipient matching model (hybrid)
- See FR-05. Listing = email; acting = session.

### SEC-03 — Public-share authority ≠ app authority (preserved)
- **Statement:** A workshop session does not confer recipient authority and vice versa (roles.ts:11–16). V1 does not blur this.
- **Acceptance:** Static review.

### SEC-04 — Wrong-account denial is non-leaky
- **Statement:** The `not-a-recipient` path never discloses the intended recipient email. See FR-06.
- **Acceptance:** DOM test asserting no email leakage.

### SEC-05 — Anti-enumeration on terminal states
- **Statement:** Unknown/invalid tokens render generic copy; only expired/revoked (which the holder already has a token for) render differentiated copy. See FR-09/FR-10.
- **Acceptance:** DOM test asserting unknown-token copy ≠ expired/revoked copy.

### SEC-06 — Owner/internal data isolation
- **Statement:** No owner/internal estimate field appears in any recipient DTO. The snapshot is the whitelisted DTO (decision `:793`).
- **Acceptance:** Existing credential-free test + recommended new DTO-shape assertion.

### SEC-07 — Privacy boundary on notifications
- **Statement:** Email-only V1 notifications do not leak recipient identities to other recipients. Owner digests are owner-scoped.
- **Acceptance:** Static review.

## PERF — Performance requirements

### PERF-01 — Inbox query budget preserved
- **Statement:** The listing query remains a single D1 query, LIMIT 50, indexed by `lower(email)`. No N+1.
- **Acceptance:** Existing query; EXPLAIN deferred to implementation (provider proof). See `09_PERFORMANCE_RELIABILITY_OBSERVABILITY.md`.

### PERF-02 — No new client JS for V1
- **Statement:** V1 CTAs are server-action forms/links; no new client bundle.
- **Acceptance:** Build artifact comparison (bundle size unchanged ± trivial).

## REL — Reliability requirements

### REL-01 — Graceful degradation
- **Statement:** Inbox query failure shows the soft-error banner + Retry (existing). Share-page server error shows the new `error.tsx` (FR-10).
- **Acceptance:** DOM/route tests.

## OPS — Operational requirements

### OPS-01 — No new infra
- **Statement:** V1 uses existing D1/Email/cookie surfaces. No new binding, queue, or DO.
- **Acceptance:** `wrangler.jsonc` unchanged by this pack.

## TEST — Testing requirements

See `12_TEST_AND_VALIDATION_STRATEGY.md` for the full Test Execution Matrix (TEST-01 … TEST-20). Summary: every recovery state (expired, revoked, invalid, wrong-account, no-session, already-decided, empty) has at least one unit/DOM test; receiver E2E is documented as opt-in with skip rationale.

## DOC — Documentation requirements

### DOC-01 — Update current-state.md after implementation
- **Statement:** After implementation, `.ai/10_state/current-state.md` records the recipient IA + recovery states.
- **Acceptance:** Post-implementation.

### DOC-02 — Record OPEN-IA-01..04 in decisions.md
- **Statement:** The four owner decisions are recorded in `decisions.md` once resolved.
- **Acceptance:** Post-resolution.

## Shadow-path matrices

### Inbox listing (`listRecipientProposals`)

| Flow | Happy | Nil/missing email | Empty result | Invalid row | Auth denied | Upstream/D1 error | Concurrency/race | Retry/idempotency | User-visible | Test |
|---|---|---|---|---|---|---|---|---|---|---|
| List | rows returned | `unauthorized` | empty state (FR-04) | `unknown` | `unauthorized` | `unknown` → soft-error banner | N/A (read) | safe to retry | rows / empty / error banner | TEST-01/04/05 |

### Open action (`openRecipientProposalAction`)

| Flow | Happy | Nil id | Invalid id | Not a recipient | Unavailable | RPC error | Concurrency (double-click) | Retry | User-visible | Test |
|---|---|---|---|---|---|---|---|---|---|---|
| Open | redirect + cookies | `invalid` | `invalid` | `not-a-recipient` → CTA (FR-06) | `unavailable` | `unknown` | in-flight guard (TanStack) | safe | redirect / row error + CTA | TEST-03/06 |

### Decision submit (`POST /api/share/[token]/decision`)

| Flow | Happy | Missing fields | Invalid decision | No session | Snapshot stale | Already submitted | Rate limited | Recipient mismatch | Server error | User-visible | Test |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Decide | 201 + lock | 400 | 400 | 401 → "Session expired" | 409 → "updated while deciding" | 409 → reload+lock | 429 | 403 | 500 → generic | lock / error announcement | TEST-08/12 |

### Terminal link states (`/share/[token]`)

| Flow | Valid+published | Expired | Revoked | Unknown token | Wrong password | Password locked | Invalid recipient token | Server error | User-visible | Test |
|---|---|---|---|---|---|---|---|---|---|---|
| Visit | review surface | expired copy (FR-09) | revoked copy (FR-10) | generic unavailable (FR-10c) | form error | lockout copy | amber alert + read-only | error.tsx (FR-10b) | per state | TEST-09/10 |

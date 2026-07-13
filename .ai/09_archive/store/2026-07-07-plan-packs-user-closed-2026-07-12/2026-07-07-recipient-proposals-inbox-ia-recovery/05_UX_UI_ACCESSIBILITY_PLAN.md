# 05 — UX, UI, and Accessibility Plan

## Primary user journeys

### Journey A — Signed-in recipient checks inbox and decides
1. Recipient signs in (Better Auth magic link / Google) → lands in `/workshop`.
2. Clicks "Proposals" (sidebar, ⌘4) → `/workshop/proposals`.
3. Sees the list (or the forked empty state — FR-04).
4. Clicks "Review" on a row → `openRecipientProposalAction` → redirected to `/share/[token]` with session cookies minted (passwordless) or password gate (protected).
5. Decides (Approve / Request changes / Decline) via confirm dialog → locked badge.
6. Returns to inbox (browser back, or the new "View all your proposals" link on the share banner — FR-02) → decision chip reflects the choice after a debounced refresh.

### Journey B — Recipient clicks the email link
1. Recipient receives email → clicks `?recipient=<rawToken>` link.
2. Lands on `/share/[token]`; `page.tsx` redirects to `/api/share/<token>/session?recipient=…` which sets the P5 cookies and redirects back to the clean share URL.
3. Reads the proposal, decides (locked badge), optionally comments.
4. (Optional, new) Clicks "View all your proposals" → `/workshop/proposals` (FR-02). If not signed in, the workshop gate sends them through login → terms → inbox.

### Journey C — Wrong-account recovery
1. Recipient is signed in as `b@x.com`; a proposal was sent to `a@x.com`.
2. Opens the inbox → sees the forked empty state (FR-04) OR sees a row that returns `not-a-recipient` on "Review" (FR-06).
3. Follows the "Sign in with the right account" CTA → sign out → sign in as `a@x.com` → sees the proposal.

### Journey D — Terminal link state
1. Recipient opens an expired/revoked link (from an old email).
2. Sees differentiated copy (FR-09/FR-10) with "Ask the sender for a fresh link."
3. No metadata leak; no enumeration signal.

## Screen and component states

### Inbox (`/workshop/proposals`)

| State | Component | Copy / behavior | Existing/new |
|---|---|---|---|
| Loading | `ProposalsListSkeleton` | 6 skeleton rows, `role="status"` | Existing |
| Populated | `ProposalsList` + `ProposalRow[]` | rows with status + decision chips | Existing (decision-history affordance V1 none) |
| Empty (genuine) | `ProposalsEmptyState` | "No proposals yet" + **new** secondary "Not seeing a proposal? It may have been sent to a different email." + sign-out link | New (FR-04) |
| Empty (wrong-account, inferred) | `ProposalsEmptyState` | Same component; the secondary line + CTA covers both cases without a proactive scan | New (FR-04/FR-06) |
| Soft error (refresh failed) | inline banner in `proposals-page-client.tsx` | `role="status"` warning + inline Retry | Existing |
| Hard error (no data) | `ProposalsErrorState` | "Unable to load proposals" + Retry (focus restored) | Existing |
| Row: not-a-recipient | `ProposalRow` | **new** differentiated CTA: "This proposal was sent to a different email. Sign in with the right account." + sign-out action | New (FR-06) |
| Row: unavailable | `ProposalRow` | "This proposal is no longer available." (existing) | Existing |
| Row: invalid | `ProposalRow` | "This proposal could not be opened." (existing) | Existing |

### Share page (`/share/[token]`)

| State | Component | Copy / behavior | Existing/new |
|---|---|---|---|
| Valid + session | `SharePageDecision` interactive bar | Approve / Request changes / Decline | Existing |
| Valid + anonymous | `decision-anonymous-state` | read-only note | Existing |
| Already decided | `decision-locked-badge` | decision label + "Decision recorded" + (accepted) "Approved by {signer} on {date}" | Existing (finality copy aligned — FR-08) |
| Expired | terminal state in `page.tsx` (recommended ARCH-04c) | **"This proposal has expired."** + "Ask the sender for a fresh link." | New (FR-09) |
| Revoked | terminal state in `page.tsx` | **"This proposal is no longer available."** + "Ask the sender for a fresh link." | New (FR-10a) |
| Unknown token | `not-found.tsx` | generic "This shared proposal is unavailable" (anti-enumeration) | Existing (FR-10c) |
| Invalid recipient token | `SharePageRecipientSessionAlert` | amber banner + read-only | Existing |
| Server error | **new** `error.tsx` | recovery surface + "Ask the sender" CTA | New (FR-10b) |
| Password required | `ProjectPublicationPasswordGate` | form | Existing |
| Password locked | form 429 state | "Too many attempts…" | Existing |
| Session banner (valid) | `SharePageSessionBanner` | "You are reviewing as {email}" + "Not you?" + **new** "View all your proposals" | New link (FR-02) |
| Session banner (anonymous) | `SharePageSessionBanner` | dismissible "Sign in as a recipient…" | Existing |

## Loading, empty, success, error, disabled, offline, degraded, destructive, undo states

- **Loading:** skeletons (both surfaces) — pin against regression (UX-07).
- **Empty:** forked inbox empty state (FR-04); share has no "empty" concept.
- **Success:** decision locked badge (FR-08); inbox decision chip (FR-07).
- **Error:** soft banner + hard error (inbox); new `error.tsx` (share, FR-10b).
- **Disabled:** "Review" button disabled unless `status === "published"` (existing); decision buttons disabled while `isSubmitting` (existing).
- **Offline/degraded:** TanStack Query `retry: false`; manual refresh handles transient failures. No new offline UI for V1.
- **Destructive/undo:** decisions are immutable (no undo); the confirm dialog is the destructive gate. No undo affordance (OPEN-IA-03).

## Keyboard navigation, focus management, screen-reader semantics

- **Keyboard:** all CTAs (Review, Retry, wrong-account sign-out, "View all your proposals", terminal "ask sender") are native buttons/links → Tab/Enter operable (A11Y-01).
- **Focus management:** existing `focusRetryAfterFailureRef` preserved (A11Y-02). New CTAs must not move focus unexpectedly; the wrong-account sign-out follows the existing sign-out focus path.
- **Screen-reader:** status chips need an accessible name (text label suffices); the locked badge uses `role="status"` (existing); terminal pages use an `<h1>` + `<p>` hierarchy; the `SharePageRecipientSessionAlert` uses an appropriate alert/role (verify in implementation).
- **Non-color cues:** status chips carry text labels (New/Opened/Decision submitted/Expired/Revoked) in addition to color (UX-02, A11Y-04).

## Responsive behavior

- Inbox: existing responsive list (no change). New empty-state secondary line must wrap on narrow widths.
- Share terminal states: single-column, centered, mobile-safe (mirror existing `not-found.tsx` layout).
- No new breakpoints; reuse Tailwind tokens. Browser proof only if interaction changes (none in V1 — UX-08).

## Reduced motion, color contrast

- No new animations in V1. Reduced-motion respected by default (no motion added).
- New copy/chips reuse existing color tokens (no new contrast risk). The decision-chip green and the terminal-state neutral must meet WCAG AA against the surface — verify during implementation with the existing design-lint if run.

## Design-system reuse

- Reuse existing `Button`, `Card`/dashed-border card pattern (empty state), chips/badges, `<dialog>` (confirm). **No new primitives** for V1.
- `DESIGN.md` is alpha-stage guidance — defer to Philip on any design-system question; do not block on it.

## UX regressions to avoid

- Do not remove the existing retry-focus behavior.
- Do not change the decision confirm-dialog copy to claim finality (the dialog stays neutral; the *badge* communicates finality — FR-08c).
- Do not collapse the differentiated terminal states back into generic copy.
- Do not introduce a proactive wrong-account scan that leaks recipient data.

## User-facing documentation implications

- No new user-facing docs surface required for V1 (the recovery copy is in-app).
- After implementation, `current-state.md` records the recipient IA (DOC-01).

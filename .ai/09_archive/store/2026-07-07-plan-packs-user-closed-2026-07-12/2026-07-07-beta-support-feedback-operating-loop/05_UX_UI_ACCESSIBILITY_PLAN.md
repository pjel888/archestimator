# 05 — UX, UI, and Accessibility Plan

`DESIGN.md` is alpha-stage guidance (per `AGENTS.md`); defer to Philip on design decisions. Existing UI primitives in `src/components/ui/` are reused. No new design-system primitives are planned unless an existing one is missing.

## Primary user journeys

### Journey 1 — Reporter submits feedback (authenticated, in-app)
1. Reporter clicks the always-on `WorkshopFeedbackModal` Lifebuoy button (any workshop page) OR navigates to `/workshop/feedback`.
2. Modal/page renders `BetaFeedbackForm` (inline or redirect mode).
3. Reporter selects Type + Severity, optionally enters Project UUID, types message (10–4000).
4. On submit → Server Action → D1 save → operator notified (blocker/high) → acknowledgement shown.
5. On D1 failure → mailto fallback carrying payload (FR-ACK-02).

### Journey 2 — Operator triages the queue
1. Operator (platform admin) opens `/workshop/settings/feedback`.
2. Sees paginated table with SLA badge per row, status filter, breach filter.
3. Selects a row's status → `updateBetaFeedbackReviewStatus` → timestamps set → follow-up email on resolve.
4. On breach → row flagged + alert already fired by the daily sweep.

### Journey 3 — Reporter receives follow-up
1. Status → `resolved` → reporter email sent.
2. Graceful if email unconfigured/invalid.

## Screen / component states (full 11-state matrix)

Mandated coverage: loading, empty, success, partial-success, error, conflict, permission-denied, offline, retry, timeout, cancellation.

| Surface | Loading | Empty | Success | Partial-success | Error | Conflict | Permission-denied | Offline | Retry | Timeout | Cancellation |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `BetaFeedbackForm` (inline) | button "Sending" + disabled | initial `idle` (no output box) | `<output>` accent + ack copy (FR-ACK-01) | **notify email fails but D1 save succeeds → still "saved" ack; notify failure logged silently** | `<output>` danger + code message (`message_too_short` etc.) | n/a (no optimistic UI) | n/a (gate is on action; form always renders for authed users) | D1 fail → `<output>` warning + mailto fallback (FR-ACK-02) | browser refresh/back re-submit → duplicate row; client button-disable mitigates | **notify `Promise.race` 2s timeout → ack still "saved"; notify logged `code:TIMEOUT`** | user closes modal mid-submit → request completes server-side (no abort hook); row may still be created — document, accept at beta |
| `BetaFeedbackForm` (redirect) | none (full post → redirect) | n/a | page `?saved=1` box + ack copy | same as inline partial-success (notify fail invisible to user) | `?error=<code>` box (`invalid_type`/`message_too_long` etc.) | n/a | n/a | `?fallback=1` box + payload mailto | PRG prevents back-button re-POST; `Cache-Control: no-store` added (20) | notify 2s cap → `?saved=1` (user unaffected) | browser stops the POST → no row (request aborted) |
| Review queue (SSR) | none (server-rendered, no skeleton) | "No feedback matches this view." | notice on `?saved=1` | n/a (single status update) | "Beta feedback could not be loaded." / `?error=forbidden\|invalid\|save` | last-write-wins on `status` (two admins) — no UI conflict shown; timestamps `IS NULL`-guarded | **`?error=forbidden`** → "Only platform admins can review feedback." | server error → danger box | refresh re-fetches (no client state) | n/a (SSR) | n/a |
| SLA badge | computed from timestamps at render | "—" when `created_at` null | on-track (green) / due-soon (amber) / breached (red) + icon+text | n/a | n/a (derived) | n/a | n/a | n/a | n/a | n/a |
| Toast (`src/components/ui/toast.tsx`) | available, **intentionally unused** for reporter ack (auto-dismiss loses it); reserved for possible future operator "new feedback" toast | — | success tone | — | error tone | — | — | — | — | — | — |

**State-matrix notes:** "partial-success" is a genuine state here (notify email fails → save succeeds); it is rendered as plain success to the user (the notify failure is operator-visible only via logs + queue). "Cancellation" for the modal is accepted as "row may still be created" at beta (no abort signal wired; documenting, not fixing). These are the load-bearing answers; the rest are n/a-with-reason.

## Acknowledgement UX design (FR-ACK-01)

**Decision**: keep the existing `<output>` pattern (native semantics) but (a) add explicit `role="status"`/`aria-live="polite"` to the success region and `role="alert"` to the error region, (b) move focus to the output on inline state change (UX-A11Y-02), (c) update copy to include the status-expectation promise.

**Copy (recommended, owner can override):**
- Blocker/High: "Thanks — we've logged this. A platform admin reviews blocker and high-severity reports within one business day. We'll email you when it's resolved."
- Medium/Low: "Thanks — we've logged this. We review medium and low-severity feedback regularly and email you when it's resolved."
- Fallback: "We couldn't save this in the app. An email draft with your message is ready — please send it so we don't lose your input."

**Reuse vs toast**: the inline `<output>` is correct for the modal (no layout shift, native semantics). Do **not** force the toast here — toasts auto-dismiss and would lose the acknowledgement. Toast may be used later for operator-side "new feedback" notifications, but that is out of scope (operator gets email + queue badge).

## Accessibility

- **Label association** (UX-A11Y-01): give Type/Severity a real `<label htmlFor>` or `aria-labelledby`. If `DropdownSelect` lacks a `label`/`id` passthrough, add the minimal prop rather than re-implementing.
- **Live region + focus** (UX-A11Y-02): `aria-live` + programmatic focus on the inline output after state change.
- **Keyboard**: form remains keyboard-operable (native controls); modal focus trap is owned by `Modal` primitive (already correct). Verify focus returns to the trigger on modal close.
- **Screen-reader semantics**: acknowledgement uses `role="status"`; errors use `role="alert"`.
- **Non-color cues**: SLA badge uses icon + text (not color alone) — e.g. "● On track" / "⚠ Due soon" / "✕ Breached".
- **Contrast**: reuse existing tone classes (accent/warning/danger) already audited elsewhere.
- **Reduced motion**: no new animations planned; existing primitives respect `prefers-reduced-motion`.

## Action-level accessibility proof matrix

Mandated (Improve-Plan-Prompt §3 UX). Each interactive action gets: keyboard path, focus target/restoration, accessible name/live-region behavior, proof type.

| Action | Keyboard path | Focus target / restoration | Accessible name / live-region | Proof type |
|---|---|---|---|---|
| Submit feedback (inline mode) | Tab to fields → Tab to submit → Enter | on state change → focus moves to the `<output>` ack region (UX-A11Y-02); on modal close → focus returns to the Lifebuoy trigger (`Modal` primitive owns this) | submit button: existing `aria-label`/text; ack output: `role="status"` + `aria-live="polite"` (success) / `role="alert"` (error) | **RTL DOM test**: assert `document.activeElement === outputRef` after submit; assert `role` + `aria-live` attributes. (Browser proof intentionally skipped — RTL captures focus.) |
| Submit feedback (redirect mode) | native form submit (Enter on textarea triggers submit) | n/a (full page redirect) | ack box: `role="status"`/`aria-live="polite"` on `?saved=1`; `role="alert"` on `?error=` | RTL/SSR test: render page with `?saved=1`/`?error=` searchParams → assert `role` + text |
| Select Type / Severity | Tab to `DropdownSelect` → Enter/Space to open → arrow keys → Enter | focus stays on the dropdown trigger | **real `<label htmlFor>` (new, UX-A11Y-01)** associated to the control id (not a bare `aria-label`) | DOM test asserting `label` ↔ `control id` association (`htmlFor`/`aria-labelledby`); axe-oriented assertion |
| Status `<select>` change (operator) | Tab to row's `<select>` → arrow keys → Tab to Save → Enter | focus stays on the select/Save button | `aria-label="Review status for feedback from ${user_email}"` (existing) | DOM test on `settings/feedback/page.tsx` render |
| Pagination "Next page" | Tab to the control → Enter | focus moves to the top of the new page's table (or the control retains focus — pick one; recommend top-of-table for screen readers) | `aria-label="Next page"` + current page announced via `aria-live` on a page counter | DOM test asserting the control + label; focus-target decision documented |
| Breach filter | Tab to filter `<select>` → select → Enter (form GET) | n/a (full page GET) | `aria-label="Filter by SLA status"` | DOM test |

**WCAG 2.2 AA alignment**: the matrix above covers the relevant 2.2 AA criteria for this surface — keyboard operability (2.1.1), focus visible (2.4.7), name-role-value (4.1.2), status messages (4.1.3), on-focus/no-context-change (3.2.1), labels (2.4.6/3.3.2), contrast (1.4.3 — reuse audited tone classes), target size (2.5.8 — existing button sizing). Reduced motion (2.3.3) respected by existing primitives.

## Responsive behavior

- `BetaFeedbackForm` already responsive (textarea, dropdowns). No new layout.
- Review queue table: on narrow screens, the table scrolls horizontally (existing behavior). SLA badge is a compact chip. Pagination control wraps.

## UX regressions to avoid

- Do not change the existing form field set or validation limits (would break tests + muscle memory).
- Do not remove the `WorkshopFeedbackModal` floating button (primary entry point).
- Do not auto-dismiss the acknowledgement (toasts would be wrong here).

## Browser-proof decisions

- Acknowledgement + form interaction = browser-only claim? **No** — these are provable by DOM tests (`role`, `aria-live`, text presence). Browser proof intentionally skipped under the repo's proportional verification policy. Focus management after inline submit *is* an interaction claim → cover with a React Testing Library test that asserts `document.activeElement` moves to the output; escalate to Playwright only if the RTL test cannot capture the focus move (it can).

## Copy/localization

- English-only for beta. Copy lives in a single constants module (extend `beta-feedback.ts` or a new `beta-feedback-copy.ts`) to avoid drift between the two modes.

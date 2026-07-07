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

## Screen / component states

| Surface | Loading | Empty | Success | Error | Disabled | Offline/degraded |
|---|---|---|---|---|---|---|
| `BetaFeedbackForm` (inline) | button "Sending" + disabled | initial `idle` (no output) | `<output>` accent + acknowledgement copy | `<output>` danger + code message | submit disabled while `inlinePending` | D1 fail → `<output>` warning + mailto fallback |
| `BetaFeedbackForm` (redirect) | none (full post) | n/a | page `?saved=1` box | `?error=<code>` box | n/a | `?fallback=1` box + mailto |
| Review queue (SSR) | none (server-rendered) | "No feedback matches this view." | notice on `?saved=1` | "Beta feedback could not be loaded." / `?error=forbidden|invalid|save` | status `<select>` always enabled | server error → danger box |
| SLA badge | computed from timestamps | "—" when `created_at` null | on-track / due-soon / breached tones | n/a | n/a | n/a |
| Toast (`src/components/ui/toast.tsx`) | available but currently unused by feedback | — | success tone possible | error tone possible | — | — |

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

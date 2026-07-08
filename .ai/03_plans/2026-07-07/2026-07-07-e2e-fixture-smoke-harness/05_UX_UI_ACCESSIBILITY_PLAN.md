# 05 — UX, UI, and Accessibility Plan

This pack plans a **test harness**, not user-facing UI. UX/UI/a11y requirements here are scoped to: (a) what the smoke specs must **assert** about the app's UX/a11y on the covered flows, and (b) the harness's own developer-facing ergonomics. No application UI is designed or changed by this plan.

## A11y smoke assertions (per flow)

The smoke suite is **not** a full a11y audit. Per the repo's proportional verification policy, smoke a11y = keyboard reach + visible focus + semantic landmark presence on the covered flows only. Deep a11y auditing stays with vitest DOM assertions + dedicated a11y tooling.

| Flow | A11y smoke assertion |
|---|---|
| FR-S1 login page | Focus moves to email field on load or is reachable via Tab; Google + email controls have visible focus rings; page has `<main>`/landmark + `<h1>`. |
| FR-S3 terms gate | Terms prompt is keyboard-reachable; accept button focusable; accepting via keyboard works. |
| FR-S10 share review | Estimate tabs are keyboard-navigable (Tab into list, ArrowRight moves between tabs, `aria-selected` reflects active). (Mirrors existing `shared-link-receiver.spec.ts` §4.5 intent.) |
| FR-S11 password gate | Password input focusable; unlock via Enter/Space; lockout message is announced (role/visible text). |
| FR-S13 upload (if UI-driven) | Upload trigger keyboard-reachable; if API-only smoke, no a11y assertion. |

These are encoded as `@smoke-a11y`-tagged assertions within the relevant flow specs (not separate specs) to keep the suite lean. Full keyboard/focus matrices for complex routes remain a future a11y-work item, documented in `15_*` DEFER-2.

## UX states the smoke suite must witness (proves the app, not the harness)

Each covered flow must assert at least: **ready/loaded** state (no skeleton stuck), and for mutation flows, the **success** state. Error/empty/offline states are covered by the **shadow-path matrices** in `12_*` (happy + auth-denied + one error cell minimum per runtime flow). This deliberately does not duplicate the existing `workshop-route-error-boundaries.spec.ts` (sanitized error UI) — that spec is untouched.

## State matrix (Improve-Plan-Prompt §3 — mandatory UX artifact)

For each covered flow, the smoke must witness the **ready** state at minimum, plus the states marked ●. States marked ○ are deferred to vitest/existing specs. ✗ = not applicable to that flow.

| Flow | loading | empty | ready | success | partial-success | error | conflict | permission-denied | offline | retry/timeout | cancellation |
|---|---|---|---|---|---|---|---|---|---|---|---|
| FR-S1 login | ○ | ✗ | ● | ○ | ✗ | ○ | ✗ | ✗ | ✗ | ✗ | ✗ |
| FR-S2 dev-auth | ● | ✗ | ● | ● | ✗ | ○ | ✗ | ● (302 w/o cookie) | ✗ | ✗ | ✗ |
| FR-S3 terms | ● | ✗ | ● | ● | ✗ | ○ | ✗ | ✗ | ✗ | ✗ | ✗ |
| FR-S4 dashboard | ● (shell) | ● (no projects) | ● | ✗ | ✗ | ○ | ✗ | ● | ✗ | ✗ | ✗ |
| FR-S5 project create | ● | ✗ | ● | ● | ✗ | ● (validation) | ✗ | ● | ✗ | ✗ | ✗ |
| FR-S6 estimate edit | ● | ● (empty sheet) | ● | ● | ✗ | ● | ○ | ● | ✗ | ✗ | ✗ |
| FR-S7 library | ● | ● (empty) | ● | ● | ✗ | ○ | ✗ | ● | ✗ | ✗ | ✗ |
| FR-S8 export | ● | ○ | ● | ● (download) | ✗ | ● (rate-limit/401) | ✗ | ● (401) | ✗ | ○ | ✗ |
| FR-S9 publish | ● | ● (no estimates) | ● | ● (roster+token) | ✗ | ● | ○ | ● (non-manager) | ✗ | ✗ | ✗ |
| FR-S10 share open | ● | ● (empty estimate) | ● | ● (comment/accept) | ○ | ○ | ● (replay decision) | ● (no session) | ✗ | ✗ | ✗ |
| FR-S11 share pw | ● | ✗ | ● | ● (unlock) | ✗ | ● (lockout) | ✗ | ✗ | ✗ | ✗ | ✗ |
| FR-S12 inbox | ● | ● (none shared) | ● | ● (open) | ✗ | ○ | ✗ | ● | ✗ | ✗ | ✗ |
| FR-S13 upload | ● | ✗ | ● | ● (object) | ○ | ● (invalid/oversized/401) | ○ | ● (401) | ○ | ○ | ○ |
| FR-S14 feedback | ● | ✗ | ● | ● (saved banner) | ✗ | ○ | ✗ | ● | ✗ | ✗ | ✗ |
| FR-S15 sign-out | ● | ✗ | ● | ● (/login) | ✗ | ○ | ✗ | ● (302 after) | ✗ | ✗ | ✗ |

(● = smoke asserts; ○ = covered by vitest/existing spec; ✗ = n/a.) **Cap rule:** a user-facing plan lacking the state matrix caps UX/a11y readiness at 84 — this matrix satisfies it.

## Action-level accessibility proof matrix (Improve-Plan-Prompt §3 — mandatory UX artifact)

For the interactive actions the smoke drives, the proof type and a11y expectation:

| Action | Keyboard path | Focus target / restoration | Accessible name / live-region | Proof type |
|---|---|---|---|---|
| Login email submit (FR-S1) | Tab → email field → Enter | focus moves to email field on load or first Tab; no trap | field has `<label>` / `aria-label`; errors announced | DOM assertion (role=label) |
| Terms accept (FR-S3) | Tab to accept button → Enter/Space | focus moves to accept button; after accept → main content | accept button has accessible name; transition announced | DOM assertion + keyboard |
| Create project submit (FR-S5) | fill name → Tab → Enter on submit | focus → submit; after redirect → page main | validation errors announced (live region) | DOM assertion |
| Estimate add row (FR-S6) | keyboard activate "add row" | focus → new row input | row role/label | DOM assertion |
| Estimate tab switch (FR-S10) | Tab into tablist → ArrowRight/Left | active tab `aria-selected=true` | tab has accessible name | keyboard assertion (mirrors `shared-link-receiver.spec.ts` §4.5) |
| Password unlock (FR-S11) | password field → Enter | focus → password field; lockout → message announced | lockout message in live region; input disabled | DOM + keyboard |
| Decision accept (FR-S10) | Tab to accept → Enter; confirm | focus → confirm; after → result | accept/confirm accessible names | DOM assertion |
| Sign-out (FR-S15) | Tab to sign-out → Enter | redirect to `/login`; focus → login main | n/a | DOM assertion |

**Reduced motion / contrast:** not asserted in smoke (visual regression explicitly out of scope, D-3; owned by `frontdoor-landing-visual`/`landing-audit`). **Copy/content:** stable-label selectors avoid fragile copy (selector policy in `12_*`).

## Harness developer ergonomics (UX of the harness itself)

- **One command to run smoke:** `bun run test:e2e:smoke` (chromium, `@smoke`). No flag salad required for the default local run.
- **One command to reset+seed:** `bun run e2e:reset && bun run e2e:seed`.
- **Clear skip reasons:** every skip prints the missing flag/env and a one-line fix.
- **Readable failure:** traces on first retry; HTML report; manifest JSON maps flow→result.
- **Deterministic data:** sentinel UUIDs; idempotent seed; no "works on my machine" profile backfill.

## Responsive / cross-browser

- Core smoke = chromium desktop viewport (matches `devices["Desktop Chrome"]`).
- Responsive-specific assertions are **out of smoke scope** (owned by `frontdoor-landing-visual.spec.ts` + `landing-audit.spec.ts`, untouched).
- Mobile/firefox/webkit = opt-in extended matrix (OPS-CI2), non-blocking.

## Localization

- Smoke runs in the default locale (en). i18n is out of scope for closed beta (no i18n surface confirmed in scope).

## Reduced motion / color

- Not asserted in smoke (visual regression is explicitly out of scope, D-3). Existing visual specs cover landing.

## Design-system reuse

- The harness writes **no UI**. It only selects existing app elements via stable testids/roles. Where the app lacks a stable testid the smoke needs, the executor adds a minimal `data-*` attribute to the app component (scoped, documented in `11_*`) — this is the only app-surface touch the plan permits, and it is gated as a named, reversible task per flow, not a blanket change.

## UX regressions to watch (risk, not assertion)

- Smoke must not assert on fragile selectors (CSS classes, auto-generated text) that would make the suite flaky or block legitimate UI iteration. Prefer: `getByRole`, `getByLabel`, stable `data-*` testids. This is encoded in `12_*` selector policy.

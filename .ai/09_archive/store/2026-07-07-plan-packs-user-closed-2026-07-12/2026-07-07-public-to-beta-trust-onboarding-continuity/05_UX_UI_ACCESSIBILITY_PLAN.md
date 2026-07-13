# 05 — UX, UI, and Accessibility Plan

Scope: the user-visible continuity path only. Per the `PROMPT.md` constraint, this is **not** a visual redesign — UI changes are the minimum to close a continuity gap.

## 1. Primary user journeys

### Journey P1 — Public visitor → beta request (logged-out, no invite)
1. Land on `/` (v3). Hero + "Book a walkthrough" primary CTA, "Sign in" secondary.
2. Browse Workflow/Specialties/FAQ/Proof sections.
3. Click "Sign in" → `/login?next=/workshop/projects`. See Google + magic-link, legal row.
4. From `/login`, cross-link "Start free →" → `/signup` → `ClosedBetaGate`.
5. Submit "Request access" → (NEW) receipt "Thanks — we'll reach out" (FR-CONT-08).
6. Later: owner grants allowlist → user returns, logs in → `/workshop` → terms gate → dashboard.

**Continuity touchpoints:** CTA labels, `/login`↔`/signup` cross-links, ClosedBetaGate legal line + receipt, post-auth landing.

### Journey P2 — Invited collaborator (logged-out, has invite link)
1. Click invite URL → `/invite/[token]` → preview ("You're invited to X").
2. "Continue to Archestimator" → `/invite/[token]/continue` → bridge cookie → `/login?next=/workshop/pending-invite`.
3. Auth → `/workshop/pending-invite` interstitial → auto-accept → `/workshop?invite=accepted`.
4. Terms gate → dashboard (workspace = inviter's, no auto-create).

**Continuity touchpoints:** invite preview copy, the `next=/workshop/pending-invite` preservation, invite banner states.

### Journey P3 — Returning enabled user
1. `/` → "Sign in" → `/login` → magic-link/Google → `/workshop`.
2. Terms already accepted → dashboard → continue working.
3. Or visits `/workshop/projects` directly (deep link) — proxy allows if session+terms.

### Journey P4 — Signed-in-but-denied (closed-beta revoked)
1. Auth succeeds → `getBetterAuthCurrentUserContext` → allowlist `revoked` → redirect `/access-required?status=revoked`.
2. `/access-required` → "Use another account" (`/login`) or "Request access" (`mailto:support`).

## 2. State matrix (11-state, per Improve-Plan-Prompt §3)

Mandatory UX states for each user-facing surface: loading, empty, success, partial-success, error, conflict, permission-denied, offline, retry, timeout, cancellation. `—` = not applicable for a static/derived surface (reason given).

| Surface | loading | empty | success | partial-success | error | conflict | permission-denied | offline | retry | timeout | cancellation |
|---|---|---|---|---|---|---|---|---|---|---|---|
| ClosedBetaGate form (`/signup`) | submitting: button disabled + "Sending…" + `aria-busy` (no skeleton — tiny form) | — (form is the empty state) | receipt replaces form ("Thanks — we'll reach out") + focus→receipt heading | — (intake is atomic: stored or not) | inline validation error (`reason:'invalid'`); server-error friendly message | — (no optimistic write to reconcile) | — (public; no authz gate here) | submit disabled if `navigator.onLine=false`; restore on reconnect | uniform receipt on duplicate/resubmit (SEC-CONT-03) | n/a (action is fast; if slow, button stays "Sending…" — no explicit timeout UI needed at closed-beta scale) | n/a (no long async to cancel) |
| CookieConsentBanner | — (static on load) | — | choice applied, banner hides | — | — | — | — | banner still works (essential only, no network) | — | — | — |
| Dashboard first-project CTA (`/workshop`) | skeleton via existing homebase loader | **0 projects → CTA shown** (this IS the empty state) | n/a (navigates to `/workshop/projects`) | — | if projectCount fetch fails → existing dashboard error boundary; CTA just doesn't render | — | if closed-beta revoked → redirect to `/access-required` (existing) | existing offline workshop behavior | — | — | — |
| Footer links (all public) | — | — | navigation | — | broken link → 404 page (ADV-16 guards) | — | — | links work offline only if cached | — | — | — |
| `/cookies`, `/terms`, `/privacy` (static) | RSC static (no load state) | — | render | — | — | — | — | cached static works offline | — | — | — |

**Notes on partial-success / offline / timeout / cancellation:** these states matter most for the one mutation (`requestBetaAccess`). Partial-success is impossible (the audit insert either succeeds or throws — no half-state); offline is handled by disabling submit + restoring on reconnect (progressive-enhancement `<form action>` will simply fail to reach the server and the browser shows its native error, which the Client wrapper can override with a friendlier message); timeout/cancellation are not material at closed-beta scale (no long-running async). Recorded honestly rather than invented.

## 2a. Screen and component states (detail)

### ClosedBetaGate (`src/components/auth/ClosedBetaGate.tsx`)
- **Default:** H1 "Start free", copy, email form, honeypot, "Request access" button, "Already invited? Sign in →" link. **(NEW) legal line + links.**
- **Submitting:** button disabled, "Sending…", `aria-busy="true"` on the form.
- **Success (receipt):** replace form with "Thanks — we'll reach out at the email you provided." + "Back to home" link; focus → receipt heading; `aria-live="polite"` announces. (NEW, DEC-CONT-08 transport)
- **Validation error:** inline error for invalid/empty email (`reason:'invalid'`); `aria-invalid` on the field; `aria-live="assertive"`.
- **Rate-limited / duplicate / already-on-allowlist:** uniform receipt (SEC-CONT-03) — client cannot distinguish.
- **Honeypot trip:** fail closed silently (appear to succeed, do not store).

### CookieConsentBanner (`src/components/landing/CookieConsentBanner.tsx`)
- **Default:** banner with "Essential only" + "Accept analytics". **(NEW) "Cookie policy" link → `/cookies`.**
- **After choice:** hidden; reopen affordance if applicable.

### Dashboard empty-state (NEW, FR-CONT-10)
- **0 projects:** explicit "Create your first project" CTA card (primary action) + short orienting copy.
- **≥1 project:** CTA absent; normal dashboard.

### Footer (NEW unified, FR-CONT-03)
- All public footers: Privacy, Terms, Trust, Security, Contact links. Consistent order + accessible names.

## 3. Action-level accessibility proof matrix (per Improve-Plan-Prompt §3)

Per action: keyboard path, focus target/restoration, accessible name + live-region behavior, and proof type binding to a concrete test in `12`.

| Action | Keyboard path | Focus target / restoration | Accessible name / live-region | Proof type (test in `12`) |
|---|---|---|---|---|
| Submit `ClosedBetaGate` form | Tab to email field → Tab to "Request access" → Enter submits | on success: focus moves to the receipt `<h2>` (ref + `useEffect`); on error: focus stays on field, `aria-invalid` set | button `aria-label="Request access"`; receipt announced via `aria-live="polite"` region; errors via `aria-live="assertive"` | RTL keyboard test: render, type, Enter, assert receipt heading focused + live-region text |
| Choose cookie consent | Tab to "Essential only"/"Accept analytics" → Enter/Space | focus remains on the activated button; banner hides | buttons labeled; region `aria-label="Cookie consent"` | RTL keyboard test (existing `landing-consent.test.tsx` extended) |
| Click footer trust link | Tab through link group in source order → Enter navigates | visible focus ring on each `<a>` | each `<a>` has discernible text (Privacy/Terms/...) | RTL: assert each link focusable + accessible name (A11Y-CONT-01) |
| Click dashboard first-project CTA | Tab to CTA → Enter | visible focus; navigates to `/workshop/projects` | `aria-label="Create your first project"` | RTL: assert focusable + named; click → href (FR-CONT-10) |
| Navigate legal pages | standard Tab | — | single `<h1>` per page, `<main>` landmark | structural RTL/axe (A11Y-CONT-03) |

**Focus restoration guarantee:** ClosedBetaGate success moves focus to the receipt region (not left on the removed submit button) — this is the one non-trivial focus-management requirement and is bound to a concrete RTL assertion above. Cookie banner keeps focus on the chosen button (no restoration needed).

## 4. Responsive behavior
- Footer link group: wraps gracefully on mobile (375px) — flex-wrap, no horizontal overflow (existing `landing-audit.spec.ts` already asserts no mobile overflow; new footer must preserve it).
- ClosedBetaGate card: existing auth layout responsive; new legal line wraps.
- Dashboard CTA: stacks in the bento grid on narrow viewports.

## 5. Copy and content hierarchy
- **Truthfulness first:** all new copy cross-checked against the claims ledger (`03` §4). No "trusted by", no metrics unless sourced, no softened security posture.
- **Beta-stage expectation setting:** ClosedBetaGate copy already says "closed beta"; receipt reinforces "we'll reach out" (not "you're in").
- **Plain-language legal line:** "By requesting access you agree to our [Terms] and [Privacy Policy]." — non-blocking, links open in same tab (keeps back-button working).

## 6. UX regressions to guard
- Do **not** break the single-`<h1>` rule (enforced by `landing-audit.spec.ts`).
- Do **not** introduce horizontal overflow on mobile (enforced).
- Do **not** change the v3 hero copy/CTA typography contract (enforced by `landing-amigo-redesign.test.tsx`).
- Do **not** soften the `/trust` "no SOC2/GDPR/HIPAA/DPA" line (enforced by `trust-page-overclaims.test.ts`).
- Do **not** introduce testimonials/logos on the homepage (enforced by `landing-company-proof.test.ts`).

## 7. Design-system reuse
- Footer links: plain `<a>` (or existing link primitive in `src/components/ui/` if one fits — check during implementation; do not invent a new component).
- ClosedBetaGate legal line: reuse the existing legal-row pattern from `LoginForm.tsx:108` (consistency).
- Dashboard CTA: reuse existing button/card primitive; do not create a new "EmptyStateCTA" component if `src/components/ui/` has a card/button that fits.
- `DESIGN.md` is alpha-stage; defer to existing patterns and Philip on design decisions. No design-system gate blocks these minimal changes.

## 8. Browser/visual proof policy (proportional)
Per the repo's proportional verification policy:
- Footer link presence, ClosedBetaGate receipt, legal-line, dashboard CTA presence/absence, `/cookies` render, metadata exports → **RTL/structural tests suffice** (no browser proof needed).
- Keyboard/focus on the ClosedBetaGate receipt transition and cookie banner → RTL keyboard test; browser proof only if a complex focus/route transition is found during implementation.
- No visual-redesign claim is being made, so Storybook/visual QA is intentionally skipped (state this in `19`).

## 9. Localization implications
- Copy is English-only (current posture). New strings stay in-component (no i18n framework exists). No localization blocker for closed beta.

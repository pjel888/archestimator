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

## 2. Screen and component states

### ClosedBetaGate (`src/components/auth/ClosedBetaGate.tsx`)
- **Default:** H1 "Start free", copy, email form, honeypot, "Request access" button, "Already invited? Sign in →" link. **(NEW) legal line + links.**
- **Submitting:** button disabled, "Sending...".
- **Success (receipt):** replace form with "Thanks — we'll reach out at the email you provided." + "Back to home" link. (NEW)
- **Validation error:** inline error for invalid/empty email.
- **Rate-limited:** "You've already requested access recently. We'll be in touch." (uniform, non-enumerable). (NEW)
- **Honeypot trip:** fail closed silently (appear to succeed, do not store). (NEW)

### CookieConsentBanner (`src/components/landing/CookieConsentBanner.tsx`)
- **Default:** banner with "Essential only" + "Accept analytics". **(NEW) "Cookie policy" link → `/cookies`.**
- **After choice:** hidden; reopen affordance if applicable.

### Dashboard empty-state (NEW, FR-CONT-10)
- **0 projects:** explicit "Create your first project" CTA card (primary action) + short orienting copy.
- **≥1 project:** CTA absent; normal dashboard.

### Footer (NEW unified, FR-CONT-03)
- All public footers: Privacy, Terms, Trust, Security, Contact links. Consistent order + accessible names.

## 3. Accessibility behavior

| Element | Keyboard | Focus | Screen reader | Contrast | Reduced motion |
|---|---|---|---|---|---|
| Footer links | `<a>`, Tab order | visible focus ring | discernible accessible name (Privacy/Terms/...) | AA | n/a |
| ClosedBetaGate form | Tab through fields→button; Enter submits | visible focus; focus stays in card on success (receipt replaces form, focus moved to receipt heading) | fields labeled (`htmlFor`), button named, live-region for receipt/error | AA | n/a |
| Cookie banner | Tab to buttons; Enter/Space activates | visible focus; focus trap optional but Esc dismisses to "Essential only" | `role="dialog"` or `region`, labeled | AA | n/a |
| Dashboard empty CTA | Tab to CTA; Enter activates | visible focus | named "Create your first project" | AA | entrance transition respects `prefers-reduced-motion` |
| Legal pages (`/cookies` etc.) | standard | — | single `<h1>`, heading order, `<main>` landmark | AA | n/a |

**Focus restoration:** ClosedBetaGate success moves focus to the receipt region (not left on the removed button). Cookie banner return focus to trigger on dismiss.

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

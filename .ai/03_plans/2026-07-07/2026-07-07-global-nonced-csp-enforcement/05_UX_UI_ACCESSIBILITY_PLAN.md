# 05 — UX, UI, and Accessibility Plan

CSP enforcement is a **response-header** change. It has **no direct UI surface**: no
new components, no layout changes, no copy, no design tokens. The user-visible surface
is purely the *absence* of breakage — pages must continue to render and behave exactly
as before. This document is therefore scoped to (a) the user-perceived failure modes
CSP can introduce and (b) the accessibility guarantees that must survive enforcement.

## 5.1 Primary user journeys that CSP touches (only via breakage risk)

| Journey | Route(s) | What CSP could break | Required outcome |
|---|---|---|---|
| Anonymous visitor reads marketing site | `/`, `/about`, `/features`, `/pricing`, `/contact`, `/trust`, `/privacy`, `/terms`, `/security`, `/new` | GA4/Clarity/Cloudflare Insights scripts blocked → analytics silent (no visible breakage, but analytics loss) | Page renders identically; analytics load under consent gate |
| Visitor signs in (email/OAuth) | `/login`, `/signup`, `/auth/callback` | `AuthStateMismatchRecoveryScript` blocked → OAuth state-mismatch recovery loop not intercepted | Sign-in completes; recovery script runs |
| Invitee accepts invite | `/invite/:token` | Inline redirect script blocked → blank page | Invite-accept flow completes |
| Recipient views shared proposal | `/share/:token` | Inline scripts blocked → blank page; `no-store` ensures fresh nonce | Proposal renders, tabs/comments/decisions work, password/session flows work |
| Estimator uses workshop | `/workshop/*` | Google Maps blocked (project location); collaboration WebSocket blocked; any inline script blocked | Workshop fully functional incl. realtime collab |
| API consumers | `/api/*` | n/a (JSON responses; CSP on HTML only) | Unaffected |

## 5.2 Screen states (the relevant subset)

CSP introduces no new states. The states that matter are the **failure states** it
could cause, which must not occur:

| State | Trigger if CSP misconfigured | Required behavior |
|---|---|---|
| Loading | n/a | unchanged |
| Empty | n/a | unchanged |
| Success | n/a | unchanged |
| Error | inline script blocked → JS-dependent UI silent | must not happen (nonce pipeline prevents it) |
| Offline/degraded | n/a | unchanged |
| Permission-denied | n/a | unchanged (authz is separate from CSP) |

## 5.3 Accessibility guarantees that must survive enforcement

CSP does not alter the DOM semantics, but a blocked script can silently disable
keyboard/focus behavior that depends on JS. The accessibility proof gate (TEST-03)
includes:

- **Keyboard navigation** still works on `/share` (tab navigation, decision buttons)
  and `/workshop` (sidebar, dialogs) after enforcement.
- **Focus management** — dialogs/sheets still trap/restore focus (JS-dependent).
- **Screen-reader semantics** — ARIA live regions for collaboration updates still
  announce (WebSocket-dependent; SEC-06 protects the socket).
- **Reduced motion** — `LiquidGlassReady` and animation `<style>` blocks still apply
  (style-src retains `'unsafe-inline'`; DEC-08).
- **Color/non-color cues** — unaffected (CSS not blocked).

No new ARIA, no new focus-order work, no new copy. The accessibility requirement is
purely **non-regression**: the existing accessible behavior must survive the CSP flip,
proven by browser proof (TEST-03).

## 5.4 Responsive / localization implications

None. CSP is header work; responsive layout and i18n are unaffected.

## 5.5 UX regressions to guard against

| Regression | Cause | Guard |
|---|---|---|
| Blank `/share` page | inline script blocked under enforcement before nonce plumbed | P3 enforces `/share` only after P1 nonce pipeline + browser proof |
| Analytics silent on marketing | GA4/Clarity blocked | allowlist in landing policy + browser proof |
| Workshop collaboration dead | wss blocked | SEC-06 + browser proof |
| OAuth sign-in loop | `AuthStateMismatchRecoveryScript` blocked | SEC-02 (nonce on root-layout script) + browser proof |
| Invite blank page | inline redirect blocked | nonce on `pending-invite` HTML script + browser proof |

## 5.6 Browser-proof proportionality

Per `AGENTS.md` verification policy, CSP enforcement is a **runtime/interaction/data-
state** change — exactly the case where browser proof is required (not skippable). The
Playwright/browser proofs in TEST-03 are therefore **mandatory** for each enforcement
phase, not optional. Report-Only phases (P1, P2) do not need browser proof of
non-breakage (violations are logged only) but do need a smoke check that the header is
present and well-formed.

## 5.7 DESIGN.md interaction

`DESIGN.md` is alpha-stage guidance and does not address CSP. No design-system impact.
The 4 inline `<style>` sites (`03` §3.4) are unchanged and covered by
`style-src 'unsafe-inline'`. No `lint:design-system` or Storybook work is required for
this plan.

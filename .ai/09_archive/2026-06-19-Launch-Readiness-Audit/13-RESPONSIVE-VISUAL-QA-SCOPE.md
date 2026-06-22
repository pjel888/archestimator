# Responsive Visual QA Scope

Date: 2026-06-20. Scope: proportional visual proof for launch-readiness fixes.

## Viewports

Use these widths when a change affects responsive layout or public/share/legal/account surfaces:

| Width | Why |
|---:|---|
| 360 | Small Android / cramped email-link entry. |
| 390 | Common iPhone width. |
| 768 | Tablet portrait. |
| 1024 | Tablet/desktop boundary. |
| 1440 | Standard desktop. |

## Routes/surfaces

| Surface | Visual claims to prove |
|---|---|
| `/` and marketing/legal pages | Legal/consent copy readable; no banner overlap; public error states fit. |
| `/login` and `/beta/access-required` | Closed-beta denial and magic-link states fit on mobile. |
| `/invite/[token]` | Invalid/expired/accepted states are branded and do not expose token text. |
| `/share/[token]` | Password, revoked/expired, no-access, comment error, and proposal view do not leak metadata or overlap. |
| `/workshop/projects` | Any B2/perf fix preserves toolbar/search/card/menu text fit. |
| Root error/not-found | Recovery controls are visible and not nested in broken layout chrome. |

## Static vs browser proof

Static/source review is enough for:
- Markdown/doc-only changes.
- Copy matrix updates before implementation.
- Narrow class/copy changes that do not affect layout or interaction.

Browser/manual proof is required for:
- New root error boundaries.
- Consent interaction/network behavior.
- Share/invite auth state.
- DSAR/account support forms or destructive actions.
- Responsive changes to public/legal/share/account surfaces.
- Any claim that text fits or no elements overlap after a component/layout change.

## Stop condition

Visual QA is complete when every route touched by a launch fix has either a static justification
or a browser/manual proof artifact named in the gate close artifact. Do not run browser tooling only
to decorate a docs-only planning edit.

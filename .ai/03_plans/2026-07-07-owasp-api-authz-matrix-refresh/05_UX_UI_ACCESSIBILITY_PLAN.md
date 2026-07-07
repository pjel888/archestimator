# 05 — UX, UI, Accessibility (auth-flow scope)

This is an authz planning pack, so the UX scope is limited to **security-relevant auth
and share-flow UX states**. Full UI/design work is out of scope (`DESIGN.md` is
alpha-stage; defers to owner).

## User journeys (auth-relevant)

### J1 — Invited user accepts an invite
- Entry: `/invite/<token>` → resolve state (invalid/expired/revoked/already-used/
  wrong-account/valid).
- States: loading interstitial (`/workshop/pending-invite`), wrong-account sign-out
  prompt, accept confirmation, redirect into workspace.
- **Security UX requirement:** the wrong-account state must never expose the invite's
  target workspace name before the user signs out and signs back in as the addressee
  (prevents enumeration). Verified: `readInviteCurrentBetterAuthEmail` resolves email
  without leaking target details.
- A11y: invite accept form is a real `<form action>` (progressive enhancement).

### J2 — Recipient opens a shared proposal
- Entry: `/share/<token>` → active-state check → password gate (if required) →
  recipient session establishment (`?recipient=`) → read-only proposal view.
- States: not-found, password gate (`<ProjectPublicationPasswordGate>`), loading
  skeleton, ready view, session banner, comment/decision UI (gated by session).
- **Security UX requirement:** the raw `?recipient=` token must not appear in the
  browser's `Referer` on any outbound navigation (enforced by `Referrer-Policy:
  no-referrer` on `/share`). Verified.
- A11y: password gate is a `<form>`; error states (`Rate-After`, locked-out) must be
  announced to assistive tech (live region). **Gap:** verify live-region announcement
  of the 429 lockout state — minor a11y + security-UX item.

### J3 — Authenticated user performs an estimate mutation
- Entry: workshop estimate editor → client event → TanStack mutation → Server Action.
- States: optimistic UI, pending, success, validation-error, authorization-error (403
  surfaced as "Estimate edit access denied."), conflict (`expectedRowRevision`
  mismatch → refetch).
- **Security UX requirement:** a 403 must not reveal *why* access was denied beyond a
  generic message. Verified (`d1-action-client.ts` throws `"Estimate edit access
  denied."`).

## UX states inventory (security-relevant)
| State | Where | Behavior |
|---|---|---|
| Unauthenticated on protected route | proxy | redirect `/login?next=...` |
| Closed-beta denied | `getCurrentUserContext` | redirect `/access-required` (or `?status=revoked`) |
| Terms not accepted | proxy | gate to `/workshop/terms` |
| Publication locked/expired/revoked | share page | `SHARED_LINK_UNAVAILABLE_COPY` via `not-found.tsx` |
| Password lockout (429) | share password form | must show `Retry-After` + accessible announcement |
| Rate-limited (429) | share mutations | error toast, no internal detail leak |
| Cross-workspace access denied | estimate action | generic `"Estimate edit access denied."` |

## Accessibility gates (for the future implementation, where auth UX changes)
- Keyboard operability of password gate, invite accept, sign-out.
- Visible focus on all auth forms.
- Live-region announcement of 429/lockout/403 states.
- Semantic `<form>` for all progressive-enhancement actions.
- No color-only status cue for auth errors.

## Out of scope
- Non-auth UI components, marketing pages, design-system tokens, Storybook inventory.

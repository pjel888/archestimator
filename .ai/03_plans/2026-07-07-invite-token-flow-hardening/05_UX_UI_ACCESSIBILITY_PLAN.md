# UX, UI, and Accessibility Plan

**Scope note:** This is a hardening pack, not a UX redesign. The invite page state machine and recovery copy already exist and are a non-regression target (UX-01, UX-02, A11Y-02). The only **new** UI is the revoke control (SEC-07, UX-03, A11Y-01). `DESIGN.md` is an alpha-stage guide, not law — defer to Philip on design decisions; do not block or revert work on design-system grounds.

## 1. Primary user journeys

### J1 — Invited collaborator, signed-out (the first-user beta path — must not break)
1. Recipient opens `/invite/<token>` from email.
2. Server resolves (active state) → renders **signed-out-preview**: project name, role, inviter email, "Continue" CTA.
3. User clicks Continue → `/invite/<token>/continue` sets bridge cookie → redirects to `/login?next=/workshop/pending-invite`.
4. User completes magic-link or Google auth → Better Auth session established.
5. `resolvePostAuthDestination` allows `/workshop/pending-invite` → workshop redirects to pending-invite route.
6. `/workshop/pending-invite` reads bridge cookie → `acceptPendingInviteBridge` → membership created → banner "accepted" → redirect to project/estimate.
7. Onboarding: `getAccountSetupState` sees `invitedCollaborator` (no default workspace but has membership) → routes to invited-collaborator onboarding (not self-serve workspace creation).

**Hardening impact:** SEC-01/SEC-02 tightening must not block step 3 (same-site Continue) or step 6 (workshop accept). The Continue navigation mechanism must carry either Origin (form POST) or Referer (anchor click, modulo `Referrer-Policy: no-referrer` on `/invite`). **DISCOVERY-REQUIRED in P1-T2** to confirm the exact mechanism and adjust (likely switch the Continue CTA to a form POST to guarantee an Origin header).

### J2 — Invited collaborator, signed-in as the correct account
1. Open `/invite/<token>` → **signed-in-preview** with "Accept" form POST.
2. POST `/invite/[token]/accept` → membership created → redirect `/workshop?invite=accepted`.

### J3 — Invited collaborator, signed-in as the WRONG account
1. Open `/invite/<token>` → **wrong-account** state: "This invite is for another account" + the invited email (not the session email) + sign-out form.
2. User signs out → `/invite/<token>/sign-out` → returns to invite page → signed-out-preview → J1.

### J4 — Manager revokes a pending invitation (NEW — SEC-07)
1. Manager opens publisher members panel → sees pending invitation row with "Revoke" control.
2. Click Revoke → confirmation dialog ("Revoke invitation for <email>? They will no longer be able to accept.").
3. Confirm → `revokeCollaborationInvitation` Server Action → invitation `revoked`, tokens revoked, audit event.
4. UI updates: invitation row removed or marked revoked; success toast.
5. If the revoked invitee later opens the link → terminal revoked state with recovery copy (UX-01).

## 2. Screen and component states (invite page)

| State | Copy | CTA | Token in DOM? |
|---|---|---|---|
| active / signed-out-preview | "You're invited to <project> as <role>" | Continue (→ login) | No |
| active / signed-in-preview | same + "Accept" | Accept (form POST) | No |
| wrong-account | "This invite is for another account" + invited email | Sign out and continue | No |
| expired | "This invitation has expired" + contact link | Contact | No |
| revoked | "This invitation has been revoked" + contact link | Contact | No |
| already-used | "This invitation has already been used" | — | No |
| invalid | "This invitation link isn't valid" | — | No |
| rate-limited | "Too many attempts. Please wait." | — | No |
| disabled (flag off) | "Invitations are not available" | — | No |

**Non-regression:** all of the above must remain after hardening (UX-01, UX-02, A11Y-02). The `revoked` terminal state already exists in `page.tsx` via `resolveState`; SEC-07 makes it reachable through explicit manager action (today it's only reachable via implicit re-issue revocation, which still leaves the invitation `pending`).

## 3. Revoke control UX (NEW)

- **Placement:** publisher members panel, in the pending-invitations list, next to "Resend"/"Copy link" controls. Not on already-accepted/revoked rows (those have no pending token to revoke).
- **Control:** `Button` variant `ghost` or `destructive` from `src/components/ui/`; icon + text "Revoke".
- **Confirmation:** `AlertDialog` (destructive pattern) — title "Revoke invitation?", body "Revoke invitation for <email>? They'll no longer be able to accept this invite.", actions "Cancel" (default) + "Revoke" (destructive).
- **Success:** toast "Invitation revoked." Row updates to revoked state or is removed.
- **Error:** toast "Couldn't revoke invitation. Please try again." with the error logged.
- **Loading:** button shows spinner + is disabled during the action (prevent double-submit).
- **Design tokens:** reuse existing destructive/ghost tokens; no new tokens (alpha-stage DESIGN.md).

## 4. Accessibility (A11Y-01, A11Y-02)

### Revoke control (A11Y-01)
- **Keyboard:** Tab reaches the revoke button; Enter/Space activates; dialog traps focus on open; Esc cancels; focus restores to the trigger button on close.
- **Screen reader:** Button accessible name "Revoke invitation for <email>" (via `aria-label` or visible text + `aria-describedby`). Dialog has `role="alertdialog"`, `aria-labelledby`, `aria-describedby`. Status live-region announces "Invitation revoked" on success.
- **Color/contrast:** destructive variant must meet AA contrast; the revoke action has a text label + icon (color is not the only cue).
- **Reduced motion:** no animation on the dialog beyond the primitive's default (respect `prefers-reduced-motion`).
- **Focus order:** button → dialog trigger → dialog actions (Cancel before Revoke, so Enter defaults to non-destructive).

### Invite page states (A11Y-02 — non-regression)
- Terminal copy is in the DOM (not visually hidden), logical heading order, status communicated via text not color alone. Existing tests (`project-invite-entry-route.test.ts`) cover the DOM assertions.

## 5. Responsive behavior
- Invite page: single-column, mobile-first (existing). No change.
- Revoke control: fits the existing members-panel row layout; dialog is full-width on mobile (existing primitive behavior).

## 6. Copy and content hierarchy
- Keep existing invite copy. New copy (revoke confirmation + toasts) should match the repo's existing tone (concise, action-oriented). Defer final wording to Philip.

## 7. UX regressions to guard against
- SEC-01/SEC-02 over-blocking the legitimate Continue/Accept flow (J1, J2) — mitigated by same-site allow + dev allow + Origin-on-form-POST.
- Revoke button appearing on already-accepted rows (only pending).
- Confirmation dialog focus trap regression (reuse `src/components/ui/` AlertDialog).

## 8. Browser/visual proof policy (per AGENTS.md verification policy)
- The revoke control is a new interactive element (dialog, focus management) — **browser proof is warranted** for the focus-trap/restore and keyboard path. Targeted Playwright or manual keyboard pass on a preview deploy, not a full visual QA suite.
- SEC-01/SEC-02 origin changes are server behavior — proven by unit tests + curl, not browser.
- Terminal state rendering is non-regression — existing DOM tests suffice.

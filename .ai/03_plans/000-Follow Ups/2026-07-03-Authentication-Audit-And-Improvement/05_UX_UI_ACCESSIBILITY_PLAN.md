# 05 - UX, UI, And Accessibility Plan

Source authority: `.ai/16_user-experience/2026-06-22-full-app-user-story-ux-audit/04-ux-state-accessibility-and-content-contracts.md`, `10-access-path-and-persona-taxonomy.md`, `11-access-path-rbac-ux-review.md`, and the auth/account user-story report.

## UX Contract

Every auth state must answer:
- What happened?
- Which account/path is affected?
- What can the user do next?
- Who can repair it if the user cannot?

Do not use generic "something went wrong" copy for auth, invite, terms, or share states.

## Required State Matrix

| Surface | Actor | Required states | Copy requirement | A11y requirement | Test/proof |
|---|---|---|---|---|---|
| Login / Google OAuth | Primary App User, Project Collaborator | signed out, OAuth start pending, account picker, state mismatch, provider failure, sanitized `next` dropped | Name retry path and safe destination when `next` is dropped | Focus returns to primary sign-in action; status announces via live region/toast | Auth form/action tests plus OAuth URL assertion |
| Sign-out / account switch | Primary App User | local sign-out success, wrong account, account switch required, provider grant not revoked if policy chooses local-only | Copy must not imply Google account was signed out unless true | Sign-out action remains keyboard reachable and labeled | Server-action test plus policy assertion |
| Closed beta | Primary App User | allowed, denied, revoked, unknown/expired allowlist, support requested | Name access state and support path | Focus on primary support/retry action | Closed-beta session/page tests |
| Terms gate | Primary App User | terms required, acceptance pending, persistence failed, version changed, safe redirect | Say acceptance was not saved when persistence fails | Checkbox/form keyboard safe; failure announced | Legal terms action/layout tests |
| Workspace access | Primary App User, Project Collaborator | missing workspace, incomplete setup, direct member, project member, estimate member, forbidden role | Distinguish no workspace from no permission | Error state must not trap focus | Authz matrix tests |
| Invite entry | Project Collaborator | signed out, correct account, wrong account, already member, used, expired, revoked, broken parent, rate limited | State who invited the user, what they are joining, next safe action | Continue/sign-out/accept actions have labels and touch targets | Invite route/action tests |
| Publication/share | Shared-Link Recipient | valid, invalid, expired, revoked, password required, password failed, lockout timer, recipient session lost, comment/decision conflict, asset failure | Explain review object, action meaning, recovery/contact owner | First open focus on comprehension block; failures announced; print hierarchy preserved | Share/publication tests and targeted browser proof when UI changes |
| Support/admin repair | Support/Admin Operator | denied beta, revoked access, broken invite, missing workspace, default workspace failure | State diagnosis, repair action, audit note, user-facing answer | Admin controls must not be icon-only | Admin action tests plus audit-event proof |

## Accessibility Acceptance

Implementation must preserve:
- Predictable focus movement on persistent auth states.
- `aria-live` or toast announcements for auth/invite/share failures.
- Keyboard-safe forms and recovery actions.
- Mobile targets at least 44x44px for recovery, save, retry, and destructive actions.
- No icon-only destructive or recovery actions without accessible name and visible context.
- No user-facing raw provider errors, tokens, OAuth state, invite/share URLs, or stack traces.

## Copy Requirements

| Situation | Required copy intent |
|---|---|
| Unsafe `next` dropped | "We could not return you to that page safely; continue to the workshop or try the link again." |
| `state_mismatch` | "That sign-in attempt expired or was interrupted; try again." |
| Wrong invite account | "This invite is for a different email. Sign out and use that account, or ask for a new invite." |
| Missing workspace | "Your account is signed in, but no workspace access was found." |
| Forbidden role | "You do not have permission for this action in this workspace/project." |
| Revoked beta | "Your beta access is not currently active. Contact support or the account owner." |
| Terms persistence failure | "Your acceptance was not saved. Retry before continuing." |
| Share session lost | "This review session expired. Reopen the link or request a new one." |

Exact product copy can change, but each message must retain the state, next action, and recovery path.

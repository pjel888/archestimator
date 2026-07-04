# 02 - Feature Brief And Scope

## Product Brief

Archestimator needs a hardened authentication and authorization system for first users. The work starts with a Google OAuth account-picker bug, but the actual product requirement is broader: users must enter through the correct access path, recover from predictable failures, and never cross a tenant, invite, or publication/share boundary by accident.

## User Outcomes

| Access path | Outcome |
|---|---|
| Anonymous Visitor | Can reach login/contact/public pages without leaking protected content. |
| Primary App User | Can sign in, accept terms, reach the workshop, manage allowed resources, and switch Google accounts intentionally. |
| Project Collaborator | Can accept or recover an invite with the correct account and role. |
| Shared-Link Recipient | Can view/review/comment/decide through token/password/session boundaries without becoming a workspace user. |
| Support/Admin Operator | Can diagnose beta/invite/access failures with least privilege and audit evidence. |

## Scope Boundaries

In scope:
- Google OAuth prompt, sign-out semantics, OAuth state recovery, and auth error copy.
- Better Auth session cookie and Cloudflare route-handler behavior.
- Closed beta, terms, onboarding, invite, workspace/project/estimate authorization, publication/share auth, and support repair paths.
- Credential handling, evidence redaction, provider-leftover cleanup, privacy and standards mapping.

Out of scope for this pack:
- Enabling public self-serve signup.
- Rebuilding product personas into new RBAC roles.
- Production provider cutover or migration execution.
- Design/visual polish beyond auth-state UX requirements.

## Success Criteria

1. Every auth surface has a named actor, authority source, failure state, and server-side enforcement point.
2. Every credential or bearer material has storage, redaction, retention, rotation, and revocation guidance.
3. Every P0/P1 risk has a phase, mitigation, and test evidence gate.
4. Provider leftovers are classified before deletion or retention.
5. A future implementation-planning agent can start from `11_IMPLEMENTATION_PLAN.md` without redoing the planning audit, then produce the exact coding/test plan before source edits begin.

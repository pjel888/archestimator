# 04 - Requirements Specification

Requirement IDs are stable for traceability in `16_REQUIREMENTS_TRACEABILITY_MATRIX.md`.

## Functional Requirements

| ID | Requirement | Acceptance |
|---|---|---|
| FR-001 | Google OAuth sign-in must present an account-selection path on every explicit Google sign-in attempt. | Better Auth Google provider config includes an intentional `prompt` value and tests assert it reaches the authorization URL construction path. |
| FR-002 | Sign-out behavior must be explicit about local session, OAuth provider session, OAuth grant revocation, and all-session logout. | User-facing and code-level policy are documented; tests cover whichever policy is implemented. |
| FR-003 | OAuth `state_mismatch` recovery must not leak state/codes/cookies and must guide the user to a retry path. | Recovery redirects/copy are tested with redacted evidence. |
| FR-004 | Closed-beta and terms gates must fail closed before protected workshop data renders. | Route/layout/session tests cover allowed, denied, revoked, and terms-not-accepted states. |
| FR-005 | Invite acceptance must bind token, account email, origin/CSRF posture, role, and parent project/workspace. | Tests cover signed-out, correct account, wrong account, expired, revoked, used, broken parent, and pending-invite bridge states. |
| FR-006 | Workspace/project/estimate authorization must be checked server-side for every read/mutation surface. | Authz matrix has one row per server action/route/repository path and allowed/denied tests. |
| FR-007 | Publication/share access must remain token/password/session scoped and must not satisfy primary app auth. | Viewer cookie cannot access `/workshop`; Better Auth session cannot bypass share password/session/CSRF. |
| FR-008 | Publication password lockout must be durable across Cloudflare Worker isolates. | D1 or Durable Object hard-lock proof replaces in-memory-only lockout reliance. |
| FR-009 | Provider leftovers must be classified and revalidated before removal. | Each Supabase/Vercel/Resend auth artifact is active, archaeology, delete, rotate/remove, or sibling-pack blocked; before final provider-exit is claimed, rerun the live old-provider keyword file scan (currently `44` after Slice D3), the broader provider-boundary allowlist scanner (currently `89` classified active-surface hit files), the `4` active retired-type-path reference scan, stale proof-utility/test caller checks from `28`/`29`, and any provider-exit/hosted/operator proof required for the claim. |

## Security And Privacy Requirements

| ID | Requirement | Acceptance |
|---|---|---|
| SR-001 | Deny by default for protected app, admin, invite mutation, and share mutation surfaces. | Missing/invalid authority returns no mutation and no sensitive data. |
| SR-002 | Credential material must be inventoried and redacted in logs/evidence. | `20_CREDENTIAL_MATERIAL_TAXONOMY.md` is updated during implementation and redaction tests cover tokens/cookies/email/state/code. |
| SR-003 | Session identifiers must be meaningless, protected, invalidated on logout according to policy, and not exposed to client JS. | Cookie/session tests assert HttpOnly/Secure/SameSite and sign-out invalidation policy. |
| SR-004 | GDPR/EDPB posture must cover minimization, storage limitation, DSAR/export/delete, and breach notification workflows for auth data. | Ops doc contains retention/DSAR/breach playbook and audit-event minimization rules. |
| SR-005 | Evidence artifacts must never include raw OAuth state, codes, cookies, session IDs, invite/share tokens, raw emails, raw IPs, or provider secrets unless explicitly sanitized. | Evidence checklist rejects unsafe examples. |

## UX And Accessibility Requirements

| ID | Requirement | Acceptance |
|---|---|---|
| UX-001 | Every persistent auth state must name the state, next action, and support path. | Copy matrix covers sanitized `next`, `state_mismatch`, wrong account, missing workspace, permission forbidden, revoked beta, broken invite, and terms persistence failure. |
| UX-002 | Recovery actions must be keyboard/touch accessible and not icon-only. | UI tests or static checks cover focus, labels, live-region/toast behavior, and 44x44px mobile targets for recovery/destructive actions. |
| UX-003 | Shared-link recipients must understand what they are reviewing and how to recover expired/revoked/password/session failures. | Share-recipient state tests cover first open, password failed, lockout, session lost, and action conflict. |

## Non-Functional Requirements

| ID | Requirement | Acceptance |
|---|---|---|
| NFR-001 | Worker runtime must not rely on module-global mutable state for security-critical counters or locks. | Publication lockout and other security state use D1/Durable Objects/another durable store. |
| NFR-002 | Protected auth routes must be dynamic/no-store where auth state is involved. | Route-handler tests assert no-store headers for auth/share sensitive paths. |
| NFR-003 | Observability must preserve debuggability without leaking credential material. | Security events use hashed identifiers and sanitized metadata. |

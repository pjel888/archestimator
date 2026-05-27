# Security Threat Model

**Status:** planning only
**Security posture:** passwordless does not mean riskless; it shifts risk to email, OAuth, sessions, redirects, invitations, and authorization.

## Protected Assets

- Supabase access and refresh tokens.
- Supabase service-role key.
- Auth callback `code`.
- Profile records.
- Workspace membership.
- Project and estimate access.
- Client/project/estimate data.
- Component library data.
- AI audit and future AI data access.
- Collaboration invitations.
- Private Realtime channels.
- Security/audit logs.

## Trust Boundaries

### Browser

Untrusted. Browser inputs include:

- email;
- `next`;
- mode;
- invite identifiers;
- route context;
- any future domain/workspace fields.

### Server Actions And Route Handlers

Trusted only after validation. Must:

- sanitize redirects;
- normalize emails;
- enforce auth/session context;
- never expose service-role results directly;
- never log secrets/codes/tokens.

### Supabase RLS

Canonical data boundary. Must:

- protect workspace/project/estimate/library data;
- preserve project/sheet collaboration overrides;
- keep browser clients on anon/authenticated keys only;
- keep service-role operations rare, server-only, and audited.

### External Providers

Google, Supabase Auth, email provider, Vercel, and future SSO providers are processors/subprocessors and trust dependencies.

## Threats And Controls

### Open Redirect

Threat:

- Attacker crafts `/login?next=https://evil.example`.
- Successful auth redirects user or token-bearing flow to hostile site.

Current control:

- `sanitizeNextPath()` accepts only relative paths and rejects `//`.

Required controls:

- centralize redirect sanitizer in one reusable helper;
- test backslash-prefixed paths, `//evil`, encoded `https:%2f%2f`, CRLF, self-callback, and path traversal-ish values;
- use canonical production origin for provider callback URLs;
- reject `next` values that point to auth callback itself unless explicitly needed.
- use a canonical-origin allowlist in production; request origin is acceptable only when it matches an allowed app origin.

### Email Enumeration

Threat:

- Login reveals whether an account exists.

Required controls:

- public response for email submission should be generic;
- rate-limit by email hash and IP;
- do not expose `shouldCreateUser` differences through visible copy unless deliberately invite-only;
- provider errors should be mapped to stable public error classes.

### Magic Link Interception

Threat:

- User's email account or forwarded link is compromised.

Required controls:

- short expiration;
- one-time use;
- target a resend cooldown that is visible in UI and backed by provider/app limits;
- define `shouldCreateUser` policy for public self-serve vs invite-only;
- handle email security scanners/prefetchers by preferring code exchange behavior that does not grant access to a passive scanner if feasible;
- clean up stale auto-created accounts if public self-serve is abused;
- no sensitive project details in email;
- audit sign-in provider, timestamp, approximate IP/UA;
- warn on new device or unusual pattern later;
- recommend corporate email security in enterprise docs, but do not overclaim.

### OAuth Account Linking / Pre-Account Takeover

Threat:

- A malicious actor creates an account with a victim's email through a weak provider or unverified email.

Required controls:

- trust only verified emails from OAuth providers;
- normalize email lower-case;
- profile trigger must preserve platform/admin role rules;
- future identity linking must require fresh auth and verified email;
- log identity-linked / identity-unlinked provider notifications where provider supports them.

### Invite Abuse

Threat:

- Invite emails become spam, privilege escalation, or account takeover paths.

Current controls:

- collaboration actions require manager rank;
- service-role admin client is server-only;
- invites persist in `collaboration_invitations`;
- roles are rank-checked.

Required controls:

- resend cooldown;
- daily invite cap per actor/workspace;
- revoke/expire controls;
- no invite to assign a role higher than actor;
- last-owner guard;
- invite acceptance must require the authenticated email to match the invited email unless a manager deliberately reissues it.

### Service-Role Misuse

Threat:

- Service-role key leaks or overbroad server code bypasses RLS.

Current controls:

- service role appears only in server/dev/collaboration contexts.

Required controls:

- never import service-role helpers into client components;
- name admin clients by purpose;
- audit service-role use for invitations/account lifecycle;
- dependency-inject admin clients in tests;
- production env scans before deployment;
- do not let AI routes use admin DB bypass.

### Session Fixation / Cookie Issues

Threat:

- Old or attacker-controlled session persists across sign-in.

Required controls:

- rely on Supabase `exchangeCodeForSession()` for session issuance;
- verify cookie security attributes in production;
- rotate refresh tokens;
- sign out fully clears Supabase cookies;
- record session id where available for security events;
- define session lifetime, inactivity timeout, single-session policy, and sign-out-all-devices target before corporate launch;
- require fresh auth for sensitive actions later: ownership transfer, domain policy, account deletion/export, provider changes;
- test login in Vercel preview/prod behind forwarded host.

### API Route Bypass

Threat:

- `src/proxy.ts` intentionally skips `/api`, so an API route may be reachable without auth.

Required controls:

- every `/api/*` route must call explicit auth/context helper if it touches user data;
- unauthenticated APIs must be enumerated and justified;
- AI route must keep current route-level auth;
- media upload APIs must keep ownership checks.
- Proposal/export APIs must prove repository-level auth and cross-workspace denial even when Proxy is skipped.

Current `/api` inventory to validate before launch:

| Route | Methods | Current Auth Posture | Required Follow-Up |
| --- | --- | --- | --- |
| `/api/ai/ask` | `POST` | Uses AI auth guard and requires workspace for Supabase users. | Keep admin DB bypass rejected; rate-limit; audit failures. |
| `/api/component-library/images` | `POST`, `DELETE` | Requires current user context and default workspace. | Add abuse/quota posture and audit storage operations. |
| `/api/component-library/attachments` | `POST`, `DELETE` | Requires current user context and default workspace. | Add file abuse posture, scanning decision, and audit operations. |
| `/api/projects/images` | `POST`, `DELETE` | Requires current user context/default workspace and verifies project workspace. | Add cross-workspace tests, quota/rate limits, audit operations. |
| `/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx` | `GET` | Relies on repository helper for protected project/estimate tree. | Add route-level unauthenticated and cross-workspace tests before launch. |

### RLS Regression

Threat:

- A migration grants broad access or weakens workspace boundaries.

Required controls:

- migration tests for RLS and grants;
- deny direct anon access to app data;
- authenticated grants should still depend on RLS;
- security-definer RPCs must validate workspace/project/sheet membership;
- detect changes before commit.

### Corporate Domain Takeover

Threat:

- A user claims `company.com` workspace without proving ownership.

Required controls before domain features:

- never trust email domain alone;
- require DNS TXT verification or equivalent;
- domain claims must have status lifecycle;
- conflict/dispute path;
- no auto-join until domain verified and policy chosen by owner/admin.

### Bot/Abuse Pressure

Threat:

- Attackers trigger auth emails, Google OAuth spam, invite spam, or brute-force OTP attempts.

Required controls:

- Supabase Auth rate limits;
- app-side cooldown UI;
- optional Turnstile/hCaptcha if abuse appears;
- block disposable domains only if product strategy supports it;
- monitor auth failure spikes;
- support manual blocklist/allowlist later.

## Audit Event Plan

Add server-owned audit/security events for:

- auth email requested;
- OAuth sign-in started;
- OAuth callback success/failure;
- magic-link callback success/failure;
- sign out;
- profile created;
- workspace bootstrapped;
- invite sent/resend/revoked/accepted/expired;
- role changed;
- account deactivated/reactivated;
- domain verification requested/verified/failed later.

Do not log:

- tokens;
- callback code;
- magic link URL;
- refresh token;
- service-role key;
- raw provider credential payloads;
- raw IP if avoidable. Prefer truncated/anonymized IP or keyed hash with retention.

Audit event implementation requirements:

- use one table name for the first slice: `account_security_events`;
- insert only from server-owned code paths;
- include actor user id, workspace id, resource type/id where applicable, session id if available, request id/correlation id, event type, result, severity, and redacted metadata;
- define alert thresholds for callback failures, invite bursts, storage upload spikes, and repeated unauthorized access;
- define retention and deletion/minimization job;
- define hash-key rotation if IP/user-agent hashing is used;
- decide whether workspace admins can view a filtered audit log later.

## Operator And Admin Controls

Minimum pre-launch controls for operators/platform accounts:

- Supabase organization MFA enabled for all admins;
- Google account MFA required for Google Cloud/Vercel/Supabase admins;
- at least two Supabase organization owners;
- break-glass account documented and protected;
- service-role key rotation procedure documented;
- admin access and dashboard setting changes reviewed through provider/platform audit logs where available.

## Security Acceptance Criteria

- No password route, form, action, or test fixture becomes active.
- Redirect sanitizer is centrally tested.
- Auth errors are classed and mapped.
- `/api` route inventory is reviewed and tested.
- Passwordless-only provider posture is proven or residual risk is accepted in writing.
- Operator MFA and service-role handling are ready before production.
- Service-role use is isolated and audited.
- `/api` routes have explicit auth posture.
- RLS tests cover auth-adjacent tables and collaboration tables.
- Dev auth bypass remains localhost-only and disabled in production.
- Production provider dashboard settings are verified before launch.

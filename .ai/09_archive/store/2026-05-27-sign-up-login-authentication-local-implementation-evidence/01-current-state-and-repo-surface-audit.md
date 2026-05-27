# Current State And Repo Surface Audit

**Status:** planning evidence only
**Scope:** existing auth, session, protected-route, workspace, collaboration, and Supabase surfaces

## Executive Summary

Archestimator already has the skeleton of the requested auth feature:

- Google OAuth is already wired through `signInWithGoogle()`.
- Email magic links are already wired through `signInWithEmail()`.
- The callback route exchanges a Supabase auth code for a session.
- `/workshop` routes are protected by `src/proxy.ts`.
- Profiles and workspace membership are already RLS-backed.
- Project and estimate-sheet collaboration invitations already use Supabase Auth admin invitations.

The production gap is not "add auth from zero." The real work is hardening, productizing, and documenting the current auth surface so it behaves like a startup-lean but enterprise-aware system.

## Current Files And Responsibilities

### Signed-Out Entry

- `src/app/login/page.tsx`
  - Current signed-out page.
  - Shows Google sign-in first and email magic-link fallback.
  - Uses compact app UI primitives: `Button`, `ControlInput`.
  - Production gap: copy still mentions CEO access, which is internal/dev-facing and should not be public launch copy.

Route truth:

- `/login` is the only current auth entry route found in source.
- `/sign-in` and `/sign-up` are optional future aliases only.
- `/signup` appears in older planning docs but is not a current source route and is not implementation authority.

### Auth Server Actions

- `src/lib/auth/actions.ts`
  - `signInWithEmail(formData)` normalizes email, sanitizes `next`, calls `supabase.auth.signInWithOtp()`, and sets `emailRedirectTo`.
  - `signInWithGoogle(formData)` calls `supabase.auth.signInWithOAuth({ provider: "google" })` with a callback redirect.
  - `signOut()` signs out and redirects to `/login`.
  - Current strength: both auth flows share the same callback path.
  - Production gaps:
    - error handling may leak provider messages directly to UI;
    - magic-link success copy can confirm a submitted address, which may be acceptable after form submission but should still avoid user-enumeration side channels;
    - origin resolution should prefer a canonical configured app URL in production rather than trusting request origin as the first choice;
    - the no-password policy is app-level, not yet documented as a provider-level control.
    - `scopes` are not explicitly set in current Google OAuth action; current options include `access_type: "offline"` and `prompt: "select_account"`.

### Callback

- `src/app/auth/callback/route.ts`
  - Reads `code` and sanitized `next`.
  - Exchanges code through `supabase.auth.exchangeCodeForSession(code)`.
  - Redirects to next destination.
  - Current strength: rejects missing codes and strips unsafe `next` values.
  - Production gaps:
    - callback error route should avoid echoing raw provider error strings to public UI;
    - forwarded-host / canonical origin handling should be tested on Vercel preview and production domains;
    - invite acceptance should preserve project intent; sheet-specific invite destinations are not proven by the current invite redirect URL builder.

### Route Protection

- `src/proxy.ts`
  - Protects `/workshop`.
  - Excludes `/_next`, static assets, and `/api`.
  - Redirects signed-out users to `/login?next=<path>`.
  - Redirects signed-in users away from `/login`.
  - Current strength: app routes and API routes are intentionally separate.
  - Production gaps:
    - `/api` bypass requires every API route to enforce its own auth boundary;
    - if public sign-up/sign-in aliases are added, `AUTH_ROUTES` must include them;
    - callback and legal routes must stay public while protected app routes stay gated.

Current `/api` route inventory for the next audit:

- `src/app/api/ai/ask/route.ts`
- `src/app/api/component-library/images/route.ts`
- `src/app/api/component-library/attachments/route.ts`
- `src/app/api/projects/images/route.ts`
- `src/app/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx/route.ts`

Each route needs explicit auth, data, service-role, rate-limit, audit, and abuse posture documented before launch.

### Session Context

- `src/lib/auth/session.ts`
  - `getCurrentUserContext()` resolves dev bypass first, then Supabase session.
  - Reads/creates `profiles`.
  - Derives `displayName` and `avatarUrl` from profile or auth metadata.
  - `requireCurrentUserContext()` redirects to `/login`.
  - Current strength: server components have a single context entry point.
  - Production gaps:
    - profile creation is still done from app code as a fallback even though the auth trigger should create profiles;
    - profile metadata rules need to define which OAuth metadata is trusted;
    - account deletion/deactivation and profile export are not planned in code yet.

### Dev Auth

- `src/lib/auth/dev-auth-gate.ts`
- `src/lib/auth/dev-auth.ts`
- `src/lib/supabase/server.ts`
  - Local-only bypass exists for browser/agent testing.
  - `ARCHESTIMATOR_DEV_AUTH_BYPASS=1` and `ARCHESTIMATOR_DEV_AUTH_ADMIN_DB=1` are gated by `NODE_ENV !== "production"` and localhost.
  - Current strength: production-disable and host-gated design is already explicit.
  - Production gaps:
    - keep this covered by tests during every auth refactor;
    - do not let AI routes or external-facing routes inherit admin bypass behavior.

### Supabase Schema

- `supabase/migrations/20260518090000_archestimator_core_schema.sql`
  - `workspaces`, `workspace_members`, projects, estimates, library, row data.
  - RLS enabled from the first migration.
- `supabase/migrations/20260518100000_auth_profiles_ceo_access.sql`
  - `profiles`, role resolver, `handle_new_auth_user()`, platform admin policies.
- `supabase/migrations/20260526142913_project_sheet_collaboration_access.sql`
  - project members, estimate sheet access settings, sheet members, collaboration invitations, Realtime authorization.
  - Second-pass correction: pending collaboration invitations are applied by the auth trigger path through `handle_new_auth_user()` / `apply_pending_collaboration_invitations()`, not only by app-side post-auth bootstrap.

Current strength: workspace and collaboration data already follows an RLS-backed identity model. Current gap: auth production readiness needs to align the user lifecycle with this model instead of adding a separate auth silo.

### Tests Already Touching Auth

- `tests/vitest/auth-magic-link.test.ts`
  - Asserts callback route exists and exchanges codes.
  - Asserts magic-link redirect and Google OAuth action exist.
  - Asserts dev bypass is localhost-gated and production-disabled.
  - Current limitation: these are mostly source-string/contract assertions, not executable behavior tests of server actions, callback route handling, redirect sanitizer, or provider error mapping.
- `tests/vitest/ai-auth-guard.test.ts`
  - Relevant because `/api` routes are not globally protected.
- `tests/vitest/project-collaboration-*`
  - Relevant for invites, project access, sheet access, and corporate-readiness.

## Current Supabase Auth Configuration Snapshot

`supabase/config.toml` currently shows:

- Auth enabled.
- `site_url = "http://localhost:3000"`.
- local callback redirect URLs are allow-listed.
- JWT expiry is 3600 seconds.
- refresh token rotation is enabled.
- signups are enabled.
- anonymous sign-ins are disabled.
- email signups are enabled.
- SMS signups are disabled.
- email OTP length is 6 and expiry is 3600 seconds.
- local resend frequency is not a launch-safe production proof; hosted Auth rate limits must be verified separately.
- Google provider config is not yet visible as enabled in local config.

Production gap: hosted Supabase dashboard settings must be verified separately. Local config alone is not proof that the linked production project has the same provider settings, redirect allow-list, email templates, SMTP, security notifications, or Google OAuth client.

## Existing Strengths

- Passwordless-first app code already exists.
- Google primary path already exists in app code.
- The callback path is centralized.
- Protected app routes already redirect through a `next` parameter.
- The data model is already workspace-scoped.
- Project and sheet collaboration already model enterprise-ish roles.
- Local dev inspection has a clear bypass without requiring interactive OAuth in every smoke run.

## Critical Gaps To Close Before Production

1. **Auth UI must be productized.**
   - Replace internal CEO copy.
   - Add privacy/terms links.
   - Add production error states, resend cooldown, expired-link guidance, and invite continuity.

2. **No-password policy must be more than a UI omission.**
   - Confirm whether Supabase can disable password grants while preserving email OTP/magic links.
   - If not enforceable at provider level, document accepted residual risk or evaluate a provider/policy path that enforces passwordless-only identities.

3. **Provider settings must be verified.**
   - Supabase URL allow-list.
   - Google OAuth consent screen, scopes, branding, redirect URIs.
   - SMTP/custom sender.
   - email templates.
   - rate limits and bot protection.

4. **Privacy and compliance documents must exist before public launch.**
   - Privacy notice.
   - Terms.
   - Cookie notice if analytics/marketing cookies are used.
   - Subprocessor list.
   - DPA stance for business customers.

5. **Corporate account readiness must align with Teamspaces.**
   - Do not invent a second organization model.
   - Workspaces are the organization/account boundary.
   - Project and sheet members remain collaboration overlays.
   - Future domain/SSO/SCIM controls should attach to workspaces.

6. **Security observability is missing.**
   - Add auth audit/security event logs.
   - Track provider, event type, user id when known, workspace id when known, anonymized IP/user-agent metadata, result, and error class.
   - Do not log magic links, tokens, raw codes, access tokens, refresh tokens, or service-role details.

## Planning Conclusion

The first implementation should be a hardening and productization slice around the existing Supabase Auth foundation, not a provider migration.

The plan should explicitly treat enterprise account features as staged readiness: reserve the data and UX space now, but do not ship SSO/domain/SCIM until a real corporate customer or procurement requirement justifies it.

# 01 - Current State And Auth Surface Audit

**Date:** 2026-05-27
**Scope:** repo state, current auth implementation, current data model, production gaps
**Mode:** planning only

## Executive Summary

Archestimator is not starting from zero. The repo already has Supabase Auth, a `/login` route, Google OAuth initiation, email magic-link initiation, a callback route, protected `/workshop` routing, user profile bootstrap, workspace RLS, project/sheet collaboration tables, invitations, and tests for the current magic-link/Google/dev-auth path.

The current implementation is useful as a working foundation, but it is not yet a production-level Sign Up / Log In feature. The plan must harden the current path, remove founder-specific copy from user-facing auth UI, add a sign-up intent surface, add privacy/terms/legal notices, define account onboarding, add abuse/security events, and prepare the workspace model for corporate accounts without introducing passwords.

## Observed Code And Data Surface

### Routes

- `src/app/login/page.tsx`
  - Current public auth entry.
  - Shows Google as the primary sign-in path and email magic link as fallback.
  - Reads `next`, `sent`, `email`, and `error` from search params.
  - Defaults post-auth redirect to `/workshop/projects`.
  - Current gap: page copy is sign-in oriented only, includes founder-specific CEO access copy, and does not link privacy/terms.

- `src/app/auth/callback/route.ts`
  - Handles Supabase auth callback.
  - Reads `code` and sanitized `next`.
  - Calls `exchangeCodeForSession(code)`.
  - Redirects to sanitized `next` or back to `/login` with an error.
  - Current gap: error messages may expose provider detail; production should use safe user copy plus server-side event logging.

- `src/proxy.ts`
  - Protects `/workshop`.
  - Skips `_next`, static paths, and `/api`.
  - Redirects unauthenticated protected requests to `/login?next=<path>`.
  - Redirects authenticated users away from `/login`.
  - Current gap: `/signup` is not part of the auth-route list because it does not exist yet.

### Server Actions And Auth Helpers

- `src/lib/auth/actions.ts`
  - `signInWithEmail(formData)`
    - Normalizes email.
    - Sanitizes `next`.
    - Calls `supabase.auth.signInWithOtp({ email, options: { emailRedirectTo } })`.
    - Redirects to a sent state.
  - `signInWithGoogle(formData)`
    - Sanitizes `next`.
    - Calls `supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo, queryParams } })`.
    - Redirects to Supabase/Google auth URL.
  - `signOut()`
    - Calls `supabase.auth.signOut()`.
    - Redirects to `/login`.
  - Current gaps:
    - No explicit product policy for public self-signup versus invite-only signup.
    - No per-request auth event log.
    - No legal acknowledgment or marketing-consent separation.
    - No generic error mapping for enumeration-resistant UI.
    - No production-domain guard for `origin` fallback.

- `src/lib/auth/session.ts`
  - Resolves current Supabase user.
  - Reads/creates `profiles`.
  - Maps Google metadata names and avatar URLs.
  - Falls back to CEO/member role mapping.
  - Current gaps:
    - Profile bootstrap is mixed into session resolution.
    - No explicit account onboarding state.
    - No user-deletion/export workflow.

- `src/lib/auth/dev-auth.ts` and `src/lib/auth/dev-auth-gate.ts`
  - Local-only dev auth bypass for browser/agent protected-route smoke.
  - Requires localhost and non-production.
  - Uses service-role only server-side.
  - Current position: keep this for local inspection; never expose it to production auth behavior or AI/auth routes that must use real user context.

### Supabase Client Surface

- `src/lib/supabase/server.ts`
  - Creates Supabase SSR server client with request cookies.
  - Supports local dev admin DB bypass when explicitly enabled.
  - Current gap: no production auth cookie policy document tied to privacy/cookie notice.

- `src/lib/supabase/client.ts`
  - Creates browser client.
  - Current recommendation: auth flows should stay server-action/callback owned for SSR cookie consistency.

### Database Foundation

- `supabase/migrations/20260518090000_archestimator_core_schema.sql`
  - Creates `workspaces`, `workspace_members`, `projects`, `estimates`, `cost_library_items`, `estimate_nodes`, `estimate_row_items`.
  - Enables RLS from the first migration.
  - Adds workspace membership helpers.

- `supabase/migrations/20260518100000_auth_profiles_ceo_access.sql`
  - Creates `profiles` with `id` referencing `auth.users`.
  - Adds `default_workspace_id`.
  - Adds `resolve_app_role_for_email()`.
  - Adds `handle_new_auth_user()` trigger.
  - Adds platform-admin policies.

- `supabase/migrations/20260526142913_project_sheet_collaboration_access.sql`
  - Adds project/sheet collaboration roles.
  - Adds project members, estimate sheet members, estimate access settings, collaboration invitations.
  - Adds pending-invite behavior and manager-only access rules.
  - Adds `profiles.avatar_url`.

### Existing Auth Tests

- `tests/vitest/auth-magic-link.test.ts`
  - Verifies callback route exists and exchanges code.
  - Verifies email magic-link redirects to callback with sanitized `next`.
  - Verifies Google OAuth uses the same callback route.
  - Verifies dev auth bypass is explicit, localhost-gated, and server-only.

## Current Production Gaps

### UX / UI Gaps

- No `/signup` route or sign-up-specific intent.
- No first-run account/workspace onboarding route.
- Login UI includes founder-specific CEO access copy.
- No legal footer links for Privacy Policy, Terms, Cookie Notice, or support contact.
- No dedicated invitation acceptance state.
- No explicit "Check your email" resend timer or rate-limit copy.
- No generic error vocabulary that prevents account enumeration.
- No localized copy strategy, even though the product is expected to support international users.

### Auth Policy Gaps

- Public signup policy is implicit because Supabase email signup is enabled.
- There is no app-owned auth policy table for workspace/account rules.
- There is no domain-based signup policy for corporate accounts.
- There is no MFA enrollment or MFA requirement policy for owners/admins.
- There is no SSO discovery or reserved enterprise path.
- There is no account/session revocation UI.

### Security Gaps

- No app-level auth event audit table.
- No auth abuse telemetry beyond Supabase platform logs and rate limits.
- No configured CAPTCHA/escalation plan for repeated OTP requests.
- No explicit session timeout/re-auth policy for sensitive actions.
- No documented production custom domain for Supabase Auth.
- No documented sender domain, SPF/DKIM/DMARC, or custom SMTP requirement.
- No documented redirect allow-list inventory for production and previews.

### Compliance Gaps

- No privacy notice artifact tied to the auth data inventory.
- No terms acceptance/acknowledgment record for first sign-up.
- No separate optional marketing consent.
- No DSAR/export/delete account workflow.
- No retention schedule for invitations, auth event logs, profile records, and deleted users.
- No subprocessors/DPA record for Supabase, Google, Vercel, email provider, analytics provider, or future AI provider.
- No cookie classification for essential auth cookies versus optional analytics/marketing cookies.

### Corporate Account Gaps

- Workspaces are present, but no explicit company/account ownership setup flow.
- No verified corporate domains.
- No domain claim/autojoin/invite-only policy.
- No SSO/SAML metadata model.
- No enterprise audit export.
- No admin security settings page.
- No SCIM provisioning plan. This remains deliberately deferred.

## Current Strengths To Preserve

- Supabase Auth is already integrated with RLS-backed app data.
- Auth cookies are handled through server-side Supabase SSR clients.
- The callback route exchanges auth codes before redirecting.
- `next` paths are sanitized.
- Protected routes are gated at `src/proxy.ts`.
- Existing profiles/workspaces/memberships are RLS-backed.
- Invitations already connect auth user creation to project/sheet collaboration.
- Local dev bypass is gated to localhost and non-production.

## Current Worktree Caution

The working tree is dirty with many unrelated modifications. This plan pack must not normalize, revert, or stage unrelated changes. Future implementation should start with `git status --short --branch`, inspect overlapping files, and stage only auth-scope changes.

## Planning Implication

The right plan is a hardening and productization plan, not a greenfield auth vendor setup. The implementation should keep Supabase as the immediate auth provider, wrap it in app-owned auth/account abstractions, and make future enterprise SSO a configured lane rather than a forced first-milestone dependency.

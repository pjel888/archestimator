# 03 - Technical Architecture And Data Plan

**Date:** 2026-05-27
**Scope:** provider architecture, route protection, Supabase shape, app-owned account model, environment, rollout
**Mode:** planning only
**Second-pass note:** this first-pass companion doc is supplemental only. The current canonical auth route is `/login`; do not implement `/signup` from this document unless the primary auth pack is reopened and updated first. Planned `auth_events` naming here is superseded by `account_security_events`.

## Recommended Architecture

Use an **app-owned auth/account boundary over Supabase Auth**.

Supabase remains the credential/session provider for v1. Archestimator owns:

- public auth routes;
- auth server actions;
- callback handling;
- profile/workspace bootstrap;
- account onboarding;
- role and access policy;
- auth event logging;
- compliance data export/delete workflows;
- corporate account policy.

This keeps the startup path lean and makes future Clerk/Auth0/enterprise SSO migration possible because product code depends on Archestimator auth/account interfaces, not provider-specific calls scattered across routes.

## Provider Decision

### Immediate Provider

Supabase Auth.

Supported v1 methods:

- Google OAuth.
- Email magic link / OTP link.

Disabled/deferred:

- Passwords.
- SMS.
- Passkeys.
- Anonymous sign-in.
- Additional social providers.

### Why Not Clerk/Auth0 Now

The `vercel:auth` guidance makes Clerk attractive for fastest Vercel-native setup and Auth0 attractive for enterprise SSO. For this repo, those benefits do not beat the current Supabase integration because:

- Supabase Auth already feeds RLS through `auth.uid()`.
- Project/workspace access policies already assume Supabase auth users.
- Collaboration invitations already use Supabase admin invite flows.
- Moving now would require identity mapping before product-market proof.

Future evaluation triggers:

- A paying corporate customer requires SAML/OIDC SSO features beyond Supabase Auth's available plan.
- Enterprise admin/audit requirements exceed Supabase's auth/admin APIs.
- Provider lock-in risk becomes higher than migration cost.

## Route Architecture

### Public Auth Routes

- `src/app/login/page.tsx`
  - Keep as route.
  - Refactor to a shared auth entry component.

- `src/app/signup/page.tsx`
  - New route.
  - Reuse the same shared auth entry component with `mode="signup"`.

- `src/app/auth/callback/route.ts`
  - Keep as code-exchange route.
  - Harden generic error redirects and event logging.

### Shared Components

Planned components:

- `src/components/auth/AuthEntryPanel.tsx`
  - Shared login/signup panel.
  - Owns display states, legal links, and action forms.

- `src/components/auth/AuthStateMessage.tsx`
  - Sent/error/rate-limit/expired copy.

- `src/components/auth/AuthLegalFooter.tsx`
  - Privacy, Terms, Cookie Notice, support links.

Reuse existing `Button`, `ControlInput`, and shared UI primitives. Do not create feature-local raw buttons.

### Server Actions

Keep actions server-owned:

- `signInWithEmail`
- `signInWithGoogle`
- `signOut`

Add wrapper functions only if they reduce repeated policy checks:

- `resolveAuthRedirect(requestOrigin, next)`
- `mapAuthErrorToUserMessage(error)`
- `recordAuthEvent(event)`
- `resolvePostAuthDestination(user, next)`

### Route Protection

`src/proxy.ts` should remain the protected-route gate for `/workshop`.

Planned changes:

- Add `/signup` as an auth route that authenticated users should not see.
- Preserve sanitized `next`.
- Keep `/api` skipped at the proxy layer, but API routes that touch user data must enforce auth internally.
- Avoid wildcard redirect destinations in production.

## Data Model Plan

### Existing Tables To Keep

- `profiles`
- `workspaces`
- `workspace_members`
- `projects`
- `estimates`
- `project_members`
- `estimate_sheet_members`
- `estimate_sheet_access_settings`
- `collaboration_invitations`

### Proposed Minimal Additions

These are planning targets for later migrations, not implementation in this planning pass.

#### `auth_events`

Purpose: metadata-only event trail for security, support, abuse review, and enterprise audit export.

Fields:

- `id uuid primary key`
- `workspace_id uuid null`
- `user_id uuid null`
- `email_hash text null`
- `event_type text`
- `provider text null`
- `ip_hash text null`
- `user_agent_hash text null`
- `result text`
- `metadata jsonb not null default '{}'`
- `created_at timestamptz not null default now()`

Rules:

- Do not store raw OTPs, magic links, access tokens, refresh tokens, or OAuth codes.
- Hash emails for pre-auth events.
- Keep raw email only where already required in `profiles` and pending invitations.
- Restrict direct browser writes.

#### `workspace_auth_policies`

Purpose: lean corporate readiness without SSO implementation.

Fields:

- `workspace_id uuid primary key`
- `public_signup_allowed boolean default true`
- `invite_required boolean default false`
- `allowed_email_domains text[] default '{}'`
- `google_allowed boolean default true`
- `email_link_allowed boolean default true`
- `mfa_required_for_managers boolean default false`
- `sso_required boolean default false`
- `updated_by uuid`
- `updated_at timestamptz`

Rules:

- v1 reads defaults only.
- Admin UI comes later.
- Policy should not block Philip/dev access in local test contexts unless explicitly configured.

#### `workspace_verified_domains`

Purpose: corporate domain claim and SSO discovery readiness.

Fields:

- `id uuid primary key`
- `workspace_id uuid not null`
- `domain text not null`
- `verification_status text`
- `verification_token_hash text`
- `verified_at timestamptz null`
- `created_by uuid`
- `created_at timestamptz`

Rules:

- Store token hash, not plaintext after generation.
- Require owner/admin role to create or verify.
- No autojoin until a policy explicitly enables it.

#### `user_account_closures`

Purpose: DSAR/delete workflow tracking.

Fields:

- `id uuid primary key`
- `user_id uuid not null`
- `requested_by uuid not null`
- `request_type text`
- `status text`
- `export_path text null`
- `completed_at timestamptz null`
- `created_at timestamptz`

Rules:

- Actual deletion must handle workspace ownership transfer or workspace deletion first.
- Do not run destructive account deletion from a browser-only path without confirmation and server validation.

## Profile And Workspace Bootstrap

Recommended lifecycle:

1. Supabase creates `auth.users`.
2. Database trigger creates/updates `profiles`.
3. App callback resolves user context.
4. App checks pending invitations.
5. App resolves or creates default workspace only after successful auth.
6. New self-serve owners complete `/workshop/onboarding`.
7. Invited users skip company setup if they only receive project/sheet access.

Keep workspace creation tied to authenticated user context and RLS. Do not make seed/demo data globally visible.

## Google OAuth Configuration

Production requirements:

- Google Cloud project created for Archestimator.
- OAuth consent screen branded as Archestimator.
- Privacy policy and terms URLs configured in Google.
- Minimum scopes:
  - `openid`
  - `email`
  - `profile`
- Avoid extra Google scopes unless a feature explicitly needs them.
- Supabase Google provider configured with client id and client secret.
- Authorized JavaScript origins include production, approved preview, and local dev origins.
- Authorized redirect URIs include the Supabase provider callback URL.
- App `redirectTo` points to `/auth/callback` and is allow-listed in Supabase.

## Email Magic Link Configuration

Production requirements:

- Custom sender domain.
- SPF, DKIM, and DMARC set.
- Supabase custom SMTP or approved transactional email provider.
- Branded magic-link and invite templates.
- Magic-link expiry and rate limits documented.
- Email copy avoids leaking whether an email is registered.
- Invite template includes project/account context but no sensitive project data.

## Environment Variables

Required for app runtime:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_APP_URL` or `NEXT_PUBLIC_SITE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` only for server-side admin invitation paths

Local-only:

- `ARCHESTIMATOR_DEV_AUTH_BYPASS`
- `ARCHESTIMATOR_DEV_AUTH_EMAIL`
- `ARCHESTIMATOR_DEV_AUTH_ADMIN_DB`

Provider-dashboard secrets:

- Google OAuth client secret.
- Transactional email SMTP credentials.

Rules:

- Never commit secrets.
- Never expose service-role keys to client components.
- Keep production and preview redirect allow lists separate.
- Treat Vercel preview deployment auth carefully because wildcard redirect URLs can weaken OAuth safety.

## Session And Cookie Policy

Current Supabase config uses:

- JWT expiry: `3600` seconds.
- Refresh token rotation enabled.
- Refresh token reuse interval: `10` seconds.

Planning requirements:

- Keep session cookies HTTP-only through Supabase SSR.
- Document essential auth cookies in Cookie Notice.
- Do not use non-essential analytics/marketing cookies until consent exists.
- For privileged account/security actions, require fresh auth or MFA when that phase is implemented.

## RLS And Authorization

Authentication answers "who is this user?" Authorization answers "what may this user access?"

Do not rely on UI hiding for authorization. Keep these as hard boundaries:

- RLS policies on workspace/project/estimate/library data.
- Server actions that validate current user and target ids.
- Collaboration role rank checks for project/sheet access.
- No browser service-role usage.
- No cross-workspace data reads.

## Implementation Boundaries

Code should be shaped into these boundaries during implementation:

- `src/lib/auth/provider.ts`
  - Provider-facing auth calls and redirect URLs.
- `src/lib/auth/policy.ts`
  - App auth policy, allowed methods, public signup, invite required.
- `src/lib/auth/events.ts`
  - Metadata-only auth event logging.
- `src/lib/auth/post-auth.ts`
  - Post-callback destination, profile/workspace/invite resolution.
- `src/components/auth/*`
  - Shared auth UI.

These modules are recommendations for the implementation plan. If existing file shape makes fewer files cleaner, preserve the local pattern while keeping the boundaries explicit.

## Rollout Strategy

1. Implement route/component hardening locally with tests.
2. Configure Google OAuth and email templates in local/staging.
3. Smoke test local auth callback with magic link and Google.
4. Verify invite acceptance on a staging/throwaway project.
5. Confirm production redirect allow list and sender domain.
6. Release behind a small public CTA change to `/signup`.
7. Monitor auth events and support inbox for link delivery, callback, and invitation errors.

## Migration Strategy

Add new tables in separate, focused migrations:

1. `auth_events`
2. `workspace_auth_policies`
3. `workspace_verified_domains`
4. `user_account_closures`

Each migration must include:

- RLS enabled from creation.
- Authenticated grants only where required.
- No direct browser writes for security/audit tables.
- Tests under `tests/vitest/*schema*.test.ts` or equivalent migration text tests.

## Compatibility Notes

- Existing users continue using their Supabase auth user ids.
- Existing `profiles` rows remain canonical for display name/avatar/role.
- Existing workspaces remain the account boundary.
- Existing project/sheet collaboration invitations remain valid.
- Current dev-auth bypass remains test-only and local-only.

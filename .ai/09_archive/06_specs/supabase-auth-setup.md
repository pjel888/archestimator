# Supabase Auth Setup — Archestimator

**Status:** Active as of 2026-05-18  
**Project:** `ebxxqidacheyapmmzavr`  
**CEO access email:** `philipjonlewis@gmail.com`

## Implemented in repo

- `/login` sends Supabase magic links.
- `/auth/callback` exchanges the auth code and redirects to the requested protected path.
- `src/proxy.ts` gates `/workshop/*` routes and refreshes Supabase cookies.
- `profiles` are bootstrapped from `auth.users` by database trigger.
- `philipjonlewis@gmail.com` is assigned `ceo` by `public.resolve_app_role_for_email()`.
- `public.is_platform_admin()` grants CEO/admin users platform-wide RLS access.
- Authenticated users get a default workspace on first app access.

## Required Supabase dashboard configuration

Before production/tester login, verify these Supabase Dashboard settings:

1. **Authentication > URL Configuration**
   - Site URL for local dev: `http://localhost:3000`
   - Add redirect URL: `http://localhost:3000/auth/callback`
   - Add redirect URL: `http://127.0.0.1:3000/auth/callback`
   - Add production/preview callback URLs once deployment domains exist.
2. **Authentication > Providers > Email**
   - Email provider enabled.
   - Magic link / OTP enabled.
   - Confirm email template points to `{{ .ConfirmationURL }}`.
3. **Database > Policies**
   - Confirm RLS remains enabled on all app tables.
   - Confirm `profiles` policies allow own-profile reads and CEO/admin platform access.

## Local CLI config

`supabase/config.toml` mirrors local redirect expectations for local Supabase runs. Hosted Supabase still needs Dashboard URL allow-list verification.

## Manual smoke test

1. Start app: `bun run dev`.
2. Open `/workshop/projects` while signed out.
3. Confirm redirect to `/login?next=/workshop/projects`.
4. Enter `philipjonlewis@gmail.com`.
5. Open the magic link email.
6. Confirm redirect back to `/workshop/projects`.
7. Confirm default workspace is created and project creation form is visible.
8. Create a project and confirm redirect to `/workshop/projects/{id}`.

## Security notes

- Never commit service role keys or secrets.
- Do not expose auth tokens in logs.
- CEO access must remain database/RLS-backed, not frontend-only.

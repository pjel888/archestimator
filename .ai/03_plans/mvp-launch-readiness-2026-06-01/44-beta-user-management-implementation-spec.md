# Beta User Management Implementation Spec

## Objective

Implement closed beta access management with Google Sign-In plus Supabase-backed email allowlist. This spec is implementation-grade but does not implement code in this planning pass.

## Final Table

`closed_beta_allowed_emails`

## Migration File

`supabase/migrations/20260602090000_closed_beta_allowed_emails.sql`

## Schema

```sql
create table public.closed_beta_allowed_emails (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  normalized_email text generated always as (lower(btrim(email))) stored,
  invited_by uuid null references auth.users(id) on delete set null,
  invited_at timestamptz not null default now(),
  accepted_at timestamptz null,
  status text not null default 'invited'
    check (status in ('invited', 'active', 'revoked')),
  notes text null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (normalized_email)
);
```

## RLS Policies

- `alter table public.closed_beta_allowed_emails enable row level security;`
- No broad `select`, `insert`, `update`, or `delete` policies for `anon` or `authenticated`.
- Admin/service role bypasses RLS for manual management.
- Add narrow security-definer function for checks.

## Helper Function Contract

Name: `public.check_closed_beta_access(raw_email text)`

Input: email from Supabase authenticated user.

Output:

- `allowed boolean`
- `status text`
- `normalized_email text`

Rules:

- Missing row: `allowed=false`, `status='missing'`.
- `invited`: `allowed=true`.
- `active`: `allowed=true`.
- `revoked`: `allowed=false`.
- DB error in application helper: fail closed for protected app routes.

## Server-Side Access Check Helper

Recommended TypeScript helper:

- `src/lib/auth/closed-beta-access.ts`
- Exports `getClosedBetaAccessForUser(user)` and `requireClosedBetaAccess(user)`.
- Reads `CLOSED_BETA_ACCESS_ENABLED`.
- Uses server-side Supabase access only.
- Does not expose the allowlist to the client.
- Normalizes lower/trim only.
- Returns structured result for callback/proxy/session callers.

## Integration Points

| File | Integration |
| --- | --- |
| `src/app/auth/callback/route.ts` | Check access after OAuth code exchange and before redirecting to `/workshop`. |
| `src/proxy.ts` | For `/workshop` and authenticated app routes, redirect unallowed users to beta access UX. |
| `src/lib/auth/session.ts` | Gate app context or expose a closed-beta-aware wrapper. |
| `src/app/login/page.tsx` | Show Google-only invited beta copy; hide/disable magic link unless explicitly retained as fallback. |
| `src/app/beta/access-required/page.tsx` | Add denied/pending UX. |
| `.env.example` | Document `CLOSED_BETA_ACCESS_ENABLED` and `NEXT_PUBLIC_CLOSED_BETA_MODE`. |

## Access Denied Route

Preferred route: `/beta/access-required`.

Optional revoked variant:

- `/beta/access-revoked`, or
- query/status state on `/beta/access-required`.

Keep the route public to avoid redirect loops.

## Admin Workflow

MVP admin UI is deferred. Philip manages rows manually in Supabase:

- Add: insert email with `status='invited'`.
- Activate: status can remain `invited` or be set `active` after first login.
- Revoke: set `status='revoked'`.
- Notes: record cohort, source, or support context.

## Edge Cases

- User signs in with a different Google account than the invited email: deny.
- Email capitalization differs: allow if normalized emails match.
- Plus-address differs: deny unless exact plus-address row exists.
- Missing email from provider: deny.
- OAuth callback success but allowlist RPC error: deny and log.
- Existing user becomes revoked: proxy/session blocks next protected route load.
- Public share recipient is not allowlisted: share route remains governed by share token rules, but app entry remains blocked.

## Tests

- `BETA-AUTH-001`: migration/RLS contract test or SQL review.
- `BETA-AUTH-002`: helper unit tests for allowed, invited, revoked, missing, DB error.
- `BETA-AUTH-003`: proxy/session route tests for workshop denial.
- `BETA-AUTH-004`: access-required page DOM test.
- `BETA-AUTH-005`: callback tests for allowed and denied users.
- `BETA-AUTH-006`: env/runbook doc test or static checklist.

## Rollback

- Runtime: set `CLOSED_BETA_ACCESS_ENABLED=false`.
- Code: revert deployment.
- Database: keep table data; do not drop allowlist in production rollback.
- Emergency: manually add Philip/admin emails before enabling.

## Tickets

- `BETA-AUTH-001` Add closed beta allowlist schema/RLS.
- `BETA-AUTH-002` Add server-side beta access check helper.
- `BETA-AUTH-003` Gate workshop access for non-whitelisted authenticated users.
- `BETA-AUTH-004` Add access denied / pending beta UX.
- `BETA-AUTH-005` Add tests for whitelist access states.
- `BETA-AUTH-006` Update `.env.example` and deployment runbook for closed beta mode.

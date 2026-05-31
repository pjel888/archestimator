# Security Notes

## Proxy/Auth Safety

- `src/proxy.ts` remains the active Next.js 16 proxy/middleware file. No `src/middleware.ts` was created.
- Protected `/workshop` routes still require server-side Supabase auth validation.
- `supabase.auth.getUser()` remains in `src/proxy.ts`.
- `getSession()` was not introduced.
- Public routes return `createRequestPathResponse(request)` before Supabase client creation, preserving the request-path header behavior.
- `/login` is not included in the public early-return list, so logged-in-user redirect behavior remains available.
- `/api` is still skipped by the existing matcher behavior.
- Dev auth bypass behavior remains before the public-route early return.

## Public Routes Early-Returned

- `/`
- `/about`
- `/features`
- `/pricing`
- `/contact`
- `/privacy`
- `/terms`
- `/invite`
- `/share`

Prefix handling also covers nested invite/share URLs such as `/invite/[token]` and `/share/[token]`.

## Verification

- `tests/vitest/auth-proxy.test.ts` now proves public routes do not call `createServerClient`.
- The same test file proves protected `/workshop` still calls Supabase and `/login` signed-in redirect behavior still calls Supabase.
- Auth Playwright smoke passed after updating stale copy assertions:

```text
protected workshop projects redirects signed-out users to login: passed
login page keeps compact shared-control UI visible: passed
```

## Limitations

- No production deployment, provider dashboard, OAuth provider setup, DNS, Vercel, or external service checks were run.
- No live Supabase production telemetry was inspected.

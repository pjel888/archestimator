# Security Notes

## Proxy/Auth Contract

The Slice 1 proxy/auth guardrails remain intact:

- `src/proxy.ts` remains the active Next.js 16 proxy file.
- `src/middleware.ts` was not created.
- Protected/auth route decisions still use `supabase.auth.getUser()`.
- `getSession()` was not introduced for server-side auth protection.
- `/workshop` remains protected.
- `/login` is not in the public early-return set.
- Public routes still return through `createRequestPathResponse(request)`, preserving `AUTH_REQUEST_PATH_HEADER`.

## Caching Boundary

This run kept caching request-local:

- `getCurrentWorkspaceProject()` uses React `cache()` for per-render dedupe.
- No `unstable_cache`, `cacheTag`, or `"use cache"` was added.
- No cross-request user/workspace data cache was introduced.

## Suspense/Fallback Boundary

New route fallbacks do not include project ids, user ids, emails, SQL, tokens, stack traces, or secret-bearing diagnostic content.

## Error Boundaries

The Slice 1 route error boundaries remain in place for library, charts, and estimate workspace routes. They expose only retry UI to users and keep sanitized development-only logging.

## Validation Notes

The signed-out protected redirect Playwright smoke passed in dev-server and production-like runs, proving `/workshop/projects` still redirects to `/login?next=%2Fworkshop%2Fprojects` with no stuck route overlay.

The authenticated route-transition evidence passed only in isolated local temp apps with `ARCHESTIMATOR_DEV_AUTH_BYPASS=1` and `ARCHESTIMATOR_DEV_AUTH_ADMIN_DB=1`. Those flags remain localhost-gated, development-only, and require `NODE_ENV !== "production"`; they were used for verification evidence, not as production auth behavior. The refreshed evidence separates hover-before-click requests from click-transition requests and does not prove hover Network prefetch in this environment.

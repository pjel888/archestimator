# 18 — Stack Contract and Production Standards

Consolidates the cross-cutting stack decisions for CSP enforcement.

## Next.js 16 (16.2.10)
- **Proxy pattern** (`src/proxy.ts` → `src/lib/auth/request-proxy.ts`): the nonce site.
  Next 16 renamed `middleware.ts` → `proxy.ts`; the official CSP guide uses `proxy`.
- **Dynamic rendering required** for nonced routes (official: "you must use dynamic
  rendering to add nonces"). `force-dynamic` not needed where the route already reads
  `headers()`/cookies (workshop, share, invite, auth). Marketing pages require explicit
  opt-in if enforced (DEC-11).
- **Auto-nonce of framework scripts** when `x-nonce` request header is present.
- **`next/script`** accepts a `nonce` prop; forwards to `<script nonce>`.
- **`@next/third-parties/google` `GoogleAnalytics`** accepts a `nonce` prop.
- **`'unsafe-eval'` dev-only** (React dev error stacks).
- Local doc: `node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md`
  (read in full; the authoritative source for the nonce pattern).

## React 19 (19.2.7)
- Async Server Components: root layout becomes `async` to `await headers()`.
- No client-component changes required (nonce flows via props from server).

## OpenNext (`@opennextjs/cloudflare ^1.20.1`) on Cloudflare Workers
- Proxy compiles into the OpenNext worker; runs per request (auth gating proves it).
- Per-request nonce survives the Worker request lifecycle.
- `wrangler.jsonc`: no `headers[]` block → no interference.
- `open-next.config.ts`: no overrides → no interference.
- `worker.ts:93`: outermost response wrapper (fallback injection point only).
- Build: `next build` → OpenNext (`cf:build`).

## Cloudflare Workers runtime
- `crypto.randomUUID()` is a global (CSPRNG-backed).
- `Buffer` available via `nodejs_compat` (wrangler flag set).
- Workers Observability for logs/violation telemetry.
- Per-isolate state caveat for rate-limiting (RISK-15; acceptable for first-users).

## TypeScript
- New `src/lib/csp/*` modules fully typed; `CspRouteClass` union type.
- No `any`; no unsafe casts.
- `cloudflare-env.d.ts` unchanged (no binding changes).

## Tailwind v4 / CSS
- No change. `style-src 'self' 'unsafe-inline'` covers the 4 inline `<style>` sites.
- Static CSS output unaffected.

## Better Auth
- Unchanged. CSP does not touch sessions, OAuth, cookies.

## D1 / R2 / DO / Queue / Email
- Unchanged (`07` §7.1). No migration, no binding change.

## Testing
- `vitest` (`test:dom`, serial) for unit/proxy/DOM/route tests.
- Playwright (`test:e2e`) for enforcement browser proof.
- New `test:csp` script (DEC-10).
- `validate` = the full gate.

## Security posture (target, enforced routes)
```
default-src 'self';
base-uri 'self';
frame-ancestors 'none';
object-src 'none';
form-action 'self';
script-src 'self' 'nonce-{nonce}' 'strict-dynamic' <route-class-allowlist>;
style-src 'self' 'unsafe-inline';
img-src 'self' data: blob: <route-class-img-hosts>;
font-src 'self' data:;
connect-src 'self' wss: <route-class-connect-hosts>;
worker-src 'self';
upgrade-insecure-requests;
report-to csp-endpoint;
```
(Plus `Reporting-Endpoints` header; `Content-Security-Policy-Report-Only` during P1/P2.)

## Production standards checklist
- [x] Single CSP header per route (SEC-09).
- [x] Nonce per request, unguessable (SEC-01).
- [x] No `'unsafe-inline'` on enforced script-src (SEC-03).
- [x] `'unsafe-eval'` dev-only (SEC-04).
- [x] `style-src 'unsafe-inline'` documented (DEC-08).
- [x] Violation reporting (SEC-08).
- [x] Per-phase rollback (OPS-01).
- [x] Browser proof per enforcement phase (TEST-03).
- [x] TTFB gate for marketing (PERF-01, DEC-11).
- [x] No data-plane change (`07`).
- [ ] Trusted Types — deferred (DEC-09).

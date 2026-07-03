# 10 - Blast Radius And Dependencies

## Primary File Areas

| Area | Paths |
|---|---|
| Better Auth config/actions/session | `src/lib/auth/`, `src/app/api/auth/[...all]/route.ts`, `src/components/auth/` |
| Proxy/protected routes | `src/middleware.ts`, `src/lib/auth/request-proxy.ts`, `src/app/workshop/` |
| Invite/collaboration | `src/app/invite/[token]/`, `src/lib/collaboration/` |
| Publication/share | `src/app/share/[token]/`, `src/app/api/share/[token]/`, `src/lib/publication/`, `src/lib/share/` |
| Legal/terms | `src/lib/legal/`, `src/app/workshop/terms/` |
| Provider/runtime | `wrangler.jsonc`, `worker.ts`, `package.json`, `.env.example` |
| Tests | `tests/vitest/auth-*`, `tests/vitest/*invite*`, `tests/vitest/*share*`, `tests/vitest/*publication*`, `e2e/auth*.spec.ts`, `e2e/*invite*`, `e2e/*share*` |

## Dependencies

| Dependency | Risk |
|---|---|
| Better Auth | Version-sensitive provider prompt/session/cookie/CSRF behavior; check docs and installed types before coding. |
| Next.js 16 | Middleware is Proxy in docs; auth route handlers are dynamic by default but explicit no-store remains useful. |
| Cloudflare Workers/OpenNext | Runtime state and Node compatibility differ from local Node dev. |
| D1 | No Postgres RLS; app-layer authz must be complete. |
| Durable Objects | Useful for singleton state but not a shortcut for persistence unless storage is used. |
| R2/assets | Signed URL and object metadata must stay tenant scoped. |
| Google OAuth | Prompt, consent, account picker, and revocation semantics are provider-specific. |
| Legacy Supabase/Vercel/Resend references | Can mislead agents or keep obsolete secrets/routes/tests alive. |

## Blast Radius By Phase

| Phase | Blast radius | Risk control |
|---|---|---|
| 1 | Auth config/actions/cookies/copy/tests | Small, targeted tests first |
| 2 | Publication security/rate-limit storage | Security-critical; test lockout across simulated isolate reset |
| 3 | Shared authz helpers, repositories, server actions | Broad; use matrix and caller/import checks before editing |
| 4 | Share/invite/privacy/logging | Medium; avoid changing product flows without tests |
| 5 | Docs/tests/provider cleanup | Medium; classify artifacts before deletion |

## Cross-Pack Coordination

Sibling Cloudflare migration pack owns:
- Production cutover and provider-exit runbooks.
- Provider account deletion/export/retention operations.
- Hosted non-owner Google proof and mailbox proof if still open.

This pack owns:
- Auth system hardening plan.
- Provider-leftover classification for auth-specific code/docs/tests.
- Phase-level implementation and validation gates.

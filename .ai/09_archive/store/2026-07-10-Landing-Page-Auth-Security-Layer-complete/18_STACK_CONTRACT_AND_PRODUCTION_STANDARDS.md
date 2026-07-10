# 18 — Stack Contract and Production Standards

Cross-cutting production decisions for the auth security layer.

## Stack baseline (verified from source)

| Layer | Version/source | Status |
|---|---|---|
| Next.js | 16 (`node_modules/next`) | Active; read `node_modules/next/dist/docs/` for framework-sensitive work |
| React | 19 | Active |
| Runtime | Bun | Active |
| TypeScript | per `package.json` | Active |
| Tailwind | v4 | Active (not touched by this plan) |
| Deploy | OpenNext on Cloudflare Workers (`archestimator-proof`) | Active |
| D1 | `ARCH_DB` (`archestimator-proof-db`) | Active — auth + app data |
| R2 | `ARCH_UPLOADS_R2` | Active — uploads (not touched) |
| Durable Object | `COLLAB_ROOMS` | Active — collab (not touched) |
| Queue | `UPLOAD_JOBS_QUEUE` | Active — uploads (not touched) |
| Email | Cloudflare `EMAIL` binding (`send_email`) | Active — magic-link delivery |
| Auth | Better Auth **1.6.23** (not 1.6.22) | Active — Google + magic link |
| State | TanStack Query + Zustand | Active (not touched) |

## Auth production standards (decisions)

| Standard | Decision | Rationale |
|---|---|---|
| Auth methods | Google OAuth + magic link only | Owner intent; password disabled |
| Session store | D1, cookie-cache disabled | Security over latency; always validate live |
| Session cookie | httpOnly + secure(prod) + sameSite=lax + host-only + 7d | Better Auth defaults; correct |
| Magic-link token | Hashed at rest (`storeToken:"hashed"`) [post-SEC-1] | Match other credentials |
| Magic-link expiry | ≤300s (explicit post-SEC-5) | Minimize exposure window |
| Rate limiting | Explicit BA config OR WAF fallback [SEC-5] | Abuse resistance |
| Trusted origins | Dynamic per-request (baseURL + Host + env) | Correct |
| `BETTER_AUTH_SECRET` | ≥32 chars enforced | Required |
| Closed beta | D1 allowlist, enforced in session resolution | Owner-curated |
| Dev bypass | Triple-gated (non-prod+localhost+secret) | Safe |
| CSRF (Server Actions) | Next.js 16 origin check | Default |
| CSRF (public POST) | `assertSameOriginPublicPost` + double-submit | Explicit |
| Per-resource authz | `canAccess*`/`canEdit*` D1 probes | IDOR/escalation defense |
| SQL | Parameterized throughout (`?` + `.bind()`) | Injection-safe |
| CSP | Enforced on `/share/*`; Report-Only elsewhere → enforced post-SEC-6 | XSS defense |
| Security headers | nosniff, DENY frame, no-referrer, HSTS (global) | Baseline |

## Next.js/React boundaries (for this plan)

- **No new `"use client"` boundaries** — auth flows are Server Actions + Server Components.
- **Middleware** (`src/middleware.ts`) is the gate; changes to its matcher/config
  require re-reading `node_modules/next/dist/docs/` middleware docs (Next 16).
- **Server Actions** are directly-reachable POST endpoints — every one enforces
  auth (already true; SEC-4 closes the one gap).
- **No client-side session reading** — no Better Auth client; no `useSession`.

## Cloudflare/D1 boundaries (for this plan)

- All work stays inside `wrangler.jsonc`-bound resources.
- No new bindings, no provider changes, no migrations to app-data tables.
- SEC-7 is a documentation/gate decision (not a destructive migration).
- Phase 1 hosted proof requires D1 readback on `ARCH_DB` (authorized).
- D1 read cost (cookie-cache disabled + phase 2 probes) monitored but accepted for security.

## Data integrity

- No schema migration required for SEC-1 (hashing is forward-only; old plaintext
  rows expire in 5 min and are consumed/deleted).
- SEC-7 does NOT commit BA DDL (drift risk) — documented contract instead.
- No backfill needed.

# Evidence — Feature Flag / Env Var Inventory

Env reads enumerated via `rg "process\.env\.[A-Z_]+"` across `src scripts next.config.*`. Secret VALUES never recorded — names only. AI flags use `process.env[name]` bracket access (greppable string constants).

| Flag / Env Var | Read Locations | Default | Feature | Route/API Impact | MVP Decision | Cleanup Decision |
|---|---|---|---|---|---|---|
| `ARCHESTIMATOR_AI_ENABLED` | `lib/ai/feature-flags.ts`; AI route handlers | false | AI API routes | `/api/ai/*` → 404 when off | keep-deferred | KEEP (owner gate CLEAN-F25) |
| `NEXT_PUBLIC_ASK_FLIP_UI_ENABLED` | `lib/ai/feature-flags.ts`; `WorkshopPageShell` | false | Ask-Flip UI | client UI hidden | keep-deferred | KEEP (CLEAN-F25) |
| `CLOSED_BETA_ACCESS_ENABLED` | `lib/auth/closed-beta-access.ts`, `proxy.ts`, `auth/callback`, `session.ts` | false | Allowlist gate | auth/proxy/callback | keep | KEEP (launch gate) |
| `PROJECT_INVITE_ENTRY_ENABLED` | `lib/collaboration/invite-entry.ts`; invite routes | false | Invite flow | `/invite/[token]/*` fail-closed | keep-deferred | KEEP |
| `ARCHESTIMATOR_INVITE_TOKEN_PEPPER` | invite-entry / realtime-identity-server / pending-invite | (req when invite on) | Invite token HMAC | invite security | keep-deferred | KEEP (secret) |
| `ARCHESTIMATOR_EMAIL_DELIVERY_ENABLED` | `lib/email/resend-client.ts` | false | Email delivery | share/invite email fail-closed | keep-deferred | KEEP |
| `RESEND_API_KEY` / `RESEND_FROM` / `RESEND_REPLY_TO` / `RESEND_WEBHOOK_SECRET` | email/publication/webhook | (none) | Resend provider | email + webhook | keep | KEEP (secrets) |
| `NEXT_PUBLIC_TEAMSPACE_CURSOR_BROADCAST` | `collaboration/feature-flags.ts` | **true** (kill-switch) | Sheet cursors (shipped) | realtime cursor sends | keep | KEEP |
| `NEXT_PUBLIC_TEAMSPACE_PROJECT_CURSORS` | `collaboration/feature-flags.ts`; `ProjectCursorLayer` | false | Project page cursors (T5.3) | client cursor fan-out | keep-deferred | KEEP (capacity-gated, owner) CLEAN-F26 |
| `NEXT_PUBLIC_TEAMSPACE_FOLLOW_MODE` | `collaboration/feature-flags.ts` (`isFollowModeEnabled`) | false | Follow mode (T5.4, D-6) | client follow UI | keep-deferred OR MVP-cut | OWNER_GATE — `isFollowModeEnabled`+`readTeamspaceFeatureFlags` currently have **0 callers** (CLEAN-F07/F26) |
| `DEEPSEEK_API_KEY` | `lib/ai/deepseek.ts`, `package-builder/provider.ts` | (none) | DeepSeek LLM | only when AI on | keep-deferred | KEEP; **not in `.env.example` — add with AI-deferred note** |
| `DEEPSEEK_MODEL` | same | `deepseek-v4-flash` | model override | only when AI on | keep-deferred | KEEP; add to `.env.example` |
| `AI_PACKAGE_BUILDER_DRAFT_SIGNING_SECRET` | `package-builder/draft-token.ts` | dev stub | AI draft token signing | only when AI on | keep-deferred | KEEP |
| `NEXT_PUBLIC_SUPABASE_URL` / `_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` | pervasive | (req) | Supabase | everything | keep | KEEP |
| `PUBLICATION_TOKEN_ENCRYPTION_SECRET` (+`ARCHESTIMATOR_*` alias) | `publication/security.ts` | dev fallback; throws in prod | Share encryption | `/share` | keep | KEEP (security) |
| `PUBLICATION_TOKEN_HASH_SECRET` / `PUBLICATION_ACCESS_COOKIE_SECRET` (+aliases) | `publication/security.ts` | dev fallback; throws in prod | Share token/cookie | `/share` | keep | KEEP (security) |
| `ARCHESTIMATOR_TELEMETRY_HASH_PEPPER` | `publication/public-repository.ts` | falls back to hash secret | telemetry pepper | share views | keep | KEEP |
| `NEXT_PUBLIC_APP_URL` / `NEXT_PUBLIC_SITE_URL` / `ARCHESTIMATOR_ALLOWED_APP_ORIGINS` / `VERCEL_PROJECT_PRODUCTION_URL` | `auth/redirects.ts`, `email-links.ts` | (req in prod) | origin allow-list | auth/email | keep | KEEP |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` / `NEXT_PUBLIC_CLARITY_PROJECT_ID` | `LandingAnalyticsLoader` | (none→skip) | landing analytics | landing only | keep | KEEP (optional) |
| `ARCHESTIMATOR_E2E_ROUTE_ERROR_SMOKE` + `ARCHESTIMATOR_E2E_*` | route-error-smoke / e2e specs | 0 | E2E gates | dormant | keep | KEEP |
| `PERF_TRACE` / `NEXT_PUBLIC_PERF_TRACE` | `perf/server-timing.ts`, `WebVitalsProbe` | 0 | perf headers/probe | dormant | keep | KEEP |
| `ANALYZE` | `next.config.ts` | false | bundle analyzer | build-time | keep | KEEP |
| `NODE_ENV` | many | runtime | env discriminator | security decisions | keep | KEEP |
| `ARCHESTIMATOR_DEV_AUTH_BYPASS` / `_ADMIN_DB` / `_BYPASS_SECRET` / `_EMAIL` | `auth/dev-auth*.ts` | 0 / none | dev auth bypass | non-prod only | keep | KEEP (dev escape hatch) |
| `DATABASE_URL` | scripts only | (none) | local psql/prove | scripts | keep | KEEP |
| `RUN_SUPABASE_INTEGRATION` | **not found in `src/`** — only `.env.example` | 0 | integration test gate | none in app | declared-not-read-in-app | verify test config before removing from `.env.example` |

## Key flag findings

- **No flag is permanently-true-and-removable** except possibly hardcoding `NEXT_PUBLIC_TEAMSPACE_CURSOR_BROADCAST` (kill-switch default true for shipped feature) — but kill-switches are intentionally retained.
- **Follow-mode dead-reach** (CLEAN-F07): `isFollowModeEnabled()` + `readTeamspaceFeatureFlags()` have 0 callers, so `NEXT_PUBLIC_TEAMSPACE_FOLLOW_MODE` is read by nothing reachable. This is a deferred-feature decision (cut vs keep-staged), not a clean safe-delete.
- **`.env.example` gap**: `DEEPSEEK_API_KEY`/`DEEPSEEK_MODEL` are read in code but absent from `.env.example` (CLEAN-F25 sub-item).
- **Dynamic-access caution**: AI flags read via `process.env[name]` — confirm `NEXT_PUBLIC_ASK_FLIP_UI_ENABLED` is inlined at build (bracket access can defeat Next's `NEXT_PUBLIC_` static replacement).

# Auth Provider & Vercel Environment Readiness

**Last updated:** 2026-06-18 (code-sync pass — code references reconciled; external provider/dashboard/Vercel facts unchanged and still open)
**Status:** Active audit — external provider/dashboard proof still open.
**Scope:** Authentication provider configuration (Google OAuth, Supabase Auth, Resend SMTP), Vercel deployment environment readiness, and environment variable audit.

> **Code-sync note (2026-06-18):** This pass only reconciled in-repo code references against the actual codebase (see corrected file paths/defaults below) and added a pointer to the now-existing launch-readiness check scripts. It did **not** and **cannot** change any external/provider/Vercel/DNS status — every "Verified in Staging/Production", dashboard, and `LEFT TO DO` item below remains open because those are hosted/manual facts that code cannot prove.

---

## Section A — Authentication Provider Readiness

Archestimator uses Supabase Auth with Google OAuth as the primary sign-in method and email sign-in link as the fallback. Transactional emails (invites, magic links) are sent via Resend.

Most auth code paths are implemented in the application layer (`src/lib/auth/`, `src/proxy.ts`, `src/app/auth/`, `src/app/invite/`), but provider-side dashboard configuration and production evidence are incomplete.

| Item | Implemented in Code | Verified Locally | Verified in Staging | Verified in Production Provider Dashboard | Owner Accepted Risk |
|---|---|---|---|---|---|
| Google OAuth consent screen configuration | N/A (provider dashboard) | Partial — OAuth flow works with testing credentials | No | No — unverified app warning, 100-user cap | No |
| Authorized domains (Google Cloud Console) | N/A (provider dashboard) | Partial — localhost authorized | No | No | No |
| Redirect URIs (Google Cloud Console) | N/A (provider dashboard) | Yes — `http://localhost:3000/auth/callback` works | No | No | No |
| Redirect URIs (Supabase Auth dashboard) | N/A (provider dashboard) | Yes — Supabase callback URL configured | No | No | No |
| Supabase Site URL configuration | N/A (provider dashboard) | Yes — localhost:3000 set | No | No | No |
| Supabase redirect allow-list | `src/lib/auth/redirects.ts` — `getAllowedAppOrigins` (env-driven: `NEXT_PUBLIC_APP_URL` / `NEXT_PUBLIC_SITE_URL` / `VERCEL_PROJECT_PRODUCTION_URL` / `ARCHESTIMATOR_ALLOWED_APP_ORIGINS`); `src/proxy.ts` only sanitizes the `next` path via `sanitizeNextPath` _(code-sync 2026-06-18: there is no `ALLOWED_REDIRECT_HOSTS` constant in code — corrected reference)_ | Yes — localhost allowed | No | No | No |
| Email sign-in link behavior | Supabase Auth + Resend | Yes — magic links deliver to dev email | No | No | No |
| SMTP/templates | Supabase Auth dashboard + `src/lib/email/resend-client.ts` | Partial — local/shared-link email code and webhook handling exist; collaboration invite, magic-link provider templates, hosted invite template, and confirmation settings are unverified | No | No | No |
| OTP expiry settings | N/A (Supabase dashboard) | Unknown — default Supabase settings assumed | No | No | No |
| Resend cooldown configuration | N/A (Resend dashboard) | Unknown — default Resend limits assumed | No | No | No |
| Signup policy (allow/block) | N/A (Supabase dashboard) | Unknown — default Supabase setting assumed | No | No | No |
| Anonymous sign-ins disabled | N/A (Supabase dashboard) | Unknown — default Supabase setting assumed | No | No | No |
| Phone auth disabled | N/A (Supabase dashboard) | Unknown — no phone auth code exists | No | No | No |
| Passkeys disabled | N/A (Supabase dashboard) | Unknown — no passkey code exists | No | No | No |
| SAML disabled | N/A (Supabase dashboard) | Unknown — no SAML code exists | No | No | No |
| CAPTCHA decision status | DECIDED / CLOUDFLARE TURNSTILE | Not applicable | Not applicable | Not applicable | **DECIDED / CLOUDFLARE TURNSTILE** — Cloudflare Turnstile selected as CAPTCHA provider. BETA P1. See 29-enterprise-mvp-scope-and-owner-defaults.md. |
| Provider outage behavior plan | Not applicable | Not applicable | Not applicable | Not applicable | **ACCEPTED RISK (implicit)** — no documented fallback; Supabase Auth and Google OAuth outages are unmitigated |
| Wrong-account invite recovery flow | `src/app/invite/[token]/` — shows mismatch when signed-in identity differs from invite target | Yes — tested with wrong Google account | No | No | No |
| Expired invite recovery flow | Expiry set in `src/lib/collaboration/actions.ts` (`INVITE_EXPIRATION_DAYS = 14`, `expires_at`); resolved/displayed `expired` state via `resolve_collaboration_invitation` RPC in `src/app/invite/[token]/page.tsx` _(code-sync 2026-06-18: added recovery-flow location)_ | Unknown — expiry path not explicitly tested | No | No | No |
| Login redirect-away behavior | Sanitizer in `src/lib/auth/redirects.ts` (`sanitizeNextPath` — multi-pass decode + open-redirect/nested-`next` guards), consumed by `src/app/auth/callback/route.ts` _(code-sync 2026-06-18)_ | Yes — rejects non-allowlisted hosts | No | No | No |
| Logout/session expiry behavior | Supabase Auth default + `src/proxy.ts` redirect to /login | Yes — session expiry redirects to login | No | No | No |
| Account deletion/deactivation policy | DECIDED / MANUAL DSAR FOR BETA | Not applicable | Not applicable | Not applicable | **DECIDED / MANUAL DSAR FOR BETA** — Manual DSAR/export/delete process sufficient for beta. Self-serve UI required for public launch. See 29-enterprise-mvp-scope-and-owner-defaults.md. |

### Key findings

- **Google OAuth is in testing mode.** The Google Cloud Console app is not verified. This means new users will see an "unverified app" warning during signup and the app is capped at 100 active users. Google verification must be submitted before any public or private beta launch.
- **CAPTCHA is the highest-priority owner decision** in the auth track. Without CAPTCHA on magic link and auth callback routes, automated abuse is possible. The decision is whether to implement CAPTCHA now or accept the risk for beta.
- **Supabase Auth dashboard settings are unverified.** RLS deny tests confirm code-level isolation, but no redacted dashboard screenshots exist to confirm that anonymous sign-ins, phone auth, passkeys, and SAML are disabled at the provider level.
- **Email deliverability is incomplete.** Resend domain verification (SPF/DKIM/DMARC), Resend dashboard/webhook delivery proof, and Supabase Auth email/provider verification have not been proven. Without them, shared-link recipient emails, collaboration invites, and magic links risk spam folder delivery, rejection, or complete non-delivery.
- **No staging environment exists.** Every item marked "Verified in Staging" is No because a dedicated staging Supabase project and Vercel preview environment have not been created. This blocks staging-level evidence for all auth flows.

---

## Section B — Vercel & Deployment Readiness

Archestimator targets Vercel for hosting (Next.js 16, Bun runtime). No Vercel project has been created. Deployment infrastructure, environment isolation, and operational procedures are not yet defined.

> **Evidence standard:** Environment presence alone is not evidence. Evidence means redacted screenshots/checklists, deployment logs, owner approvals, or reproducible validation notes.

| Item | Status | Evidence Required | Owner | Target Phase |
|---|---|---|---|---|
| Production URL configured | `LEFT TO DO` | Domain registered, DNS configured, Vercel project linked | OWNER_NAME_PLACEHOLDER | Beta |
| Staging URL configured | `LEFT TO DO` | Separate Vercel project or preview branch, staging subdomain | OWNER_NAME_PLACEHOLDER | Beta |
| Preview URL policy | `LEFT TO DO` | Documented policy: which branches get preview deploys, whether previews are public or protected | OWNER_NAME_PLACEHOLDER | Beta |
| Preview deployment protection (Vercel auth) | `LEFT TO DO` | Vercel Authentication configured on preview deployments | OWNER_NAME_PLACEHOLDER | Beta |
| Environment variable inventory (all env vars documented) | `PARTIAL` | Complete per-environment env var map (see Section C) — local is known, staging/production values missing | OWNER_NAME_PLACEHOLDER | Beta |
| Secret rotation procedure | `LEFT TO DO` | Documented procedure for rotating SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY, DEEPSEEK_API_KEY, and publication secrets without downtime | OWNER_NAME_PLACEHOLDER | Production |
| Build command verified | `IMPLEMENTED / NEEDS EVIDENCE` | `bun run build` succeeds in CI; must be verified on Vercel's Bun runtime | OWNER_NAME_PLACEHOLDER | Beta |
| Runtime compatibility (Next.js 16 on Vercel) | `UNKNOWN` | Next.js 16.2.6 on Vercel with Bun runtime must be confirmed — Vercel's Bun support is newer and less battle-tested than Node.js | OWNER_NAME_PLACEHOLDER | Beta |
| Edge/runtime assumptions | `PARTIAL` | `src/proxy.ts` (middleware) runs at the Edge; server actions and API routes use Node.js runtime — this split must be confirmed compatible with Vercel's Bun offering | OWNER_NAME_PLACEHOLDER | Beta |
| Branch/deploy policy | `LEFT TO DO` | Documented policy: which branches deploy where, whether `main` auto-deploys to production | OWNER_NAME_PLACEHOLDER | Beta |
| Rollback procedure documented | `LEFT TO DO` | Step-by-step Vercel rollback procedure, including database migration rollback plan if needed | OWNER_NAME_PLACEHOLDER | Beta |
| Deployment approval rule (no deploy without Philip) | `DECIDED / PHILIP ONLY` | Vercel deployment protection or GitHub branch protection rules to enforce Philip-approval gate | OWNER_NAME_PLACEHOLDER | Beta |
| Domain/DNS readiness | `LEFT TO DO` | Domain purchased, DNS records configured (A/AAAA/CNAME for Vercel, MX/SPF/DKIM/DMARC for Resend) | OWNER_NAME_PLACEHOLDER | Beta |
| HTTPS/certificate readiness | `LEFT TO DO` | Vercel auto-provisions SSL; must verify after domain linking | OWNER_NAME_PLACEHOLDER | Beta |
| Cache/header behavior | `PARTIAL` | Cache-Control headers on static assets and API routes; CDN cache policy for public vs authenticated pages | OWNER_NAME_PLACEHOLDER | Beta |
| CSP/report-only vs strict CSP plan | `PARTIAL` | Current: Report-Only on public pages, enforced on /share/*, none on /workshop/*. Plan: strict CSP on workshop blocked by `unsafe-inline`/`unsafe-eval` dependencies (react-complex-tree, @firecms/neat) | OWNER_NAME_PLACEHOLDER | Production |
| Release tagging/versioning | `LEFT TO DO` | Git tag strategy, changelog generation, version number scheme | OWNER_NAME_PLACEHOLDER | Beta |
| Resend domain verification (SPF/DKIM/DMARC) | `LEFT TO DO` | DNS TXT records for SPF, DKIM CNAME records, DMARC policy published | OWNER_NAME_PLACEHOLDER | Beta |

### Key findings

- **No Vercel project exists.** The entire deployment pipeline is `LEFT TO DO`. Every item in this section except build verification and CSP is a known gap.
- **Bun-on-Vercel is unverified.** While Vercel supports Bun, Next.js 16 on Bun on Vercel has limited real-world deployment history. A smoke-test deploy should be the first action.
- **Edge/middleware split must be validated.** `src/proxy.ts` uses Next.js middleware (Edge runtime). Server actions use Node.js (or Bun). Vercel's Bun offering must support this split.
- **Resend domain verification is a launch blocker for email-dependent features.** Invites and magic links will fail or land in spam without SPF/DKIM/DMARC.

---

## Section C — Environment Variables

All variables referenced in code or configuration, grouped by category. Values are never shown. "Local" means the variable exists in `.env.local` and is used during local development. "Staging" and "Production" indicate whether environment-specific values have been provisioned.

### Supabase

| Variable | Purpose | Local | Staging | Production |
|---|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (client-side, public) | Present | Missing | Missing |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/publishable key (client-side, public) | Present | Missing | Missing |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Duplicate/alias of anon key (present in .env.local only) | Present | Missing | Missing |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service-role key (server-side, bypasses RLS) | Present | Missing | Missing |
| `DATABASE_URL` | Direct Postgres connection string for CLI/migrations | Present | Missing | Missing |

### Auth (development bypass)

| Variable | Purpose | Local | Staging | Production |
|---|---|---|---|---|
| `ARCHESTIMATOR_DEV_AUTH_BYPASS` | Skips UI login gate in non-production on localhost | Present (0) | Not applicable | Not applicable |
| `ARCHESTIMATOR_DEV_AUTH_ADMIN_DB` | Uses service-role key for server-side DB calls (local-only escape hatch) | Absent (defaults off) | Not applicable | Not applicable |
| `ARCHESTIMATOR_DEV_AUTH_EMAIL` | Email used for dev auth bypass identity | Present | Not applicable | Not applicable |

### Email (Resend)

| Variable | Purpose | Local | Staging | Production |
|---|---|---|---|---|
| `RESEND_API_KEY` | Resend API key for transactional email delivery | Present | Missing | Missing |
| `RESEND_FROM` | Sender address; **no default** — empty when unset. `readEmailDeliveryConfig` (`src/lib/email/resend-client.ts`) treats delivery as unconfigured unless `ARCHESTIMATOR_EMAIL_DELIVERY_ENABLED` + `RESEND_API_KEY` + `RESEND_FROM` are all set. `.env.example` ships `RESEND_FROM=` blank. _(code-sync 2026-06-18: corrected — there is no `Archestimator <…>` default in code)_ | Absent (empty → unconfigured) | Missing | Must be verified domain |
| `RESEND_REPLY_TO` | Reply-to address for transactional email (in `.env.example` as `support@archestimator.com`; part of email-delivery readiness) _(code-sync 2026-06-18: added — referenced by `scripts/check-vercel-env-readiness.ts` + readiness checks)_ | Present (`.env.example` default) | Missing | Must be configured |
| `RESEND_WEBHOOK_SECRET` | svix signing secret for the Resend delivery webhook (`/api/webhooks/resend` returns 503 until set; `src/lib/email/resend-webhooks.ts`) _(code-sync 2026-06-18: added)_ | Absent (`.env.example` blank → webhook disabled) | **Required** for delivery-status webhooks | **Required** for delivery-status webhooks |

### AI (DeepSeek)

| Variable | Purpose | Local | Staging | Production |
|---|---|---|---|---|
| `DEEPSEEK_API_KEY` | DeepSeek API key for Ask Flip and Package Builder | Present | Missing | Missing |
| `DEEPSEEK_MODEL` | Optional model override; defaults to `deepseek-v4-flash` (`DEFAULT_DEEPSEEK_MODEL` in `src/lib/ai/deepseek.ts`) _(code-sync 2026-06-18: corrected from `deepseek-chat`)_ | Absent (uses default) | Missing | Missing |

### AI — Package Builder

| Variable | Purpose | Local | Staging | Production |
|---|---|---|---|---|
| `AI_PACKAGE_BUILDER_DRAFT_SIGNING_SECRET` | Secret for signing draft tokens (falls back to static value in non-production) | Absent (uses dev fallback) | **Required** | **Required** |

### Publication (shared links)

| Variable | Purpose | Local | Staging | Production |
|---|---|---|---|---|
| `PUBLICATION_TOKEN_ENCRYPTION_SECRET` | Encrypts shared link tokens (primary name) | Absent (not enforced in dev) | **Required** | **Required** |
| `ARCHESTIMATOR_PUBLICATION_TOKEN_SECRET` | Encrypts shared link tokens (fallback name) | Absent | **Required** | **Required** |
| `PUBLICATION_TOKEN_HASH_SECRET` | Hashes shared link tokens for DB lookup (primary name) | Absent (not enforced in dev) | **Required** | **Required** |
| `ARCHESTIMATOR_PUBLICATION_TOKEN_HASH_SECRET` | Hashes shared link tokens (fallback name) | Absent | **Required** | **Required** |
| `PUBLICATION_ACCESS_COOKIE_SECRET` | Signs password-gate cookies (primary name) | Absent (not enforced in dev) | **Required** | **Required** |
| `ARCHESTIMATOR_PUBLICATION_ACCESS_COOKIE_SECRET` | Signs password-gate cookies (fallback name) | Absent | **Required** | **Required** |

Note: The publication secrets have dual naming (`PUBLICATION_*` and `ARCHESTIMATOR_PUBLICATION_*`). Code checks the primary name first, then the fallback. In production, `src/lib/publication/security.ts` will throw if neither is set.

### Collaboration Invites

| Variable | Purpose | Local | Staging | Production |
|---|---|---|---|---|
| `PROJECT_INVITE_ENTRY_ENABLED` | Enables custom `/invite/[token]` entry/acceptance path | Missing or not verified | **Required** | **Required** |
| `ARCHESTIMATOR_INVITE_TOKEN_PEPPER` | Pepper/hash secret for app-owned invite token lookup/lifecycle | Missing or not verified | **Required** | **Required** |

> **⚠️ CRITICAL:** Collaboration invites and shared-link email are still **not beta-ready** because external proof is missing. Local app code now has fail-closed invite handling, POST-only acceptance, pending-invite visibility, shared-link recipient sessions, and Resend webhook handling, but the target environment still needs `PROJECT_INVITE_ENTRY_ENABLED`, `ARCHESTIMATOR_INVITE_TOKEN_PEPPER`, Supabase Auth email/SMTP/provider dashboard proof, hosted invite template/confirmation proof, Resend API/webhook proof, and real recipient inbox/browser smoke. This is distinct from local route-handler proof. See `.ai/03_plans/share-and-collaboration-implementation/` for the full combined audit/readiness pack.

### E2E testing flags

| Variable | Purpose | Local | Staging | Production |
|---|---|---|---|---|
| `ARCHESTIMATOR_E2E_MUTATING_DND` | Enables tree drag-and-drop E2E tests | Optional | Optional | Not applicable |
| `ARCHESTIMATOR_E2E_AI_PACKAGE_BUILDER` | Enables AI package builder E2E tests | Optional | Optional | Not applicable |
| `ARCHESTIMATOR_E2E_INVITE_ENTRY` | Enables collaboration invite E2E tests | Optional | Optional | Not applicable |
| `ARCHESTIMATOR_E2E_COLLABORATION` | Enables teamspace collaboration E2E tests | Optional | Optional | Not applicable |
| `ARCHESTIMATOR_E2E_SHARED_LINK` | Enables shared link receiver E2E tests | Optional | Optional | Not applicable |

### Local data

| Variable | Purpose | Local | Staging | Production |
|---|---|---|---|---|
| `ARCHESTIMATOR_DATA_PATH` | Override path for local JSON data file (defaults to `data/local/runtime.json`) | Optional | Not applicable | Not applicable |

### Summary

| Environment | Variables Present | Missing / Required |
|---|---|---|
| Local | Supabase (all), Resend API key, DeepSeek API key, dev auth email | Publication secrets (not enforced in dev), AI_PACKAGE_BUILDER_DRAFT_SIGNING_SECRET (uses fallback), invite env vars (`PROJECT_INVITE_ENTRY_ENABLED`, `ARCHESTIMATOR_INVITE_TOKEN_PEPPER`) missing or not verified |
| Staging | None provisioned | All variables must be provisioned with staging-specific values, including invite env vars required for collaboration invite testing |
| Production | None provisioned | All variables must be provisioned with production-specific values; publication secrets are **required** (throws on startup if missing), invite env vars are **required** for invite functionality |

### Action items

1. Create a staging Supabase project and populate staging-specific `SUPABASE_*` variables.
2. Provision a production Supabase project (or confirm the current project `ebxxqidacheyapmmzavr` is production).
3. Generate and store publication secrets for staging and production (6 variables; use `openssl rand -hex 32` for each).
4. Generate `AI_PACKAGE_BUILDER_DRAFT_SIGNING_SECRET` for staging and production.
5. Create separate Resend API keys for staging and production.
6. Create separate DeepSeek API keys for staging and production.
7. Document the secret rotation procedure for each provider.
8. Create a `.env.staging` and `.env.production` template (without values) for documentation.
9. **Configure Supabase Auth email/SMTP provider** for collaboration invite delivery (provider dashboard task — required before real invite testing).
10. **Add `PROJECT_INVITE_ENTRY_ENABLED` and `ARCHESTIMATOR_INVITE_TOKEN_PEPPER`** to all environment maps (local, staging, production).
11. **Verify invite E2E** with `ARCHESTIMATOR_E2E_INVITE_ENTRY=1` after config unblock.
12. **Record redacted dashboard evidence** for Supabase Auth email provider, hosted invite template/confirmation settings, Resend webhook configuration, and invite env var configuration.

---

## Section D — Launch-readiness check scripts (tooling) — _added by code-sync 2026-06-18_

Since this doc was last authored, a suite of in-repo **readiness check / verifier scripts** has been built that directly serves this doc's scope (Vercel env, Resend, Supabase, hosted auth). **These scripts are BUILT tooling, not external proof.** They parse pasted CLI transcripts / operator-supplied flags or probe a live URL when one is provided; by their own embedded notes they do **not** read secret values, prove provider-dashboard configuration, prove email deliverability/DNS, or promote a deployment. Running them does not change any "No" / `LEFT TO DO` status above — that still requires operator-supplied, owner-approved external evidence.

| Script (npm script) | What it checks | What it does NOT prove |
|---|---|---|
| `scripts/check-vercel-env-readiness.ts` (`launch:check-vercel-env`) | Presence of core / email / invite env **names** in a `vercel env ls` transcript | Secret values, callback-URL correctness, provider dashboard config, delivery, hosted auth behavior |
| `scripts/check-resend-readiness.ts` (`launch:check-resend-readiness`) | `ARCHESTIMATOR_EMAIL_DELIVERY_ENABLED` + `RESEND_*` presence | Sender/domain verification, DNS (SPF/DKIM/DMARC), webhook registration, actual delivery |
| `scripts/check-supabase-migration-readiness.ts` (`launch:check-supabase-migrations`) | Local-vs-remote migration history shape (via CLI transcript) | Whether migrations are actually applied to the hosted DB |
| `scripts/check-supabase-linked-readiness.ts` (`launch:check-supabase-linked-readiness`) | Linked-project readiness transcript shape | Live project linkage state |
| `scripts/check-supabase-backup-readiness.ts` (`launch:check-supabase-backup`) | Backup/PITR readiness flags | Actual hosted backup configuration |
| `scripts/check-vercel-production-readiness.ts` (`launch:check-vercel-production`) | Production-posture transcript shape | Deployment promotion, env values, alias correctness, hosted auth |
| `scripts/check-vercel-health-readiness.ts` (`launch:check-vercel-health`) | Probes `/api/health` URLs for `200 + ok:true` | Env values, rollback, alias correctness beyond probed URLs, hosted auth |
| `scripts/check-vercel-speed-insights-readiness.ts` (`perf:check-speed-insights`) | Queries hosted Speed Insights metrics via `vercel` CLI | Anything locally; `@vercel/speed-insights` is **not** installed/wired |
| `scripts/check-support-email-dns.ts` (`launch:check-support-dns`) | Public DNS readiness for support email | Inbox monitoring, form delivery, alert routing |
| `scripts/check-support-monitoring-readiness.ts` (`launch:check-support-monitoring`) | Operator-confirmed monitoring/alert proof flags | Real uptime/error alerting (no Sentry/Datadog/PagerDuty integration exists) |
| `scripts/check-legal-owner-readiness.ts` (`launch:check-legal-owner`) | Operator-attested legal-owner readiness flags | The underlying legal-ownership/counsel-review fact |
| `scripts/verify-hosted-auth-routes.ts` (`launch:verify-hosted-auth`) | Live `/workshop` redirect behavior (signed-out/allowed/denied/revoked/expired) + `private,no-store`, given a hosted base URL + real session cookies | Anything without operator-supplied live URL + cookies; without them it emits failures |
| `scripts/verify-hosted-sensitive-route-fail-closed.ts` (`launch:verify-hosted-sensitive-routes`) | Credential-free fail-closed + no-store probe (invalid share token, unauthenticated private image) | Valid-token / private-media correctness (separate owner-approved evidence gates) |
| `scripts/verify-hosted-export-route.ts` (`launch:verify-hosted-export`) | Hosted proposal-export route smoke (requires auth material) | Anything without live host + auth material |

> Several of these `check-*` scripts have co-located Vitest unit tests (e.g. `tests/vitest/vercel-env-readiness-script.test.ts`, `resend-readiness-script.test.ts`, `supabase-migration-readiness-script.test.ts`) that verify the script **logic**, not the live infrastructure state. None of these scripts run in CI; their green status is an operator-run, external/hosted fact.

---

## Related Documents

- [Production-Readiness Command Center](./README.md)
- [Security, Tenancy & Data Protection](./02-security-tenancy-data-protection.md)
- [Supabase, RLS & Storage Readiness](./03-supabase-rls-storage-readiness.md)
- [Release & Deployment Go/No-Go](./11-release-deployment-go-no-go.md)
- [Owner Decisions](./14-owner-decisions.md)
- [Risk Register](./13-risk-register.md)

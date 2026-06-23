# 02 — Current State Analysis

Date: 2026-06-23

## Launch Script Inventory

`package.json` defines 18 scripts that are relevant to provider and operational proof. These are the scripts bound in `12-keystone-code-binding-and-drift-protection.md` and verified as existing on 2026-06-22.

| # | Script name | Command shape | Provider domain | Script file | Artifact today |
|---|---|---|---|---|---|
| 1 | `test:e2e` | `playwright test` | Cross-cutting (requires hosted Supabase) | `playwright.config.ts` | None (console only) |
| 2 | `launch:verify-hosted-auth` | `bun run scripts/verify-hosted-auth-routes.ts` | Vercel + Supabase Auth | `scripts/verify-hosted-auth-routes.ts` | None |
| 3 | `launch:check-resend-readiness` | `bun run scripts/check-resend-readiness.ts` | Resend email delivery | `scripts/check-resend-readiness.ts` | Writes to `.ai/provider-proof/` if run |
| 4 | `launch:check-vercel-env` | `bun run scripts/check-vercel-env-readiness.ts` | Vercel runtime environment | `scripts/check-vercel-env-readiness.ts` | None |
| 5 | `launch:check-vercel-health` | `bun run scripts/check-vercel-health-readiness.ts` | Vercel hosted health | `scripts/check-vercel-health-readiness.ts` | None |
| 6 | `launch:check-support-dns` | `bun run scripts/check-support-email-dns.ts` | DNS / email deliverability | `scripts/check-support-email-dns.ts` | None |
| 7 | `launch:check-support-monitoring` | `bun run scripts/check-support-monitoring-readiness.ts` | Monitoring / alerting ownership | `scripts/check-support-monitoring-readiness.ts` | None |
| 8 | `launch:check-legal-owner` | `bun run scripts/check-legal-owner-readiness.ts` | Legal / privacy owner review | `scripts/check-legal-owner-readiness.ts` | None |
| 9 | `launch:check-supabase-linked-readiness` | `bun run scripts/check-supabase-linked-readiness.ts` | Supabase linked project | `scripts/check-supabase-linked-readiness.ts` | None |
| 10 | `launch:check-supabase-migrations` | `bun run scripts/check-supabase-migration-readiness.ts` | Supabase migration state | `scripts/check-supabase-migration-readiness.ts` | None |
| 11 | `launch:check-supabase-backup` | `bun run scripts/check-supabase-backup-readiness.ts` | Supabase backup posture | `scripts/check-supabase-backup-readiness.ts` | None |
| 12 | `launch:supabase-readiness` | `supabase db query --linked --file scripts/sql/linked-supabase-launch-readiness.sql --output json` | Supabase database health | `scripts/sql/linked-supabase-launch-readiness.sql` | JSON stdout |
| 13 | `launch:check-vercel-production` | `bun run scripts/check-vercel-production-readiness.ts` | Vercel production target | `scripts/check-vercel-production-readiness.ts` | None |
| 14 | `launch:verify-hosted-sensitive-routes` | `bun run scripts/verify-hosted-sensitive-route-fail-closed.ts` | Vercel route security | `scripts/verify-hosted-sensitive-route-fail-closed.ts` | None |
| 15 | `launch:verify-hosted-export` | `bun run scripts/verify-hosted-export-route.ts` | Vercel export route | `scripts/verify-hosted-export-route.ts` | None |
| 16 | `perf:check-routes` | `bun run scripts/check-route-transition-readiness.ts` | Performance / route budgets | `scripts/check-route-transition-readiness.ts` | None |
| 17 | `perf:measure-routes` | `bun run scripts/measure-route-transitions.ts` | Performance measurement | `scripts/measure-route-transitions.ts` | None |
| 18 | `validate` | `bun run type-check && bun run lint && ...` | Local validation gate | `package.json` | None |

Note: `perf:check-speed-insights` (`scripts/check-vercel-speed-insights-readiness.ts`) is a 19th script not in the Keystone 18 but present in `package.json`.

## Readiness Check Script Files

The `scripts/` directory contains the following readiness check implementations:

- `scripts/check-resend-readiness.ts` — checks `RESEND_API_KEY`, `RESEND_FROM`, `RESEND_REPLY_TO`, `RESEND_WEBHOOK_SECRET`, and `ARCHESTIMATOR_EMAIL_DELIVERY_ENABLED` env vars; queries Vercel env if configured; outputs a `ResendReadinessResult`.
- `scripts/check-vercel-env-readiness.ts` — checks Vercel runtime env parity against local `.env` keys.
- `scripts/check-vercel-health-readiness.ts` — performs a health check against the hosted Vercel deployment.
- `scripts/check-vercel-production-readiness.ts` — confirms production target and env var presence.
- `scripts/check-support-email-dns.ts` — checks DNS records for support email deliverability.
- `scripts/check-support-monitoring-readiness.ts` — checks monitoring proof flags (`SUPPORT_MONITORING_INBOX_CONFIRMED`, `SUPPORT_MONITORING_FEEDBACK_REVIEW_CONFIRMED`, `SUPPORT_MONITORING_UPTIME_ALERT_CONFIRMED`, `SUPPORT_MONITORING_ERROR_ALERT_CONFIRMED`, `SUPPORT_MONITORING_INCIDENT_ESCALATION_CONFIRMED`).
- `scripts/check-legal-owner-readiness.ts` — checks legal proof flags (`LEGAL_OWNER_TERMS_CONFIRMED`, `LEGAL_OWNER_PRIVACY_CONFIRMED`, `LEGAL_OWNER_BETA_COPY_CONFIRMED`, `LEGAL_OWNER_DATA_RETENTION_CONFIRMED`, `LEGAL_OWNER_SUPPORT_COMMS_CONFIRMED`).
- `scripts/check-supabase-linked-readiness.ts` — confirms linked Supabase project is `ebxxqidacheyapmmzavr` and checks migration match.
- `scripts/check-supabase-migration-readiness.ts` — compares local migration files against applied remote migrations.
- `scripts/check-supabase-backup-readiness.ts` — checks backup posture; notes PITR is disabled per closed-beta cost policy.
- `scripts/check-route-transition-readiness.ts` — performance budget check for route transitions.
- `scripts/check-vercel-speed-insights-readiness.ts` — confirms Speed Insights wiring and readiness.
- `scripts/check-public-cache-safety.ts` — checks public route cache header safety.

## Supabase Migrations

There are 67 local migration files under `supabase/migrations/`. Key migrations referenced in the security and provider audit:

- `20260621120000_shared_link_d1_d11_hardening.sql` — shared link security hardening
- `20260601003000_security_rate_limit_events.sql` — rate limit events table

The linked remote project is `ebxxqidacheyapmmzavr` (bound in `package.json` `gen:types` and readiness scripts).

## Provider Wiring Status

| Provider | Wired in code | Local tests exist | Hosted proof exists | Owner assigned | Artifact durable |
|---|---|---|---|---|---|
| Resend | Yes (`src/lib/email/`, `resend` dependency) | Yes (route tests) | No | No | No |
| Supabase/Postgres | Yes (`@supabase/supabase-js`, `@supabase/ssr`, 67 migrations) | Yes (RPC, RLS, action tests) | Partial (linked readiness script) | No | No |
| Vercel | Yes (`@vercel/analytics`, `@vercel/speed-insights`) | No | Partial (env/health scripts) | No | No |
| Monitoring | No concrete sink | No | No | No | No |
| Legal/privacy | Terms and privacy routes exist | No | No | No | No |
| Support | Feedback page and review queue exist | Yes (component tests) | No | No | No |
| Google Maps/Places | Yes (`project-location-map-style.ts`) | Yes (provider-missing tests) | No | No | No |
| AI (DeepSeek) | Yes (`src/lib/ai/`, feature-flagged) | Yes (security contract tests) | No | No | No |

## Honesty Boundary

The following are true today:

- The `launch:*` scripts exist and are bound.
- The scripts check env presence, DNS, migration counts, and proof flags.
- The scripts do NOT prove inbox delivery, live alert firing, or actual Maps tile rendering.
- No owner is assigned to any provider check.
- No artifact is written to a durable location by default (some scripts may write to `.ai/provider-proof/` if the directory exists, but this is not guaranteed).
- The canonical CSV does not currently have a column for provider proof last-run date.

## Gaps

1. Owner assignment: every provider needs a named owner.
2. Artifact durability: every script run needs to write to `provider-proof/<provider>-<date>.json`.
3. Status tracking: the canonical CSV or a dedicated tracker needs a pass/fail/blocked column per provider.
4. Escalation path: when a check fails, there is no documented escalation owner.
5. Cadence: there is no rule for how often checks must be re-run (daily, weekly, pre-launch only).

## Key Path References

- `src/lib/email/` — Resend client, relevant to Email Delivery Owner.
- `src/lib/supabase/` — Supabase clients, relevant to Database Owner.
- `src/lib/publication/` — share links, relevant to Product Owner.
- `src/lib/collaboration/` — invites, relevant to Support Owner.
- `src/components/workshop/` — 44+ core app components, potential UI surface for provider status.
- `scripts/` — 11 readiness check scripts, the primary tool for provider proof collection.

## Script Ownership Gaps

| Script | Current owner | Required owner | Gap |
|---|---|---|---|
| `check-resend-readiness.ts` | None | Email Delivery Owner | No assignment |
| `check-supabase-linked-readiness.ts` | None | Database Owner | No assignment |
| `check-vercel-env-readiness.ts` | None | Infrastructure Owner | No assignment |
| `check-vercel-health-readiness.ts` | None | Infrastructure Owner | No assignment |
| `check-support-monitoring-readiness.ts` | None | Incident Commander | No assignment |
| `check-legal-owner-readiness.ts` | None | Product Owner | No assignment |

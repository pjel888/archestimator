# 01 — Executive Summary

## What is being planned

A single-operator **admin dashboard** for Archestimator, gated to
`philipjonlewis@gmail.com` via the existing Better Auth + Google OAuth stack,
that consolidates everything the solo founder needs to operate the product
post-launch. This is a **planning-only** package — no code, tests, migrations,
or infra are modified here.

## Why

Archestimator is preparing for first users. Philip is the only developer and
the only customer-support operator. Today there is **no `/admin` or
`/dashboard` route**, no central place to see who is using the product, no
support inbox, and no consolidated telemetry. Operational signals are scattered
across Cloudflare dashboards, Clarity, GA4, `logs/dev.ndjson`, and ad-hoc D1
queries. The admin dashboard unifies these into one authenticated surface.

## What the dashboard contains (scope)

Six core sections, deliberately minimal-but-sufficient for a solo operator
(research-cited; see `19_RESEARCH_REVIEW_AND_QA_EVIDENCE.md` Q1):

1. **Overview / live health** — users online now (realtime), recent signups,
   request/error trends, D1/R2/Queue/Email health summary, incident strip.
2. **Users & accounts** — searchable user table (email, role, created, last
   session), profile/role display, link to existing closed-beta allowlist
   management (`/workshop/settings/users`).
3. **Support inbox** — unified inbox of customer conversations; in-app chat
   (realtime via Durable Object) as the primary channel, with email-to-ticket
   via Cloudflare Email Worker as a Phase-2 integration. Philip replies from the
   dashboard; replies send via the existing `EMAIL` binding.
4. **Analytics integrations** — embed/link Cloudflare Web Analytics, Microsoft
   Clarity, and Google Analytics 4; pull GA4 + Clarity + CF GraphQL Analytics
   data server-side where credentials exist (owner-gated).
5. **Feature flags & settings** — D1-backed flag table with toggle UI
   (zero-redeploy toggles); env-var display; system status.
6. **Audit log & observability** — admin-action audit trail; links to Cloudflare
   Workers Observability / `wrangler tail`; recent `operational_incidents`.

Explicitly deferred (see `02_FEATURE_BRIEF_AND_SCOPE.md`): billing UI (Stripe
Customer Portal), A/B/funnel analytics, full in-dashboard log search,
multi-admin team management, paid Cloudflare add-ons.

## How it is gated (auth)

Layered defense (research-cited; `19_RESEARCH_REVIEW_AND_QA_EVIDENCE.md` Q2/Q7):

1. **App-layer email allowlist** — a new `isPlatformAdminEmail()` helper in
   `src/lib/auth/roles.ts` reading `PLATFORM_ADMIN_EMAILS` env var (default
   `philipjonlewis@gmail.com`). This consolidates the **4 existing scattered
   hard-coded `philipjonlewis@gmail.com` literals** into one authoritative
   check. Reuses the existing `isPlatformAdminRole` predicate family.
2. **Route gate** — add `/admin` to `PROTECTED_PREFIXES` in
   `src/lib/auth/request-proxy.ts` plus an admin-role check; bounce non-admins
   to `/access-required`.
3. **Edge gate (recommended, owner-gated)** — Cloudflare Access (Zero Trust)
   OTP allowlist on `/admin` (free, ≤50 users) so unauthenticated traffic never
   reaches the Worker.
4. **Per-endpoint authz** — every `/api/admin/*` route and admin Server Action
   re-checks `getCurrentUserContext()` + `isPlatformAdminRole`/`isPlatformAdminEmail`.

No new `isAdmin` column (research Q2 rejects it as redundant and bug-prone); the
existing `profiles.role IN ('ceo','admin','member')` is the role source of truth.

## Key architectural decisions (summary)

| Decision | Choice | Rejected alternatives | Why |
|---|---|---|---|
| Admin route home | New `src/app/admin/` route group (flat, matches repo) | Nest under `/workshop` | Admin is a distinct operator surface; avoids coupling to workshop shell |
| Realtime active users | New `GlobalPresence` Durable Object (SQLite, Hibernation API) + optional Analytics Engine mirror | D1 heartbeats; KV TTL | DO `getWebSockets()` is the authoritative live-count primitive (research Q3); reuses established DO pattern |
| Charts | Add `recharts` | Tremor; hand-roll more d3 | Pragmatic, React-native, lighter than Tremor; existing `CostDonutChart` d3-shape approach doesn't scale to a dashboard |
| Support inbox | D1 `support_conversations`+`support_messages` + realtime via a `SupportInbox` DO (per-conversation room) | Third-party widget; email-only | Full data ownership, free-tier, reuses DO + Email stack; unifies in-app chat + email tickets in one inbox |
| Analytics read | GA4 Data API (service-account JWT) + Clarity Data Export API + CF GraphQL Analytics API, all daily-cached in D1 | Build custom analytics | Reuse what's already instrumented; all read-paths are owner-gated (credentials BLOCKED-EXTERNAL) |
| Feature flags | D1 `feature_flags` table + cached server helper + admin toggle UI | LaunchDarkly; KV-only | Solo-dev scale; KV is eventually-consistent (research flags KV as cache-only); D1 is the system of record |

## Blast radius (summary)

- **Additive (low risk):** new `src/app/admin/**`, `src/lib/admin/**`,
  `src/components/admin/**`, new migrations (`0041`–`0043`), new DO class(es).
- **Targeted edits (medium risk):** `src/lib/auth/roles.ts`,
  `src/lib/auth/request-proxy.ts`, `wrangler.jsonc`, `package.json`,
  `src/app/providers.tsx` (admin query hooks), `src/components/landing/*`
  (no change — analytics already wired).
- **Refactor (medium risk, separately landable):** consolidate the 4
  `philipjonlewis@gmail.com` literals into `isPlatformAdminEmail`.
- **Explicitly unaffected:** all existing user-facing workshop routes, the
  marketing/public site, Better Auth identity tables, existing collaboration DO.

See `10_BLAST_RADIUS_AND_DEPENDENCIES.md` for the full impact matrix.

## Readiness (initial → target)

Initial synthesis scores are in `17_FINAL_READINESS_REVIEW.md`. Because the
package has **emulated** verification (no independent verifier agent) and
several **BLOCKED-EXTERNAL** credential/owner decisions, the package is marked
**`CONDITIONALLY READY`**: the architecture, schema, UI, and implementation
plan are implementation-ready, but the analytics-read slices (GA4/Clarity/CF
Analytics API data fetch) and the Cloudflare Access edge gate are isolated
behind owner decisions. The core dashboard (overview, users, support inbox,
feature flags, audit log) can proceed once Philip approves.

## Confirmation

No application code, tests, migrations, schemas, `wrangler.jsonc`, or
`package.json` were modified by this planning task. All writes are confined to
`.ai/03_plans/2026-07-08/Admin-Dashboard-Planning/`.

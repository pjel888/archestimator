# 00 — Agent Coordination

**Plan folder:** `.ai/03_plans/2026-07-08/Admin-Dashboard-Planning/`
**Created:** 2026-07-08 (Asia/Manila)
**Plan profile:** `exhaustive`
**Task class:** `planning-only` (no application code, tests, migrations, schemas, or infra may be modified by this plan; implementation is future work gated on this package being approved).

## Master goal

Produce a production-grade, codebase-specific, evidence-based implementation
planning package for an **admin dashboard** for Archestimator, gated to the
single solo developer (`philipjonlewis@gmail.com`) via Google OAuth, that
consolidates the operational telemetry a solo founder needs to run the product:
live product usage, current/active users, user accounts, a unified customer
support inbox, observability, analytics integrations (Cloudflare, Microsoft
Clarity, Google Analytics), feature flags, and an admin audit log.

The finished package must let a separate implementation AI execute without
rediscovering requirements, architecture, affected files, data contracts,
failure modes, or validation procedures.

**Outcome:** Philip (sole operator) has one authenticated surface that answers
"is the product up, who is using it right now, who signed up, what needs my
attention (support/audits/incidents), and how is traffic/error/usage trending."

**Non-goals:**
- Billing/subscription management UI (defer to Stripe Customer Portal).
- A/B experiment / funnel / cohort analytics UI (defer to GA4 / PostHog).
- Multi-admin team/role management UI (single operator for now; design must
  allow a second admin via env var, but no team-management screens).
- In-dashboard full-text log search (link to Cloudflare Workers Observability).
- Paid Cloudflare add-ons (Logpush, Workers Paid, R2 paid tier) — stay free-tier.
- A new auth provider (reuse existing Better Auth + Google OAuth + magic link).
- Modifying existing user-facing workshop flows.

**Planning scope boundaries (planning-only):**
- This package plans only. It does NOT edit source, tests, migrations,
  `wrangler.jsonc`, `package.json`, or provider state.
- Implementation tasks name exact target paths/symbols but do not execute.

## Authority and source strength model

- **User intent** (the feature brief) controls the product goal.
- **Repository evidence** (current source, migrations, `wrangler.jsonc`,
  `package.json`, current-state fast path) controls implementation reality.
- **Official docs** (Better Auth, Cloudflare, Microsoft Clarity, Google,
  Next.js) control version-sensitive behavior.
- Older plans, stale docs, and model memory are lower authority.

Every requirement carries a `source_strength` of `brief`, `repo evidence`,
`official docs`, `provider proof`, `assumption`, `derived`, or
`owner-delegated decision`.

## Workstreams and verification mode

This is a **planning-only** package. Specialist lanes ran as parallel read-only
discovery/research agents; the lead synthesized. No native "verifier" agent ran
a separate pass — the final review in `17_FINAL_READINESS_REVIEW.md` is an
**emulated** adversarial pass by the lead, which caps overall readiness at 97
and package status at `CONDITIONALLY READY` for the high-blast-radius slices
until a human (Philip) or an independent reviewer approves.

| Lane | Role | Native/emulated | Status |
|---|---|---|---|
| Lead coordinator | Scope, synthesis, integration, final claim | same-agent (lead) | done |
| Auth/access-control audit | Better Auth, OAuth, allowlist, roles, proxy | native Explore agent | done |
| Analytics/observability/realtime audit | Clarity/GA/CF analytics, DO presence, logs, wrangler | native Explore agent | done |
| D1 schema + UI primitives audit | Migrations, `ui/`, layout conventions, query client | native Explore agent | done |
| External research | Solo-dev admin best practices, CF Analytics API, Clarity/GA, realtime, support inbox, security | native general-purpose agent (WebSearch/WebFetch) | done |
| Adversarial reviewer | Gap/contradiction/assumption challenge | emulated (lead pass) | done |
| Independent final verifier | Requirement-by-requirement audit | emulated (lead pass) | done |

### Coordination ledger

| Agent | /goal | Scope | Evidence | Dependencies | Findings | Conflicts | Status |
|---|---|---|---|---|---|---|---|
| Auth audit | Map auth/admin/access-control | Better Auth config, proxy, roles, profiles, env | `src/lib/auth/*`, `src/proxy.ts`, `migrations/0001,0003` | none | Role system + scattered email literals + beta allowlist exist; no `/admin` route | none | complete |
| Analytics audit | Map analytics/realtime/observability | Clarity/GA/CF beacon, DO presence, logs, wrangler | `src/components/landing/*`, `collaboration-room.ts`, `observability/logger.ts`, `wrangler.jsonc` | none | All 3 analytics wired behind consent; per-room DO presence; no global counter; no metrics API | none | complete |
| Schema/UI audit | Map D1 schema + UI primitives + conventions | migrations, `ui/`, layout, TanStack Query, tokens | `migrations/`, `src/components/ui/`, `src/app/workshop/*`, `globals.css` | none | 40 migrations, rich `ui/` primitives, no chart lib, no chat/support tables, `WorkshopPageShell` pattern | none | complete |
| Research | Cited best-practice + provider research | 7 research questions | Better Auth, Cloudflare, Clarity, GA, OWASP docs | none | Layered auth (DB hook + adminUserIds + CF Access); DO presence best for realtime; GraphQL Analytics API free for essentials; Clarity has quota-limited export API; Email-Worker ticketing recommended | none | complete |
| Lead | Synthesize exhaustive pack | All docs in plan folder | All lane outputs | all lanes | See `17_FINAL_READINESS_REVIEW.md` | none | complete |

## Skills discovered and used

- `archestimator-plan-pack` — binds generic planning to this repo's `.ai/03_plans/` + `LOOP_LEDGER` contract. **Used.**
- `Creating-Plan-Prompt.md` / `Multi-Agent-Execution-Directive.md` — the authoritative planning + execution directives the user explicitly attached. **Used (primary directive).**
- Cloudflare, Better Auth, Durable Objects, workers-best-practices — consulted via the research lane's official-doc citations; not directly invoked as skills because the planning task is doc/research-shaped, not provider-mutation-shaped. **Consulted (research).**
- GitNexus / code-review-graph — AGENTS.md notes these are subordinate to proportional use; for a planning task, the four parallel Explore/research lanes were the cheaper evidence path. **Intentionally not used** (narrow, read-only discovery already covered the blast radius).
- `design`, `team` — referenced in the brief. `design` is alpha-stage (DESIGN.md); the plan defers to existing tokens + Philip's direction and does not invoke a heavyweight design workflow. `team` is an execution-shape skill, not needed for planning-only synthesis. **Not used (justified).**

No new reusable skill was created (no genuine capability gap for planning).

## File/module ownership model (for future implementation)

During implementation, these file scopes must be leased to avoid collisions
(repo is a shared live worktree):

- `src/app/admin/**` — admin route group (new).
- `src/lib/admin/**` — admin data layer, metrics, feature flags, audit (new).
- `src/lib/auth/roles.ts` — `isPlatformAdminEmail` helper + allowlist env (edit).
- `src/lib/auth/request-proxy.ts` — add `/admin` to protected prefixes (edit).
- `src/components/admin/**` — admin shell, sidebar, charts, inbox (new).
- `migrations/0041..0043_*.sql` — support conversations, feature flags, audit log (new).
- `wrangler.jsonc` — new DO binding(s), optional Analytics Engine, rate-limit binding (edit).
- `package.json` — add `recharts` (+ optional `postal-mime`) (edit).

## Stop condition

Planning stops when: the package is internally consistent, every requirement is
traced, all externally-blocked decisions are isolated with options +
recommendations, and an emulated adversarial + final-verifier pass has run. At
that point the package is handed to Philip for approval; implementation does not
begin until the owner approves a slice.

## Open decisions routed to owner (BLOCKED-EXTERNAL)

These are recorded with options/recommendations in `15_DECISIONS_ASSUMPTIONS_AND_ALTERNATIVES.md`
and surfaced in the README blocked-decisions table:

- **OPEN-1** Create GA4 service-account + Data API credentials (GA4 read in dashboard).
- **OPEN-2** Create Clarity Data Export API token (Clarity read in dashboard).
- **OPEN-3** Create scoped Cloudflare GraphQL Analytics API read token.
- **OPEN-4** Enable Cloudflare Access (Zero Trust) OTP allowlist on `/admin`.
- **OPEN-5** Provision inbound `support@` Cloudflare Email Routing address + Email Worker.
- **OPEN-6** Approve adding `recharts` dependency + new DO binding(s) to `wrangler.jsonc`.
- **OPEN-7** Confirm whether active-users presence should be opt-in per user (privacy).

# 00 — Agent Coordination

Plan folder: `.ai/03_plans/2026-07-07-cloudflare-worker-production-observability-and-budgets/`
Date: 2026-07-07
Mode: **planning-only**. No application code, tests, migrations, schemas, or config changed.

## Master /goal

Produce a production-grade, codebase-specific planning package that lets a future
implementation AI add end-to-end request/job correlation, a structured
observability model, runtime budgets (CPU/duration/subrequest/memory/D1), log
sampling, privacy redaction, free-tier-safe metrics, dashboard/alert expectations,
and evidence scripts to the Archestimator Cloudflare Worker — **without assuming
any paid observability add-on** and **without claiming production monitoring from
local-only checks**.

- **Outcome:** an executor can implement runtime budgets and observability proof
  for Cloudflare production behavior.
- **Problem:** `wrangler.jsonc` enables Workers Observability, but the app-level
  request/job correlation model is incomplete, there is no end-to-end request id,
  no `Server-Timing` header, no production metrics sink, runtime-budget vars are
  never enforced, the Worker `fetch`/`scheduled`/`queue` handlers have no
  try/catch, and the retention pass has no duration/row budget.
- **Scope:** Worker entry (`worker.ts`), `src/lib/cloudflare/*` route helpers,
  `src/lib/observability/*`, `src/lib/perf/server-timing.ts`, `src/lib/compliance/retention-core.ts`,
  `src/lib/cloudflare/collaboration-room.ts` (DO), the upload job queue + cron
  handlers, `wrangler.jsonc` observability/vars tuning, and the proof/evidence
  scripts under `src/app/api/internal/*` and package `cf:*` scripts.
- **Non-goals:** implementing the feature; enabling any paid Cloudflare add-on
  (D1 paid, R2 paid, Workers Paid, Smart Placement paid, Analytics paid, Logpush);
  Sentry/Clarity wiring beyond a swappable sink contract; changing the auth/data
  model; touching legacy Supabase.
- **Implementation-readiness criteria:** every requirement traceable, every task
  names exact repo-relative paths/symbols, every budget names an evaluator and a
  free-tier ceiling, every log/metric path names a redaction rule, and the
  package is `IMPLEMENTATION-READY` or `CONDITIONALLY READY` with isolated
  external decisions.
- **Stop condition:** an executor can implement runtime budgets and
  observability proof for Cloudflare production behavior.

## Specialist workstreams (executed as emulated passes by the lead + parallel exploration subagents)

| Workstream | Mode | Evidence |
|---|---|---|
| Lead coordinator + synthesizer | same-agent | This folder |
| Source & codebase architecture analyst | 2× Explore subagents (native) | `03_SOURCE_AND_CODEBASE_AUDIT.md` |
| Backend/API/integration planner | same-agent from subagent map | `07_…`, `06_…` |
| Data/database planner | same-agent from subagent map | `07_DATA_DATABASE_API_NETWORK_PLAN.md` |
| Performance/reliability reviewer | same-agent + research subagent | `09_…`, `13_…` |
| Security/privacy reviewer | same-agent | `08_…` |
| Test/QA strategist | same-agent | `12_…` |
| Operations/rollout planner | same-agent | `13_…` |
| Adversarial reviewer | same-agent emulated | `19_…` |
| Final verifier | same-agent emulated | `17_…` |

**Native subagents used:** 3 (2 Explore for codebase mapping, 1 general-purpose
for Cloudflare official-docs research). **Verification mode: `emulated`.** No
independent verifier was available, so the package is capped at 97 overall and
marked `CONDITIONALLY READY` for the high-blast-radius exhaustive profile pending
an owner or independent review pass.

## Skills discovered and used

| Skill | Used? | Why |
|---|---|---|
| `archestimator-plan-pack` | Yes | Confirms dated `.ai/03_plans/` convention, loop shape, exhaustive trigger |
| `gitnexus` (impact/claude skills) | No — narrow read-only planning | Proportional policy: `rg`/targeted reads sufficient for a docs-only plan |
| `cloudflare` / `workers-best-practices` / `wrangler` | Consulted via research subagent | Free-tier limits, observability config, DO/Queue limits |
| `autopilot` / `ultragoal` / `ultrawork` / `ultraqa` | Conceptual contracts only | Documented in `11_…` and `19_…` for the future implementation loop |
| `verification-before-completion` | Yes | Drives the completion-audit shape in `17_…` |

No skill was fabricated. No reusable skill was created (no genuine gap).

## Coordination ledger

| Lane | /goal | Scope | Evidence | Dependencies | Findings | Conflicts | Status |
|---|---|---|---|---|---|---|---|
| Explore-1 | Map API routes, proxy, server actions, request-id handling, telemetry | `src/app/api/**`, `src/proxy.ts`, `src/lib/auth/request-proxy.ts`, `"use server"` files, `rg` for request_id/cf-ray | file:line map in `03_…` | none | No end-to-end request id; `wsh_*`/`err_*` independent; no Server-Timing; cf-ray read in 2 spots only | none | COMPLETE |
| Explore-2 | Map D1 repos, DO, retention, upload flow, budget var reads, tests | `src/lib/repositories/**`, `collaboration-room.ts`, `retention-core.ts`, `uploads/**`, `wrangler.jsonc` vars | file:line map in `03_…` | none | Budget vars never enforced; retention unbounded; DO has no logging/metrics; O(N) fan-out | none | COMPLETE |
| Research | Free-tier Cloudflare observability facts | WebSearch + web reader on developers.cloudflare.com / blog | citations in `19_…` | none | Traces share logs quota since Mar 2026; AE free at 100k pts/day; native alerting weak on Free | none | COMPLETE |
| Lead | Synthesize pack | all of above | all docs | 3 lanes above | — | — | COMPLETE |

## File-ownership lease

This pack owns the folder
`.ai/03_plans/2026-07-07-cloudflare-worker-production-observability-and-budgets/`
exclusively. All writes are confined to it. No application source, tests,
migrations, `wrangler.jsonc`, package manifests, or provider state were modified.
`git status` confirms no out-of-folder changes from this task.

## Concurrent-repository safety

`git status` was checked before writing. The repo had unrelated pre-existing
modified files (`AGENTS.md`, other plan packs, gitnexus skills). Those were
preserved untouched. No destructive git operations were performed.

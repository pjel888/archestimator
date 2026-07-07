# 00 — Agent Coordination Ledger

**Plan:** 2026-07-07-cloudflare-queues-cron-production-ops
**Plan folder:** `.ai/03_plans/2026-07-07-cloudflare-queues-cron-production-ops/`
**Plan profile:** `exhaustive` (Cloudflare Queues/Cron/DLQ + D1 retention — high-blast-radius operations)
**Task type:** `planning-only`. No application code, tests, migrations, or provider state is modified by this pack.
**Suite authority:** `Creating-Plan-Prompt.md` + `Multi-Agent-Execution-Directive.md`.
**Readiness status:** see `README.md` and `17_FINAL_READINESS_REVIEW.md`.

---

## Master goal

Convert the `PROMPT.md` brief into a production-operations plan pack that lets a
future executor prove Cloudflare Queues, DLQ handling, cron triggers, upload
jobs, retention jobs, and scheduled maintenance are **production-ready and
documented consistently**.

### Outcome

A future implementation AI can take this pack and, without rediscovery, harden
and document the queue/cron/retention runtime so that:

1. The queue job taxonomy, idempotency keys, retry/DLQ policy, and
   duplicate-delivery semantics are explicit, tested, and operator-visible.
2. The cron schedule source of truth is single and consistent across
   `wrangler.jsonc`, `scheduled-upload-jobs.ts`, `worker.ts`, `retention-schedule.md`,
   and `AGENTS.md` (resolving the documented "two vs three cron triggers" drift).
3. Backlog, failure recovery, alert thresholds, and a hosted-provider proof path
   are defined for an operator runbook.
4. All destructive cleanup and retention work stays behind dry-run and
   evidence review, with rollback/fix-forward paths.

### Problem being solved

The repo already has local queue/cron/retention groundwork (`localQueuesCronProofReady=true`)
but `providerBacked=false` and `productionJobsMessagingReady=false` in the latest
local proof. Three concrete gaps drive this plan:

- **Documentation drift:** `AGENTS.md:40` says "Two cron triggers" while
  `wrangler.jsonc` declares three; the retention cron (`30 3 * * *`) is wired in
  `worker.ts` but invisible to the binding summary.
- **Idempotency/DLQ proof thinness:** the minute-granularity idempotency key only
  dedupes within a batch; DLQ is *predicted* (`deadLetterExpected`) but never
  actually moved in tests, and the `attempts < MAX_RETRIES` boundary is untested.
- **Operational gaps:** no standalone DLQ/queue operator runbook; the only
  retention operator doc is Supabase-era/archived; retention-target tables lack
  standalone `created_at` indexes; `productionJobsMessagingReady` is still false.

### Planning scope

Cover: queue producer/consumer, DLQ, three cron triggers, two internal job
routes (`upload-cleanup`, `upload-scan`), the in-process retention pass,
`data_retention_events` audit, dry-run/live controls, secret authorization,
provider-proof scripts, and operator runbook/alerting.

### Non-goals (planning-only)

- Do NOT implement, edit source, edit tests, edit migrations, edit `wrangler.jsonc`,
  deploy, run provider mutations, or change DNS/billing/secrets.
- Do NOT expand beyond the queues/crons bound in `wrangler.jsonc`
  (`UPLOAD_JOBS_QUEUE`, `archestimator-upload-jobs`, `archestimator-upload-jobs-dlq`,
  the three cron triggers). No new bindings, queues, or paid add-ons.
- Do NOT resolve `OPEN-DEC-004` (counsel TTL sign-off) — that is an external
  owner decision; the plan isolates it as a blocker.
- Do NOT redesign DSAR erasure propagation (separate P1.8 follow-up).

### Required codebase analysis

Source map, route handlers, queue/cron runtime libs, retention engine,
migrations, tests, proof scripts, operator docs, and `current-state.md` history.
(Completed — see `03_SOURCE_AND_CODEBASE_AUDIT.md`.)

### Required specialist workstreams

Twelve domains per the planning directive. Verified covered or marked N/A in the
relevant numbered docs (UX/a11y is N/A — no UI surface; see `05` for the reason).

### Implementation-readiness criteria

The pack is complete when every required document exists, every requirement is
traced, every shadow-path cell is answered, every DB-touching task has a
blueprint + rollback, and the readiness review records a status with the
verification mode.

### Validation criteria

Static cross-document consistency; adversarial gap pass; traceability matrix
complete; no `TODO`/`TBD` without owner + options + recommendation. No runtime
proof is claimed from local-only checks (hosted/provider proof is explicitly
listed as *remaining required* in `README.md`).

### Final planning deliverables

The `exhaustive` document set (00–19 + README), listed in `README.md`.

---

## Orchestration model used

**verification_mode: emulated.** Native subagents (Explore lanes) were used for
evidence discovery, but no native independent verifier lane was dispatched for
the final review. The lead performed the cross-document consistency and
adversarial passes as separated passes. Per the suite authority contract, this
caps overall readiness at 97 and caps a high-blast-radius planning package at
`CONDITIONALLY READY` unless an independent reviewer or the owner later
approves the final package. That cap is reflected in `17_FINAL_READINESS_REVIEW.md`.

### Workstreams / lanes

| Lane | Role | Native? | Owned doc(s) | Status |
|---|---|---|---|---|
| Lead coordinator | Scope, synthesis, integration, final claim | lead | 00, README, 01, 17 | complete |
| Source & codebase analyst (Explore) | Map runtime libs, routes, bindings | native | inputs → 03 | complete |
| Test & QA strategist (Explore) | Map test coverage, gaps | native | inputs → 12 | complete |
| Migration & ops doc analyst (Explore) | Map migrations, scripts, runbooks, state history | native | inputs → 03, 07, 13 | complete |
| Architecture / data / API planner | Queue/cron/retention architecture, D1, network | emulated by lead | 06, 07 | complete |
| Security & privacy reviewer | Threat model, secrets, abuse | emulated by lead | 08 | complete |
| Performance & reliability reviewer | Budgets, indexes, SLOs, alerting | emulated by lead | 09 | complete |
| Rollout/ops planner | Runbook, flags, rollback, alert thresholds | emulated by lead | 13 | complete |
| Adversarial reviewer | Gap analysis, assumption challenge | emulated (separated pass) | 19, 17 | complete |
| Final verifier | Requirement-by-requirement audit | emulated (separated pass) | 17 | complete |

### Skills used

- `archestimator-plan-pack` — binds generic planning to the `.ai/03_plans/` +
  `LOOP_LEDGER.md` convention and the loop-engineering contract. Relevant because
  this is exactly a "spin a plan pack for high-blast-radius ops work" task.
- `Explore` subagent lanes — read-only fan-out evidence discovery across
  routes, tests, migrations, scripts, docs, and state history.
- No other skill was invoked. No skill was fabricated. `ultrawork`/`ultragoal`/
  `ultraqa`/`autopilot` were *named in the loop vocabulary* of the plan pack
  skill but were not needed for a planning-only deliverable; the directive says
  not to invoke skills whose current instructions do not materially apply.

### Concurrent-repo safety

All writes are confined to the new plan folder. No application code, tests,
migrations, configs, or provider state were modified. `git status` was not
mutated. The pre-existing `PROMPT.md` in the folder was preserved as-is.

---

## Coordination ledger

| Agent | /goal | Scope | Evidence | Dependencies | Findings | Conflicts | Status |
|---|---|---|---|---|---|---|---|
| Lead | Master goal above | Whole pack | 03, 12, 07 audit docs | Explore lanes | Drift, idempotency, DLQ, index, runbook gaps | — | complete |
| Explore-A | Map internal job routes + auth | `src/app/api/internal/upload-*`, retention table | file:line, code quotes | none | 2 job routes, no shared auth helper, retention in-process only | none | complete |
| Explore-B | Map test coverage + gaps | `tests/vitest/*queue*`, `*scheduled*`, `*retention*`, `e2e/` | test names, gap list | none | 10 concrete test gaps (exception path, DLQ boundary, worker handlers, etc.) | none | complete |
| Explore-C | Map migrations + scripts + runbooks + state | `migrations/`, `package.json`, `scripts/`, `.ai/` | paths, schemas, state-history lines | none | latest migration 0038; no `created_at` standalone indexes; no live DLQ runbook; OPEN-DEC-004 blocker | none | complete |

## Source authority decisions

- **Cron source of truth = `wrangler.jsonc` (three triggers)**, not
  `AGENTS.md`. `scheduled-upload-jobs.ts` maps 2 of 3 to upload jobs; the third
  (`30 3 * * *`) is retention, wired in `worker.ts`. `AGENTS.md:40` is stale and
  must be repaired as a documentation task.
- **Queue/DLQ source of truth = `wrangler.jsonc`** (consumer `max_retries: 3`,
  DLQ `archestimator-upload-jobs-dlq`). `upload-job-queue.ts` constants mirror
  these; the plan treats `wrangler.jsonc` as canonical.
- **Retention TTL source of truth = `DEFAULT_RETENTION_RULES` in
  `retention-core.ts` (runtime config)**, per the migration `0034` header and
  `retention-schedule.md`. TTLs are DRAFT pending `OPEN-DEC-004`.

## Open decisions

Tracked in `15_DECISIONS_ASSUMPTIONS_AND_ALTERNATIVES.md` and the blocked
decisions table in `README.md`. Headline: `OPEN-DEC-004` (counsel TTL sign-off)
and the cross-batch idempotency-store decision are the two material open items.

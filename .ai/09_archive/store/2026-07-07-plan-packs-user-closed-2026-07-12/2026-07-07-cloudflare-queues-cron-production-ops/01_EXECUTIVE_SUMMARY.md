# 01 — Executive Summary

**Plan:** 2026-07-07-cloudflare-queues-cron-production-ops
**Profile:** exhaustive (Cloudflare Queues/Cron/DLQ + D1 retention — high-blast-radius ops)
**Task type:** planning-only. No application code modified by this pack.
**Readiness status:** `CONDITIONALLY READY` (see README + `17`). Capped by
`verification_mode: emulated` and by three external blockers.

## What this plan delivers

A production-operations plan for Cloudflare Queues, DLQ handling, cron triggers,
upload jobs, retention jobs, and scheduled maintenance — such that a future
executor can prove the subsystem is **production-ready and documented
consistently**.

## The three concrete gaps driving this work

1. **Documentation drift (P0):** `AGENTS.md:40` says "Two cron triggers" while
   `wrangler.jsonc` declares three (the third, `30 3 * * *`, is the retention
   cron wired in `worker.ts` but invisible to the binding summary).
2. **Idempotency/DLQ proof thinness (P0):** the minute-granularity idempotency
   key only dedupes within a batch; DLQ is *predicted* (`deadLetterExpected`)
   but the `attempts < MAX_RETRIES` boundary and the consumer exception path are
   untested; worker `scheduled()`/`queue()` handlers are only source-grepped,
   never invoked in tests.
3. **Operational gaps (P0/P1):** no standalone DLQ/queue operator runbook;
   retention-target tables lack standalone `created_at` indexes (full-scan risk
   at scale); `productionJobsMessagingReady` is still `false`; the only
   retention operator doc is Supabase-era/archived.

## Headline findings

- **Architecture is sound and should NOT be rewritten.** The cron path and
  queue path share one job-execution core; retention is correctly an in-process
  daily pass (not a queue job). Decisions D-CRONSOT / D-IDEMP / D-RETPROC / D-INDEX
  keep the current shape and harden/document it.
- **One additive migration** (DB-INDEX, `0039`) resolves the retention scan risk.
  Fully reversible (`DROP INDEX`).
- **The biggest residual risks are external:** `OPEN-DEC-004` (counsel TTL
  sign-off), `OPEN-DEC-008` (hosted-proof authorization), and the 30-day
  observation gate. None block the docs/tests/index work.

## Critical decisions

- Cron source of truth = `wrangler.jsonc`, pinned by a guard test (D-CRONSOT).
- Keep per-batch minute-key dedup; downstream jobs stay idempotent (D-IDEMP).
- Add 4 standalone `created_at` indexes (D-INDEX).
- Retention stays in-process (D-RETPROC); optional `RETENTION_DRY_RUN` env gate
  recommended (D-RETDRY, owner-delegated).

## External decisions remaining

- `OPEN-DEC-004` — retention TTL counsel sign-off (Philip + counsel).
- `OPEN-DEC-007` — retention registry completeness (7/14 classes; owner).
- `OPEN-DEC-008` — hosted proof run authorization (owner).

## Scope boundaries kept

Only queues/crons bound in `wrangler.jsonc`. No new bindings, queues, crons, or
paid add-ons. No UI/auth/frontend change. No legacy Supabase mutation. All
destructive cleanup stays behind dry-run + evidence review.

## Implementation shape (see `11`)

6 phases: decisions → docs+guard test → test gaps → DB-INDEX → runbook → hosted
proof → observation. Mostly docs + tests + one additive migration. Low rollout
risk; everything reversible.

## Verification

`verification_mode: emulated` — final review was a separated pass by the lead,
not an independent agent. This caps overall readiness at 97 and the package at
`CONDITIONALLY READY` unless the owner or an independent reviewer later
approves. See `17`.

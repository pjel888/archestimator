# GLM5.2 Plan Pack Prompt: Cloudflare Queues/Cron Production Ops

Date: 2026-07-07
Target folder: `.ai/03_plans/2026-07-07-cloudflare-queues-cron-production-ops`
Mode: planning only. Create the plan pack in this folder; do not change application code.

## Goal

Create a production operations plan for Cloudflare Queues, DLQ handling, cron triggers, upload jobs, retention jobs, and scheduled maintenance.

## Evidence To Start From

- `wrangler.jsonc` declares queue bindings, a DLQ, and three cron triggers.
- `AGENTS.md` still references two cron triggers, showing documentation drift.
- `src/lib/cloudflare/upload-job-queue.ts`, `src/lib/cloudflare/scheduled-upload-jobs.ts`, and `worker.ts` contain queue/cron handling.
- Current duplicate/backpressure behavior and proof scripts appear partly dry-run/operator-observation driven.

## Required Plan Pack

Define queue job taxonomy, idempotency keys, retry/DLQ policy, cron schedule source of truth, backlog checks, operator runbook, hosted proof, alert thresholds, and failure recovery.

## Constraints

Use only queues/crons bound in `wrangler.jsonc`. Keep all destructive cleanup behind dry-run and evidence review.

## Stop Condition

The pack is complete when a future executor can prove queue and cron operations are production-ready and documented consistently.

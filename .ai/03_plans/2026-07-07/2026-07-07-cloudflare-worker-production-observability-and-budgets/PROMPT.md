# GLM5.2 Plan Pack Prompt: Cloudflare Worker Production Observability And Budgets

Date: 2026-07-07
Target folder: `.ai/03_plans/2026-07-07-cloudflare-worker-production-observability-and-budgets`
Mode: planning only. Create the plan pack in this folder; do not change application code.

## Goal

Create a production observability and runtime-budget plan for the Cloudflare Worker, OpenNext runtime, API routes, background work, and critical user flows.

## Evidence To Start From

- `wrangler.jsonc` enables observability but the app-level request/job correlation model is not complete.
- `worker.ts`, `src/instrumentation.ts`, `src/lib/perf/server-timing.ts`, and `src/lib/observability/logger.ts` show partial runtime/error telemetry.
- `src/instrumentation.ts` explicitly defers Sentry/provider registration.
- Current logs are mostly console/local proof surfaces, not an end-to-end production incident model.

## Required Plan Pack

Define request IDs, job IDs, error taxonomy, CPU/duration/subrequest/memory budgets, log sampling, privacy redaction, dashboard/alert expectations, evidence scripts, and free-tier-safe monitoring options.

## Constraints

Do not assume paid observability. Do not claim production monitoring from local logs. Keep sensitive payloads out of logs and evidence.

## Stop Condition

The pack is complete when an executor can implement runtime budgets and observability proof for Cloudflare production behavior.

# GLM5.2 Plan Pack Prompt: Production RUM And CWV Telemetry

Date: 2026-07-07
Target folder: `.ai/03_plans/2026-07-07-production-rum-and-cwv-telemetry`
Mode: planning only. Create the plan pack in this folder; do not change application code.

## Goal

Create a plan pack for privacy-safe real user monitoring and Core Web Vitals telemetry that fits the current Cloudflare/free-tier posture.

## Evidence To Start From

- `src/lib/perf/server-timing.ts` and performance scripts provide server/test signals.
- Production user-experience telemetry and CWV collection are not clearly implemented as a durable product signal.
- Bundle/route performance gates cover synthetic checks; this pack should cover real-user signal, sampling, privacy, and actionability.
- Observability plans cover server/runtime monitoring but not browser UX telemetry.

## Required Plan Pack

Define metrics, collection point, sampling, consent/privacy posture, storage/retention, dashboard format, alert thresholds, no-paid-option evaluation, and how CWV evidence informs release decisions.

## Constraints

Avoid collecting personal content or secrets. Do not add paid tooling by default. Treat this as independent from synthetic performance gates.

## Stop Condition

The pack is complete when an executor can implement useful RUM/CWV telemetry without overbuilding or violating privacy constraints.

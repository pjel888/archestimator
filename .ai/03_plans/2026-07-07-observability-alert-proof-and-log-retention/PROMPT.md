# GLM5.2 Plan Pack Prompt: Observability Alert Proof And Log Retention

Date: 2026-07-07
Target folder: `.ai/03_plans/2026-07-07-observability-alert-proof-and-log-retention`
Mode: planning only. Create the plan pack in this folder; do not change application code.

## Goal

Create a plan pack for proving alert delivery, support monitoring, error triage, redaction, and log retention before first users.

## Evidence To Start From

- `scripts/check-support-monitoring-readiness.ts` uses operator flags and does not verify inbox access, alert dashboards, incident delivery, hosted auth, or linked feedback rows.
- `src/lib/observability/logger.ts` and direct `console.error` usage need redaction and retention review.
- Compliance roadmap items reference log retention.
- Support feedback, upload proof, Cloudflare observability, and legal readiness all depend on trustworthy operational evidence.

## Required Plan Pack

Include alert scenarios, delivery proof, triage ownership, incident record format, log redaction inventory, retention TTL, evidence retention policy, tests/static checks, and launch blocking criteria.

## Constraints

No raw personal data or secrets in evidence. Separate local test proof from live alert proof. Stay within free-tier tooling unless owner approves paid services.

## Stop Condition

The pack is ready when support and alert readiness can be proven without hand-wavy operator claims.

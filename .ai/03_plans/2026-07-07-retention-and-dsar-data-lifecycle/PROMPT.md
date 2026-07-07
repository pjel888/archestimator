# GLM5.2 Plan Pack Prompt: Retention And DSAR Data Lifecycle

Date: 2026-07-07
Target folder: `.ai/03_plans/2026-07-07-retention-and-dsar-data-lifecycle`
Mode: planning only. Create the plan pack in this folder; do not change application code.

## Goal

Create a plan pack that makes retention policy and DSAR execution real across D1, R2, logs, feedback, shares, proposals, and operational evidence.

## Evidence To Start From

- `.ai/10_state/compliance/retention-schedule.md` and current-state fast path record retention work still open.
- `src/lib/compliance/retention-core.ts`, `src/lib/cloudflare/scheduled-upload-jobs.ts`, `worker.ts`, and migration `0034` contain partial retention/cron pieces.
- Privacy request intake exists, but full data-class propagation and deletion/export proof are not complete.
- Log retention and support feedback handling overlap with observability and support-readiness work.

## Required Plan Pack

Include data inventory, retention TTL decisions, DSAR export/delete workflow, cron proof, R2 deletion proof, log retention boundaries, evidence format, legal-owner signoff points, and tests.

## Constraints

Do not invent legal commitments; identify owner decisions explicitly. Do not claim compliance from code-only checks.

## Stop Condition

The pack is complete when it defines the exact implementation and proof needed for retention and DSAR readiness.

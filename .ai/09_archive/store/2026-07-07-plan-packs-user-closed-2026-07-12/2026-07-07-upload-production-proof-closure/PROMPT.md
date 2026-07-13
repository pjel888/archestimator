# GLM5.2 Plan Pack Prompt: Upload Production Proof Closure

Date: 2026-07-07
Target folder: `.ai/03_plans/2026-07-07-upload-production-proof-closure`
Mode: planning only. Create the plan pack in this folder; do not change application code.

## Goal

Create a closure plan for upload production proof: deployment readback, hosted upload operations, live scanner proof, alerts, dashboard evidence, backpressure, and retention runbook.

## Evidence To Start From

- `scripts/check-upload-production-proof-evidence.ts` lists production proof requirements.
- `scripts/verify-upload-production-observations.ts` records sanitized operator observations only when proof inputs are provided.
- `scripts/prove-upload-clamd-live.ts`, `scripts/verify-hosted-upload-operations.ts`, and upload queue/cron scripts cover adjacent proof.
- Upload readiness spans API routes, R2 storage, queue processing, retention, and support monitoring.

## Required Plan Pack

Define every missing proof artifact, expected command/operator input, evidence schema, failure interpretation, remediation sequence, and launch gate integration.

## Constraints

Do not fake hosted proof. Keep file contents and secrets out of evidence. Separate upload architecture changes from proof-closure requirements.

## Stop Condition

The pack is complete when an executor can close upload readiness with auditable production evidence.

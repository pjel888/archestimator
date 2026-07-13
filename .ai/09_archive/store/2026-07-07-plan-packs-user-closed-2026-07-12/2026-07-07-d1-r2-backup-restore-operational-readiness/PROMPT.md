# GLM5.2 Plan Pack Prompt: D1/R2 Backup Restore Operational Readiness

Date: 2026-07-07
Target folder: `.ai/03_plans/2026-07-07-d1-r2-backup-restore-operational-readiness`
Mode: planning only. Create the plan pack in this folder; do not change application code.

## Goal

Create an operational backup/restore plan pack for D1 data and R2 objects that is practical for the current free-tier Cloudflare posture.

## Evidence To Start From

- `AGENTS.md` references daily D1 backups and `cf:d1-restore-rehearsal`.
- `scripts/cf-d1-restore-rehearsal.mjs` and related package scripts exist.
- R2 uploads are active through `ARCH_UPLOADS_R2`, upload storage providers, and upload proof scripts.
- No single pack proves restore target isolation, R2 object inventory, object restoration, RTO/RPO, and operator runbook readiness.

## Required Plan Pack

Include D1 backup assumptions, restore rehearsal procedure, safe target isolation, R2 inventory/export/restore strategy, RTO/RPO targets, failure drills, evidence artifacts, and what is impossible to prove locally.

## Constraints

Use only Cloudflare resources bound in `wrangler.jsonc`. Keep costs inside free-tier/bundled limits unless a future owner explicitly approves otherwise.

## Stop Condition

The pack is complete when a future executor can run or simulate a recovery drill and know exactly what evidence proves restore readiness.

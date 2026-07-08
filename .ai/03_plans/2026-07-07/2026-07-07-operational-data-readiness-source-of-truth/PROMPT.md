# GLM5.2 Plan Pack Prompt: Operational Data Readiness Source Of Truth

Date: 2026-07-07
Target folder: `.ai/03_plans/2026-07-07-operational-data-readiness-source-of-truth`
Mode: planning only. Create the plan pack in this folder; do not change application code.

## Goal

Create a plan pack that eliminates operational source-of-truth drift across `AGENTS.md`, `.ai/10_state/current-state.md`, `wrangler.jsonc`, migrations, scripts, and provider proof docs.

## Evidence To Start From

- `AGENTS.md` references 29 migrations/latest `0029`, while `migrations/` contains later files through `0036`.
- `AGENTS.md` lists two cron triggers, while `wrangler.jsonc` declares three.
- Current-state, provider-exit proof, retention docs, and release scripts all hold overlapping readiness facts.
- Drift makes future agents and GLM plan packs vulnerable to stale assumptions.

## Required Plan Pack

Define canonical facts, generated check scripts, update protocol, stale-doc detection, evidence locations, agent handoff rules, and a small recurring audit.

## Constraints

Do not use this plan to rewrite unrelated docs. Keep scope to operational truth needed for production readiness and agent safety.

## Stop Condition

The pack is complete when future agents can discover current operational reality quickly and stale facts are detectable.

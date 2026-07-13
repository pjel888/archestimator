# GLM5.2 Plan Pack Prompt: Provider Exit Final Proof Closure

Date: 2026-07-07
Target folder: `.ai/03_plans/2026-07-07-provider-exit-final-proof-closure`
Mode: planning only. Create the plan pack in this folder; do not change application code.

## Goal

Create a plan pack that closes the historical Supabase provider-exit work with explicit proof, accepted gaps, rollback posture, and post-exit smoke checks.

## Evidence To Start From

- `AGENTS.md` says Supabase project `ebxxqidacheyapmmzavr` is historical evidence only and must not be mutated.
- `.ai/10_state/current-state.md` fast path records provider-exit readiness as not yet final.
- `scripts/generate-cloudflare-provider-exit-pack.ts` checks operator evidence but cannot itself prove external provider state.
- Cloudflare is the active substrate via `wrangler.jsonc`, D1/R2/DO/Queues/Cron/Email bindings, and `migrations/`.

## Required Plan Pack

Define the final provider-exit proof checklist, Supabase export/retention decision, Cloudflare smoke checks, data-loss acceptance rules, operator evidence format, rollback/no-rollback decision record, and a safe no-mutation verification path.

## Constraints

Do not mutate Supabase or unrelated Cloudflare projects. Keep secrets out of the repo. Distinguish local evidence, hosted Cloudflare evidence, and owner/operator attestations.

## Stop Condition

The pack gives a future executor a precise way to mark provider exit complete, or to identify the exact external proof still blocking completion.

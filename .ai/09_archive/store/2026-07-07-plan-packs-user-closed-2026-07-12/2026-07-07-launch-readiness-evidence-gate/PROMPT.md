# GLM5.2 Plan Pack Prompt: Launch Readiness Evidence Gate

Date: 2026-07-07
Target folder: `.ai/03_plans/2026-07-07-launch-readiness-evidence-gate`
Mode: planning only. Create the plan pack in this folder; do not change application code.

## Goal

Create a production-readiness plan pack that turns Archestimator launch readiness into a single evidence gate for first users. The pack should define the minimum go/no-go criteria, required proofs, owner-visible status, and release-blocking failures.

## Evidence To Start From

- `package.json` has many proof scripts, but `validate` is narrower than the launch surface.
- `.github/workflows/ci.yml` runs build, tests, and advisory performance checks, but legal/provider/support/security gates are not one unified launch gate.
- `scripts/check-cloudflare-release-gates.ts`, `scripts/check-legal-owner-readiness.ts`, `scripts/check-support-monitoring-readiness.ts`, and `scripts/generate-cloudflare-provider-exit-pack.ts`.
- `.ai/10_state/current-state.md` fast path records open launch, legal, provider-exit, and evidence gaps.

## Required Plan Pack

Include a launch readiness matrix, hard blockers vs advisory warnings, exact scripts/provider proofs, CI integration options, evidence file locations, rollback criteria, and a staged path from local proof to hosted proof.

## Constraints

Follow `AGENTS.md`; keep work inside Cloudflare-bound resources; do not mutate historical Supabase projects; do not enable paid Cloudflare features; do not claim provider proof from local-only checks.

## Stop Condition

The pack is complete when GLM5.2 has created review-ready plan documents that an executor can use to implement the launch gate without re-discovering the production-readiness surface.

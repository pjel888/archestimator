---
name: archestimator-cloudflare-config-drift
description: "Detect and reconcile Archestimator Cloudflare configuration drift across Wrangler bindings, Worker entrypoints, OpenNext and Next config, local development config, generated environment types, scripts, and runtime consumers. Do not use for application behavior unrelated to config drift, deploy by default, or mutate remote, paid, unrelated, or unbound resources without explicit authority."
---

# Archestimator Cloudflare Config Drift

## Authority

- Read `AGENTS.md` and `.ai/00_system/VALIDATION_MATRIX.md`.
- Treat current `wrangler.jsonc` as executable provider truth. Compare it with `worker.ts`, `open-next.config.ts`, `next.config.ts`, `wrangler.next-dev.jsonc`, `package.json`, generated environment types when present, and exact runtime consumers.
- Read the source of any `cf:*` checker before running it; command names alone do not prove that a script is local, static, non-mutating, or network-free.

## Workflow

1. State the suspected drift, canonical source, derived artifacts or consumers, authorized evidence, and stop condition.
2. Inspect `git status --short --branch`. Inventory only the affected binding, route, cron, queue, Durable Object, asset, image, email, D1, R2, compatibility, or variable path. For broad, high-risk, or unfamiliar shared-symbol changes, use available Code Review Graph or GitNexus impact analysis when configured; for narrow reversible work, targeted source, `rg`, and LSP inspection is sufficient.
3. Reconcile outward from `wrangler.jsonc`: Worker exports and handlers, local development config, environment typing, package scripts, readiness checks, and runtime consumers must agree with the intended binding contract.
4. Regenerate derived types through the repository command when appropriate; do not hand-edit generated output. Preserve secrets and environment-specific identifiers, and never copy private values into source or reports.
5. Make the smallest coherent correction. Do not duplicate provider truth in a new manifest or preserve stale bindings through compatibility code without a current obligation.

## Boundaries

- Stay on the current branch and shared worktree. Do not reset, clean, stash, revert, commit, push, or overwrite unfamiliar config work.
- Change only resources bound by current `wrangler.jsonc` and authorized by `AGENTS.md`. Never touch legacy `supabase/migrations/`, unrelated Cloudflare projects, paid add-ons, DNS, secrets, production traffic, destructive provider state, or deployment without explicit authority.
- Default to `NOT_REQUIRED`. Do not run tests, builds, preview, deploy, browser automation, screenshots, Storybook, or visual QA unless explicitly requested. Prefer static parsing and focused diffs; use `TEST_PROPOSAL` for stronger gated proof.

## Evidence And Stop

- Prove each corrected name or shape from the canonical manifest through its current consumers. Run only clearly static, local validators within task authority; label local presence checks separately from hosted provider health.
- Stop when the canonical config, derived artifacts, entrypoints, scripts, and affected consumers agree, no secret or unrelated resource changed, and any remote or hosted gap is explicit.

# 10 — Blast Radius and Dependencies

## Summary

The harness is **additive and disjoint** from application source. Direct impact is confined to new files under `e2e/`, `scripts/e2e/`, `.env.e2e.example`, and this plan folder. A small set of existing files get **additive** edits (config + scripts + docs). No application behavior changes except optional minimal `data-*` testids (gated per-task).

## Direct impact

| File / surface | Change | Classification | Risk |
|---|---|---|---|
| `e2e/smoke/*.spec.ts` (15 new) | create | Required change | low — new files |
| `e2e/fixtures/*` (new) | create | Required change | low |
| `e2e/helpers/*` (new) | create | Required change | low |
| `e2e/globalSetup.ts`, `globalTeardown.ts` (new) | create | Required change | medium — orchestrates seed/probe |
| `scripts/e2e/seed-local.ts`, `reset-local.ts`, `sql/*.sql` (new) | create | Required change | medium — touches local preview D1 |
| `.env.e2e.example` (new) | create | Required change | low |
| `e2e/README.md` (new runbook) | create | Required change | low |
| `playwright.config.ts` | add `globalSetup`/`globalTeardown`, `retries`, `@smoke`/`@quarantine` projects | Probable change | medium — config affects all e2e |
| `package.json` | add `test:e2e:smoke`, `e2e:seed`, `e2e:reset`, `test:e2e:smoke:local` scripts | Probable change | low — additive scripts |
| `.env.example` | add `ARCHESTIMATOR_E2E_SMOKE` umbrella doc + pointer to `.env.e2e.example` | Probable change | low — additive docs |
| `.github/workflows/e2e-smoke.yml` (new) | create (CI reactivation) | Required change (CI) | medium — reactivates CI |
| `e2e-smoke-baseline.json`, manifest outputs | create/emit | Required change | low |
| app components (per-flow, optional `data-*` testid) | additive attribute | Possible change (gated per-task) | low — scoped, reversible |

## Transitive impact

- **Existing 9 e2e specs:** **Explicitly unaffected.** New `@smoke` project + config additions must not change their behavior. Executor validates by running the existing specs alongside smoke (they should still pass/skip as before). Risk: a `playwright.config.ts` edit that changes `testDir`/`projects` matching — mitigated by additive-only config changes + a regression check.
- **Vitest suite:** **Explicitly unaffected.** `vitest.config.ts` excludes `e2e`; no overlap.
- **Application runtime:** **Explicitly unaffected** except optional testids. Smoke reads/writes local preview D1/R2 only.
- **Remote `ARCH_DB` / production R2:** **Explicitly unaffected** — seed/reset are `--local` only, sentinel-scoped.
- **CI:** reactivates E2E in `.github/workflows/`. Other disabled workflows (`codeql.yml`, `dependabot.yml`, `react-doctor.yml`) are **not** re-enabled by this plan (separate owner decision).
- **package scripts:** additive; existing `test:e2e`/`test:e2e:perf` unchanged.
- **Cloudflare bindings:** none added/removed; `wrangler.jsonc`/`wrangler.next-dev.jsonc` unchanged.
- **Migrations:** none (D-6).
- **Better Auth / publication / upload runtime code:** unchanged.

## Compatibility

- Playwright `^1.60.0` supports `globalSetup`, `retries`, custom fixtures, `grepTags` — no version bump needed.
- `@opennextjs/cloudflare ^1.20.1` `getCloudflareContext` already used — no change.
- Bun 1.3.x runs the seed scripts (TypeScript via `bun run`).

## Documentation affected

| Doc | Update needed? |
|---|---|
| `README.md` (repo root) | Optional: add a "Running E2E smoke" line pointing to `e2e/README.md` |
| `.env.example` | Yes (additive, ARCH-ENV1) |
| `AGENTS.md` | No (policy unchanged; smoke honors existing rules) |
| `.ai/10_state/current-state.md` | Executor appends an entry at harness completion (standard practice) |
| Existing plan packs | No |

## Affected features / concurrent work

- The harness observes many features (auth, projects, estimates, library, publication, share, uploads, feedback). None are modified. Concurrent feature work in those areas is **not blocked** by the harness (it only adds test files + local data). If a feature changes a selector the smoke depends on, the smoke fails loudly — which is the desired signal.
- Shared-worktree safety: all new files are under disjoint paths; the few edited files (`playwright.config.ts`, `package.json`, `.env.example`) are coordinated via fresh `git status` + re-read-before-edit per AGENTS.md §6.

## Rollback

- **Harness rollback:** delete `e2e/smoke/`, `e2e/fixtures/`, `e2e/helpers/`, `e2e/globalSetup.ts`, `globalTeardown.ts`, `scripts/e2e/`, `.env.e2e.example`, the CI workflow; revert the additive `playwright.config.ts`/`package.json`/`.env.example` hunks. Fully reversible.
- **Data rollback:** `bun run e2e:reset` clears smoke rows from local preview D1 + preview R2 prefix.
- **No remote state** to roll back.

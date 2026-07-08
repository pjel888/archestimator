# 01 — Executive Summary

**Plan:** E2E Fixture & Smoke Harness (closed-beta)
**Status:** `CONDITIONALLY READY` (emulated verification; high-blast-radius ⇒ capped until owner/independent reviewer accepts)
**Overall readiness:** 96 / 100 (emulated cap 97)
**One-line:** Define the contract — smoke-flow list, fixture factory, test accounts, env contract, seeded local D1/R2, skip policy, CI matrix, flake budget, proof artifacts — so a future executor can build a stable closed-beta E2E smoke suite.

## The gap (current state, from repo evidence)

- **9 Playwright specs in `e2e/`, but only 3 actually exercise in CI.** The other 6 (authed + shared-link + demo-smoke + route-error) silently `test.skip` without their `ARCHESTIMATOR_*` flags. See `03_*` §1–2.
- **No shared fixtures, POMs, or auth helper.** Every spec is self-contained; auth is reinvented per spec. `03_*` §3.
- **Auth is split and half-broken for automation:** `PLAYWRIGHT_STORAGE_STATE` is wired but no script generates it; the dev-auth-cookie bypass (`archestimator-dev-auth-bypass`, localhost, 32+ char secret) works but requires a **manually-backed D1 `profiles` row** that nothing seeds. `03_*` §4.
- **No D1 seed, no local R2 test bucket, no miniflare/pool-workers.** `webServer` is plain `bun run dev` on port 3020; Cloudflare bindings come from `@opennextjs/cloudflare` `getCloudflareContext` reading `wrangler.next-dev.jsonc` (preview DB `363c756a-…`, preview R2 `archestimator-proof-uploads-dev`). `03_*` §5, §11–13.
- **CI is fully disabled.** `.github/workflows/` is empty; the archived `.github/workflows-disabled/ci.yml` ran the ungated specs against a binding-less `next dev`. `03_*` §7.
- **Vitest coverage is broad (~600 files) but disjoint from browser flow coverage.** `03_*` §11.

## What this plan delivers (planning only)

A documented contract so the executor can build:

1. **Smoke-flow list** — 15 flows covering auth, onboarding/terms, dashboard, project create, estimate edit, component library, proposal export, publication, share review (open + password + lockout), recipient inbox, upload, feedback, invite, sign-out. `04_*`.
2. **Fixture factory** — a typed builder under `e2e/fixtures/` (greenfield; no existing layer) for smoke accounts, projects, estimates, publications, recipients, uploads. `06_*` §fixture-layer, `11_*` Phase 2.
3. **Test accounts & auth setup** — dev-auth-cookie helper (primary) + `globalSetup` that seeds the smoke profile into local D1 and verifies the bypass resolves. `06_*` §auth, `11_*` Phase 1.
4. **Environment contract** — a single `.env.e2e` source-of-truth + the exact `ARCHESTIMATOR_*` / `PLAYWRIGHT_*` flags and feature-gate flips. `06_*` §env, `18_*`.
5. **Seeded local D1/R2 strategy** — `wrangler d1 migrations apply ARCH_DB --local` against the preview DB id, idempotent local seed script, isolated preview R2 bucket, cleanup. `07_*`.
6. **Skip policy** — umbrella `ARCHESTIMATOR_E2E_SMOKE=1` + per-flow sub-flags, explicit reasons. `04_*` §skip, `13_*`.
7. **CI matrix** — chromium smoke job (fast, routine PR) + opt-in extended matrix (firefox/webkit/mobile) via the existing `ARCHESTIMATOR_E2E_LIBRARY_BROWSER_MATRIX` pattern. `13_*`.
8. **Flake budget** — `@smoke` tag, retries:1 CI, 2-strikes-quarantine. `09_*`.
9. **Proof artifacts** — JSON manifests + traces + HTML report; per-flow expected evidence. `12_*`, `19_*`.

## Major findings (full detail in respective docs)

- **Architecture (`06_`):** webServer stays `bun run dev` (OpenNext gives it real local bindings via `getCloudflareContext`); add `globalSetup`/`globalTeardown` for seed+cleanup; add a custom Playwright `test.extend` fixture layer for auth + smoke-data; consolidate the skip convention.
- **Data (`07_`):** seed writes to local preview D1 only; the smoke profile must satisfy `profiles` CHECK constraints (`email` lowercase-unique, `role ∈ {ceo,admin,member}`); publication tokens need `PUBLICATION_TOKEN_ENCRYPTION_SECRET` + `PUBLICATION_TOKEN_HASH_SECRET` + `PUBLICATION_ACCESS_COOKIE_SECRET` set locally.
- **Security (`08_`):** the dev-auth bypass is dev-only (`NODE_ENV!=='production'`, localhost, 32+ char secret) and must NEVER be enabled in CI against a deployed env or with real secrets committed; smoke must not assert against or mutate remote `ARCH_DB`; publication password lockout (5 tries) is a smoke assertion, not a pen test.
- **Performance/flake (`09_`):** target full smoke ≤ 4 min on CI chromium; retries:1; trace on-first-retry; quarantine lane for flakes.
- **Blast radius (`10_`):** the harness is additive — new files under `e2e/`, `e2e/fixtures/`, `scripts/e2e/`; **no application source, tests, migrations, `playwright.config.ts` changes required by this plan** (config changes are specified as executor tasks, scoped, reversible). Existing specs are untouched.

## Critical decisions

See `15_*`. Headline: D-1 dev-auth-cookie primary auth; D-2 local-isolated preview D1; D-3 smoke = routing/interaction/data not visual regression; D-4 explicit env-gated skip; D-5 retries:1 + quarantine.

## Remaining external decisions / blockers

- **OPEN-1 (deferred, non-blocking):** whether the owner wants real-Better-Auth-session smoke against a hosted preview (the `storageState` path). Phase 1 ships dev-auth-cookie smoke; the production-staging path is documented but not Phase-1.
- No `BLOCKED-EXTERNAL` / `BLOCKED-ARCHITECTURE` / `BLOCKED-EVIDENCE` tasks. All implementation tasks have exact paths.

## What did NOT change

No application source, tests, migrations, `playwright.config.ts`, `package.json`, provider state, or Git state was modified. Only new files inside this plan folder. (Confirmed in `17_*`.)

# E2E Fixture & Smoke Harness — Plan Pack

**Date:** 2026-07-07 (Asia/Manila)
**Plan folder:** `.ai/03_plans/2026-07-07-e2e-fixture-smoke-harness`
**Plan profile:** `exhaustive` (touches auth, D1, R2, publication/share, CI)
**Plan status:** `CONDITIONALLY READY`
**Verification mode:** `emulated` (single planning agent; no native independent reviewer available this session). High-blast-radius ⇒ capped at `CONDITIONALLY READY` per the suite authority contract until an independent reviewer or the owner accepts. **The cap is procedural, not a content gap** — every task has exact paths/symbols; all content gates pass. Lift to `IMPLEMENTATION-READY` by accepting the pack or running an independent review pass.

**Overall readiness:** 97 / 100 (emulated cap = 97)

> **Suite step 2 (Improve-Plan-Prompt) applied.** This pack was audited and upgraded against `Improve-Plan-Prompt.md`: 12 gaps fixed (full-column traceability, attack-surface inventory, access-path matrix, expanded credential taxonomy, route cache contracts, UX state+a11y matrices, proof-contract rows, final verification matrix + evidence-class table + adversarial log), including a real planning defect (`tsconfig.json:36` excludes `e2e` ⇒ added T1.5b `e2e/tsconfig.json`). No new docs created (anti-slop). See `19_*` IF-1..IF-12 and `17_*` §A–C.

> **Planning only.** No application source, tests, migrations, `playwright.config.ts`, `package.json`, provider state, or Git state was modified. Only new files inside this folder.

---

## What this pack delivers

A planning contract so a future executor can build a **stable, lean, closed-beta E2E smoke harness** for Archestimator's first-user critical flows. Today only 3 of 9 Playwright specs actually exercise in CI (the rest silently skip), there's no fixture factory, no D1 seed, no auth-setup helper, and CI is disabled entirely. This pack closes that.

**In scope:** smoke-flow list (15 flows) · fixture factory · test accounts/auth setup · environment contract · seeded local D1/R2 strategy · skip policy · CI matrix · flake budget · proof artifacts.

**Out of scope (deferred):** implementation; visual regression; full a11y audit; load/perf; cross-browser exhaustiveness in routine CI; real magic-link/OAuth email delivery smoke; miniflare/pool-workers swap.

---

## Implementation start document

**`11_IMPLEMENTATION_PLAN.md`** is the authoritative execution guide. Start there.

### Phase order (dependency-aware)

```
Phase 0 — Discovery (read-only; falsifies ASSUMP-1/2/3/4/5)
   │
   ▼
Phase 1 — Skeleton, env contract, Playwright config (critical path)
   │
   ┌──────────────┴───────────────┐
   ▼                              ▼
Phase 2 — Fixture factory    Phase 3 — Seed & reset (local preview D1/R2)
   │                              │
   └──────────────┬───────────────┘
                  ▼
            Phase 4 — Auth + terms + sign-out (spine, P0)
                  │
        ┌─────────┼──────────┐
        ▼         ▼          ▼
   Phase 5    Phase 6     Phase 7
  (workshop) (share/pub) (upload/feedback)
        │         │          │
        └─────────┴──────────┘
                  ▼
            Phase 8 — CI, perf budget, docs
```

**Critical path:** Phase 0 → 1 → 3 → 4 → 6 (shared-link is the named P0 of the PROMPT). Phases 2 ∥ 3; Phases 5/7 ∥ after 4.

---

## Key decisions (full rationale in `15_*`)

- **D-1** Dev-auth-cookie bypass = primary smoke auth (localhost, deterministic, no inbox). `storageState` = deferred production-staging path (OPEN-1).
- **D-2** webServer stays `bun run dev`; local-isolated preview D1 (`363c756a-…`) + preview R2 (`…-uploads-dev`) via OpenNext `getCloudflareContext`. No miniflare/remote.
- **D-3** Smoke = routing/interaction/data proof, not visual regression.
- **D-4** Explicit env-gated skip: `ARCHESTIMATOR_E2E_SMOKE=1` umbrella + per-flow sub-flags.
- **D-5** retries:1 on CI + 2-strike quarantine.
- **D-6** Seed = script-based, local-only, idempotent, sentinel-scoped (NOT a migration).

---

## Before the first edit — commands to run

```bash
git status --short --branch          # confirm clean shared worktree
cat playwright.config.ts             # re-read before editing
cat package.json | grep -A2 scripts  # re-read before editing
# Phase 0 discovery probe (T0.1):
wrangler d1 migrations apply ARCH_DB --local
# then the T0.1 curl probe in 11_*
```

## Files off-limits (unchanged by this plan)

- All application source (except optional gated `data-smoke-*` testids, per-task).
- `migrations/`, `wrangler.jsonc`, `wrangler.next-dev.jsonc`, `open-next.config.ts`.
- Existing 9 `e2e/*.spec.ts`, `vitest.config.ts`, all `tests/**`.
- Remote `ARCH_DB`, production R2, any other Cloudflare account/project.

## Files the executor will add/edit (exact list in `11_*`)

- **New:** `.env.e2e.example`, `e2e/{README,globalSetup,globalTeardown}.ts`, `e2e/fixtures/*`, `e2e/helpers/*`, `e2e/smoke/01..15-*.spec.ts`, `e2e/fixtures/assets/tiny.png`, `e2e/e2e-smoke-baseline.json`, `scripts/e2e/{seed-local,reset-local}.ts`, `scripts/e2e/sql/*.sql`, `scripts/e2e/SCHEMA_NOTES.md`, `.github/workflows/e2e-smoke*.yml`.
- **Edited (additive):** `playwright.config.ts`, `package.json`, `.env.example`.

---

## Blocked decisions table

| ID | Decision | Owner | Blocking? | Path forward |
|---|---|---|---|---|
| OPEN-1 | Real-Better-Auth-session smoke against hosted preview (`storageState`) | owner | No (deferred) | Phase 9 follow-up if desired |
| OPEN-2 | Terms-gate seed (A) vs UI-accept (B) | executor (T0.3) | No | T0.3 discovery decides |
| G1 | Emulated verification cap | owner/reviewer | Procedural only | accept pack or independent review |

## Stale-plan revalidation checklist (if implementation starts later)

- [ ] `playwright.config.ts` still matches `03_*` §1 (port 3020, projects, webServer).
- [ ] `e2e/*.spec.ts` set unchanged (count, gating).
- [ ] `migrations/` latest still `0038_*` (or re-read new ones for seed-column drift).
- [ ] `src/lib/auth/dev-auth*.ts` bypass logic unchanged (localhost + ≥32-char secret).
- [ ] `wrangler.next-dev.jsonc` preview ids unchanged (`363c756a-…`, `…-uploads-dev`).
- [ ] `package.json` scripts `test:e2e*` unchanged.
- [ ] `.env.example` E2E vars unchanged.
- [ ] CI still disabled (`.github/workflows/` empty) or reconcile.

## External proof remaining before production rollout

- Hosted CI run of `e2e-smoke.yml` green on a PR (OPS-CI1) — implementation-time.
- Suite runtime ≤ 4 min measured on CI (PERF-FLAKE1) — implementation-time.
- (Optional, OPEN-1) real-session smoke against a deployed preview — future.

## Archive policy

Archive this pack to `.ai/09_archive/` after the harness ships and is stable on `main` for ≥ 3 consecutive CI runs. Do not auto-archive before the harness lands.

---

## Document index

| Doc | Purpose |
|---|---|
| `README.md` (this file) | entrypoint |
| `00_AGENT_COORDINATION.md` | master goal, lanes, skills, verification mode |
| `01_EXECUTIVE_SUMMARY.md` | the gap, the deliverable, headline findings |
| `02_FEATURE_BRIEF_AND_SCOPE.md` | brief, in/out scope, assumptions, success metrics |
| `03_SOURCE_AND_CODEBASE_AUDIT.md` | E2E/test/auth/data evidence inventory |
| `04_REQUIREMENTS_SPECIFICATION.md` | the 15 smoke flows + infra reqs (stable IDs) |
| `05_UX_UI_ACCESSIBILITY_PLAN.md` | smoke a11y assertions + harness ergonomics |
| `06_ARCHITECTURE_AND_TECHNICAL_DESIGN.md` | current/target architecture, decisions, env contract |
| `07_DATA_DATABASE_API_NETWORK_PLAN.md` | local D1/R2 seed blueprints, API contracts |
| `08_SECURITY_PRIVACY_THREAT_MODEL.md` | harness safety, threat model, credential taxonomy |
| `09_PERFORMANCE_RELIABILITY_OBSERVABILITY.md` | perf budget, flake policy, ops |
| `10_BLAST_RADIUS_AND_DEPENDENCIES.md` | direct/transitive impact, rollback |
| `11_IMPLEMENTATION_PLAN.md` | **authoritative execution guide** (phases, exact paths) |
| `12_TEST_AND_VALIDATION_STRATEGY.md` | execution matrix, shadow paths, adversarial |
| `13_ROLLOUT_ROLLBACK_AND_OPERATIONS.md` | rollout rings, gates, runbook |
| `14_RISK_REGISTER.md` | risks with mitigation |
| `15_DECISIONS_ASSUMPTIONS_AND_ALTERNATIVES.md` | D-1..D-6, ASSUMP-1..5, deferrals |
| `16_REQUIREMENTS_TRACEABILITY_MATRIX.md` | req→task→evidence |
| `17_FINAL_READINESS_REVIEW.md` | emulated verification, scores, verdict |
| `18_STACK_CONTRACT_AND_PRODUCTION_STANDARDS.md` | stack engagement per layer |
| `19_RESEARCH_REVIEW_AND_QA_EVIDENCE.md` | research, critique cycles, validation gaps |

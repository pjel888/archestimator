# 00 — Agent Coordination

**Plan folder:** `.ai/03_plans/2026-07-07-e2e-fixture-smoke-harness`
**Date:** 2026-07-07 (Asia/Manila)
**Plan profile:** `exhaustive` (touches auth, D1, R2, publication/share, CI/release)
**Plan status:** see `README.md`
**Verification mode:** `emulated` — single planning agent; no native independent reviewer lane was available in this session. High-blast-radius pack ⇒ capped at `CONDITIONALLY READY` per the suite authority contract until an independent reviewer or the owner accepts.

---

## Master goal

Create a **planning-only** pack that lets a future executor implement a stable, lean, closed-beta **E2E smoke harness** for Archestimator's first-user critical flows.

**User/business outcome.** Before closed-beta exposure, every first-user critical flow (auth → onboarding/terms → project create → estimate edit → proposal export → share/publication review → recipient inbox → upload → support feedback) must have an automated, deterministic, fast-enough-for-routine-CI smoke proof. Today only 3 of 9 Playwright specs actually exercise in CI (the rest silently skip), there is no fixture factory, no D1 seed, no auth setup helper, and CI is disabled entirely.

**Problem being solved.** E2E coverage is brittle and mostly dormant: auth is split between an unused `PLAYWRIGHT_STORAGE_STATE` path (no generator) and the dev-auth-cookie bypass (requires a manually-backed D1 `profiles` row); there is zero shared fixture/POM/login-helper layer; there is no local D1/R2 test-double strategy; and the CI job that exists runs against a binding-less `next dev` with no gating env. A future implementer has no contract to build against.

**Planning scope.** Define: (1) the smoke-flow list; (2) a fixture factory; (3) test accounts/auth setup; (4) the environment contract; (5) a seeded local D1/R2 strategy; (6) skip policy; (7) CI matrix; (8) flake budget; (9) proof artifacts.

**Non-goals.**
- Implementing the harness (planning only).
- Touching application source, tests, migrations, `playwright.config.ts`, or `package.json`.
- Full regression/visual-regression coverage (smoke only — prove routing/interaction/data, not pixel parity).
- Load/perf testing (covered by existing `route-transition-performance.spec.ts` + `perf:*` scripts).
- A11y audit depth (a11y is smoke-only: keyboard reach + visible focus on the covered flows).
- Provider migration, paid add-ons, or prod/preview mutation.

**Codebase analysis required.** (done — see `03_SOURCE_AND_CODEBASE_AUDIT.md`): `playwright.config.ts`, `e2e/*.spec.ts`, `vitest.config.ts`, `tests/` layout, `src/lib/auth/dev-auth*`, `src/proxy.ts`, `wrangler.jsonc` + `wrangler.next-dev.jsonc`, `@opennextjs/cloudflare` `getCloudflareContext` usage, `migrations/0003_profiles.sql`, `package.json` scripts.

**Specialist workstreams covered (emulated as separated passes):** Product/scope, codebase/test architecture, React/Next/Cloudflare platform, data/D1/R2/seed, security/auth, performance/flake, test/QA strategy, ops/CI/rollout, blast radius, adversarial gap analysis, final verification.

**Implementation-readiness criteria.** A future executor can implement a stable closed-beta E2E smoke suite from this pack without rediscovering requirements, fixtures, env, seed strategy, skip policy, or CI shape.

**Validation criteria.** Every smoke flow maps to a concrete route + fixture + auth path + command + flake policy; the env contract is complete; the seed strategy is local-isolated and reversible; the CI matrix fits a routine PR run; adversarial/shadow-path coverage is specified for runtime flows.

**Stop condition (planning).** Pack is complete when the executor-facing contract (smoke-flow list, fixture factory, test accounts, env contract, seeded D1/R2 strategy, skip policy, CI matrix, flake budget, proof artifacts) is fully specified with codebase-grounded evidence and an honest readiness verdict.

**Deliverables.** The 20-document exhaustive pack in this folder (`README.md` is the entrypoint; `11_IMPLEMENTATION_PLAN.md` is the execution guide).

---

## Skills & repository instructions used

| Skill / instruction | Why relevant | Used how |
|---|---|---|
| `AGENTS.md` (workspace root) | Authority: shared-worktree policy, Cloudflare-resource mandate, verification proportionality, no auto-branch | Honored: planning-only, no branch/worktree, no provider mutation, proportional verification |
| `.ai/00_system/AGENT_OPERATING_PROTOCOL.md` | Loop activation + bounds | Confirms plan-pack warranted (high-blast-radius: auth+D1+R2+publication) |
| `archestimator-plan-pack` skill | Binds generic planning to `.ai/03_plans/<date>-<slug>/` + dated-pack requirement for high-blast-radius work | Confirms `exhaustive` profile + dated folder |
| `Creating-Plan-Prompt.md` / `Multi-Agent-Execution-Directive.md` | Authoritative planning suite contract | Drives doc set, readiness scoring, verification-mode caps |
| `Explore` subagent lanes (3) | Parallel read-only codebase/test/platform inventory | Produced the evidence in `03_*`, `07_*`, `12_*` |
| Cloudflare stack knowledge (Next 16 / OpenNext / D1 / R2 / Better Auth) | `getCloudflareContext` in `next dev`, preview DB IDs, dev-auth bypass | Grounds `06_*`, `07_*`, `18_*` |

**Unavailable capabilities honestly recorded:** no native independent reviewer lane in this session ⇒ `verification_mode: emulated`. Playwright/browser execution was NOT run (planning-only); the harness's own proof artifacts are **specified** for the future executor, not produced here.

---

## Lanes (emulated as separated passes by the single planning agent)

| Lane | Role | Scope | Dependencies | Findings location | Status |
|---|---|---|---|---|---|
| L1 Lead/Synthesis | Coordinator | Scope, integration, final claim, readiness | all | whole pack | done |
| L2 E2E/Playwright inventory | Explore agent | `playwright.config.ts`, `e2e/*.spec.ts`, CI | none | `03_*` §1–7 | done |
| L3 Routes & flows inventory | Explore agent | `src/app/**`, proxy, auth, publication | none | `03_*` §8–10, `04_*` smoke list | done |
| L4 Test/fixture/db-seed inventory | Explore agent | vitest, tests, fixtures, D1 seed, R2, scripts | none | `03_*` §11–16, `07_*` | done |
| L5 Data/D1/R2 planner | Synthesis | local D1 preview DB, seed SQL, R2 preview bucket | L4 | `07_*` | done |
| L6 Security/auth planner | Synthesis | dev-auth bypass, Better Auth session, publication tokens | L3, L4 | `08_*` | done |
| L7 Performance/flake planner | Synthesis | suite latency budget, retries, flake quarantine | L2 | `09_*` | done |
| L8 Test/QA strategist | Synthesis | execution matrix, shadow paths, adversarial | L2, L3 | `12_*` | done |
| L9 Ops/CI/rollout | Synthesis | CI matrix, skip policy, rollout | L2 | `13_*` | done |
| L10 Adversarial reviewer | Critique pass | gap/contradiction hunt across pack | L1–L9 | `19_*` §critique | done (2 cycles) |
| L11 Final verifier | Emulated verification | requirement-by-requirement audit | all | `17_*` | done (emulated) |
| **L12 Improve-Plan-Prompt audit** (suite step 2) | Emulated improvement pass: per-doc scorecard, full-column traceability, attack-surface inventory, access-path matrix, credential taxonomy, route cache contracts, UX state+a11y matrices, proof-contract rows, final verification matrix + evidence-class table + adversarial log | all | `16/07/08/06/05/12/17/19` | done (cycle 3) |

**Improvement pass (suite step 2):** applied `Improve-Plan-Prompt.md` — found and fixed 12 gaps (IF-1..IF-12 in `19_*`), including a real planning defect (tsconfig excludes e2e ⇒ added T1.5b). No new docs created (anti-slop); existing 20-doc set strengthened. Status unchanged at `CONDITIONALLY READY` (emulated cap is procedural, not a content gap).

**Coordination rules honored:** no two lanes edited the same doc concurrently; all writes confined to this plan folder. **Shared-worktree note:** the broader worktree had concurrent agent activity during this session (modified `src/**`, `tests/**`, `.ai/10_state/current-state.md` and other new plan folders not created by this agent). Per AGENTS.md §6 those were preserved — never read-then-modified, staged, committed, or reverted. This agent's diff is confined entirely to `.ai/03_plans/2026-07-07-e2e-fixture-smoke-harness/` (verified: `git status --short` shows only `??` entries under this folder attributable to this agent).

---

## Decisions log (high-signal only — full set in `15_*`)

- **D-1 Auth strategy for smoke = dev-auth-cookie bypass as primary, Better Auth `storageState` as opt-in production-staging path.** The dev-auth path is already what every authed spec uses, is localhost-scoped, and needs no email inbox. The `storageState` path is kept as the only way to smoke real Better Auth sessions against a deployed preview (recorded as a future enhancement, not a Phase-1 deliverable). Rejected: full magic-link automation (needs mailbox access, non-deterministic, slow) and Google OAuth automation (needs seeded Google account + secrets in CI, brittle).
- **D-2 Local-isolated D1 preview DB, not remote.** Use `wrangler.next-dev.jsonc` `preview_database_id` (`363c756a-...`) applied locally via `wrangler d1 migrations apply ARCH_DB --local`, seeded by a local-only seed script that writes the smoke profile + smoke project/estimate. Never writes remote `ARCH_DB`. Rejected: remote D1 seeding (shared state, flake, pollutes real data) and full miniflare/`vitest-pool-workers` swap-out (large change, out of smoke scope).
- **D-3 Smoke = routing/interaction/data proof, not visual regression.** Keep the suite lean for routine CI. Visual/landing work stays in the existing `frontdoor-landing-visual.spec.ts` / `landing-audit.spec.ts` (unchanged). Rejected: broad visual regression matrix (cost vs value for closed beta).
- **D-4 Skip policy = explicit env-gated `test.skip` with a logged reason, not silent omission.** Mirrors the existing `ARCHESTIMATOR_E2E_*` convention but consolidated under one umbrella flag + per-flow sub-flags so CI can opt in incrementally.
- **D-5 Flake budget = retries:1 on CI for the smoke project, 2-strikes-quarantine for flakes.** New smoke specs get `@smoke` tag; a flaky smoke test is auto-quarantined to a `@quarantine` project after 2 failures in 14 days, not silently deleted.

## Conflicts / open items

- None blocking. See `15_*` OPEN-* and `17_*` residual-gate list. The single residual external decision: whether the owner wants real-Better-Auth-session smoke against a hosted preview (deferred — D-1).

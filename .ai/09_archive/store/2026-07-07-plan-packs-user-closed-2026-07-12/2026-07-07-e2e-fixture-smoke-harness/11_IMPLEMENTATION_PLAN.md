# 11 — Implementation Plan (authoritative execution guide)

**Status:** `CONDITIONALLY READY` (emulated verification). The CONDITIONAL is the verification-mode cap, not a content gap — every task has exact paths/symbols. The owner or an independent reviewer can lift it to `IMPLEMENTATION-READY` by accepting the pack.

Executor: start at Phase 0 (discovery), then proceed phase-by-phase. Each phase has a durable-goal contract (ultragoal-style). Re-read each touched file immediately before editing (shared-worktree). All paths repo-relative.

---

## Phase 0 — Discovery & foundation (read-only; falsifies ASSUMP-1/2/3/4/5)

**Objective.** Confirm the load-bearing assumptions before writing harness code, so the executor doesn't build on a wrong premise.

**Requirements addressed.** ARCH-2, ARCH-3, ASSUMP-1..5 validation.

**Prerequisites.** Local repo on `main`, `bun install` done, `.dev.vars` + `.env.local` present.

### Task T0.1 — Binding reachability probe (DISCOVERY)
- **Why.** ASSUMP-1/2: confirm `next dev` resolves local preview D1/R2 via OpenNext.
- **Steps (read-only + one throwaway probe).**
  1. `wrangler d1 migrations apply ARCH_DB --local` (applies schema to preview D1 `363c756a-…`).
  2. Temporarily set `ARCHESTIMATOR_DEV_AUTH_BYPASS=1`, `ARCHESTIMATOR_DEV_AUTH_EMAIL=e2e-smoke@example.test`, `ARCHESTIMATOR_DEV_AUTH_BYPASS_SECRET=<32-char local>`, `ARCHESTIMATOR_DEV_AUTH_ADMIN_DB=1` in `.env.local`.
  3. Insert one throwaway profile row via `wrangler d1 execute ARCH_DB --local --command "insert into profiles (id,email,display_name,role,created_at,updated_at) values('probe','e2e-smoke@example.test','Probe','admin',datetime('now'),datetime('now'))"`.
  4. `bun run dev`, then `curl -H "x-archestimator-dev-auth-bypass:<secret>" http://127.0.0.1:3020/api/health` → expect 200. Then curl a protected route with the header → expect 200 (not 302).
  5. Clean up: delete the probe row (`delete from profiles where id='probe'`).
- **Expected evidence.** 200 responses; profile resolves; no throw.
- **Stop/fail condition.** If the bypass doesn't resolve the profile from **local** D1 ⇒ ASSUMP-2 false ⇒ escalate (the harness would need a different binding strategy). Record in `19_*`.
- **Paths touched.** none (throwaway row deleted).
- **Complexity.** Small.

### Task T0.2 — Schema read for seed columns (DISCOVERY)
- **Why.** Seed SQL must match current columns (projects/estimates/library/publications/recipient tables).
- **Steps.** Read `migrations/0001_`..`0038_` for: `workspaces`, `workspace_members`, `projects`, `estimate_*` (nodes/rows/tabs), `component_library_*`, `project_publication*`, recipient/share tables. Record exact column lists + FKs + required (NOT NULL) columns into `scripts/e2e/sql/*.sql` headers as comments.
- **Output.** A `scripts/e2e/SCHEMA_NOTES.md` (or inline SQL comments) listing the tables/columns the seed writes.
- **Complexity.** Medium (many migrations; mechanical).

### Task T0.3 — Terms-gate column discovery (DISCOVERY)
- **Why.** FR-S3 / D-terms: decide Option A (seed terms-accepted) vs Option B (UI accept). Symbol `getCurrentUserTermsAcceptanceStatus(userId)` (`src/lib/legal/terms-acceptance.ts:42`) + `…FromCloudflareD1` (`terms-acceptance-d1-store.ts:63`) read a terms table.
- **Steps.** Read those two files + the terms migration; identify the table + acceptance column + what "accepted" means (timestamp/boolean).
- **Decision output.** Pick Option A if a simple timestamp column exists; else Option B. Record in `15_*` as DEC-terms.
- **Complexity.** Small.

**Phase 0 exit.** All 5 assumptions falsified or confirmed; `SCHEMA_NOTES.md` written; no harness code yet.

---

## Phase 1 — Harness skeleton, env contract, config (critical path)

**Objective.** Stand up the empty harness structure, env, and Playwright config so phases 2–7 can fill in.
**Requirements.** ARCH-1/2/3, ARCH-ENV1/2, FR-FX1 (skeleton), PERF-FLAKE1 (config), TEST-PROOF1, DOC-1.

### Task T1.1 — `.env.e2e.example` (new)
- **Path (new).** `.env.e2e.example`.
- **Content.** The full env contract from `06_*` §env: run-control, dev-auth (with the dedicated `e2e-smoke@example.test` email + 32-char placeholder secret + LOUD warning), Better Auth local vals, publication secrets, feature gates (default off), storage. Map each var to the flow ID in a comment.
- **Acceptance.** Every var used by `playwright.config.ts` or any smoke spec/fixture/seed is present.
- **Complexity.** Small.

### Task T1.2 — Env loader + skip helper (new)
- **Paths (new).** `e2e/helpers/env.ts`, `e2e/helpers/auth.ts`.
- **`env.ts`.** `requireEnv(name)` throws with a clear message if missing; `isSmokeEnabled()`, `smokeSubFlag(name)`.
- **`auth.ts`.** `injectDevAuthCookie(page)` (mirrors `e2e/route-transition-performance.spec.ts:148-161` recipe: cookie `archestimator-dev-auth-bypass`=`ARCHESTIMATOR_DEV_AUTH_BYPASS_SECRET`, domain `127.0.0.1`, path `/`, httpOnly false, sameSite Lax). `skipUnlessSmoke(subFlag?)` → `test.skip` with reason naming the flag.
- **Complexity.** Small.

### Task T1.3 — Custom Playwright fixtures (new)
- **Path (new).** `e2e/fixtures/test.ts` (the extended `test`).
- **Content.** `export const test = base.test.extend({ authedPage, smokeData })` where `authedPage` injects the cookie and `smokeData` reads the seeded sentinel ids from env. Re-export `expect`.
- **Complexity.** Small–Medium.

### Task T1.4 — `playwright.config.ts` (edit, additive)
- **Path (edit).** `playwright.config.ts`.
- **Changes (additive only; preserve existing projects/behavior).**
  - `globalSetup: "./e2e/globalSetup.ts"`, `globalTeardown: "./e2e/globalTeardown.ts"`.
  - Add a `@smoke` project (chromium, `grepTags: /@smoke/`, `retries: process.env.CI ? 1 : 0`) and a `@quarantine` project (non-blocking, `grepTags: /@quarantine/`).
  - Keep the existing default `chromium` project so existing specs behave identically.
  - Add `--grep "@smoke"` support via the project (not a hardcoded grep on the whole suite).
- **Validation.** Run existing `bun run test:e2e` → existing specs still pass/skip as before (regression proof).
- **Complexity.** Medium.

### Task T1.5 — package.json scripts (edit, additive)
- **Path (edit).** `package.json`.
- **Add.** `"test:e2e:smoke": "playwright test --grep @smoke --project=@smoke"`, `"e2e:seed": "bun run scripts/e2e/seed-local.ts"`, `"e2e:reset": "bun run scripts/e2e/reset-local.ts"`, `"test:e2e:smoke:local": "bun run e2e:reset && bun run e2e:seed && bun run test:e2e:smoke"`, `"e2e:typecheck": "tsc --noEmit --project e2e/tsconfig.json"`. Preserve existing scripts unchanged.
- **Complexity.** Small.

### Task T1.5b — `e2e/tsconfig.json` (new) — **fixes a planning defect found in improvement audit**
- **Why.** `tsconfig.json:36` **excludes `e2e`** (and `tests`, `vitest.config.ts`, `playwright.config.ts`). So `bun run type-check` (the repo's `tsc --noEmit`) does NOT cover `e2e/`. The harness's `e2e:typecheck` must use a dedicated `e2e/tsconfig.json` that extends the root and includes `e2e/**/*.ts`, mirroring how `tests/` would be type-checked if needed. Without this, fixture/helper type errors slip through.
- **Path (new).** `e2e/tsconfig.json`.
- **Content shape.** `{ "extends": "../tsconfig.json", "compilerOptions": { "noEmit": true, "types": ["node", "@playwright/test"] }, "include": ["./**/*.ts"], "exclude": ["node_modules"] }` (executor confirms exact `types` against installed `@types`).
- **Acceptance.** `bun run e2e:typecheck` exits 0 on green fixtures; a deliberate type error fails it.
- **Complexity.** Small.

### Task T1.6 — globalSetup/globalTeardown stubs (new)
- **Paths (new).** `e2e/globalSetup.ts`, `e2e/globalTeardown.ts`.
- **globalSetup.** (1) run `wrangler d1 migrations apply ARCH_DB --local` (spawn); (2) `await import("./scripts-reset")` → reset; (3) seed; (4) probe (curl `/api/health` + one dev-authed protected route); fail fast with actionable message if any step fails.
- **globalTeardown.** run reset (leave no orphans). Wrap in try/catch (teardown must not fail the suite).
- **Note.** These shell out to the seed/reset scripts (Phase 3); until Phase 3 lands, they can be stubs that no-op so Phase 1 config is testable.
- **Complexity.** Medium.

**Phase 1 exit.** `bun run test:e2e:smoke` runs (and passes with zero specs / or a placeholder). Config changes don't regress existing specs. Env contract documented.

---

## Phase 2 — Fixture factory (FR-FX1)

**Objective.** Typed, composable, sentinel-keyed builders.
**Requirements.** FR-FX1. **Prereq.** Phase 0.2 schema notes.

### Task T2.1 — Builders (new)
- **Paths (new).** `e2e/fixtures/accounts.ts`, `projects.ts`, `estimates.ts`, `library.ts`, `publications.ts`, `recipients.ts`, `uploads.ts`, `index.ts`.
- **Content.** Each exports `makeX(overrides?: Partial<X>): X`. Sentinels: account `11111111-…`/email `e2e-smoke@example.test`; project id `ESTIMATES_E2E_PROJECT_ID` default `22222222-…`. Composable: `makePublication({ project: makeProject() })`.
- **`uploads.ts`.** exports a path to a tiny committed decodable PNG under `e2e/fixtures/assets/` (<1KB, e.g. a 1×1 or 8×8 WebP/PNG). **No** external fetch.
- **Validation.** `tsc --noEmit` on the `e2e` glob (or `bun run e2e:typecheck` if added).
- **Complexity.** Medium.

### Task T2.2 — Upload fixture asset (new)
- **Path (new).** `e2e/fixtures/assets/tiny.png` (or `.webp`).
- **Why.** FR-S13 needs a decodable image; reuse the existing pattern (`tests/vitest` upload fixtures use decodable images per recent commit `ad11fd812`).
- **Complexity.** Small.

**Phase 2 exit.** Builders type-check; importable.

---

## Phase 3 — Seed & reset (FR-SEED1..4, FR-FX2)

**Objective.** Idempotent local preview D1 seed + scoped reset.
**Requirements.** FR-SEED1/2/3/4, FR-FX2. **Prereq.** Phase 0.2, Phase 2.

### Task T3.1 — Seed SQL (new)
- **Paths (new).** `scripts/e2e/sql/smoke-profile.sql`, `smoke-workspace.sql`, `smoke-project.sql`, `smoke-library.sql`, `smoke-publication.sql`.
- **Content.** Per `07_*` blueprints. `profiles` insert satisfies `migrations/0003_profiles.sql` CHECKs (email lowercase, role `admin`). Workspace + owner membership per `0030_*`. `ON CONFLICT(id) DO NOTHING` (or DO UPDATE). Ordered to respect FKs.
- **Complexity.** Medium.

### Task T3.2 — `seed-local.ts` (new)
- **Path (new).** `scripts/e2e/seed-local.ts`.
- **Behavior.** Reads `e2e/fixtures` for sentinel ids; shells out `wrangler d1 execute ARCH_DB --local --file=<sql>` for each SQL file in order; idempotent. Fails fast on any SQL error.
- **Complexity.** Medium.

### Task T3.3 — `reset-local.ts` (new)
- **Path (new).** `scripts/e2e/reset-local.ts`.
- **Behavior.** Scoped DELETE by sentinel ids/emails/prefix (profiles where id=sentinel or email=smoke-email; workspace_members where workspace_id=sentinel; projects where id=`ESTIMATES_E2E_PROJECT_ID`; publications where id in sentinel set; etc.). Also clears preview-R2 prefix `e2e-smoke/` (via `wrangler r2 object delete` list or a small script). Never `--remote`. Safe to re-run.
- **Complexity.** Medium.

**Phase 3 exit.** `bun run e2e:reset && bun run e2e:seed` is deterministic; `getDevCurrentUserContext()` resolves; `/workshop/projects` lists the sentinel project. Wire globalSetup/Teardown (Phase 1.6) to these.

---

## Phase 4 — Auth + terms smoke (FR-S1, S2, S3, S15)

**Objective.** The auth-spine flows. **Prereq.** Phase 1, 3.

### Task T4.1 — `01-auth-gate.spec.ts` (FR-S1)
- **Path (new).** `e2e/smoke/01-auth-gate.spec.ts`.
- **Assertions.** `GET /workshop` → 302 Location `/login?next=…`; `/login` has Google btn + `input[type=email]`; no console errors.
- **Complexity.** Small.

### Task T4.2 — `02-auth-bypass.spec.ts` (FR-S2)
- **Path (new).** `e2e/smoke/02-auth-bypass.spec.ts`.
- **Assertions.** With cookie → `GET /workshop` 200 + `[data-workshop-page-shell-root]` visible; without cookie → 302.
- **Complexity.** Small.

### Task T4.3 — `03-terms.spec.ts` (FR-S3)
- **Path (new).** `e2e/smoke/03-terms.spec.ts`.
- **Behavior.** Per T0.3 decision: Option A — seed profile with terms-accepted, assert no prompt + `/workshop` renders; AND a second test with a fresh profile lacking acceptance → assert prompt → accept via UI → `/workshop` renders → reload → no re-prompt. (Both options proven.)
- **Complexity.** Medium.

### Task T4.4 — `15-signout.spec.ts` (FR-S15)
- **Path (new).** `e2e/smoke/15-signout.spec.ts`.
- **Assertions.** signOut → `/login`; `GET /workshop` after → 302.
- **Complexity.** Small.

**Phase 4 exit.** Auth spine green with seeded data.

---

## Phase 5 — Core workshop flows (FR-S4–S8)

**Objective.** Dashboard, project, estimate, library, export.
**Prereq.** Phase 4. (These flows may need stable app testids; if missing, add minimal `data-*` per gated task.)

### Task T5.1 — `04-dashboard.spec.ts` (FR-S4)
### Task T5.2 — `05-project-create.spec.ts` (FR-S5)
- Calls `createProject`/`createProjectRecord` (`src/lib/projects/actions.ts:774,833`) via the UI form (fill name → submit → assert redirect + render).
### Task T5.3 — `06-estimate-edit.spec.ts` (FR-S6)
- `createEstimate(projectId, formData)` (`src/lib/estimates/actions.ts:2311`); add node/row; insert seeded library item; assert row + total.
### Task T5.4 — `07-library.spec.ts` (FR-S7)
### Task T5.5 — `08-export.spec.ts` (FR-S8)
- `GET /api/projects/[id]/estimates/[eid]/export/proposal.xlsx?...` → 200 + xlsx; 2nd call respects `checkProposalExportRateLimit`.

**App-testid gating:** if a flow needs a stable selector the app lacks, the task adds a single `data-smoke="<flow>"` attribute to the relevant component (scoped, documented, reversible). Each such addition is its own sub-task with the exact component path.

**Complexity.** Medium each.

**Phase 5 exit.** Workshop CRUD + export smoke green.

---

## Phase 6 — Publication, share, recipient (FR-S9–S12) — P0

**Objective.** The shared-link coverage the PROMPT explicitly names.
**Prereq.** Phase 3 (publication seed), Phase 5 (project/estimate exist).

### Task T6.1 — `09-publish.spec.ts` (FR-S9)
- `createProjectPublication({...})` (`src/lib/publication/actions.ts:775`) via UI or direct action call → roster shows link → `/share/<token>` reachable.
### Task T6.2 — `10-share-open.spec.ts` (FR-S10)
- Open publication: review workspace renders; post comment; accept decision.
### Task T6.3 — `11-share-password.spec.ts` (FR-S11)
- Password gate; correct unlock; 5-wrong → lockout. **Fresh publication per run** (no global limiter reset).
### Task T6.4 — `12-recipient-inbox.spec.ts` (FR-S12)
- `/workshop/proposals` lists seeded shared proposal; `openRecipientProposalAction` → `/share/<token>`.

**Complexity.** Medium–Large (publication is the most complex flow).

**Phase 6 exit.** End-to-end shared-link coverage green.

---

## Phase 7 — Upload + feedback (FR-S13, S14)

**Objective.** Remaining first-user flows.
**Prereq.** Phase 2.2 (upload asset), Phase 3 (seed).

### Task T7.1 — `13-upload.spec.ts` (FR-S13)
- POST `/api/component-library/attachments/direct-upload` reserve → finalize; assert object in preview R2 prefix.
### Task T7.2 — `14-feedback.spec.ts` (FR-S14)
- `/workshop/feedback` submit → saved banner.

**Complexity.** Small–Medium.

---

## Phase 8 — CI, perf budget, docs (OPS-CI1/2, PERF-FLAKE1, DOC-1)

**Objective.** Routine CI gate + opt-in matrix + runbook + baseline.

### Task T8.1 — CI workflow (new)
- **Path (new).** `.github/workflows/e2e-smoke.yml`.
- **Behavior.** On PR to `main`: ubuntu, Bun 1.3.x, `bun install`, `bunx playwright install chromium --with-deps`, set smoke env from Actions secrets (dev-only values), `bun run test:e2e:smoke:local` (reset→seed→smoke). Upload `playwright-report/` + manifest on failure.
- **Secrets.** `ARCHESTIMATOR_DEV_AUTH_BYPASS_SECRET` (dev-only), publication secrets (local-only placeholders) — all dev-only; **no real provider secrets**. Loud comment: local bindings only.
- **Complexity.** Medium.

### Task T8.2 — Extended matrix workflow (new, opt-in)
- **Path (new).** `.github/workflows/e2e-smoke-extended.yml` (nightly/manual; firefox/webkit/mobile via `ARCHESTIMATOR_E2E_LIBRARY_BROWSER_MATRIX=1` pattern). Non-blocking.
- **Complexity.** Small.

### Task T8.3 — Baseline + manifest reporter
- Capture first green run timings → `e2e/e2e-smoke-baseline.json`. Configure JSON reporter for the manifest.
- **Complexity.** Small.

### Task T8.4 — `e2e/README.md` runbook (new)
- How to run locally, how to add a flow, skip policy, quarantine policy, env contract pointer.
- **Complexity.** Small.

**Phase 8 exit.** CI green on a PR; suite ≤ 4 min; baseline recorded; runbook exists.

---

## Dependency graph

```
Phase 0 (discovery) ──► Phase 1 (skeleton/env/config)
                            │
                 ┌──────────┴───────────┐
                 ▼                      ▼
          Phase 2 (fixtures)     Phase 3 (seed/reset)
                 │                      │
                 └──────────┬───────────┘
                            ▼
                       Phase 4 (auth/terms) ── P0 spine
                            │
              ┌─────────────┼──────────────┐
              ▼             ▼              ▼
        Phase 5       Phase 6         Phase 7
       (workshop)   (share/pub)     (upload/feedback)
              │             │              │
              └─────────────┴──────────────┘
                            ▼
                       Phase 8 (CI/perf/docs)
```

**Critical path:** Phase 0 → 1 → 3 → 4 → 6 (shared-link is the named P0 of the PROMPT). Phase 2 can parallel with 3. Phase 5/7 parallel after 4.

## New files summary (exact repo-relative paths)

```
.env.e2e.example
e2e/README.md
e2e/tsconfig.json            (dedicated typecheck config; root tsconfig excludes e2e)
e2e/globalSetup.ts
e2e/globalTeardown.ts
e2e/fixtures/test.ts            (extended `test`)
e2e/fixtures/accounts.ts
e2e/fixtures/projects.ts
e2e/fixtures/estimates.ts
e2e/fixtures/library.ts
e2e/fixtures/publications.ts
e2e/fixtures/recipients.ts
e2e/fixtures/uploads.ts
e2e/fixtures/index.ts
e2e/fixtures/assets/tiny.png
e2e/helpers/env.ts
e2e/helpers/auth.ts
e2e/helpers/selectors.ts
e2e/smoke/01-auth-gate.spec.ts
e2e/smoke/02-auth-bypass.spec.ts
e2e/smoke/03-terms.spec.ts
e2e/smoke/04-dashboard.spec.ts
e2e/smoke/05-project-create.spec.ts
e2e/smoke/06-estimate-edit.spec.ts
e2e/smoke/07-library.spec.ts
e2e/smoke/08-export.spec.ts
e2e/smoke/09-publish.spec.ts
e2e/smoke/10-share-open.spec.ts
e2e/smoke/11-share-password.spec.ts
e2e/smoke/12-recipient-inbox.spec.ts
e2e/smoke/13-upload.spec.ts
e2e/smoke/14-feedback.spec.ts
e2e/smoke/15-signout.spec.ts
e2e/e2e-smoke-baseline.json
scripts/e2e/seed-local.ts
scripts/e2e/reset-local.ts
scripts/e2e/SCHEMA_NOTES.md
scripts/e2e/sql/smoke-profile.sql
scripts/e2e/sql/smoke-workspace.sql
scripts/e2e/sql/smoke-project.sql
scripts/e2e/sql/smoke-library.sql
scripts/e2e/sql/smoke-publication.sql
.github/workflows/e2e-smoke.yml
.github/workflows/e2e-smoke-extended.yml
```

## Edited files (additive, scoped, reversible)

```
playwright.config.ts        (globalSetup/Teardown, retries, @smoke/@quarantine projects)
package.json                (test:e2e:smoke, e2e:seed, e2e:reset, test:e2e:smoke:local)
.env.example                (doc line: ARCHESTIMATOR_E2E_SMOKE umbrella + pointer)
src/components/...          (OPTIONAL per-flow data-smoke="<flow>" attributes; gated sub-tasks)
```

## Files explicitly off-limits / unchanged

- All application source except optional gated `data-*` testids.
- All `migrations/` (no seed migration — D-6).
- `wrangler.jsonc`, `wrangler.next-dev.jsonc`, `open-next.config.ts`.
- Existing 9 `e2e/*.spec.ts` (untouched).
- `vitest.config.ts`, all `tests/**`.
- Remote `ARCH_DB`, production R2, any other Cloudflare account/project.

## Per-task durable-goal contract (ultragoal-style, summarized)

Each phase above is a durable goal: Goal ID (P0–P8) · objective · scope · requirements covered · required evidence · completion audit (run the phase's specs green + evidence in `19_*`) · checkpoint artifact (the new files + a `19_*` entry) · stop condition (specs green OR blocker with evidence) · blocker condition (ASSUMP falsified ⇒ escalate) · review gate (type-check + regression on existing specs) · QA gate (adversarial/shadow cells from `12_*` for runtime flows).

## Validation commands (executor)

- `bun run e2e:typecheck` — uses dedicated `e2e/tsconfig.json` (root `tsconfig.json:36` excludes `e2e`; see T1.5b) — fixtures/helpers typed.
- `bun run e2e:reset && bun run e2e:seed` — idempotent, deterministic.
- `bun run test:e2e:smoke:local` — full smoke green locally.
- `bun run test:e2e` — **existing specs still pass/skip as before** (regression proof for the config edit).
- CI: `e2e-smoke.yml` green on a PR; suite ≤ 4 min.

## Rollback

- Revert `playwright.config.ts`/`package.json`/`.env.example` additive hunks.
- Delete new files/dirs listed above.
- `bun run e2e:reset` clears local preview D1/R2 smoke data.
- No remote state touched ⇒ no remote rollback.

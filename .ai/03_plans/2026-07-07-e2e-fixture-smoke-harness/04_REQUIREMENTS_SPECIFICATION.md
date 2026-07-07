# 04 — Requirements Specification

Stable IDs. Categories: FR (functional), ARCH (architecture), DATA, SEC, PERF, REL, OPS, TEST, DOC. Priority: P0 (must for closed-beta smoke), P1 (should), P2 (nice). Status: `pending` (planning; implementation tasks in `11_*`).

Each requirement states: rationale · source · acceptance criteria · validation · affected areas · risks. Acceptance criteria are objective.

---

## SMOKE-FLOW REQUIREMENTS (FR-S*)

These define the smoke suite's coverage. Each flow ⇒ route + auth path + assertion + fixture + evidence (full mapping in `12_*` Test Execution Matrix and `16_*` traceability).

### FR-S1 — Auth-gate negative (public smoke, P0)
**Statement.** Unauthenticated `GET /workshop` (and `/workshop/projects`) returns 302 to `/login?next=…`; `/login` renders the Google button + magic-link email field.
**Rationale/Source.** First-user trust boundary; already partially covered by `e2e/auth.spec.ts`. PROMPT "auth".
**AC.** (a) `GET /workshop` → status 302, Location starts `/login?next=`. (b) `/login` visible: button matching Google, `input[type=email]`. (c) No console errors.
**Validation.** Playwright `@smoke`, chromium, no auth. Command `bun run test:e2e:smoke -- --grep "@smoke-auth-gate"`.
**Affected.** `src/proxy.ts`, `src/lib/auth/request-proxy.ts`, `src/app/login/page.tsx`.
**Risks.** Proxy behavior diverges between `next dev` and deployed Worker (RISK-A1).

### FR-S2 — Dev-auth bypass sign-in (smoke auth path, P0)
**Statement.** With the dev-auth cookie set (32+ char secret, localhost), `GET /workshop` renders the authenticated homebase instead of redirecting.
**Rationale/Source.** Deterministic auth for every authed smoke flow; current de-facto pattern. PROMPT "auth setup"; D-1.
**AC.** (a) Cookie `archestimator-dev-auth-bypass=<secret>` on `127.0.0.1` ⇒ `GET /workshop` status 200, `[data-workshop-page-shell-root]` visible. (b) Without it → 302 (proves the bypass isn't a hole).
**Validation.** `@smoke-auth-bypass`. Proof: profile resolves from local preview D1.
**Affected.** `src/lib/auth/dev-auth.ts`, `dev-auth-gate.ts`, `src/lib/auth/profile-d1-store.ts`.
**Risks.** Profile row missing locally (mitigated by FR-SEED1); bypass accidentally enabled in non-local env (mitigated by SEC-1).

### FR-S3 — Terms gate + accept (P0)
**Statement.** First protected entry with no terms acceptance shows the terms gate; accepting it lands on `/workshop` and persists across reload (within the session/cookie TTL).
**Rationale/Source.** Mandatory pre-render gate (`src/lib/legal/terms-gate`). PROMPT "onboarding".
**AC.** (a) Terms prompt visible on first `/workshop` after sign-in. (b) Click accept → `/workshop` dashboard renders. (c) Reload `/workshop` → no re-prompt (within TTL).
**Validation.** `@smoke-terms`. Fixture: smoke profile with `terms_accepted_at` null initially.
**Affected.** `src/lib/legal/terms-gate.ts`, `terms-acceptance.ts`, `src/app/workshop/layout.tsx`.
**Risks.** Terms store schema/column name drift (executor confirms in T4.0).

### FR-S4 — Dashboard render (P0)
**Statement.** Authenticated `GET /workshop` renders the homebase: library spotlight, create-project entry, recent projects region.
**AC.** `[data-workshop-page-shell-root]` visible; create-project control present; no `[data-route-overlay]` error flash; no console errors.
**Validation.** `@smoke-dashboard`.

### FR-S5 — Project create (P0)
**Statement.** From `/workshop` create-project form, submitting a name creates a project and redirects to `/workshop/projects/[id]` which renders the project detail.
**Rationale/Source.** `createProject` action. PROMPT "project creation".
**AC.** (a) Fill name → submit → URL matches `/workshop/projects/<uuid>`. (b) Project detail heading shows the name. (c) A subsequent `GET /workshop/projects` lists it.
**Validation.** `@smoke-project-create`. Fixture: uses the smoke workspace seeded by FR-SEED2.
**Affected.** `src/lib/projects/actions.ts`, `src/app/workshop/projects/[projectId]/page.tsx`.

### FR-S6 — Estimate create + edit (P0)
**Statement.** Within a project, create an estimate sheet, open it at `/workshop/projects/[id]/estimates/[nodeId]`, add a node/row, insert a library item; the row renders with a non-zero line total.
**Rationale/Source.** `createEstimate`, `createEstimateNode`, `insertEstimateRowItemFromLibrary`. PROMPT "estimate editing".
**AC.** (a) Create estimate → navigate to its node route → 200. (b) Add row from library → row visible, total > 0. (c) Rename node → label updates.
**Validation.** `@smoke-estimate-edit`. Fixture: seeded library item (FR-SEED3).
**Affected.** `src/lib/estimates/actions.ts`, `EstimateWorkspaceClient.tsx`.

### FR-S7 — Component library load + create (P1)
**Statement.** `/workshop/library/components` loads with the seeded item visible; creating a cost component adds it to the list.
**AC.** (a) `/workshop/library/components` 200, seeded item visible. (b) Create component → appears in list.
**Validation.** `@smoke-library`.

### FR-S8 — Proposal export (P1)
**Statement.** `GET /api/projects/[id]/estimates/[eid]/export/proposal.xlsx?...` with auth returns 200, `Content-Type` xlsx, non-empty body, rate-limit respected.
**Rationale/Source.** `…/export/proposal.xlsx/route.ts`. PROMPT "proposal export".
**AC.** (a) 200 + `content-type` contains `spreadsheet`/`xlsx` + `content-length`>0. (b) A second immediate call respects the per-user rate limit (no 500; documented 429/200 behavior per existing limiter).
**Validation.** `@smoke-export`. Fixture: project+estimate with ≥1 priced row.
**Affected.** `src/app/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx/route.ts`, `checkProposalExportRateLimit`.

### FR-S9 — Publication (shared link) create (P0)
**Statement.** `createProjectPublication` (selected estimates, optional password) creates a share link that appears on `/workshop/publisher` roster; the returned `/share/<token>` is reachable.
**Rationale/Source.** `src/lib/publication/actions.ts`. PROMPT "share review".
**AC.** (a) After publish, roster row shows the token/link. (b) `GET /share/<token>` → 200 (open variant) or password gate (locked variant).
**Validation.** `@smoke-publish`. Fixture: FR-SEED4 (publication secrets set).

### FR-S10 — Share review (open) (P0)
**Statement.** Opening an open (no-password) `/share/<token>` renders the proposal review workspace with estimate tabs; recipient can post a comment and an accept decision.
**AC.** (a) `ShareReviewWorkspace` visible with ≥1 estimate tab. (b) Post comment → comment visible. (c) Accept decision → "Accepted" state shown.
**Validation.** `@smoke-share-open`. Fixture: seeded publication + recipient token.

### FR-S11 — Share review (password + lockout) (P0)
**Statement.** A password-protected `/share/<token>` shows the password gate; correct password unlocks; 5 wrong attempts trigger lockout (`Too many attempts`, input disabled).
**Rationale/Source.** `src/app/share/[token]/page.tsx`, `/api/share/[token]/password`; lockout hardened 2026-07-07 (5 tries, 1h window). PROMPT "shared-link coverage".
**AC.** (a) Password gate visible. (b) Correct password → snapshot renders. (c) 5 wrong → lockout message + disabled input.
**Validation.** `@smoke-share-password`.

### FR-S12 — Recipient inbox (P1)
**Statement.** `/workshop/proposals` lists proposals shared to the smoke recipient; `openRecipientProposalAction` navigates to `/share/<token>` with session established.
**AC.** (a) List shows the seeded shared proposal. (b) Open → lands on `/share/<token>` rendering review (session cookie set).
**Validation.** `@smoke-inbox`.

### FR-S13 — Upload reserve→finalize (P1)
**Statement.** Authenticated `/api/component-library/attachments/direct-upload` POST reserve → returns upload targets; finalize records the asset. A small decodable image fixture completes the round-trip.
**Rationale/Source.** direct-upload route, R2 preview bucket. PROMPT "upload".
**AC.** (a) Reserve → 200 with session/admission fields. (b) Finalize → 200, asset id returned. (c) Object exists in preview R2 (checked via local wrangler or returned metadata).
**Validation.** `@smoke-upload`. Fixture: tiny decodable PNG (committed, <1KB).
**Affected.** `src/app/api/component-library/attachments/direct-upload/route.ts`, `src/lib/uploads/*`.

### FR-S14 — Beta feedback submit (P2)
**Statement.** `/workshop/feedback` submit → saved confirmation banner; the row appears (asserted via a read endpoint or the saved banner only, to avoid admin-route coupling).
**AC.** Submit → success banner visible.
**Validation.** `@smoke-feedback`.

### FR-S15 — Sign-out (P0)
**Statement.** `signOut` action clears the session and lands on `/login`; subsequent `/workshop` redirects to login.
**AC.** (a) Sign-out → URL `/login`. (b) `GET /workshop` after → 302 `/login?next=`.
**Validation.** `@smoke-signout`.

> **Flows intentionally NOT in core smoke** (documented, deferred): magic-link email delivery (non-deterministic; covered by vitest + `cf:*`), Google OAuth happy path (needs seeded Google account + CI secrets — OPEN-1), invite accept happy path full email round-trip (covered by vitest; a UI-only invite-accept smoke is P2 if `PROJECT_INVITE_ENTRY_ENABLED` is on). See `15_*` deferrals.

---

## FIXTURE & DATA REQUIREMENTS

### FR-FX1 — Fixture factory (P0)
**Statement.** A typed fixture layer under `e2e/fixtures/` exposing builders for: smoke accounts, workspace, project, estimate, estimate node/row, component-library item, publication (open + password), recipient, upload file.
**AC.** (a) Each builder is typed (no `any`), accepts overrides, returns deterministic sentinel-keyed data. (b) Builders compose (e.g., `makePublication({ project: makeProject() })`). (c) Sentinel UUIDs follow the existing `11111111-…`/`22222222-…` convention. (d) Importable by all smoke specs.
**Validation.** type-check on the e2e tsconfig; a vitest-free unit check (or `tsc --noEmit` on `e2e/**/*.ts`).
**Affected (new).** `e2e/fixtures/accounts.ts`, `projects.ts`, `estimates.ts`, `library.ts`, `publications.ts`, `recipients.ts`, `uploads.ts`, `index.ts`.

### FR-SEED1 — Smoke profile seed (P0)
**Statement.** An idempotent local seed writes the smoke `profiles` row for `ARCHESTIMATOR_DEV_AUTH_EMAIL` (lowercase, role `admin` or `member`) into **local preview D1 only**, satisfying `migrations/0003_profiles.sql` CHECKs.
**AC.** (a) Seed is idempotent (INSERT … ON CONFLICT(id) DO NOTHING or DELETE-then-INSERT scoped to the sentinel id). (b) After seed, `getDevCurrentUserContext()` resolves without throwing. (c) Seed never connects to remote `ARCH_DB` (uses `wrangler d1 … --local` / preview id).
**Validation.** `bun run e2e:seed` then run FR-S2.
**Affected (new).** `scripts/e2e/seed-local.ts`, `scripts/e2e/sql/smoke-profile.sql`.

### FR-SEED2 — Smoke workspace + project seed (P0)
**Statement.** Seed a workspace owned by the smoke profile + a sentinel project (`ESTIMATES_E2E_PROJECT_ID` default `22222222-…`) with ≥1 estimate + ≥1 priced row, satisfying the workspace_members owner row (per `0030_workspace_owner_membership_backfill.sql` semantics).
**AC.** (a) After seed, `/workshop/projects` lists the sentinel project. (b) Estimate route renders with the priced row.
**Validation.** FR-S5/S6 pass against seeded data.

### FR-SEED3 — Component-library item seed (P1)
**Statement.** Seed ≥1 cost-library component + price option in the smoke workspace for FR-S6/S7.
**AC.** Inserted row visible on `/workshop/library/components`.

### FR-SEED4 — Publication + recipient seed (P0)
**Statement.** Seed (or create via action) one open publication + one password publication (known password) + a recipient row, for FR-S9–S12. Tokens minted with locally-set `PUBLICATION_TOKEN_*` secrets.
**AC.** `/share/<open-token>` renders review; `/share/<pw-token>` shows gate.

### FR-FX2 — Idempotent reset (P0)
**Statement.** `bun run e2e:reset` clears the smoke sentinel rows from local preview D1 (scoped by sentinel ids/emails) and the smoke prefix in preview R2; safe to re-run.
**AC.** After reset + seed, suite is deterministic; no orphans; no rows outside the sentinel scope touched.
**Validation.** reset → seed → run → reset; assert row counts before/after.

---

## ENVIRONMENT CONTRACT REQUIREMENTS

### ARCH-ENV1 — `.env.e2e` source-of-truth (P0)
**Statement.** A single `.env.e2e` template (committed, no real secrets) enumerates every var/flag the smoke suite needs, with safe placeholder values and inline comments mapping each to the flow that needs it.
**AC.** Every var used by `playwright.config.ts` or any smoke spec/fixture/seed is present; each maps to a flow ID.
**Affected (new).** `.env.e2e.example` (committed) + documented load order (`loadEnvConfig` already loads `.env.local`; the harness sets overrides via the run script).

### ARCH-ENV2 — Umbrella skip flag (P0)
**Statement.** A single `ARCHESTIMATOR_E2E_SMOKE=1` umbrella enables the smoke suite; per-flow sub-flags (`ARCHESTIMATOR_E2E_SMOKE_SHARE`, `…_UPLOAD`, `…_INBOX`) gate flows needing extra setup. Absent ⇒ explicit `test.skip` with the missing flag named.
**Rationale.** Consolidates the ad-hoc `ARCHESTIMATOR_E2E_*` convention; CI can opt in incrementally. D-4.
**AC.** Every smoke spec calls a shared `skipUnlessSmoke('sub-flag')` helper; skip reason string names the flag.

---

## SKIP / CI / FLAKE / PROOF REQUIREMENTS

### OPS-CI1 — Routine chromium smoke job (P0)
**Statement.** A GitHub Actions job runs `bun run test:e2e:smoke` (chromium only, `@smoke` tag) on PRs to `main`, ≤4 min target, with local D1 seed/reset steps and `next dev` webServer.
**AC.** (a) Job runs on PR; (b) sets the smoke env from secrets (no real provider secrets, dev-only values); (c) passes on green PR; (d) fails the PR on a real smoke failure.
**Validation.** Hosted CI evidence (out of planning scope; the job definition is the deliverable). Local proxy: `act` or a local run of the same script.

### OPS-CI2 — Opt-in extended matrix (P2)
**Statement.** A separate (nightly or manual) job expands to firefox/webkit/mobile using the existing `ARCHESTIMATOR_E2E_LIBRARY_BROWSER_MATRIX` pattern; not gating for PRs.
**AC.** Extended job runs the same `@smoke` specs across the matrix; results reported but non-blocking on PRs.

### PERF-FLAKE1 — Flake budget (P0)
**Statement.** Smoke project: `retries: 1` on CI, `trace: "on-first-retry"`; full suite ≤4 min on chromium CI; a flaky smoke test (2 failures in 14 days) is moved to a `@quarantine` project that is non-blocking until fixed.
**AC.** (a) `playwright.config.ts` smoke project has `retries:1`. (b) Suite runtime ≤4 min on a representative CI runner (executor measures). (c) Quarantine policy documented + a `@quarantine` project defined.
**Validation.** Executor times the suite; records in `19_*`.

### TEST-PROOF1 — Proof artifacts (P0)
**Statement.** Each smoke run emits: HTML report, traces (on retry), and a JSON manifest of pass/fail per flow with timings; artifacts attached on failure.
**AC.** Reporter config produces `playwright-report/`, `test-results/`, and a `e2e-smoke-manifest-<ts>.json`.

---

## CROSS-CUTTING (ARCH/SEC/PERF/REL/DOC)

- **ARCH-1** Custom Playwright fixtures (`test.extend`) exposing `authedPage`, `smokeData`, `seededProject` so specs don't reinvent setup. (P0)
- **ARCH-2** `globalSetup` runs `e2e:reset` + `e2e:seed` + a binding reachability probe (ASSUMP-1/2 falsification); `globalTeardown` runs `e2e:reset`. (P0)
- **ARCH-3** webServer unchanged (`bun run dev` port 3020) — OpenNext gives it local bindings. (P0, decision D-2)
- **SEC-1** Dev-auth bypass must NOT be enabled in any deployed/preview/prod env or CI runner that points at remote bindings; smoke job uses local bindings only; `.env.e2e.example` documents this loudly. (P0)
- **SEC-2** No real user data, real tokens, or real provider secrets in fixtures/env; sentinel UUIDs + locally-generated secrets only. (P0)
- **SEC-3** Publication password/lockout smoke uses a known weak test password — never a real credential; lockout test cleans up the rate-limit rows or uses a fresh token. (P0)
- **PERF-1** No `test.slow()` in core smoke; perf stays in the dedicated perf spec. (P1)
- **REL-1** Seed is idempotent + reversible; suite survives re-runs and concurrent local runs (file-scope lock or sentinel-scoped data). (P0)
- **DOC-1** `README.md` (plan pack) is the executor entrypoint; the harness itself gets a short `e2e/README.md` runbook from the executor. (P0)

---

## Shadow-path coverage requirement (TEST-SP1, P0)

Every runtime flow (FR-S5–S13) must have a shadow-path matrix in `12_*`: happy / nil-missing input / empty result / invalid input / auth denied / upstream error / concurrency-race / retry-idempotency / user-visible result / test. Smoke asserts the happy + auth-denied + one error cell per flow as a minimum; the rest are specified for the executor to extend. (Full matrices in `12_*`.)

---

## Source strength summary

| Requirement cluster | Source strength |
|---|---|
| Smoke flows | `repo evidence` (routes/actions/proxy) + `brief` (PROMPT) |
| Fixture factory | `repo evidence` (no existing layer; sentinel convention) |
| Seed/env | `repo evidence` (migrations, wrangler, .env.example, dev-auth.ts) |
| Skip/CI/flake | `derived` from existing convention + `brief` |
| Security | `repo evidence` (dev-auth-gate constraints) |

# 03 — Source and Codebase Audit

Evidence-grounded inventory of the current E2E/test/auth/data surfaces the smoke harness must build on. All paths repo-relative unless noted. Findings verified by read-only inspection (Explore lanes + direct reads) on 2026-07-07.

---

## 1. Playwright config — `playwright.config.ts`

| Field | Value | Line |
|---|---|---|
| `testDir` | `./e2e` | 48 |
| `timeout` | `30_000` ms | 49 |
| `expect.timeout` | `5_000` ms | 50 |
| `reporter` | `[["list"], ["html", { open: "never" }]]` | 51 |
| `use.baseURL` | `http://127.0.0.1:${port}` (port default `"3020"`) | 6–7,53 |
| `use.storageState` | `process.env.PLAYWRIGHT_STORAGE_STATE || undefined` | 54 |
| `use.trace` | `"on-first-retry"` | 55 |
| `webServer.command` | `` `bun run dev -- --port ${port}` `` | 58 |
| `webServer.url` | `baseURL` | 59 |
| `webServer.reuseExistingServer` | `true` | 60 |
| `webServer.timeout` | `120_000` ms | 61 |
| env load | `loadEnvConfig(process.cwd(), true)` (`@next/env`) | 2–4 |

**Projects:** default = single `chromium` (`devices["Desktop Chrome"]`). When `ARCHESTIMATOR_E2E_LIBRARY_BROWSER_MATRIX==="1"` → adds firefox, webkit, mobile-safari (iPhone 15), iphone-se, ipad (iPad Pro 11), pixel-8-chrome. Lines 10–65.

**ABSENT (gaps the plan addresses):** `retries`, `globalSetup`/`globalTeardown`, `grep`/`grepTags`, shard, `outputDir`, any wrangler/miniflare webServer wiring, any `@smoke`/`@quarantine` project split.

---

## 2. `e2e/` specs — 9 files + 1 budgets JSON

| File | Flow | Gating |
|---|---|---|
| `auth.spec.ts` | protected `/workshop/projects` → `/login?next=…`; login page UI | **none — always runs** |
| `estimates-crud-latency.spec.ts` | auth'd estimates list CRUD; `[data-route-overlay]` never flashes; attaches `p0-crud-latency.json` | `test.skip` unless `PLAYWRIGHT_STORAGE_STATE` or `ARCHESTIMATOR_DEV_AUTH_BYPASS=1` (36–39); secondary skip if redirected to `/login` (45) |
| `estimates-shell-streaming.spec.ts` | cold-nav shell streaming (`[data-workshop-page-shell-root]` + skeleton testids) | skip unless auth env (12); secondary (17) |
| `frontdoor-landing-visual.spec.ts` | landing `/` visual across 3 viewports; `sharp` pixel analysis | **none — always runs** |
| `landing-audit.spec.ts` | landing perf/SEO/placeholder-leak/responsive/console | **none — always runs** |
| `shared-link-receiver.spec.ts` | shared-link V2 receiver flows (owner gen link, client view/accept, password lockout×5, mobile sticky bar, keyboard a11y) | `test.skip(!ARCHESTIMATOR_E2E_SHARED_LINK)` (23) |
| `workshop-library-demo-smoke.spec.ts` | `/workshop/library`+`/workshop/templates` demo screenshots+manifest | skip unless `ARCHESTIMATOR_E2E_LIBRARY_DEMO_SMOKE=1` AND `ARCHESTIMATOR_DEV_AUTH_BYPASS=1` (46) |
| `workshop-route-error-boundaries.spec.ts` | `?routeErrorSmoke=1` error-boundary sanitize proof | skip unless `ARCHESTIMATOR_E2E_ROUTE_ERROR_SMOKE=1`+dev-auth (36); 2nd test also `ARCHESTIMATOR_DEV_AUTH_ADMIN_DB=1` (46) |
| `route-transition-performance.spec.ts` | perf suite (Slow 3G CDP, link transitions, bfcache, auth'd prefetch); 90s timeout (143) | mixed; 2 auth'd tests skip w/o dev-auth/storageState (346,401) |
| `route-transition-performance-budgets.json` | budget values data file | n/a |

**No `test.fixme`/`test.only`.** Only `test.skip` (10× across 6 files). Gating is exclusively `ARCHESTIMATOR_*` / `PLAYWRIGHT_STORAGE_STATE` — **no `CI`/`RUN_E2E` gating.**

---

## 3. Fixtures / POMs / helpers — NONE exist

- No `e2e/fixtures/`, `e2e/helpers/`, `e2e/auth/`, `e2e/pages/`.
- No custom Playwright fixtures (`test.extend`).
- No `globalSetup`/`globalTeardown`.
- Every spec imports only `{ expect, test }` (+ `type Page`/`TestInfo`, `node:fs`/`node:path`/`sharp`).
- `shared-link-receiver.spec.ts:92-94` explicitly notes "Fixture suggestion (§7) can be added later under `tests/fixtures/shared-link.ts`" — it does not exist.
- The planned staging specs in `.ai/01_roadmap/32-test-infrastructure-execution-spec.md` were **never built** (that doc's own reconciliation note at line 437).

**Implication:** the fixture factory is greenfield. The closest reusable pattern is `makeEstimateEvent(overrides)` in `tests/vitest/fixtures/activity-events.ts` and the sentinel-UUID convention (`11111111-…`, `22222222-…`).

---

## 4. Auth handling in E2E — split, half-automatable

**(a) `PLAYWRIGHT_STORAGE_STATE`** — wired (`playwright.config.ts:54`) but **no script generates it**; no committed `.json`. Only redacted placeholders under `.ai/09_archive/store/`.

**(b) Dev-auth bypass (dominant).** Specs inject a cookie:
```ts
await page.context().addCookies([{
  name: "archestimator-dev-auth-bypass",
  value: process.env.ARCHESTIMATOR_DEV_AUTH_BYPASS_SECRET,
  domain: "127.0.0.1", path: "/", httpOnly: false, sameSite: "Lax",
}]);
```
(`e2e/route-transition-performance.spec.ts:148-161`.) Server side:
- `src/lib/auth/dev-auth-gate.ts`: `isDevAuthBypassEnabled()` ⇒ `NODE_ENV!=="production"` AND `ARCHESTIMATOR_DEV_AUTH_BYPASS==="1"` (13). `isLocalDevHostname()` ⇒ `localhost`/`127.0.0.1`/`::1`/`*.localhost` (32). `isDevAuthBypassCredentialValid()` ⇒ secret ≥32 chars and matches `ARCHESTIMATOR_DEV_AUTH_BYPASS_SECRET` (39-43). Credential read from header `x-archestimator-dev-auth-bypass` OR cookie `archestimator-dev-auth-bypass` (35-36).
- `src/lib/auth/dev-auth.ts`: `getDevCurrentUserContext()` resolves the profile via `getProfileByEmailFromCloudflareD1(email)` where `email = ARCHESTIMATOR_DEV_AUTH_EMAIL` (37-38); **throws if the profile row is absent** (40-42). No password, no Better Auth session, no JWT.
- `ARCHESTIMATOR_DEV_AUTH_ADMIN_DB=1` unlocks admin-data mode (dev-auth-gate.ts:16).

**Critical gap:** nothing seeds the required D1 `profiles` row → every authed spec silently depends on a manual backfill.

---

## 5. Cloudflare bindings in `next dev` — via OpenNext `getCloudflareContext`

- `open-next.config.ts` → `defineCloudflareConfig()` (bare).
- `wrangler.next-dev.jsonc`: binding `ARCH_DB` (database `archestimator-proof-db`, id `9bdb29bb-…`, **preview id `363c756a-7c4d-42fe-908f-6d328bfa4acb`**); `ARCH_UPLOADS_R2` (bucket `archestimator-proof-uploads`, **preview `archestimator-proof-uploads-dev`**); `UPLOAD_JOBS_QUEUE` (`archestimator-upload-jobs`); `EMAIL` (`send_email`); `IMAGES`.
- Runtime resolution: `src/lib/cloudflare/d1.ts:37-38`, `src/lib/uploads/runtime-storage-provider.ts:53-54`, `src/lib/auth/cloudflare-better-auth-runtime.ts:107-108`, `src/lib/email/cloudflare-email-client.ts:80-81`, `src/app/api/internal/upload-runtime/route.ts:46-47` all do `const { getCloudflareContext } = await import("@opennextjs/cloudflare"); const { env } = await getCloudflareContext({ async: true });`.
- **No miniflare / `@cloudflare/vitest-pool-workers` / `getPlatformProxy` in the repo.** E2E relies on `next dev` resolving these bindings locally.

**Implication:** the seeded D1/R2 strategy targets the **local preview** DB/bucket (via `--local`), reachable from `next dev` through OpenNext. Confirmed by ASSUMP-1/2 (validated in T1.0).

---

## 6. CI — fully disabled

- `.github/workflows/` is **empty** (0 files).
- `.github/workflows-disabled/ci.yml` (the only Playwright job) ran `bunx playwright install chromium --with-deps` then `bun run test:e2e` + `bun run test:e2e:perf` on `ubuntu-24.04`, Bun 1.3.14, no matrix, no gating env. Because CI set none of the auth/feature flags, only ungated specs exercised. CI does **not** run a wrangler/miniflare server — relied on playwright `webServer` (plain `next dev`) with no Cloudflare creds ⇒ binding-dependent code would fail. Likely contributed to disabling.
- `codeql.yml`, `dependabot.yml`, `react-doctor.yml` also archived. `.github/dependabot.yml` moved to `.github/workflows-disabled/`.
- Per `current-state.md`: GitHub Actions disabled temporarily (2026-07-07) to stop failing CI/CodeQL/React Doctor/Dependabot from consuming resources during fast iteration. Re-enable = move YAMLs back.

**Implication:** the CI matrix is a greenfield reactivation design, not a patch.

---

## 7. `package.json` — E2E/test scripts (exact)

```
"dev": "next dev",
"test": "bun test tests/unit",
"test:dom": "vitest run --maxWorkers=1",
"test:dom:watch": "vitest",
"test:e2e": "playwright test",
"test:e2e:perf": "playwright test e2e/route-transition-performance.spec.ts",
"validate": "bun run type-check && bun run lint && bun run lint:design-system && bun run lint:design && bun run test && bun run test:dom",
"validate:agents": "node scripts/validate-ai-workflow-adapters.mjs",
"type-check": "tsc --noEmit",
"lint": "eslint",
"lint:design-system": "node scripts/enforce-app-design-system.mjs",
"lint:design": "node .agents/skills/impeccable/scripts/detect.mjs --strict src/components",
"cf:typegen": "wrangler types --env-interface CloudflareEnv cloudflare-env.d.ts",
"cf:preview": "ARCHESTIMATOR_CLOUDFLARE_BUILD=1 opennextjs-cloudflare build && opennextjs-cloudflare preview",
```
**No `db:seed`, `db:reset`, `cf:d1:apply`, `e2e:install`, `e2e:ui`, `e2e:debug`.** 50+ `cf:*` scripts are proof/verify/inventory generators (all remote). Versions: `next 16.2.10`, `react 19.2.7`, `@opennextjs/cloudflare ^1.20.1`, `@playwright/test ^1.60.0`, `better-auth 1.6.23`.

---

## 8. App routes — relevant to smoke (full inventory in Lane L3 output)

**Public (no auth):** `/`, `/new`, `/about`, `/features`, `/pricing`, `/contact`, `/privacy`, `/terms`, `/trust`, `/security`, `/login`, `/signup`, `/access-required`, `/invite/[token]`, `/share/[token]`.

**Auth-required (`/workshop/*`, terms-gated via `src/proxy.ts` → `src/lib/auth/request-proxy.ts`):** `/workshop`, `/workshop/projects`, `/workshop/projects/[projectId]`, `.../estimates`, `.../estimates/[nodeId]`, `.../activity`, `.../charts`, `.../data`, `/workshop/library`, `/workshop/library/components`, `/workshop/library/templates`, `/workshop/library/templates/[templateId]`, `/workshop/components`, `/workshop/templates`, `/workshop/proposals` (recipient inbox), `/workshop/publisher`, `/workshop/feedback`, `/workshop/settings*`, `/workshop/onboarding` (redirect→settings), `/workshop/terms`.

**Route handlers:** `/api/auth/[...all]` (Better Auth catch-all, nodejs runtime), `/api/health`, `/api/share/[token]` + `/session` `/password` `/comment` `/decision` `/activity` `/events` `/unsubscribe`, `/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx` (auth + rate-limited), `/api/component-library/attachments/direct-upload` (auth), `/api/component-library/attachments`, `/api/component-library/images`, `/api/estimate-row-images`, `/api/projects/images`, `/api/ai/*`, `/api/compliance/privacy-requests`, webhooks/internal.

---

## 9. Auth flow specifics

- Provider: Better Auth at `/api/auth`; methods = **Google OAuth + email magic link**; **no passwords** (decision D-2 historically). Magic-link leaf doubles as signup (`shouldCreateUser`). `src/components/auth/LoginForm.tsx`; actions `src/lib/auth/actions.ts` (`signInWithEmail`, `signInWithGoogle`, `signOut`).
- `/signup` = closed-beta request gate (`ClosedBetaGate.tsx`) → POSTs to `/contact?intent=beta-request` (but `/contact` is `force-static` + mailto; no server write).
- `/auth/callback` is **disabled** (always redirects to login with `callback_exchange_failed`); OAuth normalized inside `/api/auth/[...all]`.
- Session cookie `better-auth.session_token` (or `__Secure-` variant); proxy validates per-request via `getCloudflareBetterAuthIdentityFromRequest`.
- Proxy: `src/proxy.ts` → `src/lib/auth/request-proxy.ts`: `/workshop` → unauth redirects `/login?next=…`; `/login` → authed redirects `/workshop`; stamps `x-archestimator-auth-verified` + `x-archestimator-terms-accepted` headers consumed by `src/app/workshop/layout.tsx` + `src/lib/auth/protected-route-gate.ts`.
- Terms gate: `src/lib/legal/terms-gate`, `getCurrentUserTermsAcceptanceStatus`.
- Closed-beta gate: `src/lib/auth/closed-beta-access.ts` + `closed-beta-d1-store.ts`; signed-in-but-not-allowlisted → `/access-required`.

**Smoke implication:** in local E2E the dev-auth bypass satisfies identity; terms gate still needs handling (either seed a terms-accepted row or assert the terms prompt and accept it — see `06_*` §terms, `11_*` Phase 4).

---

## 10. Critical flows (one-liners; full path detail in Lane L3 / `04_*`)

1. **Auth gate (negative)** — unauth `/workshop` → 302 `/login?next=…`.
2. **Login page UI** — `/login` renders Google + magic-link form.
3. **Magic-link submit** — POST `/login` email → `/login?sent=1` (email not asserted in smoke).
4. **Sign-in bypass (smoke auth)** — dev-auth cookie → `/workshop` renders.
5. **Terms** — first protected entry prompts terms; accept → `/workshop`.
6. **Dashboard** — `/workshop` renders homebase.
7. **Project create** — `createProject` action (`src/lib/projects/actions.ts`) → redirect `/workshop/projects/[id]`.
8. **Estimate create+edit** — `createEstimate` + node/row actions (`src/lib/estimates/actions.ts`) → `/workshop/projects/[id]/estimates/[nodeId]`.
9. **Component library** — `/workshop/library/components` loads; create cost component (`src/lib/component-library/actions.ts`).
10. **Proposal export** — `GET /api/projects/[id]/estimates/[eid]/export/proposal.xlsx` → 200 + XLSX (auth + rate-limit).
11. **Publication** — `createProjectPublication` (`src/lib/publication/actions.ts`) → roster `/workshop/publisher`.
12. **Share (open)** — `GET /share/[token]` renders review (no password).
13. **Share (password)** — password gate → unlock → snapshot renders; lockout after 5 tries.
14. **Recipient inbox** — `/workshop/proposals` lists shared-to-me; `openRecipientProposalAction` → `/share/[token]`.
15. **Upload** — `/api/component-library/attachments/direct-upload` reserve→finalize (auth).
16. **Feedback** — `/workshop/feedback` submit → saved banner (`src/lib/workshop/beta-feedback-actions.ts`).
17. **Invite** — `/invite/[token]` entry → accept (auth) → `/workshop`.
18. **Sign-out** — `signOut` → `/login`.

(15 core + 3 secondary; the plan's smoke list trims to 15 in `04_*`.)

---

## 11. Vitest config — `vitest.config.ts`

`environment:"jsdom"`, `globals:true`, `setupFiles:["./tests/vitest/setup.ts"]`, `include:["tests/vitest/**/*.test.{ts,tsx}"]`, `exclude:["node_modules",".next","e2e"]`, `fileParallelism:false` (load-bearing), `testTimeout:30_000`, aliases `@`→`./src`, `server-only`→`./tests/vitest/server-only-stub.ts`. No pool/projects/coverage. `setup.ts` registers `@testing-library/jest-dom/vitest` + jsdom mocks (localStorage, matchMedia, IntersectionObserver, ResizeObserver).

## 11a. TypeScript config — `tsconfig.json` (improvement-audit finding)

**`tsconfig.json:36` excludes `"node_modules", "tests", "e2e", "vitest.config.ts", "playwright.config.ts"`.** Consequence: the repo's `bun run type-check` (`tsc --noEmit`) does **not** cover `e2e/`. The harness must add a dedicated `e2e/tsconfig.json` (extends root, includes `e2e/**/*.ts`) + an `e2e:typecheck` script (T1.5b). Without this, fixture/helper type errors slip through silently. Also confirms `next.config.ts` calls `initOpenNextCloudflareForDev({configPath:"wrangler.next-dev.jsonc"})` in dev (strong evidence for ASSUMP-1: `next dev` actively initializes OpenNext dev bindings).

## 12. Test tiers

| Tier | Location | Runner | ~Files |
|---|---|---|---|
| Unit | `tests/unit/` | `bun test` | 6 |
| DOM/component | `tests/vitest/` | Vitest jsdom | ~633 |
| E2E | `e2e/` | Playwright | 10 |

Vitest subdirs: `tests/vitest/perf/`, `share/`, `project-activity-page/`, `fixtures/` (2), `__snapshots__/`. The ~600 flat `.test.{ts,tsx}` are broad (UI, route contracts, RPC/D1 proof via source-string assertions, auth, AI, uploads, collaboration). Many are source-string contract assertions, not behavioral.

## 13. Existing fixtures (ad hoc)

- `tests/vitest/fixtures/activity-events.ts` — `makeEstimateEvent(overrides)`, `sharedLinkFixtures`, `bannedPublicTerms`; sentinel UUIDs (`11111111-…`).
- `tests/vitest/fixtures/project-charts-golden-master-fixture.ts` — golden-master arrays.
- `tests/fixtures/notifications.ts`, `tests/fixtures/publication-snapshots.ts`.
- `tests/vitest/project-dashboard-ui-fixtures.ts`, `estimate-unification-oracle.fixtures.ts`, `upload-provider-proof-fixture.ts` — read source at runtime (string-contract).
- `src/stories/fixtures/*` — Storybook-only.
- **No `@faker-js/faker`.** Each test builds data inline + `vi.mock("@/lib/auth/session", …)`.

## 14. D1 — schema, no seed

- `wrangler.jsonc`: binding `ARCH_DB`, name `archestimator-proof-db`, id `9bdb29bb-…`, **preview id `363c756a-…`**.
- **38 migrations** (`migrations/0001_`…`0038_`); schema-only. Only `0030_workspace_owner_membership_backfill.sql` and `0035_account_security_events_hmac_checks.sql` have INSERTs (backfill/HMAC, not seed).
- **No D1 seed migration, no seed script.** README documents `wrangler d1 migrations apply ARCH_DB --local` (manual, no package script). No `cf:d1:apply`/`db:seed`.
- `profiles` schema (`migrations/0003_profiles.sql`): `id TEXT PK`, `email TEXT NOT NULL UNIQUE CHECK(lowercase-trimmed)`, `display_name TEXT`, `role TEXT NOT NULL DEFAULT 'member' CHECK(role IN ('ceo','admin','member'))`, `avatar_url TEXT`, + timestamps.
- Legacy seed lives only in `supabase/seed.sql` (old Supabase project `ebxxqidacheyapmmzavr`) — NOT portable, NOT to be used.

## 15. R2 / Images / Queue — no local test double

- R2 `ARCH_UPLOADS_R2` (bucket `archestimator-proof-uploads`, preview `archestimator-proof-uploads-dev`). Images `IMAGES`. Queue `UPLOAD_JOBS_QUEUE` (+DLQ).
- ~15 `tests/vitest/upload-*.test.ts` are source-string/RPC-shape assertions, no real R2. Real upload proof = remote `cf:verify-hosted-upload-*` scripts + `scripts/prove-upload-operations-runbook-local.ts`.
- Image provider default `node-sharp` locally; `cloudflare-images` opt-in.

## 16. Env surface for E2E (`.env.example`, 107 lines)

E2E-load-bearing: `ARCHESTIMATOR_DEV_AUTH_BYPASS`, `ARCHESTIMATOR_DEV_AUTH_EMAIL` (default `philipjonlewis@gmail.com`), `ARCHESTIMATOR_DEV_AUTH_BYPASS_SECRET` (32+), `ARCHESTIMATOR_DEV_AUTH_ADMIN_DB`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `BETTER_AUTH_TRUSTED_ORIGINS`, `BETTER_AUTH_GOOGLE_*`, `ARCHESTIMATOR_TERMS_GATE_SECRET`, `PUBLICATION_TOKEN_ENCRYPTION_SECRET`, `PUBLICATION_TOKEN_HASH_SECRET`, `PUBLICATION_ACCESS_COOKIE_SECRET`, `ARCHESTIMATOR_EMAIL_DELIVERY_ENABLED`, `ARCHESTIMATOR_EMAIL_PROVIDER=cloudflare-email`, `CLOSED_BETA_ACCESS_ENABLED`, `PROJECT_INVITE_ENTRY_ENABLED`, `ARCHESTIMATOR_AI_ENABLED`, `UPLOAD_JOBS_ENABLED`, `ARCHESTIMATOR_UPLOAD_STORAGE_PROVIDER=cloudflare-r2`, `ARCHESTIMATOR_IMAGE_PROCESSING_PROVIDER=node-sharp`, `PLAYWRIGHT_PORT` (3020), `PLAYWRIGHT_STORAGE_STATE`, `ESTIMATES_E2E_PROJECT_ID` (`22222222-…`), `ARCHESTIMATOR_E2E_*` flow flags.

Feature gates default **off**: `CLOSED_BETA_ACCESS_ENABLED=false`, `ARCHESTIMATOR_AI_ENABLED=false`, `UPLOAD_JOBS_ENABLED=0`, `ARCHESTIMATOR_EMAIL_DELIVERY_ENABLED=false`. The smoke env must flip the ones each flow needs.

## 17. `scripts/` — relevant (95 files total)

Performance seed (manifest-only, no DB): `seed-performance-test-data.ts`, `measure-route-transitions.ts`, `measure-library-performance-baseline.ts`. D1 (all remote proof): `generate-cloudflare-d1-*-proof.ts`, `generate-cloudflare-d1-authz-access-matrix.ts`, `verify-cloudflare-d1-runtime-performance-proof.ts`. Upload local runbook: `prove-upload-operations-runbook-local.ts`. **No `seed.ts`/`reset-db.ts`/`apply-migrations.ts`.** Wrangler helper: `wrangler-undici-timeout.mjs`.

---

## Document-impact matrix

| Doc | Affected by audit? | Note |
|---|---|---|
| `playwright.config.ts` | executor edits (Phase 1) | add `globalSetup`, `retries`, `@smoke`/`@quarantine` projects |
| `.env.example` | executor edits (Phase 1) | add consolidated `ARCHESTIMATOR_E2E_SMOKE` umbrella + document the `.env.e2e` source-of-truth |
| `.github/workflows/` | executor creates (Phase 8) | reactivated smoke job |
| `package.json` | executor edits (Phase 1,8) | add `test:e2e:smoke`, `e2e:seed`, `e2e:reset` |
| `migrations/` | **no change** | seed is script-based, local-only |
| `e2e/` | executor adds `fixtures/`, `helpers/`, `globalSetup.ts`, smoke specs | additive |
| `scripts/` | executor adds `scripts/e2e/seed-local.ts`, `reset-local.ts` | additive |
| Existing specs | **no change** | untouched |
| Application source (`src/`) | **no change** | untouched |

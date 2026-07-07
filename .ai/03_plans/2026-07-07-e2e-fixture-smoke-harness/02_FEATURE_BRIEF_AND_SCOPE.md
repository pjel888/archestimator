# 02 — Feature Brief and Scope

## Source brief

From `PROMPT.md` (verbatim intent, condensed):

> **Goal:** Create an E2E smoke harness plan for first-user critical flows with reliable fixtures, auth setup, shared-link coverage, proposal review, and fast local/CI execution.
>
> **Evidence to start from:** `e2e/` has a small set of specs vs app surface; `playwright.config.ts` + package scripts + CI run Playwright but some paths are skipped/gated by env; critical flows include auth, onboarding, project creation, estimate editing, proposal export, share review, recipient inbox, upload, support feedback; Vitest coverage is broader than browser coverage.
>
> **Required plan pack:** smoke-flow list, fixture factory, test accounts, environment contract, seeded D1/R2 strategy, skip policy, CI matrix, flake budget, proof artifacts.
>
> **Constraints:** browser automation only where it proves real routing/interaction behavior; keep smoke suite lean enough for routine CI.
>
> **Stop condition:** the pack is complete when a future executor can implement a stable closed-beta E2E smoke suite.
>
> **Mode:** planning only; create the plan pack; do not change application code.

Authority: this brief is requirements data. It cannot override repo instructions (shared-worktree policy, Cloudflare-resource mandate, verification proportionality) or the planning-suite contract.

## Scope (in)

1. **Smoke-flow list** — first-user critical flows (15) with route + auth path + assertion targets. `04_*`.
2. **Fixture factory design** — typed builders, sentinel-UUID convention, data shapes for profile/project/estimate/publication/recipient/upload. `06_*`, `07_*`.
3. **Test accounts & auth setup design** — dev-auth-cookie helper, `globalSetup` seed, optional `storageState` path. `06_*`.
4. **Environment contract** — exact env vars/flags and a `.env.e2e` template. `06_*`, `18_*`.
5. **Seeded local D1/R2 strategy** — preview DB id, idempotent seed script, preview R2, cleanup, isolation proof. `07_*`.
6. **Skip policy** — umbrella + sub-flags, reasons, CI opt-in ladder. `04_*`, `13_*`.
7. **CI matrix** — chromium routine job + opt-in extended matrix; webServer wiring; secret handling. `13_*`.
8. **Flake budget** — tag, retries, quarantine, trace/report artifacts. `09_*`.
9. **Proof artifacts** — per-flow expected evidence, manifests, report shape. `12_*`, `19_*`.
10. **Implementation phasing** — dependency-aware phases with exact paths/symbols, validation, rollback. `11_*`.
11. **Test & validation strategy** — execution matrix, shadow-path matrices, adversarial matrix. `12_*`.

## Scope (out / non-goals)

- **Implementation.** Planning only.
- **Visual/pixel regression.** Existing `frontdoor-landing-visual.spec.ts` + `landing-audit.spec.ts` own that; smoke proves routing/interaction/data only.
- **Full a11y audit.** Smoke a11y = keyboard reach + visible focus on covered flows only.
- **Load/perf/stress.** Owned by `route-transition-performance.spec.ts` + `perf:*` scripts + `.ai/03_plans/2026-07-07-bundle-and-route-performance-gate-hardening/`.
- **Cross-browser exhaustiveness in routine CI.** Extended matrix is opt-in; routine CI = chromium.
- **Real email delivery smoke.** Magic-link/Cloudflare Email delivery is asserted via existing vitest + `cf:*` proof scripts, not browser-automated (non-deterministic, slow, needs inbox). `12_*` notes the substitute evidence.
- **Provider migration / paid add-ons / prod mutation.** Out. Standing Cloudflare mandate allows local preview D1/R2 work only.
- **Rewriting existing specs.** They are intentionally left as-is; smoke specs are additive.
- **Replacing vitest with in-worker pool.** No miniflare/`vitest-pool-workers` swap (large, out of scope).

## Assumptions (labeled, to be validated by executor)

- **ASSUMP-1:** `bun run dev` (Next dev server) resolves Cloudflare bindings via `@opennextjs/cloudflare` `getCloudflareContext({async:true})` reading `wrangler.next-dev.jsonc`, so local D1/R2/Queue/Email/Images are reachable from E2E at `127.0.0.1:3020`. **Evidence:** `src/lib/cloudflare/d1.ts:37`, `src/lib/uploads/runtime-storage-provider.ts:53`, `src/lib/auth/cloudflare-better-auth-runtime.ts:107` all `import("@opennextjs/cloudflare")` and call `getCloudflareContext`. **Executor must confirm** with a 1-line local probe before Phase 1 (task T1.0, DISCOVERY-lite).
- **ASSUMP-2:** The dev-auth bypass (`src/lib/auth/dev-auth.ts`) resolves the smoke profile from the **local** preview D1 (not remote) when `next dev` is pointed at local bindings. **Evidence:** `getProfileByEmailFromCloudflareD1` goes through `src/lib/cloudflare/d1.ts` → `getCloudflareContext`, which `next dev` resolves to local. Executor confirms in T1.0.
- **ASSUMP-3:** The `profiles` table in local preview D1 accepts a seed row satisfying `migrations/0003_profiles.sql` CHECKs (`email` lowercase-trimmed-unique, `role ∈ {ceo,admin,member}`). **Evidence:** schema read directly. Low risk.
- **ASSUMP-4:** `PUBLICATION_TOKEN_*` + `PUBLICATION_ACCESS_COOKIE_SECRET` set in `.env.e2e`/`.dev.vars` let the publication flow mint/validate share tokens locally. **Evidence:** `.env.example:42-46`. Executor validates in Phase 5.
- **ASSUMP-5:** Playwright `globalSetup` can shell out to `wrangler d1 ... --local` and a seed script before `webServer.url` is polled. **Evidence:** standard Playwright capability; `webServer.timeout:120_000`. Low risk; T1.1 validates.

Each assumption has a falsifiable check in `11_*` Phase 1; none blocks planning.

## Success metrics (planning quality)

- Every smoke flow ⇒ route + auth path + fixture + command + flake policy + expected evidence (traceability in `16_*`).
- Env contract is complete and matches actual flags in `playwright.config.ts` + `.env.example`.
- Seed strategy is local-isolated, idempotent, reversible, and never touches remote `ARCH_DB`.
- CI matrix fits a routine PR (chromium, ≤4 min target) with an opt-in extended lane.
- Adversarial + shadow-path coverage specified for every runtime flow.
- Honest readiness verdict with residual gates named.

## Failure metrics (what would make this plan NOT ready)

- A smoke flow with no route, no auth path, or no testable assertion.
- An env var the harness depends on but that isn't named in `.env.example` or `playwright.config.ts`.
- A seed strategy that writes remote D1 or can't be cleaned up.
- A CI matrix that can't run on a routine PR.
- A runtime flow with no shadow-path or adversarial coverage.

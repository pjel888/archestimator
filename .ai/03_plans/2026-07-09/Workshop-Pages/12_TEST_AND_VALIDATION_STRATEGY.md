# 12 — Test and Validation Strategy

Lightest proof that proves the claim. This is a client-render structure change → DOM/interaction + build + e2e + manual-nav evidence is the primary evaluator. No provider/data proof needed. **Proof-contract rows live in `16_REQUIREMENTS_TRACEABILITY_MATRIX.md` (PROOF-1..8); this doc gives the layer breakdown and the breaking-test inventory.**

## Test Execution Matrix

| Requirement | Test file path | Test type | Existing/new | Fixture/data setup | Command | Expected evidence | Known pre-existing reds | Owner |
|---|---|---|---|---|---|---|---|---|
| FR-1 (sidebar persists) | `e2e/route-transition-performance.spec.ts` (+ mount probe) | e2e | **extend existing** | prod build; authed session | `bun run test:e2e -- route-transition-performance` | `MainSidebar` mount count =1; `overlayCount===0` | — | impl |
| FR-2 (no dashboard skeleton on client nav) | `e2e/route-transition-performance.spec.ts` | e2e/DOM | extend existing | prod build | `bun run test:e2e` | dashboard skeleton not rendered on client nav | — | impl |
| FR-3/SEC-1 (gate synchronous-first) | `08` static gate + denial test | static+integration | new/extend | source + unauth/terms/bypass fixtures | code inspection + `bun run test` | redirects identical; no content pre-gate | — | impl |
| SEC-1 (denial) | (new) `tests/vitest/workshop-gate-denial.test.ts` | integration | new | unauth/terms-pending/dev-bypass | `bun run test` | redirect `/login`/terms; no content | — | impl |
| A11Y-1 (semantics) | `e2e` + axe | a11y+e2e | new | prod build | `bun run test:e2e` | one landmark; aria-live; ⌘1–5; focus restored | — | impl |
| PERF-1 (evaluator) | `e2e/...budgets.json` + `perf-baseline.md` | e2e+profiler | new | prod build | `bun run test:e2e:perf` | transitionMs/prefetch/overlay+INP/CLS/LCP recorded | — | impl |
| **Shell-governance (BREAKING — P1-3)** | `tests/vitest/project-dashboard-route-shell-ui.test.ts`, `tests/vitest/estimate-sheet-route-loading.test.ts`, fixtures `tests/vitest/project-dashboard-ui-fixtures.*` | unit/DOM (source-content) | **UPDATE existing** | source strings | `bun run test:dom` | re-targeted to `WorkshopShell`/`WorkshopRouteHeader` | **WILL GO RED on Phase 1** — WP-1.7 updates them | impl |

## BREAKING TEST INVENTORY (resolves P1-3 — verified against source)
The refactor touches symbols these tests assert on exact source content. They are **not** pre-existing reds; they will flip red the moment `WorkshopPageShell` is split. WP-1.7 updates them in the same PR.
- `tests/vitest/project-dashboard-route-shell-ui.test.ts:45` — asserts `projectEstimatesPage` does **not** contain `WorkshopPageShell`.
- `:49,52,54,55,57,63,69` — assert `WorkshopPageShell` source contains `data-workshop-page-shell-root`, `<AuthenticatedMainSidebar status={sidebarStatus} />`, `<Suspense fallback={<WorkshopShellContentFallback />}>`, `function WorkshopShellContentFallback()`, `async function AuthenticatedMainSidebar`, and the shell preamble excludes `getCurrentUserContext()`/`ensureDefaultWorkspace()`.
- `tests/vitest/estimate-sheet-route-loading.test.ts:17` — asserts `projectEstimateNodeLoading` excludes `WorkshopPageShell`.
- Fixtures: `tests/vitest/project-dashboard-ui-fixtures.*`.

**Planned updates (WP-1.7):** re-target the shell assertions at `WorkshopShell` (the new `data-workshop-page-shell-root` + `AuthenticatedMainSidebar` + `WorkshopContentSkeleton` owner) and the per-page header at `WorkshopRouteHeader`; keep the governance intent (shell preamble excludes auth/DB reads — now trivially true since the gate stays in the layout). Re-assert the project estimates/list pages import `WorkshopRouteHeader` (not the full shell).

## Existing relevant coverage to preserve/regression-check
- `tests/vitest/main-sidebar-favorites-live-region.test.tsx`, `main-sidebar-proposals-item.test.tsx`, `use-sidebar-favorites-query.test.tsx`, `sidebar-favorites-cache.test.ts` — sidebar behavior; should stay green (MainSidebar unchanged structurally).
- `tests/vitest/workshop-notification-entry.test.tsx` — header action; verify it works under `WorkshopRouteHeader`.
- e2e bfcache test (`route-transition-performance.spec.ts` back/forward) — rerun post-Phase-1 (P2-2).

## Repo-native scripts
- `bun run type-check`, `bun run build`, `bun run start`, `bun run test` (bun unit), `bun run test:dom` (vitest), `bun run test:e2e` / `test:e2e:perf` (Playwright), `bun run lint` (+ `lint:design-system`/`lint:design`), `bun run validate:error-handling`.
- `bun run validate` is broad — not warranted for a contained refactor; use the targeted set above (proportional per AGENTS.md).

## What is NOT required (and why)
- Hosted/Cloudflare/provider proof: no provider/data surface touched.
- Storybook/impeccable full audit: proportional policy; targeted browser proof suffices. Separate pass if Philip requests.
- Broad `bun run validate`: contained change → targeted set above.

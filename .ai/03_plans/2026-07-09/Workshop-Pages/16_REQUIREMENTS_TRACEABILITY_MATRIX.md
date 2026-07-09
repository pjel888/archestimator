# 16 — Requirements Traceability Matrix

Maps every requirement to source evidence, work unit, acceptance criteria, and proof. Format per `Improve-Plan-Prompt.md:546-552`. No requirement is untraced.

| Req ID | Requirement | Source evidence | Source strength | Plan section | Work unit | Acceptance criteria | Test/proof | Risk | Status | Gap/decision |
|---|---|---|---|---|---|---|---|---|---|---|
| FR-1 | Persistent chrome across top-level nav (no sidebar remount) | `WorkshopPageShell.tsx:178-211`, `StaticWorkshopLoadingShell.tsx:39` (both mount `MainSidebar`); `layout.md:152-154` (layouts persist) | repo-evidence + official-docs | 06, 11 Phase 1 | WP-1.1..1.7 | `MainSidebar` mounts once across `/workshop`↔`/workshop/projects` in prod build | e2e `authenticatedWorkshopTransition` + mount probe (PROOF-1) | RISK-1 double-wrap | pending | OPEN-1 (sidebarStatus flow) |
| FR-2 | Content-only loading on client nav (no 9.3KB skeleton) | `proposals/loading.tsx` (475B) vs `workshop/loading.tsx` (9347B); `instant-navigation.md:99-107` | repo-evidence + official-docs | 06, 11 WP-1.6 | WP-1.6 | dashboard skeleton absent on client nav; content skeleton shows | PROOF-2 (DOM assertion) | RISK-3 | pending | — |
| FR-3 | Non-blocking gate | **WITHDRAWN/RECLOLASSIFIED** — see 08/11 Phase 2. Gate blocking is intentional (security). | official-docs + repo-evidence | 11 Phase 2 (WP-2.1) | WP-2.1 | gate documented as intentional; no defer | PROOF-3 (static gate) | — | reclassified | merged into SEC-1 |
| ARCH-1 | Keep nested `/workshop/*` URLs | `prefetching.md:191-193`, `route-groups.md:30-31` | official-docs + owner-delegated | 15 DEC-01 | (no change) | URL inventory unchanged | route inventory check | — | recommended | needs owner ack |
| UX-1 | No regression to loading affordances | `route-loading-overlay.tsx`, existing loading files | repo-evidence | 05, 11 WP-1.6 | WP-1.6, WP-3.1 | content skeleton or global overlay always visible; no blank | PROOF-4 (manual matrix) | RISK-3 | pending | — |
| A11Y-1 | Preserve a11y semantics during nav | `StaticWorkshopLoadingShell` aria-live; sidebar landmarks | repo-evidence | 05 | WP-1.1, WP-1.6 | one landmark; aria-live correct; ⌘1–5 work; focus restored | PROOF-5 (axe + keyboard) | RISK-3 | pending | — |
| SEC-1 | Gate = sole prod verifier, synchronous-first (CORRECTED) | `protected-route-gate.ts:26-39`, `request-proxy.ts:195,227-248`, `workshop/layout.tsx:23-37` | repo-evidence (corrected) | 08, 11 Phase 2 | WP-2.1 | denial tests + static gate (see 08 AC) | PROOF-6 (denial+static) | RISK-2 | pending | — |
| PERF-1 | Performance evaluator | derived | derived | 09, 11 Phase 0 | WP-0.1 | baseline + post numbers recorded | PROOF-7 (e2e + vitals) | RISK-4 | pending | no prod RUM (P2-1 gap) |
| DOC-1 | Record routing decision + rationale | derived | derived | DOC task | WP-DOC | note in current-state.md + code comment | static | — | pending | — |

## Proof-contract rows (per `Improve-Plan-Prompt.md:873-875`)

| Proof ID | Req IDs | Impl unit | Layer | Fixture/input | Assertion | File target | Command/evidence | Red/green | Cleanup/skip |
|---|---|---|---|---|---|---|---|---|---|
| PROOF-1 | FR-1 | WP-1.1..1.7 | e2e | prod build; authed session | `MainSidebar` mount count =1 across `/workshop`→`/workshop/projects` | `e2e/route-transition-performance.spec.ts` | `bun run test:e2e -- route-transition-performance` | green | none |
| PROOF-2 | FR-2 | WP-1.6 | e2e/DOM | prod build | `[data-workshop-page-shell-root]` present once; dashboard skeleton not rendered on client nav | `e2e/route-transition-performance.spec.ts` | `bun run test:e2e` | green | none |
| PROOF-3 | FR-3/SEC-1 | WP-2.1 | static | source | every `redirect()` precedes JSX in layout | `08` static gate | code inspection | green | n/a |
| PROOF-4 | UX-1 | WP-1.6/WP-3.1 | manual | prod build | no blank/unresponsive screen across nav matrix | — | manual nav matrix | pass | — |
| PROOF-5 | A11Y-1 | WP-1.1/WP-1.6 | a11y+keyboard | prod build | one landmark; aria-live; ⌘1–5; focus restored | axe/cli + Playwright | `bun run test:e2e` | green | — |
| PROOF-6 | SEC-1 | WP-2.1 | integration/denial | unauth + terms-pending + dev-bypass fixtures | redirects identical pre/post; no content in body | (new/existing denial test) | `bun run test` (focused) | green | — |
| PROOF-7 | PERF-1 | WP-0.1 | e2e+profiler | prod build | transitionMs/prefetch/overlay + INP/CLS/LCP recorded | `e2e/...budgets.json` + `perf-baseline.md` | `bun run test:e2e:perf` | recorded | dev label |
| PROOF-8 | WP-1.7 | WP-1.7 | unit/DOM | source strings | shell-governance tests re-targeted to `WorkshopShell`/`WorkshopRouteHeader` | `tests/vitest/project-dashboard-route-shell-ui.test.ts`, `estimate-sheet-route-loading.test.ts` | `bun run test:dom` | green | — |

## Work-unit → requirement reverse trace
WP-0.1→PERF-1; WP-1.1→FR-1/A11Y-1; WP-1.2→FR-1/UX-1; WP-1.3→FR-1/SEC-1; WP-1.4→FR-1/UX-1; WP-1.5→FR-1 (P0-4); WP-1.6→FR-2/UX-1/A11Y-1; WP-1.7→(test); WP-2.1→SEC-1/FR-3; WP-3.1→UX-1/FR-2; WP-4.1→(optional); WP-DOC→DOC-1.

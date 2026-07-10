# 01 — Inventory, Baseline Scorecard, and Audit Findings Register

**Improvement run:** 2026-07-09 (cycle 1 of the Improve-Plan-Prompt suite).
**Verification used:** 2 independent read-only lanes (industry-facets research + adversarial review), both verified against current source by the lead. This doc records the *baseline* (pre-improvement) state and the findings register that drives this improvement cycle.

---

## A. Document inventory (baseline, before this cycle)

| Doc | Purpose | Authority | Status | Notable gaps (baseline) |
|---|---|---|---|---|
| README.md | Entrypoint, status, phase order | High | Had **wrong status** (`IMPLEMENTATION-READY (emulated)`) | P0-1 |
| 00_AGENT_COORDINATION.md | Goal, orchestration, ledger | High | OK; stated `emulated` | — |
| 02_FEATURE_BRIEF_AND_SCOPE.md | Brief, scope, non-goals | High | OK | — |
| 03_SOURCE_AND_CODEBASE_AUDIT.md | Route map + root-cause + doc cites | High | Strong forensics; minor line-cite drift | P2-5 |
| 04_REQUIREMENTS_SPECIFICATION.md | Requirements + acceptance | High | Missing proof rows for DOC-1/UX-1/A11Y-1 | P1-2 |
| 06_ARCHITECTURE_AND_TECHNICAL_DESIGN.md | Current vs target arch | High | Core reconciliation hand-waved | P0-3/P0-4 |
| 09_PERFORMANCE… | Perf evaluator + budgets | High | No INP/CLS/LCP, no bundle/bfcache | P2-1/P2-2 |
| 10_BLAST_RADIUS… | Impact map | High | OK; missing breaking tests | P1-3 |
| 11_IMPLEMENTATION_PLAN.md | Phased tasks | High | "decide in-task", SEC unsafe | P0-2/P0-3/P1-1 |
| 12_TEST_AND_VALIDATION_STRATEGY.md | Test matrix | High | Ignores breaking tests; no proof-contract rows | P1-3/P1-2 |
| 14_RISK_REGISTER.md | Risks | High | SEC mischaracterized (RISK-2) | P0-2 |
| 15_DECISIONS… | Decisions | High | DEC-03 "choose in-task" | P1-1 |
| 17_FINAL_READINESS_REVIEW.md | Scores + verdict | High | Inflated; wrong status | P0-1/P2-6 |
| 19_RESEARCH… | Doc research + QA matrix | High | OK; no industry facets | P2-* |

**Missing docs (baseline):** `05_UX_UI_ACCESSIBILITY`, `08_SECURITY_PRIVACY_THREAT_MODEL`, `13_ROLLOUT_ROLLBACK_AND_OPERATIONS`, `16_REQUIREMENTS_TRACEABILITY_MATRIX`, `18_STACK_CONTRACT_AND_PRODUCTION_STANDARDS`. These are **mandatory** per the Improve prompt for this (behavior-bearing, auth-touching) package.

## B. Source hierarchy
1. User intent (brief) → product goal.
2. Current source / `AGENTS.md` / current-state → implementation reality.
3. Local Next.js 16.2.10 docs (`node_modules/next/dist/docs/`) + official docs → framework behavior.
4. Older plans/memory → lowest.

## C. Baseline scorecard (per the Improve prompt's categories, scored against pre-cycle docs)

| Category | Baseline score | Cap reason |
|---|---|---|
| Strategy & Product Value | 92 | DEC-01 owner-ack pending *(RESOLVED 2026-07-10 — Philip acked keep-nested)* |
| Requirements Quality | 82 | missing proof rows (P1-2) |
| React/Next.js Technical Readiness | 78 | core reconciliation undecided (P0-3/P0-4); no route cache contract |
| Architecture & Code Quality | 80 | child→layout slot contract unresolved |
| Data/API/Integration Safety | n/a | no data/API scope |
| Security/Privacy/Compliance | **68** | **SEC-1 mischaracterizes the gate; no threat model** (P0-2, P1-4). Cap = 79→68 for the safety error |
| UX/A11y/Product Experience | 80 | no state matrix, no a11y proof matrix |
| Performance/Scalability | 82 | no INP/CLS/LCP; no bundle/bfcache |
| Reliability/Observability/Ops | 84 | adequate |
| Testing/QA/Verification | **74** | **ignores existing breaking tests** (P1-3); no proof-contract rows |
| Rollout/Governance | 82 | per-phase revert OK; no go/no-go checklist |
| **Overall (baseline)** | **~78** | **NOT READY→CONDITIONALLY** |

## D. Findings register (this cycle's actionable list)

| ID | Sev | Finding | Required fix | Doc(s) |
|---|---|---|---|---|
| P0-1 | P0 | Status `IMPLEMENTATION-READY` contradicts emulated+behavior-bearing rule | Downgrade to `CONDITIONALLY READY`; require real independent verifier or owner acceptance for IR | README, 17 |
| P0-2 | P0 | SEC-1 mischaracterizes layout as "backstop" — it is the **sole prod auth+terms verifier**; Phase 2 Option A is unsafe | Rewrite SEC-1 + Phase 2; gate decision must complete before content renders; add threat model | 04, 08, 11, 14, 17 |
| P0-3 | P0 | Phase 1 reconciliation (title/actions/breadcrumbs/footer/`sidebarStatus`/4 canvas washes) hand-waved | Define concrete child→layout slot contract (client context provider) | 06, 11 |
| P0-4 | P0 | `ProjectMiniSidebar` + `alignChromeToProjectSidebar` + `ProjectTotalFooterOverlay(projectId)` interaction unaddressed | Enumerate exact project/library nested-layout prop changes; preserve mini-sidebar + padding | 06, 11 |
| P1-1 | P1 | "decide in-task"/"both safe" instructions (forbidden) | Replace with concrete defaults / logged open decisions | 11, 15, 06 |
| P1-2 | P1 | No traceability matrix (16); DOC-1/UX-1/A11Y-1/PERF-1 lack proof rows | Create 16 with mandated columns + proof-contract rows | 16, 12 |
| P1-3 | P1 | Existing breaking tests ignored (`project-dashboard-route-shell-ui`, `estimate-sheet-route-loading`) | List + plan updates in 11/12 | 11, 12, 10 |
| P1-4 | P1 | No threat-model doc for a P0 auth-gate change | Create 08 | 08 |
| P2-1 | P2 | No INP/CLS/LCP measurement | Add to PERF-1 harness | 09, 12 |
| P2-2 | P2 | bfcache (`BfcacheHandler`/`bfcacheRestore`) interaction unanalyzed | Add behavior-preservation note | 09, 14 |
| P2-3 | P2 | Route segment config (`export const dynamic`) undiscussed | Address in 06/18 (conclusion: do NOT add `force-dynamic`; `headers()` opts in) | 06, 18 |
| P2-4 | P2 | React Compiler / View Transitions posture unstated | State as explicit non-goals with evidence | 18, 20 |
| P2-5 | P2 | Line-cite drift (`70-106` vs `93-106`) | Re-anchor cites | 03 |
| P2-6 | P2 | Scores inflated | Re-score honestly in 17 | 17 |

## E. New evidence gathered this cycle (verified against source)
- **Auth gate mechanics (P0-2):** `protected-route-gate.ts:26-39` — gate requires BOTH `authVerified` AND `termsAccepted` headers; `request-proxy.ts:195` sets them **only in dev bypass**; prod protected path (`:243-248`) sets **neither** → `isProtectedRouteGateSatisfied()` is **false on every prod workshop request** → `workshop/layout.tsx:23-37` is the **sole prod verifier**. **Layout gate reads cannot be Suspense-deferred.**
- **Breaking tests (P1-3):** `tests/vitest/project-dashboard-route-shell-ui.test.ts:45,49,52,54,55,57,63,69` assert exact `WorkshopPageShell` source strings; `estimate-sheet-route-loading.test.ts:17` asserts `projectEstimatesPage` excludes `WorkshopPageShell`. Refactor flips these red.
- **Per-page chrome variation (P0-3):** 4 distinct `canvasClassName` washes (`dashboard-transparent-shell`, `projects-canvas-wash`, `publisher-canvas-wash`, `library-canvas-wash`); `titleSlot`/`actions`/`centerHeader`/`subHeader`/`projectId`/`sidebarStatus`/`alignChromeToProjectSidebar` all vary per page.
- **Top-level shell consumers (corrected):** `workshop`, `proposals`, `projects`, `publisher`, `settings` (+ 7 settings sub-pages), `feedback`. **NOT** `onboarding`, `components`, `templates`, `terms`.
- **Industry facets (research lane):** React Compiler OFF; no prod RUM for Web Vitals (dev-only `WebVitalsProbe`); `BfcacheHandler` exists; View Transitions not used; no route segment config anywhere; bundle analyzer installed (`@next/bundle-analyzer`, `ANALYZE=true`); **strong existing perf harness** `e2e/route-transition-performance.spec.ts` with `authenticatedWorkshopTransition` test + budgets — the right vehicle for the regression assertion.

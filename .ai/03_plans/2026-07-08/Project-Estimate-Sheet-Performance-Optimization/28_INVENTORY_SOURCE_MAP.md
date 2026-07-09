# 28 - Inventory, Source Map, And Assumption Register

## Purpose

Improve-Plan-Prompt Phase 1 requires every planning package to maintain:

- An inventory of every document, its purpose, and its authority level.
- A source hierarchy: which document controls when information conflicts.
- A requirements map: every requirement and which source created it.
- A decision map: accepted decisions, rejected alternatives, and rationale.
- An assumption register: every unverified assumption and its impact.
- An evidence map: repo files, tests, docs, provider artifacts, or external docs that support important claims.
- A missing-source list: decisions, requirements, source files, provider evidence, or docs needed before implementation.

This document is the single source of truth for those registers within the pack. Other docs reference back to here rather than duplicating.

This is a planning/reference document. It does not authorize code changes.

## Document Inventory

Authoritative as of pass 3 (2026-07-09). All docs live in `.ai/03_plans/2026-07-08/Project-Estimate-Sheet-Performance-Optimization/`.

| # | Document | Authority level | Purpose | Status |
|---|---|---|---|---|
| README | `README.md` | Primary entry | Mission, status, index, scorecard summary | Active (Pass-3 refreshed) |
| 00 | `00_AGENT_COORDINATION.md` | Process | Agent lanes, skills, evidence lanes, review loop | Active |
| 01 | `01_EXECUTIVE_SUMMARY.md` | Decision summary | Verdict, strengths, gaps, top priorities | Active |
| 02 | `02_FEATURE_BRIEF_AND_SCOPE.md` | Product scope | Goals, non-goals, users, scale targets | Active (Pass-1 component-interop update) |
| 03 | `03_SOURCE_AND_CODEBASE_AUDIT.md` | Code evidence | Current code findings with exact files | Active — verified accurate in Pass-3 |
| 04 | `04_REQUIREMENTS_SPECIFICATION.md` | Requirements | REQ-F/P/R/D/T/DOC/CI/CRUD | Active (Pass-1 CI additions) |
| 05 | `05_UX_UI_ACCESSIBILITY_PLAN.md` | UX/a11y | Interaction, a11y, perceived performance | Active (Pass-3 mobile + WCAG refs) |
| 06 | `06_ARCHITECTURE_AND_TECHNICAL_DESIGN.md` | Architecture | Normalized graph target, ADR | Active |
| 07 | `07_DATA_DATABASE_API_NETWORK_PLAN.md` | Data/API | D1, query keys, route, network | Active |
| 08 | `08_SECURITY_PRIVACY_THREAT_MODEL.md` | Security | Auth, data exposure, proof redaction | Active |
| 09 | `09_PERFORMANCE_RELIABILITY_OBSERVABILITY.md` | Performance | Budgets, telemetry, reliability | Active (Pass-3 budget expansion) |
| 10 | `10_BLAST_RADIUS_AND_DEPENDENCIES.md` | Risk surface | Affected modules, dependency posture | Active |
| 11 | `11_IMPLEMENTATION_PLAN.md` | Implementation | Phase 0-6 units, exit criteria | Active (Pass-3 exit criteria + Phase 0.5) |
| 12 | `12_TEST_AND_VALIDATION_STRATEGY.md` | Test strategy | Matrix, commands, fixtures, evidence | Active (Pass-2 component-interop matrix) |
| 13 | `13_ROLLOUT_ROLLBACK_AND_OPERATIONS.md` | Ops | Flags, deploy, monitoring, rollback | Active (Pass-3 hosted-proof runbook) |
| 14 | `14_RISK_REGISTER.md` | Risk | 30 risks (15 perf + 6 interop + 9 pre-mortem) | Active (Pass-3 pre-mortem) |
| 15 | `15_DECISIONS_ASSUMPTIONS_AND_ALTERNATIVES.md` | Decisions | ADRs, rejected paths, open decisions table | Active (Pass-3 owner/deadline/impact table) |
| 16 | `16_REQUIREMENTS_TRACEABILITY_MATRIX.md` | Traceability | REQ-to-unit-to-test mapping | Active (Pass-3 named test files) |
| 17 | `17_FINAL_READINESS_REVIEW.md` | Readiness | Verdict, go/no-go, blind spots | Active (Pass-3 blind spots) |
| 18 | `18_STACK_CONTRACT_AND_PRODUCTION_STANDARDS.md` | Stack | Official docs, stack constraints | Active |
| 19 | `19_RESEARCH_REVIEW_AND_QA_EVIDENCE.md` | Research | Subagent, GitNexus, research evidence | Active |
| 20 | `20_PERFORMANCE_EVALUATOR_SPEC.md` | Evaluator | Evaluator contract, metric artifacts | Active |
| 21 | `21_EXECUTION_HANDOFF.md` | Handoff | Ready-to-run first PR scope | Active |
| 22 | `22_COMPONENT_INTEROPERABILITY_SPEC.md` | Spec | Identity contract, three surfaces, QA matrix | Active (Pass-3 CI-QA ↔ test mapping) |
| 23 | `23_FINAL_SCORECARD_AND_READINESS.md` | Scorecard | Scored audit, readiness status | Active (Pass-3 refreshed) |
| 24 | `24_DOMAIN_MODEL_AND_DATA_FLOW.md` | Reference | Entity model, rendering/data layer, hot-path map | Active — verified accurate in Pass-3 |
| 25 | `25_CRUD_SURFACE_AND_MUTATION_MAP.md` | Reference | Every Server Action, RPC, optimistic/rollback | Active — verified accurate in Pass-3 |
| 26 | `26_TEMPLATE_COMPOSITION_AND_INSERTION.md` | Reference | Template entity model, insertion flows | Active |
| 27 | `27_DRAG_AND_DROP_AND_CROSS_PANEL_ARCHITECTURE.md` | Reference | DnD system, three-panel layout | Active |
| 28 | `28_INVENTORY_SOURCE_MAP.md` | Meta | This document | Active (Pass-3 new) |
| 29 | `29_ACCESSIBILITY_PROOF_MATRIX.md` | A11y | WCAG 2.2 AA criteria-to-test mapping | Active (Pass-3 new) |
| — | `LOOP_LEDGER.md` | Process | Durable planning loop ledger | Active |
| — | `evidence/` | Evidence | Phase evidence artifacts | Populated during Phase 0+ |

## Source Hierarchy

When information conflicts, source authority descends in this order:

1. **User intent** (explicit user instruction, attached brief) — controls the product goal.
2. **Repo instructions** (`AGENTS.md`, `.ai/AGENTS.md`, current code, tests, migrations, package metadata, configs, provider readback, worktree state) — controls implementation reality and safety.
3. **Current project state** (`.ai/10_state/current-state.md` fast path, `.ai/10_state/decisions.md`) — controls durable project truth.
4. **Local installed framework docs** (`node_modules/next/dist/docs/` for Next.js 16+ behavior) — controls version-sensitive framework behavior.
5. **Official primary documentation** (Cloudflare developers.cloudflare.com, react.dev, TanStack, WCAG, web.dev) — controls version-sensitive library/provider behavior.
6. **This plan pack** (docs 00-29) — controls the planning contract for this scope.
7. **Archived plans** (`.ai/09_archive/`) — historical context only.
8. **Model memory** — lowest authority.

## Requirements Map

Every requirement ID has a single authoritative source document. Conflicts are resolved upward in the source hierarchy.

| Requirement family | Source doc | Authority basis |
|---|---|---|
| REQ-F* (functional) | Doc 04 | Repo evidence (doc 03 audit) + product intent (user brief) |
| REQ-P* (performance) | Doc 04 + budgets in Doc 09 | web.dev + Cloudflare D1 docs |
| REQ-R* (reliability) | Doc 04 | Repo evidence |
| REQ-D* (data) | Doc 04 + Doc 07 | Cloudflare D1 docs + repo migrations |
| REQ-T* (testing) | Doc 04 + Doc 12 | Repo test scripts |
| REQ-DOC* | Doc 04 | Process |
| REQ-CI* (component interop) | Doc 04 + Doc 22 | Repo evidence (doc 22 source audit) |
| REQ-CRUD* | Doc 04 + Docs 25/26 | Repo evidence (doc 25 source audit) |

## Decision Map

| Decision ID | Decision | Source doc | Status | Rejected alternative |
|---|---|---|---|---|
| DEC-001 | Phase 0 baseline before optimization | Doc 15 | Accepted | Refactor EstimateSheetContent immediately |
| DEC-002 | Normalized graph as target | Doc 15 + Doc 06 | Accepted (conditional on Phase 0 memo) | Blanket memoization; full graph rewrite |
| DEC-003 | TanStack Query remains transport cache | Doc 15 | Accepted | Per-cell edits in query cache |
| DEC-004 | No new dependencies | Doc 15 | Accepted | New grid/data-table engine |
| DEC-005 | D1 indexes must be proven | Doc 15 + Doc 07 | Accepted | Speculative composite indexes |
| DEC-006 | Preserve UX first | Doc 15 | Accepted | Big-bang visual/interaction redesign |
| DEC-007 | Three edit surfaces are distinct | Doc 22 | Accepted | Conflate AddComponentModal edit with EditComponentDrawer |
| DEC-008 | Staged feature-flag rollout | Doc 13 | Accepted | Big-bang cutover |
| OPEN-01..06 | Product decisions | Doc 15 | Open | — |
| OPEN-07 | Mobile/tablet scope | Doc 17 | Open | — |

## Assumption Register

Each assumption has an ID, impact, and resolution signal. Assumptions marked `ASSUMP-VERIFIED` were checked against current source in Pass-3.

| ID | Assumption | Impact if wrong | Resolution signal | Status |
|---|---|---|---|---|
| ASSUMP-01 | The active estimate route is protected/authenticated. | Security regression. | Repo: middleware + Better Auth route gate. | ASSUMP-VERIFIED (doc 03) |
| ASSUMP-02 | Cloudflare D1 remains the active database provider. | Plan obsolete. | Repo: wrangler.jsonc + zero @supabase/* packages. | ASSUMP-VERIFIED |
| ASSUMP-03 | Users value edit responsiveness over global search across unloaded subtrees. | Architecture over-build for global search. | Product decision OPEN-01. | Open |
| ASSUMP-04 | Feature flags are acceptable for staged rollout. | Rollback complexity. | Repo: existing NEXT_PUBLIC_* flag pattern. | ASSUMP-VERIFIED |
| ASSUMP-05 | Existing route/profile scripts can be extended rather than replaced. | Rewrite cost. | Repo: scripts/measure-route-transitions.ts exists. | ASSUMP-VERIFIED |
| ASSUMP-06 | Target MVP scale is at least current caps: 1,500 nodes + 5,000 rows. | Architecture over/under-build. | Repo: ESTIMATE_SHEET_TREE_LOAD_LIMITS in load-limits.ts. | ASSUMP-VERIFIED |
| ASSUMP-07 | The fix is staged migration, not big-bang rewrite. | Regression risk. | DEC-002; doc 06 compatibility strategy. | Accepted |
| ASSUMP-08 | D1 free-tier is sufficient for projected MVP usage. | Cost overage or forced paid plan. | Doc 09 budget table (Pass-3); requires Phase 0 D1 proof to confirm. | Open — verify in Phase 0 |
| ASSUMP-09 | Real Chrome behavior at 5k rows will be within budgets. | Performance regression post-launch. | Phase 0 browser spec. | Open — verify in Phase 0 |
| ASSUMP-10 | Restore-deleted can remain unavailable for MVP. | UX expectation mismatch. | Doc 22 GAP-07; delete UX must be clear. | Accepted (deferred) |

## Evidence Map

| Claim | Evidence source | Location |
|---|---|---|
| Route fast path is a null stub | `readEstimateNodeRouteContextD1FastPath` returns null | `src/lib/repositories/workspace-repository.ts:3985` |
| `computeNodeTotals` is O(N) | Recursive walk | `src/components/workshop/estimate-sheet/rows/editable-row-model.ts:383` |
| Server fan-out is efficient (single SQL join) | `propagateProjectComponentRowPatch` | `src/lib/estimates/d1-action-client.ts:1632` |
| Client fan-out is O(N) tree-walk | `patchProjectComponentInstanceRowsInTree` | `src/hooks/use-estimate-row-mutations.ts:1217` |
| Restore throws on D1 | Restore RPC handlers absent for D1 | `src/lib/estimates/actions.ts:3676, :3703` (the throw lives in the D1 RPC dispatcher when an unsupported RPC is invoked) |
| Three edit surfaces are distinct code paths | Source audit | Docs 22, 25; files in `component-library-manager/AddComponentModal.tsx`, `library/EditComponentDrawer.tsx` |
| 40 active D1 migrations | `ls migrations/*.sql` count | `migrations/` (latest `0040_operational_incidents.sql`) |
| Giant components exist | `wc -l` on key files | EstimateSheetContent 2922, EstimateSheetTree 2185, ComponentLibraryManager 2959, AddComponentModal 2339, cells 1304, row-table 1322 |
| Cloudflare bindings | wrangler.jsonc | `wrangler.jsonc`, `cloudflare-env.d.ts` |

## Missing-Source List

What this pack still needs before specific implementation phases can proceed:

| Missing source | Blocks | Resolution action |
|---|---|---|
| Phase 0 browser profile artifact | Phase 1+ optimization claims | Run U0.3 |
| Phase 0 D1 query-plan artifact | Phase 1 D1 fast path | Run U0.4 |
| Phase 0 decision memo ranking bottlenecks | Phase 2 graph store go/no-go | Run U0.5 |
| Hosted D1 proof | Production scale claim | Run doc 13 hosted-proof runbook (when env gates available) |
| WCAG 2.2 AA a11y audit | Phase 4 exit | Run doc 29 proof matrix against implementation |
| Independent reviewer sign-off | Score > 94 | Engage a real second reviewer |
| Product decisions OPEN-01..07 | Phase 2 server search, Phase 3.3 move picker, Phase 4 mobile | Owner product decision |

## Cross-Document Coherence Rules

1. When docs conflict, the higher-authority document in the Source Hierarchy wins.
2. When a doc references a file:line, treat as drift-tolerant (±30 lines acceptable; re-read source before implementation).
3. When a doc claims a Cloudflare/D1/React/Next.js behavior, the local official docs (`node_modules/next/dist/docs/`, developers.cloudflare.com, react.dev) override.
4. When a doc claims current repo state, current source code wins.
5. When a new decision is added, update Doc 15 (decisions) and this doc's Decision Map in the same edit.
6. When a new REQ-* is added, update Doc 04, Doc 16 traceability, and this doc's Requirements Map in the same edit.
7. README index must list every doc; do not orphan.

## Verification

- `verification_mode`: emulated (same-agent Pass-3 audit).
- All file:line references verified against current worktree on 2026-07-09.
- Migration count: 40 confirmed.
- Cloudflare bindings: confirmed via `wrangler.jsonc` + `cloudflare-env.d.ts` presence.

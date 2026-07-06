# Estimate Sheet Tree Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Estimate Sheet Tree reordering reliable, precise, accessible, and provider-honest without regressing context-menu, rename, create, delete, restore, search/filter, lazy-load, active-tab, permission, or external-drop states.

**Architecture:** Ship the workspace-resolution payload hotfix first, then lock branch reorder behavior with characterization and RED tests before changing merge, D1 validation, Move dialog parity, shared Tree drag activation, and component structure. Keep pure reorder planning in `src/lib/estimates/estimate-tree-reorder.ts`, generic interaction behavior in `src/components/ui/tree.tsx`, estimate-specific workflows in `src/components/workshop/EstimateSheetTree.tsx`, and D1 persistence/audit behavior in `src/lib/estimates/d1-action-client.ts`.

**Tech Stack:** Next.js 16.2.6, React 19.2.6, Bun 1.3.14, TypeScript 6.0.3, Tailwind v4, TanStack Query 5.100.14, Zustand 5.0.14, Cloudflare Workers/OpenNext, Cloudflare D1, Better Auth 1.6.22, Vitest 4.1.9, Testing Library, Playwright only for browser-only geometry proof.

---

## 1. Executive Summary

**Canonical artifact:** this file supersedes the package's source docs as the execution overlay. Source docs remain evidence and rationale; implementation agents should execute from this file, then consult linked sources when details are needed.

**Readiness posture:** `CONDITIONALLY READY`.

- `PH-0` is `IMPLEMENTATION-READY` and should ship alone. It adds `target_project_id: project.id` to the reorder RPC payload and updates focused tests.
- `PH-1` through `PH-7` are conditionally ready once their RED/characterization tests and D1 proof harnesses are in place.
- No provider, hosted, production, browser, or manual proof is claimed by this planning pass.

**Primary user value:** the user can reorder and nest estimate tree branches without seeing `Could not reorder estimate tree: Estimate history event workspace could not be resolved.`

**Top implementation decisions:**

- `DEC-001`: Fix the live workspace-resolution failure before any UX or refactor work.
- `DEC-002`: Keep the in-repo `Tree` primitive; do not replace DnD/tree dependencies.
- `DEC-003`: Preserve stored sibling `sort_order` as display order.
- `DEC-004`: Make the Move dialog a placement dialog with before/inside/after/root options.
- `DEC-005`: Add opt-in handle-only drag activation for EstimateSheetTree while keeping shared Tree row-drag default.
- `DEC-006`: Adopt server-confirmed structural fields, especially `sortOrder`, during reorder settle while preserving cached row content.
- `DEC-007`: Split mocked action-wrapper tests from real D1 adapter/local-provider proof.

**Highest risks:**

- `RISK-001`: Every reorder attempt currently fails until `PH-0` lands.
- `RISK-002`: Shared `Tree` changes can regress other consumers unless default behavior is preserved and tested.
- `RISK-003`: Active D1 reorder currently lacks projected-tree cycle validation.
- `RISK-004`: Restore Undo is UI/action-wrapper tested but active D1 restore currently throws.
- `RISK-005`: Current worktree already contains unrelated and partially related modified files; implementation must re-read and preserve them.

## 2. Master Goal And Execution Contract

**Outcome:** Estimate tree branch movement works for flat and nested reorders, uses scoped D1 history, remains accessible by pointer and keyboard, preserves adjacent tree workflows, and has phase-specific proof.

**Scope:** estimate tree reorder, Move dialog parity, shared Tree drag activation, D1 reorder validation/proof, focused state preservation tests, and later behavior-preserving refactor.

**Non-goals:**

- No new DnD/tree dependency.
- No schema migration unless Phase 3 validation uncovers a database invariant that cannot be enforced in existing action/client layers.
- No historical Supabase mutation work.
- No full workshop sidebar redesign.
- No reorder Undo unless the owner explicitly pulls UX-012 into scope.

**Safety constraints:**

- Do not mutate provider state during planning.
- Use only active Cloudflare resources from `wrangler.jsonc` when later provider proof is explicitly run.
- Do not touch legacy Supabase migrations except as archaeology.
- Do not overwrite existing dirty worktree changes.

**Stop condition:** all requirements in Section 4 either pass with listed evidence, are explicitly deferred by owner/product decision, or are blocked with exact unblock action; no unresolved P0/P1 finding remains.

## 3. Planning Ledger And Workstreams

`verification_mode: source-audited-with-live-subagents-plus-current-lead-draft`.

| Lane | Mode | Goal | Scope | Key findings | Status |
| --- | --- | --- | --- | --- | --- |
| Lead coordinator | Current lead | Integrate source docs into canonical plan | Whole package | `PH-0` is implementation-ready; later phases need tests/proof | Complete |
| Source/requirements analyst | Prior live subagent plus current lead | Map docs, requirements, conflicts | `.ai/03_plans/2026-07-06-Estimate-Sheet-Tree/` | R0-R11 map cleanly to phases; source docs agree Phase 0 is first | Complete |
| Codebase architecture analyst | Prior live subagent plus current lead | Map files, symbols, existing tests | Estimate tree source/tests/D1 adapter | Current code still omits `target_project_id`; merge still omits `sortOrder`; Move dialog inside-only | Complete |
| React/Next.js specialist | Current lead with local docs | Check Client Component, Server Function, cache boundaries | Next docs, package metadata, `actions.ts`, `EstimateSheetTree.tsx` | Server Functions are direct POST endpoints; Client Component boundaries must stay narrow | Complete |
| UX/UI/a11y planner | Prior live subagent | Interaction state and accessibility plan | `Tree`, `EstimateSheetTree`, state inventory | Disabled reasons and Move dialog invalid options are not reliably keyboard reachable | Complete |
| Backend/API/integration planner | Prior live subagent plus current lead | Server action and D1 contract | `actions.ts`, `d1-action-client.ts`, migrations | Payload omission causes live error; D1 projected validation remains open | Complete |
| Data/database planner | Current lead | Schema/readback/proof plan | `migrations/0025...`, D1 adapter, repository | No Phase 0 migration; history row proof must be D1 adapter/local-provider, not mocked action test | Complete |
| Security/privacy reviewer | Emulated pass | Threat model and authz gates | Server action, D1, permission UI | Auth/authz mostly present; cycle validation and UI permission gate remain risks | Complete |
| Performance/reliability reviewer | Emulated pass | Budgets and failure handling | Dragover path, D1 query cost, perf tests | Phase 0 performance-neutral; avoid full reorder planning on hover | Complete |
| Test/QA strategist | Prior live subagent plus current lead | Test matrix and adversarial scenarios | Vitest files and D1 proof scripts | Existing coverage should be preserved; precise gaps are listed in Section 19 | Complete |
| Operations/rollout planner | Emulated pass | Rollout, rollback, observability | Plan docs and existing scripts | Ship Phase 0 alone; no new telemetry dependency | Complete |
| Adversarial reviewer | Prior live critic | Disprove readiness claims | Package evidence | Prevented false D1 proof claim from mocked action tests | Complete |
| Final verifier | Native verifier sidecar | Audit this artifact against hard-fail rules | This file and source docs | Pending review at initial draft time; final response records outcome | Pending |

## 4. Source Map

| ID | Source | Authority | Purpose | Requirements/decisions extracted |
| --- | --- | --- | --- | --- |
| `SRC-001` | User request for this goal | Highest product intent | Create `IMPLEMENTATION_PLAN.md` using named prompts/workflows | Planning-only deliverable in the Estimate Sheet Tree package |
| `SRC-002` | `AGENTS.md` | Repo operating contract | Boundaries, stack, verification, provider rules | Cloudflare-only active runtime; use `.ai`; proportional verification; no source edits for planning |
| `SRC-003` | `.ai/10_state/current-state.md` Fast Path | Current project truth | Stack and launch posture | Pre-launch MVP; Next 16/React 19/Cloudflare D1 active |
| `SRC-004` | `.ai/08_prompts/000_Planning Prompts/Create-Implementation-Prompt.md` | Prompt contract | Required plan sections, IDs, evidence hierarchy | Output `IMPLEMENTATION_PLAN.md`, source-map all docs, readiness labels, hard-fail rules |
| `SRC-005` | `.ai/08_prompts/000_Planning Prompts/Multi-Agent-Execution-Directive.md` | Coordination contract | Multi-lane, evidence, completion audit | Planning-only classification; no proof fabrication; verification-mode caps |
| `SRC-006` | `README.md` | Plan-pack overview | Index and readiness summary | Phase 0 hotfix first; later phases conditional |
| `SRC-007` | `00_AGENT_COORDINATION.md` | Source plan | Master goal and lane ledger | Scope, stop condition, file ownership lanes |
| `SRC-008` | `01_EXECUTIVE_SUMMARY.md` | Source plan | Findings and recommended path | RC0 live blocker; merge, Move dialog, Tree drag gaps |
| `SRC-009` | `02_REQUIREMENTS_AND_ACCEPTANCE_CRITERIA.md` | Source plan | R0-R11 and AC0-AC11 | Primary requirements and done evidence |
| `SRC-010` | `03_CURRENT_STATE_AND_EVIDENCE.md` | Source evidence | Current implementation facts | Active `Tree`, server action, D1 adapter, tests, stack |
| `SRC-011` | `04_ROOT_CAUSE_AND_DEBUG_PLAN.md` | Root-cause evidence | RC0-RC8 | Call chain proving missing `target_project_id` |
| `SRC-012` | `05_TARGET_UX_AND_PRODUCT_SPEC.md` | UX target | Pointer/keyboard/status target | Move selection type, state matrix |
| `SRC-013` | `06_TECHNICAL_ARCHITECTURE.md` | Architecture plan | Boundaries and extraction order | Pure planner, shared Tree, EstimateSheetTree, D1 ownership |
| `SRC-014` | `07_DATA_API_AND_PERSISTENCE.md` | Data/API plan | Server action and D1 contract | Payload fix, D1 validation, readback order, no migration |
| `SRC-015` | `08_SECURITY_AND_PRIVACY.md` | Security plan | Authz and threat model | Preserve server boundary; add projected-cycle validation; permission UI decision |
| `SRC-016` | `09_PERFORMANCE_AND_SCALE.md` | Performance plan | Budgets and D1 query cost | Hover stays cheap; Phase 0 neutral |
| `SRC-017` | `10_ACCESSIBILITY_AND_INTERACTION_STATES.md` | A11y plan | WCAG and state gaps | Disabled reasons, focus, live regions, handle-only drag |
| `SRC-018` | `11_TEST_STRATEGY_AND_QA_MATRIX.md` | Test plan | Required tests and commands | Focused suite, D1 proof split, adversarial scenarios |
| `SRC-019` | `12_IMPLEMENTATION_SEQUENCE.md` | Source plan | Phase order | PH-0 through PH-7 sequence |
| `SRC-020` | `13_REFACTORING_AND_BOUNDARIES.md` | Refactor plan | Extraction boundaries | Refactor after tests; avoid new global store |
| `SRC-021` | `14_ROLLOUT_ROLLBACK_AND_OBSERVABILITY.md` | Operations plan | Rollout, rollback, manual QA | Ship Phase 0 alone; production-fire recovery |
| `SRC-022` | `15_RISKS_ASSUMPTIONS_AND_OPEN_QUESTIONS.md` | Risk register | Risks and open questions | RISK-RC0, D1 restore, permissions, validation location |
| `SRC-023` | `16_DECISION_LOG.md` | Decisions | D0-D12 | Keep Tree, test before refactor, proof separation |
| `SRC-024` | `17_TRACEABILITY_MATRIX.md` | Traceability | R0-R11 phase mapping | Initial requirement/test mapping |
| `SRC-025` | `18_STACK_CONTRACT_AND_DEPENDENCIES.md` | Stack contract | Dependency and framework constraints | No new dependencies; Server Actions direct POST; local vs remote D1 proof |
| `SRC-026` | `19_RESEARCH_REVIEW_AND_QA_EVIDENCE.md` | Evidence ledger | Prior subagent/docs evidence | Source-audited with live subagents; no tests run |
| `SRC-027` | `20_STATE_INVENTORY_AND_SHADOW_PATHS.md` | State inventory | Adjacent state surfaces | Preserve context menu, rename, create, delete, restore, search/filter, lazy-load, active-tab, external drops |
| `SRC-028` | `package.json` | Current repo metadata | Versions and scripts | Next 16.2.6, React 19.2.6, Bun, Vitest, test commands |
| `SRC-029` | `src/lib/estimates/actions.ts` | Current source | Reorder server action | `rpcPayload` omits `target_project_id` today |
| `SRC-030` | `src/lib/estimates/d1-action-client.ts` | Current source | D1 adapter and history insert | Reorder reads `args.target_project_id`; restore calls throw |
| `SRC-031` | `src/lib/estimates/estimate-tree-reorder.ts` | Current source | Pure planner and merge | Merge preserves cached content but omits confirmed `sortOrder` |
| `SRC-032` | `src/components/workshop/EstimateSheetTree.tsx` | Current source | Client tree surface | Move dialog inside-only; stateful client component |
| `SRC-033` | `src/components/ui/tree.tsx` | Current source | Shared tree primitive | Drop bands before/inside/after; row owns drag behavior |
| `SRC-034` | `migrations/0025_reusable_source_insert_support.sql` | Current schema | History table constraints | `workspace_id` and `project_id` are NOT NULL; composite FK |
| `SRC-035` | Local Next.js docs in `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md` | Local framework docs | Server/Client boundary | `"use client"` pulls imports into client bundle |
| `SRC-036` | Local Next.js docs in `node_modules/next/dist/docs/01-app/01-getting-started/07-mutating-data.md` | Local framework docs | Server Functions | Direct POST reachability requires auth/authz in every Server Function |
| `SRC-037` | Local Next.js docs in `node_modules/next/dist/docs/01-app/01-getting-started/08-caching.md` | Local framework docs | Cache Components | Avoid cache claims for request-time/private data unless explicitly designed |

**Conflicts resolved:** no source conflict changes the product goal. The only evidence correction is that mocked action-wrapper tests cannot prove D1 history rows; this plan separates those proof classes.

## 5. Requirements Traceability Matrix

| Requirement | Statement | Source | Priority | Phase/WP | Acceptance | Verification | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `REQ-001` | Reorder must not fail workspace resolution | `SRC-009`, `SRC-011`, `SRC-014`, `SRC-029`, `SRC-030`, `SRC-034` | P0 | `PH-0/WP-001` | `AC-001` | Action-wrapper payload test plus D1 adapter/local-provider proof | Planned |
| `REQ-002` | Non-empty branch reorder preserves descendants before/after/inside/root | `SRC-009`, `SRC-010`, `SRC-018` | P1 | `PH-1/WP-003`, `PH-1/WP-004`, `PH-2/WP-007` | `AC-002`, `AC-003` | Pure planner, DOM DnD, optimistic UI tests | Planned |
| `REQ-003` | Confirmed server tree merge adopts structural fields used for future planning | `SRC-008`, `SRC-011`, `SRC-031` | P1 | `PH-1/WP-005`, `PH-2/WP-007` | `AC-004` | Merge regression test | Planned |
| `REQ-004` | Keyboard Move dialog supports before/inside/after/root | `SRC-012`, `SRC-017`, `SRC-032` | P1 | `PH-4/WP-009` | `AC-005` | Context-menu Move dialog DOM tests | Planned |
| `REQ-005` | Pointer DnD communicates before/inside/after and invalid states | `SRC-012`, `SRC-017`, `SRC-033` | P2 | `PH-5/WP-010` | `AC-006` | Shared Tree and EstimateSheetTree DOM tests | Planned |
| `REQ-006` | Active D1 reorder validates projected tree before write | `SRC-014`, `SRC-015`, `SRC-030` | P1 | `PH-3/WP-008` | `AC-007` | D1 action-client/provider test and action-wrapper denial test | Planned |
| `REQ-007` | Readback honors `sort_order ASC, id ASC` | `SRC-014`, `SRC-024`, `SRC-030` | P1 | `PH-3/WP-008` | `AC-008` | Repository/action readback test | Planned |
| `REQ-008` | Disabled reorder states explain why | `SRC-012`, `SRC-017`, `SRC-027` | P2 | `PH-4/WP-009`, `PH-5/WP-010` | `AC-009` | DOM tests for reachable reasons | Planned |
| `REQ-009` | EstimateSheetTree uses handle-only pointer drag while shared Tree preserves row-drag default | `SRC-012`, `SRC-023`, `SRC-033` | P2 | `PH-5/WP-010` | `AC-010` | `ui-tree.test.tsx` plus EstimateSheetTree DOM test | Planned |
| `REQ-010` | Hover and large-tree performance stay within budget | `SRC-016`, `SRC-018` | P2 | `PH-5/WP-010` | `AC-011` | `estimate-tree-drag-over-perf.test.ts` | Planned |
| `REQ-011` | Existing non-reorder states remain protected | `SRC-027`, `SRC-018` | P1 | `PH-1/WP-006`, all later phases | `AC-012` | Existing plus focused preservation tests | Planned |
| `REQ-012` | Permission and provider proof are evidence-class honest | `SRC-015`, `SRC-022`, `SRC-027` | P1 release gate | `PH-3/WP-008`, `PH-7/WP-012` | `AC-013` | D1 proof or explicit release-risk decision | Planned |

## 6. Acceptance Criteria

| ID | Criterion | Required evidence |
| --- | --- | --- |
| `AC-001` | `reorderEstimateTreeNodes` sends `target_project_id: project.id`; flat and nested reorder no longer produce workspace-resolution error | `bunx vitest run tests/vitest/estimate-node-reorder-action.test.ts --maxWorkers=1`; D1 adapter/local-provider history test |
| `AC-002` | Branch-with-descendants pure moves preserve descendant structure | `tests/vitest/estimate-tree-reorder.test.ts` |
| `AC-003` | DOM/optimistic branch moves work and rollback without route refresh | `tests/vitest/estimate-sheet-tree-dnd.test.tsx`, `tests/vitest/estimate-sheet-tree-dom.test.tsx` |
| `AC-004` | Confirmed merge adopts `sortOrder` and keeps cached row content | `tests/vitest/estimate-tree-reorder.test.ts` |
| `AC-005` | Move dialog supports node before/inside/after and root top/bottom with focus return | `tests/vitest/estimate-tree-context-menu.test.tsx` |
| `AC-006` | Pointer before/inside/after/invalid states are visually/structurally distinct | `tests/vitest/ui-tree.test.tsx`, EstimateSheetTree DOM tests; browser proof only if geometry cannot be asserted in DOM |
| `AC-007` | D1 active reorder rejects self/cycle/cross-estimate/cross-tab projected writes before persistence | D1 action-client/provider test and action-wrapper test |
| `AC-008` | Repository/action readback renders stored order | repository/action readback test using `sort_order ASC, id ASC` |
| `AC-009` | Search, rename, saving, optimistic create, invalid move, and permission states expose reachable disabled reasons | DOM/a11y tests |
| `AC-010` | EstimateSheetTree handle starts drag; row body does not; shared Tree default row drag still works | `tests/vitest/ui-tree.test.tsx` and EstimateSheetTree DOM test |
| `AC-011` | Hover validation stays cheap for large flat and nested trees | `tests/vitest/estimate-tree-drag-over-perf.test.ts` |
| `AC-012` | State inventory surfaces are preserved or explicitly release-gated | focused suite in Section 19 |
| `AC-013` | Local, D1, browser, hosted, and production proof are labeled separately in closeout | implementation final report and any proof transcript |

**Work packages, assumptions, decisions, and gates:**

| Work package | Phase | Requirements | Tests/proof | Risks | Gates |
| --- | --- | --- | --- | --- | --- |
| `WP-001` | `PH-0` | `REQ-001`, `REQ-012` | `tests/vitest/estimate-node-reorder-action.test.ts`; `tests/vitest/estimate-actions-d1-reorder-history.test.ts` | `RISK-001`, `RISK-005` | `GATE-001`, `GATE-002`, `GATE-009` |
| `WP-002` | `PH-0` | `REQ-001` | local D1 adapter proof | `RISK-001` | `GATE-002`, `GATE-008` |
| `WP-003` | `PH-1` | `REQ-002` | pure planner branch tests | `RISK-008` | `GATE-003` |
| `WP-004` | `PH-1` | `REQ-002`, `REQ-011` | DOM/optimistic characterization tests | `RISK-005`, `RISK-008` | `GATE-003`, `GATE-009` |
| `WP-005` | `PH-1` | `REQ-003` | RED merge test | `RISK-008` | `GATE-003` |
| `WP-006` | `PH-1` | `REQ-011`, `REQ-012` | state-inventory preservation tests | `RISK-004`, `RISK-009` | `GATE-004`, `GATE-005` |
| `WP-007` | `PH-2` | `REQ-002`, `REQ-003` | merge and optimistic DnD tests | `RISK-008` | `GATE-003` |
| `WP-008` | `PH-3` | `REQ-006`, `REQ-007`, `REQ-012` | D1 action-client/provider and readback tests | `RISK-003`, `RISK-004` | `GATE-002`, `GATE-004`, `GATE-008` |
| `WP-009` | `PH-4` | `REQ-004`, `REQ-008` | Move dialog DOM/a11y tests | `RISK-006`, `RISK-009` | `GATE-005` |
| `WP-010` | `PH-5` | `REQ-005`, `REQ-009`, `REQ-010` | shared Tree, EstimateSheetTree DOM, perf tests | `RISK-002`, `RISK-007` | `GATE-005`, `GATE-006` |
| `WP-011` | `PH-6` | `REQ-011` | full focused suite after extraction | `RISK-005`, `RISK-008` | `GATE-003`, `GATE-007`, `GATE-009` |
| `WP-012` | `PH-7` | all requirements | focused suite, typecheck, diff check, optional browser proof | all open risks | `GATE-001` through `GATE-010` |

| Gate | Evidence class | Passing evidence | Blocks |
| --- | --- | --- | --- |
| `GATE-001` | Local automated | focused action-wrapper tests exit 0 | `PH-0` completion |
| `GATE-002` | Local D1/provider-like automated | D1 adapter/local-provider proof writes scoped history and rejects missing project id | `PH-0` closeout and D1 proof claims |
| `GATE-003` | Local automated | planner, DOM, optimistic, and focused state tests exit 0 | `PH-1` through `PH-3` |
| `GATE-004` | Security/data automated | direct POST/D1 denial tests reject malicious/self/cycle/cross-tab writes | `PH-3` release |
| `GATE-005` | Accessibility/DOM automated | keyboard focus, disabled reason, aria/live status tests exit 0 | `PH-4` and `PH-5` release |
| `GATE-006` | Performance automated | dragover perf tests remain within existing budgets | `PH-5` release |
| `GATE-007` | Type/build static | `bun run type-check` exits 0, or high-memory rerun exits 0 if default heap exhausts | refactor and final closeout |
| `GATE-008` | Provider-backed optional release proof | remote D1 proof uses `ARCH_DB` and is labeled remote/provider-backed | hosted/provider claims only |
| `GATE-009` | Repository hygiene | `git diff --check` exits 0 and diff review shows no unrelated overwrite | every phase closeout |
| `GATE-010` | Browser/manual optional | Playwright/manual smoke proves geometry or browser-only focus/scroll behavior when DOM cannot | browser-only claims |

| Assumption | Statement | Validation or owner |
| --- | --- | --- |
| `ASSUMP-001` | `project.id` from `getCurrentWorkspaceProject(projectId)` is the correct `target_project_id` for D1 reorder history | `PH-0` action-wrapper and D1 proof |
| `ASSUMP-002` | No schema migration is needed for Phase 0 because `estimate_sheet_events` already enforces workspace/project scope | `SRC-034`; D1 proof in `GATE-002` |
| `ASSUMP-003` | DOM/Vitest proof is enough unless geometry, virtualization, scrolling, or browser-only focus behavior changes beyond DOM assertions | `OPEN-005`; browser proof gate if contradicted |
| `ASSUMP-004` | Server-only permission enforcement may be acceptable for closed beta only if explicitly recorded as a release risk | `OPEN-004`; product owner decision before release claim |
| `ASSUMP-005` | Restore Undo remains provider-unproven until D1 restore proof lands | `OPEN-003`; D1 proof or release gate |

| Decision | Statement | Source |
| --- | --- | --- |
| `DEC-001` | Ship workspace-resolution hotfix before UX/refactor work | `SRC-023` D0 |
| `DEC-002` | Keep the in-repo shared `Tree` primitive | `SRC-023` D1 |
| `DEC-003` | Add tests before refactoring `EstimateSheetTree.tsx` | `SRC-023` D2 |
| `DEC-004` | Preserve stored sibling order; do not reintroduce kind sorting | `SRC-023` D3 |
| `DEC-005` | Make Move dialog a placement dialog | `SRC-023` D4 |
| `DEC-006` | Use handle-only drag activation only as EstimateSheetTree opt-in | `SRC-023` D5 |
| `DEC-007` | Split mocked action-wrapper proof from D1 provider/local-provider proof | `SRC-023` D11 |

## 7. Scope

**In scope:**

- `src/lib/estimates/actions.ts` reorder payload.
- `tests/vitest/estimate-node-reorder-action.test.ts` reorder expectations.
- D1 adapter/local-provider reorder history proof.
- Branch reorder planner, merge, DOM, optimistic, Move dialog, shared Tree, disabled reason, search/optimistic gate, permission, external-drop preservation, performance tests.
- Later extraction of focused hooks/components after tests are green.

**Out of scope:**

- Paid Cloudflare upgrades.
- Production deployment.
- New drag/drop dependencies.
- Broad UI redesign.
- Reorder undo.
- Legacy Supabase runtime mutation.

**Assumptions adopted for implementation:**

- `project.id` from `getCurrentWorkspaceProject(projectId)` is the correct `target_project_id`.
- D1 restore Undo can be release-gated if not fixed in this plan, but UI/action tests must not be presented as D1 provider proof.
- Server-only enforcement may be acceptable for first users only if explicitly recorded as a release risk; otherwise add `canEditEstimate` UI gating.

**Open decisions:**

- `OPEN-001`: Should root-top placement be visible in the pointer tree or only in Move dialog? Default: Move dialog required; pointer root-top optional unless UX owner requests it.
- `OPEN-002`: Should projected-tree validation live in `actions.ts` or `d1-action-client.ts`? Recommendation: validate in the server action before adapter call, then add adapter-level defensive tests for missing/invalid project id.
- `OPEN-003`: Should D1 restore support be implemented now or Undo constrained/release-gated? Recommendation: if Delete Undo remains visible, add D1 restore proof or record it as release-blocking.
- `OPEN-004`: Should EstimateSheetTree receive `canEditEstimate` before first users? Recommendation: add permission prop and UI tests unless owner accepts server-only gating for closed beta.

## 8. Current-State Analysis

**Current behavior:**

- `src/lib/estimates/actions.ts` validates auth, estimate ownership, edit permission, optimistic ids, non-negative sort order, same-estimate parent ownership, and tab isolation.
- The reorder RPC payload currently includes `target_estimate_id`, `move_updates`, `acting_user_id`, and `correlation_id`, but omits `target_project_id`.
- `src/lib/estimates/d1-action-client.ts` reads `args.target_project_id ?? ""` and passes that into `insertHistoryEvent`.
- `insertHistoryEvent` resolves `workspace_id` from `readProjectContext(database, projectId)` and throws when no workspace resolves.
- `estimate_sheet_events.workspace_id` and `project_id` are NOT NULL, with a composite project/workspace FK.
- `src/lib/estimates/estimate-tree-reorder.ts` removes/reinserts subtrees, uses sparse `sortOrder`, and merges confirmed trees without adopting confirmed `sortOrder`.
- `src/components/workshop/EstimateSheetTree.tsx` is a large Client Component and owns reorder, create, rename, delete, bulk, search, lazy-load, context menu, external drop, status, and optimistic state.
- `src/components/ui/tree.tsx` maps row bands to before/inside/after but attaches drag behavior to the whole row.
- The Move dialog is containment-only and calls `handleTreeDrop(..., "inside")`.

**Existing tests to preserve:**

- `tests/vitest/estimate-tree-reorder.test.ts`
- `tests/vitest/estimate-sheet-tree-dnd.test.tsx`
- `tests/vitest/estimate-sheet-tree-dom.test.tsx`
- `tests/vitest/estimate-tree-context-menu.test.tsx`
- `tests/vitest/estimate-tree-bulk-selection.test.tsx`
- `tests/vitest/estimate-tree-filter.test.tsx`
- `tests/vitest/estimate-tree-lazy-hydration-ui.test.tsx`
- `tests/vitest/ui-tree.test.tsx`
- `tests/vitest/estimate-tree-drag-over-perf.test.ts`
- `tests/vitest/workspace-repository-estimate-tree.test.ts`

**Dirty worktree risk:** current `git status --short` shows modified source/test files outside this plan's write scope, including `src/components/workshop/EstimateSheetTree.tsx`, `src/components/ui/selection-checkbox.tsx`, `src/components/workshop/ProjectEstimatesTable.tsx`, `src/components/workshop/component-library-manager/AddComponentModal.tsx`, and three Vitest files. Implementation agents must re-read those files immediately before editing and preserve unfamiliar changes.

## 9. Target-State Design

**User flow:**

- Pointer user drags from the handle and sees unambiguous before/inside/after/invalid feedback.
- Keyboard user opens "Move..." and can choose before, inside, after, root top, or root bottom.
- Search, rename, saving, optimistic-create, invalid target, permission, and provider-unproven states communicate what action is blocked and why.
- Focus returns to the moved row after success or to the original row after rollback/failure.

**System flow:**

1. Client validates cheap hover/drop target.
2. Drop or Move dialog resolves to `{ sourceNodeId, targetNodeId, position }`.
3. Pure planner produces `nextNodes` and sparse updates.
4. Client optimistically updates cache.
5. Server action validates auth/authz/input/project/estimate/tab/cycle.
6. D1 adapter updates nodes with bound statements and inserts history using `target_project_id`.
7. Action refreshes tree and merge adopts confirmed structural fields while preserving cached row content.

**Failure/degraded behavior:**

- RPC/project/workspace failure rolls back optimistic state and reports error.
- Search/rename/saving/optimistic-create states prevent reorder with visible or focusable reason.
- D1 restore provider gap is release-gated until proven or constrained.

## 10. React And Next.js Implementation Plan

**Framework gates:**

- `FRAMEWORK-VERSION-GATE`: package metadata currently reports `next@16.2.6`, `react@19.2.6`, `react-dom@19.2.6`; re-check `package.json` and lockfile before implementation closeout.
- `NODE-RUNTIME-GATE`: keep Next.js 16 Node 20.9+ requirement in mind for local/build proof; this plan does not change runtime config.
- `RSC-CLIENT-BOUNDARY-GATE`: `EstimateSheetTree.tsx` is already a Client Component because it uses state, events, refs, drag/drop, and browser APIs. Keep new pure helpers outside the client module graph where practical.
- `CLIENT-BUNDLE-GATE`: extracted dialog/pure option builder should avoid importing server-only or heavy modules into the Client Component graph.
- `SERVER-FUNCTION-AUTHZ-GATE`: `reorderEstimateTreeNodes` is a direct POST-reachable Server Function; keep `requireAuth`, project lookup, estimate ownership, edit permission, input validation, and projected-tree validation inside the action.
- `CACHE-COMPONENTS-GATE`: no Cache Components or `use cache` additions are planned. Reorder state remains TanStack Query/local optimistic state; do not add `revalidatePath`, `refresh()`, or route refresh unless a concrete stale RSC/cache defect is proven.
- `HYDRATION-MISMATCH-GATE`: do not introduce render-time `Date.now()`, random IDs, or browser-only branches in server-rendered parents; local Client Component status can use client state.

**React state and effects:**

- Keep `useEffectEvent` local to effect logic; do not pass it into extracted hooks/components as a general event handler.
- Prefer pure helpers for destination option generation and reorder target resolution.
- Use memoization only where existing memoized child props, perf tests, or expensive tree option generation justify it.

## 11. UX, UI, And Accessibility Plan

**Required interaction states:**

- Idle, dragging source, valid before, valid inside, valid after, invalid, saving, saved, error, search active, rename active, optimistic create, lazy loading, context menu open, delete pending, bulk selection, restore pending/failure, read-only.

**Move dialog accessibility:**

- Replace native disabled radios for invalid destinations with focusable option rows using `role="radio"`, `aria-checked`, `aria-disabled`, and visible/described reason text.
- Model selected target as:

```ts
type EstimateTreeMoveSelection =
  | { kind: "node"; targetNodeId: string; position: "before" | "inside" | "after" }
  | { kind: "root"; edge: "top" | "bottom" };
```

**Focus and status:**

- Return focus to the moved/source row after success, cancel, or rollback.
- Keep existing `aria-live` saving/saved status and add tests for status text. Do not claim all errors are announced by that live region unless implementation adds an alert/live path for them.
- Active route and keyboard focus must use distinct cues.

## 12. Backend, API, And Integration Plan

**Server action contract for reorder:**

- Reject empty updates.
- Reject duplicate update ids.
- Reject optimistic ids in `id` and `parentId`.
- Reject non-finite or negative sort orders.
- Resolve current workspace project and estimate ownership.
- Verify edit permission with `assertCanEditEstimate`.
- Validate every updated node and parent belongs to the same estimate.
- Reject cross-tab moves when both tab ids are known.
- Add `target_project_id: project.id` to the D1/RPC payload.
- Add projected-tree validation before write in Phase 3.
- Return refreshed tree for the active tab.

**Request/response contract:**

```ts
type ReorderEstimateTreeNodesInput = {
  updates: Array<{ id: string; parentId: string | null; sortOrder: number }>;
  targetTabId?: string | null;
};

type ReorderEstimateTreeNodesResult = {
  tree: EstimateTreeNode[];
};
```

**Error semantics:**

- Preserve user-actionable errors for validation and authz.
- Do not expose internal provider jargon beyond current wrapped RPC messages unless tests prove existing UI relies on the exact text.

## 13. Data And Database Plan

**Schema changes:** none planned for `PH-0` through `PH-2`. `PH-3` may add a migration only if projected-tree validation cannot be implemented safely in action/client code.

**History invariant:**

- `estimate_sheet_events.workspace_id` is NOT NULL.
- `estimate_sheet_events.project_id` is NOT NULL.
- Composite FK requires `(project_id, workspace_id)` to match `projects`.

**D1 proof split:**

- Mocked action-wrapper tests prove the server action sends the correct payload.
- D1 adapter/local-provider tests prove `EstimateActionsD1Client.call("reorder_estimate_nodes_with_history", ...)` writes scoped history and fails cleanly for missing/empty/unknown project id.
- Remote/hosted D1 proof is separate and must use `ARCH_DB` from `wrangler.jsonc`; local proof cannot be described as hosted proof.

**Recommended D1 test file:** create `tests/vitest/estimate-actions-d1-reorder-history.test.ts`. Use the `EstimateActionsD1Client` fixture pattern from `tests/vitest/d1-access-created-by.test.ts` and the fake D1 statement/batch style from `tests/vitest/project-bulk-delete-d1-actions.test.ts`.

## 14. Security And Privacy Plan

**Threat model:**

- Actors: authenticated project editor, viewer/read-only user, unauthorized tenant user, malicious direct POST client.
- Assets: estimate tree structure, row context, project/workspace IDs, history/audit rows.
- Entry points: `reorderEstimateTreeNodes`, D1 adapter call, pointer DnD, Move dialog, external drop events.

**Required security gates:**

- `AUTHZ-GATE`: all mutations verify auth, project, estimate, edit permission, and node ownership server-side.
- `IDOR-GATE`: guessed node IDs from other estimates or tabs are rejected before D1 write.
- `CYCLE-GATE`: projected tree cycle/self-parent writes are rejected in the active D1 path by Phase 3.
- `CLIENT-DATA-GATE`: Client Component receives only tree DTO fields needed for UI.
- `LOG-REDACTION-GATE`: no new logs should include raw cookies, auth headers, or secret values.
- `PERMISSION-UI-GATE`: implement UI gating or record server-only enforcement as release risk.

## 15. Performance, Scalability, And Reliability Plan

**Budgets and constraints:**

- Hover must keep using cheap validation; no full clone-and-plan on every dragover.
- Move dialog option expansion can traverse the local tree because it happens on dialog open, not per hover event.
- Preserve virtualization behavior.
- Avoid persistent layout shifts from status/help rails.
- Watch D1 query and batch statement counts for large branch moves.

**Verification:**

```bash
bunx vitest run tests/vitest/estimate-tree-drag-over-perf.test.ts tests/vitest/ui-tree.test.tsx --maxWorkers=1
```

If traversal/indexing changes, add a nested 5k-node sample in `tests/vitest/estimate-tree-drag-over-perf.test.ts`.

## 16. Observability And Operations Plan

**No new telemetry dependency is required.**

Use existing signals:

- Toast on reorder error.
- `aria-live` reorder status.
- `estimate_sheet_events` row for successful reorder history.

Recommended local counters/log classification if observability is touched:

- `workspace_resolution_failure`: wrapped message includes `Estimate history event workspace could not be resolved.`
- `cross_tab_rejection`: server action rejects tab isolation.
- `invalid_sort_order`: server action rejects sort order.
- `cycle_rejection`: Phase 3 projected-tree validation rejects.

If an implementation adds logging, the plan requires a redaction rule and test or source review proving no secrets or private row payloads are logged.

## 17. Deployment, Rollout, And Rollback Plan

**Rollout order:**

1. Ship `PH-0` alone after focused tests and D1 local proof.
2. Add characterization and RED tests.
3. Fix merge correctness.
4. Add projected-tree D1 validation.
5. Add Move dialog parity.
6. Add handle-only drag and visual/status improvements.
7. Refactor after behavior is locked.
8. Run final focused suite and typecheck.

**Rollback:**

- `PH-0`: revert the one-line payload addition and test expectation changes. This reintroduces the user-visible bug, so use only if the fix causes an unexpected blocker.
- UI phases: revert Move dialog or shared Tree changes independently if tests isolate a regression.
- D1 validation: revert only with tests proving the old behavior is intentional.

**Manual smoke after Phase 0:**

1. Drag a root node before/after another root node.
2. Drag a node inside another branch.
3. Confirm no workspace-resolution error.
4. Confirm the history event proof shows matching project/workspace.

## 18. Blast Radius And Backward Compatibility

| Surface | Risk | Mitigation |
| --- | --- | --- |
| `actions.ts` reorder payload | Narrow payload shape change | Existing action-wrapper tests updated; no schema or client contract change |
| D1 adapter reorder | History and projected-tree validation | D1 adapter/local-provider tests before release claim |
| Shared `Tree` | Other consumers may rely on row-drag | `dragActivation` defaults to `"row"` and EstimateSheetTree opts into `"handle"` |
| `EstimateSheetTree.tsx` | Large coupled Client Component | Test first, refactor later |
| Move dialog | Keyboard workflow changes | Keep context-menu entry and focus return; add DOM tests |
| Delete/bulk restore | Provider-unproven Undo | D1 proof or explicit release gate |
| Current dirty worktree | Concurrent user/agent edits | Re-read affected files before every edit; never revert unfamiliar changes |

## 19. Phased Implementation Plan

### `PH-0`: Workspace Resolution Hotfix

**Status:** `IMPLEMENTATION-READY`.

**Requirements:** `REQ-001`, `REQ-012`.

**Files:**

- Modify: `src/lib/estimates/actions.ts`
- Modify: `tests/vitest/estimate-node-reorder-action.test.ts`
- Create: `tests/vitest/estimate-actions-d1-reorder-history.test.ts`

- [ ] **Step 1: Write failing action-wrapper payload expectations**

Update every `reorder_estimate_nodes_with_history` expectation in `tests/vitest/estimate-node-reorder-action.test.ts` to include `target_project_id`.

```ts
expect(supabase.rpc).toHaveBeenCalledWith("reorder_estimate_nodes_with_history", {
  target_project_id: "project-1",
  target_estimate_id: "estimate-1",
  move_updates: [
    { id: "living", parent_id: "ground-floor", sort_order: 10 },
  ],
  acting_user_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  correlation_id: expect.any(String),
});
```

- [ ] **Step 2: Run action test to verify it fails for the expected reason**

Run:

```bash
bunx vitest run tests/vitest/estimate-node-reorder-action.test.ts --maxWorkers=1
```

Expected before implementation: at least one reorder payload expectation fails because `target_project_id` is absent.

- [ ] **Step 3: Implement the one-line payload fix**

Change `src/lib/estimates/actions.ts` inside `reorderEstimateTreeNodes`:

```ts
const rpcPayload = {
  target_project_id: project.id,
  target_estimate_id: estimate.id,
  move_updates: moveUpdates,
  acting_user_id: currentUser.userId,
  correlation_id: randomUUID(),
};
```

- [ ] **Step 4: Add D1 adapter/local-provider proof**

Create `tests/vitest/estimate-actions-d1-reorder-history.test.ts` with a fake D1 database that supports `prepare().bind().first/all/run()` and `batch()`. The test must instantiate `new EstimateActionsD1Client(fakeDb, currentUser)` and call:

```ts
await client.call("reorder_estimate_nodes_with_history", {
  target_project_id: PROJECT_ID,
  target_estimate_id: ESTIMATE_ID,
  move_updates: [{ id: NODE_ID, parent_id: null, sort_order: 20 }],
  acting_user_id: USER_ID,
  correlation_id: "reorder-proof-1",
});
```

Assertions:

```ts
expect(fakeDb.historyEvents).toEqual([
  expect.objectContaining({
    estimate_id: ESTIMATE_ID,
    workspace_id: WORKSPACE_ID,
    project_id: PROJECT_ID,
    event_type: "estimate_nodes_reordered",
    correlation_id: "reorder-proof-1",
  }),
]);
```

Also assert missing, empty, and unknown `target_project_id` reject before appending a history event.

- [ ] **Step 5: Run Phase 0 verification**

Run:

```bash
bunx vitest run tests/vitest/estimate-node-reorder-action.test.ts tests/vitest/estimate-actions-d1-reorder-history.test.ts --maxWorkers=1
bun run type-check
```

Expected: both commands exit 0. If default-heap typecheck aborts from Node heap exhaustion, rerun:

```bash
NODE_OPTIONS=--max-old-space-size=8192 bun run type-check
```

- [ ] **Step 6: Commit Phase 0 alone**

Use Lore commit protocol:

```bash
git add src/lib/estimates/actions.ts tests/vitest/estimate-node-reorder-action.test.ts tests/vitest/estimate-actions-d1-reorder-history.test.ts
git commit -m "Fix reorder history workspace scoping

Constraint: Estimate reorder must write D1 history rows with workspace/project scope.
Rejected: Refactor EstimateSheetTree during the hotfix | The live blocker is a one-line server payload gap.
Confidence: high
Scope-risk: narrow
Directive: Keep Phase 0 isolated from UX/refactor work.
Tested: bunx vitest run tests/vitest/estimate-node-reorder-action.test.ts tests/vitest/estimate-actions-d1-reorder-history.test.ts --maxWorkers=1; bun run type-check
Not-tested: Hosted Cloudflare D1 proof and browser/manual smoke."
```

### `PH-1`: Characterization And RED Tests

**Status:** `CONDITIONALLY READY`.

**Files:**

- Modify: `tests/vitest/estimate-tree-reorder.test.ts`
- Modify: `tests/vitest/estimate-sheet-tree-dnd.test.tsx`
- Modify: `tests/vitest/estimate-sheet-tree-dom.test.tsx`
- Modify: `tests/vitest/estimate-tree-context-menu.test.tsx`
- Modify: `tests/vitest/estimate-node-reorder-action.test.ts`
- Modify/Create: D1 adapter/local-provider test from `PH-0`
- Modify: `tests/vitest/ui-tree.test.tsx`
- Modify: `tests/vitest/estimate-tree-drag-over-perf.test.ts` only if traversal changes

- [ ] Add branch-with-descendants pure planner tests for before, after, inside, root top, and root bottom.
- [ ] Add RED merge test proving confirmed `sortOrder` is not adopted today.
- [ ] Add DOM DnD branch tests with explicit row rects.
- [ ] Add optimistic success/rollback branch tests.
- [ ] Add RED Move dialog tests for before/after/root.
- [ ] Add RED projected-cycle rejection tests for the active D1 path.
- [ ] Add disabled reason, search/optimistic gate, permission, restore failure, empty search copy, and external-drop preservation tests.

Exit criterion: characterization tests either pass and are kept as guardrails, or fail for a documented reason that becomes implementation work. RED tests fail for the expected missing behavior.

### `PH-2`: Correctness Fix

**Files:**

- Modify: `src/lib/estimates/estimate-tree-reorder.ts`
- Modify: `tests/vitest/estimate-tree-reorder.test.ts`
- Modify: `tests/vitest/estimate-sheet-tree-dnd.test.tsx`

- [ ] Update `mergeEstimateTreeStructureWithCachedNodes` to copy structural fields from confirmed nodes.

Expected merge shape:

```ts
return {
  ...mergedNode,
  id: structureNode.id,
  kind: structureNode.kind,
  sortOrder: structureNode.sortOrder,
  parentId: structureNode.parentId,
  children: structureNode.children?.map(mergeNode) ?? structureNode.children,
};
```

Implementation must preserve cached row item content, draft/local row edits, and labels that are not structural.

- [ ] Run pure planner and DnD optimistic tests.

### `PH-3`: Persistence Boundary And Projected-Tree Validation

**Files:**

- Modify: `src/lib/estimates/actions.ts` or `src/lib/estimates/d1-action-client.ts`
- Modify: `tests/vitest/estimate-node-reorder-action.test.ts`
- Modify: `tests/vitest/estimate-actions-d1-reorder-history.test.ts`
- Modify: repository/readback test if needed

- [ ] Choose validation owner using `OPEN-002`. Default recommendation: validate in `reorderEstimateTreeNodes` before the adapter call.
- [ ] Build a projected tree from current node rows plus proposed updates.
- [ ] Reject self/cycle, missing same-estimate node/parent, cross-tab parent, and impossible sibling state before write.
- [ ] Prove history row project/workspace scoping still passes.
- [ ] Prove readback order uses `sort_order ASC, id ASC`.

### `PH-4`: Move Dialog Parity

**Files:**

- Modify: `src/components/workshop/EstimateSheetTree.tsx`
- Create later if refactor approved: `src/components/workshop/estimate-tree/EstimateTreeMoveDialog.tsx`
- Modify: `tests/vitest/estimate-tree-context-menu.test.tsx`

- [ ] Replace `moveDestinationNodeId: string` state with `EstimateTreeMoveSelection`.
- [ ] Generate node options for before/inside/after and root top/bottom sentinels.
- [ ] Render focusable radio-like rows with visible reasons.
- [ ] Resolve root sentinels to concrete before/after drop targets.
- [ ] Preserve focus return after success/cancel/failure.

### `PH-5`: Pointer UX And Shared Tree Drag Activation

**Files:**

- Modify: `src/components/ui/tree.tsx`
- Modify: `src/components/workshop/EstimateSheetTree.tsx`
- Modify: `tests/vitest/ui-tree.test.tsx`
- Modify: `tests/vitest/estimate-sheet-tree-dom.test.tsx`
- Modify: `tests/vitest/estimate-tree-drag-over-perf.test.ts` if traversal/rendering changes

- [ ] Add `dragActivation?: "row" | "handle"` to shared Tree props, default `"row"`.
- [ ] Keep row-drag compatibility when prop is omitted.
- [ ] Pass `dragActivation="handle"` from EstimateSheetTree.
- [ ] Make before/inside/after/invalid states structurally distinct in DOM/classes.
- [ ] Add visible compact status and reachable disabled reasons.
- [ ] Run shared Tree compatibility and EstimateSheetTree handle tests.

### `PH-6`: Behavior-Preserving Refactor

**Files to create only after tests are green:**

- `src/components/workshop/estimate-tree/use-estimate-tree-reorder.ts`
- `src/components/workshop/estimate-tree/use-estimate-tree-crud.ts`
- `src/components/workshop/estimate-tree/use-estimate-tree-subtree-hydration.ts`
- `src/components/workshop/estimate-tree/use-estimate-tree-rename-editor.ts`
- `src/components/workshop/estimate-tree/EstimateTreeMoveDialog.tsx`
- `src/components/workshop/estimate-tree/estimate-tree-node-options.ts`
- `src/components/workshop/estimate-tree/EstimateTreePanel.tsx`
- `src/components/workshop/estimate-tree/use-estimate-tree-external-drops.ts` only if external-drop handling becomes noisy

- [ ] Extract one unit at a time.
- [ ] Re-run focused tests after each extraction group.
- [ ] Keep optimistic-id resolution refs close to action handlers unless tests prove extraction safe.
- [ ] Do not move server-only or non-interactive helpers into the client module graph.

### `PH-7`: Final Verification

Run:

```bash
bunx vitest run tests/vitest/estimate-tree-reorder.test.ts tests/vitest/estimate-sheet-tree-dnd.test.tsx tests/vitest/estimate-sheet-tree-dom.test.tsx tests/vitest/estimate-tree-context-menu.test.tsx tests/vitest/estimate-tree-bulk-selection.test.tsx tests/vitest/estimate-tree-filter.test.tsx tests/vitest/estimate-tree-lazy-hydration-ui.test.tsx tests/vitest/estimate-node-reorder-action.test.ts tests/vitest/estimate-actions-d1-reorder-history.test.ts tests/vitest/ui-tree.test.tsx tests/vitest/estimate-tree-drag-over-perf.test.ts --maxWorkers=1
bun run type-check
git diff --check
```

Run Playwright/browser proof only if final implementation changes virtualized geometry or real scrolling in ways DOM tests cannot prove.

## 20. File-Level Change Map

| Path | Expected change | Symbols/surfaces | Confidence | Notes |
| --- | --- | --- | --- | --- |
| `src/lib/estimates/actions.ts` | Modify | `reorderEstimateTreeNodes`, RPC payload, projected-tree validation | High | Phase 0 one-line payload first |
| `tests/vitest/estimate-node-reorder-action.test.ts` | Modify | payload expectations, nesting success, cycle denial | High | Existing reorder expectations currently omit `target_project_id` |
| `tests/vitest/estimate-actions-d1-reorder-history.test.ts` | Create | D1 adapter/local-provider proof | Medium-high | Use fake D1 patterns from existing tests |
| `src/lib/estimates/estimate-tree-reorder.ts` | Modify | `mergeEstimateTreeStructureWithCachedNodes`, planner tests | High | Adopt structural fields from confirmed server tree |
| `tests/vitest/estimate-tree-reorder.test.ts` | Modify | branch characterization, merge RED/GREEN | High | Pure utility tests |
| `src/lib/estimates/d1-action-client.ts` | Modify or read-only | `reorderEstimateNodes`, possible validation; restore remains gated | Medium | Phase 3 owner depends on `OPEN-002` |
| `src/components/workshop/EstimateSheetTree.tsx` | Modify | Move dialog state, handle drag opt-in, disabled reasons, status | High | Re-read dirty worktree before editing |
| `src/components/ui/tree.tsx` | Modify | `dragActivation`, drop state visuals/classes | Medium-high | Preserve default row drag |
| `tests/vitest/ui-tree.test.tsx` | Modify | shared Tree default and handle activation | High | Required for shared component changes |
| `tests/vitest/estimate-sheet-tree-dnd.test.tsx` | Modify | optimistic branch success/rollback | High | Preserve no route refresh |
| `tests/vitest/estimate-sheet-tree-dom.test.tsx` | Modify | DnD DOM, disabled reasons, search/optimistic gates | Medium-high | Use explicit row rects |
| `tests/vitest/estimate-tree-context-menu.test.tsx` | Modify | Move dialog parity, disabled reasons, focus return | High | File already modified in dirty worktree; preserve user edits |
| `tests/vitest/estimate-tree-filter.test.tsx` | Modify | no-match vs true-empty copy, search reorder gate | Medium | Only if implementation touches copy/state |
| `tests/vitest/estimate-tree-bulk-selection.test.tsx` | Modify | restore failure/provider gate | Medium | Do not duplicate existing success coverage |
| `tests/vitest/estimate-tree-lazy-hydration-ui.test.tsx` | Modify | lazy-load/reorder non-regression | Medium | Only if changes affect lazy state |
| `tests/vitest/estimate-tree-drag-over-perf.test.ts` | Modify | nested 5k sample if traversal changes | Medium | Required if drop validation changes |
| `src/components/workshop/estimate-tree/*` | Create in Phase 6 | extracted hooks/components | Medium | Only after behavior tests pass |

## 21. Detailed Testing And Verification Strategy

**Focused Phase 0:**

```bash
bunx vitest run tests/vitest/estimate-node-reorder-action.test.ts tests/vitest/estimate-actions-d1-reorder-history.test.ts --maxWorkers=1
bun run type-check
```

**Full focused suite:**

```bash
bunx vitest run tests/vitest/estimate-tree-reorder.test.ts tests/vitest/estimate-sheet-tree-dnd.test.tsx tests/vitest/estimate-sheet-tree-dom.test.tsx tests/vitest/estimate-tree-context-menu.test.tsx tests/vitest/estimate-tree-bulk-selection.test.tsx tests/vitest/estimate-tree-filter.test.tsx tests/vitest/estimate-tree-lazy-hydration-ui.test.tsx tests/vitest/estimate-node-reorder-action.test.ts tests/vitest/estimate-actions-d1-reorder-history.test.ts tests/vitest/ui-tree.test.tsx tests/vitest/estimate-tree-drag-over-perf.test.ts --maxWorkers=1
```

**Static checks:**

```bash
bun run type-check
git diff --check
```

**Test scenario registry:**

| Test ID | Acceptance | Scenario | Primary file/command | Evidence class |
| --- | --- | --- | --- | --- |
| `TEST-001` | `AC-001` | Action wrapper sends `target_project_id: project.id` for flat reorder | `tests/vitest/estimate-node-reorder-action.test.ts` | Local automated |
| `TEST-002` | `AC-001`, `AC-013` | D1 adapter/local-provider reorder writes scoped history row and rejects missing project id | `tests/vitest/estimate-actions-d1-reorder-history.test.ts` | Local D1/provider-like automated |
| `TEST-003` | `AC-002` | Pure planner moves non-empty branches before, inside, after, and root without losing descendants | `tests/vitest/estimate-tree-reorder.test.ts` | Local automated |
| `TEST-004` | `AC-004` | Confirmed merge adopts server `sortOrder` while preserving cached row content | `tests/vitest/estimate-tree-reorder.test.ts` | Local automated |
| `TEST-005` | `AC-003` | DOM drag/drop branch move succeeds and keeps descendants visible without route refresh | `tests/vitest/estimate-sheet-tree-dnd.test.tsx` | Local automated |
| `TEST-006` | `AC-003` | Optimistic reorder rolls back on server failure without corrupting expanded/selected state | `tests/vitest/estimate-sheet-tree-dnd.test.tsx` | Local automated |
| `TEST-007` | `AC-007` | Direct POST rejects self, descendant-cycle, cross-estimate, and cross-tab projected moves before D1 persistence | `tests/vitest/estimate-actions-d1-reorder-history.test.ts`; action-wrapper denial test | Security/data automated |
| `TEST-008` | `AC-008` | Repository/action readback honors `sort_order ASC, id ASC` | D1 action-client/provider readback test | Local D1/provider-like automated |
| `TEST-009` | `AC-005` | Move dialog supports before/inside/after/root options and returns focus | `tests/vitest/estimate-tree-context-menu.test.tsx` | Accessibility/DOM automated |
| `TEST-010` | `AC-009` | Search, rename, saving, optimistic create, invalid move, and permission states expose reachable disabled reasons | `tests/vitest/estimate-tree-context-menu.test.tsx`; `tests/vitest/estimate-sheet-tree-dom.test.tsx` | Accessibility/DOM automated |
| `TEST-011` | `AC-006`, `AC-010` | Shared Tree keeps row-drag default and EstimateSheetTree uses handle-only drag activation | `tests/vitest/ui-tree.test.tsx`; EstimateSheetTree DOM test | Local automated |
| `TEST-012` | `AC-006` | Pointer drop positions communicate before, inside, after, and invalid state | `tests/vitest/ui-tree.test.tsx`; EstimateSheetTree DOM test | Local automated; browser only if DOM geometry is insufficient |
| `TEST-013` | `AC-011` | Dragover validation remains within budget for large flat and nested samples | `tests/vitest/estimate-tree-drag-over-perf.test.ts` | Performance automated |
| `TEST-014` | `AC-012` | Context menu, rename, create, delete, bulk delete, restore, search/filter, lazy load, active tab, external drops, permissions, and status stay preserved | Full focused suite listed above | Local automated |
| `TEST-015` | `AC-013` | Final report separates local, D1, browser, hosted, and production proof classes without overclaiming | implementation closeout review | Proof-honesty review |

**Adversarial QA matrix:**

| ID | User/attacker model | Scenario | Expected signal | Proof |
| --- | --- | --- | --- | --- |
| `ADV-001` | Authorized editor | Flat reorder | No workspace error, history scoped | Phase 0 tests |
| `ADV-002` | Authorized editor | Branch inside branch | Descendants preserved, no workspace error | DOM/D1 tests |
| `ADV-003` | Malicious direct POST | Parent is descendant | Rejected before D1 write | Phase 3 tests |
| `ADV-004` | Malicious direct POST | Cross-tab parent | Rejected | Action tests |
| `ADV-005` | Malicious direct POST | Optimistic id in payload | Rejected | Existing plus new tests |
| `ADV-006` | Keyboard user | Move before/after/root | Focusable options, correct reorder | Context-menu tests |
| `ADV-007` | Search active user | Attempts drag or Move | Blocked with reachable reason | DOM tests |
| `ADV-008` | Rename active user | Attempts move/delete | Blocked with reachable reason | Context-menu/DOM tests |
| `ADV-009` | Optimistic create pending | Attempts reorder touching optimistic id | No server call; reason shown | DnD tests |
| `ADV-010` | Provider failure | Restore Undo fails in D1 | Failure reported; no false provider-ready claim | D1/provider or explicit release gate |
| `ADV-011` | Dirty worktree | Implementation runs with existing edits | No unrelated changes overwritten | `git status`, focused diff review |
| `ADV-012` | Misleading success output | Command prints success but exits nonzero | Treated as failure | Read exit codes in final report |

## 22. Risk Register

| ID | Risk | Probability | Impact | Severity | Detection | Mitigation | Owner | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `RISK-001` | Reorder unusable until Phase 0 | High | High | Critical | User error and source call chain | Ship Phase 0 first | Lead implementer | Open |
| `RISK-002` | Shared Tree regression | Medium | High | High | `ui-tree.test.tsx` | Default `dragActivation="row"` | UI lane | Open |
| `RISK-003` | D1 projected-cycle write | Medium | High | High | D1/action tests | Phase 3 validation | Backend lane | Open |
| `RISK-004` | Restore Undo provider gap | High | Medium | High | D1 restore throws | D1 proof or release gate | Backend/product lane | Open |
| `RISK-005` | Dirty worktree overwritten | Medium | High | High | `git status`, diff review | Re-read before edit; narrow patches | All lanes | Open |
| `RISK-006` | Move dialog becomes too dense | Medium | Medium | Medium | DOM/a11y review | Compact grouped options, visible reasons | UX lane | Open |
| `RISK-007` | Hover performance regression | Low-medium | Medium | Medium | perf tests | Keep planning out of hover path | UI lane | Open |
| `RISK-008` | Refactor introduces stale closure | Medium | High | High | focused tests/typecheck | Refactor after tests only | Refactor lane | Open |
| `RISK-009` | Permission UI remains misleading | Medium | Medium | Medium | viewer tests/source review | Add prop or accept release risk | Product/backend lane | Open |

## 23. Alternatives, Tradeoffs, Pros/Cons

**Recommended approach:** small hotfix first, test-first phased repair, then optional refactor.

| Alternative | Pros | Cons | Decision |
| --- | --- | --- | --- |
| Replace `Tree` with another dependency | Could provide richer tree semantics | Wider blast radius, existing primitive is close, dependency risk | Rejected |
| Refactor `EstimateSheetTree` first | Cleaner implementation surface | High stale-state risk before tests | Rejected |
| Fix only `target_project_id` and stop | Fastest user unblock | Leaves branch correctness, D1 validation, Move parity, a11y gaps | Rejected as full-plan endpoint; accepted as Phase 0 |
| Add route refresh after reorder | Could mask stale cache | Existing tests assert no refresh; unnecessary for payload bug | Rejected |
| Provider remote proof in Phase 0 | Stronger proof | Slower and credential/provider-dependent; local D1 proof sufficient for code merge | Deferred to release gate |

## 24. SWOT Analysis

Not applicable as a standalone strategic section. The engineering strategy is already determined by the live P0 bug and the risk register; SWOT would not change sequencing, scope, rollout, or investment.

## 25. Definition Of Done

| Area | Done means | Evidence |
| --- | --- | --- |
| Functional | Flat and nested reorder succeed; descendants preserved | Focused Vitest and D1 proof |
| UX | Pointer and keyboard users can choose correct placement | DOM tests and manual smoke if needed |
| Accessibility | Reasons/focus/status are reachable and distinguishable | DOM/a11y assertions |
| Security | Direct POST validates auth/authz/input/projected tree | Action/D1 tests |
| Privacy | No new client/server logs expose secrets or excessive data | Source review/tests if logs added |
| Performance | Hover remains cheap; no extra route refresh | perf tests |
| Data/database | History row scoped to project/workspace; readback order correct | D1 adapter/local-provider proof |
| Testing | Focused suite and typecheck pass | command transcripts |
| Operations | Phase 0 isolated; rollback known; proof labels honest | final implementation report |
| Documentation | Plan and closeout identify proof classes and residual risks | this file plus final report |
| Rollout | Release blockers and owner decisions are separated from implementation blockers | readiness section |

## 26. Open Decisions

| ID | Decision | Why it matters | Recommendation | Classification | Can implementation start? |
| --- | --- | --- | --- | --- | --- |
| `OPEN-001` | Root-top pointer drop visibility | Affects pointer UX scope | Keep root top in Move dialog; add pointer root-top only if UX owner asks | Non-blocking with default | Yes |
| `OPEN-002` | Projected validation owner | Affects action/client structure | Validate in `actions.ts`, keep D1 adapter defensive | Non-blocking with default | Yes after PH-0 |
| `OPEN-003` | D1 restore support now or release gate | Undo provider claim depends on it | Prove D1 restore if Undo remains visible | Release-blocking if Undo is claimed provider-ready | Yes, but release claim is gated |
| `OPEN-004` | UI permission gate | Viewer UX and false affordance risk | Add `canEditEstimate` prop and tests unless owner accepts server-only enforcement | Release-blocking for read-only UX | Yes |
| `OPEN-005` | Browser proof for geometry | Determines verification cost | Use browser only if DOM cannot prove virtualized geometry | Non-blocking with default | Yes |

## 27. Implementation Readiness Gate

| Gate | Answer | Evidence |
| --- | --- | --- |
| All source documents mapped to `SRC-*` IDs | Yes | Section 4 |
| All implementation-affecting requirements traced | Yes | Section 5 |
| Assumptions labeled and assigned to proof/owner | Yes | Sections 7 and 26 |
| Open decisions classified | Yes | Section 26 |
| Every phase has work packages, files, tests, exit criteria | Yes | Sections 19-21 |
| React/Next boundaries explicit | Yes | Section 10 |
| Data/auth/privacy/performance/a11y/rollout tied to proof | Yes | Sections 11-17, 21 |
| Evidence classes separated | Yes | Sections 13, 21, 28 |
| Implementation blockers separated from release blockers | Yes | Sections 1, 26, 28 |
| Codebase AI can execute Phase 0 without rereading all source docs | Yes | `PH-0` steps include exact files, snippet, tests |

## 28. Readiness Score And Final Verification

**Executable posture:** `CONDITIONALLY READY`.

**Named ready subset:** `PH-0` is `IMPLEMENTATION-READY`.

| Category | Score | Deduction reason |
| --- | --- | --- |
| Requirements coverage | 98 | Restore/permission decisions remain release-gated |
| Source traceability | 99 | All package docs mapped; line numbers may drift |
| Codebase grounding | 96 | D1 proof harness file is planned but not yet created |
| React/Next correctness | 96 | Local docs checked; implementation must re-check if route/cache shape changes |
| UX/accessibility completeness | 93 | Move dialog and disabled reasons are planned, not implemented |
| Technical architecture specificity | 96 | Validation owner has default but remains open |
| Data/database integrity | 92 | D1 proof and projected validation still pending |
| Security/privacy readiness | 92 | Cycle validation and permission UI remain open |
| Performance/reliability readiness | 95 | Nested perf sample conditional on traversal changes |
| Testing depth | 94 | Tests are concrete but several are future RED tests |
| Rollout/operations readiness | 96 | Remote/provider proof is release-gated, not included in Phase 0 |
| Sequencing/parallelization quality | 98 | Phase 0 isolated; later lanes disjoint enough |
| Risk ownership | 96 | All critical risks owned; product decisions remain open |

**Overall readiness score:** 95.

**Verifier verdict:** pending independent rerun after stable-ID fixes.

**Readiness cap applied:** because final implementation-plan verification is not yet an independent completed review inside this file at draft creation time, package status remains `CONDITIONALLY READY` even though `PH-0` is implementation-ready.

**Conditions required for 100:**

- Native final verifier approves this file with no P0/P1 planning gaps.
- `PH-0` tests and D1 local proof are implemented and green.
- Open release decisions for D1 restore and UI permission gating are closed or explicitly deferred by owner.
- No browser/provider/hosted proof is overstated in implementation closeout.

## 29. Final Quality Review

| Review pass | Result | Notes |
| --- | --- | --- |
| Completeness and traceability | Passed | All source docs mapped; R0-R11 converted to `REQ-*` |
| Codebase grounding | Passed with caveat | Current source inspected; implementation must re-read dirty files before edits |
| React/Next correctness | Passed | Local Next docs checked for Client Components, Server Functions, caching |
| UX/accessibility | Passed with caveat | Planned gaps are explicit and test-backed |
| Security/privacy | Passed with caveat | Projected-cycle validation and permission UI remain open |
| Performance/reliability | Passed | Phase 0 neutral; perf tests named |
| Testing/QA | Passed with caveat | D1 local proof harness is specified but not yet written |
| Rollout/operations | Passed | Phase 0 ships alone; rollback and manual smoke named |
| Coherence | Passed | Readiness labels and proof classes are consistent |
| Final implementation-readiness | Approved with caveats | Overall package conditional; Phase 0 ready |

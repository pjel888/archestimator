---
title: Estimate Sheet Orchestration Agent Coordination
type: docs
date: 2026-06-25
---

# Estimate Sheet Orchestration Agent Coordination

## Master /goal

Create a master orchestration implementation planning package for fully implementing, in a coordinated future execution pass, the three existing estimate-sheet plans:

- `.ai/03_plans/2026-06-24-Estimate-Sheet-Center-Content-Analysis`
- `.ai/03_plans/2026-06-24-Estimate-Sheet-Right-Sidebar-Analysis`
- `.ai/03_plans/2026-06-24-Estimate-Sheet-Tree-Sidebar-Analysis`

The business outcome is a coherent, implementation-ready estimate sheet improvement program that prevents isolated agents from applying the three plans blindly against the same feature surface. The plan must expose the combined target behavior, current codebase reality, conflicts, sequencing, ownership boundaries, validation gates, rollback posture, and before/after reporting structure needed for later multi-agent implementation.

The problem being solved is coordination risk: all three source plans affect the estimate sheet route, shared estimate state, persistence, sidebar shells, row interactions, and validation surfaces. Implementing them independently could duplicate edits, overwrite assumptions, regress shipped estimate-tab/library behavior, or create inconsistent UX and data contracts.

The intended future feature behavior is an estimate workspace where the left project tree, center estimate grid, and right reusable-content/sidebar system operate as one coordinated composition: navigation and hierarchy remain stable, row editing and totals remain the primary center workflow, reusable library/template/project-source insertions flow into the same estimate mutation and history contracts, and validation covers shared state, permissions, performance, accessibility, and rollback.

Planning scope:

- Analyze every file in the three source plan folders.
- Inspect the current codebase areas and source-of-truth documents that those plans cite or affect.
- Identify inconsistencies, duplicate work, missing dependencies, conflicts, and shared-file contention.
- Resolve conflicts in a master orchestration plan with selected decisions and rejected alternatives.
- Define future subagent/thread workstreams, file ownership, sequencing, acceptance criteria, and verification gates.
- Create orchestration artifacts only inside `.ai/03_plans/2026-06-25-Estimate-Sheet-Orchestration`.

Non-goals:

- Do not implement application, test, schema, migration, provider, or configuration changes.
- Do not modify the three source plan folders.
- Do not stage, commit, push, deploy, or alter Git history.
- Do not run browser automation or visual QA unless a later implementation task needs runtime proof.
- Do not claim the estimate-sheet feature work is implemented.

Required codebase analysis:

- Estimate route and workspace composition.
- Left project/tree sidebar components, project navigation, node selection, and hierarchy contracts.
- Center estimate grid, row domain, row CRUD, editing, drag/drop/insertions, totals, optimistic state, rollback, tabs, activity, collaboration, export, and display states.
- Right sidebar/library/templates/project-source panels, insertion contracts, search/filter/preferences, shell lifecycle, and cache behavior.
- Server actions, repositories, RPCs, Supabase schema/migrations, RLS/authz, TanStack Query keys, Zustand/UI state, tests, design guidance, roadmap/spec docs, and prior decisions that constrain the estimate sheet.

Required specialist workstreams:

1. Source plan audit: center content.
2. Source plan audit: right sidebar.
3. Source plan audit: tree sidebar.
4. Current codebase architecture and affected file map.
5. Product, scope, requirements, and user journey synthesis.
6. UX, UI, accessibility, and responsive behavior.
7. Frontend state, interaction, concurrency, and integration seams.
8. Backend/data/API/network and database integrity.
9. Security, privacy, auth, and authorization.
10. Performance, scalability, reliability, observability, rollout, and rollback.
11. Testing, validation, regression, and QA strategy.
12. Blast radius, dependency, documentation, and active-worktree compatibility.
13. Adversarial gap analysis.
14. Independent final verification.

Implementation-readiness criteria:

- Every source-plan requirement is either incorporated, superseded with rationale, deferred with owner and trigger, or rejected with evidence.
- Every future implementation task maps to stable requirement IDs, affected paths, likely symbols, dependencies, validation methods, and ownership lanes.
- Shared-file and shared-contract conflicts have a single selected resolution.
- Phase order separates prerequisites, independent parallel work, integration barriers, verification, and rollback.
- The package includes a concrete orchestration todo list and a master before/after report template that can be completed during implementation.

Validation criteria for this planning task:

- Planning artifacts exist in the requested target folder.
- Source plan files were inventoried and analyzed.
- Native subagents or clearly labeled simulated lanes were used for independent workstreams.
- At least two critique/revision cycles occur after the initial synthesis.
- An adversarial reviewer and independent final verifier review the planning package.
- No files outside the target orchestration folder are intentionally modified.

Final deliverables:

- `README.md`
- `00_AGENT_COORDINATION.md`
- `01_SOURCE_PLAN_INVENTORY.md`
- `02_CONSOLIDATED_REQUIREMENTS.md`
- `03_CONFLICTS_AND_RESOLUTIONS.md`
- `04_CODEBASE_AND_DOCUMENTATION_AUDIT.md`
- `05_MASTER_ORCHESTRATION_IMPLEMENTATION_PLAN.md`
- `06_AGENT_WORKSTREAMS_AND_PROMPTS.md`
- `07_ORCHESTRATION_TODO.md`
- `08_MASTER_BEFORE_AFTER_REPORT.md`
- `09_TRACEABILITY_MATRIX.md`
- `10_RISK_DECISION_AND_ROLLBACK_REGISTER.md`
- `11_TEST_VALIDATION_AND_QA_STRATEGY.md`
- `12_ADVERSARIAL_REVIEW.md`
- `13_FINAL_READINESS_REVIEW.md`
- `14_SOURCE_ID_COVERAGE_APPENDIX.md`
- `LOOP_LEDGER.md`

## Skills and Capabilities

| Surface | Status | Why Relevant | Handling |
|---|---|---|---|
| `AGENTS.md` | Used | Repository authority, `.ai` location, loop, verification, and safety policy. | Read before planning writes. |
| `.ai/10_state/current-state.md` fast path | Used | Current project state, known validation posture, and UI proof guardrails. | Read fast-path block only as instructed. |
| `.ai/00_system/AGENT_OPERATING_PROTOCOL.md` | Used | Non-trivial plan-pack and loop-engineering contract. | Read relevant policy sections. |
| `archestimator-plan-pack` | Used | Project-specific dated plan pack and ledger discipline. | Target folder fixed by user; plan pack shape follows this skill. |
| `ultragoal` | Used as planning model | Durable goal and ledger discipline. | The active Codex goal for this continuation is the master durable objective; no nested second goal was created. |
| `ultrawork` | Used | Parallel-lane discipline for independent analysis workstreams. | Native subagents are used in bounded read-only waves. |
| `ultraqa` | Used as review model | Adversarial QA matrix informs planning verification. | Planning-only QA strategy; no runtime e2e execution. |
| `autopilot` | Used as lifecycle reference | Clarify-plan-execute-review-QA loop. | Applied to planning package, not feature implementation. |
| `superpowers:using-superpowers` | Used | Skill invocation discipline. | Relevant skills loaded before task work. |
| `superpowers:dispatching-parallel-agents` | Used | Independent workstream delegation pattern. | Subagents receive non-overlapping read-only scopes. |
| `superpowers:writing-plans` | Used with override | Implementation-plan completeness standards. | User's target `.ai/03_plans` folder overrides default docs path and code-heavy micro-step format is adapted to planning. |
| `superpowers:verification-before-completion` | Used | Completion evidence discipline. | Final claim requires artifact and checklist verification. |
| `compound-engineering:ce-plan` | Used with override | Structured technical plan discipline. | Repo-relative references preferred in docs; user-specified folder overrides default `docs/plans` output. |
| `Explore Codebase` | Used proportionally | Broad estimate-sheet architecture mapping. | `rg` and targeted reads first; graph tooling optional if broad symbol impact becomes necessary. |
| Native `multi_agent_v1` subagents | Available | User requested multi-agent orchestration. | Use max 6 concurrent agents; read-only specialists first, verifier last. |
| Top-level `$compound-engineering` skill | Not available as one skill | User named plugin/workflow family, not a single installed skill. | Use relevant Compound Engineering skill `ce-plan` and CE reviewer/researcher agent roles. |
| Top-level `$superpowers` skill | Not available as one skill | User named skill family, not a single installed skill. | Use relevant Superpowers skills listed above. |

## Coordination Ledger

| Agent | /goal | Scope | Evidence | Dependencies | Findings | Conflicts | Status |
|---|---|---|---|---|---|---|---|
| Lead coordinator | Synthesize the master orchestration package from the three source plans and current codebase evidence. | Owns final documents and conflict resolution. | This file, source plan inventory, codebase audit, final artifacts. | All specialist lanes. | Master package produced with source inventory, consolidated requirements, conflicts/resolutions, code audit, orchestration plan, workstreams, todo, before/after report, traceability, risk/rollback, QA strategy, adversarial review, source-ID appendix, and final readiness surface. | Cross-plan conflicts resolved through one phase sequence, one shared contract layer, one data/security preflight, one validation strategy, and explicit deferred/post-launch buckets. | Complete |
| Center source-plan auditor | Audit the center-content plan for requirements, tasks, risks, dependencies, and likely conflicts. | Read-only: center plan folder plus cited files. | All 24 center plan files plus canonical `IMPLEMENTATION_PLAN.md`; cited source symbols spot-verified. | None. | Center Phase 0/1 data-integrity work is launch-blocking; `M-0/M-0T/M-0R` must precede client enablement. | Shared drag payloads, read-only gates, telemetry, project-source revision gate, and `EstimateSheetContent.tsx` ownership overlap. | Complete |
| Right sidebar source-plan auditor | Audit the right-sidebar plan for requirements, tasks, risks, dependencies, and likely conflicts. | Read-only: right-sidebar plan folder plus cited files. | Every right-sidebar plan file, `GOAL.md`, `IMPLEMENTATION_PLAN.md`, `LOOP_LEDGER.md`; cited source symbols spot-verified. | None. | Phase 1 persistence honesty must ship as one coherent bundle after telemetry/flag contract. | Project-source snapshot labels depend on center revision-gate safety; event and drag contracts are shared with center/tree. | Complete |
| Tree sidebar source-plan auditor | Audit the tree-sidebar plan for requirements, tasks, risks, dependencies, and likely conflicts. | Read-only: tree-sidebar plan folder plus cited files. | All tree-sidebar plan files plus canonical `IMPLEMENTATION_PLAN.md`; cited source symbols spot-verified. | None. | Tree is a dependency lane because it owns route/selection/cache/event contracts shared by center/right. | Numeric sort migration, tree signature, keyboard DnD, and shared `ui/tree.tsx` have high blast radius. | Complete |
| Codebase architecture mapper | Map current estimate-sheet architecture, affected files, state/data boundaries, and shared contracts. | Read-only current source/tests/docs. | Targeted `rg`/`sed` over workspace, center, tree, right sidebar, actions, tests, docs; spawned mapper returned unusable partial output and was closed. | Source plan citations. | Shared hot files and existing broken-behavior anchors confirmed. | Single-owner required for `src/lib/estimates/actions.ts`, migrations/types, shared events, and `EstimateSheetContent.tsx`. | Complete |
| Product/UX synthesis lane | Consolidate user journeys, scope, UX/UI/accessibility outcomes, and design constraints. | Read-only source plans, `DESIGN.md`, specs. | UX specialist report plus `DESIGN.md` and current estimate spec anchors. | Source plan audits. | Grid dominance, disabled-not-hidden read-only affordances, snapshot-copy language, and compact stable layout are selected UX constraints. | Right-sidebar width/mobile fallback, bottom bulk docks, and shared keyboard model need one plan-level policy. | Complete |
| Data/security/performance lane | Map data/API/authz/security/perf/reliability concerns across all source plans. | Read-only source plans, migrations/actions/repositories/tests. | Initial architect lane hit capacity; replacement data-integrity guardian completed. | Codebase mapper. | Project-boundary proof, live schema/RLS/grant introspection, telemetry sink proof, deterministic row locks, generated types, and dump/fix-forward planning are mandatory. | DB/RPC sequencing cannot be parallelized casually; plan SQL is sketch material only. | Complete |
| Test/QA lane | Build consolidated validation strategy and future QA scenario matrix. | Read-only source plans and tests. | Validation specialist report; package scripts; estimate/library/share test inventory. | Source plan audits and codebase mapper. | Targeted RED->GREEN gates are merge blockers; broad `bun run validate` is a final/interpretable signal due known noisy baseline. | Browser proof only for browser-only claims. | Complete |
| Blast-radius/docs lane | Map dependencies, active worktree compatibility, docs updates, and rollout/rollback scope. | Read-only docs/source plans/git status. | Planner lane completed. | All source-plan audits. | MOP-0 control plane first; right-sidebar honesty can run early behind flag; center and tree gates still determine launch readiness. | Flag semantics and shared validation baseline must be single-owned. | Complete |
| Adversarial reviewer | Challenge the synthesized package for contradictions, missing conflicts, vague tasks, and unsupported assumptions. | Read-only final draft. | Findings and revisions in `12_ADVERSARIAL_REVIEW.md`. | Initial package draft. | Six high/medium findings resolved: source-ID coverage, phase split, migration runbooks, threat coverage, RACI, and exact validation evidence. | Residual completeness risk moved to `14_SOURCE_ID_COVERAGE_APPENDIX.md` and final verifier. | Complete |
| Independent final verifier | Verify final package against the original task, source plans, and continuation completion gates. | Read-only final package and sources. | Fresh continuation verifier PASS recorded in `13_FINAL_READINESS_REVIEW.md` and `LOOP_LEDGER.md`. | Post-continuation package. | Fresh verifier confirmed docs-only scope, prompt-required scorecards, expanded source-ID coverage, corrected post-PASS status wording, exact test path, numeric budgets, security/authz/search/RPC posture, below-1024 fallback, keyboard model, and a11y/focus matrices. | No remaining verifier blockers; implementation/runtime/provider proof remains future work. | Complete |

## Safety Notes

- Earlier package-creation notes recorded modified/untracked source-plan and landing files. Current continuation recheck with `git status --porcelain=v1` returned no output before this reconciliation pass, so those external dirty-state caveats are historical rather than current.
- All planned writes are confined to `.ai/03_plans/2026-06-25-Estimate-Sheet-Orchestration`.
- Source folders remain inputs only; this package does not normalize, rewrite, or commit them.

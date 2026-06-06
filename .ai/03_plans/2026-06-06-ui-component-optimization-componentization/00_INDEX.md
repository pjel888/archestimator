# UI Component Optimization and Componentization Plan Pack

Date: 2026-06-06

Status: read-only audit, research, adversarial plan-QA, and implementation-handoff pack. No app source implementation was performed.

## 2026-06-06 Refinement Update

Read `README.md` and `CURRENT_CANONICAL_PLAN.md` before using this index. The refined pack now includes the missing `.ai/03_plans/README.md` metadata, measurement protocol, blast-radius analysis, risk register, implementation matrix, route-transition coordination, API contracts, rollout guidance, owner gates, and implementer handoff.

The canonical MVP is Phases 0-3: baseline/safety, pure tree utilities, headless hooks/shells, and read-only share tree unification. Editable estimate-tree and estimate-sheet decomposition remain measurement- and owner-gated.

Current scoped readiness:

- Architecture strategy: 96/100.
- MVP Phases 0-3 planning handoff: 92/100.
- Full editable-tree implementation readiness: 74/100.
- Performance-claim readiness: 45/100 until Profiler and bundle data are collected.

## Target Result

Audit the Archestimator UI for reusable component opportunities, with special focus on tree structures, tree performance, and a concrete implementation plan for future componentization work.

## Executive Decision

The next implementation should not start by building a broad generic design system. The repo already has useful primitives and one shared tree row surface. The highest-value work is to extract reusable, tested composition layers around the existing workshop and share tree surfaces, then split the largest client components into domain-specific sections and hooks.

The first version of this pack was directionally useful but too shallow for execution. The improved version adds risk-ranked graph evidence, adversarial critique, explicit TDD task slices, a plan-quality QA matrix, and durable handoff guidance.

Primary recommendation:

1. Keep `react-complex-tree` for editable drag/drop trees for now.
2. Add a repo-local tree core for shared expansion, filtering, flattening, selection, indexing, and row rendering.
3. Use virtualization only after flattening visible tree rows and measuring row counts/render cost. Treat `@tanstack/react-virtual` as an adoption candidate, not an automatic dependency addition.
4. Split `EstimateSheetContent.tsx` and `ComponentLibraryManager.tsx` by behavior seams before visual redesign.
5. Preserve the current neutral workshop UI rules from `DESIGN.md` and `.ai/10_state/decisions.md`.

## Artifacts

- `01_UI_REUSE_AUDIT.md` - repo-local componentization audit with file-level findings.
- `02_TREE_PERFORMANCE_RESEARCH.md` - official-source research on React, Next.js, virtualization, React Complex Tree, and WAI-ARIA tree constraints.
- `03_TREE_COMPONENTIZATION_AUDIT.md` - tree-surface matrix and performance/reuse findings.
- `04_IMPLEMENTATION_PLAN.md` - staged implementation plan with files, tests, acceptance criteria, and rollback gates.
- `05_READINESS_VALIDATION.md` - validation ledger, constraints, RALPLAN-style decision record, and remaining risks.
- `06_STRATEGY_CRITIQUE_AND_DECISION.md` - adversarial critique of the first strategy and the corrected decision.
- `07_REPO_EVIDENCE_REGISTER.md` - graph, source-line, test, and research evidence table.
- `08_TDD_IMPLEMENTATION_TASK_PACK.md` - concrete TDD-first implementation tasks with red/green steps.
- `09_ULTRAQA_PLAN_QUALITY_REPORT.md` - adversarial QA matrix for the plan pack itself.
- `10_ULTRAGOAL_TEAM_HANDOFF.md` - durable goal and parallel execution handoff guidance.
- `README.md` - master metadata, reading order, and success criteria.
- `CURRENT_CANONICAL_PLAN.md` - source of truth for current status and gates.
- `MEASUREMENT_BASELINE.md` and `BENCHMARK_PROTOCOL.md` - measurement tables and procedure.
- `BLAST_RADIUS_ANALYSIS.md` - GitNexus and code-review graph impact evidence.
- `RISK_REGISTER.md`, `IMPLEMENTATION_MATRIX.md`, `CROSS_PLAN_REFERENCES.md`, `TREE_CORE_API_CONTRACTS.md`, `EFFORT_AND_MVP_SLICING.md`, `GRADUAL_ROLLOUT_STRATEGY.md`, `VISUAL_REGRESSION_STRATEGY.md`, `OWNER_SIGNOFF.md`, `HANDOFF.md`, and `PLAN_REPAIR_LOG.md` - refined implementation-readiness controls.

## Evidence Base

Repo graph evidence:

- `code-review-graph` minimal context: 5,042 nodes, 74,559 edges, 560 files, medium risk.
- Graph last updated: 2026-06-06T21:35:04 on `main` at commit `7c20850754a7`.
- Largest UI hotspot: `src/components/workshop/EstimateSheetContent.tsx`, about 4,071 lines.
- Largest tree hotspot: `src/components/workshop/EstimateSheetTree.tsx`, about 1,576 lines.
- Top bridge nodes include `EstimateSheetContent`, `EstimateSheetTree`, and `EstimateRightSidebar`.
- Other high-value surfaces: `AddComponentModal.tsx`, `ComponentLibraryManager.tsx`, `LibraryFolderTree.tsx`, `ProjectEstimatesTable.tsx`, `ShareEstimateTreePanel.tsx`, `ShareEstimateTreeView.tsx`, `buildLibraryTree.ts`, `library-folder-reorder.ts`, and `workshop-tree.tsx`.

External research sources:

- React `memo`: https://react.dev/reference/react/memo
- React `useMemo`: https://react.dev/reference/react/useMemo
- React `useCallback`: https://react.dev/reference/react/useCallback
- React `Profiler`: https://react.dev/reference/react/Profiler
- Next.js lazy loading: https://nextjs.org/docs/app/guides/lazy-loading
- TanStack Virtual introduction: https://tanstack.com/virtual/latest/docs/introduction
- TanStack Virtualizer API: https://tanstack.com/virtual/latest/docs/api/virtualizer
- TanStack Table virtualization guide: https://tanstack.com/table/latest/docs/guide/virtualization
- React Complex Tree controlled environment: https://rct.lukasbach.com/docs/guides/controlled-environment/
- React Complex Tree multiple trees: https://rct.lukasbach.com/docs/guides/multiple-trees/
- WAI-ARIA Tree View Pattern: https://www.w3.org/WAI/ARIA/apg/patterns/treeview/

## Stop Condition For Future Implementation

The implementation branch can be considered complete only when:

- Shared tree utilities and row/shell primitives have targeted tests.
- Existing tree behavior remains unchanged in editable estimate tree, component library tree, and share tree.
- `EstimateSheetContent.tsx` no longer owns unrelated table, activity, proposal, sidebar, and mutation concerns in one file.
- No new dependency is added without a measured threshold and approval.
- `bun run type-check`, `bun run lint:design-system`, targeted Vitest files, `bun run perf:profile-peak-load`, `git diff --check`, and any relevant route smoke/perf scripts pass or have explicit fixture blockers.

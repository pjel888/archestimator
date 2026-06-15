# Sequential Plan Pack Implementation Goal

**Created:** 2026-06-16
**Purpose:** Copy-ready `/goal` prompt for implementing three Archestimator plan packs one at a time, with durable checkpoints and QA gates between plans.

---

## Copy-ready `/goal` prompt

```text
/goal Implement these three Archestimator plan packs sequentially, one complete plan at a time, in this exact order:

1. .ai/03_plans/2026-06-15-Estimate-Sheet-Content-Table
2. .ai/03_plans/2026-06-15-Projects-Page-UX-UI-Plan
3. .ai/03_plans/2026-06-16-Project-Data-Route-Feature-Plan

Use the requested workflow surfaces as the execution contract:
$ultragoal $ultraqa $ultrawork $compound-engineering:lfg $compound-engineering:ce-plan $compound-engineering:ce-strategy

Target result: all three plan packs are implemented in the application, in sequence, with each plan fully verified and documented before the next plan begins. Do not batch implementation across plans. Do not start Plan 2 until Plan 1 is complete. Do not start Plan 3 until Plan 2 is complete.

Parallel-agent orchestration requirement:
- For this task, write yourself a fresh aggregate goal and spawn coding/review/research agents in parallel as needed to do the work better and faster, while preserving the one-plan-at-a-time rule.
- Give every spawned agent its own dedicated `/goal` or explicit subgoal tied to the current active plan only. A worker goal must name its scope, allowed files, non-goals, validation evidence, and handoff format.
- Split the active plan into independent pieces before dispatching agents: repo exploration, implementation by disjoint file scope, test updates, browser/manual proof, graph/impact checks, adversarial QA, and review can run concurrently when they do not conflict.
- Dispatch independent agents concurrently and synthesize their results as they return. Do not serialize work that is safely parallel.
- Make agent communication explicit. Use the active ultragoal/ultrawork/team ledger, `.ai/05_logs/`, plan-pack evidence files, or the runtime's team mailbox/chat surface so agents can see assigned scopes, blockers, changed files, validation results, and conflict reports. If the runtime supports direct worker-to-worker communication, enable it; otherwise route all worker updates through the lead orchestrator and shared log.
- Always assume multiple coding AI agents are working in the same directory. Stay vigilant: check `git status --short --branch` before each edit/test cycle, inspect overlapping files before writing, announce shared-file ownership, avoid broad formatting, and never overwrite or revert changes you did not make.
- Resolve conflicts deliberately. If two agents need the same file, pause one lane, let the lead integrate the shared file, rerun the affected tests, and record the conflict plus resolution in the durable evidence.
- Keep the lead responsible for final integration, scope control, verification, and completion claims. Worker agents execute bounded slices; they do not widen scope or declare the whole plan complete on their own.

Core operating constraints:
- Follow AGENTS.md and the .ai source-of-truth chain before editing: .ai/README.md, .ai/00_system/ai-folder-canonical-map.md, .ai/00_system/AGENT_OPERATING_PROTOCOL.md, .ai/00_system/AGENT_FRAMEWORK_PROTOCOL.md, .ai/10_state/current-state.md, .ai/10_state/decisions.md, and DESIGN.md.
- Verify live branch and dirty work with `git status --short --branch` before each plan. Inspect overlapping modified files before editing. Never revert unrelated user or agent work.
- Treat the referenced plan packs as authoritative. Read every plan pack's 00-README and worker handoff/roadmap/verification documents before implementing that plan.
- Use `compound-engineering:ce-strategy` for upstream product grounding. If STRATEGY.md exists, read it and ensure the implementation does not drift from active product tracks. Do not rewrite strategy unless implementation evidence proves current strategy truth is stale.
- Use `compound-engineering:ce-plan` as the plan-readiness/reconciliation gate. These plan packs already exist; do not generate duplicate plans. Update the existing plan pack only when source reality or implementation evidence proves a plan instruction is stale, unsafe, or contradictory.
- Use `ultragoal` as the durable sequential ledger. Represent each plan pack as its own story/subgoal under the aggregate goal. Checkpoint after each plan with files changed, tests run, QA evidence, blockers, and remaining risks.
- Use `ultrawork` only inside the active plan when independent lanes exist, such as implementation, test updates, browser proof, graph/impact checks, or focused review. Keep coupled/shared-file edits local to one lane.
- Use `compound-engineering:lfg` as the plan-first implementation spine where the environment supports it: plan readiness, work, review, fixes, browser checks, commit/PR/CI if explicitly available. If GitHub/CI or browser auth is unavailable, run the equivalent local loop and record the proof boundary honestly.
- Use `ultraqa` after each plan, not only at the end. Build an adversarial scenario matrix appropriate to the changed behavior, run the smallest real behavior checks that can prove the plan, fix failures, clean temporary artifacts, and record residual risks.
- For frontend/user-visible changes, run browser or manual proof when auth/dev-server access exists. Unit tests are not browser proof. If authenticated smoke is blocked, record `AUTH-BLOCKED` with the blocker and strongest substitute evidence.
- For Supabase/Postgres changes, stay strictly inside Archestimator project `ebxxqidacheyapmmzavr`; the three referenced plans currently avoid schema/provider changes unless implementation evidence proves a narrow fix is required.
- Keep edits scoped to the active plan's allowed files unless a failing verification proves a directly related supporting change is required. Document every scope expansion.
- Do not add dependencies unless a referenced plan explicitly requires it. These plans do not require new charting/UI dependencies.
- Preserve Archestimator's product UI design system: quiet dense workshop UI, SF Pro/system app scale, compact controls, no decorative gradients/orbs, and no broad visual redesign outside the active plan.

Plan-by-plan execution order and gates:

PLAN 1: Estimate Sheet Content Table / Resizable Columns
Path: .ai/03_plans/2026-06-15-Estimate-Sheet-Content-Table

Required read order:
- 00-README.md
- 10-implementation-worker-handoff.md
- 06-recommendation-and-migration-plan.md
- 04-shared-width-state-design.md
- 07-ux-ui-interaction-spec.md
- 08-execution-and-traceability.md
- 09-performance-measurement-plan.md
- 05-risk-edgecase-readiness.md
- 01-current-architecture-audit.md
- 02-memoization-virtualization-audit.md
- 03-tanstack-resizing-research.md

Implement the worker handoff exactly:
- Keep the existing CSS-grid row-table renderer and fixed-height virtualization.
- Do not rewrite the sheet into a full TanStack row model.
- Implement the canonical 9-track model and only the six resizable data columns: material, quantity, subTotal, adjustment, miscCost, totalItemCosts.
- Use shared CSS variables on `[data-estimate-pointer-surface]`.
- Live pointer drag must mutate the shared surface style imperatively and must not route through React state.
- Commit final widths once on pointer-up to a per-estimate store.
- Preserve fixed 96px row-height virtualization, single-line/truncate behavior, and existing `data-estimate-*` DOM contracts.
- Keep widths screen-only/private: no collaboration broadcast, server persistence, export/public-share/proposal/workbook influence, or provider writes.
- Add feature flag `NEXT_PUBLIC_ESTIMATE_COLUMN_RESIZE_ENABLED` through the existing workshop virtualization flag pattern and leave it disabled by default.

Plan 1 completion gate:
- Phase gates in 10-implementation-worker-handoff.md pass.
- Required tests from the handoff and performance plan pass, including type-check, focused U1-U5 unit/component tests, estimate-sheet virtualization/render-relief suites, export/publication isolation tests, changed-file ESLint, and `git diff --check`.
- Browser/auth E2E or strongest available substitute is recorded; if blocked, document the exact blocker and missing proof.
- Final report states whether `material` stayed at 160 or was raised after express-card measurement, whether the feature flag remains off by default, and whether any width state touches collaboration/server/export/public surfaces.
- Run UltraQA for the active Plan 1 behavior before checkpointing complete.
- After Plan 1 is implemented, verified, UltraQA-clean, and has no known errors, archive the completed folder under `.ai/09_archive/` using the same folder name or an unambiguous dated archive path. Do not archive it while errors, blockers, missing proof, or follow-up implementation remains.
- Only after this gate is proven may Plan 2 start.

PLAN 2: Projects Page UX/UI
Path: .ai/03_plans/2026-06-15-Projects-Page-UX-UI-Plan

Required read order:
- 00-README.md
- 09-implementation-worker-handoff.md
- 06-recommended-design.md
- 07-implementation-roadmap.md
- 08-verification-and-revisions.md
- 01-current-state-audit.md through 05-best-practices-research.md as supporting evidence when needed.

Implement the worker handoff exactly:
- Keep the change page-local.
- Allowed source edits are limited to src/components/workshop/projects-page-client.tsx, src/components/workshop/WorkshopCollectionLayout.tsx, and src/components/workshop/LiveProjectCard.tsx unless a directly related test/helper update is proven necessary.
- Add `filterSlot` to WorkshopCollectionLayout and forward it to TreePanelHeader.
- Resolve and record the View control pattern before U2: SegmentedControl is the UX recommendation; DropdownSelect is the collapsed-control product override. Sort remains DropdownSelect either way.
- Preserve all existing project view mode values, storage key `archestimator_projects_view_mode_v1`, and cross-tab behavior.
- Add page-local in-memory Sort only. No sort persistence, no server sort, no repository query change.
- Empty/sample states: View disabled with accessible explanation, Sort hidden. Search miss inside a populated tab keeps both enabled.
- Add created-date visibility only to large live project cards.
- Do not add a Filter button, shared primitive refactor, Supabase change, dependency, grouping, favorites-first mode, or server preference sync.

Plan 2 completion gate:
- The View decision is recorded in the plan pack's evidence/verification section.
- Targeted Vitest command from 09-implementation-worker-handoff.md passes.
- `bun run type-check` passes.
- `git diff --check` passes.
- Focused browser/manual smoke proves desktop and narrow toolbar behavior: Search, View, Sort, direction, Add, and tabs fit; Add remains reachable; dropdown/listbox popups are not clipped; keyboard open/select/close works. If auth blocks this, update 08-verification-and-revisions.md with `AUTH-BLOCKED` and substitute evidence.
- Run UltraQA for the active Plan 2 behavior before checkpointing complete.
- After Plan 2 is implemented, verified, UltraQA-clean, and has no known errors, archive the completed folder under `.ai/09_archive/` using the same folder name or an unambiguous dated archive path. Do not archive it while errors, blockers, missing proof, or follow-up implementation remains.
- Only after this gate is proven may Plan 3 start.

PLAN 3: Project Data Route Feature Plan
Path: .ai/03_plans/2026-06-16-Project-Data-Route-Feature-Plan

Required read order:
- 00-README.md
- 06-recommended-design.md
- 07-implementation-roadmap.md
- 08-verification-and-open-questions.md
- 09-implementation-agent-handoff.md
- 01-current-state-audit.md through 05-ux-dataviz-best-practices.md as supporting evidence when needed.

Implement the roadmap exactly:
- Build the calm two-section `/workshop/projects/[projectId]/data` page: Cost Breakdown and Cost Across Sheets.
- Keep no new charting dependency. Use existing `d3-shape` donut/CSS bar patterns and existing UI primitives.
- Break fixture coupling before deleting comparison components.
- Adopt the DashboardCostMix pattern for Cost Breakdown, but render CostDonutChart in full-callout labeled mode, extend it for controlled table highlight and 11px callout text if needed, and sync selected sheet/grouping to `?sheet=` and `?mode=`.
- Cost Across Sheets is stacked bars over discrete estimate sheets, not a time trend or area chart. Order by total descending. Hide for fewer than two sheets. Use totals-only behavior or the documented cap for more than 20 sheets. Hide Section 2 with notice on mixed currencies.
- Create a surviving `src/lib/repositories/project-data-repository.ts` boundary before deleting `project-charts-repository.ts`.
- Add a restrained KPI header: selected-sheet total and sheet count by default; third top-category card only if it earns its space.
- Repoint live dashboard compare links to canonical `?sheet=` before comparison deletion.
- Delete the old comparison shell/components only after the new route no longer imports them, U9 is done, impact analysis proves no external importers remain, and one cheap pairwise-compare usage signal is recorded.
- Add `/workshop/projects/:projectId/charts` to `/workshop/projects/:projectId/data` redirect, preserving query. Back-compat for legacy `?left=` lives in the `/data` page param reader; static redirects cannot rename query keys. Prove redirect Location preserves `left/right`, then prove the page reader maps `sheet ?? left`.
- Do not add time-series snapshots, pairwise compare, Supabase schema changes, public/share/collaboration changes, new shared UI abstractions, or cosmetic internal `project-charts` import renames.

Plan 3 completion gate:
- QA matrix and accessibility gate in 08-verification-and-open-questions.md pass.
- `bun run type-check` passes.
- Targeted project-data/dashboard/route Vitest suite passes.
- `git diff --check` passes.
- Graph/impact checks show only intended components and flows changed, especially before/after gutting `project-charts`.
- Browser proof shows the page reads as calm cost data, sheet swap works under the router-backed v1 mechanism, mixed-currency gate works, IDOR `?sheet=`/`?left=` behavior is scoped safely, and `/charts` links resolve to `/data` with selected sheet preserved.
- Run UltraQA for the active Plan 3 behavior before checkpointing complete.
- After Plan 3 is implemented, verified, UltraQA-clean, and has no known errors, archive the completed folder under `.ai/09_archive/` using the same folder name or an unambiguous dated archive path. Do not archive it while errors, blockers, missing proof, or follow-up implementation remains.

Final aggregate completion gate:
- All three plan checkpoints are complete in the durable ledger.
- All three completed plan folders have been moved from `.ai/03_plans/` to `.ai/09_archive/` after their clean implementation gates passed.
- No required plan, unit, scenario, named command, accessibility gate, browser/manual proof, graph/impact check, or evidence update remains incomplete or unverified.
- Run a final focused cleanup/review pass over changed files. Do not broaden into unrelated refactors.
- Rerun the smallest end-to-end validation set that proves the combined sequence did not break shared surfaces. Include at minimum `bun run type-check`, `git diff --check`, and the targeted test suites from all three plans unless a stronger documented blocker exists.
- Run final independent review/maker-checker where practical. Fix actionable findings before claiming done. Record any residual risk in .ai/05_logs or the relevant plan pack.
- Update .ai/10_state/current-state.md only if the implementation changes durable project truth.
- Final response must include: completed plan order, changed files grouped by plan, verification commands and results, browser/manual/provider proof boundary, UltraQA summary, unresolved validation gaps, and any follow-up plans created.

Stop condition: The aggregate goal is complete only when Plan 1, Plan 2, and Plan 3 are all implemented, verified, QA-audited, and checkpointed in order. If blocked, keep working through safe alternatives; ask only for destructive/irreversible, credential-gated, external-production, or genuinely ambiguous decisions.
```

---

## Prompt maintenance notes

- This prompt intentionally points future agents to the plan packs instead of duplicating every implementation detail. The plan packs stay authoritative.
- If any referenced plan pack is moved to `.ai/09_archive/`, update the paths above before reusing the prompt.
- If a future implementation run finishes one plan and pauses, resume from the next incomplete numbered plan only after auditing the previous plan's evidence.

# 11 — Implementation Plan

Authoritative execution guide. Phases are dependency-aware; tasks have exact paths/symbols. Implementation must re-read touched files before editing (shared worktree) and keep diffs surgical.

Phase order: **P1 (href fix) → P2 (empty states: projects + dashboard + estimates) → P3 (estimate template chooser, gated) → P4 (analytics) → P5 (verification & doc)**. P1, P2-lanes, P4 can run in parallel; P3 waits on `OPEN-DEC-02`.

## Ultragoal-style durable-goal contracts (per phase)

Each phase below carries: Goal ID, Objective, Scope, Requirements, Required evidence, Completion audit, Checkpoint artifacts, Stop condition, Blocker condition, Review gate, QA gate.

---

## PHASE P1 — Start-route href consistency

- **Goal ID:** GOAL-P1
- **Objective:** Make sidebar-favorite and project-card open link land on the same route.
- **Requirements:** FR-05.
- **Scope:** `src/components/workshop/projects-page-client.tsx:2854` (favorite href).
- **Stop condition:** both surfaces produce `/workshop/projects/${projectId}` (Dashboard), asserted by a test.
- **Blocker condition:** `OPEN-DEC-03` unresolved (owner: Dashboard vs Estimates). Recommended default = Dashboard.

### Task P1-T1 — Fix sidebar-favorite project href
- **Task ID:** P1-T1
- **Requirement IDs:** FR-05
- **Objective:** Change the favorite project `href` to `/workshop/projects/${projectId}` to match `LiveProjectCard` `projectHref`.
- **Why:** Current mismatch sends sidebar users to Estimates, card users to Dashboard.
- **Target file:** `src/components/workshop/projects-page-client.tsx`
- **Target symbol/region:** favorite-toggle handler / favorite href builder near `:2854`.
- **Inputs/dependencies:** confirm `OPEN-DEC-03` (recommended Dashboard). Verify `src/components/sidebar/MainSidebar.tsx` reads the server-provided favorite href (no separate hardcoded path).
- **Implementation instructions:** Replace `href={`/workshop/projects/${projectId}/estimates`}` with `href={`/workshop/projects/${projectId}`}`. Confirm the sidebar favorite item uses this href (trace `listMainSidebarFavoriteProjects` payload).
- **Expected output:** both surfaces link to the Dashboard route.
- **Failure cases:** If the sidebar computes its own href independently, fix the server payload instead; keep the single source of truth.
- **Tests:** update `tests/vitest/main-sidebar-favorites.test.tsx` to assert Dashboard href; extend `projects-page-card-layout.test.tsx` to assert equality of card + favorite href.
- **Validation:** `bun run test:dom -- main-sidebar-favorites projects-page-card-layout`; `bun run type-check`.
- **Completion evidence:** green tests showing identical hrefs.
- **Parallelization:** Parallel-safe (independent file region).
- **Complexity:** Small.

**Phase P1 durable-goal fields:** Checkpoint artifact = `main-sidebar-favorites.test.tsx` green. Review gate = DOM test green. QA gate = n/a (no runtime browser-only claim beyond href equality, which DOM test proves). Completion audit = FR-05 acceptance criteria met.

---

## PHASE P2 — Prominent empty states (projects, dashboard, estimates)

- **Goal ID:** GOAL-P2
- **Objective:** Make the three start states self-evident without new server work.
- **Requirements:** FR-01, FR-02, FR-03, FR-07 (verification), UX-01/02/03, A11Y-01/02/03, ARCH-01/02/03, PERF-01/02.
- **Scope:** `projects-page-client.tsx`, `ProjectDashboardClient.tsx`, `ProjectEstimatesClient.tsx` (+ `ProjectEstimatesTable.tsx`), reuse `empty-state.tsx`.
- **Stop condition:** all three empty states render under their exact conditions; no new server round-trip; render/RPC baselines green.
- **Blocker condition:** `OPEN-DEC-01` (copy/visual) for FR-01 — recommended copy provided; proceed with recommended.

### Task P2-T1 — Zero-project empty workspace state
- **Task ID:** P2-T1
- **Requirement IDs:** FR-01, UX-01, UX-03, A11Y-01, ARCH-01
- **Objective:** Render a dense empty state with a primary "Create your first project" CTA when the workspace has zero owned projects and no active filter.
- **Why:** First users see an empty grid today (GAP-1).
- **Target file:** `src/components/workshop/projects-page-client.tsx`
- **Target region:** render branch where `displayLiveProjects.map(...)` runs (~`:3397`). Add a condition: when `ownedProjectItems.length===0 && !hasNoSearchResults && !hasNoStatusResults` (i.e. truly zero, no filter) render the empty-workspace state instead of the empty grid.
- **New file (optional):** `src/components/workshop/projects-empty-workspace-state.tsx` — small presentational component reusing `src/components/ui/empty-state.tsx`. Responsibility: title/body/primary CTA. Public API: `{ onCreateProject: () => void }`. Why a new file: keeps the giant `projects-page-client.tsx` edit surgical and gives a unit-testable boundary. If `EmptyState` already suffices inline, skip the new file (implementation judgment).
- **Implementation instructions:**
  - Derive a `hasZeroOwnedProjects = ownedProjectItems.length === 0 && !hasNoSearchResults && !hasNoStatusResults` flag.
  - When true, render the empty-workspace state (CTA dispatches the same `setIsModalOpen:true` as the toolbar).
  - Do NOT render it when a filter is active (AC-01c).
  - Use app-scale typography; pass `lint:design-system`.
- **Expected output:** `data-project-empty-workspace-state` element with a "Create your first project" button.
- **Failure cases:** If `ownedProjectItems` includes optimistic-shared items, ensure the zero check uses owned only (the route already filters to `owned`).
- **Tests:** new `tests/vitest/projects-page-empty-workspace.test.tsx` — asserts AC-01a/b/c/d.
- **Validation:** `bun run test:dom -- projects-page-empty-workspace`; `bun run lint:design-system`; `bun run test:dom -- projects-page-render-baseline projects-page-rpc-contract`.
- **Completion evidence:** AC-01a–d green; baselines green.
- **Parallelization:** Parallel-safe with P2-T2/T3 (different files), but coordinate if all three touch `projects-page-client.tsx` (only P2-T1 does).
- **Complexity:** Medium.

### Task P2-T2 — Project-dashboard first-estimate nudge
- **Task ID:** P2-T2
- **Requirement IDs:** FR-02, A11Y-01
- **Objective:** When `estimateCount===0 && canEditProject`, render a compact nudge linking to the Estimates tab.
- **Target file:** `src/components/workshop/ProjectDashboardClient.tsx`
- **Target region:** `ProjectEstimateSummaryPanel` (`:179-234`).
- **Implementation instructions:** Add a conditional `<Link href={/workshop/projects/${projectId}/estimates}>` "Start your first estimate" when `estimateCount===0 && canEditProject`. When `!canEditProject`, keep "No estimate sheets yet" text only (AC-02c). Use the existing `projectId` prop.
- **Expected output:** a focusable link in the summary panel under the zero-estimate condition.
- **Failure cases:** If `projectId` is not in scope at `ProjectEstimateSummaryPanel`, thread it from `ProjectDashboardClient` props.
- **Tests:** update `tests/vitest/project-dashboard-client.test.tsx` — AC-02a/b/c.
- **Validation:** `bun run test:dom -- project-dashboard-client`.
- **Completion evidence:** AC-02a–c green.
- **Parallelization:** Parallel-safe (independent file).
- **Complexity:** Small.

### Task P2-T3 — Prominent estimates-table empty state
- **Task ID:** P2-T3
- **Requirement IDs:** FR-03, UX-01, UX-03, A11Y-01
- **Objective:** Show a prominent `EmptyState` with "Create Estimate" CTA when a project has zero estimates, instead of relying on the inline filler-row input alone.
- **Target files:** `src/components/workshop/ProjectEstimatesClient.tsx` (render branch), `src/components/workshop/ProjectEstimatesTable.tsx` (the `showEmptyMessage` hardcode `:1123`).
- **Implementation instructions:**
  - In `ProjectEstimatesClient`, when `estimates.length===0`, render a prominent empty state (reuse `src/components/ui/empty-state.tsx`) with `data-estimates-empty-state` and a primary "Create Estimate" button calling `handleCreateEstimateSheet()` (when `canCreateEstimates`).
  - When `!canCreateEstimates`, render the empty state without the CTA (AC-03b).
  - Keep the table's inline `ProjectEstimateBlankNameCreateCell` as a power-user affordance; it is no longer the sole cue.
  - Decide (implementation) whether to set `showEmptyMessage=true` for the zero case or render the prominent state above the table — either satisfies AC-03a; the prominent state is the requirement.
- **Expected output:** `data-estimates-empty-state` with "Create Estimate" under zero-estimate + canCreate.
- **Failure cases:** Ensure the empty state disappears once `estimates.length>0` (AC-03c) including after optimistic insert.
- **Tests:** new `tests/vitest/project-estimates-empty-state.test.tsx` — AC-03a/b/c/d.
- **Validation:** `bun run test:dom -- project-estimates-empty-state`; `bun run lint:design-system`.
- **Completion evidence:** AC-03a–d green.
- **Parallelization:** Parallel-safe with P2-T1/T2.
- **Complexity:** Medium.

### Task P2-T4 — Verify auto-seed preserved (FR-07)
- **Task ID:** P2-T4
- **Requirement IDs:** FR-07
- **Objective:** Confirm `NewProjectForm` still seeds one estimate and that a failed seed still leaves the project reachable with the FR-03 empty state.
- **Target files:** verification only on `src/components/workshop/NewProjectForm.tsx:335`; no code change unless a regression is found.
- **Tests:** extend `tests/vitest/new-project-form-validation.test.tsx` to assert (a) one estimate after success, (b) FR-03 empty state reachable if seed fails.
- **Validation:** `bun run test:dom -- new-project-form-validation`.
- **Completion evidence:** AC-07a/b green.
- **Parallelization:** Sequential after P2-T3 (depends on FR-03 existing).
- **Complexity:** Small.

**Phase P2 durable-goal fields:** Checkpoint artifacts = the three new/updated test files green + baselines green. Review gate = DOM tests + lint:design-system + perf baselines. QA gate = browser proof deferred (focus/responsive) — implementation must run targeted Playwright for focus order + narrow-screen layout before claiming P2 complete (browser-only claims). Completion audit = FR-01/02/03/07 acceptance criteria + PERF-01/02 met.

---

## PHASE P3 — Estimate empty-state template chooser (gated)

- **Goal ID:** GOAL-P3
- **Objective:** Optional template chooser in the estimate empty-tab state.
- **Requirements:** FR-04.
- **Scope:** `src/components/workshop/EstimateSheetContent.tsx` (`:2746-2777`); reuse `use-estimate-template-insertion.ts`.
- **Stop condition:** chooser offers templates alongside "Add Area"; choosing one uses the existing insert path.
- **Blocker condition:** `OPEN-DEC-02` (product direction). Recommended: empty-state-only chooser (no server contract change).

### Task P3-T1 — Template chooser in empty-tab state
- **Task ID:** P3-T1
- **Requirement IDs:** FR-04
- **Objective:** Add an optional template quick-pick to the empty-tab state.
- **Target file:** `src/components/workshop/EstimateSheetContent.tsx`
- **Target region:** empty-tab state `:2746-2777` (where "Add Area" + "Browse templates" render).
- **Implementation instructions (recommended approach):** Surface the `availableTemplates` (already passed to `EstimateRightSidebar` at `:2797`) as a compact quick-pick list/row in the empty-tab state. Selecting one calls the existing `onInsertTemplate`/`insertTemplateIntoParent` path (no new server action). Keep "Add Area" the default; the chooser is additive. Hide for read-only (AC-04d).
- **Expected output:** editors see template affordances in the empty-tab state.
- **Failure cases:** If `availableTemplates` is empty (no templates), the chooser renders a "Browse templates" link only (degrade gracefully).
- **Tests:** update `tests/vitest/estimate-empty-tab-state.test.tsx` — AC-04a/b/c/d.
- **Validation:** `bun run test:dom -- estimate-empty-tab-state`.
- **Completion evidence:** AC-04a–d green.
- **Parallelization:** Sequential after `OPEN-DEC-02` resolved; otherwise independent.
- **Complexity:** Medium.

**Phase P3 durable-goal fields:** Checkpoint artifact = `estimate-empty-tab-state.test.tsx` green. Review gate = DOM test. QA gate = browser proof for chooser interaction (deferred to implementation). Blocker = OPEN-DEC-02.

---

## PHASE P4 — Activation-funnel analytics (redacted)

- **Goal ID:** GOAL-P4
- **Objective:** Emit minimal, PII-free activation events.
- **Requirements:** FR-06, SEC-02.
- **Scope:** `NewProjectForm.tsx`, `ProjectEstimatesClient.tsx`, `use-estimate-row-handlers.ts`, telemetry helper.
- **Stop condition:** four events emit with no PII; redaction test green.
- **Blocker condition:** none (SDK choice deferred to sibling plan — use the existing telemetry helper surface).

### Task P4-T1 — Emit activation events
- **Task ID:** P4-T1
- **Requirement IDs:** FR-06, SEC-02
- **Objective:** Emit `project_created`, `estimate_started`, `estimate_first_area_added`, `estimate_first_row_added` with workspace id + boolean/counts only.
- **Target files:** `src/components/workshop/NewProjectForm.tsx` (after `createProjectRecord` success), `src/components/workshop/ProjectEstimatesClient.tsx` (after `createEstimateSheetDraft` success), `src/components/workshop/estimate-sheet/use-estimate-row-handlers.ts` (first area / first row).
- **Implementation instructions:**
  - Compute "first" via counts (e.g. server returns whether this is the first estimate for the project; or derive from the pre-create list length). Avoid stale-client false positives.
  - Payload: `{ workspaceId, isFirst: boolean, count: number }` — **no names/clients**.
  - Use the existing telemetry helper used by `use-estimate-row-handlers.ts:740`.
- **Expected output:** events fire under the right conditions; redaction test asserts no PII.
- **Failure cases:** telemetry helper unavailable → degrade silently (no throw); events are best-effort.
- **Tests:** new `tests/vitest/start-path-activation-events.test.ts` — asserts emission + redaction.
- **Validation:** `bun run test:dom -- start-path-activation-events`.
- **Completion evidence:** AC-06a/b/c green.
- **Parallelization:** Parallel-safe with P2 (different concerns; coordinate on `ProjectEstimatesClient.tsx` if both edit it).
- **Complexity:** Medium.

**Phase P4 durable-goal fields:** Checkpoint artifact = `start-path-activation-events.test.ts` green. Review gate = redaction test. QA gate = n/a (unit-provable). Completion audit = FR-06/SEC-02 acceptance criteria met.

---

## PHASE P5 — Verification, doc, cleanup

- **Goal ID:** GOAL-P5
- **Objective:** Final verification + state doc update.
- **Requirements:** DOC-01, TEST-01.
- **Tasks:**
  - P5-T1: Run focused validation: `bun run type-check && bun run lint && bun run lint:design-system && bun run test:dom` for the touched files; run the two perf baselines.
  - P5-T2: Add FAST PATH entry to `.ai/10_state/current-state.md` (DOC-01) describing the start-path IA.
  - P5-T3: Confirm no application files outside the named scope were edited (`git diff --check` + diff review).
- **Stop condition:** all touched tests green; baselines green; doc updated; diff clean.
- **Complexity:** Small.

---

## Open / blocked tasks summary

| Task | Status | Blocker |
|---|---|---|
| P1-T1 | ready (recommended default Dashboard) | `OPEN-DEC-03` |
| P2-T1 | ready (recommended copy) | `OPEN-DEC-01` (copy confirm) |
| P2-T2 | ready | none |
| P2-T3 | ready | none |
| P2-T4 | ready | none |
| P3-T1 | blocked | `OPEN-DEC-02` |
| P4-T1 | ready | none |
| P5-* | ready | none |

No `DISCOVERY-REQUIRED` / `BLOCKED-EVIDENCE` / `BLOCKED-ARCHITECTURE` tasks. The three `OPEN-DEC`s are owner product decisions with recommended defaults and conditional paths (proceed with default, swap on confirm).

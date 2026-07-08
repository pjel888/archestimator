# 04 — Requirements Specification

Stable IDs. Every requirement has objective acceptance criteria, validation method, affected code areas, and shadow-path coverage. Priorities: P0 (must), P1 (should), P2 (nice). Source-strength tags: `brief`, `repo evidence`, `derived`, `owner-delegated`.

## FR — Functional requirements

### FR-01 (P0) Zero-project empty state on `/workshop/projects`
- **Statement:** When a user has zero owned projects and no active filter, the projects grid shows a dense empty state with a single primary CTA "Create your first project" that opens `NewProjectModal`, plus a one-line hint. It must NOT show when any filter yields zero (those keep their existing search/status empty states).
- **Rationale:** First users see an empty grid with only a toolbar button today (GAP-1). Self-evident start.
- **Source:** brief ("empty… states") + repo evidence (`projects-page-client.tsx:1960`).
- **Acceptance criteria:**
  - AC-01a: With `projects.length===0` and no search/tab filter, an element with `data-project-empty-workspace-state` renders containing a button labeled "Create your first project".
  - AC-01b: Clicking it dispatches the same action as the toolbar "Add projects" (`setIsModalOpen:true`).
  - AC-01c: When `hasNoSearchResults || hasNoStatusResults` is true, the zero-workspace state does NOT render (existing filter empty states take precedence).
  - AC-01d: The empty state does not add a server round-trip (derives from props already fetched by the route).
- **Validation:** `bun run test:dom` focused on a new/updated `projects-page-empty-workspace.test.tsx`.
- **Affected:** `src/components/workshop/projects-page-client.tsx` (render branch near `:3397`), possibly a new `ProjectsEmptyWorkspaceState` component or reuse `src/components/ui/empty-state.tsx`.
- **Status:** blocked by `OPEN-DEC-01` (copy/visual confirmation) — recommended default provided; implementation can proceed with the recommended copy and swap on confirmation.

### FR-02 (P0) Project-dashboard first-estimate nudge
- **Statement:** When `estimateCount===0` and `canEditProject`, the Dashboard renders a compact nudge that links to the Estimates tab and offers "Start your first estimate". Read-only viewers (`canEditProject===false`) see an informational empty line instead of a CTA.
- **Rationale:** Dashboard gives no next step for an empty project (GAP-2).
- **Source:** brief ("project and estimate progression") + repo evidence.
- **Acceptance criteria:**
  - AC-02a: `ProjectEstimateSummaryPanel` (or adjacent) renders a link to `/workshop/projects/${projectId}/estimates` when `estimateCount===0 && canEditProject`.
  - AC-02b: The link/CTA is keyboard-focusable and announced as navigating to Estimates.
  - AC-02c: When `canEditProject===false`, no create CTA is rendered (only descriptive "No estimate sheets yet").
- **Validation:** update `tests/vitest/project-dashboard-client.test.tsx`.
- **Affected:** `src/components/workshop/ProjectDashboardClient.tsx` (`ProjectEstimateSummaryPanel` `:179-234`).
- **Status:** ready.

### FR-03 (P0) Prominent estimates-table empty state
- **Statement:** When a project has zero estimates, the estimates surface shows a prominent empty state (reusing the `EmptyState` primitive) with a primary "Create Estimate" CTA and an explanatory line — instead of relying solely on the tiny inline input in the first filler row.
- **Rationale:** Current empty state is a subtle unlabeled inline input; `emptyMessage` never shown (GAP-3).
- **Source:** brief ("empty estimate tables… may not clearly guide first users").
- **Acceptance criteria:**
  - AC-03a: With `estimates.length===0` and `canCreateEstimates`, a prominent empty state renders with `data-estimates-empty-state` and a "Create Estimate" button that calls `handleCreateEstimateSheet()`.
  - AC-03b: With `estimates.length===0` and `!canCreateEstimates`, the empty state renders without the create CTA (read-only message).
  - AC-03c: When `estimates.length>0`, the prominent empty state does not render; the table behaves as today.
  - AC-03d: The inline `ProjectEstimateBlankNameCreateCell` may remain as a power-user affordance but is not the sole empty cue.
- **Validation:** new/updated `tests/vitest/project-estimates-empty-state.test.tsx`.
- **Affected:** `src/components/workshop/ProjectEstimatesClient.tsx` + `ProjectEstimatesTable.tsx` (the `showEmptyMessage` hardcode at `:1123` and the render branch).
- **Status:** ready.

### FR-04 (P1) Estimate empty-state template chooser (optional)
- **Statement:** The estimate empty-tab state (currently "Add Area" + "Browse templates") additionally offers an **optional template chooser** so a user can seed the first area from a template in one action, without changing the default-empty behavior for users who skip it.
- **Rationale:** A brand-new estimate starts completely empty (GAP-4); templates exist but are only insertable post-navigation.
- **Source:** brief ("estimate template choices").
- **Acceptance criteria:**
  - AC-04a: In the empty-tab state (`estimateTree.length===0`), editors see template affordances alongside "Add Area".
  - AC-04b: Choosing a template uses the existing `insertEstimateTemplateIntoEstimate` path (no new server contract).
  - AC-04c: Skipping the chooser and clicking "Add Area" behaves exactly as today.
  - AC-04d: Read-only viewers see neither chooser nor "Add Area".
- **Validation:** update `tests/vitest/estimate-empty-tab-state.test.tsx`.
- **Affected:** `src/components/workshop/EstimateSheetContent.tsx` (`:2746-2777`); `src/components/workshop/estimate-sheet/use-estimate-template-insertion.ts`.
- **Status:** blocked by `OPEN-DEC-02` (product direction: add chooser at creation time vs. empty-state only). Recommended: empty-state-only chooser (no `createEstimateWithDefaultTab` change).

### FR-05 (P0) Consistent project-open landing route
- **Statement:** The project card open link and the sidebar favorite link both land on the **Dashboard** (`/workshop/projects/${id}`), unless an owner decision selects Estimates for both. Remove the current mismatch.
- **Rationale:** Sidebar-favorite opens Estimates; card opens Dashboard (GAP-5). Inconsistent start destination.
- **Source:** repo evidence.
- **Acceptance criteria:**
  - AC-05a: The sidebar favorite project `href` equals `/workshop/projects/${projectId}` (Dashboard), matching `LiveProjectCard` `projectHref`.
  - AC-05b: A test asserts both surfaces produce the same href.
- **Validation:** update `tests/vitest/main-sidebar-favorites.test.tsx` + `projects-page-card-layout.test.tsx`.
- **Affected:** `src/components/workshop/projects-page-client.tsx` (`:2854`); confirm `src/components/sidebar/MainSidebar.tsx` favorite href source.
- **Status:** blocked by `OPEN-DEC-03` (owner pick Dashboard vs Estimates). Recommended: Dashboard for both.

### FR-06 (P1) Activation-funnel analytics events
- **Statement:** Emit a minimal set of activation events at start surfaces: `project_created` (first project per workspace), `estimate_started` (first estimate per project), `estimate_first_area_added`, `estimate_first_row_added`. Events carry no PII (no names/clients); only ids + booleans + counts.
- **Rationale:** No evidence of successful start today (GAP-6).
- **Source:** brief ("analytics/evidence of successful start").
- **Acceptance criteria:**
  - AC-06a: Each event is emitted through the existing telemetry helper surface (no new SDK).
  - AC-06b: "first X" semantics computed server-side or via counts (e.g. `countProjectEstimateSheetsForProject===0` before create) to avoid stale client state.
  - AC-06c: Events contain no project/estimate/client names; redaction verified by a test.
- **Validation:** new `tests/vitest/start-path-activation-events.test.ts` (unit) + update estimate handler tests.
- **Affected:** `src/components/workshop/NewProjectForm.tsx`; `src/components/workshop/ProjectEstimatesClient.tsx`; `src/components/workshop/estimate-sheet/use-estimate-row-handlers.ts`; telemetry helper.
- **Status:** ready (SDK choice deferred to sibling plan — this plan only names the events + redaction).

### FR-07 (P0) Preserve auto-seeded first estimate
- **Statement:** The existing behavior where `NewProjectForm` calls `createEstimateSheetDraft(project.id)` (`:335`) to seed one empty estimate is preserved and documented. If it fails, the user is still able to create the first estimate manually from the estimates empty state (FR-03).
- **Rationale:** First users should not have to create a project *and* manually create its first estimate (ASSUMP-03).
- **Acceptance criteria:**
  - AC-07a: After successful project create, the project has exactly one estimate (the seeded draft).
  - AC-07b: If `createEstimateSheetDraft` fails inside `NewProjectForm`, the project still creates and FR-03's empty state is reachable.
- **Validation:** `tests/vitest/new-project-form-validation.test.tsx` + `projects-page-create-optimistic.test.tsx`.
- **Status:** ready.

### FR-08 (P2) Document project metadata needs at creation
- **Statement:** Document (in plan + a code comment) which `NewProjectForm` fields are required vs optional vs auto-defaulted, and that the auto-seeded estimate inherits `currency_code` from the project. No field additions unless `OPEN-DEC-01` expands scope.
- **Rationale:** brief ("project metadata needs").
- **Status:** ready (doc-only).

## UX — UX requirements

### UX-01 (P0) Dense, non-decorative empty states
- **Statement:** All new empty states use the tiny app-scale typography (`app-body`/`app-label`), the shared `EmptyState` primitive where it fits, and avoid marketing-hero styling.
- **Source:** PROMPT constraint ("avoid decorative onboarding") + DESIGN.md.
- **AC:** Empty states pass `bun run lint:design-system` (no banned font sizes/patterns).

### UX-02 (P1) Repeated-workflow speed preserved
- **Statement:** A returning estimator with existing projects/estimates sees no new gating, wizard, or forced nudge. Empty states only render when the relevant collection is empty.
- **AC:** With `projects.length>0`, no zero-workspace state renders; with `estimateCount>0`, no first-estimate nudge/empty state renders.

### UX-03 (P0) Clear primary CTA hierarchy
- **Statement:** Each start surface has exactly one primary CTA (brand variant); secondary actions are outlined/quiet.
- **Source:** DESIGN.md ("strong neutral primary CTAs and outlined secondary").

## A11Y — Accessibility requirements

### A11Y-01 (P0) Empty states are keyboard-operable and announced
- **AC:** Every empty-state CTA is a real `<button>`/`<a>`, focusable in DOM order, with an accessible name; empty-state region is labeled (e.g. `aria-label` or heading).
### A11Y-02 (P0) No new keyboard traps
- **AC:** Focus can enter and leave empty-state CTAs via Tab/Shift+Tab; modals (`NewProjectModal`) restore focus on close (existing behavior preserved).
### A11Y-03 (P1) Non-color cues + reduced motion
- **AC:** Empty-state affordances rely on text/icons, not color alone; any motion respects `prefers-reduced-motion`.

## ARCH — Architecture requirements

### ARCH-01 (P0) No new server round-trips for empty states
- **AC:** Empty states derive from data already fetched by the route (projects list prop, `estimateCount`, `estimates` array). Verified by `perf/projects-page-rpc-contract.test.ts` staying green.
### ARCH-02 (P0) Reuse existing mutation/action contracts
- **AC:** No new server actions; FR-01 uses the existing modal-open dispatch; FR-03/04 use `createEstimateSheetDraft` / `insertEstimateTemplateIntoEstimate`.
### ARCH-03 (P1) Empty-state components lazy where they add bundle
- **AC:** Any non-trivial new empty-state component imported only where needed; the projects-page render baseline (`perf/projects-page-render-baseline.test.tsx`) does not regress.

## DATA — Data requirements

### DATA-01 (P0) No schema changes for IA
- **AC:** No migration is added or modified by this plan. (Precondition noted: base `projects`/`estimates` DDL is not in `migrations/`.)
### DATA-02 (P0) Workspace scoping preserved
- **AC:** Start mutations continue to pass through `ensureDefaultWorkspace` / `getCurrentWorkspaceProject` / `assertCanEditProject`. No cross-tenant path is introduced.

## SEC — Security requirements

### SEC-01 (P0) No new trust boundaries or public surfaces
- **AC:** All start CTAs remain behind `/workshop` auth; no new public route.
### SEC-02 (P0) Analytics redact PII
- **AC:** FR-06 events contain no project/estimate/client names (redaction test).

## PERF — Performance requirements

### PERF-01 (P0) Projects-page render baseline preserved
- **AC:** `tests/vitest/perf/projects-page-render-baseline.test.tsx` passes; no increase in cold render count from the zero-workspace state.
### PERF-02 (P0) RPC contract preserved
- **AC:** `tests/vitest/perf/projects-page-rpc-contract.test.ts` passes; no new server round-trips.

## REL — Reliability requirements

### REL-01 (P1) Empty states degrade gracefully on partial data
- **AC:** If a route receives partial data (e.g. `estimateCount` present but `recentEstimateSheets` empty), the empty state still renders correctly without throwing.

## TEST — Testing requirements

### TEST-01 (P0) DOM tests for every new empty state + CTA
- **AC:** New/updated test files (see `12_TEST_AND_VALIDATION_STRATEGY.md`) cover FR-01/02/03/04/05/06.

## DOC — Documentation requirements

### DOC-01 (P2) Update current-state on implementation
- **AC:** When implemented, `.ai/10_state/current-state.md` gains a FAST PATH entry for the start-path IA.

## Shadow-Path Matrices

### Project create (`createProjectRecord`)
| Flow | Happy | Nil/missing input | Empty input/result | Invalid input | Auth denied | Upstream/network error | Concurrency/race | Retry/idempotency | User-visible result | Test |
|---|---|---|---|---|---|---|---|---|---|---|
| createProjectRecord | name+fields → row | name missing → client blocks "Add a project name…" (`NewProjectForm.tsx:266`) | n/a | bad currency normalized | no session → proxy redirects /login | D1 error → optimistic row removed + toast (`:342-355`) | double-submit → optimistic dedupe by clientId | clientId dedupe | card with error badge or toast | `projects-page-create-optimistic.test.tsx`, `new-project-form-validation.test.tsx` |

### Estimate create (`createEstimateSheetDraft`)
| Flow | Happy | Nil/missing input | Empty input/result | Invalid input | Auth denied | Upstream/network error | Concurrency/race | Retry/idempotency | User-visible result | Test |
|---|---|---|---|---|---|---|---|---|---|---|
| createEstimateSheetDraft | → seeded empty estimate | no name → server defaults `${sheetCode} Estimate` | firstNodeId:null → estimate-id URL | bad projectId → notFound | !canEditProject → CTA disabled + action asserts | rollback optimistic row | ES-### code race → `generateNextEstimateSheetCode` dedupes | rollback then retry | placeholder row rolled back | `estimate-sheet-create-empty-tree.test`, `estimate-mutations.test.ts` |

### Template insert (`insertEstimateTemplateIntoEstimate`)
| Flow | Happy | Nil/missing input | Empty input/result | Invalid input | Auth denied | Upstream/network error | Concurrency/race | Retry/idempotency | User-visible result | Test |
|---|---|---|---|---|---|---|---|---|---|---|
| insert template | clones nodes into tree | missing templateId → no-op | empty template → no nodes added | cross-project template → scoped out | !canEditProject → action asserts | optimistic rollback | reorder during insert → tree revision guard | rollback + retry | tree unchanged / toast | `estimate-mutations.test.ts` (extend) |

### Row insert (`insertEstimateRowItemFromLibrary`)
| Flow | Happy | Nil/missing input | Empty input/result | Invalid input | Auth denied | Upstream/network error | Concurrency/race | Retry/idempotency | User-visible result | Test |
|---|---|---|---|---|---|---|---|---|---|---|
| insert row (express) | express row added | blank template fields → empty editable row | qty default 1, cost 0 | cross-estimate nodeId → scoped out | !canEditEstimate → cell disabled | offline → queued, save state "failed" | revision conflict → `ESTIMATE_ROW_REVISION_CONFLICT_CODE` | enqueue+replay | save-state badge | `estimate-mutations.test.ts` |

# 11 — Implementation Plan

Execution guide for the future implementation AI. Phases are dependency-aware. Each phase carries a durable-goal contract (per directive §4A). Phases marked `BLOCKED-EXTERNAL` are isolated behind an owner decision and must not block the implementation-ready phases.

**Plan profile:** exhaustive. **Readiness:** `CONDITIONALLY READY` — Phases 1–6 + 8 are implementation-ready; Phase 7 (sample data) is `BLOCKED-EXTERNAL` on OPEN-DEC-01; the analytics-SDK upgrade (Phase 9, optional) is `BLOCKED-EXTERNAL` on OPEN-DEC-02.

---

## Phase 0 — Foundation (migration + milestone repository + events module)

**Objective:** Create the data + server-only modules every later phase depends on.
**Requirements addressed:** DATA-001, DATA-002, ARCH-001, SEC-001.
**Prerequisites:** none.
**Dependencies:** none (this is the root).

### Task T0.1 — Migration `0039_workspace_activation_milestones.sql`
- **Objective:** Create the `workspace_activation_milestones` table per `07_…` §7.2.
- **Why:** Durable milestone storage; single source of truth for rung completion.
- **Target file (new):** `migrations/0039_workspace_activation_milestones.sql`
- **Symbols/contract:** `CREATE TABLE IF NOT EXISTS workspace_activation_milestones (workspace_id TEXT PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE, first_project_created_at INTEGER, first_estimate_created_at INTEGER, first_area_created_at INTEGER, first_template_inserted_at INTEGER, first_line_item_created_at INTEGER, first_publication_created_at INTEGER, welcome_dismissed_at INTEGER, sample_opted_in_at INTEGER, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL);`
- **Inputs/dependencies:** must order after `0038_*` (it does, numerically). FK target `workspaces(id)` exists since `0007`.
- **Implementation instructions:** Single `CREATE TABLE`. Add a `CREATE INDEX` only if a non-PK access pattern emerges (none expected). Include a comment header citing this plan.
- **Expected output:** Table exists; `PRAGMA table_info(workspace_activation_milestones);` returns the columns.
- **Failure cases:** FK target missing (not expected — `0007` is applied); duplicate run (guarded by `IF NOT EXISTS`).
- **Tests to add:** `tests/vitest/workspace-activation-milestones-migration.test.ts` — assert schema columns + FK + idempotent re-run.
- **Validation:** `bunx vitest run tests/vitest/workspace-activation-milestones-migration.test.ts --maxWorkers=1`; `bun run cf:d1-restore-rehearsal` unchanged.
- **Completion evidence:** Migration applies cleanly on a fresh local D1; table_info matches.
- **Parallelization:** Sequential root — nothing else can start until the repo + events modules exist, but the migration file itself can be authored in parallel with T0.2/T0.3.
- **Complexity:** Small.

### Task T0.2 — Milestone repository `src/lib/activation/milestones.ts`
- **Objective:** Server-only `getMilestones(workspaceId)`, `markMilestone(workspaceId, column)`, `ensureMilestonesWorkspaceRow(workspaceId)`, `dismissWelcome(workspaceId)`.
- **Why:** Single idempotent, authz-respecting entry point for milestone reads/writes.
- **Target file (new):** `src/lib/activation/milestones.ts`
- **Symbols/contract:** All functions take an authorized `workspaceId` derived from session context (never client input).
- **`markMilestone` return contract (decided — closes the `milestone_first` race):** `markMilestone` returns `Promise<{ stampedNow: boolean }>` where `stampedNow === true` iff **this call** was the one that set the column from null to a timestamp. The action uses this return value as the event's `milestone_first` flag. The D1 mechanism is a `RETURNING`-based upsert:
  - `INSERT INTO workspace_activation_milestones (workspace_id, <col>, created_at, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(workspace_id) DO UPDATE SET <col> = COALESCE(<col>, excluded.<col>), updated_at = COALESCE(<col>, excluded.updated_at) WHERE workspace_activation_milestones.<col> IS NULL RETURNING changes() AS changed` — when `changed > 0`, `stampedNow = true`; else `false`. If D1's driver exposes `RETURNING`, read the returned `<col>` and compare to the incoming timestamp (equal → `stampedNow = true`). The fallback if `RETURNING` is unavailable: read `<col>` before the upsert (cheap single-column PK read); if it was null before and the upsert succeeds, `stampedNow = true`. The read-then-write window is acceptable because COALESCE guarantees only one stamp survives; at worst two concurrent callers both emit `milestone_first=true`, which downstream dedupes by `(workspace_id, event_type, milestone_first=true)` keeping the earliest `ts`. Pick the `RETURNING` path if available; document which was used.
  - `ensureMilestonesWorkspaceRow` reconciles missing columns from earliest `created_at` of the corresponding table (§7.7), best-effort + logged; returns the reconciled snapshot.
- **Inputs/dependencies:** D1 binding via existing repository pattern (`src/lib/repositories/*`).
- **Implementation instructions:** Mirror existing repository helpers' D1 access pattern; wrap all writes in try/catch that **logs and continues** (returns `{ stampedNow: false }` on error, never throws to the caller). Export a typed `ActivationMilestones` type.
- **Expected output:** Module exports + types; unit tests pass.
- **Failure cases:** D1 error → caught + logged, returns `{ stampedNow: false }` / null snapshot.
- **Tests to add:** `tests/vitest/activation-milestones-repository.test.ts` — idempotent stamp (two sequential calls: first `stampedNow=true`, second `stampedNow=false`); concurrency (parallel calls → exactly one `stampedNow=true`, one surviving timestamp); reconciliation backfill; authz (workspace-scoped).
- **Validation:** `bunx vitest run tests/vitest/activation-milestones-repository.test.ts --maxWorkers=1`.
- **Completion evidence:** Tests green; module server-only (no client import path).
- **Parallelization:** Can be authored in parallel with T0.1/T0.3.
- **Complexity:** Medium.

### Task T0.3 — Events module `src/lib/activation/events.ts`
- **Objective:** Typed `emitActivationEvent(payload)` writing to the observability logger with redaction.
- **Why:** Single funnel event schema; no third-party SDK; mirrors `estimate-mutation-telemetry.ts` pattern.
- **Target file (new):** `src/lib/activation/events.ts`
- **Symbols/contract:** `type ActivationEventType = "project_created" | "estimate_created" | "area_created" | "template_inserted" | "line_item_created" | "publication_created" | "welcome_shown" | "welcome_dismissed";` payload = `{workspace_id, user_id, event_type, milestone_first: boolean, source: ActivationEventSource | null, ts: number}`. Non-throwing.
- **Implementation instructions:** Use `src/lib/observability/logger` + `redact`. Validate `source` enum server-side. Schema-reject unknown fields.
- **Expected output:** Module exports; schema unit test.
- **Failure cases:** Logger failure → caught + swallowed (events must never break mutations).
- **Tests to add:** `tests/vitest/activation-events.test.ts` — schema accepts valid, rejects unknown; redaction applies; non-throwing on logger error.
- **Validation:** `bunx vitest run tests/vitest/activation-events.test.ts --maxWorkers=1`.
- **Completion evidence:** Tests green.
- **Parallelization:** Parallel with T0.1/T0.2.
- **Complexity:** Small.

**Phase 0 durable-goal contract:** Goal ID `ACT-P0`. Objective: foundation modules. Scope: T0.1–T0.3. Requirements: DATA-001, DATA-002, ARCH-001, SEC-001. Required evidence: migration test + repo test + events test green. Completion audit: migration applies; repo idempotent; events non-throwing + redacted. Checkpoint artifacts: the three test files. Stop condition: all three modules exist + tests green. Blocker condition: D1 FK mismatch. Review gate: type-check + targeted vitest. QA gate: integration in Phase 1+.

**Phase 0 exit criteria:** Migration applied; `src/lib/activation/{milestones,events}.ts` exist and tested; no client imports them.

---

## Phase 1 — Server-Action activation hooks (the funnel instruments)

**Objective:** Wire emit + idempotent milestone into the five rung mutations + workspace provisioning.
**Requirements addressed:** FR-004, FR-005, FR-007, FR-009, FR-012, SEC-T2, SEC-T4.
**Prerequisites:** Phase 0.

### T1.1 — `ensureDefaultWorkspace` seeds row 0
- **Target file:** `src/lib/repositories/workspace-repository.ts` (`ensureDefaultWorkspace`, ~L1373–1439).
- **Change:** After inserting the new workspace + `workspace_members` owner row, call `ensureMilestonesWorkspaceRow(newWorkspaceId)` (creates the milestone row with nulls). Best-effort + logged.
- **Tests:** extend an existing workspace-provisioning test to assert the milestone row is created.
- **Complexity:** Small. **Parallelization:** Sequential after T0.2 (depends on repo API).

### T1.2 — `createProjectRecord` emit + milestone
- **Target file:** `src/lib/projects/actions.ts:774` `createProjectRecord`.
- **Change:** After successful insert, `markMilestone(workspaceId, "first_project_created_at")` (idempotent) + `emitActivationEvent({event_type:"project_created", milestone_first, source})`. Wrap in try/catch. Determine `milestone_first` by checking the pre-stamp value (or rely on COALESCE + a return flag).
- **Note:** `workspaceId` must be derived from the authenticated context, not the form. `source` is best-effort inferred from a form field or header set by the CTA (default null).
- **Complexity:** Small. **Parallelization:** Parallel with T1.3–T1.5 (different files).

### T1.3 — `createEstimateSheetDraft` emit + milestone
- **Target file:** `src/lib/estimates/actions.ts:2334` `createEstimateSheetDraft` (exact definition line; an earlier `:2301` anchor referenced a different function and has been corrected).
- **Change:** `markMilestone(workspaceId, "first_estimate_created_at")` + `emitActivationEvent({event_type:"estimate_created", ...})`.
- **Complexity:** Small. **Parallelization:** Parallel.

### T1.4 — Estimate tree mutations emit + milestones
- **Target file:** `src/lib/estimates/actions.ts` — `createEstimateNode`, `insertEstimateTemplateIntoEstimate`, `insertEstimateRowItemFromLibrary`.
- **Change:** Each gains its respective milestone (`first_area_created_at` / `first_template_inserted_at` / `first_line_item_created_at`) + event.
- **"First area" definition (decided, not deferred):** the canonical estimate-node kind set is `EstimateNodeKind` in `src/lib/repositories/workspace-repository.ts:45` and `WORKSHOP_ESTIMATE_NODE_KINDS` at `:366` = exactly `{assembly, lot, structure, level, area, group, general}` — **all seven are structural/organizational kinds**; there is no `line_item`/`row` kind in this set (line items live in `estimate_row_items`, a separate table). Therefore **"first area" = the first `createEstimateNode` call regardless of `kind`** (every node created via this action is an area/structural node). The `first_line_item_created_at` milestone is owned exclusively by `insertEstimateRowItemFromLibrary` (and any other row-item insertion path), not by `createEstimateNode`. This removes the prior "area-ish kinds" ambiguity.
- **Complexity:** Medium (three call sites). **Parallelization:** Same file as T1.3 — serialize with T1.3 to avoid concurrent edits (single owner).

### T1.5 — `createProjectPublication` emit + terminal milestone
- **Target file:** `src/lib/publication/actions.ts:775` `createProjectPublication`.
- **Change:** `markMilestone(workspaceId, "first_publication_created_at")` + `emitActivationEvent({event_type:"publication_created", milestone_first, ...})`.
- **Complexity:** Small. **Parallelization:** Parallel (different file).

**Phase 1 durable-goal contract:** Goal ID `ACT-P1`. Objective: funnel instruments. Scope: T1.1–T1.5. Requirements: FR-004/005/007/009/012. Required evidence: each action test asserts event emit + idempotent milestone. Completion audit: five rung mutations emit + stamp idempotently; core behavior unchanged. Stop condition: all hooks in + non-throwing. Blocker condition: authz context not available in an action (resolve via existing context pattern). Review gate: existing action test suites green. QA gate: Phase 4/6.

**Phase 1 exit criteria:** All five rung actions emit + stamp; existing tests (incl. `estimate-sheet-create-empty-tree.test.ts`, publication tests) green; no action throws due to activation.

---

## Phase 2 — Homebase payload + dashboard wiring (the keystone UX)

**Objective:** Surface the welcome panel on the empty workspace; hide it once the first project exists.
**Requirements addressed:** FR-001, FR-002, UX-001, A11Y-001, ARCH-002, PERF-001.
**Prerequisites:** Phase 0 + Phase 1 (need `activationMilestones` to exist).

### T2.1 — Extend the **active** homebase data path (additive)
- **Target files:**
  - `src/lib/repositories/workspace-repository.ts` — `getWorkshopHomebaseData()` (L1776, public entry) and the **active** implementation `getWorkshopHomebaseDataAppPath()` (L2129). **Do not touch the RPC path**: `getWorkshopHomebaseDataRpcPath()` (L2125) **unconditionally returns `null`** and is gated behind `WORKSHOP_HOMEBASE_SUMMARY_RPC_ENABLED==="1"`, which no env sets; the backing SQL lives in the off-limits `supabase/migrations/20260618184856_workspace_homebase_summary.sql`. Treat the RPC path as dead for this work.
  - `src/lib/repositories/workspace-repository.ts` — extend the `WorkshopHomebaseData` type (L296, field `projects: WorkshopProjectSummary[]` at L298) with `activationMilestones: ActivationMilestones | null` and derived `firstRun: boolean`.
  - `src/components/workshop/dashboard/lib.ts` — extend `WorkshopDashboardData` to carry the new fields through to the dashboard.
- **Change:** Append the milestone read as a **7th entry** to the existing `Promise.all` at `workspace-repository.ts:2140` (currently 6 entries: `projectFavoriteRows`, `estimateFavoriteRows`, `recentProjects`, `projectMembers`, `sheetMembers`, `workspaceMembership`). The read is a single-row `SELECT … FROM workspace_activation_milestones WHERE workspace_id = ?`. Derive `firstRun = (projects.length === 0) && (milestones?.welcome_dismissed_at == null)`. Treat a missing/null milestone row as `firstRun = (projects.length === 0)` **only if** the panel has not been dismissed — since a missing row cannot carry `welcome_dismissed_at`, default `welcome_dismissed_at` to null (panel eligible) when the row is absent. Use the existing `projects` field (not the RPC parser's `recentProjects`) as the project-count source, since the dashboard reads `homebase.projects` (`WorkshopDashboard.tsx:139` `projectCount = homebase.projects.length`).
- **Cache/query contract:** `getWorkshopHomebaseDataAppPath` is a plain uncached `Promise.all` inside the `/workshop` RSC — there is **no** existing cache layer to extend; the milestone read is simply appended in parallel, so the serialized query-budget wave stays one wave and adds one parallel arm. `workshop-dashboard-query-count-script.test.ts` must be updated to assert the new count (the test counts queries, so it must be revised to the post-implementation count, not asserted "unchanged" — see PERF-001 correction in `09_…`).
- **Tests:**
  - **Do not** rely on `workshop-homebase-summary-rpc-contract.test.ts` to prove the app-path change — that test asserts the repository does not call `supabase.rpc("workspace_homebase_summary"…)` and guards the disabled-RPC parser. Leave it green unchanged; it does not own the app-path payload.
  - Add `tests/vitest/workshop-homebase-app-path-activation.test.ts` asserting: empty `projects` + no dismissed milestone → `firstRun=true`; non-empty `projects` → `firstRun=false`; dismissed → `firstRun=false`; missing milestone row → null-safe default.
- **Complexity:** Medium. **Parallelization:** Sequential (single repo/type owner).

### T2.2 — `WorkspaceWelcomePanel.tsx` (new)
- **Target file (new):** `src/components/workshop/dashboard/WorkspaceWelcomePanel.tsx` (`"use client"`).
- **Contract:** Props `{ onOpenNewProject: () => void; onDismiss: () => void; }`. Renders `section[aria-labelledby]` with h2 "Get started with your first project", body copy (UX-001), primary Button "Create your first project" → `onOpenNewProject`, secondary links "Browse starter templates" → `/workshop/library/templates`, dismiss Button "Skip for now" → `onDismiss`. Live-region for the post-creation announcement is on the dashboard, not the panel.
- **Dismiss action:** calls a small Server Action (or reuses an existing pattern) that sets `welcome_dismissed_at`; authz = workspace member.
- **Tests:** `tests/vitest/workspace-welcome-panel.test.tsx` — renders copy + CTAs; dismiss calls handler; keyboard reachable; SR semantics (`section` + `aria-labelledby`).
- **Complexity:** Medium. **Parallelization:** Parallel with T2.1.

### T2.3 — Wire panel into `WorkshopDashboard`
- **Target file:** `src/components/workshop/dashboard/WorkshopDashboard.tsx:126`.
- **Change:** When `firstRun===true`, render `<WorkspaceWelcomePanel>` above the bento. Manage `NewProjectModal` open state at the dashboard level (so `LibraryHubCard`'s "New project" and the panel's CTA share one modal open state). After `router.refresh()` following project creation, `firstRun` becomes false → panel hides → live-region announces "First project created."
- **Tests:** extend `workshop-dashboard-recent-favorites.test.tsx` or add `workshop-dashboard-first-run.test.tsx` — empty homebase renders panel; non-empty hides it; existing list behavior intact.
- **Complexity:** Medium. **Parallelization:** Sequential after T2.1 + T2.2.

### T2.4 — Optional kill switch
- **Target:** env `NEXT_PUBLIC_ACTIVATION_WELCOME_ENABLED` (default true) gates the panel render for rapid beta disablement.
- **Complexity:** Small. **Parallelization:** Parallel with T2.3.

**Phase 2 durable-goal contract:** Goal ID `ACT-P2`. Objective: keystone UX. Scope: T2.1–T2.4. Requirements: FR-001/002, UX-001, A11Y-001, ARCH-002, PERF-001. Required evidence: DOM test (panel shows empty, hides non-empty), payload contract test additive green, perf query-count test unchanged. Completion audit: panel correct + a11y + no new round trip. Stop condition: panel + a11y tests green. Blocker condition: homebase payload contract test breaks (must be additive only). Review gate: query-count test + DOM test. QA gate: Phase 6 e2e.

**Phase 2 exit criteria:** Panel renders/hides correctly; payload additive; query count unchanged; a11y tests green; existing dashboard tests green.

---

## Phase 3 — Projects list zero state

**Objective:** Empty `/workshop/projects` shows a purposeful zero state.
**Requirements addressed:** FR-003.
**Prerequisites:** Phase 1 (events module for CTA consistency).

### T3.1 — Zero-projects `<EmptyState>`
- **Target file:** `src/components/workshop/projects-page-client.tsx:2953`.
- **Change:** When `ownedProjectItems` is empty and no active search, render `<EmptyState>` "No projects yet" / "Create your first project to start estimating." / action Button "Create your first project" → opens the same `NewProjectModal`. Keep the existing search-empty variant for active search.
- **Tests:** `tests/vitest/projects-page-empty-state.test.tsx` — empty non-search → zero state; active search → existing variant.
- **Complexity:** Small. **Parallelization:** Parallel with Phases 4/5 (different files).

**Phase 3 durable-goal contract:** Goal ID `ACT-P3`. Objective: projects zero state. Scope: T3.1. Requirements: FR-003. Evidence: DOM test. Stop condition: zero state renders correctly + search variant preserved.

---

## Phase 4 — Estimate editor connection (extend, don't rebuild)

**Objective:** Ensure the empty-tab affordance stays canonical; fire first-area/template/line-item milestones (already in T1.4).
**Requirements addressed:** FR-008, FR-009.
**Prerequisites:** Phase 1 (T1.4).

### T4.1 — Preserve + lightly augment empty-tab affordance
- **Target:** the empty-tab surface asserted by `tests/vitest/estimate-empty-tab-state.test.tsx`.
- **Change:** No copy change. Optional: a one-time contextual hint above the editor on first estimate view that dismisses on first interaction. Must not regress the existing test.
- **Tests:** existing `estimate-empty-tab-state.test.tsx` stays green; `estimate-sheet-create-empty-tree.test.ts` stays green.
- **Complexity:** Small. **Parallelization:** Sequential (same area as T1.4 — single owner).

**Phase 4 durable-goal contract:** Goal ID `ACT-P4`. Objective: connect first-area/template surface. Scope: T4.1. Requirements: FR-008, FR-009. Evidence: existing empty-tab test green + milestone tests from T1.4. Stop condition: affordance intact + milestones fire.

---

## Phase 5 — Library zero states

**Objective:** Components, templates, and overview get purposeful zero states.
**Requirements addressed:** FR-010.
**Prerequisites:** Phase 1.

### T5.1 — Components zero state
- **Target file:** `LibraryPageClient` (the components list client under `src/components/workshop/library/**`).
- **Change:** Zero-components → `<EmptyState>` "Build your cost library" / action "New component" → `/workshop/library/components?add=component`.
- **Complexity:** Small.

### T5.2 — Templates zero state
- **Target file:** templates list client.
- **Change:** Zero-templates → `<EmptyState>` "No templates yet" / actions "New template" + "Browse starter templates".
- **Complexity:** Small.

### T5.3 — Overview first-run empty state (respect "intentionally cleared")
- **Target file:** `src/components/workshop/library/overview/LibraryOverview.tsx`.
- **Change:** Keep `data-library-overview="empty"` marker. When workspace has zero components AND zero templates, render a first-run `<EmptyState>` ("Start with components or templates") with links. Do **not** re-add cleared overview content.
- **Complexity:** Small.

**Tests:** `tests/vitest/library-empty-states.test.tsx` per surface. **Parallelization:** T5.1/T5.2/T5.3 parallel (different files).

**Phase 5 durable-goal contract:** Goal ID `ACT-P5`. Objective: library zero states. Scope: T5.1–T5.3. Requirements: FR-010. Evidence: DOM tests. Stop condition: three zero states render + overview marker preserved.

---

## Phase 6 — Publisher empty-state connection + terminal rung surfacing

**Objective:** Connect the publisher empty state back up the ladder; confirm terminal rung surfaces the existing export.
**Requirements addressed:** FR-011, FR-012.
**Prerequisites:** Phase 1 (T1.5).

### T6.1 — Ladder-aware publisher empty state
- **Target file:** `src/components/workshop/publisher/PublisherEmptyState.tsx` (`no-publications` variant).
- **Change:** Augment secondary copy: "Open a project, add estimates, then publish a shared proposal link." + secondary link "Go to projects" → `/workshop/projects`.
- **Complexity:** Small. **Parallelization:** Parallel.

**Phase 6 durable-goal contract:** Goal ID `ACT-P6`. Objective: terminal rung connection. Scope: T6.1. Requirements: FR-011, FR-012. Evidence: DOM test on no-publications variant + existing publication tests green. Stop condition: empty state connects to ladder + terminal milestone fires (T1.5).

---

## Phase 7 — Opt-in sample project (BLOCKED-EXTERNAL on OPEN-DEC-01)

**Objective:** If the owner accepts an opt-in starter sample, implement it.
**Requirements addressed:** SEC-002 (conditional).
**Prerequisites:** Owner decision OPEN-DEC-01.

### T7.1 — Sample seed path
- **Status:** `BLOCKED-EXTERNAL`. Options + recommendation in `15_…`. Do not implement until OPEN-DEC-01 is resolved.
- **If accepted:** insert a real `projects` + `estimates` + sample `estimate_nodes`/`estimate_row_items` under the caller's `workspace_id` with `project_members` owner = caller; stamp `sample_opted_in_at`; surface the opt-in on the welcome panel as a secondary action ("Or explore a sample project"). Governed by identical D1 authz (SEC-002). Tests: sample visible only to workspace members; opt-in idempotent.

---

## Phase 8 — E2E first-user path + analytics review

**Objective:** Prove the end-to-end ladder; review the activation event log.
**Requirements addressed:** TEST-001, FR-001..FR-012 (integration).
**Prerequisites:** Phases 0–6.

### T8.1 — E2E spec
- **Target file (new):** `e2e/first-user-activation.spec.ts` (env-gated like `workshop-library-demo-smoke.spec.ts` with `ARCHESTIMATOR_E2E_FIRST_USER=1` + `ARCHESTIMATOR_DEV_AUTH_BYPASS=1`).
- **Steps:** land on `/workshop` empty → welcome panel visible → "Create your first project" → modal → submit → land in estimate editor → empty-tab affordance present → back to `/workshop` → panel hidden → `/workshop/publisher` shows ladder-connected empty state.
- **Complexity:** Medium. **Parallelization:** Sequential (depends on all prior).

### T8.2 — Activation event log review
- **Objective:** Confirm the funnel events appear in the observability log with correct schema + redaction.
- **Complexity:** Small.

**Phase 8 durable-goal contract:** Goal ID `ACT-P8`. Objective: end-to-end proof. Scope: T8.1–T8.2. Requirements: TEST-001 + all FRs integrated. Evidence: e2e spec green (env-gated) + log review. Stop condition: e2e passes + events schema-validated. Blocker condition: browser-only behavior cannot be exercised headlessly (then provide Playwright + manual proof steps).

---

## Phase 9 — Consent-gated analytics SDK upgrade (BLOCKED-EXTERNAL on OPEN-DEC-02, optional)

**Status:** `BLOCKED-EXTERNAL`. Not required for closed beta. If the owner wants a richer analytics sink than server logs, add a consent-gated SDK behind the existing cookie-consent gate, scoped to `/workshop`, with a separate review. Out of scope for this pack's implementation-ready slice.

---

## Cross-phase invariants (every task must preserve)

- No required onboarding intake (FR-001 / `auth-onboarding-guard.test.ts`).
- No tour library added (ARCH-001).
- `EmptyState` primitive reused for all new zero states.
- Activation emits are non-throwing; milestone writes never fail the parent action.
- All milestone/event paths are workspace-scoped + authorized.
- Homebase payload changes are additive optional.
- Query count on `/workshop` unchanged.
- `/workshop/onboarding` stays a redirect.

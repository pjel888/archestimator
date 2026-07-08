# 02 — Feature Brief And Scope

## Source brief (verbatim from PROMPT.md)

> **Goal:** Create an information-architecture plan for starting projects and estimates cleanly from empty, existing, and returning-user states.
>
> **Evidence To Start From:** `projects-page-client.tsx` (project list, creation, empty-state behavior); `ProjectDashboardClient.tsx` and `ProjectEstimatesTable.tsx` (project and estimate progression); empty estimate tables and blank-row behavior may not clearly guide first users; existing plans touch estimate sheet tree and library page UX but not the project-to-estimate start path as a whole.
>
> **Required Plan Pack:** Map user paths, primary CTAs, empty/partial/error states, estimate template choices, project metadata needs, route transitions, tests, and analytics/evidence of successful start.
>
> **Constraints:** Preserve dense operational UI where appropriate. Avoid decorative onboarding that slows repeated estimator workflows.
>
> **Stop Condition:** The pack is complete when a future executor can make project/estimate starts self-evident and measurable.

Authoritative feature brief = the contiguous brief text above the planning directive (no `BEGIN/END FEATURE BRIEF` delimiters present).

## Scope boundaries (derived)

### In scope (IA / start-flow design)

1. **Zero-project empty state** on `/workshop/projects` (first-user / returning-with-no-projects).
2. **Project-with-zero-estimates nudge** on `/workshop/projects/[id]` (Dashboard) — point the user at "start your first estimate".
3. **Prominent estimates-table empty state** on `/workshop/projects/[id]/estimates` (replace/augment the tiny inline input).
4. **Estimate empty-state template choice** on `/workshop/projects/[id]/estimates/[nodeId]` (optional template chooser at first run).
5. **Primary-CTA placement & consistency** across dashboard (`LibraryHubCard`), projects toolbar (`NewProjectModal`), estimates toolbar, and project card open-link.
6. **Route-transition contract** for create → land: where the user lands after creating a project and after creating/starting an estimate.
7. **Sidebar/card href consistency** (Dashboard vs Estimates landing).
8. **Activation-funnel analytics** for a successful start (first project, first estimate, first area, first row).
9. **Tests** for each of the above (DOM/unit).
10. **Project metadata needs at creation** (what `NewProjectForm` collects and what is auto-defaulted) — documented, lightly tightened (e.g. clarify the auto-seeded estimate), not expanded.

### Out of scope (explicitly deferred / owned elsewhere)

| Item | Owner / reason |
|---|---|
| Activation ladder, durable onboarding milestones, sample/demo data, welcome panel, analytics SDK choice | `2026-07-07-first-user-activation-empty-workspace` (CONDITIONALLY READY, readiness 95). This plan defers to it. |
| In-editor estimate tree mechanics, reorder persistence, reorder RPC bug | `2026-07-06-Estimate-Sheet-Tree` (has a live reorder blocker: `reorderEstimateTreeNodes` omits `target_project_id`). |
| Library page UX / templates authoring UI | `2026-06-20-Library-Page-Overall-Improvement` (stub) + library routes. |
| Public→beta trust onboarding (pre-auth) | `2026-07-07-public-to-beta-trust-onboarding-continuity`. |
| Proposal package workflow (downstream of estimates) | `2026-07-07-client-ready-proposal-package-workflow`. |
| D1 schema changes, new migrations | None required for IA; flagged precondition: base `projects`/`estimates` `CREATE TABLE` not in `migrations/` (pre-provisioned). Not changed by this plan. |
| Auth / Better Auth / session gate | Unchanged; `/workshop` landing locked by owner decision. |
| URL-state for projects-list filters / deep-linking to "create project" | Future enhancement; this plan only documents the gap (DEC-04). |
| Joyride / tour onboarding | Superseded by `first-user-activation`; do not execute `2026-06-03-react-joyride-onboarding-implementation-plan`. |

## Boundaries vs sibling: `first-user-activation-empty-workspace`

That sibling owns: the *activation ladder definition*, *durable onboarding milestones*, *sample/demo data policy*, *welcome/empty-workspace panel*, and *analytics SDK decision*. Its phases 0–6 + 8 are implementation-ready; phase 7 (sample data) blocked on its `OPEN-DEC-01`; phase 9 (analytics SDK) on its `OPEN-DEC-02`.

**This plan owns the IA/route/CTA layer that the sibling does not cover holistically:** exact CTA placement, route-transition contracts, the project→estimate start-flow IA, href consistency, and the *minimal* activation-funnel event names (it leaves the SDK choice to the sibling). Where both touch a zero-state (e.g. projects list zero state), this plan provides the **route/CTA/href design** and references the sibling for the *activation messaging/milestones*. Implementation should reconcile both packs before editing shared files (`projects-page-client.tsx`, `LibraryHubCard.tsx`, `EstimateSheetContent.tsx`).

## User states covered

| State | Definition (from `ensureDefaultWorkspace`, `workspace-repository.ts:1385`) | Primary need |
|---|---|---|
| Empty workspace (first user) | No `default_workspace_id`, no membership → branch 3 bootstraps workspace | "How do I start?" — zero-project empty state + single clear CTA |
| Empty workspace (returning, default cleared) | Membership exists, default re-adopted → branch 2 | Same as above if zero projects |
| Existing workspace, project with zero estimates | Project exists (`status` default `ongoing`) but `countProjectEstimateSheetsForProject === 0` | "What do I do with this project?" — dashboard nudge + estimates-table prominent empty state |
| Returning user resuming | `default_workspace_id` set, projects/estimates exist | Resume via `/workshop` homebase (unchanged); this plan must not decorate/slow it |

## Non-goals (restated)

- Do not implement (planning only).
- Do not change schema, auth, provider config, migrations, package manifests.
- Do not create/recommend branches or worktrees.
- Do not re-define activation ladders or sample-data policy.
- Do not over-decorate: empty states must be dense and operational (PROMPT constraint).

## Constraints

- Preserve dense operational UI; tiny app-scale typography (`app-body` 10px, `app-label` 9px) per DESIGN.md.
- Reuse `src/components/ui/empty-state.tsx` primitive where it fits; do not build bespoke empty states that duplicate it.
- Every new client-boundary component must be lazy/dynamic (`ssr: false` only where truly client-only) and not regress the projects-page render baseline.
- No PII (project/estimate names, client names) in analytics events.
- No new server round-trips for empty states (the empty state must be derivable from data already fetched by the route).

## Assumptions

- `ASSUMP-01`: The `/workshop` post-login landing and "no onboarding wizard" decision is stable (locked by sibling plan + owner).
- `ASSUMP-02`: `ProjectStatus` (`ongoing`/`completed`/`archived`) and migration `0039` are stable; this plan does not depend on status changes.
- `ASSUMP-03`: The auto-seeded empty estimate in `NewProjectForm` (calling `createEstimateSheetDraft`) is desired behavior to preserve (the user should not have to create a project *and* manually create its first estimate).
- `ASSUMP-04`: The existing `EmptyState` primitive (`src/components/ui/empty-state.tsx`) is the canonical empty-state surface (DESIGN.md "no duplicated patterns in route files").
- `ASSUMP-05`: Telemetry helpers used by `use-estimate-row-handlers.ts` are the canonical event surface; no new SDK in this plan.

Each assumption is validated against source evidence in `15_DECISIONS_ASSUMPTIONS_AND_ALTERNATIVES.md`.

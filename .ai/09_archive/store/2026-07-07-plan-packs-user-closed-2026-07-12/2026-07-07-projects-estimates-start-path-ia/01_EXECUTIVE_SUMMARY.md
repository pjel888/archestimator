# 01 — Executive Summary

## What this plan is

An information-architecture (IA) plan for the **Projects & Estimates start path** — making it self-evident and measurable for a user to (a) create their first project, (b) start the first estimate under a project, and (c) resume a partial project/estimate. The plan covers primary-CTA placement, user paths, route transitions, empty/partial/error states, estimate template choices, project metadata needs, and analytics/tests for a successful start.

Plan status: **CONDITIONALLY READY**. Most slices are implementation-ready; three product-shape decisions (`OPEN-DEC-01` zero-project empty-state CTA, `OPEN-DEC-02` estimate template chooser at creation time, `OPEN-DEC-03` project-open landing route) are owner decisions whose safe default is recommended but not yet confirmed.

## Problem (current-state, evidence-backed)

The start path works mechanically but is **not self-evident**, especially for a first user. Concrete gaps found in source:

1. **No zero-project empty state.** `projects-page-client.tsx:1960` only treats *filter* emptiness (search/status) as an empty state; a genuinely empty workspace renders an empty grid with just a toolbar "Add projects" button. No "Create your first project" hero/onboarding. (`projects-page-client.tsx:3239-3309`, `1952-1960`)
2. **Dashboard gives no next step for an empty project.** `ProjectDashboardClient.tsx` shows "Estimate Count 0", "No estimate sheets yet", "No estimate sheet" ×3, "No sheet changes yet" — but **no CTA** to create the first estimate and no link to the Estimates tab. A user landing on an empty project dashboard has no obvious path forward.
3. **Estimates-table empty state is a tiny inline input.** `ProjectEstimatesTable.tsx` renders 60 filler rows; the first row's name cell holds an unlabeled inline `<input>` (`ProjectEstimateBlankNameCreateCell`). The `emptyMessage` ("No estimates yet") is effectively never shown because `showEmptyMessage` is hardcoded `false` at the call site (`ProjectEstimatesTable.tsx:1123`). The only prominent CTA is the toolbar "Create Estimate" button.
4. **No estimate template chooser at creation time.** `createEstimateWithDefaultTab` (`lib/estimates/actions.ts:1933`) always returns `{ firstNodeId: null, nodeCount: 0 }` — a brand-new estimate starts completely empty. Templates exist (3 fixtures + D1 `estimate_templates`) but are only insertable *after* navigating into the estimate via the right sidebar / "Browse templates".
5. **Start affordances are inconsistent across surfaces.** No "New project"/"New estimate" CTA in the sidebar (`MainSidebar.tsx`); the dashboard `LibraryHubCard` "New estimate sheet" is **disabled until a project exists**; the sidebar favorite opens the **Estimates list** while the project card opens the **Dashboard** (`projects-page-client.tsx:2854` vs `LiveProjectCard.tsx:255`).
6. **No analytics/evidence of a successful start.** No "first project created", "first estimate started", "first area/row added", or activation-funnel events are instrumented at the start-path surfaces. `use-estimate-row-handlers.ts:740` records `insert_requested` telemetry but with no "first row of estimate" distinction.
7. **No URL state for creation/list filters.** Search, status tab, sort, group-by, selection, modal-open live only in a `useReducer` (+ localStorage for view-mode/group-by). Deep-linking to "create project" or a filtered view is impossible; a refresh resets in-memory UI state (`projects-page-client.tsx:1427`).
8. **Dead code path.** `createProject` (`lib/projects/actions.ts:840`, redirect-to-dashboard variant) is never imported anywhere; the live path is `createProjectRecord` driven optimistically by `NewProjectForm`.

## Intended target state (high level)

- A first user with zero projects sees a clear, dense (non-decorative) "Create your first project" entry on `/workshop/projects`, with a single primary CTA — no wizard gate.
- A project with zero estimates nudges the user to the Estimates tab and surfaces a prominent "Start your first estimate" empty state (with optional template choice) on `/workshop/projects/[id]/estimates`.
- A brand-new estimate offers an explicit, optional template chooser inline in its empty state (in addition to the existing "Add Area" / "Browse templates" buttons), so the first content is faster.
- Returning users resume via the `/workshop` homebase (Favorites / Recent / Continue) — unchanged; this plan does not gate or decorate it.
- Route transitions, CTA placement, and href targets are consistent across dashboard, sidebar, and project card.
- A small set of activation-funnel events make a successful start measurable.

## Major findings

- **UX/UI:** 3 distinct empty-state gaps (zero projects, project-with-zero-estimates, empty estimate) + inconsistent CTA placement + sidebar/card href mismatch.
- **Architecture/IA:** auto-seed of one empty estimate already exists in `NewProjectForm` (`NewProjectForm.tsx:335` calls `createEstimateSheetDraft`) — the plan should clarify/leverage this, not re-invent it. The post-create redirect lands on a node-less estimate URL (`firstNodeId ?? estimate.id`) which is an implicit contract worth making explicit.
- **Data:** No schema changes needed for the IA itself. `ProjectStatus` (`ongoing` default, migration `0039`) and workspace scoping (`ensureDefaultWorkspace`, `workspace-repository.ts:1385`) are already correct for the three start states.
- **Security:** No new trust boundaries, no new public surfaces, no auth changes. Existing `requireAuth` + `assertCanEditProject` gates cover every start mutation. Telemetry must redact (no project/estimate PII in analytics).
- **Performance:** Start-path surfaces are already performance-instrumented (`projects-page-render-baseline`, `projects-page-rpc-contract`). Changes must keep `pref projects-page-render-baseline` within its regression threshold; any new client bundle from an empty-state component must be lazy/dynamic.
- **Blast radius:** ~6 workshop components + their tests. Sibling plans (`first-user-activation`, `Estimate-Sheet-Tree`) de-conflicted.

## Critical decisions (summary)

- **DEC-01:** Keep landing at `/workshop` with no onboarding wizard (owner decision, locked by sibling plan). This plan only improves the *destinations*.
- **DEC-02:** Empty states use the dense operational aesthetic (tiny app-scale type, compact), not marketing hero — per PROMPT constraint and DESIGN.md.
- **DEC-03:** Reuse the existing `EmptyState` primitive (`src/components/ui/empty-state.tsx`) rather than building bespoke empty states per route.
- **DEC-04:** No URL state is added to the *projects list* filters in this plan (out of scope; flagged as future). Creation deep-linking is optional/deferred.
- **DEC-05:** Telemetry events piggyback on the existing telemetry helpers; no new analytics SDK (sibling plan owns the SDK decision).

## Remaining external decisions

- `OPEN-DEC-01`: Zero-project empty-state CTA copy/visual — recommend "Create your first project" inline CTA (owner to confirm copy).
- `OPEN-DEC-02`: Whether to add an **estimate template chooser at creation time** — recommend an *optional* chooser surfaced in the empty estimate state (owner to confirm product direction; it changes `createEstimateWithDefaultTab`).
- `OPEN-DEC-03`: Whether the project card open + sidebar favorite should both land on the Dashboard (recommended) or both on Estimates.

## Remaining implementation blockers

None that are internally irresolvable. The three `OPEN-DEC`s above block only the slices they name; every other task has exact paths and symbols. Implementation must verify current files before editing (shared worktree).

## Stack-contract summary (full: `18_STACK_CONTRACT_AND_PRODUCTION_STANDARDS.md`)

Next.js 16 App Router (Server Components by default; `"use client"` minimized), React 19, Tailwind v4, TanStack Query (estimate tree/queries), Zustand (estimate workspace UI + project estimates list), `router.refresh()` RSC reconciliation for the projects list, Cloudflare D1 (no schema change), Better Auth (`/workshop` gate via proxy + layout). No Server Action may be added without auth + ownership + validation + revalidation. No new client bundle weight without justification.

## Performance evaluator summary (full: `09_PERFORMANCE_RELIABILITY_OBSERVABILITY.md`)

- Projects list baseline: `tests/vitest/perf/projects-page-render-baseline.test.tsx` — regression threshold = current rendered-row budget; new empty-state component must not increase cold render count.
- RPC contract: `tests/vitest/perf/projects-page-rpc-contract.test.ts` — no new server round-trips for the empty state.
- Estimates list: existing optimistic-store reconciliation must stay within current settle time.
- Browser proof: deferred to implementation (planning-only here).

## Test execution matrix summary (full: `12_TEST_AND_VALIDATION_STRATEGY.md`)

~8 new/updated DOM test files covering: zero-project empty state, project-dashboard empty nudge, estimates-table prominent empty state, estimate empty-state template chooser, sidebar/card href consistency, activation-funnel telemetry events. Commands: `bun run test:dom` (focused files), `bun run type-check`, `bun run lint:design-system`.

## Shadow-path coverage summary

Every start mutation (`createProjectRecord`, `createEstimateSheetDraft`, `insertEstimateTemplateIntoEstimate`, `insertEstimateRowItemFromLibrary`) gets a shadow-path row covering happy / nil input / empty result / invalid input / auth-denied / upstream error / concurrency / retry-idempotency. Full matrices in `04_REQUIREMENTS_SPECIFICATION.md`.

## Initial readiness scores

See `17_FINAL_READINESS_REVIEW.md`. Overall planning readiness: ~92 initial → ~96 after revision cycles (same-agent verification caps final at 97 for emulated; this session is same-agent so the practical ceiling is 94 for high-risk, but this is not high-risk, so CONDITIONALLY READY is the honest status).

## Final readiness

**CONDITIONALLY READY.** Slices not blocked by `OPEN-DEC-01/02/03` are implementation-ready. Verification mode: `same-agent`.

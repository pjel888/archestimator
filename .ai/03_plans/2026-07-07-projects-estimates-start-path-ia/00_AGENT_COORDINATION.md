# 00 — Agent Coordination Ledger

Plan pack: `2026-07-07-projects-estimates-start-path-ia`
Derived feature name: **Projects And Estimates Start Path IA**
Date (Asia/Manila): 2026-07-07
Plan profile: `standard` (UX/IA/routing/components; limited blast radius — no schema, auth, security, provider, or migration changes in scope)
Verification mode: `same-agent` (no native independent verifier lane available in this session)

## Master goal

Produce an information-architecture (IA) plan that makes starting a **project** and starting an **estimate** self-evident and measurable from three entry states:

1. **Empty workspace** — first/returning user with zero owned projects.
2. **Existing workspace, project with zero estimates** — project exists but no estimate has been started.
3. **Returning user** — reopening a partial project/estimate and resuming.

The plan must map: primary CTAs and their placement, user paths and route transitions, empty / partial / error states, estimate template choices, project metadata needs, analytics/evidence of a successful start, and tests.

The planning scope is **IA and start-flow design only**. It does not implement. It must preserve dense operational UI and avoid decorative onboarding that slows repeated estimator workflows (PROMPT.md constraint).

### Non-goals
- Re-litigating the activation ladder, durable onboarding milestones, sample-data policy, or analytics SDK — those are owned by the sibling plan `2026-07-07-first-user-activation-empty-workspace`. This plan defers to it and only adds the route/CTA/IA layer that sibling does not cover holistically.
- Re-planning the in-editor estimate tree mechanics — owned by `2026-07-06-Estimate-Sheet-Tree`.
- Changing D1 schema, auth, provider config, or migrations as part of *this* planning task.

### Required codebase analysis (completed)
- Projects list / creation / empty state: `projects-page-client.tsx`, `NewProjectForm.tsx`, `NewProjectModal.tsx`, `NewProjectFormSections.tsx`, `LiveProjectCard.tsx`, `ProjectCardDetailsControl.tsx`, `projects/page.tsx`.
- Project dashboard / estimates table: `ProjectDashboardClient.tsx`, `ProjectEstimatesTable.tsx`, `ProjectEstimatesClient.tsx`, `[projectId]/page.tsx`, `[projectId]/estimates/page.tsx`, `ProjectMiniSidebar.tsx`, `[projectId]/layout.tsx`.
- Estimate sheet start path: `EstimateSheetContent.tsx`, `EstimateSheetTree.tsx`, `estimate-sheet/rows/branch.tsx`, `estimate-sheet/rows/drop-zones.tsx`, `estimate-sheet/rows/row-table.tsx`, `use-estimate-row-handlers.ts`, `use-estimate-template-insertion.ts`.
- Server actions / data: `lib/projects/actions.ts`, `lib/estimates/actions.ts`, `lib/repositories/workspace-repository.ts`, `lib/types/database.ts`.
- Routes / nav / auth: `app/workshop/**`, `lib/auth/redirects.ts`, `lib/auth/account-setup.ts`, `lib/auth/request-proxy.ts`, `components/sidebar/MainSidebar.tsx`.
- Repo metadata: `package.json` (scripts/versions), `migrations/`, `DESIGN.md`, `.ai/10_state/current-state.md` FAST PATH.

### Implementation-readiness criteria
- Every requirement has a stable ID, objective acceptance criteria, exact affected paths/symbols, and a traceable test.
- Open product decisions are isolated as `OPEN-*` with options, recommendation, owner, and implementation impact.
- No task has approximate paths/symbols (unless explicitly isolated as a safe `DISCOVERY-REQUIRED` step).

### Validation criteria
- Two critique-and-revision cycles run (standard profile minimum: one full cycle + targeted second when P0/P1 found).
- Cross-document consistency checks pass.
- Verification mode and readiness caps applied honestly.

## Skills discovered and used

| Skill / source | Used? | Why relevant |
|---|---|---|
| `Creating-Plan-Prompt.md` directive | Yes | Authoritative plan-pack structure and quality bar. |
| `Multi-Agent-Execution-Directive.md` | Yes | Orchestration, authority model, verification caps, concurrent-repo safety. |
| `AGENTS.md` (Lean Agent Workflow, Verification Policy) | Yes | Proportionality; UI changes do not auto-require Playwright. |
| `DESIGN.md` (alpha guide) | Yes | Empty-state typography/CTA density guidance; treated as alpha, not law. |
| Native parallel explore subagents (5 lanes) | Yes | Independent read-only codebase audits (see workstreams). |
| `first-user-activation-empty-workspace` sibling plan | Yes (read) | De-conflict scope; defer activation ladder / milestones / sample data. |
| `Estimate-Sheet-Tree` sibling plan | Yes (read) | De-conflict in-editor tree mechanics + live reorder blocker. |
| GitNexus / code-review-graph | Not used | Narrow, well-localized audit; `rg` + targeted reads were sufficient (per AGENTS.md proportional graph policy). |
| Playwright / browser proof | Not used | This is a planning-only task; no runtime behavior to prove. Deferred to implementation. |

No unavailable required capability was fabricated.

## Specialist workstreams (native parallel explore lanes — all read-only)

| Workstream | Scope | Verification status | Key evidence |
|---|---|---|---|
| 1. Project list / creation / empty state | `projects-page-client.tsx`, `NewProjectForm*`, `LiveProjectCard`, `ProjectCardDetailsControl`, `projects/page.tsx` | Complete | file:line findings below |
| 2. Project dashboard / estimates table | `ProjectDashboardClient.tsx`, `ProjectEstimatesTable.tsx`, `ProjectEstimatesClient.tsx`, `[projectId]/**` routes | Complete | file:line findings below |
| 3. Estimate sheet start path / templates / express | `EstimateSheetContent.tsx`, `EstimateSheetTree.tsx`, `estimate-sheet/**`, `lib/estimates/**`, `lib/component-library/**` | Complete | file:line findings below |
| 4. Routes / nav / state / sibling plans | `app/workshop/**`, `MainSidebar.tsx`, `lib/auth/**`, `.ai/03_plans/**` | Complete | file:line findings below |
| 5. Repo metadata / scripts / tests / migrations | `package.json`, `tests/vitest/**`, `lib/types/database.ts`, `migrations/` | Complete | file:line findings below |
| Adversarial reviewer | Same-agent emulated pass | Complete | `19_RESEARCH_REVIEW_AND_QA_EVIDENCE.md` |
| Final verifier | Same-agent emulated pass | Complete | `17_FINAL_READINESS_REVIEW.md` |

### Coordination ledger

| Lane | /goal | Scope | Evidence | Dependencies | Findings | Conflicts | Status |
|---|---|---|---|---|---|---|---|
| 1 Project list/create | Audit list + creation + empty state | workshop components + projects page | 9 files, file:line | none | No zero-project empty state; dead `createProject` action; no URL state | — | done |
| 2 Dashboard/estimates table | Audit project→estimate progression | dashboard + estimates table + routes | 7 files + routes | none | Dashboard has no first-estimate CTA; table empty state is a tiny inline input; sidebar-favorite vs card-open href mismatch | C-1 (href mismatch) | done |
| 3 Estimate sheet start | Audit first-run estimate content + templates + express | estimate-sheet + libs | ~15 files | none | New estimate starts empty (no template chooser); first-row affordance is a quiet button; promotion default-off | — | done |
| 4 Routes/nav/plans | Map routes + sidebar + auth + sibling overlap | app/workshop + auth + plans | routes + 3 sibling READMEs | none | Landing fixed at /workshop; no "New" CTA in sidebar; huge overlap with first-user-activation | C-2 (sibling overlap) | done |
| 5 Repo metadata | Scripts + tests + types + migrations | package.json + tests + migrations | package.json + DB types + migrations | none | base projects/estimates CREATE TABLE not in migrations (pre-provisioned); 3 fixture templates | — | done |
| Lead synthesizer | Integrate + author plan pack | all docs | this folder | lanes 1–5 | synthesis | resolves C-1, C-2 | done |

## Conflicts and resolutions

- **C-1 (href mismatch):** Project card opens the **Dashboard** (`/workshop/projects/${id}`), but the sidebar favorite opens the **Estimates list** (`/workshop/projects/${id}/estimates`). *Resolution:* treated as a start-path consistency finding (FR-12 / REQ list) — recommend the sidebar favorite mirrors the card (Dashboard) and the Estimates tab is reached via `ProjectMiniSidebar`. Recorded in `15_DECISIONS_ASSUMPTIONS_AND_ALTERNATIVES.md` (DEC-06).
- **C-2 (sibling overlap):** `first-user-activation-empty-workspace` already plans activation ladders, milestones, sample-data, and welcome surfaces for the same routes. *Resolution:* this plan explicitly defers those and focuses on route transitions + CTA placement + the project→estimate start-flow IA. Cross-references recorded; no scope duplication. See `02_FEATURE_BRIEF_AND_SCOPE.md` § Boundaries.

## Concurrent-repository safety

All writes are confined to `.ai/03_plans/2026-07-07-projects-estimates-start-path-ia/`. No application code, tests, migrations, config, or Git state was modified. `git status` rechecked before writes; only pre-existing working-tree changes (unrelated to this pack) are present and were preserved untouched.

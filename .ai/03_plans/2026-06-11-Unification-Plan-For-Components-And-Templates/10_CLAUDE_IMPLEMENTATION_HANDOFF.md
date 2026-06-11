# Claude Implementation Handoff

**Purpose:** Give Claude a compact `/goal` condition that points to this durable implementation brief instead of trying to fit the whole handoff into the goal text.

**Scope:** Implement the unified Library surface described by this plan pack. This is implementation work, not planning-only.

## Copy-Paste Goal

Use this short prompt with Claude:

```text
/goal Implement the Archestimator Library unification end to end. Read and follow `.ai/03_plans/2026-06-11-Unification-Plan-For-Components-And-Templates/10_CLAUDE_IMPLEMENTATION_HANDOFF.md` as the controlling handoff, then execute the referenced plan pack completely. Use /impeccable, /frontend-design or /ce-frontend-design, /ce-work, ultrawork/ulw as applicable. Verify live git state first, preserve unrelated work, and do not touch landing-page work owned by another agent. Stop only when routes, UI, redirects, estimate behavior preservation, tests, Storybook/design checks, browser QA, docs/state sync, and closeout evidence satisfy the handoff.
```

## Operating Constraints

- Work in `/Users/philiplewis/archestimator`.
- Proceed autonomously on safe, reversible local work.
- Ask only before destructive actions, provider writes, production deploys, credential-gated operations, Supabase migrations, or materially changing scope.
- Another agent owns landing-page work. Do not touch `.ai/03_plans/2025-06-11-Landing-Page-Comprehensive-Improvement-Plan/` or landing-page implementation files unless this Library work truly requires it and the conflict is reported first.
- Preserve unrelated dirty or untracked work.
- Trust live repo state over this document if they differ, then update the relevant `.ai` source of truth when implementation changes project reality.

## Required Startup

Before editing, run:

```bash
git status --short --branch
git worktree list
git diff --stat
```

Read these project sources first:

1. `AGENTS.md`
2. `.ai/README.md`
3. `.ai/00_system/ai-folder-canonical-map.md`
4. `.ai/00_system/AGENT_OPERATING_PROTOCOL.md`
5. `.ai/00_system/AGENT_FRAMEWORK_PROTOCOL.md`
6. `.ai/10_state/current-state.md`
7. `.ai/10_state/decisions.md`
8. `DESIGN.md`

Then read this full plan pack:

1. `00_INDEX.md`
2. `01_DESIGN_BRIEF.md`
3. `02_IA_AND_ROUTING.md`
4. `03_SCREEN_SPECS.md`
5. `04_COMPONENT_REUSE_MAP.md`
6. `05_DATA_AND_SERVER_ACTIONS.md`
7. `06_PHASED_IMPLEMENTATION.md`
8. `07_FUTURE_SUPPLIERS_AND_OPEN_QUESTIONS.md`
9. `08_IMPLEMENTATION_HANDBOOK.md`
10. `09_QUALITY_GATES_AND_TRACEABILITY.md`
11. `mockups/README.md`
12. The relevant mockup HTML files and PNG screenshots.

Also read the source audit folders:

- `.ai/03_plans/2026-06-11-Templates-Page-UX-UI-Audit/`
- `.ai/03_plans/2026-06-11-Library-page-ux-and-ui-improvement/`

## Product Outcome

Unify `/workshop/library` and `/workshop/templates` into one Library surface rooted at `/workshop/library`.

Required route behavior:

- `/workshop/library` renders the Library Overview home.
- `/workshop/library/components` renders the Components tab.
- `/workshop/library/templates` renders Templates browse.
- `/workshop/library/templates/[templateId]` renders the Template editor.
- `/workshop/templates` redirects to `/workshop/library/templates`.
- Existing `/workshop/components` redirect behavior remains intact.
- Navigation and affected revalidation paths are updated.

## Design And Component Rules

- Follow `DESIGN.md` app/workshop register: SF Pro, max 12px type, 3px radius, zero letter-spacing, neutral palette, semantic color only.
- Do not introduce new app-orange styling except where an approved legacy surface requires it.
- Check and reuse `src/components/ui/` and Storybook before creating local markup.
- Verify Storybook at `http://localhost:6006/`. Start it or document the blocker if unavailable.
- If shared UI primitives change, add or update stories and run the relevant Storybook checks.

Reuse or extend these existing pieces where applicable:

- `TabStrip`
- `TreePanelHeader`
- `HeaderIconToolbar`
- `SearchInput`
- `ResizableSidePanel`
- `Tree`
- `WorkshopTree`
- `DropdownSelect`
- `DropdownMenu`
- `ActionMenu`
- `BulkActionToolbar`
- `EmptyState`
- `Button`
- `NewComponentForm`
- `NewTemplateModal`
- existing drag state and MIME constants
- `FilterPopover` from `src/components/ui/overlays/popover.tsx`

Do not create a duplicate facet popover; reuse or extend the existing generic `FilterPopover`.

## Implementation Phases

Follow `06_PHASED_IMPLEMENTATION.md` and `08_IMPLEMENTATION_HANDBOOK.md` exactly:

1. Phase 0: routes, nav shell, redirects, path revalidation, shared Library shell.
2. Phase 1: Components tab uplift and inspector behavior.
3. Phase 2: Templates browse.
4. Phase 2.5: Library Overview home.
5. Phase 3: Template editor.
   - 3.0: extract estimate-sheet reusable pieces carefully.
   - 3.1: Template editor read path.
   - 3.2: template node CRUD.
   - 3.3: template row mutations.
   - 3.4: drag/drop.
   - 3.5: composition and sidebar integration.
6. Phase 4: polish, hardening, docs/state sync.

## High-Risk Gates

- Run GitNexus or code-review-graph impact analysis before editing shared symbols. If the index is stale, rebuild/analyze or record the limitation.
- Treat `EstimateSheetContent.tsx` extraction as critical. Add characterization coverage first and keep the estimate page visually and behaviorally identical.
- Treat `HeaderIconToolbar`, template mutations, drag/drop, and `EstimateRightSidebar` re-hosting as high risk.
- Do not run Supabase migrations. This plan is verified as zero-migration unless live evidence proves otherwise and owner approval is explicit.
- Do not perform linked Supabase, provider, or production writes without explicit approval.
- Do not store secrets in the repo or `.ai`.

## Required Verification

Use TDD or characterization tests for changed behavior and refactors.

Run targeted tests plus the applicable checks:

```bash
bun run lint:design-system
bun run validate
bun run storybook:check-components
bun run storybook:check-boundary
bun run storybook:validate
```

Storybook checks are mandatory when changing shared primitives or stories; `storybook:validate` is for broad primitive/story work.

Browser-QA the real app routes on desktop, tablet, and mobile:

- `/workshop/library`
- `/workshop/library/components`
- `/workshop/library/templates`
- `/workshop/library/templates/[templateId]`
- `/workshop/templates` redirect
- `/workshop/components` redirect

Run an adversarial QA pass against:

- `09_QUALITY_GATES_AND_TRACEABILITY.md`
- the Library audit matrix
- the Templates audit matrix
- route, design-system, Storybook, and estimate-behavior preservation requirements

Do not claim completion from tests alone. Capture real browser evidence for user-facing behavior.

## Docs And Closeout

Update `.ai/10_state/current-state.md` and `.ai/10_state/decisions.md` if implementation changes project reality.

Do not use plan docs as a progress log. Only update plan docs when implementation proves a plan fact was wrong or incomplete.

If committing is authorized, batch coherent commits and use the repo Lore Commit Protocol from `AGENTS.md`.

Final report must include:

- changed files summary
- implemented route and UX behavior
- validation commands and outcomes
- browser QA evidence
- docs/state updates
- known risks or not-tested gaps
- clean or dirty worktree state

## Stop Condition

The work is complete only when:

- the unified Library surface is implemented
- all required routes and redirects work
- Components, Templates browse, Overview, and Template editor flows work
- estimate workspace behavior is preserved
- required tests and checks pass, or gaps are explicitly justified
- Storybook/design-system requirements are satisfied
- browser QA evidence exists for the real routes
- `.ai` state is synced where reality changed
- no unresolved high-risk findings remain

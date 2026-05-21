# Intercom + Archestimator v4 UX/UI Improvement Plan

**Date:** 2026-05-17

## Goal

Move Archestimator toward an Intercom-grade SaaS design language while restoring the stronger full-browser workspace architecture from `archestimator-frontend-beta_v4`.

The public landing page and dashboard should feel like Intercom: editorial, spacious, monochrome, precise, product-led, and polished. The authenticated estimating app should not be a centered web form; it should be a full-height productivity workspace with left navigation, a dominant estimate grid, project/area tree, and contextual right-side tools.

## References studied

### External design reference

- `https://www.intercom.com/`
- `.ai/07_design/intercom-design.md`
- `.ai/07_design/intercom.com-design.md`

Key Intercom patterns:

- oversized editorial sans-serif headlines;
- black primary CTA + outlined secondary CTA;
- mostly white/off-white/near-black palette;
- tiny electric-blue precision accents;
- warm off-white section bands;
- large product mockup panels;
- flat surfaces with thin borders instead of shadows;
- botanical/sketch-like monochrome illustrations;
- generous vertical storytelling rhythm.

### Internal product reference

- `.ai/13_research/github-legacy-repos/clones/archestimator-frontend-beta_v4/src/layout/PrivateLayout.tsx`
- `.ai/13_research/github-legacy-repos/clones/archestimator-frontend-beta_v4/src/common/PrivateNavBar.tsx`
- `.ai/13_research/github-legacy-repos/clones/archestimator-frontend-beta_v4/src/modules/projects/ProjectEstimateView.tsx`
- `.ai/13_research/github-legacy-repos/clones/archestimator-frontend-beta_v4/src/modules/projects/projectComponents/estimates/ProjectEstimateTreeNavigator.tsx`
- `.ai/13_research/github-legacy-repos/clones/archestimator-frontend-beta_v4/src/modules/projects/ProjectEstimateSheet/ProjectEstimateSheet.tsx`

Key v4 patterns:

- `h-screen` full-height app shell;
- left persistent private navigation, collapsed around 48px and expanded around 160px;
- project estimate view as horizontal split: tree navigator + estimate sheet;
- project tree navigator collapsible around `w-60` / `w-10`;
- central estimate table as flex-1 workspace;
- spreadsheet/table rows grouped by area, with area hierarchy and child cost rows.

## Current UX problem

The current workspace route visually feels cramped because the primary estimate sheet is inside a centered page composition with stacked form sections.

Observed causes:

- `PageShell` and page conventions bias toward centered page/card layouts.
- `estimate-workspace.tsx` uses `mx-auto max-w-[1500px]` and a two-column layout where the right panel permanently consumes `430px`.
- The estimate grid shares the left column with selected-row controls, move/copy controls, fallback insert controls, and section controls.
- Selected-row editing is below the grid, creating a long-scroll form instead of a contextual inspector.
- There is no persistent dashboard/app sidebar in the authenticated product area.
- Library create/edit fields are always visible in the right panel, competing with library browsing and row editing.

## Design direction

### Public landing page

Adopt Intercom-style landing structure:

1. announcement strip if relevant;
2. compact top navigation;
3. oversized hero headline with intentional line breaks;
4. concise value paragraph;
5. primary black CTA + secondary outlined CTA;
6. large product mockup/illustration panel;
7. proof/logos when real;
8. feature chapters with product visual + short benefit copy;
9. testimonial/proof blocks;
10. final CTA and footer.

### Dashboard and authenticated app

Adopt v4-style full workspace shell but rendered with Intercom-grade polish:

- full viewport app shell: `height: 100dvh`;
- left main sidebar inside dashboard/app;
- top workspace bar with project, status, totals, and actions;
- optional project/area tree rail for estimate routes;
- central estimate grid as the dominant work surface;
- right dock for Library / Row details / Versions / Proposal settings;
- no centered max-width caps on workspace routes.

## Target layout architecture

### Global app shell

- `AppWorkspaceShell`
  - left: `DashboardSidebar`
  - right: vertical app region
    - top: `WorkspaceTopBar`
    - body: route content

Desktop dimensions:

- sidebar collapsed: 56px;
- sidebar expanded: 248px;
- topbar: 56–64px;
- workspace padding: 16–24px;
- no `mx-auto max-w-*` for dense workspace routes.

### Project estimate route

- `ProjectWorkspaceLayout`
  - optional `ProjectTreeRail` at 240px expanded / 48px collapsed;
  - `EstimateGridSurface` flex-1 and min-width protected;
  - `WorkspaceDock` 360–420px open / hidden collapsed.

Desktop proportion rule:

- grid must own the largest area;
- right dock should never permanently make the grid feel secondary;
- selected-row details should live in the dock, not below the grid.

## Implementation slices

### Slice 1 — Design system foundation

Files:

- `DESIGN.md`
- `.ai/07_design/tailwind.theme.json`
- `.ai/07_design/tokens.dtcg.json`
- `src/app/globals.css`
- `src/components/ui/*`

Tasks:

- Apply Intercom-inspired tokens from updated `DESIGN.md`.
- Convert primary buttons to black, secondary buttons to outlined white.
- Reduce border radii and heavy card styling.
- Establish typography utilities for display/headline/body/label/numeric.
- Keep functional status colors for estimating state.

Acceptance:

- `DESIGN.md` lint has 0 errors.
- Existing UI primitives can express Intercom-style CTA/card/input/chip patterns.

### Slice 2 — Public landing page restyle

Files:

- `src/app/page.tsx`
- landing tests under `tests/vitest` and `e2e/home.spec.ts`

Tasks:

- Rebuild landing to follow Intercom section rhythm.
- Add product mockup panel using real Archestimator surfaces.
- Use black primary CTA and outlined secondary CTA.
- Add subtle sketch/crop-mark art direction without paid/external assets.
- Keep copy honest: no fake testimonials or fake logos.

Acceptance:

- Root route feels Intercom-grade but Archestimator-specific.
- CTAs route to `/projects` and workspace entry cleanly.
- Tests updated and passing.

### Slice 3 — Dashboard sidebar and full-browser shell

Files:

- new `src/components/app-shell/*`
- `src/app/projects/page.tsx`
- `src/app/projects/[projectId]/page.tsx`
- `src/components/ui/page-shell.tsx`

Tasks:

- Add persistent left `DashboardSidebar` for authenticated app routes.
- Move `/projects` dashboard into full app shell.
- Keep landing public nav separate from authenticated app shell.
- Add routes/labels for Dashboard, Projects, Cost Library, Proposals, Clients, Templates, Settings.
- Avoid dead links where possible; disabled/future labels may be visually quiet.

Acceptance:

- Dashboard has left sidebar.
- Workspace no longer looks like a centered content card.
- E2E route navigation still passes.

### Slice 4 — Estimate workspace layout migration

Files:

- `src/components/estimate-workspace.tsx`
- grid adapter/components
- selected-row inspector components

Tasks:

- Replace stacked layout with v4-inspired full-height split:
  - left app sidebar;
  - project tree rail;
  - center grid;
  - right dock.
- Move selected-row controls into right dock.
- Keep library browsing in right dock; move create/edit library item into modal/drawer/editor state.
- Keep Versions and Proposal as dock modes/tabs.
- Preserve all current functionality: row select, add blank row, library insert, edit fields, move/copy, revisions, proposal issue.

Acceptance:

- Estimate grid is visually dominant.
- No long selected-row form below grid.
- Right dock can collapse or switch mode.
- Existing unit/DOM/E2E tests pass after updates.

### Slice 5 — Responsive behavior

Tasks:

- Desktop: multi-panel workspace.
- Laptop: collapsed global sidebar default, right dock resizable/collapsible.
- Tablet: nav/dock become drawers.
- Mobile: dashboard and proposal preview prioritized; dense grid editing simplified.

Acceptance:

- No horizontal page overflow except intentional grid scroll.
- Grid retains usable width on laptop.
- Primary actions remain visible.

## Risks

- Large layout refactor may touch many tests; split into small PRs.
- Intercom visual language must be adapted, not copied. Use as standard/reference, not direct content clone.
- Paid/licensed fonts like Saans/MediumLL should not be assumed. Inter remains the implementation font unless Philip provides licensed assets.
- Workspace density must stay efficient; do not turn estimate editing into a spacious marketing page.

## Definition of done

- `DESIGN.md` is the active design source of truth.
- Public landing/dashboard are Intercom-inspired.
- Authenticated app has a left sidebar and full-browser workspace architecture.
- Estimate grid is the primary surface.
- Selected-row controls and library/version/proposal tools are docked contextually.
- Validation gates pass: `bun run validate`, `bun run build`, `bun run test:e2e`, `git diff --check`.

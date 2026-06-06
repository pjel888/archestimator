# Estimate lazy-boundary and virtualization decision — 2026-06-06

Status: **NOT JUSTIFIED FROM LOCAL BASELINE / BROWSER PROFILER PROOF OPEN**.

## Inputs reviewed

- `evidence/2026-06-06-estimate-peak-load-profile.md` / `.json`
  - `project-estimates-table`: 50 project estimates initial render 171.01ms.
  - `estimate-sheet-content`: 200 estimate rows initial render 355.56ms.
  - Existing decision: defer virtualization and broad memoization until browser profiler proves jank.
- `evidence/2026-06-06-estimate-cursor-broadcast-pressure.md` / `.json`
  - A narrow measured cursor-pressure guard is already implemented for pointer broadcasts.

## Workstream 4.2 decision

Do **not** split lazy UI boundaries for activity history modal, row details modal, proposal preview dialog, command palette/right sidebar, or chart-heavy panels from the current evidence.

Reason:

- The available profile is jsdom initial render only, not a Chrome React Profiler trace.
- It does not attribute render cost to a specific modal/sidebar/preview/chart boundary.
- Splitting boundaries without attribution risks loading-state regressions and interaction churn without proven INP benefit.

## Workstream 4.4 decision

Do **not** implement tree virtualization/windowing from the current evidence.

Reason:

- The current estimate-sheet fixture renders 200 row selectors in 355.56ms under jsdom, but does not prove browser jank or identify row rendering as the dominant INP bottleneck.
- Virtualization would touch drag/drop, keyboard navigation, selection, context menus, search, accessibility, and collaboration overlays.
- The plan explicitly says virtualization should happen only after profiler evidence shows tree row render as a bottleneck.

## Reopen conditions

Reopen 4.2 or 4.4 only after a browser React Profiler / Playwright trace / hosted INP investigation identifies a specific bottleneck and includes regression coverage for:

- cost inputs and inline editing;
- version control/activity UI;
- library insert;
- context menu and DnD;
- proposal preview;
- collaboration cursors;
- keyboard navigation and accessibility.

## Guardrail

This artifact is a decision checkpoint, not a performance completion claim. Browser React Profiler and provider INP proof remain open.

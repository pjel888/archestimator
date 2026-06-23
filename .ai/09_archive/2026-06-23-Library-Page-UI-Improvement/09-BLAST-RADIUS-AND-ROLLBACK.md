# 09 - Blast Radius And Rollback

## Blast Radius Summary

This plan is visually broad but behaviorally narrow. Risk stays manageable only if implementation changes surfaces in phases and delays shared primitive edits until Library-local slots prove the target.

## Shared Surface Risk

| Surface | Risk | Mitigation | Rollback |
|---|---|---|---|
| `librarySurfaceClass` | New slots could be wrong or unused | Add slots centrally and use them route by route | Revert slot additions and route class swaps |
| `estimate-surface-variant` | Library changes could alter Estimate Sheet if shared classes move | Do not touch before Phase 5; prefer Library adapter additions over changing Estimate defaults | Revert shared file before route-specific code |
| `app/globals.css` glass classes | CSS selector changes can affect Dashboard/Estimate/Projects | Do not touch in Phase 0; add Library-specific selectors only after local slot proof and review | Revert CSS chunk; keep component behavior |
| `HeaderIconToolbar` | Shared toolbar consumers can regress | Avoid code changes until Phase 5; run header tests | Revert primitive change independently |
| `TreePanelHeader` | Sticky header/tab layout used outside Library | Prefer class props over behavior changes | Revert primitive change independently |
| `TabStrip` | Route tabs across app can change | Keep route semantics unchanged; only tune glass style with tests | Revert styling only |
| `ResizableSidePanel` | Docks/rails across app can shift | Prefer Library wrapper classes | Revert dock class changes |

## Route-State Risk

Do not break:

- `?add=component` and add modal paths.
- Filter/freshness/lifecycle/brand/search query params.
- Components/Templates tab route behavior.
- Template Editor save state.
- Inspector/preview dock open/close and focus return.

Mitigation:

- No action/data changes in visual phases unless a test is added or updated first.
- Keep existing callbacks and query keys.
- Use class-only changes where possible.

## Visual-System Risk

| Risk | Why it matters | Mitigation |
|---|---|---|
| Too much glass | Dense Library data becomes hard to scan | Paper for dense rows, glass only for chrome/rails |
| Dashboard over-copy | Library becomes bento/marketing instead of work surface | Use Dashboard as inspiration only |
| Orange overuse | Create actions lose hierarchy | One primary add action per command area |
| Local card effects | Repeats current mismatch | Flatten cards; depth belongs to pane edges |
| Mobile overflow | Toolbars/tabs are dense | Fixed dimensions, menus/collapse, mobile screenshots |

## Performance Risk

The current Library has prior dense and browser matrix proof. The visual implementation must not:

- Disable virtualization.
- Add per-row expensive effects.
- Add image loads or blur layers to every dense row.
- Change loader/query behavior.
- Broaden TanStack Query invalidation or add new route-level network fetches.

Mitigation:

- Keep dense rows simple.
- Avoid nested `backdrop-blur`.
- Reuse existing virtual flags and tests.
- Prove dense mode with the 5000-row geometry/performance commands in `14-IMPLEMENTATION-RUNBOOK-AND-VISUAL-RALPH-CONTRACT.md` whenever dense visuals change.

## Security, Data, And Network Risk

The visual pass must preserve:

- `getLibraryOverview` and `searchLibraryOverview` server-action boundaries.
- `WORKSPACE_COMPONENT_ROWS_LIBRARY_QUERY_KEY` and `WORKSPACE_ESTIMATE_TEMPLATES_QUERY_KEY`.
- `assertCanManageLibrary`, `requireWorkspaceTemplate`, and template-editor authz gates.
- `/api/component-library/images` and `/api/component-library/attachments` upload route behavior.
- Route-state params for add modals, filters, lifecycle/freshness/search, inspector, preview, and Template Editor.

Mitigation and proof are centralized in `13-SECURITY-DATA-NETWORK-RISK.md`.

## Rollback Strategy By Phase

| Phase | Rollback action |
|---|---|
| 0 Local surface contract | Revert `library-surface-variant.tsx` additions only. |
| 1 Overview | Revert Overview and loading skeleton only. |
| 2 Components | Revert Components class swaps; keep Phase 0 if Templates/Overview need it. |
| 3 Templates | Revert Templates files without touching Components. |
| 4 Template Editor | Revert editor shell class changes only. |
| 5 Shared primitive cleanup | Revert shared primitive commits first if cross-route regression appears. |
| 6 Visual evidence | No code change; update evidence only. |

## Release Gates

- Shared primitive changes require targeted shared tests.
- Browser proof required for route-family visual claim.
- Visual Ralph verdict score `>= 90` required for changed visual surfaces.
- Full `bun run validate` is optional unless shared logic or high-blast-radius primitives change; current project state notes broad validation can be red from unrelated landing/charts/design lint issues.
- No provider, production, or manual proof can be claimed from local-only checks.

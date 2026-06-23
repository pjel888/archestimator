# 00 - Plan

## User Job

Create a comprehensive Library Page UI improvement plan in `.ai/03_plans/2026-06-23-Library-Page-UI-Improvement`.

The plan must:

- Audit the current Library UI and why it feels unlike the rest of the app.
- Study Dashboard, Projects, Estimate Sheet, and Project Dashboard visual patterns.
- Study the liquid-glass system, transparent backgrounds, tabs, and reusable UI components.
- Study `HeaderIconToolbar` usage and explain how the current Library surface is outdated.
- Define a safe, comprehensive visual overhaul plan without changing app code in this pass.
- Rate strategy, quality, and implementation readiness honestly, then close the gaps until the plan pack is ready for handoff.

## Scope

In scope:

- `/workshop/library` overview.
- Library Components manager and its left tree, center sheet, cards, dense mode, toolbar, filters, and inspector dock.
- Library Templates browse and preview dock.
- Template Editor shell and editor chrome, with behavior preserved.
- Shared Library chrome: `LibraryTitleBarClient`, `LibraryTabsLayoutClient`, `LibrarySurfaceVariantProvider`, `librarySurfaceClass`, `TreePanelHeader`, `HeaderIconToolbar`, `ToolbarIconButton`, `TabStrip`, and relevant glass CSS tokens.

Out of scope:

- Supabase schema, migrations, RLS, RPCs, seed data, provider reset, or generated types.
- Library taxonomy, folder semantics, query keys, mutation callbacks, route-state behavior, and dense-mode performance architecture.
- Dashboard, Projects, Estimate Sheet, or Project Dashboard implementation changes except where this plan later proposes a shared primitive cleanup.
- Landing page, auth, public share pages, Project Data, Library-to-Estimate Trust/Governance, and proposal/export surfaces.
- Browser screenshots in this planning pass. Browser proof belongs to the implementation pass because no app UI is changed here.

## Reference Surfaces

| Surface | Use It For | Do Not Copy |
|---|---|---|
| `DESIGN.md` | Compact app UI, grey canvas, paper versus glass, radii, shared primitives, Library dock expectations | Treating the alpha guide as immutable law or overriding Philip's design calls |
| Dashboard | High-level glass, canvas wash, destination-card and Library-hub inspiration | Dashboard-only large display type, broad bento hero, or path-scoped experimental language |
| Projects | Collection layout, transparent canvas, compact filter toolbar, glass cards, skeleton parity | Missing empty-state behavior or project-specific metadata layout |
| Estimate Sheet | Primary Library baseline: glass well, rails, paper center, sticky chrome, dense data discipline | Estimate-only orange add exceptions where they do not belong |
| Project Dashboard | Dense dashboard glass panels and compact sticky subheaders | Project-specific collaboration/publication actions |
| `HeaderIconToolbar` | Shared icon toolbar contract for tree-like panes and action clusters | One-off local toolbar rules |

## Hard Constraints

- Preserve behavior. This is a visual/material/layout plan first.
- Reuse existing primitives before adding new abstractions.
- Prefer `librarySurfaceClass` and `estimate-glass-*` slots over scattered class strings.
- Keep dense data on crisp paper surfaces; use glass for rails, chrome, docks, and outer framing.
- Do not stack blur surfaces. The current design system expects one blurred surface per region.
- Keep typography compact. Avoid dashboard-scale display type in the Library.
- Keep route tabs, title bar, query behavior, cache warming, deep links, and drawer/modal focus behavior.
- No new dependencies.

## Coordination Model

This plan integrates the original four read-only lanes:

- Dashboard/Projects baseline audit.
- Library current-state and visual gap audit.
- Plan-pack structure and QA matrix.
- Estimate Sheet, Project Dashboard, and `HeaderIconToolbar` contract audit.

The leader owns synthesis, conflict resolution, and final verification. Independent review is recorded in `11-ADVERSARIAL-QA-LEDGER.md`.

The final readiness pass added four bounded review lanes: strategy/quality/readiness critique, UX/UI Visual Ralph readiness, verification/test readiness, and technical-risk architecture. Those findings are reconciled in `11-ADVERSARIAL-QA-LEDGER.md` and scored in `12-READINESS-SCORECARD-AND-GAP-CLOSURE.md`.

## Acceptance Summary

The plan is acceptable when:

- `01` through `04` are anchored to source file/line evidence or explicitly marked as planning inference.
- The visual target names what Library should match and what it must intentionally diverge from.
- The gap analysis separates must-fix visual debt from deferred polish.
- The `HeaderIconToolbar` contract is clear enough that an implementer will not invent a Library-only toolbar grammar.
- The roadmap sequences shared primitive risk after Library-local slots are proven.
- The verification matrix defines source-level and browser-level proof boundaries.
- Blast radius and rollback cover shared primitives, not just Library files.
- Security, database, cache, provider, and network boundaries are explicit.
- Open questions are converted to defaults, phase gates, or out-of-scope boundaries before implementation starts.
- Implementation has exact proof commands, route/state selectors, evidence paths, and Visual Ralph pass/fail gates.

## Stop Rule

Stop this planning pass when:

- All docs listed in `README.md` exist.
- Static markdown checks pass.
- Independent review has either passed or produced findings reconciled into the docs.
- The readiness scorecard rates strategy, quality, and implementation readiness at 100% for planning handoff, with evidence links.
- No application code was modified by this pass.

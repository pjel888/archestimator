# Unification Plan — Components + Templates → One Library Page

**Date:** 2026-06-11
**Status:** READY FOR IMPLEMENTATION — direction approved by Philip 2026-06-11 (Overview home in v1; structural template differentiation; composition in Phase 3.5). Q5 is a non-blocking Phase 4 hotkey nicety; Q6 is resolved with no migration required.
**Owner:** Philip
**Scope:** Merge `/workshop/library` (components) and `/workshop/templates` into a single unified Library surface at `/workshop/library`, designed as the future home for Components, Templates, and (later) Supplier catalogues.

## The one-paragraph version

`/workshop/library` becomes the workshop's single "reusable content" home with three file-folder tabs — **Overview** (default landing: cross-library search, recent items, library health line), **Components**, and **Templates** — each a real sub-route. The content tabs use the same workshop grammar as the estimate workspace: navigation tree on the left, work sheet in the center, contextual dock on the right. Opening a template turns the center sheet into an estimate-style editable grid with a Components dock on the right for drag-and-drop, exactly mirroring the estimate page the user already knows. Templates stop being read-only; Components gain the detail inspector the audit said was missing. A fourth tab slot is reserved for Supplier catalogues.

## Documents

| Doc | Contents |
|---|---|
| [01_DESIGN_BRIEF.md](01_DESIGN_BRIEF.md) | Vision, design decisions and their rationale, key states, interaction model |
| [02_IA_AND_ROUTING.md](02_IA_AND_ROUTING.md) | Route structure, redirects, sidebar nav changes, URL contract |
| [03_SCREEN_SPECS.md](03_SCREEN_SPECS.md) | Region-by-region spec for each screen, all states, copy |
| [04_COMPONENT_REUSE_MAP.md](04_COMPONENT_REUSE_MAP.md) | Exact existing components to reuse/extend/retire, with file paths |
| [05_DATA_AND_SERVER_ACTIONS.md](05_DATA_AND_SERVER_ACTIONS.md) | Schema facts, existing + new server actions, query keys, perf gates |
| [06_PHASED_IMPLEMENTATION.md](06_PHASED_IMPLEMENTATION.md) | 5 phases with acceptance criteria and verification steps |
| [07_FUTURE_SUPPLIERS_AND_OPEN_QUESTIONS.md](07_FUTURE_SUPPLIERS_AND_OPEN_QUESTIONS.md) | Supplier-catalogue future, Philip-approval decisions |
| [08_IMPLEMENTATION_HANDBOOK.md](08_IMPLEMENTATION_HANDBOOK.md) | **Read first if you are the implementing agent** — verified ground truth, tooling/constraints, per-phase file-by-file checklists, test inventory |
| [09_QUALITY_GATES_AND_TRACEABILITY.md](09_QUALITY_GATES_AND_TRACEABILITY.md) | Requirement traceability, source-audit closure, Storybook component-review gate, blast-radius matrix, effectivity proof |
| [10_CLAUDE_IMPLEMENTATION_HANDOFF.md](10_CLAUDE_IMPLEMENTATION_HANDOFF.md) | Paste-ready Claude `/goal` handoff plus implementation constraints, verification gates, and closeout requirements |
| [mockups/](mockups/) | 4 high-fidelity HTML mockups + PNG screenshots (1440×900) |

## Mockups

| File | Screen |
|---|---|
| `mockups/00-library-home.html` → `screenshots/00-library-home.png` | Overview home (default landing): cross-library search, recents, health line |
| `mockups/01-components-tab.html` → `screenshots/01-components-tab.png` | Components tab with new detail-inspector dock |
| `mockups/02-templates-browse.html` → `screenshots/02-templates-browse.png` | Templates tab, browse state with gallery + preview dock |
| `mockups/03-template-editor.html` → `screenshots/03-template-editor.png` | Template open in estimate-style editor with Components drag dock |

## Source evidence

This plan synthesizes three inputs (all verified 2026-06-11):

1. `.ai/03_plans/2026-06-11-Library-page-ux-and-ui-improvement/` — 17-doc Library audit (P0–P3 findings, schema verification, a11y criteria)
2. `.ai/03_plans/2026-06-11-Templates-Page-UX-UI-Audit/` — 10-doc Templates audit + screenshots (13 findings, 12 recommendations)
3. `.ai/03_plans/2026-06-11-templates-panel-ux/` — shipped estimate-sidebar templates work (drag payload union, context-menu CRUD, tree icon parity)

Plus a fresh code map of `/workshop/library`, `/workshop/templates`, and the estimate workspace (`EstimateRightSidebar`, `TreePanelHeader`, `TabStrip`, drag infrastructure), and a live reusable UI library check: Storybook at `http://localhost:6006/` returned HTTP 200 on 2026-06-11, with `index.json` exposing 524 entries including the required primitive stories named in `09_QUALITY_GATES_AND_TRACEABILITY.md`.

**Fact verification:** every file path, line number, schema column, and export name cited in docs 02–05 and 08 was independently re-verified against the working tree at commit `8f6f116` (2026-06-11) by three fact-check passes (UI components, data layer, routing/shell). A 2026-06-11 follow-up pass corrected live-library drift: `src/components/ui/overlays/popover.tsx` already exports a generic `FilterPopover`, so the component-facet filter should extend/reuse that primitive rather than create a same-named duplicate. Wrong claims from the source audits were corrected in place — notably: `estimate_template_row_items` already carries full editable row columns (no migration needed anywhere in this plan), ⌘1–⌘4 are display-only labels, and exactly 4 in-repo references to `/workshop/templates` need updating.

## What this plan deliberately does NOT change

- The estimate workspace (`/workshop/projects/.../estimates/...`) — it stays the benchmark, untouched.
- The estimate-sidebar templates panel (recently shipped) — the unified page complements it; both read the same data.
- Database schema — **zero migrations required in any phase** (verified: `estimate_template_row_items` already has all editable columns); Phase 3 adds server actions over existing tables only.
- The global rail (`MainSidebar`) beyond removing the Templates nav entry.

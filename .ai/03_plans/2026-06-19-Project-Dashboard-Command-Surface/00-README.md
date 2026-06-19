# Project Dashboard Command Surface

Date: 2026-06-19
Status: planning draft, awaiting implementation
Route: `/workshop/projects/[projectId]`
Reference project route: `/workshop/projects/22222222-2222-4222-8222-222222222222`

## Exact User Job

Simplify the project dashboard page so it feels like the workshop dashboard and projects page, not a separate white-background form. The page should become a calm project command surface with liquid-glass framing, fewer panels, and four useful project-level modules:

1. Recent estimate sheets, similar to the workshop dashboard.
2. Published share links.
3. Collated activity history across the project's estimate sheets.
4. A free/open map-backed location module where users can pinpoint the exact project location.

## Core Direction

Use one continuous workshop canvas and one compact project desk instead of a grid of decorative cards. The left project detail rail can remain, but the main content should be a restrained workbench:

- recent estimate sheets;
- published share link state and shortcuts;
- compact activity timeline;
- exact project location map/pin module.

Not every zone should be a white div. Glass should frame the command surface; dense data rows can use quiet paper or transparent embedded list treatment when legibility requires it.

## Plan Pack

- `01-PLAN.md` - implementation plan, decisions, phases, acceptance criteria, ADR, and staffing guidance.
- `02-RESEARCH-NOTES.md` - local codebase findings, delegated agent findings, and official map/provider policy research.
- `03-VERIFICATION-MATRIX.md` - planned QA, UltraQA scenarios, browser checks, performance checks, and privacy checks.
- `04-RALPLAN-REVIEW.md` - architect and critic review notes after the sequential review pass.

## Loop Surface

Recommended execution surface: `ultragoal` or agent-neutral durable goal for the implementation, with `ultrawork` lanes when coding splits cleanly:

- UI/layout lane.
- Activity data/RPC/index lane.
- Location/map lane.
- Tests/QA lane.

Use `ultraqa` after implementation for adversarial browser and data-state checks.

## Non-Goals

- Do not build a broad new dashboard system.
- Do not add map/geocoder dependencies until the location phase is explicitly started.
- Do not use public OSM raster tiles as production infrastructure.
- Do not build Nominatim autocomplete or per-keystroke geocoding.
- Do not expose exact project coordinates on public share pages unless a later product decision explicitly adds that behavior.
- Do not replace the estimate-sheet activity-history modal; this plan adds a project-level compact feed.

## Deletion Criteria

If Philip rejects the direction, delete this folder and keep the current source untouched. The plan is intentionally docs-only and should not be treated as implementation evidence.

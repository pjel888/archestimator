# Project Dashboard Command Surface

Date: 2026-06-19
Status: planning-ready pack; Phase 1 may implement, Phase 2/3 are gated
Route: `/workshop/projects/[projectId]`
Reference project route: `/workshop/projects/22222222-2222-4222-8222-222222222222`

## Exact User Job

Simplify the project dashboard page so it feels like the workshop dashboard and projects page, not a separate white-background form. The page should become a calm project command surface with liquid-glass framing, fewer panels, and four useful project-level modules:

1. Recent estimate sheets, similar to the workshop dashboard.
2. Current published share link state and shortcuts.
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
- `05-READINESS-SCORECARD.md` - current 100% planning-readiness closeout and pre/post audit score trace.
- `06-DATA-OWNERSHIP-CONTRACT.md` - callable data-helper ownership, DTOs, cache boundaries, and query budgets.
- `07-UX-STATE-MATRIX.md` - module states, action hierarchy, phased placeholders, material map, and accessibility contract.
- `08-PROJECT-ACTIVITY-CONTRACT.md` - project activity DTO, authorization, redaction, cursor, and content grammar.
- `09-LOCATION-MAP-CSP-PROVIDER-ADR.md` - location privacy/lifecycle, map provider, network, CSP, telemetry, and abuse decisions.
- `10-MIGRATION-RLS-QA-RUNBOOK.md` - database migration, RLS, grants, generated types, and proof runbook.
- `11-TEST-FIXTURES-AND-STOP-CONDITIONS.md` - executable fixture matrix, phase gates, artifacts, and cannot-claim-complete rules.

## Roadmap Fit

This plan is scoped beta UX/workflow polish for one protected project route. It does not close the 2026-06-19 wider-launch blockers tracked in `.ai/03_plans/2026-06-19-Launch-Readiness-Audit/`.

- Phase 1 is a releasable owner-beta UX slice if its targeted route, accessibility, and visual checks pass.
- Phase 2 adds activity data-path and migration work. It is gated by the migration/RLS runbook and must not deepen the active migration-ledger/DR risk.
- Phase 3 adds exact location data and map network surface. It is gated by privacy/lifecycle, CSP/provider, and DSAR/export/delete proof.
- Broad `bun run validate` is not the completion gate for this plan while known unrelated reds remain; targeted phase evidence is the gate.

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
- Do not build a historical multi-publication list in this pass. The dashboard module is the current publication status/shortcut surface; full management stays in `ProjectPublicationHeader`.
- Do not treat the left project identity rail as one of the four main workbench modules.

## Deletion Criteria

If Philip rejects the direction, delete this folder and keep the current source untouched. The plan is intentionally docs-only and should not be treated as implementation evidence.

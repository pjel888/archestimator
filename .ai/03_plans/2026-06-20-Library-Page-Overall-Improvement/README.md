# Library Page Overall Improvement Plan

Date: 2026-06-20
Status: planning and audit pack complete, no app code changed
Primary routes: `/workshop/library`, `/workshop/library/components`, `/workshop/library/templates`, `/workshop/library/templates/[templateId]`

## Goal

Improve the full Library experience, including the overview page, component library, template browser, template editor, and all Library modals, drawers, popovers, context menus, and confirmation flows.

The target experience is a compact source-trust workspace: users can find reusable components and templates quickly, understand whether costs are current and trustworthy, reuse items without losing context, and complete create/edit/destructive actions through one predictable overlay system.

## Start Here

1. Read `00-PLAN.md` for the full implementation strategy.
2. Read `05-IMPLEMENTATION-ROADMAP.md` for ordered work items.
3. Read `03-MODALS-POPOVERS-AND-OVERLAYS.md` before touching any modal, drawer, popover, menu, or prompt.
4. Read `06-QA-AND-VALIDATION-PLAN.md` before implementation to keep verification proportional and targeted.

## Key Conclusions

- Overview search must continue the exact user intent. Component results should open or highlight the selected component in the Components tab, not drop the user into the whole catalogue.
- Component folder create, rename, delete, and Add Component draft discard should move off native `window.prompt` / `window.confirm` and into shared design-system dialogs.
- Trust metadata should be visible wherever a user chooses to reuse a component or template: pricing date, source, supplier, confidence, lifecycle, and stale/source-changed state.
- The Add Component flow is too powerful for a single default modal. It needs a quick-add path and an advanced catalog-record path.
- Template insertion should disclose or allow the exact destination group/area before commit.
- A denser maintenance mode is needed for component library stewardship once beta users manage larger catalogs.

## Evidence Base

This pack is grounded in:

- Source inspection of the Library route family and components.
- Parallel specialist lanes for code mapping, UX critique, external pattern research, and QA inventory.
- Existing project guidance in `DESIGN.md`, `.ai/10_state/decisions.md`, and `.ai/06_specs/current-project-estimates-component-library-spec.md`.
- Accessibility and UX references from W3C APG, NN/g, Baymard, Carbon, MDN, GOV.UK, and Google data-card guidance.
- Graph/index evidence: code-review graph stats were checked and showed the repository indexed with 1,429 files, 16,148 nodes, and 190,581 edges as of 2026-06-19.

## Known Evidence Gaps

- No screenshot or browser proof was captured. This was intentional because the user asked for a planning task, no implementation was made, and the repo guidance treats Playwright/browser automation as opt-in evidence unless a browser-only claim is being proved.
- The Product Design `design-qa` workflow was not a fit for this task because there is no source mockup/prototype to compare against the rendered implementation.
- No tests were run because no application code changed. The validation plan names the focused tests to run during implementation.

## Artifact Map

- `00-PLAN.md` - scope, non-goals, design thesis, acceptance criteria, phase strategy.
- `01-CURRENT-STATE-AUDIT.md` - source-grounded assessment of the current Library page and risks.
- `02-USER-FLOWS-AND-ACTION-PATHS.md` - top Library workflows, current friction, and desired outcomes.
- `03-MODALS-POPOVERS-AND-OVERLAYS.md` - overlay inventory, replacement policy, focus/keyboard requirements.
- `04-UX-RESEARCH-SYNTHESIS.md` - external research and how it applies to Archestimator.
- `05-IMPLEMENTATION-ROADMAP.md` - ordered implementation tasks with expected file areas.
- `06-QA-AND-VALIDATION-PLAN.md` - targeted test matrix and browser-proof criteria.
- `07-AGENT-LEDGER.md` - skills, subagents, sources, and routing decisions used to produce this pack.

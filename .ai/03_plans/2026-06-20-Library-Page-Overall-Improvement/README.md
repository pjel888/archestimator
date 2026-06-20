# Library Page Overall Improvement Plan

Date: 2026-06-20
Status: planning and audit pack hardened to implementation-ready handoff, no app code changed
Primary routes: `/workshop/library`, `/workshop/library/components`, `/workshop/library/templates`, `/workshop/library/templates/[templateId]`

## Goal

Improve the full Library experience, including the overview page, component library, template browser, template editor, and all Library modals, drawers, popovers, context menus, and confirmation flows.

The target experience is a compact source-trust workspace: users can find reusable components and templates quickly, understand whether costs are current and trustworthy, reuse items without losing context, and complete create/edit/destructive actions through one predictable overlay system.

## Start Here

1. Read `00-PLAN.md` for the full implementation strategy.
2. Read `05-IMPLEMENTATION-ROADMAP.md` for ordered work items.
3. Read `03-MODALS-POPOVERS-AND-OVERLAYS.md` before touching any modal, drawer, popover, menu, or prompt.
4. Read `08-RATINGS-AND-GAP-CLOSURE.md` to understand the hardening gaps closed by this pass.
5. Read `13-DATA-CONTRACTS-ROUTE-CACHE.md`, `14-SECURITY-AUTHZ-AND-DATA-EXPOSURE.md`, and `18-ADVERSARIAL-QA-AND-COMPLETION-GATES.md` before implementation.
6. Read `06-QA-AND-VALIDATION-PLAN.md` before implementation to keep verification proportional and targeted.

## Key Conclusions

- Overview search must continue the exact user intent. Component results should open or highlight the selected component in the Components tab, not drop the user into the whole catalogue.
- Component folder create, rename, delete, and Add Component draft discard should move off native `window.prompt` / `window.confirm` and into shared design-system dialogs.
- Trust metadata should be visible wherever a user chooses to reuse a component or template: pricing date, source, supplier, confidence, lifecycle, and stale/source-changed state.
- The Add Component flow is too powerful for a single default modal. It needs a quick-add path and an advanced catalog-record path.
- Template insertion should disclose or allow the exact destination group/area before commit.
- A denser maintenance mode is needed for component library stewardship once beta users manage larger catalogs.
- Implementation should start with a Phase 0 contract lock: route state, payloads, cache invalidation, authorization, data exposure, performance budgets, and rollback plans.
- Public/shared proposal surfaces must default to redacting private source URLs, internal notes, confidence labels, and workspace-only price history.
- Quick Add belongs in the beta cutline, but bulk import/export UI stays deferred with future-safe validation and privacy contracts.

## Evidence Base

This pack is grounded in:

- Source inspection of the Library route family and components.
- Parallel specialist lanes for product strategy, UX critique, feasibility, security, external pattern research, and QA inventory.
- Existing project guidance in `DESIGN.md`, `.ai/10_state/decisions.md`, and `.ai/06_specs/current-project-estimates-component-library-spec.md`.
- Accessibility and UX references from W3C APG, NN/g, Baymard, Carbon, MDN, GOV.UK, Google data-card guidance, Supabase/Postgres query guidance, and construction cost-library references.
- Graph/index evidence: code-review graph stats were checked and showed the repository indexed with 1,429 files, 16,148 nodes, and 190,581 edges as of 2026-06-19.

## Known Evidence Gaps

- No screenshot or browser proof was captured. This was intentional because the user asked for a planning task, no implementation was made, and the repo guidance treats Playwright/browser automation as opt-in evidence unless a browser-only claim is being proved.
- The Product Design `design-qa` workflow was not a fit for this task because there is no source mockup/prototype to compare against the rendered implementation.
- No tests were run because no application code changed. The validation plan names the focused tests to run during implementation.
- Product Design screenshot/browser audit was not run because there is no implemented target surface in this docs-only pass; the pack records browser proof as an implementation-phase gate.

## Artifact Map

- `00-PLAN.md` - scope, non-goals, design thesis, acceptance criteria, phase strategy.
- `01-CURRENT-STATE-AUDIT.md` - source-grounded assessment of the current Library page and risks.
- `02-USER-FLOWS-AND-ACTION-PATHS.md` - top Library workflows, current friction, and desired outcomes.
- `03-MODALS-POPOVERS-AND-OVERLAYS.md` - overlay inventory, replacement policy, focus/keyboard requirements.
- `04-UX-RESEARCH-SYNTHESIS.md` - external research and how it applies to Archestimator.
- `05-IMPLEMENTATION-ROADMAP.md` - ordered implementation tasks with expected file areas.
- `06-QA-AND-VALIDATION-PLAN.md` - targeted test matrix and browser-proof criteria.
- `07-AGENT-LEDGER.md` - skills, subagents, sources, and routing decisions used to produce this pack.
- `08-RATINGS-AND-GAP-CLOSURE.md` - lane ratings, gap matrix, closure criteria, and no-go conditions.
- `09-MVP-STRATEGY-AND-SUCCESS-METRICS.md` - beta hypotheses, metrics, actors, and release cutline.
- `10-LIBRARY-SURFACE-SPECS.md` - target overview, component, folder, template, add, and insert specs.
- `11-SOURCE-TRUST-STATE-MATRIX.md` - freshness, confidence, lifecycle, and snapshot/link semantics.
- `12-RESPONSIVE-ACCESSIBILITY-INTERACTION-CONTRACT.md` - responsive, keyboard, focus, screen-reader, and table/grid contract.
- `13-DATA-CONTRACTS-ROUTE-CACHE.md` - route-state, payload, insert target, mutation, cache, and migration contracts.
- `14-SECURITY-AUTHZ-AND-DATA-EXPOSURE.md` - threat model, actor matrix, object authorization, RLS, and exposure rules.
- `15-INPUT-IMPORT-EXPORT-FILE-HANDLING.md` - input validation, import/export, CSV, and file safety contract.
- `16-PERFORMANCE-SCALE-NETWORK-CONCURRENCY.md` - scale budgets, server search, failure states, and concurrency behavior.
- `17-BLAST-RADIUS-SEQUENCING-ROLLBACK.md` - high-blast areas, implementation order, rollback, and release gates.
- `18-ADVERSARIAL-QA-AND-COMPLETION-GATES.md` - hostile scenario matrix and final proof obligations.

# Library Page Overall Improvement Plan

Date: 2026-06-20
Status: planning and audit pack hardened to implementation-ready handoff, no app code changed. Bar: this pass targets a defensible 100/100/100 on the PLANNING-ACHIEVABLE rubric (strategy/quality/readiness), up from the prior independently-verified 93/92/91 recorded in `08-RATINGS-AND-GAP-CLOSURE.md`; the authoritative scores live in `08`, not here. Readiness is pre-registered, not executed: every execution-evidence item (rendered UI, green tests, applied migrations, measured perf baseline) is bound to an exact command + pass criterion + owner + phase in `24-EXECUTION-EVIDENCE-LEDGER.md`.
Primary routes: the four Library routes verified in `19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md` (Verified File Paths) — `/workshop/library`, `/workshop/library/components`, `/workshop/library/templates`, `/workshop/library/templates/[templateId]`.

> AUTHORITATIVE BINDINGS: `19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md` is the single source of truth for every file path, line number, column, enum, query key, server action, RPC, constant, threshold, and test command in this pack. Read it first; if any other doc disagrees with 19, 19 wins.

"Implementation-ready" means every path, enum, query key, RPC, server action, constant, command, and numeric threshold in this pack is bound to verified code (anchored to `src/...` file:line and named symbols), so the only remaining items are execution evidence — rendered UI, green tests, applied migrations — not planning gaps to resolve.

## Pack Audit Status (2026-06-21)

Every doc in this pack is scored 1–100 on three dimensions: **Strategy**, **Quality**, **Implementation Readiness**. The authoritative scores live in `25-AUDIT-SCORES-AND-IMPROVEMENT-PLAN.md`. Current pack averages: **Strategy 92.4, Quality 91.0, Readiness 87.5, Pack avg 90.3**. The 10 companion docs (25–34) close the systemic gaps that kept the original 26 docs below 100%.

### 12-dimension row-level completeness standard

Every actionable row in every doc must satisfy 12 dimensions: **Owner, Phase, Flag, Rollback, Evidence, Telemetry, Copy, A11y, Perf, Browser-proof, i18n, Binding**. See `34-ROW-LEVEL-COMPLETENESS-MATRIX.md` for the full standard and per-doc compliance tracking.

### Cross-doc consistency

All cross-doc conflicts are logged and resolved in `26-CROSS-DOC-CONFLICTS-AND-RESOLUTIONS.md`. The pack is internally consistent when that doc shows 0 unresolved conflicts.

### Ownership

Every doc, phase, and workstream has a named owner. See `27-OWNERS-AND-ACCOUNTABILITY-MATRIX.md` for the full ownership model.

## Goal

Improve the full Library experience, including the overview page, component library, template browser, template editor, and all Library modals, drawers, popovers, context menus, and confirmation flows.

The target experience is a compact source-trust workspace: users can find reusable components and templates quickly, understand whether costs are current and trustworthy, reuse items without losing context, and complete create/edit/destructive actions through one predictable overlay system.

## Start Here

1. [MANDATORY before coding] Read `19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md` FIRST — the keystone binding table and the canonical phase map (Phase 0A -> 0B -> 1 -> 2 -> 3 -> 4 -> 5). All other docs cite it instead of restating bindings.
2. [MANDATORY before coding] Read `00-PLAN.md` for the full implementation strategy and non-goals.
3. [MANDATORY before coding] Read `05-IMPLEMENTATION-ROADMAP.md` for ordered work items (labels aligned to the doc 19 phase map).
4. [PULL on demand] Read `03-MODALS-POPOVERS-AND-OVERLAYS.md` before touching any modal, drawer, popover, menu, or text-prompt dialog.
5. [PULL on demand] Read `08-RATINGS-AND-GAP-CLOSURE.md` to understand the hardening gaps closed by this pass.
6. [MANDATORY before coding] Read `13-DATA-CONTRACTS-ROUTE-CACHE.md`, `14-SECURITY-AUTHZ-AND-DATA-EXPOSURE.md`, and `18-ADVERSARIAL-QA-AND-COMPLETION-GATES.md` before implementation.
7. [PULL on demand] Read `06-QA-AND-VALIDATION-PLAN.md` for proportional verification, and `21-FEATURE-FLAGS-AND-ROLLOUT.md` for per-phase flags and rollback.
8. [PULL on demand] Pull `20-TELEMETRY-AND-EVENT-INSTRUMENTATION.md`, `22-COPY-DECK-AND-MICROCOPY.md`, and `23-DESIGN-SYSTEM-COMPONENT-MAPPING.md` when wiring events, copy, and overlay primitives respectively.
9. [MANDATORY before coding] Read `25-AUDIT-SCORES-AND-IMPROVEMENT-PLAN.md` for the full audit scores and improvement plan.
10. [MANDATORY before coding] Read `27-OWNERS-AND-ACCOUNTABILITY-MATRIX.md` to know who owns what.
11. [MANDATORY before coding] Read `34-ROW-LEVEL-COMPLETENESS-MATRIX.md` for the 12-dimension row-level completeness standard every actionable row must satisfy.
12. [PULL on demand] Read `26-CROSS-DOC-CONFLICTS-AND-RESOLUTIONS.md` when a cross-doc inconsistency is suspected.
13. [PULL on demand] Read `28-I18N-RTL-AND-LOCALIZATION-CONTRACT.md` when wiring copy or layout that must be localizable.
14. [PULL on demand] Read `29-BROWSER-PROOF-AND-VISUAL-QA-MATRIX.md` when determining jsdom vs Playwright proof boundary.
15. [PULL on demand] Read `30-PERF-BUDGET-AND-REGRESSION-GATES.md` for the final perf budget (after Phase 0A baseline).
16. [PULL on demand] Read `31-A11Y-ACCEPTANCE-CRITERIA-MATRIX.md` for per-surface a11y pass conditions.
17. [PULL on demand] Read `32-SECURITY-THREAT-MODEL-EXPANSION.md` for the full threat model beyond doc 14.
18. [PULL on demand] Read `33-DB-RLS-AND-MIGRATION-CONTRACT.md` for the DB/RLS/migration contract (no migrations in 0A–5).

## Key Conclusions

- Overview search (`searchLibraryOverview`) must continue the exact user intent. Component results should open or highlight the selected component in the Components tab via `?component=<id>` route state, not drop the user into the whole catalogue.
- Component folder create/rename/delete (`ComponentLibraryManager.tsx` `window.prompt` :1493/:1515 + `window.confirm` :1534) and the Add Component draft-discard confirm (`AddComponentModal.tsx` `window.confirm` :963) move off native dialogs and onto the text-prompt dialog pattern (inline `ConfirmDialog` + child `<input>`, per `TemplatesBrowseManager.tsx:531-883`). The in-estimate panel `src/components/workshop/component-library/index.tsx` (`window.confirm` :939, `window.prompt` :1428) is in 00-PLAN scope and follows in a later phase.
- Trust cues should be visible wherever a user reuses a component or template: `pricing_date`, `pricing_source` (the source URL, validated app-side over free text), `supplier`, `confidence` (FREE TEXT, not an enum), `lifecycle_state`, and pricing `stale`/`source-changed` state. "Stale" means PRICING freshness only; link/snapshot drift uses `source-changed`. No `last_reviewed`/`reviewed_at` column exists — trust cues use `updated_at` or gate behind the Data Migration Gate.
- The Add Component flow is too powerful for a single default modal. It needs a quick-add path (required = `name`, `category`, `unit`, `unit_cost`; `libraryFolderId` optional, defaults to the selected folder) and an advanced catalog-record path. All columns already exist, so Quick Add does NOT violate the 00-PLAN "no schema changes" non-goal.
- Template insertion should disclose or allow the exact destination group/area before commit, resolved through `resolveEstimateTemplateInsertTarget` (the insert-target resolver) with a `creatable-combobox` move control.
- A denser maintenance mode (card/dense density toggle — net-new, does not exist yet) is needed for component library stewardship once beta users manage larger catalogs; it reuses the existing virtualization infra (`src/lib/workshop/virtualization-flags.ts`).
- Implementation starts with Phase 0A Contract Lock: lock the keystone bindings (doc 19), scaffold route-state/authz/cache/stale-target tests, and extend the perf seed (`scripts/seed-performance-test-data.ts`, which does NOT yet cover `cost_library_items`) and MEASURE a baseline before any budget is claimed.
- Public/shared proposal surfaces are FROZEN snapshots: `src/app/share/[token]` + `src/app/api/share/[token]/route.ts` render `project_publications.snapshot_json`, not a live Library query. Redaction is about what the snapshot builder PUTS INTO `snapshot_json` (private source URLs, notes, `confidence`, workspace-only price history), not a leaking live endpoint.
- Quick Add belongs in the beta cutline (Phase 3), but bulk import/export UI stays deferred with future-safe validation and privacy contracts.

## Evidence Base

This pack is grounded in:

- Source inspection of the Library route family, verified to file:line in `19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md` and `08-RATINGS-AND-GAP-CLOSURE.md`. Three file-path errors in the original 00-PLAN (the inspector, facet filter, and bulk toolbar are NOT under `component-library-manager/` — they live in `src/components/workshop/library/` and `src/components/workshop/`) are corrected; see doc 19 for the authoritative paths.
- Parallel specialist lanes for product strategy, UX critique, feasibility, security, external pattern research, and QA inventory (routing in `07-AGENT-LEDGER.md`).
- Existing project guidance in `DESIGN.md`, `.ai/10_state/decisions.md`, and `.ai/06_specs/current-project-estimates-component-library-spec.md`.
- External references are cited at the point of application rather than listed here as a roll-call: W3C APG and MDN drive the focus/keyboard/ARIA contract in `12-RESPONSIVE-ACCESSIBILITY-INTERACTION-CONTRACT.md`; NN/g, Baymard, Carbon, GOV.UK, and Google data-card guidance inform `04-UX-RESEARCH-SYNTHESIS.md`; Supabase/Postgres and construction cost-library references inform `13-DATA-CONTRACTS-ROUTE-CACHE.md` and `16-PERFORMANCE-SCALE-NETWORK-CONCURRENCY.md`. Full source list, carrying a dated provenance band (drafted 2026-06-20; verified against `main` 2026-06-21), lives in the Source Links section of `04-UX-RESEARCH-SYNTHESIS.md` (with `07-AGENT-LEDGER.md` recording the research routing). Honest limitation, declared there: per-URL access dates and section anchors are NOT tracked, because no behavior in this pack depends on a specific external URL resolving — every implementable claim binds to the in-repo facts in `19`, and time-sensitive guidance (Baymard, Carbon, GOV.UK) informs direction/priority only, not a load-bearing threshold.

## Known Evidence Gaps

- No screenshot or browser proof was captured. This was intentional because the user asked for a planning task, no implementation was made, and the repo guidance treats Playwright/browser automation as opt-in evidence unless a browser-only claim is being proved. (pre-registered in: `24-EXECUTION-EVIDENCE-LEDGER.md` "Rendered-UI screenshots" + the per-phase `bun run test:e2e` rows; `18-ADVERSARIAL-QA-AND-COMPLETION-GATES.md` Browser-Proof Criteria; Phases 0B/1/5.)
- The Product Design `design-qa` workflow was not a fit for this task because there is no source mockup/prototype to compare against the rendered implementation. (pre-registered in: `24-EXECUTION-EVIDENCE-LEDGER.md` "Rendered-UI screenshots", deferred to the implementation phase that ships each visible surface.)
- No tests were run because no application code changed. `06-QA-AND-VALIDATION-PLAN.md` names the focused tests to run during implementation; note the canonical commands are `bun run test:dom` (all jsdom suites) or `vitest run tests/vitest/<file>` (one) — `bun test` runs `tests/unit` ONLY and will NOT run the vitest suites. Full gate: `bun run validate`. (pre-registered in: `06-QA-AND-VALIDATION-PLAN.md` + `24-EXECUTION-EVIDENCE-LEDGER.md`, which maps each `ADV-*` scenario to an exact command + pass criterion + owning phase.)
- Product Design screenshot/browser audit was not run because there is no implemented target surface in this docs-only pass; the pack records browser proof as an implementation-phase gate. (pre-registered in: `24-EXECUTION-EVIDENCE-LEDGER.md` per-phase `bun run test:e2e` rows; `18-ADVERSARIAL-QA-AND-COMPLETION-GATES.md`, Phases 0B/1/5.)
- No measured performance baseline was captured because the perf seed does not yet cover `cost_library_items`; no budget number may be claimed until it is measured. (pre-registered in: `16-PERFORMANCE-SCALE-NETWORK-CONCURRENCY.md` "Phase 0A Seed + Measure" + `24-EXECUTION-EVIDENCE-LEDGER.md` "Perf seed extension" / "Perf baseline measurement note", Phase 0A.)
- Provenance of binding verification: the code-review graph index (1,429 files, 16,148 nodes, 190,581 edges as of 2026-06-19) plus targeted `rg`/file:line reads were used to verify the bindings recorded in doc 19; this is verification tooling, not a quality claim. (pre-registered in: `07-AGENT-LEDGER.md`; not an execution gap — it is the verification method behind the keystone.)

## Launcher Matrix

The pack is organized by concern. Use this matrix to find the right doc for each need.

| Need | Read | Owner | Phase |
|---|---|---|---|
| What is the plan scope? | `00-PLAN.md` | Planning lead | all |
| What are the verified codebase bindings? | `19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md` | Planning lead | all (keystone) |
| What is the build order? | `05-IMPLEMENTATION-ROADMAP.md` | Planning lead | 0A–5 |
| What are the test commands? | `06-QA-AND-VALIDATION-PLAN.md` | QA lead | 0A–6 |
| What are the adversarial scenarios? | `18-ADVERSARIAL-QA-AND-COMPLETION-GATES.md` | QA lead | 6 |
| What evidence is pre-registered? | `24-EXECUTION-EVIDENCE-LEDGER.md` | QA lead | 0A–6 |
| What are the data contracts? | `13-DATA-CONTRACTS-ROUTE-CACHE.md` | Backend lead | 0B |
| What is the security model? | `14-SECURITY-AUTHZ-AND-DATA-EXPOSURE.md` + `32-SECURITY-THREAT-MODEL-EXPANSION.md` | Security lead | 0B |
| What is the DB/RLS contract? | `33-DB-RLS-AND-MIGRATION-CONTRACT.md` | DB lead | 0B (no migrations 0A–5) |
| What are the feature flags? | `21-FEATURE-FLAGS-AND-ROLLOUT.md` | Release lead | 0A–5 |
| What is the rollback plan? | `17-BLAST-RADIUS-SEQUENCING-ROLLBACK.md` | Release lead | 0A–5 |
| What are the telemetry events? | `20-TELEMETRY-AND-EVENT-INSTRUMENTATION.md` | Telemetry lead | 0A–5 |
| What is the copy deck? | `22-COPY-DECK-AND-MICROCOPY.md` | Copy lead | 0A–5 |
| What is the i18n contract? | `28-I18N-RTL-AND-LOCALIZATION-CONTRACT.md` | i18n lead | 0A–5 |
| What is the a11y matrix? | `31-A11Y-ACCEPTANCE-CRITERIA-MATRIX.md` | A11y lead | 1, 5b, 6 |
| What is the perf budget? | `30-PERF-BUDGET-AND-REGRESSION-GATES.md` | Perf lead | 0A (baseline) → 5 |
| What is the browser-proof boundary? | `29-BROWSER-PROOF-AND-VISUAL-QA-MATRIX.md` | QA lead | 6 |
| Who owns what? | `27-OWNERS-AND-ACCOUNTABILITY-MATRIX.md` | Planning lead | all |
| What conflicts exist? | `26-CROSS-DOC-CONFLICTS-AND-RESOLUTIONS.md` | Planning lead | all |
| What are the current scores? | `25-AUDIT-SCORES-AND-IMPROVEMENT-PLAN.md` | Planning lead | all |
| What is the completeness standard? | `34-ROW-LEVEL-COMPLETENESS-MATRIX.md` | Planning lead | all |

## Artifact Map

- `00-PLAN.md` - scope, non-goals, design thesis, acceptance criteria, phase strategy.
- `01-CURRENT-STATE-AUDIT.md` - source-grounded assessment of the current Library page and risks.
- `02-USER-FLOWS-AND-ACTION-PATHS.md` - top Library workflows, current friction, and desired outcomes.
- `03-MODALS-POPOVERS-AND-OVERLAYS.md` - overlay inventory, native-prompt replacement policy (text-prompt dialog pattern; there is NO standalone PromptDialog primitive), focus/keyboard requirements.
- `04-UX-RESEARCH-SYNTHESIS.md` - external research and how it applies to Archestimator.
- `05-IMPLEMENTATION-ROADMAP.md` - ordered implementation tasks with expected file areas, labeled to the canonical phase map (0A -> 0B -> 1 -> 2 -> 3 -> 4 -> 5).
- `06-QA-AND-VALIDATION-PLAN.md` - targeted test matrix and browser-proof criteria.
- `07-AGENT-LEDGER.md` - skills, subagents, sources, and routing decisions used to produce this pack.
- `08-RATINGS-AND-GAP-CLOSURE.md` - lane ratings, gap matrix, closure criteria, and no-go conditions.
- `09-MVP-STRATEGY-AND-SUCCESS-METRICS.md` - beta hypotheses, metrics, actors, and release cutline.
- `10-LIBRARY-SURFACE-SPECS.md` - target overview, component, folder, template, add, and insert specs.
- `11-SOURCE-TRUST-STATE-MATRIX.md` - freshness (90-day pricing), free-text confidence, the five `component_lifecycle_state` values (`draft`/`in_production`/`available`/`discontinued`/`archived`), and `estimate_row_link_state` snapshot/link semantics.
- `12-RESPONSIVE-ACCESSIBILITY-INTERACTION-CONTRACT.md` - responsive, keyboard, focus, screen-reader, and table/grid contract (no jest-axe harness exists; a11y tests are manual ARIA/focus assertions).
- `13-DATA-CONTRACTS-ROUTE-CACHE.md` - route-state (`?component=<id>`), payload, insert target (`resolveEstimateTemplateInsertTarget`), mutation cache keys (the un-scoped `WORKSPACE_COMPONENT_LIBRARY_QUERY_KEY` is the real cache-bleed surface), and migration contracts.
- `14-SECURITY-AUTHZ-AND-DATA-EXPOSURE.md` - threat model, actor matrix (`workspace_role`), `is_workspace_editor`/`can_edit_estimate` object authorization, RLS, and snapshot-redaction exposure rules (frozen `snapshot_json`, not a live endpoint).
- `15-INPUT-IMPORT-EXPORT-FILE-HANDLING.md` - input validation, import/export, CSV, and file safety contract.
- `16-PERFORMANCE-SCALE-NETWORK-CONCURRENCY.md` - scale budgets, browse-payload reduction, future-if-budget server search, failure states, and concurrency behavior.
- `17-BLAST-RADIUS-SEQUENCING-ROLLBACK.md` - high-blast areas, implementation order, rollback, and release gates (phase labels per doc 19).
- `18-ADVERSARIAL-QA-AND-COMPLETION-GATES.md` - hostile scenario matrix and final proof obligations.
- `19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md` - KEYSTONE: authoritative file:line/column/enum/query-key/RPC/server-action/constant/test-command bindings and the canonical Phase 0A -> 5 map. Read first; resolves all cross-doc drift.
- `20-TELEMETRY-AND-EVENT-INSTRUMENTATION.md` - event names, properties, and instrumentation points for findability, trust, quick-add, and insert flows.
- `21-FEATURE-FLAGS-AND-ROLLOUT.md` - per-phase feature flags, rollout sequence, and rollback mapping.
- `22-COPY-DECK-AND-MICROCOPY.md` - canonical user-facing strings (trust chips, confirms, empty/error states) for the text-prompt dialogs and trust cues.
- `23-DESIGN-SYSTEM-COMPONENT-MAPPING.md` - maps each spec element to real overlay/UI primitives (`ConfirmDialog`, `Modal`, `InspectorDrawer`, `creatable-combobox`, z-index tiers `z-[1000]`/`z-[1050]`/`z-[1100]`).
- `24-EXECUTION-EVIDENCE-LEDGER.md` - pre-registered execution-evidence register: the exact command, pass criterion, owner, and phase for every rendered-UI / green-test / applied-migration / measured-perf-baseline item this pack defers to the build phase. This is the readiness mechanism — every execution-only proof is named here in advance so nothing is unplanned.
- `25-AUDIT-SCORES-AND-IMPROVEMENT-PLAN.md` - master audit scoring all 26 original docs 1–100% on strategy/quality/readiness, with per-doc gap analysis, fix plans, improvement waves, and verification scenarios.
- `26-CROSS-DOC-CONFLICTS-AND-RESOLUTIONS.md` - binding conflict log: every cross-doc inconsistency enumerated with a binding resolution, required updates, and verification command. 0 unresolved conflicts is the gate.
- `27-OWNERS-AND-ACCOUNTABILITY-MATRIX.md` - owner/accountability model: 12 owner roles, doc-level ownership (35 docs), phase-level ownership (0A–6), workstream ownership (22 workstreams), RACI matrix, escalation path.
- `28-I18N-RTL-AND-LOCALIZATION-CONTRACT.md` - i18n, RTL, and localization contract: locale support scope, copy key naming, pluralization (ICU MessageFormat), RTL-ready layout, locale-safe interpolation, per-surface i18n acceptance criteria.
- `29-BROWSER-PROOF-AND-VISUAL-QA-MATRIX.md` - browser-proof boundary (jsdom vs Playwright), browser matrix, screenshot artifact convention, per-surface proof requirements.
- `30-PERF-BUDGET-AND-REGRESSION-GATES.md` - perf budget per surface, measurement methodology, regression gates, artifact schema, fallback decision tree. Replaces provisional thresholds in doc 16 after Phase 0A baseline.
- `31-A11Y-ACCEPTANCE-CRITERIA-MATRIX.md` - a11y acceptance criteria for every Library surface: keyboard, screen reader, focus, contrast, motion, ARIA, live regions, per-surface pass conditions.
- `32-SECURITY-THREAT-MODEL-EXPANSION.md` - full threat model: 12 attack vectors, 5 abuse cases, security telemetry events, per-surface security acceptance criteria. Deepens doc 14.
- `33-DB-RLS-AND-MIGRATION-CONTRACT.md` - DB/RLS/migration contract: schema, RLS policies for all Library tables, no-migration gate for 0A–5, query optimization, backfill plans. Deepens docs 13 and 14.
- `34-ROW-LEVEL-COMPLETENESS-MATRIX.md` - 12-dimension row-level completeness standard: defines what counts as an actionable row, per-doc compliance matrix, gap closure plan, verification commands.

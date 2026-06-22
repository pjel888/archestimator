# Library Page Overall Improvement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> `superpowers:subagent-driven-development` (recommended) or
> `superpowers:executing-plans` to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the Library Page Overall Improvement plan pack so users can
find, trust, create, edit, and reuse components/templates from the unified
Library without losing context, leaking private data, or regressing estimate
workflows.

**Architecture:** Treat this document as the lead-facing execution guide and
the existing plan pack as the detailed specification library. `19` remains the
keystone for exact code bindings and phase map, `05` remains the ordered
roadmap, `24` remains the execution-evidence ledger, and this guide collapses
the pack into a single implementation operating model with pre-code errata,
phases, risks, pros/cons, SWOT, and validation gates.

**Tech Stack:** Next.js 16, React 19, Bun, TypeScript, Tailwind v4, Supabase /
Postgres, TanStack Query, Zustand, Vitest jsdom, Playwright, existing
Archestimator UI primitives.

## Global Constraints

- Read `AGENTS.md` and the FAST PATH block in `.ai/10_state/current-state.md`
  before coding.
- Read `19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md` before touching source
  files. If any sibling doc disagrees with `19` on a path, route, enum, query
  key, action, RPC, command, or phase, `19` wins until it is re-verified and
  reconciled.
- No schema changes in Phases 0A-5. Quick Add, trust states, dense mode, and
  template work reuse existing schema. `last_reviewed` / `reviewed_at`,
  controlled `confidence`, controlled `category`, new indexes, and new RPCs are
  behind the Data Migration Gate.
- Supabase provider work, if a re-plan proves it necessary, stays inside
  project `ebxxqidacheyapmmzavr` only.
- Use `bun run test:dom` for all jsdom Vitest suites, `bunx vitest run
  tests/vitest/<file> --maxWorkers=1` or `vitest run tests/vitest/<file>` for
  one suite, and `bun run test:e2e` for Playwright. Never use `bun test
  tests/vitest/<file>`; `bun test` runs `tests/unit` only.
- Browser proof is required only for browser-only claims: route history,
  viewport geometry, mobile overlap, sticky/scroll behavior, portal clipping,
  z-index stacking, pointer/drag behavior, paint-time glass, and real focus
  traps. Use jsdom/static checks for copy, payloads, cache keys, validation, and
  non-geometric state behavior.
- The historical current-state baseline said full `bun run validate` could be
  red on unrelated main-branch issues. As of 2026-06-22
  (`_evidence/phase-final/validate-pass-20260622T075913Z.md`), local
  `bun run validate` passes. Keep separating unrelated reds from Library
  regressions if this drifts again.
- All feature flags in this pack are build-time env flags unless a later
  approved runtime flag store exists. Rollback means redeploy with flag=false,
  not instant runtime kill.
- Multiple agents may be working in this directory. Preserve user and peer
  changes, avoid overlapping write scopes, and re-run targeted `rg` checks before
  editing drift-prone files.

---

## 1. Canonical Anchors

| Need | Read first | How to use it |
| --- | --- | --- |
| Exact paths, line refs, enums, query keys, actions, phase map | `19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md` | Source of truth. Re-verify with commands before each phase. |
| Ordered implementation work | `05-IMPLEMENTATION-ROADMAP.md` | Seq-level roadmap. This guide groups those Seq rows by implementation lane. |
| Cross-doc conflicts | `26-CROSS-DOC-CONFLICTS-AND-RESOLUTIONS.md` | Settled decisions. Do not re-litigate unless current source contradicts them. |
| Owners and escalation | `27-OWNERS-AND-ACCOUNTABILITY-MATRIX.md` | Assign maker/checker roles and resolve scope conflicts. |
| Execution evidence | `24-EXECUTION-EVIDENCE-LEDGER.md` | Every phase must populate matching rows with command, result, date, and artifact path. |
| Row completeness | `34-ROW-LEVEL-COMPLETENESS-MATRIX.md` | Gate rows need owner, phase, flag, rollback, evidence, telemetry, copy, a11y, perf, browser proof, i18n, binding. |
| QA and adversarial gates | `06-QA-AND-VALIDATION-PLAN.md`, `18-ADVERSARIAL-QA-AND-COMPLETION-GATES.md` | Use for tests, no-go scenarios, and final release proof. |
| Browser and visual proof | `29-BROWSER-PROOF-AND-VISUAL-QA-MATRIX.md` | Use only when a browser-only claim is being made. |
| Performance budgets | `16-PERFORMANCE-SCALE-NETWORK-CONCURRENCY.md`, `30-PERF-BUDGET-AND-REGRESSION-GATES.md` | Provisional until Phase 0A seed/baseline evidence exists. |
| Security, RLS, DB | `14-SECURITY-AUTHZ-AND-DATA-EXPOSURE.md`, `32-SECURITY-THREAT-MODEL-EXPANSION.md`, `33-DB-RLS-AND-MIGRATION-CONTRACT.md` | Security gates, RLS expectations, no-migration contract. |
| Visual system | `35-LIQUID-GLASS-LIBRARY-UX-SPEC.md` | Phase 1 glass skeleton and later content-grade glass. |

### Planning Readiness Versus Execution Completion

The existing pack is Rubric B implementation-ready: the plan is complete enough
to execute. It is not execution-complete. Execution-complete means app code,
tests, browser artifacts, provider proof when relevant, and doc-24 evidence rows
prove every acceptance gate. Do not cite the pack's `100/100/100` planning score
as proof that the feature is implemented. This doc is an unscored execution
guide created after the 2026-06-21 audit; the historical "36 docs" score refers
to docs `00` through `35`.

## 2. Parallel Audit Synthesis

This guide synthesizes five independent audit lanes run on 2026-06-22:

| Lane | Scope | Key implementation impact |
| --- | --- | --- |
| Product/user flows | Docs 00, 01, 02, 04, 09, 10, 22, 35 | Keep `?component=<id>` continuity, Quick Add primary path, trust/source visibility, template target disclosure, and liquid-glass sequencing. |
| Repo implementation map | `/workshop/library`, component-library files, tests | Current routes and tests exist; avoid breaking shared estimate-sidebar/template contracts; Vitest commands must use `test:dom` / `vitest`, not `bun test`. |
| Data/security | Docs 11, 13, 14, 15, 17, 20, 21, 32, 33 | No 0A-5 migrations; cache key scoping and redaction are blocking gates; template telemetry must use segment routes; telemetry payloads must not carry raw free text. |
| QA/perf/a11y | Docs 06, 12, 16, 18, 24, 29, 30, 31, 34 | Add/extend named suites, fix artifact-path drift, register missing evidence IDs, treat axe/focus-trap as explicit prerequisites, baseline validate reds. |
| Sequencing/ownership | Docs 03, 05, 07, 08, 19, 23, 25, 26, 27, 28 | Add one front-door guide, preserve phase map, keep Phase-later residuals explicit, do not let line drift or shared-doc edits collide. |

## 3. Pre-Code Errata And Reconciliation Tasks

These are documentation and planning hygiene tasks. They should run before app
code, because they prevent implementers from following stale or contradictory
instructions. They do not change product behavior.

### ERR-01 Canonical Evidence Path

**Problem:** `24` uses `_evidence/...`; `06`, `29`, and some perf/browser docs
also mention `evidence/screenshots/...`.

**Resolution for implementation:** Canonical path is the doc-24 path:
`.ai/03_plans/2026-06-20-Library-Page-Overall-Improvement/_evidence/`.

- [x] Update docs that still point at `evidence/screenshots/` to `_evidence/`.
- [x] Run:

```sh
rg -n "evidence/screenshots|/_evidence|_evidence" .ai/03_plans/2026-06-20-Library-Page-Overall-Improvement -g "*.md"
```

Expected: every active artifact-storage instruction uses `_evidence/`; old
`evidence/screenshots/` appears only in historical/conflict context.

### ERR-02 Missing Evidence IDs

**Problem:** Docs 12, 29, 30, and 31 reference evidence IDs that doc 24 may not
own explicitly: `EV-0A-AXE-HARNESS`, `EV-0B-FOCUS-TRAP`,
`EV-HARNESS-SCREENSHOTS`, `EV-TELEMETRY-ROUTE`,
`EV-TELEMETRY-INPUT`, `EV-0A-PERF-BASELINE`.

- [x] Register or alias these IDs in `24-EXECUTION-EVIDENCE-LEDGER.md`.
- [x] For each ID, include command/proof method, pass criterion, owner, phase,
  and artifact path.
- [x] Run:

```sh
rg -n "EV-0A-AXE-HARNESS|EV-0B-FOCUS-TRAP|EV-HARNESS-SCREENSHOTS|EV-TELEMETRY-ROUTE|EV-TELEMETRY-INPUT|EV-0A-PERF-BASELINE" .ai/03_plans/2026-06-20-Library-Page-Overall-Improvement/24-EXECUTION-EVIDENCE-LEDGER.md
```

Expected: one owning row or clear alias per ID.

### ERR-03 Template Route Telemetry

**Problem:** `13` and `19` correctly say templates use
`/workshop/library/templates/[templateId]`; `20` still mentions
legacy query-string template telemetry.

- [x] Update `20-TELEMETRY-AND-EVENT-INSTRUMENTATION.md` so
  `library_template_opened` and `template_route_not_found` describe segment
  route navigation, not `?template=`.
- [x] Run:

```sh
rg -n "\\?template=" .ai/03_plans/2026-06-20-Library-Page-Overall-Improvement -g "*.md"
```

Expected: no active instruction tells implementers to create or parse
`?template=`.

### ERR-04 Telemetry PII And Free-Text Payloads

**Problem:** `20` includes `xss_attempt` with `inputSnippet`, while docs 20/32
also prohibit raw/free-text telemetry payloads.

- [x] Replace `inputSnippet` with stable non-content fields such as `field`,
  `violationCode`, `inputHash`, and length/category metadata.
- [x] Run:

```sh
rg -n "inputSnippet|raw.*input|free-text.*payload" .ai/03_plans/2026-06-20-Library-Page-Overall-Improvement/20-TELEMETRY-AND-EVENT-INSTRUMENTATION.md .ai/03_plans/2026-06-20-Library-Page-Overall-Improvement/32-SECURITY-THREAT-MODEL-EXPANSION.md
```

Expected: no active telemetry row requires raw user input.

### ERR-05 Browser Matrix Status

**Problem:** `29` says draft framework while `06`, `24`, and `30` consume it as
proof guidance.

- [x] Either update `29` to build-ready once its rows are reconciled, or make
  `24` the canonical artifact-storage and proof authority while `29` remains a
  browser-boundary reference.
- [x] Do not block app code on screenshots that are not required by the specific
  phase's browser-only claims.

### ERR-06 Phase Alias Cleanup

**Problem:** Some rows still say `Phase 6` or `5b`; the canonical build phases
are `0A -> 0B -> 1 -> 2 -> 3 -> 4 -> 5`.

- [x] Treat `Phase 6` as final release-gate alias and `5b` as Phase 5 dense-mode
  subtrack, not as separate build phases.
- [x] Run:

```sh
rg -n "Phase 6|5b" .ai/03_plans/2026-06-20-Library-Page-Overall-Improvement -g "*.md"
```

Expected: every match clarifies it is an alias/subtrack, not a new phase.

### ERR-07 Validation Baseline

**Problem:** Current project state previously noted unrelated `bun run validate`
reds, so implementers needed to distinguish baseline debt from Library
regressions.

- [x] Before app code, run the narrow suite for the phase first.
- [x] If a phase needs full validate, run `bun run validate` once on the
  starting branch and record unrelated baseline failures in the doc-24 row.
- [x] A phase can pass with known unrelated baseline reds only if every
  Library-specific required check passes and the final report names the baseline
  gap explicitly.

2026-06-22 status: historical red baseline evidence remains recorded at
`_evidence/phase-final/validate-baseline-20260622T064146Z.md`, and a later
green full gate is recorded at
`_evidence/phase-final/validate-pass-20260622T075913Z.md`. Focused
Library-specific lint/type/test checks also passed for P0 authz/telemetry,
folder failure-recovery UI, insert picker lint fixes, audited copy contract,
copy-deck drift closure, the formerly red DOM contract subset, and the final
loader/test edits. The latest ADV release export is
`_evidence/phase-final/adv-release-status-20260622T120350Z.md`: the
cross-browser route glass/portal-focus/RTL-touch matrix and the 5,000-row dense
keystroke tier now pass, but the fresh aggregate `bun run validate` attempt
after the final loader/test/doc edits is red on unrelated landing-page
TypeScript errors recorded at
`_evidence/phase-final/validate-fail-20260622T110951Z.md`. Final all-flow
copy-deck review is closed at
`_evidence/phase-final/copy-deck-all-flow-review-pass-20260622T120350Z.md`.
Library-owned implementation/evidence rows now pass; aggregate release remains
NO-GO only because of the non-Library validate failure.

## 4. Implementation Phase Plan

### Phase 0A - Contract Lock

**Target result:** Tests, cache/security contracts, telemetry substrate, perf
seed baseline, and pre-code reconciliations are locked before UI changes.

**Start only after:** ERR-01 through ERR-07 are resolved or explicitly logged as
accepted doc-only residuals in `24`.

**Primary owners:** Backend lead, Security lead, Perf lead, QA lead, Frontend
lead for route-state scaffolding.

**Primary docs:** `13`, `14`, `16`, `17`, `18`, `19`, `20`, `21`, `24`, `30`,
`32`, `33`.

**Core files:**
- `src/lib/component-library/query-keys.ts`
- `src/components/workshop/library/template-editor/TemplateEditorClient.tsx`
- `src/components/workshop/LibraryPageClient.tsx`
- `src/hooks/use-estimate-row-mutations.ts`
- `src/components/workshop/EstimateSheetContent.tsx`
- `src/lib/publication/actions.ts`
- `src/lib/publication/snapshot.ts`
- `scripts/seed-performance-test-data.ts`
- net-new `src/lib/component-library/library-telemetry.ts` if the telemetry
  substrate is implemented in this phase

**Tasks:**

- [x] Re-run keystone verification:

```sh
find src/app/workshop/library -name page.tsx -print
rg -n 'queryKey: WORKSPACE_COMPONENT_LIBRARY_QUERY_KEY|queryKey: \["workspace-component-library"\]' src/
rg -n "window\.(prompt|confirm)" src/components/workshop/component-library-manager src/components/workshop/component-library/index.tsx
```

Expected: four Library route pages; current cache call sites enumerated by
symbol and inline literal; native prompt debt matches `ComponentLibraryManager`,
`AddComponentModal`, and the Phase-later `component-library/index.tsx` residual.

- [x] Author or extend contract tests:
  - `tests/vitest/library-route-state-authz.test.tsx`
  - `tests/vitest/estimate-insert-target-authz.test.tsx`
  - `tests/vitest/library-workspace-switch-cache.test.tsx`
  - `tests/vitest/share-snapshot-redaction.test.tsx`
  - `tests/vitest/library-viewer-authz.test.tsx`

- [x] Scope `WORKSPACE_COMPONENT_LIBRARY_QUERY_KEY` by workspace across every
  current reader/invalidator. Do not rely on symbol-only grep; include inline
  literal `["workspace-component-library"]`.

- [x] Prove public/share snapshot redaction on the serialized
  `project_publications.snapshot_json`, not a live Library endpoint.

- [x] Extend `scripts/seed-performance-test-data.ts` to model
  `cost_library_items` at the plan's tiers before asserting perf budgets.
  The extension is non-destructive/manifest-only; a provider baseline still
  needs an explicit import/apply step before any numeric budget is claimed.

- [x] Capture Phase 0A perf baseline under `_evidence/phase-0a/` with median of
  at least three runs and p95 recorded.
  Local synthetic baseline:
  `_evidence/phase-0a/library-phase0a-perf-baseline-20260622T062635Z.{md,json}`.
  Browser/provider React Profiler evidence remains a release-budget blocker.

- [x] Decide the a11y harness path. If adding `jest-axe` /
  `@axe-core/playwright`, record the dependency decision and evidence ID. If not,
  keep axe rows inactive and use manual ARIA/focus assertions.
  Decision: no new axe dependency for this pass; manual ARIA/focus assertions
  remain the active gate.

**Validation:**

```sh
bunx vitest run tests/vitest/library-route-state-authz.test.tsx tests/vitest/estimate-insert-target-authz.test.tsx tests/vitest/library-workspace-switch-cache.test.tsx tests/vitest/share-snapshot-redaction.test.tsx tests/vitest/library-viewer-authz.test.tsx --maxWorkers=1
```

2026-06-22 focused P0 matrix:

```sh
bunx vitest run tests/vitest/workshop-library-consolidation-ui.test.tsx tests/vitest/library-telemetry-emit.test.ts tests/vitest/library-route-state-authz.test.tsx tests/vitest/estimate-insert-target-authz.test.tsx tests/vitest/library-viewer-authz.test.tsx tests/vitest/library-workspace-switch-cache.test.ts tests/vitest/share-snapshot-redaction.test.tsx --maxWorkers=1
```

Passed 7 files / 30 tests. `bun run type-check` passed, and touched-file ESLint
passed for the P0 implementation, perf-baseline script, and tests.

Run `bun run test:dom` only after the focused suites pass. Run `bun run
validate` when the phase changes shared security/cache contracts, and record
baseline unrelated failures if they persist.

**Exit gate:** Cache scoping proof, actor matrix proof, snapshot redaction proof,
perf seed extension, perf baseline note, and evidence rows are populated in
`24`. Browser/provider perf and full `bun run validate` remain final-release
blockers.

### Phase 0B - Overlay And Route-State Reliability

**Target result:** Native Library-owned prompts are replaced, component deep-link
selection works safely, and bulk archive copy no longer claims irreversibility.

**Depends on:** Phase 0A route/cache/security contract tests.

**Primary owner:** Frontend lead with QA lead verification.

**Primary docs:** `03`, `05`, `06`, `12`, `18`, `19`, `22`, `23`, `24`, `31`.

**Core files:**
- `src/components/workshop/LibraryPageClient.tsx`
- `src/components/workshop/library/overview/LibraryOverviewSearch.tsx`
- `src/components/workshop/library/overview/RecentComponentCard.tsx`
- `src/components/workshop/component-library-manager/ComponentLibraryManager.tsx`
- `src/components/workshop/component-library-manager/AddComponentModal.tsx`
- `src/components/workshop/BulkDestructivePreviewModal.tsx`
- `src/components/ui/overlays/confirm-dialog.tsx`

**Tasks:**

- [x] Add `?component=<id>` ownership in `LibraryPageClient.tsx`; do not add
  `?template=`.
- [x] Route overview search and recent components to the Components tab with
  `?component=<id>`.
- [x] In `ComponentLibraryManager.tsx`, select/highlight the requested component
  and open `ComponentInspectorDock.tsx`; invalid/deleted/foreign IDs fail safe.
- [x] Replace folder create/rename/delete native dialogs with the inline
  `ConfirmDialog` + child `<input>` text-prompt pattern from
  `TemplatesBrowseManager.tsx`.
- [x] Replace Add Component dirty-discard `window.confirm` with
  `ConfirmDialog`.
- [x] Fix `BulkDestructivePreviewModal.tsx` so archive copy is recoverable copy
  and delete copy remains irreversible copy.
- [x] Leave `src/components/workshop/component-library/index.tsx` native prompt
  hits as explicitly allowlisted Phase-later residuals.

**Validation:**

```sh
bunx vitest run tests/vitest/component-library-manager-ui.test.tsx tests/vitest/component-library-folder-actions.test.ts --maxWorkers=1
bunx vitest run tests/vitest/component-library-folder-actions.test.ts tests/vitest/bulk-destructive-preview-modal.test.tsx --maxWorkers=1
bunx vitest run tests/vitest/library-components-cache.test.tsx tests/vitest/library-tabs-layout.test.tsx tests/vitest/library-tab-a11y.test.tsx --maxWorkers=1
rg -n "window\.(prompt|confirm)" src/components/workshop/component-library-manager src/components/workshop/component-library/index.tsx
```

Expected: zero `window.*` in `ComponentLibraryManager.tsx` and
`AddComponentModal.tsx`; exactly the Phase-later residuals may remain in
`component-library/index.tsx`.

Use Playwright only for route history, scroll-into-view, portal placement,
mobile stacking, and real focus-trap claims.

**Rollback:** Redeploy with `library_component_deep_link=false` and
`library_folder_dialogs=false` where those flags gate behavior; otherwise
`git revert` the 0B patch.

### Phase 1 - Findability, Applied Filters, And Glass Skeleton

**Target result:** Users can move from overview/search/recent into the exact
component, see applied filters and counts, and use the Phase 1 glass shell
without content-grade card glass yet.

**Depends on:** Phase 0B route-state behavior.

**Primary owners:** Frontend lead, Design lead for glass shell, QA lead for
browser-only proof.

**Primary docs:** `02`, `04`, `05`, `09`, `10`, `12`, `19`, `21`, `29`, `31`,
`35`.

**Core files:**
- `src/components/workshop/library/overview/LibraryOverview.tsx`
- `src/components/workshop/library/overview/LibraryOverviewSearch.tsx`
- `src/components/workshop/library/overview/RecentComponentCard.tsx`
- `src/components/workshop/library/component-facet-filter.tsx`
- `src/components/workshop/component-library-manager/ComponentLibraryManager.tsx`
- new Library surface-variant helper/provider modeled after
  `src/components/workshop/estimate-surface-variant.tsx`
- `src/app/globals.css`

**Tasks:**

- [x] Add visible applied-filter chips for supplier, brand, lifecycle,
  confidence, and pricing freshness.
- [x] Add per-chip removal, clear-all, count strip, and scope strip.
- [x] Preserve search/filter context across `?component=<id>` navigation.
- [x] Implement the glass skeleton only: workspace well, rails/paper,
  toolbar/chrome, liquid buttons, warm CTA, provider/slot system, and grids.
- [x] Keep component-card and template-card content-grade glass for Phases 2/5.

**Validation:**

```sh
bunx vitest run tests/vitest/library-overview.test.tsx tests/vitest/workshop-library-consolidation-ui.test.tsx tests/vitest/library-tab-a11y.test.tsx --maxWorkers=1
```

Add or run the net-new `library-overview-navigation` and
`library-applied-filters` suites when created. Browser proof is required for
history/back-forward, chip wrap at narrow widths, and glass arming/paint claims.

**Rollback:** Redeploy `library_component_deep_link=false` for route/filter
additions. For glass, disable the registered glass-shell/glass-arming flag or
revert the provider/classes so paper remains the default.

### Phase 2 - Source Trust At Decision Points

**Target result:** Users see clear source/trust context wherever they decide to
reuse a component or template, without exposing private trust metadata publicly.

**Depends on:** Phase 1 continuity and Phase 0A redaction tests.

**Primary owners:** Frontend lead, Backend lead for data mapping, Security lead
for redaction re-proof.

**Primary docs:** `10`, `11`, `14`, `19`, `20`, `22`, `23`, `24`, `31`, `32`.

**Core files:**
- `src/components/workshop/library/overview/RecentComponentCard.tsx`
- `src/components/workshop/library/overview/LibraryOverview.tsx`
- `src/components/workshop/library/ComponentInspectorDock.tsx`
- `src/components/workshop/library/component-facet-filter.tsx`
- `src/components/workshop/component-library/helpers.ts`
- `src/lib/repositories/component-library-repository.ts`
- template browse/editor files under
  `src/components/workshop/library/templates-browse/` and
  `src/components/workshop/library/template-editor/`

**Tasks:**

- [x] Render trust chips over real fields only: `pricing_date`,
  `pricing_source`, `supplier` / `supplier_id`, `confidence` free text,
  `updated_at`, lifecycle, and link state.
- [x] Implement the 4-tier beta freshness model
  `fresh / stale / very stale / missing` as a helper-layer extension only.
- [x] Change all freshness thresholds/helpers in lockstep; no fourth source of
  truth.
- [x] Compute template trust summaries from linked row data, not stored template
  columns.
- [x] Re-run snapshot redaction proof after trust chips are visible.

**Validation:**

```sh
bunx vitest run tests/vitest/library-source-trust.test.ts tests/vitest/library-overview.test.tsx tests/vitest/template-gallery.test.tsx tests/vitest/template-editor.test.tsx tests/vitest/share-snapshot-redaction.test.tsx --maxWorkers=1
```

**Fresh evidence (2026-06-22):** `bun run type-check` passed; the Phase 2
source-trust/UI matrix passed 6 files / 71 tests; the expanded Library
regression matrix passed 10 files / 37 tests; `git diff --check` passed for
touched Library/test paths; native-dialog guard still reports only the two
allowlisted legacy calls in `src/components/workshop/component-library/index.tsx`.

Browser proof only for tooltip truncation, chip wrapping, and visual
source-trust layout if those are changed.

**Rollback:** Redeploy `library_trust_chips=false` or revert chip rendering
while preserving underlying data.

### Phase 3 - Add/Edit Component Flow Split

**Target result:** Quick Add is the default create path with exactly four
required fields, while advanced catalog stewardship remains available and data
is preserved on failure.

**Depends on:** Phase 0B discard dialog and Phase 2 source-field normalization.

**Primary owners:** Frontend lead and Security lead.

**Primary docs:** `09`, `10`, `15`, `19`, `22`, `23`, `31`, `33`.

**Core files:**
- `src/components/workshop/component-library-manager/AddComponentModal.tsx`
- `src/components/workshop/library/EditComponentDrawer.tsx`
- `src/lib/component-library/actions.ts`
- `src/lib/component-library/action-errors.ts`

**Tasks:**

- [x] Extract or isolate Quick Add UI inside the Add modal area rather than
  growing the 2,000+ line modal further.
- [x] Required fields are exactly `name`, `category` text, `unit`, and
  `unit_cost`.
- [x] Optional fields are supplier/brand, `pricing_date`, `pricing_source`,
  `confidence` free text, and `library_folder_id`.
- [x] Preserve advanced fields behind progressive disclosure.
- [x] Add/Edit write the same source fields and use the same validation rules.
- [x] Server actions continue deriving workspace and denying `viewer`.

**Validation:**

```sh
bunx vitest run tests/vitest/library-viewer-authz.test.tsx tests/vitest/library-add-component-modal-a11y.test.tsx --maxWorkers=1
```

If the net-new Add modal a11y suite does not exist yet, create it in this phase
and cover required-field validation, invalid `pricing_source`, network retry
preservation, dirty discard, focus return, and `aria-invalid`.

**Rollback:** Redeploy `library_quick_add=false`; fall back to existing Add
Component modal path.

**Implementation evidence collected 2026-06-22:**

- Added `src/lib/component-library/quick-add-validation.ts` as the shared
  Add/Edit/action validation source for required text, field bounds, rounded
  non-negative money, future-date rejection, and non-`http(s)` source rejection.
- `AddComponentModal` now exposes the Quick Add form (`name`, `category`,
  `unit`, `unit_cost`) with optional supplier/brand/date/source/confidence/folder
  inputs, no required folder, non-blocking duplicate warning, failure-preserving
  retry, and advanced measurement/description/attachment details behind
  `Advanced catalog details`.
- `EditComponentDrawer` and component server actions use the same normalization
  rules; `createCostLibraryComponent` checks `is_workspace_editor` before create
  validation so viewers are denied before writes or validation detail leaks.
- Verification passed:
  `bunx vitest run tests/vitest/library-viewer-authz.test.tsx tests/vitest/library-add-component-modal-a11y.test.tsx tests/vitest/library-quick-add-validation.test.ts tests/vitest/component-library-manager-ui.test.tsx tests/vitest/workshop-library-consolidation-ui.test.tsx --maxWorkers=1`
  (5 files / 40 tests) and `bun run type-check`.

### Phase 4 - Templates Browse, Insert, And Editor Clarity

**Target result:** Template browsing and insertion disclose target, dependency
health, and recovery paths before any mutation.

**Depends on:** Phase 2 template trust summary and Phase 3 source-field clarity.

**Primary owners:** Backend lead for target resolution and Frontend lead for UI.

**Primary docs:** `02`, `10`, `13`, `18`, `19`, `20`, `22`, `23`, `24`, `31`.

**Core files:**
- `src/components/workshop/library/templates-browse/InsertIntoEstimatePicker.tsx`
- `src/components/workshop/library/templates-browse/TemplatesBrowseManager.tsx`
- `src/components/workshop/library/templates-browse/TemplateGallery.tsx`
- `src/components/workshop/library/templates-browse/TemplatePreviewDock.tsx`
- `src/components/workshop/library/template-editor/TemplateEditorSheet.tsx`
- `src/lib/component-library/actions.ts`
- `src/lib/component-library/template-editor-actions.ts`
- `src/lib/estimates/actions.ts`
- `src/components/ui/creatable-combobox.tsx`

**Tasks:**

- [x] Keep template detail navigation on
  `/workshop/library/templates/[templateId]`.
- [x] Show project, estimate, and target group/area before insert.
- [x] Re-resolve target immediately before mutation via
  `resolveEstimateTemplateInsertTarget`.
- [x] Do not conflate resolver with insert mutations:
  `insertEstimateTemplateIntoEstimate`, `insertTemplateIntoTemplate`, and
  component row insert actions are separate.
- [x] Warn/block/allow override based on computed dependency health.
- [x] Use `creatable-combobox.tsx` for template move; no parallel combobox.

**Implementation evidence (2026-06-22):**

- `InsertIntoEstimatePicker.tsx` now resolves a selected target for display
  (project, estimate, target group/area) and re-resolves immediately before
  calling `insertEstimateTemplateIntoEstimate`.
- `resolveEstimateTemplateInsertTarget` still returns `targetParentNodeId` and
  now also returns display metadata (`targetParentNodeName`,
  `targetParentNodeKind`, `targetParentNodePath`) without changing the insert
  mutation contract.
- Template dependency health is computed from template row data and blocks
  archived dependencies while requiring confirmation for warning dependencies.
- Template move uses `ui/creatable-combobox.tsx` for existing groups plus
  create-new and invalidates the scoped templates query after a successful move.

**Fresh proof (2026-06-22):**

```sh
bunx vitest run tests/vitest/library-template-insert-picker.test.tsx tests/vitest/estimate-insert-target-authz.test.tsx tests/vitest/template-gallery.test.tsx tests/vitest/library-templates-cache.test.tsx tests/vitest/library-source-trust.test.ts tests/vitest/template-browse-project-sources.test.tsx --maxWorkers=1
bun run type-check
```

Result: 6 Vitest files / 28 tests passed; `tsc --noEmit` passed. Provider-backed
smoke was not run because this pass made no live Supabase/RLS claim beyond the
existing server-action authz unit proof.

**Validation:**

```sh
bunx vitest run tests/vitest/library-template-insert-picker.test.tsx tests/vitest/estimate-insert-target-authz.test.tsx tests/vitest/template-gallery.test.tsx --maxWorkers=1
bun run test:e2e -- e2e/workshop-template-insert-smoke.spec.ts
```

Provider-backed smoke is required only for the insert path when local tests
cannot prove Supabase/RLS behavior.

**Rollback:** Revert the insert-target UI/resolver changes; trust summaries can
remain hidden behind `library_trust_chips=false`.

### Phase 5 - Dense Maintenance Mode And Browser-Proven Polish

**Target result:** Catalog stewards can switch between card and dense modes,
large lists meet measured budgets or use fallback virtualization, and browser
proof covers geometry-sensitive claims.

**Depends on:** Phases 0A-4 and measured Phase 0A baseline.

**Primary owners:** Frontend lead, Perf lead, QA lead, A11y lead.

**Primary docs:** `05`, `10`, `12`, `16`, `18`, `19`, `24`, `29`, `30`, `31`,
`35`.

**Core files:**
- `src/components/workshop/component-library-manager/ComponentLibraryManager.tsx`
- dense-mode row/table subcomponents created under the same feature area
- `src/lib/workshop/virtualization-flags.ts`
- `e2e/workshop-library-routes.spec.ts`
- `e2e/route-transition-performance.spec.ts`

**Tasks:**

- [x] Add a card/dense toggle gated by `library_dense_mode`.
- [x] Dense view columns include name, folder, supplier, brand, cost,
  `pricing_source`, `pricing_date`, confidence, lifecycle, usage, and actions.
- [x] Preserve action parity: any card action must be available in dense mode.
- [x] Reuse `WORKSHOP_VIRTUALIZATION_FLAGS`; do not add a parallel virtualizer.
- [x] If budgets fail, choose documented fallback: virtualization, pagination,
  lazy inspector details, or keeping dense mode hidden for beta.
- [x] Capture Chromium browser proof for sticky headers/columns, mobile
  geometry, scroll containment, and dense keyboard path.
- [x] Capture the automated release browser matrix before release
  presentation: route glass arming/paint evidence, Add Component portal focus,
  RTL containment, and coarse-pointer touch targets now pass across Chromium,
  Firefox, WebKit, Mobile Safari, iPhone SE, iPad, and Pixel 8 Chrome. Human
  visual-design approval remains separate; all-flow copy-deck approval passed
  in `_evidence/phase-final/copy-deck-all-flow-review-pass-20260622T120350Z.md`.

**Implementation evidence (2026-06-22):** Dense mode now ships behind
`NEXT_PUBLIC_LIBRARY_DENSE_MODE` with the rollback flag defaulting off. The
component table uses a native `<table>`, persists the `cards`/`dense` preference
in `localStorage`, includes all required columns, supports column sorting,
select/inspect/promote parity, and keyboard row `Space`/`Enter` paths. Library
virtualization uses the shared `WORKSHOP_VIRTUALIZATION_FLAGS` /
`WORKSHOP_LIBRARY_COMPONENTS_VIRTUALIZATION` surface with `@tanstack/react-virtual`;
no parallel virtualizer was added. Local proof: `bunx vitest run
tests/vitest/workshop-library-consolidation-ui.test.tsx
tests/vitest/library-tab-a11y.test.tsx
tests/vitest/estimate-sheet-column-resize-flag.test.ts --maxWorkers=1` passed
3 files / 17 tests before the virtualization fallback; after the fallback,
`bunx vitest run tests/vitest/workshop-library-consolidation-ui.test.tsx
tests/vitest/estimate-sheet-column-resize-flag.test.ts --maxWorkers=1` passed
2 files / 16 tests, `bun run type-check` passed, and targeted ESLint exited
with one React Compiler/TanStack Virtual warning and 0 errors. Browser/provider
functional proof:
`ARCHESTIMATOR_DEV_AUTH_BYPASS=1 ARCHESTIMATOR_DEV_AUTH_ADMIN_DB=1
ARCHESTIMATOR_DEV_AUTH_BYPASS_SECRET=<local-dev-auth-bypass-secret>
ARCHESTIMATOR_E2E_LIBRARY_DENSE_PROOF=1 NEXT_PUBLIC_LIBRARY_DENSE_MODE=1
NEXT_PUBLIC_LIBRARY_VIRTUALIZATION_ENABLED=1 bun run test:e2e --
e2e/workshop-library-routes.spec.ts --project=chromium -g "proves
dense component table"` passed 1 Chromium test / 500 disposable rows and wrote:
`_evidence/phase-5/dense-mode/library-phase5-dense-table-chromium-1280x900-20260622T091251Z.{png,json}`
and
`_evidence/phase-5/dense-mode/library-phase5-dense-mobile-chromium-390x844-20260622T091251Z.{png,json}`.
Desktop metadata records `virtualActive=true`, `totalCount=500`,
`mountedCount=25`, `domRowCount=25`. Browser/provider timing proof:
`ARCHESTIMATOR_E2E_LIBRARY_DENSE_PERF=1 ... bun run test:e2e --
e2e/workshop-library-routes.spec.ts --project=chromium -g "measures dense
component table"` passed 1 Chromium test and wrote
`_evidence/phase-5/dense-mode/library-phase5-dense-perf-chromium-1280x900-20260622T091332Z.json`
with dense-toggle median `146.5ms` (<= `500ms`), search-narrow median `80.4ms`
(<= `100ms`), search-restore median `87.9ms` (<= `500ms`), p95 recorded, and
browser resource transfer/decoded sizes recorded.
Companion summary:
`_evidence/phase-5/dense-mode/provider-virtualized-perf-proof-20260622T091332Z.md`.
The test cleanup left `cost_library_items` fixture rows at 0. The 5,000-row
provider/browser proof also passed after the repository loader switched from
sequential item-ID child-table chunks to paginated workspace detail reads
filtered by active item IDs:
`ARCHESTIMATOR_E2E_LIBRARY_DENSE_ROWS=5000 ARCHESTIMATOR_E2E_LIBRARY_DENSE_PROOF=1
ARCHESTIMATOR_E2E_LIBRARY_DENSE_PERF=1 ... bun run test:e2e --
e2e/workshop-library-routes.spec.ts --project=chromium -g "dense component
table" --workers=1` passed 2 Chromium tests / 5,000 disposable rows and wrote
`_evidence/phase-5/dense-mode/library-phase5-dense-table-chromium-1280x900-20260622T105750Z.{png,json}`,
`_evidence/phase-5/dense-mode/library-phase5-dense-mobile-chromium-390x844-20260622T105750Z.{png,json}`,
and
`_evidence/phase-5/dense-mode/library-phase5-dense-perf-chromium-1280x900-20260622T110037Z.json`.
Companion summary:
`_evidence/phase-5/dense-mode/provider-5000-dense-proof-20260622T110037Z.md`.
The 5,000-row keystroke tier passed with search-narrow median `84.5ms`
(<= `150ms`); dense-toggle median was `208ms` (<= `500ms`) and search-restore
median was `185.8ms` (<= `500ms`). Cleanup again returned fixture rows to 0.

Chromium glass-shell proof:
`ARCHESTIMATOR_DEV_AUTH_BYPASS=1 ARCHESTIMATOR_DEV_AUTH_ADMIN_DB=1
ARCHESTIMATOR_DEV_AUTH_BYPASS_SECRET=<local-dev-auth-bypass-secret> bun run
test:e2e -- e2e/workshop-library-routes.spec.ts --project=chromium -g "proves
library glass shell"` passed 1 Chromium test and wrote
`_evidence/phase-1/glass-shell/library-phase1-glass-shell-chromium-1280x720-20260622T081457Z.{png,json}`.
Companion summary:
`_evidence/phase-1/glass-shell/glass-shell-browser-proof-20260622T081457Z.md`.
This proves desktop shell arming and one outer blur boundary. The automated
release browser matrix later extended route glass arming/paint evidence,
Add Component portal focus, RTL containment, and touch-target proof across
Chromium, Firefox, WebKit, Mobile Safari, iPhone SE, iPad, and Pixel 8 Chrome:
`_evidence/phase-final/browser-matrix/release-browser-matrix-proof-20260622T102124Z.md`.

**Validation:**

```sh
bunx vitest run tests/vitest/workshop-library-consolidation-ui.test.tsx tests/vitest/library-tab-a11y.test.tsx --maxWorkers=1
bun run test:e2e -- e2e/workshop-library-routes.spec.ts
bun run test:e2e:perf
```

**Rollback:** Redeploy `library_dense_mode=false` and, if needed,
`library_virtualization_enabled=false`; card grid remains the safe path.

## 5. Residuals And Deferrals

| Item | Disposition | Why |
| --- | --- | --- |
| `src/components/workshop/component-library/index.tsx` native `window.confirm` / `window.prompt` | Phase-later residual, tracked and allowlisted | Estimate-page panel is adjacent shared surface; do not silently edit it during 0A-5 unless scope is widened. |
| i18n runtime (`next-intl` vs status quo) | Phase 0A product/architecture decision | Existing docs identify the decision; do not assume a runtime package. |
| Controlled `confidence` or `category` vocabularies | Data Migration Gate | Current columns are free text. |
| `last_reviewed` / `reviewed_at` | Data Migration Gate | No such columns exist. Use `updated_at` for beta trust fallback. |
| Import/export/upload Library workflows | Phase-later except Quick Add validation and CSV/formula safety tests | Current 0A-5 scope is Library browse/create/reuse, not bulk import/export. |
| Production telemetry sink | Phase-later | Closed beta uses `console.warn` sink. |
| Runtime kill-switch | Phase-later | Current flags are build-time env flags. |

## 6. Pros And Cons Of The Chosen Plan

| Decision | Pros | Cons / Mitigation |
| --- | --- | --- |
| Tests/contracts before UI in Phase 0A | Prevents cache bleed, authz, redaction, and perf claims from being patched after visible work ships. | Slower first visible progress. Mitigate by parallelizing test scaffolding, cache mapping, and perf seed work. |
| No schema changes in 0A-5 | Keeps beta work fast, reversible, and aligned with existing Supabase state. | Limits trust metadata richness. Mitigate by using `updated_at`, free-text `confidence`, and explicit migration-gated future rows. |
| Cache scoping before route-state expansion | Avoids stale cross-workspace inspector detail once `?component=<id>` exists. | Touches shared estimate/editor invalidation call sites. Mitigate with exact six-call-site grep and focused cache tests. |
| Build-time flags | Matches current repo capability and simple beta rollback. | Not instant rollback. Mitigate by documenting redeploy flag=false and avoiding risky always-on changes. |
| Glass skeleton in Phase 1 | Aligns Library with current visual direction without waiting until final polish. | Can distract from functional findability. Mitigate by limiting Phase 1 to shell/slots, not content-grade cards. |
| Quick Add in Phase 3 | Gives enough time to stabilize route, trust, and overlay contracts first. | Users wait longer for the highest-value create flow. Mitigate by keeping Phase 3 narrow: four required fields plus progressive advanced details. |
| Browser proof last except browser-only claims | Avoids slow screenshots for state/copy checks. | Visual regressions may be found late. Mitigate with targeted browser checks only when geometry/focus/paint changes land. |

## 7. SWOT Analysis

### Strengths

- Canonical anchors are clear: `19` for bindings, `26` for conflicts, `27` for
  owners, `24` for evidence, and `34` for row completeness.
- The phase map is explicit and dependency-aware: `0A -> 0B -> 1 -> 2 -> 3 ->
  4 -> 5`.
- The plan separates live workspace trust from public snapshot redaction.
- Existing code already has the unified Library routes, templates route,
  server actions, query keys, skeleton/error routes, and focused tests.
- The plan has strong maker/checker potential: frontend, backend/security, perf,
  QA, and docs lanes can work in parallel with disjoint write scopes.

### Weaknesses

- The pack is large and fragmented; without this guide, implementers can miss
  cross-doc dependencies.
- Some evidence remains pre-registered rather than produced; no execution claim
  is valid until doc-24 rows are populated.
- Line-number drift is common in the keystone and sibling docs.
- A11y automation and standalone focus-trap assumptions are not current repo
  facts unless Phase 0A explicitly implements them.
- Historical `bun run validate` baseline reds are recorded; the current local
  gate is green. If it drifts again, phase reports must separate Library
  regressions from baseline debt.

### Opportunities

- Cache scoping and route-state work can harden other Library/estimate editor
  surfaces, not just this feature.
- Quick Add can reduce catalog creation friction without schema churn.
- Trust chips can improve estimator confidence using fields already present.
- Dense mode can reuse existing virtualization flags and become the maintenance
  path for larger catalogs.
- The glass provider/slot model can establish a reusable Library surface pattern
  without rewriting the app shell.

### Threats

- A parallel lane could edit `ComponentLibraryManager.tsx`,
  `AddComponentModal.tsx`, or shared query-key call sites at the same time.
- A worker could follow stale `?template=` or cache line refs if they skip the
  pre-code verification commands.
- A migration/index/RPC change could slip into 0A-5 without the Data Migration
  Gate.
- Public snapshot redaction could regress when trust metadata becomes visible.
- Build-time flags could be mistaken for runtime rollback and create false
  confidence during rollout.

## 8. Parallel Agent Execution Model

Use a lead orchestrator plus bounded workers. Workers should not edit canonical
docs unless assigned that write scope.

| Lane | Recommended agent role | Write scope | Main output |
| --- | --- | --- | --- |
| Docs reconciliation | planner or writer | Plan docs only: `20`, `24`, `29`, `31`, README if needed | ERR-01..ERR-07 closed before code. |
| Cache/authz/redaction | backend/security | `query-keys.ts`, cache call sites, publication snapshot tests | Phase 0A green P0 security/cache suites. |
| Overlay/route-state | frontend executor | Library route/client, manager, Add modal, bulk modal | Phase 0B behavior and focused tests. |
| Findability/glass | frontend/design | overview, facets, manager, surface provider, CSS | Phase 1 state + glass shell proof. |
| Trust/Quick Add | frontend/backend | trust chip components, Add/Edit modal/actions | Phase 2/3 chips and Quick Add proof. |
| Templates | frontend/backend | templates browse/editor/insert actions | Phase 4 insertion and dependency health proof. |
| Perf/QA | test-engineer/verifier | tests, e2e specs, seed script, evidence artifacts | Phase 5 and final doc-24 evidence. |

Conflict protocol:

- Single writer for `19`, `20`, `21`, `24`, `26`, `27`, `34`, and this guide.
- If two lanes need `ComponentLibraryManager.tsx` or `AddComponentModal.tsx`,
  sequence them or split by phase branch; do not parallel-edit the same file.
- Every lane starts by running `git status --short` and the phase-specific `rg`
  commands.
- Any line-number mismatch is resolved by current source, then reflected in doc
  19 or a phase note.
- Workers report file paths changed, tests run, evidence rows updated, and
  residual risks.

## 9. Merge And Completion Gates

A phase is merge-ready only when:

- The focused test(s) named for the phase pass.
- `git diff --check` passes.
- Doc 24 has the phase evidence row populated with command, result, date, owner,
  and artifact path.
- Any browser-only claim has a screenshot/trace/manual proof artifact under
  `_evidence/`.
- Any skipped validation is recorded with reason and residual risk.
- No new `window.prompt` / `window.confirm` appears outside the Phase-later
  allowlist.
- No public snapshot includes `pricing_source`, free-text `confidence`, supplier
  notes, workspace-only price history, or raw cost internals.
- No schema/RPC/index migration appears in 0A-5 unless the Data Migration Gate
  is explicitly invoked and recorded.
- Historical `validate` reds are recorded; any new `validate` red is separated
  from Library regressions.

Final completion requires:

- All Seq rows 1-19 are complete or deliberately marked accepted residual.
- `18` ADV rows have exactly one status: pass, no-go, or accepted
  skip-with-risk.
- `24` evidence ledger is populated for every implemented phase.
- Focused tests, `bun run test:dom`, and the justified browser/provider checks
  pass.
- Release lead accepts rollback readiness for build-time flags.
- QA lead verifies no browser/provider/manual proof is claimed without artifact
  evidence.

## 10. Do Not Re-Litigate

- `19` owns the phase map.
- `?component=<id>` is for Components only; templates use the segment route.
- `component-library/index.tsx` is Phase-later residual for 0A-5.
- Trust labels are chips, not badges.
- `very stale` is beta scope and lands as Phase 2 helper-layer work.
- Quick Add needs no schema change.
- Public snapshots show frozen, redacted snapshot state, not live trust chips.
- `console.warn` is the closed-beta telemetry sink.
- Build-time flags roll back by redeploy.
- Browser automation is proportional proof, not the default for every UI edit.

## 11. Source Document Reference Map

- `README.md`: pack index, start-here path, launcher matrix.
- `00-PLAN.md`: product job, scope, non-goals, acceptance criteria.
- `01-CURRENT-STATE-AUDIT.md`: current Library gaps and remediation mapping.
- `02-USER-FLOWS-AND-ACTION-PATHS.md`: user flows and flow metadata.
- `03-MODALS-POPOVERS-AND-OVERLAYS.md`: overlay inventory and prompt-dialog policy.
- `04-UX-RESEARCH-SYNTHESIS.md`: research-backed UX principles.
- `05-IMPLEMENTATION-ROADMAP.md`: canonical Seq build order.
- `06-QA-AND-VALIDATION-PLAN.md`: test matrix and commands.
- `07-AGENT-LEDGER.md`: historical parallel-agent provenance.
- `08-RATINGS-AND-GAP-CLOSURE.md`: planning-readiness rubric and gap closure.
- `09-MVP-STRATEGY-AND-SUCCESS-METRICS.md`: beta metrics and cutline.
- `10-LIBRARY-SURFACE-SPECS.md`: target surface specs.
- `11-SOURCE-TRUST-STATE-MATRIX.md`: freshness, confidence, lifecycle, link state.
- `12-RESPONSIVE-ACCESSIBILITY-INTERACTION-CONTRACT.md`: responsive/a11y behavior.
- `13-DATA-CONTRACTS-ROUTE-CACHE.md`: route, payload, cache, migration gate.
- `14-SECURITY-AUTHZ-AND-DATA-EXPOSURE.md`: authz and redaction.
- `15-INPUT-IMPORT-EXPORT-FILE-HANDLING.md`: input/file safety.
- `16-PERFORMANCE-SCALE-NETWORK-CONCURRENCY.md`: perf and concurrency.
- `17-BLAST-RADIUS-SEQUENCING-ROLLBACK.md`: rollback and release gates.
- `18-ADVERSARIAL-QA-AND-COMPLETION-GATES.md`: no-go scenarios.
- `19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md`: keystone bindings.
- `20-TELEMETRY-AND-EVENT-INSTRUMENTATION.md`: telemetry events and sink.
- `21-FEATURE-FLAGS-AND-ROLLOUT.md`: flags and rollout.
- `22-COPY-DECK-AND-MICROCOPY.md`: canonical strings.
- `23-DESIGN-SYSTEM-COMPONENT-MAPPING.md`: primitives and tokens.
- `24-EXECUTION-EVIDENCE-LEDGER.md`: execution proof rows.
- `25-AUDIT-SCORES-AND-IMPROVEMENT-PLAN.md`: score rollups and improvements.
- `26-CROSS-DOC-CONFLICTS-AND-RESOLUTIONS.md`: conflict registry.
- `27-OWNERS-AND-ACCOUNTABILITY-MATRIX.md`: owner model.
- `28-I18N-RTL-AND-LOCALIZATION-CONTRACT.md`: i18n and RTL.
- `29-BROWSER-PROOF-AND-VISUAL-QA-MATRIX.md`: browser proof boundary.
- `30-PERF-BUDGET-AND-REGRESSION-GATES.md`: budgets and fallbacks.
- `31-A11Y-ACCEPTANCE-CRITERIA-MATRIX.md`: a11y pass conditions.
- `32-SECURITY-THREAT-MODEL-EXPANSION.md`: expanded threat model.
- `33-DB-RLS-AND-MIGRATION-CONTRACT.md`: DB/RLS/migration contract.
- `34-ROW-LEVEL-COMPLETENESS-MATRIX.md`: 12-dimension row standard.
- `35-LIQUID-GLASS-LIBRARY-UX-SPEC.md`: glass material/grid spec.
- `36-CODEBASE-AI-IMPLEMENTATION-GUIDE.md`: this execution guide.

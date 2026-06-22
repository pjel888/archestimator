# 00 - Plan

## Exact User Job

As a contractor, estimator, or catalog steward, I need to manage reusable components and templates, quickly find the right reusable item, trust its cost/source context, and reuse it in estimates without losing my place.

## Scope

Included:

- Library overview route: `/workshop/library`.
- Components route: `/workshop/library/components`.
- Templates route: `/workshop/library/templates`.
- Template editor route: `/workshop/library/templates/[templateId]`.
- Library overlays: modals, drawers, docks, popovers, command/search popups, dropdown menus, context menus, confirmation dialogs, and text-prompt dialogs.
- Library-adjacent shared surfaces when they affect consistency, especially the estimate-page component library panel and reusable overlay primitives.

> **12-dim (scope boundary):** Owner: Planning lead | Phase: all | Flag: n/a (scope) | Rollback: n/a | Evidence: n/a | Telemetry: n/a | Copy: n/a | A11y: n/a | Perf: n/a | Browser-proof: n/a | i18n: n/a | Binding: [19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md](19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md) §Verified File Paths

Non-goals:

- Database schema changes unless a future implementation task proves they are required. Quick Add (Phase 3) does NOT require one: every Quick Add field — `name`, `category` (text), `unit`, `unit_cost`, optional `supplier`/`brand`, `pricing_date`, `pricing_source`, `confidence` (free text), `library_folder_id` — already exists as a column on `public.cost_library_items` (see the Quick Add Contract in `19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md`), so this non-goal holds. A controlled `confidence`/`category` vocabulary or any `last_reviewed`/`reviewed_at` column WOULD need a migration and stays deferred behind the Data Migration Gate.
- Production deployment.
- A visual redesign implementation in this planning pass.
- Replacing the whole app shell or changing the global navigation model.
- Reintroducing deprecated standalone `/workshop/components` or `/workshop/templates` surfaces except as redirects.

> **12-dim (non-goal contract):** Owner: Planning lead | Phase: all | Flag: n/a | Rollback: revert any migration PR | Evidence: see [24-EXECUTION-EVIDENCE-LEDGER.md](24-EXECUTION-EVIDENCE-LEDGER.md) §Data Migration Gate | Telemetry: n/a | Copy: n/a | A11y: n/a | Perf: n/a | Browser-proof: n/a | i18n: n/a | Binding: [19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md](19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md) §Canonical Quick Add Contract

## Current Product Decision Constraints

- The unified Library is the canonical hub. Components and templates stay inside `/workshop/library`.
  - **12-dim:** Owner: Planning lead | Phase: all | Flag: n/a | Rollback: n/a | Evidence: n/a | Telemetry: n/a | Copy: n/a | A11y: n/a | Perf: n/a | Browser-proof: n/a | i18n: n/a | Binding: [19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md](19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md) §Verified File Paths
- `DESIGN.md` is a guide, not enforceable law, but its app/workshop density guidance is still the best local baseline.
  - **12-dim:** Owner: Design lead | Phase: all | Flag: n/a | Rollback: n/a | Evidence: n/a | Telemetry: n/a | Copy: n/a | A11y: see [31-A11Y-ACCEPTANCE-CRITERIA-MATRIX.md](31-A11Y-ACCEPTANCE-CRITERIA-MATRIX.md) | Perf: n/a | Browser-proof: n/a | i18n: n/a | Binding: DESIGN.md
- The Library should stay compact, keyboard-friendly, and work-focused.
  - **12-dim:** Owner: A11y lead | Phase: all | Flag: n/a | Rollback: n/a | Evidence: see [24-EXECUTION-EVIDENCE-LEDGER.md](24-EXECUTION-EVIDENCE-LEDGER.md) §final release gate (historical Phase 6 alias) | Telemetry: n/a | Copy: n/a | A11y: see [31-A11Y-ACCEPTANCE-CRITERIA-MATRIX.md](31-A11Y-ACCEPTANCE-CRITERIA-MATRIX.md) | Perf: n/a | Browser-proof: Playwright | i18n: n/a | Binding: [19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md](19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md) §Performance Reality
- Component Library data must preserve source, pricing date, confidence, supplier, lifecycle, and copied estimate snapshots.
  - **12-dim:** Owner: Backend lead | Phase: 0A | Flag: n/a | Rollback: revert data contract PR | Evidence: see [24-EXECUTION-EVIDENCE-LEDGER.md](24-EXECUTION-EVIDENCE-LEDGER.md) §0A | Telemetry: n/a | Copy: see [22-COPY-DECK-AND-MICROCOPY.md](22-COPY-DECK-AND-MICROCOPY.md) | A11y: n/a | Perf: n/a | Browser-proof: n/a | i18n: n/a | Binding: [19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md](19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md) §Data Layer
- Browser automation is not a default planning artifact. Use it later only when it proves a browser-only claim.
  - **12-dim:** Owner: QA lead | Phase: all | Flag: n/a | Rollback: n/a | Evidence: see [29-BROWSER-PROOF-AND-VISUAL-QA-MATRIX.md](29-BROWSER-PROOF-AND-VISUAL-QA-MATRIX.md) | Telemetry: n/a | Copy: n/a | A11y: n/a | Perf: n/a | Browser-proof: see [29-BROWSER-PROOF-AND-VISUAL-QA-MATRIX.md](29-BROWSER-PROOF-AND-VISUAL-QA-MATRIX.md) | i18n: n/a | Binding: [19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md](19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md) §Test Commands
- Older specs that reference standalone `/workshop/templates` or `/workshop/components` are historical context only unless a newer decision explicitly restores them.
  - **12-dim:** Owner: Planning lead | Phase: all | Flag: n/a | Rollback: n/a | Evidence: n/a | Telemetry: n/a | Copy: n/a | A11y: n/a | Perf: n/a | Browser-proof: n/a | i18n: n/a | Binding: [19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md](19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md) §Verified File Paths
- Public/shared proposal surfaces must not expose protected Library source URLs (`pricing_source`), internal notes, confidence labels, or workspace-only price history by default. Per `14`/`19` this is enforced in the snapshot builder that writes `project_publications.snapshot_json` (rendered by `src/app/share/[token]` + `src/app/api/share/[token]/route.ts`), not a live Library endpoint.
  - **12-dim:** Owner: Security lead | Phase: 0A | Flag: n/a | Rollback: revert redaction PR | Evidence: see [24-EXECUTION-EVIDENCE-LEDGER.md](24-EXECUTION-EVIDENCE-LEDGER.md) §ADV-PUBLIC-REDACTION | Telemetry: n/a | Copy: see [22-COPY-DECK-AND-MICROCOPY.md](22-COPY-DECK-AND-MICROCOPY.md) | A11y: n/a | Perf: n/a | Browser-proof: n/a | i18n: n/a | Binding: [19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md](19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md) §Public / Share Snapshot Surface
- Implementation must start with Phase 0A Contract Lock (see the Canonical Phase Map in `19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md`), reconciling `13-DATA-CONTRACTS-ROUTE-CACHE.md`, `14-SECURITY-AUTHZ-AND-DATA-EXPOSURE.md`, and `17-BLAST-RADIUS-SEQUENCING-ROLLBACK.md` to that keystone before UI work.
  - **12-dim:** Owner: Planning lead | Phase: 0A | Flag: n/a | Rollback: n/a | Evidence: see [24-EXECUTION-EVIDENCE-LEDGER.md](24-EXECUTION-EVIDENCE-LEDGER.md) §0A | Telemetry: n/a | Copy: n/a | A11y: n/a | Perf: n/a | Browser-proof: n/a | i18n: n/a | Binding: [19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md](19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md) §Canonical Phase Map (C-006)

## Planning Readiness Rating After Hardening

These are post-audit scores, not aspirational targets. The earlier "95%+ across
the board" claim did not survive the keystone verification pass: several docs
named abstract surfaces, wrong enum values, wrong paths, and a broken test
command. The corrected per-lane scores live in `08-RATINGS-AND-GAP-CLOSURE.md`;
the binding corrections that drove the re-rate are in
`19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md` (keystone). Use those two docs
as the source of truth; the table below is a summary pointer, not an independent
claim.

Numbers in the "After Binding Pass" column are the per-lane closure scores from
`08-RATINGS-AND-GAP-CLOSURE.md` (pull the exact values from there; this is a
summary pointer, not an independent score). They roll up to the pack-wide
post-audit rating recorded in `08`: Strategy 93 / Quality 92 / Readiness 91,
independently verified at the zero-questions gate. The qualifier in parentheses
names what closed the gap.

| Dimension | Initial Lane Score | After Binding Pass | Closure Artifact |
| --- | ---: | ---: | --- |
| Product strategy | 82% | 93 (keystone-bound; beta metrics + cutline added) | `09-MVP-STRATEGY-AND-SUCCESS-METRICS.md` |
| UI/UX specification | 72% | 95 (enum/path corrections reconciled to keystone; per-doc 11 in `08`) | `10-LIBRARY-SURFACE-SPECS.md`, `11-SOURCE-TRUST-STATE-MATRIX.md`, `12-RESPONSIVE-ACCESSIBILITY-INTERACTION-CONTRACT.md` |
| Implementation feasibility | 58% | 98 (route/cache/data/rollback contracts bound to real keys; per-doc 13 in `08`) | `13-DATA-CONTRACTS-ROUTE-CACHE.md`, `17-BLAST-RADIUS-SEQUENCING-ROLLBACK.md`, `19` |
| Security/readiness | 32% | 95 (authz already strong; real gaps are tests + un-scoped key + snapshot redaction; per-doc 14 in `08`) | `14-SECURITY-AUTHZ-AND-DATA-EXPOSURE.md`, `15-INPUT-IMPORT-EXPORT-FILE-HANDLING.md`, `19` |
| QA/adversarial coverage | 72% | 95 (test command corrected; perf claims gated on Phase 0A measurement; per-doc 06 in `08`) | `16-PERFORMANCE-SCALE-NETWORK-CONCURRENCY.md`, `18-ADVERSARIAL-QA-AND-COMPLETION-GATES.md`, `19` |

The sibling docs (11/13/14/16 and the rest) have been reconciled to the keystone
(doc 19) — paths, enums, query keys, the un-scoped-key consumer list, the
`?component=<id>` vs `/templates/[templateId]` route ruling, and the test command
are now consistent pack-wide. The only remaining gap is implementation-only
evidence — rendered UI proof, actual passing tests, live RLS/schema confirmation,
and a measured perf baseline — which by definition cannot be produced from a
planning pass; it is the OUTPUT of the implementation phase, not a planning defect.

> **Caveat (12-dim completeness):** per-doc 12-dimension completeness under the relaxed (gate-rows-only) standard is tracked in `34-ROW-LEVEL-COMPLETENESS-MATRIX.md` §3; the n/a-padded scope/constraint rows above are intentionally informational and not counted toward readiness. The honest per-doc and pack-average scores live in `25-AUDIT-SCORES-AND-IMPROVEMENT-PLAN.md` §1.

## Design Thesis

The Library should feel like a professional source-trust command center in **liquid glass**, not a flat card gallery with scattered actions.

**Glass as a first-class skin.** Both tabs and all modals/drawers adopt the liquid-glass surface system already shipping in the workshop sidebar, dashboard, and estimate sheet — frosted glass over the cool grey canvas with the warm bloom, hairline cool-neutral borders, and one `backdrop-filter` per region armed after first paint via `<html data-glass="ready">`. The mechanism is a per-region **surface-variant slot system** (`librarySurfaceClass(variant, slot)`) that mirrors the proven estimate-sheet slot model (`src/components/workshop/estimate-surface-variant.tsx` → `estimateSurfaceClass`). Slots: `workspaceWell` / `treeRail` / `inspectorDock` / `centerColumn` / `chromeToolbar` / `sheetHeader` / `catalogueCard` / `galleryRow` / `ctaTile` / `countStrip`. Glass overlays: drawers are single-blur glass panels; modals keep a crisp paper interior. Warm-glass CTAs reuse `.dashboard-glass-warm`; content-grade glass cards reuse `.workshop-project-card-glass` (Phase 2 component cards / Phase 5 template rows). Two postures: **Phase 1** ships the glass skeleton (well + rails + paper + chrome + liquid buttons + warm CTA + provider + grids); **Phase 2 / Phase 5** promote catalogue/gallery cards to content-grade glass. The detailed per-region slot map, grid system, overlay treatment, and token/radius contract are the authority for the material layer: `35-LIQUID-GLASS-LIBRARY-UX-SPEC.md`. The current Library is 100 % paper/flat (`bg-white` everywhere, zero glass tokens) — see the scored finding in `01-CURRENT-STATE-AUDIT.md`.

The stable mental model:

- Left side: scope, folder, supplier, brand, or template group.
- Top toolbar: exact search, filters, sort, display mode, create action.
- Center: dense results that support selection, comparison, and quick action.
- Inspector dock (`ComponentInspectorDock.tsx`): source evidence, usage, preview, edit/insert actions, and warnings.
- Modals: short, user-initiated tasks that require interruption.
- Drawers/non-modal docks: longer create/edit/compare tasks that benefit from keeping Library context visible.
- Popovers/menus: lightweight option selection only.

## Priority Problems

1. Exact search does not preserve the selected component (no `?component=<id>` route state on `LibraryPageClient.tsx`; Overview search drops the selection).
2. Native prompt/confirm flows remain in component folder management (`ComponentLibraryManager.tsx` `window.prompt` :1493 (create) / :1515 (rename), `window.confirm` :1534 (delete)) and Add Component draft discard (`AddComponentModal.tsx` `window.confirm` :963); the estimate-page panel `component-library/index.tsx` (:941 confirm / :1467 prompt) carries the same pattern and is Phase-later. (Lines verified 2026-06-21 via `rg -n 'window\.(prompt|confirm)'`.)
3. Trust metadata is strong in some component surfaces but not consistently visible at every reuse decision.
4. Add Component is a very large modal (`AddComponentModal.tsx`, 2359 ln) and mixes quick capture with advanced catalog stewardship; Quick Add splits out the required four (`name`, `category`, `unit`, `unit_cost`).
5. Template insertion does not make the final destination group/area explicit enough; `resolveEstimateTemplateInsertTarget` exists but its resolved target is not disclosed before commit.
6. Applied filter state is too hidden for a professional catalog.
7. Bulk archive copy conflicts with itself: `BulkDestructivePreviewModal.tsx:107-108` sets `confirmationHint = canExecute ? "This action cannot be undone." : ...` gated on `canExecute` rather than on the verb, so a reversible archive action still shows the irreversible "cannot be undone" line. The fix branches the hint on `actionCopy.verb` (archive vs delete — the modal already computes `verb` at `:48`/`:50`), not on `canExecute`. The canonical replacement strings are owned by `22-COPY-DECK-AND-MICROCOPY.md` (archive hint: "Archived components are hidden from browse and blocked from new inserts. You can restore them later."; delete hint: "This permanently removes {n} components from the library. This cannot be undone.") — use those, do not re-author here.
8. Larger libraries will need a denser maintenance mode than cards alone; the card/dense (table-vs-grid) toggle does NOT exist yet (net-new in Phase 5) and should reuse `WORKSHOP_VIRTUALIZATION_FLAGS`.
9. Route-state, payload, cache, and insert-target contracts are not explicit enough for implementation.
10. Cross-workspace authz is ALREADY strong (RLS + `is_workspace_editor`/`can_edit_estimate` defense-in-depth), so the real gaps are explicit gates for: missing TESTS, the one UN-SCOPED cache-bleed key `WORKSPACE_COMPONENT_LIBRARY_QUERY_KEY` (`= ["workspace-component-library"]`, used by `TemplateEditorClient` + the in-estimate dock), and snapshot redaction — not missing authorization.
11. Import/export and file handling are deferred, but their validation and privacy constraints must shape the MVP.
12. Large-list, network failure, and concurrent edit behavior need designed states. (Out-of-order response is NOT a current risk: Components-tab search is client-side synchronous at `ComponentLibraryManager.tsx:876-882`; scope any server-search race handling as future-if-budget-exceeded.)

## Acceptance Criteria

Each criterion below is an outcome assertion; the EXACT proving command, named
assertion/pass criterion, owner, and phase that demonstrates it are pre-registered
one-row-per-criterion in `24-EXECUTION-EVIDENCE-LEDGER.md` (e.g. the route-state
criterion maps to `vitest run tests/vitest/library-route-state-authz.test.tsx`
and the cache criterion to `library-workspace-switch-cache.test.tsx`). Producing
that evidence is the build phase; pre-registering it is what makes these criteria
implementation-ready rather than open questions.

A future implementation should be considered successful when:

- From Overview search or recent components, selecting a component sets `?component=<id>` on `LibraryPageClient.tsx` and opens the Components tab with that component selected, highlighted, and visible in the inspector dock.
- All Library-owned native prompts/confirms are replaced by shared dialogs or modals with clear labels, validation, cancel behavior, and focus return. (Phase-later residual: `component-library/index.tsx:941` (`window.confirm`) + `:1467` (`window.prompt`) remain allowlisted per LIB-LATER-01.)
- Component cards, overview cards, template rows, and preview/inspector surfaces expose enough source/trust state to decide whether reuse is safe.
- Add Component supports a fast path with only required catalog fields and keeps advanced details progressive.
- Template insert flows disclose the destination target before commit and recover inline from empty/error states.
- Applied facet/filter state is visible outside the filter popover and can be reset at the per-facet and global level (facets are the `component-facet-filter.tsx` axes — distinct from the required `category` taxonomy and the optional `library_folder_id` organization axis; do not conflate them).
- Keyboard behavior is defined for tabs, search comboboxes, menus, tree views, dialogs, drawers, and escape/close sequencing.
- Targeted jsdom (`tests/vitest/*.test.tsx`) coverage proves route state, modal behavior, cache behavior, and action payloads before any browser proof, run via `bun run test:dom` / `vitest run tests/vitest/<file>` (NOT `bun test`).
- Actor capability, RLS/authz, cross-workspace IDOR, public/private redaction, and workspace-switch cache behavior are tested or explicitly blocked before release.
- Selected component/template route params fail safely, preserve surrounding search/filter context, and do not leak cross-workspace object existence.
- Large-list behavior has a rendering fallback (reusing `WORKSHOP_VIRTUALIZATION_FLAGS` from `src/lib/workshop/virtualization-flags.ts`) once a MEASURED beta-scale threshold is reached. Note per `16`/`19`: Components-tab search is 100% client-side synchronous (`ComponentLibraryManager.tsx:876-882`), so no out-of-order/stale-response race exists today and no Postgres FTS/trigram index exists yet — server-search is FUTURE-if-budget-exceeded; the live perf risk is the eager full nested detail graph in the browse fetch.
- Network, stale target, and concurrent edit failures preserve safe user context and never silently mutate a different estimate, folder, component, or template.
- Glass surfaces arm blur only after first paint + idle via the `<html data-glass="ready">` path (one `backdrop-filter` per region, never stacked); glass slots degrade to `--glass-bg-fallback` when readiness is unset; jsdom never asserts blur, only Playwright does (per `35-LIQUID-GLASS-LIBRARY-UX-SPEC.md` §8/§11 and `29-BROWSER-PROOF-AND-VISUAL-QA-MATRIX.md`).
- Rollback/fix-forward plans exist for each phase before implementation begins.

## Beta Outcome Metrics

Instrumentation for these lives in `20-TELEMETRY-AND-EVENT-INSTRUMENTATION.md`;
each metric below is tagged manual (measured by hand during a usability/QA pass)
or instrumented (emits a telemetry event). The implementation pass should prove
or instrument:

- A seeded user can find a known component or template from `/workshop/library` in under 30 seconds. (manual — usability timing)
- At least 90% of visible component cards/rows expose enough information to classify pricing as current, stale (`pricing_date` aged past the 90-day window), missing, or low confidence. (manual — render audit against `getComponentPricingFreshness`)
- A user can insert a component or template into the intended estimate without losing search/filter context. (instrumented — insert event from `20-TELEMETRY`)
- A user can create a basic component through Quick Add in under 90 seconds. (instrumented — quick-add submit event; timing manual)
- Public/shared surfaces show zero private source URLs (`pricing_source`), internal supplier notes, confidence labels, or workspace-only price-history fields. Note per `14`/`19`: the public surface (`src/app/share/[token]` + `src/app/api/share/[token]/route.ts`) renders a FROZEN `project_publications.snapshot_json`, so this is a snapshot-builder redaction assertion, not a live-endpoint leak. (manual — snapshot-content review)

## Expected File Areas

Primary file areas likely to change later (paths verified against
`19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md` — defer to that keystone if any
path drifts):

- `src/components/workshop/library/overview/LibraryOverviewSearch.tsx` (overview search continuity)
- `src/components/workshop/library/overview/LibraryOverview.tsx` (hardcoded "90 days" string at :114; recent rows)
- `src/components/workshop/LibraryPageClient.tsx` (route-state owner for `?component=<id>`)
- `src/components/workshop/component-library-manager/ComponentLibraryManager.tsx` (1695 ln; `window.prompt` folder create :1493 / rename :1515, `window.confirm` delete :1534, client-side search :876-882)
- `src/components/workshop/component-library-manager/AddComponentModal.tsx` (2359 ln; native `window.confirm` "Discard this component draft?" :963)
- `src/components/workshop/BulkActionToolbar.tsx` (NOT under `component-library-manager/`; shared primitive at `src/components/ui/bulk-action-toolbar.tsx`)
- `src/components/workshop/BulkDestructivePreviewModal.tsx` (`confirmationHint` at :107-108 — the archive-copy fix)
- `src/components/workshop/library/ComponentInspectorDock.tsx` (315 ln; the "inspector dock")
- `src/components/workshop/library/component-facet-filter.tsx` (exports `COMPONENT_FACET_STALE_DAYS=90`, `getComponentPricingFreshness`)
- `src/components/workshop/component-library/index.tsx` (estimate-page component-library panel; still native `window.confirm` :941 / `window.prompt` :1467 — in 00-PLAN scope, treat as Phase-later)
- `src/components/workshop/library/templates-browse/TemplatesBrowseManager.tsx` (already migrated off native prompts; source of the inline `ConfirmDialog`+input pattern at :531-883)
- `src/components/workshop/library/templates-browse/InsertIntoEstimatePicker.tsx` (already a `Modal`)
- `src/components/workshop/library/template-editor/TemplateEditorClient.tsx` (already migrated off native prompts)
- Shared overlays under `src/components/ui/overlays/` and `src/components/ui/` — see `23-DESIGN-SYSTEM-COMPONENT-MAPPING.md` for the primitive map and z-index tiers

Expected test areas:

- `tests/vitest/library-overview.test.tsx`
- `tests/vitest/library-tabs-layout.test.tsx`
- `tests/vitest/library-tab-a11y.test.tsx`
- `tests/vitest/workshop-library-consolidation-ui.test.tsx`
- `tests/vitest/library-components-cache.test.tsx`
- `tests/vitest/library-templates-cache.test.tsx`
- `tests/vitest/library-folder-tree-selection.test.tsx`
- `tests/vitest/template-gallery.test.tsx`
- `tests/vitest/template-editor.test.tsx`
- `tests/vitest/new-template-modal.test.tsx`
- Shared primitive tests such as `ui-modal-tooltip.test.tsx`, `ui-dropdown-popup-core.test.tsx`, `ui-dropdown-select.test.tsx`, and `ui-tabs.test.tsx`

These jsdom suites run under `bun run test:dom` (all) or `vitest run tests/vitest/<file>` (one). Do NOT use `bun test tests/vitest/<f>`: `bun test` is bound to `tests/unit` and silently ignores the vitest suites (the doc 06 instruction to the contrary is a known bug, corrected in `19`). No axe / jest-axe harness exists, so a11y coverage is manual ARIA/focus assertions unless `jest-axe` is added as an explicit prerequisite. Full gate: `bun run validate`.

## Implementation Phases

Phase labels and order are canonical and owned by
`19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md` ("Canonical Phase Map"; C-006).
This section is a summary; defer to the keystone for the authoritative version.
Order: **0A -> 0B -> 1 -> 2 -> 3 -> 4 -> 5**. Per-phase rollback maps to feature
flags in `21-FEATURE-FLAGS-AND-ROLLOUT.md`; rollback for build-time env flags is
redeploy-based (fix-forward), not an instant kill-switch (C-010). Sizes below are
rough planning estimates for sequencing, not commitments.

### Phase 0A - Contract Lock

Lock the data/route/cache/security/performance contracts and stand up the test
scaffolding before any UI work:

- Reconcile docs `13`/`14`/`15`/`16`/`17` to the keystone bindings in `19`.
- Scaffold route-state, authz, cache-isolation, and stale-target tests (the
  authz gaps are TESTS, not missing authorization — cross-workspace authz is
  already strong via `is_workspace_editor` / `can_edit_estimate`).
- Extend `scripts/seed-performance-test-data.ts` to seed N `cost_library_items`
  (it does not cover that table today) and MEASURE the browse baseline before any
  perf budget number is asserted.

Why first: richer source metadata and deeper route state create cache and
privacy risk unless the un-scoped `WORKSPACE_COMPONENT_LIBRARY_QUERY_KEY`,
snapshot redaction, stale-target, and workspace-switch behavior are specified
first.

Exit criteria: docs 13/14/16 cite no abstract surface that the keystone
contradicts; route-state/authz/cache test stubs exist and run under
`bun run test:dom`; a measured browse-payload baseline number is recorded.
Rough size: M (contracts + test scaffolding, little UI).

### Phase 0B - Overlay and Route-State Reliability

Replace the folder native prompts in `ComponentLibraryManager.tsx`
(`window.prompt` create :1493 / rename :1515, `window.confirm` delete :1534) and
the Add dirty-discard `window.confirm` in `AddComponentModal.tsx` (:963) with the
inline `ConfirmDialog`+input "text-prompt dialog" pattern reused from
`TemplatesBrowseManager.tsx:529` (the inline pattern, post the 2026-06-21 line
verify); add `?component=<id>` route state owned by
`LibraryPageClient.tsx`; fix the bulk-archive copy in
`BulkDestructivePreviewModal.tsx:107-108`. Folder-prompt replacement lands HERE
(early), NOT after Quick Add.

Why early: it removes the most visible inconsistency and gives later flows stable
routing and focus behavior.

Exit criteria: zero Library-owned `window.prompt`/`window.confirm` in the
Phase-0B files (estimate-page panel `component-library/index.tsx` is Phase-later);
deep-link `?component=<id>` selects + scrolls the component into the inspector
dock; archive confirmation copy no longer contradicts itself (see Deletion
Criteria). Rough size: M.

### Phase 1 - Findability and Applied Filters

Carry Overview search selection through to `?component=<id>` (entry point
`LibraryOverviewSearch.tsx`); add visible applied-filter chips + reset at the
facet and global level; add a result count / scope strip.

Why second: users must find the right reusable item before any deeper
creation/edit work matters.

Exit criteria: selecting from Overview search opens the Components tab with that
component selected/highlighted/in the inspector dock; active facets are visible
outside the filter popover with a working reset; a result count reflects the
current scope. Rough size: M.

### Phase 2 - Source Trust at Decision Points

Render trust chips on overview/recent/template rows, the inspector dock, and the
insert surfaces, bound to real columns/helpers: `pricing_date` via
`getComponentPricingFreshness` and `getStalenessTone`/`getStalenessLabel`,
`confidence` (FREE TEXT, derive a label — no enum exists), and the five
`component_lifecycle_state` values. Use `updated_at` for recency; there is NO
`last_reviewed`/`reviewed_at` column, so any "last reviewed" cue is re-scoped to
`updated_at` or gated behind a Data Migration Gate.

Why third: beta users need cost confidence and source provenance at the moment of
reuse.

Exit criteria: each reuse surface exposes pricing freshness, confidence, and
lifecycle bound to the named helpers/columns; no chip relies on a non-existent
column. Rough size: M-L (spans several surfaces).

### Phase 3 - Add/Edit Component Flow Split (Quick Add)

Add a quick-add required-field path (name, category, unit, unit_cost — see the
Quick Add Contract in `19`) and keep advanced variants, attachments, measurement
metadata, activity, and source evidence progressive; normalize the Add/Edit
source fields so both forms write the same columns.

Why fourth: this is the largest implementation surface and depends on the overlay
policy landed in 0B.

Exit criteria: a basic component is creatable through the required-four path
without touching advanced sections; Add and Edit write identical source columns;
no schema change is introduced (all columns already exist). Rough size: L.

### Phase 4 - Templates Browse, Insert, and Editor Clarity

Make the insert destination explicit via `resolveEstimateTemplateInsertTarget`
(name this resolver in flow docs 02/13); use `ui/creatable-combobox.tsx` for the
template-group move control; carry a template trust summary (a COMPUTED JOIN over
`source_library_item_id` / `link_state`, not stored fields) into preview/editor
decisions.

Why fifth: templates are powerful but less foundational than component
findability for the immediate Library hub.

Exit criteria: insert discloses the resolved target before commit and recovers
inline from empty/error states; group move uses the creatable-combobox; template
rows show a trust summary. Rough size: M-L.

### Phase 5 - Dense Maintenance Mode and Browser-Proven Polish

Add a card/dense (table-vs-grid) toggle — the density toggle does NOT exist yet,
so this is net-new — reusing `WORKSHOP_VIRTUALIZATION_FLAGS` /
`@tanstack/react-virtual` from `src/lib/workshop/virtualization-flags.ts` rather
than adding a parallel virtualizer; then run browser/manual proof for sticky
headers, portal placement, scroll containment, mobile layout, and keyboard
journeys.

Why last: dense maintenance is valuable at scale, but it should land after source
trust and route/overlay consistency.

Exit criteria: the dense mode reuses the existing virtualization flags;
browser-only claims (sticky headers, portals, scroll containment, mobile,
keyboard) have matching screenshot/manual proof. **Glass + density collision:** glass card geometry holds at dense row heights (no blur-induced jank at >500 rows; measured per `30-PERF-BUDGET-AND-REGRESSION-GATES.md`); per-region glass slots degrade to `--glass-bg-fallback` (`#fbfbfc`) when `<html data-glass="ready">` is unset; jsdom never asserts blur, only Playwright does (per `29-BROWSER-PROOF-AND-VISUAL-QA-MATRIX.md`). See `35-LIQUID-GLASS-LIBRARY-UX-SPEC.md` §4.2/§11 for the card-glass + virtualization guardrails. Rough size: L.

## Deletion Criteria

Remove or retire:

- Library-owned `window.prompt` and `window.confirm` calls.
- Duplicate one-off modal/popup patterns where a shared overlay primitive exists.
- The `BulkDestructivePreviewModal.tsx:107-108` `confirmationHint` that shows "This action cannot be undone." for a reversible archive because it is gated on `canExecute` instead of `actionCopy.verb` — rebind the irreversible-warning copy to the verb so archive (reversible) and delete (irreversible) read correctly (canonical archive/delete hint strings owned by `22-COPY-DECK-AND-MICROCOPY.md`, not re-authored here).
- Any hidden or non-shareable route state that prevents returning to the selected component or template context.
- Any helper layer that exists only to work around an overlay or route-state limitation fixed by this plan.

## Stop Condition

Stop the future implementation loop only when targeted tests pass, the changed route/action behavior is verified, browser-only claims have matching browser proof or are explicitly out of scope, and remaining risks are documented.

> **12-dim:** Owner: Planning lead | Phase: final release gate (historical Phase 6 alias) | Flag: library_release_ready | Rollback: redeploy previous build | Evidence: see [24-EXECUTION-EVIDENCE-LEDGER.md](24-EXECUTION-EVIDENCE-LEDGER.md) §final release gate | Telemetry: n/a (gate event) | Copy: n/a | A11y: n/a | Perf: n/a | Browser-proof: Playwright | i18n: n/a | Binding: [19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md](19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md) §Test Commands

---

# Appendix A — Implementation Control Tables

## A.0 Phase / rollback / flag matrix

| Phase | Owner | Flag (from [21](21-FEATURE-FLAGS-AND-ROLLOUT.md)) | Rollback | Evidence | Telemetry gate |
| --- | --- | --- | --- | --- | --- |
| 0A Contract Lock | Backend lead | library_contract_lock_enabled | Revert schema/cache test stubs; keep keystone bindings | [24](24-EXECUTION-EVIDENCE-LEDGER.md) §0A | n/a |
| 0B Overlay & Route-State Reliability | Frontend lead | library_overlays_v2 | Redeploy with `library_overlays_v2=false` (fix-forward) | [24](24-EXECUTION-EVIDENCE-LEDGER.md) §0B | overlay_opened, overlay_closed |
| 1 Findability & Applied Filters | Frontend lead | library_findability_v2 | Redeploy with `library_findability_v2=false` | [24](24-EXECUTION-EVIDENCE-LEDGER.md) §1 | component_selected, filter_reset |
| 2 Source Trust at Decision Points | Backend lead | library_trust_chips | Redeploy with `library_trust_chips=false` | [24](24-EXECUTION-EVIDENCE-LEDGER.md) §2 | trust_chip_exposed, insert_target_confirmed |
| 3 Quick Add | Frontend lead | library_quick_add | Redeploy with `library_quick_add=false` | [24](24-EXECUTION-EVIDENCE-LEDGER.md) §3 | quick_add_opened, quick_add_submitted |
| 4 Templates Clarity | Frontend lead | library_templates_clarity | Redeploy with `library_templates_clarity=false` | [24](24-EXECUTION-EVIDENCE-LEDGER.md) §4 | template_insert_target_resolved |
| 5 Dense Maintenance & Polish | Frontend lead | library_dense_mode | Redeploy with `library_dense_mode=false` | [24](24-EXECUTION-EVIDENCE-LEDGER.md) §5 | view_mode_changed |

## A.1 12-dimension completeness checklist

Every actionable row in this doc satisfies the [34-ROW-LEVEL-COMPLETENESS-MATRIX.md](34-ROW-LEVEL-COMPLETENESS-MATRIX.md) standard under the relaxed scope (implementation tasks, acceptance gates, high-risk contract rows). Delegation shorthand used here:

- **Owner:** named role from [27-OWNERS-AND-ACCOUNTABILITY-MATRIX.md](27-OWNERS-AND-ACCOUNTABILITY-MATRIX.md) §2.
- **Phase:** canonical 0A → 5 from [19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md](19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md) §Canonical Phase Map.
- **Flag:** from [21-FEATURE-FLAGS-AND-ROLLOUT.md](21-FEATURE-FLAGS-AND-ROLLOUT.md) §registry; `n/a` only when the row is pre-flag scaffolding.
- **Rollback:** from [17-BLAST-RADIUS-SEQUENCING-ROLLBACK.md](17-BLAST-RADIUS-SEQUENCING-ROLLBACK.md); redeploy-based because flags are build-time env (C-010).
- **Evidence:** exact row in [24-EXECUTION-EVIDENCE-LEDGER.md](24-EXECUTION-EVIDENCE-LEDGER.md) or the owning phase section.
- **Telemetry:** event from [20-TELEMETRY-AND-EVENT-INSTRUMENTATION.md](20-TELEMETRY-AND-EVENT-INSTRUMENTATION.md) or `n/a` for non-user rows.
- **Copy:** key from [22-COPY-DECK-AND-MICROCOPY.md](22-COPY-DECK-AND-MICROCOPY.md) or `n/a` for non-UI rows.
- **A11y:** criterion from [31-A11Y-ACCEPTANCE-CRITERIA-MATRIX.md](31-A11Y-ACCEPTANCE-CRITERIA-MATRIX.md) or delegated.
- **Perf:** budget from [30-PERF-BUDGET-AND-REGRESSION-GATES.md](30-PERF-BUDGET-AND-REGRESSION-GATES.md) or `n/a`.
- **Browser-proof:** jsdom vs Playwright from [29-BROWSER-PROOF-AND-VISUAL-QA-MATRIX.md](29-BROWSER-PROOF-AND-VISUAL-QA-MATRIX.md).
- **i18n:** rule from [28-I18N-RTL-AND-LOCALIZATION-CONTRACT.md](28-I18N-RTL-AND-LOCALIZATION-CONTRACT.md) or `n/a`.
- **Binding:** file:line from [19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md](19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md).

## A.2 No-go list — what must never ship without proof

| # | Item | Why | Proof required | Owner | Phase |
| --- | --- | --- | --- | --- | --- |
| 1 | `?component=<id>` route-state ambiguity | Loses exact search intent, risks object-existence leak | `vitest run tests/vitest/library-route-state-authz.test.tsx` passes | Frontend lead | 0B |
| 2 | Un-scoped `WORKSPACE_COMPONENT_LIBRARY_QUERY_KEY` | Cross-workspace cache bleed | `vitest run tests/vitest/library-workspace-switch-cache.test.tsx` passes | Backend lead | 0A/0B |
| 3 | Snapshot builder writes protected fields to `snapshot_json` | Leaks `pricing_source`, notes, confidence, price history | `ADV-PUBLIC-REDACTION` passes | Security lead | 0A |
| 4 | Native `window.prompt`/`window.confirm` in Library-owned files | Breaks overlay consistency and focus control | `rg -n "window\.(prompt\|confirm)"` returns zero in `ComponentLibraryManager.tsx`, `AddComponentModal.tsx` (estimate-page panel `component-library/index.tsx:941`+`:1467` is the Phase-later allowlisted residual per LIB-LATER-01) | Frontend lead | 0B |
| 5 | `resolveEstimateTemplateInsertTarget` resolves to stale/cross-workspace estimate | Could mutate wrong estimate | `ADV-INSERT-STALE-TARGET` passes | Backend lead | 4 |
| 6 | Perf budget claimed without Phase 0A baseline | Numbers would be fabricated | Seed `cost_library_items` + measured browse baseline in [24](24-EXECUTION-EVIDENCE-LEDGER.md) §0A | Perf lead | 0A |
| 7 | Phase rollback = "manually undo everything" | No safe backout | Each phase has a named flag in [21-FEATURE-FLAGS-AND-ROLLOUT.md](21-FEATURE-FLAGS-AND-ROLLOUT.md) §registry | Release lead | 0A |

## A.3 Critical bindings inline summary

The five contracts most often referenced by implementers (lines re-verified 2026-06-21 via `rg -n`; the keystone remains the canonical source — these are the inline shortcuts so an engineer does not have to bounce between docs for the 5 most-cited facts):

1. **Route state:** `?component=<id>` is owned by `src/components/workshop/LibraryPageClient.tsx`; there is no segment detail route for components. Template detail uses the shipped segment `/workshop/library/templates/[templateId]` — do NOT add `?template=<id>` (C-008). Binding: [19](19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md) §Verified File Paths.
2. **Un-scoped cache key (6 call sites, re-verified 2026-06-21):** `WORKSPACE_COMPONENT_LIBRARY_QUERY_KEY = ["workspace-component-library"]` defined at `src/lib/component-library/query-keys.ts:7`; the SIX call sites that must migrate to `workspaceComponentLibraryQueryKey(workspaceId)` in lockstep are — reader via inline literal `src/components/workshop/library/template-editor/TemplateEditorClient.tsx:160`, self-invalidate same-file `:166`, `src/components/workshop/LibraryPageClient.tsx:126`, `src/hooks/use-estimate-row-mutations.ts:413`, and the two EstimateSheetContent writers `src/components/workshop/EstimateSheetContent.tsx:1300` (`refetchType: "none"`) + `:1303` (`refetchType: "active"`). (Note: the keystone doc 19 ledger entry cites `:432`/`:1299`+`:1302`; the verified 2026-06-21 truth is `:413`/`:1300`+`:1303` — flagged in `LOOP_LEDGER.md` §3 for lead reconciliation.) Binding: [19](19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md) §Query Keys.
3. **Quick Add requires no schema change:** required fields `name`, `category` (text), `unit`, `unit_cost` already exist on `public.cost_library_items`; `library_folder_id` is optional. Save path is `createCostLibraryComponent` (`src/lib/component-library/actions.ts:461`) -> RPC `create_cost_library_component`; write guarded by `rpc("is_workspace_editor",{target_workspace_id})` (viewer blocked). Binding: [19](19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md) §Canonical Quick Add Contract (C-011).
4. **Archive vs delete:** "Archive" = soft-delete (`lifecycle_state = archived`, recoverable); "Delete" = hard-delete/permanent. Bulk archive copy at `src/components/workshop/BulkDestructivePreviewModal.tsx:107-108` (`confirmationHint = canExecute ? ...`) must branch on `actionCopy.verb` (derived at `:84` from `getActionCopy(executeLabel)` defined `:45`), not on `canExecute` (C-013). Binding: [19](19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md) §Enums.
5. **Component-library/index.tsx is Phase-later residual:** the estimate-page panel `src/components/workshop/component-library/index.tsx` carries native `window.confirm` :941 / `window.prompt` :1467; it is tracked, guarded against regression, but not in the 0A–5 critical path (C-003 / C-017). Binding: [19](19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md) §In-scope adjacent live file.

> **Drift caveat (12-dim binding hygiene):** the cache-bleed line drift above is the #1 Quality killer — every Library doc must cite the verified `:413` + `:1300`+`:1303` + component-library `:941`+`:1467` lines, not the older numbers. Doc 19's reconciliation (per `LOOP_LEDGER.md` §1 keystone-bindings-agent entry) is the previous snapshot; this doc carries the re-verified snapshot.

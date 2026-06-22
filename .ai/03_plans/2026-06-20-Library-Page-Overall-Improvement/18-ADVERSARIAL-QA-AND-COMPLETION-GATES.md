# 18 - Adversarial QA And Completion Gates

All scenario IDs, test commands, file paths, query keys, enums, columns, and
action/RPC names in this doc bind to
`19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md` (keystone). When this doc and the
keystone disagree, the keystone wins. Phase labels follow the canonical phase map
(0A Contract Lock -> 0B Overlay & Route-State Reliability -> 1 Findability &
Applied Filters -> 2 Source Trust at Decision Points -> 3 Add/Edit Component Flow
Split (Quick Add) -> 4 Templates Browse/Insert/Editor Clarity -> 5 Dense
Maintenance Mode & Browser-Proven Polish).

## Purpose

This document is the hostile validation map for the implementation pass. It
turns the plan into proof obligations.

### Cross-doc resolutions bound to this doc

> **C-005 RESOLVED:** The canonical jsdom command is `bun run test:dom`; the
> canonical E2E command is `bun run test:e2e`. NEVER use bare `bun test` for
> vitest suites. See
> [26-CROSS-DOC-CONFLICTS-AND-RESOLUTIONS.md](26-CROSS-DOC-CONFLICTS-AND-RESOLUTIONS.md) C-005.

> **C-014 RESOLVED:** The axe / jest-axe harness is a **Phase 0A deliverable**.
> Pre-0A, a11y verification is manual ARIA / focus / keyboard testing. Post-0A,
> every Library component must pass automated axe. See
> [31-A11Y-ACCEPTANCE-CRITERIA-MATRIX.md](31-A11Y-ACCEPTANCE-CRITERIA-MATRIX.md) §3
> and [26-CROSS-DOC-CONFLICTS-AND-RESOLUTIONS.md](26-CROSS-DOC-CONFLICTS-AND-RESOLUTIONS.md) C-014.

### 12-dimension row template for ADV scenarios

Every adversarial scenario row below satisfies the
[34-ROW-LEVEL-COMPLETENESS-MATRIX.md](34-ROW-LEVEL-COMPLETENESS-MATRIX.md)
standard. The compact inline form is:

```
Owner: <role> | Phase: <phase> | Flag: <flag> | Rollback: <behavior> | Evidence: EV-<n> | Telemetry: <event> | Copy: <key> | A11y: <criterion> | Perf: <budget> | Browser-proof: <boundary> | i18n: <rule> | Binding: <file:line>
```

For dimensions delegated to a companion doc, use `see <doc> §<section>`. For
truly not-applicable dimensions use `n/a` with a one-line justification.

## Adversarial Scenario Matrix

### Scenario coverage map (closes doc-25 §3 gaps for this doc)

> Doc 25 §3 names five gaps for this doc. Each is closed by an existing row in
> the matrix below; this map is the auditor's index so the closure does not
> have to be re-derived per audit pass. Row IDs match the matrix verbatim.

| Doc-25 §3 gap for doc 18 | Closed by matrix row | Evidence ID |
|---------------------------|----------------------|-------------|
| Telemetry-verification row per adverse scenario | `ADV-TELEMETRY-EMITS` (every `library_*` event in doc 20 emits to its beta sink with the documented payload; no double-fire; no wrong-surface fire) | EV-18-023 |
| Visual-regression / proof row for dense-mode + mobile | `ADV-VISUAL-DENSE-MOBILE` (card/dense toggle, chip wrapping, column overflow, touch targets; Safari iOS + Chrome Android at sm/md) + `ADV-VISUAL-GLASS` (glass one-blur-per-region, AA contrast, deferred arming) | EV-18-019, EV-18-022 |
| Dedicated copy/microcopy verification row | `ADV-COPY-MICROCOPY` (every error/denial/destructive/trust string matches doc 22; no raw hardcoded assertions except where 22 delegates) | EV-18-020 |
| Owner/phase column per scenario | The inline `Owner: <role> | Phase: <phase> | ...` 12-dim metadata on EVERY matrix row (owner roles from doc 27 §2; phases from the keystone phase map) | every row |
| Single "all scenarios green" summary criterion tied to a release artifact | `ADV-RELEASE-ARTIFACT` (a single release artifact proves every implemented ADV scenario passed exactly once; P0 rows green; N/FUTURE rows explicitly N/A) | EV-18-021 |



The `ADV-*` IDs below are the **single source of truth** shared with
`06-QA-AND-VALIDATION-PLAN.md`; this doc (18) owns the ID set. Doc 06 references
the same **canonical** IDs (it does not use the alias tokens; it describes each
folded case in prose) with the same owning test files and run commands; the two
matrices MUST NOT drift. Each row
names the owning test file, the exact run command (`vitest run` for jsdom suites
— never `bun test`, which is bound to `tests/unit` and silently skips
`tests/vitest/*.test.tsx`; Playwright via `bun run test:e2e`), and a severity
(P0 release-blocking / P1 ship-gating for its phase / P2 polish). The
prose-only rows of earlier drafts ("Discontinued insert", "Source changed after
insert picker", "Screen reader route open", "Import/export future path") fold
into the canonical IDs noted in the row's Notes column. The discharge aliases
(referenced in doc 06's prose as folded cases, not as standalone IDs) are each
defined inline against their canonical row here:
`ADV-SR-ROUTE-OPEN` -> `ADV-DELETED-RESULT`; `ADV-QUICKADD-NETWORK` ->
`ADV-QUICKADD-UNSAFE`; `ADV-FOLDER-DELETE-CHILDREN` -> `ADV-FOLDER-DELETE-FAIL`;
`ADV-SOURCE-CHANGED` and `ADV-TARGET-DELETED` -> `ADV-XWS-ESTIMATE-TARGET`;
`ADV-BULK-PARTIAL-IDS` -> `ADV-BULK-COPY`.

| ID | Severity | Phase | Attack / Failure | Required Outcome | Owning test + command | 12-dim metadata |
| --- | --- | --- | --- | --- | --- | --- |
| ADV-XWS-COMPONENT-PARAM | P0 | 0A | User edits `?component=<id>` to a foreign-workspace `cost_library_items.id`. | Permission-safe not-found/denied via RLS; no object detail leaked. | `vitest run tests/vitest/library-route-state-authz.test.tsx` (net-new) | Owner: Security lead \| Phase: 0A \| Flag: n/a \| Rollback: n/a \| Evidence: EV-18-001 \| Telemetry: `route_state_authz_denied` must fire once with `{component_id, workspace_id, outcome: "denied"}` \| Copy: see 22 §permission-denied \| A11y: see 31 §4 Public snapshot \| Perf: n/a \| Browser-proof: jsdom \| i18n: n/a \| Binding: LibraryPageClient.tsx route state (doc 19) |
| ADV-XWS-ESTIMATE-ACTION | P0 | 0A | `resolveEstimateTemplateInsertTarget` invoked with a stale/foreign estimate ID. | Server rejects via `rpc("can_edit_estimate",{target_estimate_id})`; no mutation. | `vitest run tests/vitest/estimate-insert-target-authz.test.tsx` (net-new) | Owner: Security lead \| Phase: 0A \| Flag: n/a \| Rollback: n/a \| Evidence: EV-18-002 \| Telemetry: `insert_target_authz_denied` must fire once with `{estimate_id, workspace_id, outcome: "denied"}` \| Copy: see 22 §permission-denied \| A11y: n/a \| Perf: n/a \| Browser-proof: jsdom (server action) \| i18n: n/a \| Binding: resolveEstimateTemplateInsertTarget + can_edit_estimate (doc 19) |
| ADV-WS-SWITCH-CACHE | P0 | 0A | User switches workspace with the inspector dock open. | `WORKSPACE_COMPONENT_LIBRARY_QUERY_KEY` (today un-scoped `["workspace-component-library"]`) clears/refetches; no prior-workspace detail visible. | `vitest run tests/vitest/library-workspace-switch-cache.test.tsx` (net-new) | Owner: Backend lead \| Phase: 0A \| Flag: n/a \| Rollback: n/a \| Evidence: EV-18-003 \| Telemetry: `workspace_switched` then `cache_invalidated` with `{query_key}` \| Copy: n/a \| A11y: n/a \| Perf: n/a \| Browser-proof: jsdom \| i18n: n/a \| Binding: WORKSPACE_COMPONENT_LIBRARY_QUERY_KEY (doc 19) |
| ADV-PUBLIC-REDACTION | P0 | 0A | Public `/share/[token]` snapshot includes private source metadata. | The snapshot builder (`src/lib/publication/actions.ts`, writes `snapshot_json` at `:653` and `p_snapshot_json` RPC params at `:577`/`:716`, with helper context in `activity-helpers.ts`) field-selects so `pricing_source`, `confidence`, and price history never enter `project_publications.snapshot_json` — redaction is what the builder serializes, NOT a live library endpoint. Folds in "Import/export future path". | `vitest run tests/vitest/share-snapshot-redaction.test.tsx` (net-new) | Owner: Security lead \| Phase: 0A \| Flag: n/a \| Rollback: n/a \| Evidence: EV-18-004 \| Telemetry: `snapshot_redaction_verified` must fire once per snapshot build \| Copy: see 22 §public-snapshot \| A11y: see 31 §4 Public snapshot \| Perf: n/a \| Browser-proof: jsdom \| i18n: n/a \| Binding: src/lib/publication/actions.ts snapshot_json :653, p_snapshot_json :577/:716 (doc 19; verified 2026-06-21) |
| ADV-VIEWER-MUTATION | P0 | 0A/3 | `viewer`-role actor opens Quick Add or submits a mutation action. | UI hidden/disabled; server denies via `rpc("is_workspace_editor",{target_workspace_id})` (role in owner/admin/member; only `viewer` read-only). | `vitest run tests/vitest/library-viewer-authz.test.tsx` (net-new) | Owner: Security lead \| Phase: 0A/3 \| Flag: n/a \| Rollback: n/a \| Evidence: EV-18-005 \| Telemetry: `mutation_authz_denied` must fire once with `{action, role, workspace_id}` \| Copy: see 22 §permission-denied \| A11y: n/a \| Perf: n/a \| Browser-proof: jsdom \| i18n: n/a \| Binding: is_workspace_editor RPC (doc 19) |
| ADV-DIRTY-ADD-NESTED | P1 | 0B/3 | Dirty Add Component close with a nested listbox open. | Escape closes `z-[1050]` listbox before `z-[1000]` modal; dirty close opens the text-prompt `ConfirmDialog`, NOT `window.confirm` (`AddComponentModal.tsx:963`). | `vitest run tests/vitest/library-add-component-modal-a11y.test.tsx` (net-new) | Owner: QA lead \| Phase: 0B/3 \| Flag: n/a \| Rollback: n/a \| Evidence: EV-18-006 \| Telemetry: `overlay_opened`, `overlay_closed` must fire for both listbox and modal with correct `z_tier` \| Copy: see 22 §discard-confirm \| A11y: see 31 §4 Quick add form + Overlay/modal \| Perf: n/a \| Browser-proof: jsdom; Playwright for portal focus if changed \| i18n: n/a \| Binding: AddComponentModal.tsx:963 (doc 19) |
| ADV-FOLDER-DELETE-FAIL | P1 | 0B | `deleteLibraryFolder` server failure (folder still has children — alias `ADV-FOLDER-DELETE-CHILDREN` — or RPC errors). | Error stays visible; folder not silently treated as deleted; confirmation names count and consequences (folder vs category never conflated). | `vitest run tests/vitest/component-library-manager-ui.test.tsx tests/vitest/component-library-folder-actions.test.ts --maxWorkers=1` | Owner: QA lead \| Phase: 0B \| Flag: n/a \| Rollback: n/a \| Evidence: EV-18-007 \| Telemetry: `folder_deleted` (attempt) and `folder_delete_failed` with `{folder_id, error_code}` \| Copy: see 22 §folder-delete \| A11y: see 31 §4 Folder management \| Perf: n/a \| Browser-proof: jsdom \| i18n: n/a \| Binding: ComponentLibraryManager.tsx:1534 (doc 19) |
| ADV-CONCURRENT-RENAME | P1 | 0B | Folder renamed/deleted concurrently while the rename text-prompt dialog is open (also covers cross-workspace folder-ID submission). | Conflict/retry state; no silent overwrite; server rejects foreign folder ID via `renameLibraryFolder`/`deleteLibraryFolder` RLS. | `vitest run tests/vitest/component-library-manager-ui.test.tsx tests/vitest/component-library-folder-actions.test.ts --maxWorkers=1` | Owner: QA lead \| Phase: 0B \| Flag: n/a \| Rollback: n/a \| Evidence: EV-18-008 \| Telemetry: `folder_renamed`, `folder_rename_failed` with `{folder_id, reason}` \| Copy: see 22 §folder-rename \| A11y: see 31 §4 Folder management \| Perf: n/a \| Browser-proof: jsdom \| i18n: n/a \| Binding: ComponentLibraryManager.tsx:1515 (doc 19) |
| ADV-BULK-COPY | P1 | 0B | Bulk archive copy claims irreversibility; partial-invalid IDs (missing/archived/foreign) in the selection. | `confirmationHint` (`BulkDestructivePreviewModal.tsx:107-108`, where :108 is the "This action cannot be undone." string) branches on `actionCopy.verb` so archive does NOT claim "cannot be undone" (`archived` lifecycle is recoverable); `previewBulkArchiveLibraryComponents` reports skipped IDs safely. Folds in "Bulk action partial invalid IDs" (alias `ADV-BULK-PARTIAL-IDS`). | `vitest run tests/vitest/bulk-destructive-preview-modal.test.tsx` | Owner: QA lead \| Phase: 0B \| Flag: n/a \| Rollback: n/a \| Evidence: EV-18-009 \| Telemetry: `bulk_action_previewed` with `{verb, selection_count, skipped_count}` \| Copy: see 22 §bulk-archive \| A11y: see 31 §4 Overlay/modal \| Perf: n/a \| Browser-proof: jsdom \| i18n: n/a \| Binding: BulkDestructivePreviewModal.tsx:107-108 (doc 19) |
| ADV-DELETED-RESULT | P1 | 1 | Overview search/recent result opens a deleted/foreign component (also covers "Screen reader route open", alias `ADV-SR-ROUTE-OPEN`). | Recoverable not-found with clear selection; route-state into `?component=<id>` owned by `LibraryPageClient.tsx`; selection + result count announced once (ARIA). | `vitest run tests/vitest/library-overview-navigation.test.tsx` (net-new) | Owner: QA lead \| Phase: 1 \| Flag: n/a \| Rollback: n/a \| Evidence: EV-18-010 \| Telemetry: `library_search_executed`, `library_component_selected` with `{component_id, outcome}` \| Copy: see 22 §search/result \| A11y: see 31 §4 Library overview \| Perf: n/a \| Browser-proof: jsdom; Playwright for real navigation \| i18n: n/a \| Binding: LibraryOverviewSearch.tsx:258; LibraryPageClient.tsx route state (doc 19) |
| ADV-STALE-URL-PARAMS | P1 | 1 | Filtered catalogue reached with stale URL filter params. | Empty/incorrect state handled; applied-filter chips + reset reflect state; freshness uses `getComponentPricingFreshness(item, now)` (`ComponentPricingFreshness = "any"|"fresh"|"stale"|"missing"`). | `vitest run tests/vitest/library-applied-filters.test.tsx` (net-new) | Owner: QA lead \| Phase: 1 \| Flag: n/a \| Rollback: n/a \| Evidence: EV-18-011 \| Telemetry: `filter_applied`, `filter_reset` with `{facet, value}` \| Copy: see 22 §filter \| A11y: see 31 §4 Search/filter \| Perf: n/a \| Browser-proof: jsdom \| i18n: n/a \| Binding: component-facet-filter.tsx:12,61 (doc 19) |
| ADV-XWS-ESTIMATE-TARGET | P1 | 4 | Template insert with no valid / stale / foreign / deleted target; source changed while picker open. | Insert-picker disabled/error from `resolveEstimateTemplateInsertTarget`; review/refetch before mutation; server rejects via `can_edit_estimate`. Folds in "Source changed after insert picker" (alias `ADV-SOURCE-CHANGED`) + "Target estimate deleted" (alias `ADV-TARGET-DELETED`). | `vitest run tests/vitest/library-template-insert-picker.test.tsx` (net-new) + the action test under `ADV-XWS-ESTIMATE-ACTION` | Owner: QA lead \| Phase: 4 \| Flag: n/a \| Rollback: n/a \| Evidence: EV-18-012 \| Telemetry: `insert_target_resolved`, `insert_target_failed` with `{template_id, estimate_id, reason}` \| Copy: see 22 §insert-target \| A11y: see 31 §4 Template preview \| Perf: n/a \| Browser-proof: jsdom; Playwright for route transition \| i18n: n/a \| Binding: resolveEstimateTemplateInsertTarget + can_edit_estimate (doc 19) |
| ADV-TEMPLATE-DEP | P1 | 4 | Template preview includes a `discontinued`/`archived`/missing-source dependency (also covers "Discontinued insert", "Low-confidence insert", "Template partial failure"). | Warning/block/override over the computed-JOIN trust counts before insert; partial failure reports recovery, no silent success. Lifecycle gating uses the five `component_lifecycle_state` values; "missing source" is the derived deleted-source UI state, not an enum value. | `vitest run tests/vitest/library-template-insert-picker.test.tsx` (net-new) | Owner: QA lead \| Phase: 4 \| Flag: n/a \| Rollback: n/a \| Evidence: EV-18-013 \| Telemetry: `template_dependency_warning` with `{template_id, dependency_count, lifecycle_state}` \| Copy: see 22 §template-dep \| A11y: see 31 §4 Template preview \| Perf: n/a \| Browser-proof: jsdom; Playwright for insert flow \| i18n: n/a \| Binding: library-template-insert-picker + lifecycle enum (doc 19) |
| ADV-QUICKADD-UNSAFE | P1 | 3 | Formula-like text or invalid `pricing_source` URL submitted; Quick Add save request fails (the network-failure leg is alias `ADV-QUICKADD-NETWORK`). | Field-level validation/sanitization (app-side URL validation over free-text `pricing_source`); form data preserved and retry available on network failure; required-field errors set `aria-invalid` on `name`/`category`/`unit`/`unit_cost`. | `vitest run tests/vitest/library-add-component-modal-a11y.test.tsx` (net-new) | Owner: QA lead \| Phase: 3 \| Flag: n/a \| Rollback: n/a \| Evidence: EV-18-014 \| Telemetry: `quick_add_validation_failed` with `{field, rule}` \| Copy: see 22 §quick-add \| A11y: see 31 §4 Quick add form \| Perf: n/a \| Browser-proof: jsdom \| i18n: n/a \| Binding: AddComponentModal.tsx (doc 19) |
| ADV-KEYBOARD-MGMT | P2 | 0B/5 | Keyboard-only library management across folder + Add overlays. | Manual ARIA/focus assertions pass (no axe harness exists); focus returns to invoking control; portal focus proven in browser only if a portal/trap changes. | `vitest run tests/vitest/component-library-folder-actions.test.ts` + `vitest run tests/vitest/library-add-component-modal-a11y.test.tsx` | Owner: QA lead \| Phase: 0B/5 \| Flag: n/a \| Rollback: n/a \| Evidence: EV-18-015 \| Telemetry: `overlay_opened`, `overlay_closed` with `{surface, trigger}` \| Copy: n/a \| A11y: see 31 §4 all surfaces \| Perf: n/a \| Browser-proof: jsdom; Playwright for cross-portal focus \| i18n: n/a \| Binding: ComponentLibraryManager.tsx; AddComponentModal.tsx (doc 19) |
| ADV-MOBILE-BROWSE | P2 | 5 | Inspector dock drawer opens on a narrow screen. | Toolbar/actions do not overlap content; geometry proven in browser (jsdom cannot prove viewport geometry). | `bun run test:e2e` (`e2e/workshop-library-routes.spec.ts`) | Owner: QA lead \| Phase: 5 \| Flag: `library_dense_mode` (resolves C-004 — doc 21 §4 registers `library_dense_mode` + independent `library_virtualization_enabled`; there is NO `library_overlays_v2` flag anywhere — that was a phantom reference) \| Rollback: redeploy flag=false (fix-forward, ~5 min, C-010) \| Evidence: EV-18-016 (screenshot `phase-5/mobile-browse/...`) \| Telemetry: n/a \| Copy: n/a \| A11y: see 31 §4 Component inspector \| Perf: see 30 §dense mobile (PROVISIONAL until Phase 0A baseline per C-015) \| Browser-proof: Playwright (e2e/workshop-library-routes.spec.ts) \| i18n: n/a \| Binding: ComponentInspectorDock.tsx (doc 19) |
| ADV-DENSE-500 | P2 | 5 | 500-row dense view (large visible result set). | Measured budget against seeded rows OR documented `WORKSHOP_VIRTUALIZATION_FLAGS` fallback (reuse `@tanstack/react-virtual`, do not add a parallel virtualizer); plus a11y review. | `bun run test:e2e` perf smoke + Phase 0A seed (`scripts/seed-performance-test-data.ts` extended for `cost_library_items`) | Owner: Perf lead \| Phase: 5 \| Flag: `library_dense_mode`, `library_virtualization_enabled` \| Rollback: redeploy flag=false \| Evidence: EV-18-017 (screenshot `phase-5/dense-mode/...`) \| Telemetry: `dense_mode_rendered` with `{row_count, virtualization}` \| Copy: n/a \| A11y: see 31 §4 Dense mode row \| Perf: see 30 §dense-500 (provisional until Phase 0A baseline) \| Browser-proof: Playwright (e2e perf smoke) + Phase 0A seed \| i18n: n/a \| Binding: WORKSHOP_VIRTUALIZATION_FLAGS (doc 19) |
| ADV-OUT-OF-ORDER | P2 (FUTURE) | 5 | Slow old search returns after a newer query. | N/A today: components-tab search is 100% client-side synchronous (the `sheetItems.filter((item) => componentMatchesFacets(...))` call at `ComponentLibraryManager.tsx:877`), so no async race exists. Scope only if a server/FTS search ships. | `vitest run tests/vitest/library-server-search.test.tsx` (only if server-side search is built) | Owner: QA lead \| Phase: 5 (FUTURE) \| Flag: n/a \| Rollback: n/a \| Evidence: EV-18-018 \| Telemetry: n/a \| Copy: n/a \| A11y: n/a \| Perf: n/a \| Browser-proof: n/a (future) \| i18n: n/a \| Binding: ComponentLibraryManager.tsx:877 (doc 19) |
| ADV-VISUAL-DENSE-MOBILE | P1 | 5 | Dense-mode + mobile browser visual-regression proof: card/dense toggle, chip wrapping, column overflow, touch targets. | Screenshots match 29 §4 convention across Safari iOS + Chrome Android at sm/md viewports; no truncation, overlap, or <44×44px touch targets. | `bun run test:e2e` visual-regression harness or manual screenshot capture per 29 §4 | Owner: QA lead \| Phase: 5 \| Flag: `library_dense_mode` \| Rollback: redeploy flag=false \| Evidence: EV-18-019 (screenshots `phase-5/dense-mode/row-*-mobile-*.png`) \| Telemetry: `dense_mode_rendered` \| Copy: n/a \| A11y: see 31 §4 Dense mode row + touch-target ≥44×44px \| Perf: see 30 §dense mobile \| Browser-proof: Playwright \| i18n: RTL layout checked on a mirrored-RTL locale per [28](28-I18N-RTL-AND-LOCALIZATION-CONTRACT.md) §rtl-locales; if no RTL locale ships at beta, mark this check N/A-beta with a Phase-later follow-up \| Binding: WORKSHOP_VIRTUALIZATION_FLAGS; ComponentInspectorDock.tsx (doc 19); glass surfaces cross-ref [35](35-LIQUID-GLASS-LIBRARY-UX-SPEC.md) §11 GPU budget |
| ADV-VISUAL-GLASS | P1 | 1/2/5 | Glass-surface visual-regression proof: workspace glass shell (well + rails + paper + chrome + warm CTA), content-grade card glass (Phase 2 component / Phase 5 template cards), overlay glass (drawers single-blur, modals crisp paper interior). | Glass regions match [35](35-LIQUID-GLASS-LIBRARY-UX-SPEC.md) §11 one-blur-per-region contract at desktop + sm/md; no stacked `backdrop-filter`; blur ≤ 18px (`--glass-blur`); deferred arming via `<html data-glass="ready">` proven; AA contrast on glass surfaces. | `bun run test:e2e` glass visual-regression harness (manual screenshot capture per 29 §4 where no harness) | Owner: QA lead \| Phase: 1 (shell) / 2 (component cards) / 5 (template cards) \| Flag: `library_dense_mode` (dense-glass posture) + glass-shell flag per doc 21 §4 (see doc 05 §10.5 C-022) \| Rollback: redeploy flag=false -> paper shell (variant defaults to paper) \| Evidence: EV-18-022 (screenshots `phase-1/glass-shell/...`, `phase-2/glass-card/...`, `phase-5/glass-template/...`) \| Telemetry: `glass_shell_rendered`, `glass_card_rendered` \| Copy: n/a \| A11y: see 31 glass-contrast rows \| Perf: see 30 §glass GPU budget + [35](35-LIQUID-GLASS-LIBRARY-UX-SPEC.md) §11 (simultaneous panels ≤ shell + one drawer/modal) \| Browser-proof: Playwright (real `backdrop-filter` + `data-glass` arming not provable in jsdom) \| i18n: key-based \| Binding: estimate-surface-variant.tsx:21 (reference model); [35](35-LIQUID-GLASS-LIBRARY-UX-SPEC.md) §12.3 slot system |
| ADV-TELEMETRY-EMITS | P1 | 0A–2 | Telemetry drift: a `library_*` event stops firing, fires with the wrong payload, or fires on the wrong surface (doc 20 metrics depend on these events). | Every `library_*` event named in [20](20-TELEMETRY-AND-EVENT-INSTRUMENTATION.md) (`library_find_started`/`library_find_resolved`, `trust_chip_rendered`, `quick_add_*`, `insert_target_*`, `overlay_opened`/`overlay_closed`, `bulk_action_*`) emits to its beta sink (`console.warn` per C-009) with the documented `{surface, kind, durationMs, ...}` payload when its owning phase ships; no event fires twice for one user action; no event fires on the wrong surface. | `vitest run tests/vitest/library-telemetry-emit.test.ts` (net-new — spies on the beta sink) + manual payload audit | Owner: Telemetry lead \| Phase: 0A–2 (per owning surface) \| Flag: n/a \| Rollback: n/a \| Evidence: EV-18-023 \| Telemetry: the events under test ARE the assertion \| Copy: n/a \| A11y: n/a \| Perf: n/a \| Browser-proof: jsdom (spy); Playwright for real-route event capture \| i18n: n/a \| Binding: [20](20-TELEMETRY-AND-EVENT-INSTRUMENTATION.md) event registry; beta sink = `console.warn` (C-009), prod sink Phase-later |
| ADV-COPY-MICROCOPY | P1 | 0A–5 | Error, denial, destructive-action, and trust-copy strings drift from canonical copy deck. | Every user-facing error/denial/destructive/trust string in touched flows matches [22-COPY-DECK-AND-MICROCOPY.md](22-COPY-DECK-AND-MICROCOPY.md); no raw hardcoded assertions except where 22 delegates. | `vitest run tests/vitest/<relevant-suite>` copy-key assertions + manual copy audit | Owner: Copy lead \| Phase: 0A–5 \| Flag: n/a \| Rollback: revert copy commit \| Evidence: EV-18-020 \| Telemetry: n/a \| Copy: see 22 all sections \| A11y: screen-reader-only strings included \| Perf: n/a \| Browser-proof: n/a \| i18n: pluralization/ICU MessageFormat per 28 \| Binding: 22-COPY-DECK-AND-MICROCOPY.md |
| ADV-RELEASE-ARTIFACT | P0 | Final (post-5 release gate) | Final release gate: not all ADV scenarios have recorded pass status exactly once. ("Phase 6" is an alias for this final release gate, NOT a 7th build phase — the canonical phase map in doc 19 is 0A->0B->1->2->3->4->5, with 5 LAST.) | A single release artifact (doc 24 export + signed matrix) proves every implemented ADV scenario passed exactly once; no duplicate or missing statuses; P0 rows green; N/FUTURE rows explicitly N/A. | `bun run validate` + export of `24-EXECUTION-EVIDENCE-LEDGER.md` ADV rows | Owner: QA lead \| Phase: Final (post-5 release gate) \| Flag: n/a \| Rollback: block release \| Evidence: EV-18-021 \| Telemetry: `release_gate_passed` with `{adv_count, p0_count}` \| Copy: n/a \| A11y: n/a \| Perf: n/a \| Browser-proof: n/a \| i18n: n/a \| Binding: 24-EXECUTION-EVIDENCE-LEDGER.md ADV-* rows |

## Status Mirror — 2026-06-22 Dense Proof

- `ADV-DENSE-500`: PASS for Chromium/provider 500-row functional proof and
  500-row timing budgets after exercising the documented
  `WORKSHOP_VIRTUALIZATION_FLAGS` fallback. Latest evidence lives in doc 24 and
  `_evidence/phase-5/dense-mode/library-phase5-dense-table-chromium-1280x900-20260622T091251Z.{png,json}`,
  `_evidence/phase-5/dense-mode/library-phase5-dense-perf-chromium-1280x900-20260622T091332Z.json`,
  and
  `_evidence/phase-5/dense-mode/provider-virtualized-perf-proof-20260622T091332Z.md`.
  Provider cleanup was verified with 0 remaining rows tagged
  `phase-5-dense-browser-proof`. The separate 5,000-row keystroke tier remains
  open.
- `ADV-MOBILE-BROWSE`: PASS for Chromium 390x844 geometry. Evidence lives in
  doc 24 and
  `_evidence/phase-5/dense-mode/library-phase5-dense-mobile-chromium-390x844-20260622T091251Z.{png,json}`.
- `ADV-KEYBOARD-MGMT`: PASS for the dense row keyboard path covered here:
  Space selects and Enter opens the inspector while updating
  `?component=<id>`. Existing folder/Add overlay focus tests remain the broader
  0B/3 coverage.
- `ADV-OUT-OF-ORDER`: N/A for this pass because the components-tab search is
  still synchronous client-side filtering; reopen only if server/FTS search
  ships.
- `ADV-VISUAL-DENSE-MOBILE`: PARTIAL PASS for Chromium dense/mobile screenshots.
  Safari iOS / Chrome Android matrix, RTL, and full touch-target visual review
  remain release-presentation work, not a blocker for the functional dense
  browser claim.
- `ADV-VISUAL-GLASS`: PARTIAL PASS for Chromium desktop shell arming and the
  one-blur boundary. Evidence lives in doc 24 and
  `_evidence/phase-1/glass-shell/library-phase1-glass-shell-chromium-1280x720-20260622T081457Z.{png,json}`.
  The broader glass visual matrix remains open for Safari/iOS/Android, RTL,
  touch targets, contrast, component/template cards, drawers, and modals.

## Status Mirror - 2026-06-22 P0 Authz / Telemetry

- `ADV-XWS-COMPONENT-PARAM`: PASS for focused route-state authorization proof.
  A foreign/invalid `?component=<id>` is stripped before detail disclosure, and
  the rendered route-state test asserts no inspector detail and no usage call
  for the foreign ID.
- `ADV-XWS-ESTIMATE-ACTION`: PASS for resolver authorization proof.
  `resolveEstimateTemplateInsertTarget` now calls
  `rpc("can_edit_estimate",{target_estimate_id})` and blocks node lookup on
  denial.
- `ADV-TELEMETRY-EMITS`: PASS for the implemented 0A route-state/Quick Add
  telemetry substrate and sanitizer. This does not prove every future doc-20
  event; those remain owned by their phases.
- `ADV-DIRTY-ADD-NESTED`: PASS for jsdom regression. Escape closes the nested
  Supplier combobox listbox without closing the Add modal; dirty close opens the
  in-app `Discard component draft?` dialog and does not call native
  `window.confirm`.
- `ADV-QUICKADD-UNSAFE`: PASS for required-field a11y, invalid pricing source,
  future pricing date, formula-prefix rejection, and network-failure input
  preservation.
- `ADV-FOLDER-DELETE-FAIL` / `ADV-CONCURRENT-RENAME`: PASS in jsdom. Current
  manager/folder tests prove viewer denial, transactional delete RPC usage,
  scoped component move behavior, delete server-failure recovery, and rename
  server-failure/conflict recovery without optimistic overwrite.
- `ADV-BULK-COPY`: PASS. Bulk archive copy stays recoverable and does not reuse
  irreversible delete wording.
- `ADV-DELETED-RESULT`: PASS. Recent component cards, search result click/Enter,
  template result routing, no-results recovery, and stale/foreign component
  route-state recovery are covered across overview and Components tests.
- `ADV-STALE-URL-PARAMS`: PASS. Applied-filter chips, clear-all, count strip,
  and overview deep-link hydration/reset are covered.
- `ADV-XWS-ESTIMATE-TARGET`: PASS. Insert picker target display, submit-time
  re-resolution, stale-target blocking, and server-side authz are covered.
- `ADV-TEMPLATE-DEP`: PASS. Archived dependencies block insert; discontinued
  dependencies require explicit confirmation.
- `ADV-COPY-MICROCOPY`: PARTIAL PASS for the audited 0B destructive-dialog,
  trust-copy, and empty-state drift. `tests/vitest/library-copy-contract.test.ts`
  plus focused source-trust/overview/template/manager suites now lock `New
  folder`, `Save name`, `Discard this draft?`, count-aware folder delete copy,
  recoverable archive copy, `Not linked`, `Local override`, `Detached`, `No
  source confidence recorded.`, `No pricing date recorded. Add one to track
  freshness.`, `Verified source`, `Likely source`, `Low confidence`, `Your
  library is empty.`, and `No templates yet.` Evidence:
  `_evidence/phase-final/copy-contract-pass-20260622T082151Z.md`. A final
  all-flow manual copy-deck review remains open before release approval.
- `ADV-RELEASE-ARTIFACT`: NO-GO remains, but the local validation blocker is
  closed. `bun run validate` passed on 2026-06-22; artifact:
  `_evidence/phase-final/validate-pass-20260622T075913Z.md`. The exported ADV
  status matrix is
  `_evidence/phase-final/adv-release-status-20260622T075913Z.md`. Fresh
  Chromium provider/browser dense proof, 500-row provider timing proof, and
  Chromium desktop glass-shell proof also passed after validation, but release
  remains blocked by Safari/iOS/Android/RTL visual coverage, full glass
  matrix/paint-time proof, the 5,000-row keystroke tier, cross-browser
  portal/focus proof, and final manual copy-deck review.

## Evidence Requirements

For each implemented phase, final report should include:

- changed files (real paths from keystone "Verified File Paths")
- target behavior
- tests/checks run, named by `ADV-*` ID and owning `tests/vitest/<file>`
- exact command evidence (`vitest run <file>` / `bun run test:dom` /
  `bun run test:e2e` / `bun run validate` — never `bun test`), recorded in the
  matching `ADV-*`/`LIB-*` row of `24-EXECUTION-EVIDENCE-LEDGER.md` (the single
  home for run evidence; the final report cites that row)
- skipped checks and why
- residual risk

Security-sensitive phases (0A) also include:

- actor matrix coverage via `is_workspace_editor` (owner/admin/member) vs
  `viewer` (`ADV-VIEWER-MUTATION`)
- IDOR coverage for `?component=<id>` and insert targets
  (`ADV-XWS-COMPONENT-PARAM`, `ADV-XWS-ESTIMATE-ACTION`)
- public/private redaction coverage on `project_publications.snapshot_json`
  (`ADV-PUBLIC-REDACTION`) — the snapshot builder field selection in
  `src/lib/publication/actions.ts` (writes `snapshot_json` at `:653`; `p_snapshot_json` RPC params at `:577`/`:716`; verified 2026-06-21), not a
  live library endpoint
- workspace-switch/cache coverage on `WORKSPACE_COMPONENT_LIBRARY_QUERY_KEY`
  (`ADV-WS-SWITCH-CACHE`)

Performance-sensitive phases (5) also include:

- seeded-row count from `scripts/seed-performance-test-data.ts` extended for
  `cost_library_items` (Phase 0A) — no budget number may be claimed before this
  seed + measurement exists
- measured or observed budget result against `loadCurrentWorkspaceComponentRowsLibrary`
  (the eager nested-detail browse fetch is the real perf risk)
- fallback decision via `WORKSHOP_VIRTUALIZATION_FLAGS` if budget fails
  (`ADV-DENSE-500`)

## Minimum Command Set By Risk

All commands below are the real `package.json` scripts (keystone "Test
Commands"). Never write `bun test tests/vitest/<f>` — `bun test` is bound to
`tests/unit` and silently ignores the vitest jsdom suites. Use `vitest run
tests/vitest/<file>` for one suite, `bun run test:dom` for all.

Docs-only changes:

- `git diff --check`
- targeted link/path inspection (`rg`)

Narrow source changes:

- `vitest run tests/vitest/<file>` for the touched behavior's owning suite
- `bun run type-check` when types are touched

Security/data/cache changes:

- the net-new authz/IDOR/redaction suites by name: `vitest run
  tests/vitest/library-route-state-authz.test.tsx`,
  `tests/vitest/estimate-insert-target-authz.test.tsx`,
  `tests/vitest/library-viewer-authz.test.tsx`,
  `tests/vitest/share-snapshot-redaction.test.tsx`
- cache invalidation: `vitest run
  tests/vitest/library-workspace-switch-cache.test.tsx` plus the existing
  `tests/vitest/library-components-cache.test.tsx` /
  `tests/vitest/library-templates-cache.test.tsx`
- `bun run type-check`

UI interaction changes:

- targeted jsdom suites via `vitest run tests/vitest/<file>` (manual ARIA/focus
  assertions — there is no axe/jest-axe harness; adding `jest-axe` is a net-new
  Phase 0A prerequisite)
- `bun run test:e2e` (Playwright: `e2e/workshop-library-routes.spec.ts`,
  `e2e/workshop-template-insert-smoke.spec.ts`) only when the claim depends on
  real route navigation, viewport geometry, portal clipping/z-index
  (`z-[1000]`/`z-[1050]`/`z-[1100]`), drag/drop, or cross-portal focus trapping

Full gate before any phase is called done:

- `bun run validate` (`type-check && lint && lint:design-system && lint:design
  && test && test:dom`)

## Completion Gates

Implementation can be called complete only when:

- the Phase 0B native-prompt grep reaches zero on its targets:
  `rg -n "window\.(prompt|confirm)" src/components/workshop/component-library-manager`
  must not hit `ComponentLibraryManager.tsx:1493/1515/1534` or
  `AddComponentModal.tsx:963`; the estimate-page panel
  `component-library/index.tsx:939/1428` is a tracked Phase-later item, not a
  silent miss; matches in `TemplateEditorClient.tsx` /
  `TemplatesBrowseManager.tsx` are comments — do not re-flag
- selected component/template deep links work and fail safely
  (`ADV-DELETED-RESULT`, `ADV-XWS-COMPONENT-PARAM`)
- Quick Add works for `is_workspace_editor` roles and is blocked for `viewer`
  (`ADV-VIEWER-MUTATION`); unsafe input is validated (`ADV-QUICKADD-UNSAFE`)
- source trust chips render over real columns/helpers
  (`pricing_date` via `getStalenessTone`/`getStalenessLabel`, free-text
  `confidence`, `updated_at` for "last touched") and snapshot redaction holds
  (`ADV-PUBLIC-REDACTION`)
- folder destructive actions show affected count and safe alternatives, folder
  vs category never conflated (`ADV-FOLDER-DELETE-FAIL`, `ADV-CONCURRENT-RENAME`)
- bulk-archive copy does not claim irreversibility (`ADV-BULK-COPY`,
  `confirmationHint` branches on `actionCopy.verb`)
- template preview names the resolved target (`resolveEstimateTemplateInsertTarget`)
  and dependency health (`ADV-XWS-ESTIMATE-TARGET`, `ADV-TEMPLATE-DEP`)
- cache invalidation names the exact keys for overview/components/templates/
  estimate insert, and the un-scoped `WORKSPACE_COMPONENT_LIBRARY_QUERY_KEY` is
  scoped by `workspaceId` (`ADV-WS-SWITCH-CACHE`)
- workspace switch cannot show prior-workspace library data (`ADV-WS-SWITCH-CACHE`)
- large-list behavior meets a measured budget against seeded `cost_library_items`
  rows or uses the documented `WORKSHOP_VIRTUALIZATION_FLAGS` fallback
  (`ADV-DENSE-500`); the out-of-order case (`ADV-OUT-OF-ORDER`) stays N/A until a
  server/FTS search ships
- every `ADV-*` row in the matrix above carries a pass / skip-with-risk / no-go
  status for implemented scenarios, and doc 06's matrix uses the identical IDs
  (no drift); each status (command + result + date) is recorded once in
  `24-EXECUTION-EVIDENCE-LEDGER.md` under the matching `ADV-*` row, and this
  doc's per-ID status mirrors that ledger so the run evidence lives in exactly
  one place
- the full gate passes: `bun run validate`
- final report does not claim browser (`bun run test:e2e`), provider, or manual
  proof unless it actually happened

## No-Go Release Conditions

Do not release if any P0 scenario fails or any of these remain true:

- `/share/[token]` snapshot (`project_publications.snapshot_json`) exposes
  `pricing_source` / `confidence` / price history (`ADV-PUBLIC-REDACTION` fails)
- a foreign-workspace `?component=<id>` reveals object detail, or a foreign
  folder/estimate ID mutates data (`ADV-XWS-COMPONENT-PARAM`,
  `ADV-CONCURRENT-RENAME`, `ADV-XWS-ESTIMATE-ACTION` fail)
- a stale/foreign insert target can mutate the wrong estimate despite
  `can_edit_estimate` (`ADV-XWS-ESTIMATE-TARGET` fails)
- a `viewer`-role actor can save a mutation (`ADV-VIEWER-MUTATION` fails)
- destructive folder actions lack affected-count review (`ADV-FOLDER-DELETE-FAIL`)
- quick-add validation can save malformed required data
  (`name`/`category`/`unit`/`unit_cost`) (`ADV-QUICKADD-UNSAFE` fails)
- dense/list mode has known severe keyboard or focus traps
  (`ADV-KEYBOARD-MGMT`, `ADV-MOBILE-BROWSE`)
- cache bleed across workspace switch is reproducible — un-scoped
  `WORKSPACE_COMPONENT_LIBRARY_QUERY_KEY` not scoped (`ADV-WS-SWITCH-CACHE` fails)
- `WORKSPACE_COMPONENT_LIBRARY_QUERY_KEY` remains **un-scoped** (still the bare
  `["workspace-component-library"]` literal) at release — scoping by `workspaceId`
  with ALL SIX call sites migrated — reader `TemplateEditorClient.tsx:160` (inline literal) + self-invalidate `:166` (inline literal) + writers `LibraryPageClient.tsx:126`, `use-estimate-row-mutations.ts:432`, `EstimateSheetContent.tsx:1299` AND `:1302` (verified 2026-06-21; line numbers drift on host-file edit — re-verify with the doc-19 provenance command #2) — is a **release prerequisite, not just a
  test-pass** (resolves C-007; a cache-scope test can pass on a still-un-scoped
  key if the test happens to refetch, and a test mocking only the four commonly-cited sites misses the `:166` self-invalidate and the `:1302` second writer)
- performance stalls at beta-scale `cost_library_items` data without the
  `WORKSHOP_VIRTUALIZATION_FLAGS` fallback (`ADV-DENSE-500` fails)

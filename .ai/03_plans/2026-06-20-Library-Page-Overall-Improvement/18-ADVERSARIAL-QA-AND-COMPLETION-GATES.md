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

## Adversarial Scenario Matrix

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

| ID | Severity | Phase | Attack / Failure | Required Outcome | Owning test + command |
| --- | --- | --- | --- | --- | --- |
| ADV-XWS-COMPONENT-PARAM | P0 | 0A | User edits `?component=<id>` to a foreign-workspace `cost_library_items.id`. | Permission-safe not-found/denied via RLS; no object detail leaked. | `vitest run tests/vitest/library-route-state-authz.test.tsx` (net-new) |
| ADV-XWS-ESTIMATE-ACTION | P0 | 0A | `resolveEstimateTemplateInsertTarget` invoked with a stale/foreign estimate ID. | Server rejects via `rpc("can_edit_estimate",{target_estimate_id})`; no mutation. | `vitest run tests/vitest/estimate-insert-target-authz.test.tsx` (net-new) |
| ADV-WS-SWITCH-CACHE | P0 | 0A | User switches workspace with the inspector dock open. | `WORKSPACE_COMPONENT_LIBRARY_QUERY_KEY` (today un-scoped `["workspace-component-library"]`) clears/refetches; no prior-workspace detail visible. | `vitest run tests/vitest/library-workspace-switch-cache.test.tsx` (net-new) |
| ADV-PUBLIC-REDACTION | P0 | 0A | Public `/share/[token]` snapshot includes private source metadata. | The snapshot builder (`src/lib/publication/actions.ts`, writes `snapshot_json` at :566/:636, with helper context in `activity-helpers.ts`) field-selects so `pricing_source`, `confidence`, and price history never enter `project_publications.snapshot_json` — redaction is what the builder serializes, NOT a live library endpoint. Folds in "Import/export future path". | `vitest run tests/vitest/share-snapshot-redaction.test.tsx` (net-new) |
| ADV-VIEWER-MUTATION | P0 | 0A/3 | `viewer`-role actor opens Quick Add or submits a mutation action. | UI hidden/disabled; server denies via `rpc("is_workspace_editor",{target_workspace_id})` (role in owner/admin/member; only `viewer` read-only). | `vitest run tests/vitest/library-viewer-authz.test.tsx` (net-new) |
| ADV-DIRTY-ADD-NESTED | P1 | 0B/3 | Dirty Add Component close with a nested listbox open. | Escape closes `z-[1050]` listbox before `z-[1000]` modal; dirty close opens the text-prompt `ConfirmDialog`, NOT `window.confirm` (`AddComponentModal.tsx:963`). | `vitest run tests/vitest/library-add-component-modal-a11y.test.tsx` (net-new) |
| ADV-FOLDER-DELETE-FAIL | P1 | 0B | `deleteLibraryFolder` server failure (folder still has children — alias `ADV-FOLDER-DELETE-CHILDREN` — or RPC errors). | Error stays visible; folder not silently treated as deleted; confirmation names count and consequences (folder vs category never conflated). | `vitest run tests/vitest/component-library-folder-actions.test.ts` (extend existing) |
| ADV-CONCURRENT-RENAME | P1 | 0B | Folder renamed/deleted concurrently while the rename text-prompt dialog is open (also covers cross-workspace folder-ID submission). | Conflict/retry state; no silent overwrite; server rejects foreign folder ID via `renameLibraryFolder`/`deleteLibraryFolder` RLS. | `vitest run tests/vitest/component-library-folder-actions.test.ts` (extend existing) |
| ADV-BULK-COPY | P1 | 0B | Bulk archive copy claims irreversibility; partial-invalid IDs (missing/archived/foreign) in the selection. | `confirmationHint` (`BulkDestructivePreviewModal.tsx:107-108`, where :108 is the "This action cannot be undone." string) branches on `actionCopy.verb` so archive does NOT claim "cannot be undone" (`archived` lifecycle is recoverable); `previewBulkArchiveLibraryComponents` reports skipped IDs safely. Folds in "Bulk action partial invalid IDs" (alias `ADV-BULK-PARTIAL-IDS`). | `vitest run tests/vitest/bulk-destructive-preview-modal.test.tsx` |
| ADV-DELETED-RESULT | P1 | 1 | Overview search/recent result opens a deleted/foreign component (also covers "Screen reader route open", alias `ADV-SR-ROUTE-OPEN`). | Recoverable not-found with clear selection; route-state into `?component=<id>` owned by `LibraryPageClient.tsx`; selection + result count announced once (ARIA). | `vitest run tests/vitest/library-overview-navigation.test.tsx` (net-new) |
| ADV-STALE-URL-PARAMS | P1 | 1 | Filtered catalogue reached with stale URL filter params. | Empty/incorrect state handled; applied-filter chips + reset reflect state; freshness uses `getComponentPricingFreshness(item, now)` (`ComponentPricingFreshness = "any"|"fresh"|"stale"|"missing"`). | `vitest run tests/vitest/library-applied-filters.test.tsx` (net-new) |
| ADV-XWS-ESTIMATE-TARGET | P1 | 4 | Template insert with no valid / stale / foreign / deleted target; source changed while picker open. | Insert-picker disabled/error from `resolveEstimateTemplateInsertTarget`; review/refetch before mutation; server rejects via `can_edit_estimate`. Folds in "Source changed after insert picker" (alias `ADV-SOURCE-CHANGED`) + "Target estimate deleted" (alias `ADV-TARGET-DELETED`). | `vitest run tests/vitest/library-template-insert-picker.test.tsx` (net-new) + the action test under `ADV-XWS-ESTIMATE-ACTION` |
| ADV-TEMPLATE-DEP | P1 | 4 | Template preview includes a `discontinued`/`archived`/missing-source dependency (also covers "Discontinued insert", "Low-confidence insert", "Template partial failure"). | Warning/block/override over the computed-JOIN trust counts before insert; partial failure reports recovery, no silent success. Lifecycle gating uses the five `component_lifecycle_state` values; "missing source" is the derived deleted-source UI state, not an enum value. | `vitest run tests/vitest/library-template-insert-picker.test.tsx` (net-new) |
| ADV-QUICKADD-UNSAFE | P1 | 3 | Formula-like text or invalid `pricing_source` URL submitted; Quick Add save request fails (the network-failure leg is alias `ADV-QUICKADD-NETWORK`). | Field-level validation/sanitization (app-side URL validation over free-text `pricing_source`); form data preserved and retry available on network failure; required-field errors set `aria-invalid` on `name`/`category`/`unit`/`unit_cost`. | `vitest run tests/vitest/library-add-component-modal-a11y.test.tsx` (net-new) |
| ADV-KEYBOARD-MGMT | P2 | 0B/5 | Keyboard-only library management across folder + Add overlays. | Manual ARIA/focus assertions pass (no axe harness exists); focus returns to invoking control; portal focus proven in browser only if a portal/trap changes. | `vitest run tests/vitest/component-library-folder-actions.test.ts` + `vitest run tests/vitest/library-add-component-modal-a11y.test.tsx` |
| ADV-MOBILE-BROWSE | P2 | 5 | Inspector dock drawer opens on a narrow screen. | Toolbar/actions do not overlap content; geometry proven in browser (jsdom cannot prove viewport geometry). | `bun run test:e2e` (`e2e/workshop-library-routes.spec.ts`) |
| ADV-DENSE-500 | P2 | 5 | 500-row dense view (large visible result set). | Measured budget against seeded rows OR documented `WORKSHOP_VIRTUALIZATION_FLAGS` fallback (reuse `@tanstack/react-virtual`, do not add a parallel virtualizer); plus a11y review. | `bun run test:e2e` perf smoke + Phase 0A seed (`scripts/seed-performance-test-data.ts` extended for `cost_library_items`) |
| ADV-OUT-OF-ORDER | P2 (FUTURE) | 5 | Slow old search returns after a newer query. | N/A today: components-tab search is 100% client-side synchronous (the `sheetItems.filter((item) => componentMatchesFacets(...))` call at `ComponentLibraryManager.tsx:877`), so no async race exists. Scope only if a server/FTS search ships. | `vitest run tests/vitest/library-server-search.test.tsx` (only if server-side search is built) |

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
  `src/lib/publication/actions.ts` (writes `snapshot_json` at :566/:636), not a
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
- performance stalls at beta-scale `cost_library_items` data without the
  `WORKSHOP_VIRTUALIZATION_FLAGS` fallback (`ADV-DENSE-500` fails)

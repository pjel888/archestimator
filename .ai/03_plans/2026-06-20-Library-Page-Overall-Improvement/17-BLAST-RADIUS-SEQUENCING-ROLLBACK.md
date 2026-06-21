# 17 - Blast Radius, Sequencing, And Rollback

Phase labels, surface names, table/column/enum/action/query-key bindings, and test
commands in this doc follow the CANONICAL PHASE MAP, GLOSSARY, and verified bindings in
`19-VERIFIED-CODEBASE-BINDINGS-AND-PHASE-MAP.md` (keystone). Feature-flag IDs and the
per-phase rollback contract are owned by `21-FEATURE-FLAGS-AND-ROLLOUT.md`; this doc
references those flags rather than restating "disable/hide" verbally. Do not restate the
long binding lists here — cross-reference doc 19.

## High-Blast Areas

| Area | Why It Is Risky | Mitigation |
| --- | --- | --- |
| Route-state changes | `?component=<id>` on `/workshop/library` affects navigation, search, browser history, and deep links. | Land route-state tests (Phase 0A) before visual work; keep params additive; parse must be idempotent (doc 21 cache/route invariants). |
| Cache invalidation | Mutations can stale `["workspace-component-library"]` (UN-SCOPED), `workspaceComponentRowsLibraryQueryKey(workspaceId, projectId?)`, and `workspaceEstimateTemplatesQueryKey({userId, workspaceId})`. | Name the EXACT key(s) each mutation invalidates (doc 13); the un-scoped `WORKSPACE_COMPONENT_LIBRARY_QUERY_KEY` is the only real workspace-switch cache-bleed surface. |
| Source-trust metadata | Trust chips bound to `pricing_date`/`pricing_source`/`confidence` (free text) can mislead, and snapshot redaction governs `project_publications.snapshot_json`. | Derive labels via `getComponentPricingFreshness` + `getStalenessTone`/`getStalenessLabel`; keep redaction at the snapshot builder (doc 14), not a live endpoint. |
| Authz/RLS | Cross-workspace IDOR or viewer-write. Authz is ALREADY strong (`is_workspace_editor`/`can_edit_estimate` defense-in-depth over RLS); the real gap is TEST coverage. | Test the actor matrix (`owner`/`admin`/`member`/`viewer`) and IDOR cases against the existing guards; no new policy expected (doc 14). |
| Quick Add | Can create bad reusable data in `cost_library_items`. | Enforce required = `name`, `category`, `unit`, `unit_cost` (CANONICAL QUICK ADD CONTRACT); no schema change (all columns exist). |
| Folder destructive actions | Native `window.confirm`/`window.prompt` in `ComponentLibraryManager.tsx` (:1493/:1515/:1534) bypass app confirmation. | Replace with the text-prompt dialog (inline `ConfirmDialog`+input from `TemplatesBrowseManager.tsx:531-883`); `delete_library_folder` RPC returns affected counts. |
| Template insert | Can mutate estimates and nested rows. | Re-resolve target via `resolveEstimateTemplateInsertTarget` (doc 13/02 Flow 7) and check `estimate_row_link_state` health before mutation. |
| Large-list rendering | Browse fetch (`loadCurrentWorkspaceComponentRowsLibrary`) eagerly loads the full nested detail graph per item. | REUSE `WORKSHOP_VIRTUALIZATION_FLAGS` (`src/lib/workshop/virtualization-flags.ts`); reduce browse payload / lazy inspector-scoped detail; measure first (Phase 0A seed extension). |

## Recommended PR / Work Slice Order

PR order MUST follow the canonical priority order `0A -> 0B -> 1 -> 2 -> 3 -> 4 -> 5`
(doc 19 CANONICAL PHASE MAP). Folder native-prompt replacement lands EARLY in Phase 0B
(not after Quick Add), and Quick Add lands in Phase 3 — this resolves the prior ordering
conflict with `00-PLAN.md` and `05-IMPLEMENTATION-ROADMAP.md`. Each phase is gated behind
its flag (doc 21 Flag Registry) so a PR can merge dark.

1. Phase 0A Contract Lock - contract/test scaffolding for route state, authz, cache, and
   stale-target invariants; extend the perf seed (`scripts/seed-performance-test-data.ts`)
   to seed N `cost_library_items` and MEASURE a baseline before any budget is claimed.
   No flag (test/contract only).
2. Phase 0B Overlay & Route-State Reliability - replace folder native
   `window.prompt`/`window.confirm` in `ComponentLibraryManager.tsx` and the
   `AddComponentModal.tsx:963` dirty-discard `window.confirm` with the text-prompt dialog
   (`ConfirmDialog`+input); add `?component=<id>` route state; fix the bulk-archive copy in
   `BulkDestructivePreviewModal.tsx:107-108` (branch on `actionCopy.verb`, not `canExecute`).
   Flags: `library_folder_dialogs`, `library_component_deep_link`.
3. Phase 1 Findability & Applied Filters - overview search continuity to `?component=<id>`
   (`searchLibraryOverview` -> deep link); visible applied-filter chips + reset; result
   count/scope strip. Flag: `library_component_deep_link`.
4. Phase 2 Source Trust at Decision Points - trust chips on overview/recent/template rows +
   `ComponentInspectorDock.tsx` + insert, bound to real columns/helpers (doc 11 + doc 19).
   Flag: `library_trust_chips`.
5. Phase 3 Add/Edit Component Flow Split (Quick Add) - quick-add required-field path
   (`name`/`category`/`unit`/`unit_cost`) + progressive advanced; normalize Add/Edit source
   fields. Flag: `library_quick_add`.
6. Phase 4 Templates Browse/Insert/Editor Clarity - explicit insert target
   (`resolveEstimateTemplateInsertTarget`), `creatable-combobox` move, template trust
   summary (COMPUTED JOIN over `source_library_item_id`/`link_state`, not stored fields).
   No new flag (reuses `library_trust_chips` for the summary layer).
7. Phase 5 Dense Maintenance Mode & Browser-Proven Polish - net-new card/dense toggle,
   table-vs-grid per doc 12, browser proof. LAST. Flag: `library_dense_mode`.

## Rollback Plan By Phase

Each row maps to a concrete feature flag (or "no flag" where rollback is a plain git
revert). Flag IDs, accessors, and the canonical "off behavior" are defined in
`21-FEATURE-FLAGS-AND-ROLLOUT.md`; this table is the per-phase entry point into it. A
flag flip MUST NOT strand a `?component=<id>` URL or orphan a TanStack query entry (doc 21
cache/route invariants).

| Phase | Flag (doc 21) | Rollback action |
| --- | --- | --- |
| 0A Contract Lock | no flag (test/contract only) | Plain `git revert` of docs/test scaffolding or the narrow failed contract; no UI dependency yet. |
| 0B Overlay & Route-State | `library_folder_dialogs`, `library_component_deep_link` | Flip `library_folder_dialogs` off -> legacy `window.prompt`/`window.confirm` folder branch (kept behind the flag, emergency only; schedule re-fix). Flip `library_component_deep_link` off -> drop `?component=<id>` and return overview search to the broad route (existing tab holding the URL sees the broad view, not an error). Bulk-archive copy fix is a plain git revert. |
| 1 Findability & Applied Filters | `library_component_deep_link` | Flip `library_component_deep_link` off -> applied-filter chips/reset and deep-link continuity hide; overview search returns to broad route. |
| 2 Source Trust | `library_trust_chips` | Flip `library_trust_chips` off -> new trust-chip layer hides; existing card/row hierarchy and any tested-safe payload shape are preserved (the flag hides the new chip layer, not existing warnings). |
| 3 Add/Edit (Quick Add) | `library_quick_add` | Flip `library_quick_add` off -> hide the Quick Add trigger and route users to the existing `AddComponentModal` flow. |
| 4 Templates Browse/Insert/Editor | `library_trust_chips` (summary layer) | Flip `library_trust_chips` off -> hide the new template trust summary/chips ONLY; real stale/`source-changed` dependency risk is NOT flag-gated and stays visible. Insert-target/combobox changes roll back via git revert. |
| 5 Dense Maintenance & Polish | `library_dense_mode` | Flip `library_dense_mode` off -> card grid only (no dense table). Responsive/a11y fixes that are flag-independent stay. |
| Release gate | no flag (release hold) | Hold release; no rollback claim without passing the no-go checklist in `18-ADVERSARIAL-QA-AND-COMPLETION-GATES.md`. |

## Database / RLS Rollback

This pack needs NO migration for the in-scope work. The trust columns already exist on
`public.cost_library_items` (`pricing_date`, `pricing_source`, `confidence` — free text,
`lifecycle_state`, `lifecycle_state_changed_at`, `updated_at`), price history lives in
`cost_library_item_price_history`, and the Quick Add contract uses only existing columns
(`name`/`category`/`unit`/`unit_cost` required) — so Phases 0A-5 do not touch schema and
have no DB rollback surface beyond plain git revert of app code. This honors the
`00-PLAN.md` "no schema changes" non-goal.

A migration IS required ONLY for the two DEFERRED items, which are out of scope for this
pack:

- a `last_reviewed`/`reviewed_at` column (does NOT exist on `cost_library_items` or
  `estimate_templates`) — until then, trust cues bind to `updated_at`, not "last reviewed".
- a controlled-vocabulary `confidence` (enum/CHECK constraint) — `confidence` is FREE TEXT
  today; a controlled vocabulary needs a migration.

Both sit behind the Data Migration Gate (doc 19) and must NOT be smuggled into a UI-polish
PR. If either is ever pursued:

- prefer additive columns/indexes first; avoid destructive schema edits.
- include down/fix-forward reasoning in migration notes.
- verify against Archestimator Supabase project `ebxxqidacheyapmmzavr`.
- regenerate Supabase types additively (splice new columns; do NOT raw-overwrite — a raw
  `gen:types` breaks the build per the hand-added export + RPC drift).
- Migration-ledger note: `supabase db query --file` applies SQL but writes NO
  `schema_migrations` row (drift). Reconcile with
  `supabase migration repair --status applied <version>`, not an MCP `apply_migration`.

## Release Gates

Before merging implementation, run the full gate `bun run validate`
(= `type-check && lint && lint:design-system && lint:design && test && test:dom`). The
jsdom suites under `tests/vitest/*.test.tsx` run via `bun run test:dom`
(`vitest run --maxWorkers=1`) or a single file via `vitest run tests/vitest/<file>`. Note:
`bun test` is bound to `tests/unit` ONLY and will NOT run the vitest suites, so a gate
phrased as `bun test tests/vitest/<f>` is wrong — use `test:dom`/`vitest run`. There is NO
axe/jest-axe harness; a11y gates are manual ARIA/focus assertions in Testing Library
unless `jest-axe` is added as an explicit prerequisite.

| Gate | Command | Notes |
| --- | --- | --- |
| Route-state (`?component=<id>` parse/idempotency) | `vitest run tests/vitest/<route-state>.test.tsx` then `bun run test:dom` | scaffolded in Phase 0A; flag-on and flag-off both pass. |
| Authz / IDOR (actor matrix) | targeted `vitest run` of the authz suite + existing cross-workspace coverage on `workspaceComponentRowsLibraryQueryKey` | exercises `is_workspace_editor`/`can_edit_estimate` guards; `viewer` is read-only. |
| Snapshot redaction | `vitest run` of the snapshot-builder suite (`project_publications.snapshot_json` via `activity-helpers.ts`) | redaction is at the snapshot builder, NOT a live library endpoint (doc 14). |
| Cache invalidation | `vitest run` of the mutation-cache suite | each mutation names the EXACT key(s); covers the UN-SCOPED `WORKSPACE_COMPONENT_LIBRARY_QUERY_KEY`. |
| Quick-add validation | `vitest run` of the quick-add suite | required = `name`/`category`/`unit`/`unit_cost`. |
| Destructive action (folder + bulk archive) | `vitest run` of the folder-dialog + bulk-archive suites | confirms text-prompt dialog replaced native `window.*`; `BulkDestructivePreviewModal.tsx:107-108` copy branches on `actionCopy.verb`. |
| Template insert stale-target | `vitest run` of the `resolveEstimateTemplateInsertTarget` suite | re-resolves target + checks `estimate_row_link_state`. |
| Large-list / fallback | `scripts/seed-performance-test-data.ts` (extended for `cost_library_items`) measurement + documented fallback evidence | REUSE `WORKSHOP_VIRTUALIZATION_FLAGS`; no FTS/trigram index exists, so server-search gates are FUTURE-if-budget-exceeded. |
| Browser/manual | `bun run test:e2e` (playwright) for covered paths; skipped manual checks listed with residual risk | Components-tab search is client-side synchronous today (no out-of-order race to gate). |

## Stop Conditions

Stop implementation and re-plan if:

- the existing `cost_library_items` trust columns (`pricing_date`/`pricing_source`/
  `confidence`/`lifecycle_state`/`updated_at`) plus `estimate_row_link_state` cannot
  represent a required trust state without a migration (a deferred `last_reviewed`/
  enum-`confidence` need crosses the Data Migration Gate — that is a re-plan trigger, not a
  smuggled UI-PR change).
- snapshot redaction rules for `project_publications.snapshot_json` conflict with existing
  share-surface (`/share/[token]`) behavior.
- authz tests against `is_workspace_editor`/`can_edit_estimate` reveal broader workspace
  isolation bugs (e.g. the un-scoped `WORKSPACE_COMPONENT_LIBRARY_QUERY_KEY` leaking
  cross-workspace data beyond a fixable key scope).
- `?component=<id>` route state conflicts with core Next.js routing behavior.
- a perf baseline from the extended `scripts/seed-performance-test-data.ts` seed shows
  large-list requirements force an architecture beyond reusing
  `WORKSHOP_VIRTUALIZATION_FLAGS`.

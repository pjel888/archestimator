# 03 — Workshop Library Readiness & Recommendations

## First-user readiness verdict: CONDITIONAL

The `/workshop/library` surface is **functional and well-engineered for the
common paths**. Browse, search (⌘K combobox), facet filtering, template browse +
editor, folder CRUD, component create/edit, optimistic edits with rollback,
cache-coherence callbacks, virtualization, and lazy detail-graph hydration all
show deliberate, modern work. Authz on the main read/write paths
(`isWorkspaceEditorInD1` + workspace-scoped `WHERE` clauses) is consistent. SQL
injection and path-traversal surfaces are well-defended.

It is **not unconditionally ready** because of two P1 issues in the upload
pipeline:

1. **BUG-P1-01** — the direct-upload route lets any logged-in workspace member
   (including viewers) reserve sessions and push attachment objects to R2,
   bypassing the editor gate the sibling routes enforce.
2. **BUG-P1-02** — `recordUploadAsset` writes 3 records non-transactionally;
   any mid-sequence D1 failure strands an orphan `finalized` session (never
   cleaned) and an orphan R2 object.

Neither breaks the common browse/edit flow, but both will bite once users start
uploading attachments at volume. Fix both before first users.

Everything else is P2/P3: real bugs with bounded blast radius (non-atomic
component writes, render-phase setState, route-state bypassing the router) or
cleanup/hardening (dead code, stale comments, missing indexes/UNIQUE
constraints, giant components).

## What is solid (don't touch unless changing intent)

- Tab coordination (`library-tabs-model.ts` + `LibraryTabsLayoutClient`): single
  source of truth from `usePathname`; no drift.
- Workspace-scoped reads/writes across the repository + server actions.
- SQL injection defense (bound `?` everywhere) + path-traversal defense on all
  upload/delete paths.
- Scan-pipeline optimistic-concurrency guard (conditional UPDATE + checksum
  re-verify) on both the worker write and the manual override.
- DB CHECK constraints backstopping the app layer.
- Facet filter model, source-trust chips, freshness thresholds.
- Cache-coherence callbacks (P0 T4) patching the warm cache instead of
  `router.refresh()`.
- Virtualization + lazy detail-graph hydration (U18).

## Prioritized recommendations

### Tier 0 — before first users (P1)

1. **Close the direct-upload authz gap.** Add `canManageLibrary()` /
   `isWorkspaceEditorInD1` to `direct-upload/route.ts` POST + PUT
   (`BUG-P1-01`). Mirror `attachments/route.ts:193-206`.
2. **Make upload record writes atomic.** Wrap `recordUploadAsset`'s 3 inserts in
   D1 `batch()` with a compensating delete on partial failure, and make the
   cleanup job eligible to reap `finalized`-session-with-no-asset orphans
   (`BUG-P1-02`). Reorder `finalizeUploadSessionAsset` to insert the asset
   before flipping the session (`BUG-P2-07`).

### Tier 1 — fix soon (P2, correctness + integrity)

3. **Wrap component/template multi-statement writes in `batch()`** with
   compensating deletes, mirroring `insertTemplateIntoTemplate`
   (`BUG-P2-03`). Covers `createCostLibraryComponent`,
   `updateCostLibraryComponent`, `upsertCostLibraryComponentPriceOption`,
   `changeCostLibraryComponentLifecycleState`.
4. **Fix the `useTemplateEditor.run` optimistic race** by capturing the
   snapshot inside the updater or queuing mutations (`BUG-P2-01`).
5. **Move the 3 render-phase setState sites to `useEffect`/`useMemo`** keyed on
   id/ref (`BUG-P2-02`).
6. **Replace `window.history` route-state writes with `router.push`/
   `router.replace`** (`BUG-P2-04`).
7. **Batch the scan-override UPDATE + event INSERT** (`BUG-P2-06`).
8. **Use `crypto.timingSafeEqual` on internal job routes** (`BUG-P2-08`).

### Tier 2 — resolve the data/schema drift + perf (P2/P3)

9. **Resolve DATA-DRIFT-01**: confirm whether the variant columns in
   `ComponentPriceOptionRow` are wired through `metadata_json` or are a stale
   Postgres-era type. Either document the JSON-column contract or trim the type.
   This is the single biggest "is the variant feature real on D1?" question.
10. **Add the missing index** for `cost_library_items` under
    `lifecycle_state <> 'archived'` (partial index) — `PERF-02`.
11. **Always use the `IN (...)` path** in
    `collectComponentLibraryRowsForSelectedItems` when `itemIds` is non-empty —
    `PERF-01`.
12. **Add UNIQUE constraints** for component/template/price-option names
    (`DATA-02`) — decide whether duplicate names are a product decision or a bug.
13. **Cap the unbounded selects** in `getLibraryOverviewAppPath` (discontinued
    scan) and `loadCurrentWorkspaceEstimateTemplatesAppPath` (`PERF-03`,
    `PERF-04`).

### Tier 3 — cleanup / hardening (P3)

14. **Delete confirmed dead code:** `TemplatePreviewDock.tsx` (keep the model),
    `RecentComponentCard.tsx`, the dead `helpers.ts` exports,
    `buildComponentLibraryNavigationTree` (`DEAD-UI-01..04`).
15. **Fix stale comments:** RLS references (`OUTDATED-01`), Postgres error-code
    check (`OUTDATED-02`, `BUG-P3-04`).
16. **Plan a follow-up migration** to drop the empty `component_category_nodes`
    table + dead `*_category_node_id` columns, or re-introduce a workspace-
    scoped taxonomy properly (`DEAD-SCHEMA-01`). This is schema debt, not a
    runtime bug — coordinate with any taxonomy roadmap decision.
17. **Split the giant components** (`ComponentLibraryManager`,
    `AddComponentModal`, `LibraryFolderTree`, `TemplatesBrowseManager`) for
    review velocity + cold-load (`BUG-P3-08`).
18. **Confirm the D1 driver surfaces `UNIQUE constraint failed: ...`** so
    duplicate-name translation works (`BUG-P3-04`).

## Test proposals (await explicit owner authorization)

Under the User Test Authorization Gate, none of these authorize execution. They
are recorded so the owner can approve the exact commands:

| Risk | Exact proposed command | Proves |
|---|---|---|
| direct-upload authz (P1-01) | (playwright/e2e) sign in as a workspace viewer, POST `/api/component-library/attachments/direct-upload` `action=create` | viewer gets 403 (currently 200) |
| upload record atomicity (P1-02) | (integration) simulate mid-sequence D1 failure in `recordUploadAsset`, run cleanup job | orphans reaped |
| `useTemplateEditor.run` race (P2-01) | (vitest) fire two overlapping optimistic edits, fail the second | rollback target is the first's snapshot, not stale |
| quota TOCTOU (P2-05) | (integration) fire N+1 concurrent `createCostLibraryComponent` at the cap | cap enforced |
| UNIQUE constraint translation (P3-04) | (integration) create duplicate folder name against D1 | clean validation error, not 500 |

## Turning this into implementation work

This pack is **audit-only** (no `plan-pack.json`, no execution DAG). To act on
it:

- **Tier 0 (P1)** is high-blast-radius (authz + data integrity in the upload
  pipeline) and warrants a dated implementation plan pack in
  `.ai/03_plans/<date>-library-upload-hardening/` with a `plan-pack.json` +
  `LOOP_LEDGER.md`. Scope it tightly: BUG-P1-01 + BUG-P1-02 + BUG-P2-07.
- **Tier 1 (P2 correctness)** can run as an in-session loop for each fix
  (component-write atomicity, template-editor race, render-phase setState,
  route-state, scan-override batch, timing-safe compare) — they're independent
  and reversible.
- **Tier 2 (data/perf)** — DATA-DRIFT-01 first (it determines whether a
  migration is needed); the index + `IN (...)` path + UNIQUE constraints are
  additive migration work.
- **Tier 3 (cleanup)** — dead-code deletion + comment fixes are trivial
  reversible edits; the taxonomy-table migration needs a roadmap decision.

If the owner wants a single executable pack covering all tiers, create
`.ai/03_plans/<date>-Workshop-Library-Hardening/` with the bug register above
as the risk/unit seed.

## Relationship to existing packs

- `2026-06-20-Library-Page-Overall-Improvement/` — contains only `_evidence/`.
  No active plan; this audit supersedes its intent for current-state mapping.
- The P0 T4 cache-coherence work and U18 detail-graph optimization referenced in
  the manager are already shipped (visible in current source as
  `onLibraryItemsMutated` callbacks and `includeDetailGraph: false`). This audit
  does not re-plan them.

## Provenance

- Audit performed: 2026-07-12 by lead + 3 parallel read-only exploration lanes
  (UI components, API + repository, DB schema/migrations), with lead direct
  source reads to verify the highest-impact claims (authz gap, non-atomic
  writes, DATA-DRIFT-01).
- No code/migrations/config/provider state changed.
- Test decision: `NOT_REQUIRED` for this audit task (User Test Authorization
  Gate). `TEST_PROPOSAL`s recorded above await explicit owner authorization.

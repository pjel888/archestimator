# 03 — Workshop Library Readiness & Recommendations

## First-user readiness verdict: NOT READY (revised from CONDITIONAL in v2)

The `/workshop/library` surface is **functional and well-engineered for the
common browse/search paths**. Tab coordination, facet filtering, template browse
+ editor, folder CRUD, optimistic edits with rollback, cache-coherence callbacks,
virtualization, lazy detail-graph hydration, and authz on the main read/write
paths (`isWorkspaceEditorInD1` + workspace-scoped `WHERE` clauses) are all
deliberate, modern work. SQL injection and path-traversal surfaces are
well-defended. A11y structure is textbook (tabs, trees, dialogs, aria-live).

It is **NOT ready for first users** because the v2 deep-dives (`04`/`05`/`06`)
found **five P1 defects** — three of them silent data-loss/correctness bugs in
the two core value streams (component create with attachments, template insert
with dependency gating):

1. **BUG-P1-01** — direct-upload authz gap: viewers can upload to R2.
2. **BUG-P1-02** — non-atomic upload record writes strand R2 orphans.
3. **BUG-VA-01** — **variant attachments are never persisted.** The modal
   uploads, validates, transmits, and displays attachments, but
   `upsertComponentPriceOptionInD1` never inserts into
   `cost_library_item_variant_attachments`. Files orphan; chips disappear on
   reload. Silent data loss in the core component-create flow (`04` §5).
4. **BUG-VA-02** — **in-estimate component edit mutates local state only.**
   Editing a library component from an estimate sheet looks like it edits the
   library but only updates the estimate row (`04` §6).
5. **BUG-TM-01** — **template insert stale-link blindness.** Dependency health
   gates on snapshot lifecycle, never live-joins `cost_library_items`, and never
   surfaces `row.link_state`; the archived-component hard-block is unreachable.
   No broken-link UX (`06` §4).

A sixth P1 is a first-impression UX defect: **BUG-UX-01** — the Overview route
paints an elaborate skeleton then renders an empty `<div>` with no orientation
(`05` §8).

The common browse/search/edit flows themselves are solid; the defects are in
attachments, in-estimate editing, stale-link gating, and the Overview landing.
Fix the five functional P1s before first users; the UX P1 is an owner decision
(restore vs. commit-to-empty).

Everything else is P2/P3: real bugs with bounded blast radius (non-atomic
component writes, image-metadata loss on re-edit, drag-only a11y gaps,
reduced-motion, route-state bypassing the router) or cleanup/hardening (dead
code, stale comments, missing indexes/UNIQUE constraints, giant components).

> **v2 change:** first-pass BUG-P2-01 (`useTemplateEditor.run` race) was
> **downgraded/removed** after re-analysis (`06` §7 — the pattern is correct).
> First-pass DATA-DRIFT-01 was **resolved** as not-a-bug (`04` §3).

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
3. **Persist variant attachments.** Add the
   `cost_library_item_variant_attachments` INSERT in
   `upsertComponentPriceOptionInD1` (or a sibling batched write) so uploaded
   files link to their price option/item; surface `scanStatus`/review state in
   the modal (`BUG-VA-01`, `04` §5). Until this is fixed, **component
   attachments silently disappear after create.**
4. **Decide and fix the in-estimate edit path.** Either persist the edit to the
   library via `updateCostLibraryComponent`/`upsertCostLibraryComponentPriceOption`,
   or clearly label the in-estimate editor as "row-only" and disable
   library-mutation affordances there (`BUG-VA-02`, `04` §6).
5. **Fix template insert stale-link blindness.** Live-join
   `source_library_item_id → cost_library_items` for current lifecycle at read
   or insert-resolution time; surface `row.link_state` and recompute it; add a
   broken-link UX (`BUG-TM-01`, `06` §4). Until this is fixed, **inserting a
   template that references an archived component silently inserts stale rows.**
6. **Resolve the Overview landing (owner decision).** Either restore real
   Overview content (wire `RecentComponentCard` + recents + health line, which
   the skeleton already depicts) or replace `library/loading.tsx` with a skeleton
   matching reality + add an in-body orientation panel (`BUG-UX-01`, `05` §8).

### Tier 1 — fix soon (P2, correctness + integrity)

7. **Wrap component/template multi-statement writes in `batch()`** with
   compensating deletes, mirroring `insertTemplateIntoTemplate`
   (`BUG-VA-04` / first-pass `BUG-P2-03`). Covers `createCostLibraryComponent`,
   `updateCostLibraryComponent`, `upsertCostLibraryComponentPriceOption`,
   `changeCostLibraryComponentLifecycleState`, and `insertTemplateIntoTemplate`
   node+row atomicity (`BUG-TM-02`).
8. **Fix image-metadata loss on re-edit** — `toExistingVariantImageDraft`
   (`AddComponentModal.tsx:569-580`) must preserve `bucket/path/thumbnailStoragePath/
   imageMetadata` (`BUG-VA-03`, `04` §5).
9. **Move the 2 remaining render-phase setState sites to `useEffect`/`useMemo`**
   keyed on id/ref (`EditComponentDrawer.tsx:77-81`, `TemplateEditorSheet.tsx:
   119-127`). The `use-template-editor.ts:57-60` site is a correct guarded
   prop-sync — leave it (`06` §3).
10. **Replace `window.history` route-state writes with `router.push`/
    `router.replace`** (`BUG-P2-04`).
11. **Batch the scan-override UPDATE + event INSERT** (`BUG-P2-06`).
12. **Use `crypto.timingSafeEqual` on internal job routes** (`BUG-P2-08`).
13. **Add keyboard alternatives for drag-only folder reorder + component-move**
    (`BUG-UX-02`, `05` §3) mirroring the templates "Move to group…" combobox.
14. **Add reduced-motion guards** (`BUG-UX-03`, `05` §4) — verify whether a
    global override exists first.
15. **Restore the templates-browse source dock below `lg`** — wrap in
    `ResizableSidePanel` or render a drawer trigger (`BUG-UX-04`, `05` §5).
16. **Add explicit empty states** for zero-component and zero-template
    workspaces and for no-results-after-filtering in both bodies (`05` §9).

### Tier 2 — perf + data hardening (P2/P3)

17. **Document the JSON-blob contract** for variant fields in code
    (`DATA-DRIFT-01` resolved in `04` §3) — the latent fragility (a future writer
    setting a stale column shadows the blob) is worth a code comment or a typed
    `metadata_json` schema.
18. **Add the missing index** for `cost_library_items` under
    `lifecycle_state <> 'archived'` (partial index) — `PERF-02`.
19. **Always use the `IN (...)` path** in
    `collectComponentLibraryRowsForSelectedItems` when `itemIds` is non-empty —
    `PERF-01`.
20. **Add UNIQUE constraints** for component/template/price-option names
    (`DATA-02`) — decide whether duplicate names are a product decision or a bug.
21. **Cap the unbounded selects** in `getLibraryOverviewAppPath` (discontinued
    scan) and `loadCurrentWorkspaceEstimateTemplatesAppPath` (`PERF-03`,
    `PERF-04`).

### Tier 3 — cleanup / hardening (P3)

22. **Delete confirmed dead code:** `TemplatePreviewDock.tsx` (keep the model),
    `RecentComponentCard.tsx`, the dead `helpers.ts` exports,
    `buildComponentLibraryNavigationTree`, `reorderEstimateTemplateRowItems`
    (`DEAD-UI-01..06`).
23. **Fix stale comments:** RLS references (`OUTDATED-01`), Postgres error-code
    check (`OUTDATED-02`, `BUG-P3-04`).
24. **Plan a follow-up migration** to drop the empty `component_category_nodes`
    table + dead `*_category_node_id` columns, or re-introduce a workspace-
    scoped taxonomy properly (`DEAD-SCHEMA-01`). This is schema debt, not a
    runtime bug — coordinate with any taxonomy roadmap decision.
25. **Split the giant components** (`ComponentLibraryManager`,
    `AddComponentModal`, `LibraryFolderTree`, `TemplatesBrowseManager`) for
    review velocity + cold-load (`BUG-P3-08`).
26. **Confirm the D1 driver surfaces `UNIQUE constraint failed: ...`** so
    duplicate-name translation works (`BUG-P3-04`).
27. **Polish UX** per `05` §9 P3 list (centralize glass class constants,
    coordinate ⌘K handlers, Undo toast for bulk archive, `role="status"` for
    skeletons, distinguish "not set" values, make rename discoverable, replace
    native `<select>`/glyph placeholders).

## Test proposals (await explicit owner authorization)

Under the User Test Authorization Gate, none of these authorize execution. They
are recorded so the owner can approve the exact commands:

| Risk | Exact proposed command | Proves |
|---|---|---|
| direct-upload authz (P1-01) | (playwright/e2e) sign in as a workspace viewer, POST `/api/component-library/attachments/direct-upload` `action=create` | viewer gets 403 (currently 200) |
| upload record atomicity (P1-02) | (integration) simulate mid-sequence D1 failure in `recordUploadAsset`, run cleanup job | orphans reaped |
| **attachments persist (VA-01)** | (integration) create a component with an attachment via `createCostLibraryComponent`, reload, assert `cost_library_item_variant_attachments` row exists + modal chip renders | attachment persists (currently orphans) |
| **in-estimate edit (VA-02)** | (e2e) edit a library component from an estimate sheet, reload the library, assert intent | clarifies whether library was mutated |
| **template stale-link (TM-01)** | (integration) archive a component referenced by a template, open `getTemplateDependencyHealth`, assert hard-block fires | block is reachable (currently unreachable) |
| quota TOCTOU (P2-05) | (integration) fire N+1 concurrent `createCostLibraryComponent` at the cap | cap enforced |
| UNIQUE constraint translation (P3-04) | (integration) create duplicate folder name against D1 | clean validation error, not 500 |

## Turning this into implementation work

This pack is **audit-only** (no `plan-pack.json`, no execution DAG). To act on
it:

- **Tier 0 (P1)** spans three high-blast-radius clusters and warrants dated
  implementation plan packs:
  - **Upload pipeline hardening** (BUG-P1-01 + BUG-P1-02 + BUG-P2-07) — authz +
    data integrity in the direct-upload + record-asset path.
  - **Component create/attachment persistence** (BUG-VA-01 + BUG-VA-02 +
    BUG-VA-03 + BUG-VA-04) — the core component value stream. This is the
    highest-value cluster: until BUG-VA-01 is fixed, attachments silently
    disappear.
  - **Template insert integrity** (BUG-TM-01 + BUG-TM-02) — live-join lifecycle
    + node/row atomicity.
  - **Overview landing** (BUG-UX-01) — owner decision (restore vs.
    commit-to-empty); not blocked on the functional P1s.
- **Tier 1 (P2 correctness)** can run as in-session loops per fix — they're
  independent and reversible.
- **Tier 2 (perf/data)** — additive index + `IN (...)` path + UNIQUE constraints
  are migration work; the JSON-blob contract just needs a code comment.
- **Tier 3 (cleanup)** — dead-code deletion + comment fixes are trivial
  reversible edits; the taxonomy-table migration needs a roadmap decision.

If the owner wants a single executable pack covering all tiers, create
`.ai/03_plans/<date>-Workshop-Library-Hardening/` with the bug register above
as the risk/unit seed. The three Tier-0 clusters are the natural split for
parallel implementation lanes (disjoint file scopes: upload routes/lib vs.
component actions/modal vs. template repository/trust-model).

## Relationship to existing packs

- `2026-06-20-Library-Page-Overall-Improvement/` — contains only `_evidence/`.
  No active plan; this audit supersedes its intent for current-state mapping.
- The P0 T4 cache-coherence work and U18 detail-graph optimization referenced in
  the manager are already shipped (visible in current source as
  `onLibraryItemsMutated` callbacks and `includeDetailGraph: false`). This audit
  does not re-plan them.

## Provenance

- Audit performed: 2026-07-12. v1: lead + 3 parallel read-only lanes (UI, API +
  repository, DB schema). v2 (improvement pass): lead + 3 deep-dive lanes
  (variant/component flow, UX/UI/design, templates surface), with lead direct
  source reads to verify every headline claim — including grep-confirming that
  no production code writes `cost_library_item_variant_attachments` (BUG-VA-01),
  confirming `lifecycleState` reads only from the snapshot (BUG-TM-01), and
  resolving DATA-DRIFT-01 by tracing the `metadata_json` write/read round-trip.
- No code/migrations/config/provider state changed.
- Test decision: `NOT_REQUIRED` for this audit task (User Test Authorization
  Gate). `TEST_PROPOSAL`s recorded above await explicit owner authorization.

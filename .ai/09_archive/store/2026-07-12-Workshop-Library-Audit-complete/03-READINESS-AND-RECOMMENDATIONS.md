# 03 — Workshop Library Readiness & Recommendations

## First-user readiness verdict: NOT READY (revised in v3 — domain + scalability gaps added)

The `/workshop/library` surface is **functional and well-engineered for the
common browse/search paths**. Tab coordination, facet filtering, template browse
+ editor, folder CRUD, optimistic edits with rollback, cache-coherence callbacks,
virtualization, lazy detail-graph hydration, and authz on the main read/write
paths (`isWorkspaceEditorInD1` + workspace-scoped `WHERE` clauses) are all
deliberate, modern work. SQL injection and path-traversal surfaces are
well-defended. A11y structure is textbook (tabs, trees, dialogs, aria-live).

It is **NOT ready for first users**. The v3 pass (`07`/`08`) added the
**industry-domain** and **startup-scalability** dimensions the engineering-only
v1/v2 missed. There are now **eight P1 defects** across four layers:

**Engineering layer (v1/v2):**
1. **BUG-P1-01** — direct-upload authz gap: viewers can upload to R2.
2. **BUG-P1-02** — non-atomic upload record writes strand R2 orphans.
3. **BUG-VA-01** — variant attachments are never persisted (silent data loss).
4. **BUG-VA-02** — in-estimate component edit mutates local state only.
5. **BUG-TM-01** — template insert stale-link blindness (archived-component block unreachable).

**Estimating-domain layer (v3 — `07`):**
6. **BUG-DOM-01** — **money stored/computed as float (`REAL`); estimate/proposal
   totals can drift** between client display, server aggregation, and exported
   workbook. For an *estimating* SaaS this is the highest-stakes domain risk:
   centavo-level discrepancies on a bid document are reputation-critical. **No
   Decimal library, no integer-cents; rounding only at ingest + proposal-export.**
7. **BUG-DOM-04** — **no outbound propagation when a library component is
   edited/archived.** Estimates silently freeze stale library pricing with
   `link_state` still `linked-clean` — no signal to estimate owners.
8. **BUG-DOM-05** — **bulk archive writes no audit trail, no version bump, no
   referential check.** The most common lifecycle operation is the least
   auditable; archiving a component used by 200 estimates is silent.

**Scalability layer (v3 — `08`):**
- **BUG-OPS-02** — templates eager-load is a query bomb (~300k rows worst case
  in one D1 round trip). Real timeout/failure risk before the 2k cap.
- **BUG-OPS-08** — no live export/import; the pricing page advertises exports
  the library doesn't deliver. Portability + trust gap for first users.

**UX layer (v2):**
- **BUG-UX-01** — Overview skeleton/reality divergence + dead-end body (owner
  decision: restore vs. commit-to-empty).

The common browse/search/edit flows themselves are solid. The defects cluster in
four areas: the upload pipeline, the component/variant value stream,
estimate↔library link integrity, and money/scalability. Fix the eight functional
P1s before first users; the UX P1 is an owner decision.

> **v3 additions over v2:** BUG-DOM-01 (money/float), BUG-DOM-04 (no outbound
> propagation), BUG-DOM-05 (bulk archive audit), BUG-OPS-02 (templates query
> bomb), BUG-OPS-08 (no export), plus P2s for content-conversion mispricing,
> unit validation, optimistic locking, audit-trail completeness, domain telemetry,
> search-at-scale, multi-user staleness, error context, and folder-delete safety.
> **v3 corrected** the v2 note that the components route lacked perf tracing —
> it IS traced; the gap is in the repository/actions layer.

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
6. **Fix money-as-float (estimating-critical).** Pick ONE canonical money
   representation (integer cents `INTEGER` + scale, or a Decimal library) and
   round identically at every tier boundary across the JS oracle
   (`estimate-row-total.ts`), client models, and SQL function. Minimum interim:
   round at the model layer, not the render layer (`BUG-DOM-01`, `07` §1). This
   is the highest-stakes domain risk — **bid-document discrepancies are
   reputation-critical.**
7. **Add outbound propagation on library edit/archive.** Async stale-flag write
   on library edit/archive, OR a derived "library moved since row_revision"
   signal the trust model reads server-side; persist `source-changed`/`detached`
   rather than deriving client-side (`BUG-DOM-04`, `07` §3).
8. **Make bulk archive write audit + check references.** Call the same
   history/version/telemetry writes as `changeCostLibraryComponentLifecycleState`;
   consult `getCostLibraryComponentUsage` and warn/block on in-use components
   (`BUG-DOM-05`, `07` §4).
9. **Paginate the templates browse load.** Page or cursor the templates load;
   lazy-load nodes/row_items per-template on expand. The eager ~300k-row SELECT
   is a real timeout risk before the 2k cap (`BUG-OPS-02`, `08` §2).
10. **Ship export/import OR stop promising it.** Either wire the dead export
    helpers + add an import UI, or delete the dead code AND fix the pricing-page
    / perf-budget copy (`BUG-OPS-08`, `08` §7).
11. **Resolve the Overview landing (owner decision).** Either restore real
    Overview content (wire `RecentComponentCard` + recents + health line, which
    the skeleton already depicts) or replace `library/loading.tsx` with a skeleton
    matching reality + add an in-body orientation panel (`BUG-UX-01`, `05` §8).

### Tier 1 — fix soon (P2, correctness + integrity + domain)

12. **Decide content-conversion: price it or stop collecting it.**
    `packageQuantity` is captured but never divides into pricing — silent
    mispricing (`BUG-DOM-02`, `07` §2).
13. **Validate units against the enum** at write (server action + DB CHECK)
    (`BUG-DOM-03`, `07` §2).
14. **Add optimistic locking.** `AND current_version_number = ?` + row-count
    check (409 on mismatch); fix the `INSERT OR IGNORE` version dedup so
    contention doesn't lose audit rows (`BUG-DOM-06`, `07` §5).
15. **Complete the audit trail.** Route lifecycle-affecting changes through
    `changeCostLibraryComponentLifecycleState`; write `price_history` on create;
    make audit tables append-only; capture `change_reason` consistently
    (`BUG-DOM-07`, `07` §6).
16. **Add domain-event telemetry** (`component_created/updated/archived/
    price_changed/lifecycle_changed/library_component_searched`) inside the
    mutation actions (`BUG-DOM-08`, `07` §7).
17. **Plan the search-at-scale fix.** `search_tsv` column + covering index
    (near-term) or n-gram table; Postgres+pg_trgm if the library store migrates
    off D1 (`BUG-OPS-01`, `08` §1).
18. **Address multi-user staleness.** Enable `refetchOnWindowFocus` or a polling
    /realtime invalidation signal for shared workspaces; bound the refetch
    dataset (`BUG-OPS-06`, `08` §5).
19. **Enrich action-error logging** with workspace/user/action/SQL context; stop
    swallowing preference/telemetry save errors; preserve D1 batch per-statement
    detail (`BUG-OPS-03`, `08` §3).
20. **Add a size cap / preview hash to folder delete** (`BUG-OPS-07`, `08` §6).
21. **Make VAT configurable + visible.** Add a workspace/proposal VAT setting
    (rate + mode) in D1; show a VAT-inclusive total in the estimate UI; add a
    tax-code field on components; back-calc the component for `included` mode
    (`BUG-DOM-09`, `07` §8.1). For a PH-first estimating product the hardcoded
    12%-export-only posture is a compliance/UX gap.
22. **Add mutation rate limiting to library actions.** Reuse
    `assertEstimateActionRateLimit` (`src/lib/estimates/action-rate-limit.ts`)
    with a `component-library-mutation` surface key on create/update/archive/
    duplicate/reorder — every sibling domain already does (`BUG-DOM-12`, `07` §9).
23. **Wrap component/template multi-statement writes in `batch()`** with
    compensating deletes, mirroring `insertTemplateIntoTemplate`
    (`BUG-VA-04` / first-pass `BUG-P2-03`). Covers `createCostLibraryComponent`,
    `updateCostLibraryComponent`, `upsertCostLibraryComponentPriceOption`,
    `changeCostLibraryComponentLifecycleState`, and `insertTemplateIntoTemplate`
    node+row atomicity (`BUG-TM-02`).
22. **Fix image-metadata loss on re-edit** — `toExistingVariantImageDraft`
    (`AddComponentModal.tsx:569-580`) must preserve `bucket/path/thumbnailStoragePath/
    imageMetadata` (`BUG-VA-03`, `04` §5).
23. **Move the 2 remaining render-phase setState sites to `useEffect`/`useMemo`**
    keyed on id/ref (`EditComponentDrawer.tsx:77-81`, `TemplateEditorSheet.tsx:
    119-127`). The `use-template-editor.ts:57-60` site is a correct guarded
    prop-sync — leave it (`06` §3).
24. **Replace `window.history` route-state writes with `router.push`/
    `router.replace`** (`BUG-P2-04`).
25. **Batch the scan-override UPDATE + event INSERT** (`BUG-P2-06`).
26. **Use `crypto.timingSafeEqual` on internal job routes** (`BUG-P2-08`).
27. **Add keyboard alternatives for drag-only folder reorder + component-move**
    (`BUG-UX-02`, `05` §3) mirroring the templates "Move to group…" combobox.
28. **Add reduced-motion guards** (`BUG-UX-03`, `05` §4) — verify whether a
    global override exists first.
29. **Restore the templates-browse source dock below `lg`** — wrap in
    `ResizableSidePanel` or render a drawer trigger (`BUG-UX-04`, `05` §5).
30. **Add explicit empty states** for zero-component and zero-template
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

31. **Delete confirmed dead code:** `TemplatePreviewDock.tsx` (keep the model),
    `RecentComponentCard.tsx`, the dead `helpers.ts` exports,
    `buildComponentLibraryNavigationTree`, `reorderEstimateTemplateRowItems`
    (`DEAD-UI-01..06`).
32. **Fix stale comments:** RLS references (`OUTDATED-01`), Postgres error-code
    check (`OUTDATED-02`, `BUG-P3-04`).
33. **Plan a follow-up migration** to drop the empty `component_category_nodes`
    table + dead `*_category_node_id` columns, or re-introduce a workspace-
    scoped taxonomy properly (`DEAD-SCHEMA-01`). This is schema debt, not a
    runtime bug — coordinate with any taxonomy roadmap decision. **Strategic
    note:** the dead table was likely a CSI MasterFormat/Uniformat construction
    taxonomy — a product decision on standard classification.
34. **Split the giant components** (`ComponentLibraryManager`,
    `AddComponentModal`, `LibraryFolderTree`, `TemplatesBrowseManager`) for
    review velocity + cold-load (`BUG-P3-08`).
35. **Confirm the D1 driver surfaces `UNIQUE constraint failed: ...`** so
    duplicate-name translation works (`BUG-P3-04`).
36. **Polish UX** per `05` §9 P3 list (centralize glass class constants,
    coordinate ⌘K handlers, Undo toast for bulk archive, `role="status"` for
    skeletons, distinguish "not set" values, make rename discoverable, replace
    native `<select>`/glyph placeholders).
37. **i18n polish:** centralize the PHP currency constant; consider a
    workspace-level currency setting; use `en-PH` date formatter consistently;
    evaluate locale-aware collation for Filipino (`BUG-OPS-04`, `BUG-OPS-05`).
38. **Display rounding consistency:** pick one (`roundMoney` at the model layer)
    and apply everywhere — currently `toFixed(6)`, `toFixed(2)`, and
    `roundMoney` coexist (`BUG-OPS-09`).

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
| **money/float drift (DOM-01)** | (unit) construct a BOQ of 0.1-costing rows, compute total via `computeEstimateRowLineTotal` + `sumEstimateRowLineTotals`, compare to proposal-export rounded total | discrepancy is zero after fix (currently sub-cent drift) |
| **no outbound propagation (DOM-04)** | (integration) edit a library component's unit_cost, read a referencing estimate row, assert a stale signal is present | signal fires (currently silent) |
| **bulk archive audit (DOM-05)** | (integration) bulk-archive a component, assert `state_history` + `versions` rows written + in-use check warns | audit complete (currently empty) |
| **templates query bomb (OPS-02)** | (perf) seed 2000 templates × 50 nodes × 100 rows, cold-load Templates route, measure D1 round-trip rows + latency | paginated + bounded (currently ~300k rows) |
| **concurrent edit (DOM-06)** | (integration) two concurrent `updateCostLibraryComponent` on same row, assert 409 on the second | conflict detected (currently last-write-wins) |
| quota TOCTOU (P2-05) | (integration) fire N+1 concurrent `createCostLibraryComponent` at the cap | cap enforced |
| UNIQUE constraint translation (P3-04) | (integration) create duplicate folder name against D1 | clean validation error, not 500 |

## Turning this into implementation work

This pack is **audit-only** (no `plan-pack.json`, no execution DAG). To act on
it:

- **Tier 0 (P1)** spans six high-blast-radius clusters and warrants dated
  implementation plan packs:
  - **Upload pipeline hardening** (BUG-P1-01 + BUG-P1-02 + BUG-P2-07) — authz +
    data integrity in the direct-upload + record-asset path.
  - **Component create/attachment persistence** (BUG-VA-01 + BUG-VA-02 +
    BUG-VA-03 + BUG-VA-04) — the core component value stream. Until BUG-VA-01 is
    fixed, attachments silently disappear.
  - **Estimate↔library link integrity** (BUG-TM-01 + BUG-DOM-04 + BUG-DOM-05) —
    live-join lifecycle + outbound propagation + bulk-archive audit/referential
    check. These three share a root cause (no live-join, no outbound write).
  - **Money precision** (BUG-DOM-01) — cross-cutting data-integrity change
    (migrations + money oracle + client models). The highest-stakes domain risk.
    Needs an owner decision on representation (integer-cents vs Decimal library)
    before implementation.
  - **Templates scalability** (BUG-OPS-02) — paginate the eager load; lazy-load
    nodes/rows. Independent of the link-integrity cluster.
  - **Export/portability** (BUG-OPS-08) — owner decision: ship it or stop
    promising it (pricing-page + dead-code cleanup).
  - **Overview landing** (BUG-UX-01) — owner decision (restore vs.
    commit-to-empty); not blocked on the functional P1s.
- **Tier 1 (P2)** can run as in-session loops per fix — mostly independent and
  reversible. The domain P2s (content-conversion, unit validation, locking,
  audit completeness, telemetry, search-at-scale, staleness) are each bounded.
- **Tier 2 (perf/data)** — additive index + `IN (...)` path + UNIQUE constraints
  are migration work; the JSON-blob contract just needs a code comment.
- **Tier 3 (cleanup)** — dead-code deletion + comment fixes are trivial
  reversible edits; the taxonomy-table migration needs a roadmap decision.

If the owner wants a single executable pack covering all tiers, create
`.ai/03_plans/<date>-Workshop-Library-Hardening/` with the bug register above
as the risk/unit seed. The six Tier-0 clusters are the natural split for
parallel implementation lanes (disjoint file scopes: upload routes/lib vs.
component actions/modal vs. link/repository vs. money-oracle vs. templates-load
vs. export UI).

## Relationship to existing packs

- `2026-06-20-Library-Page-Overall-Improvement/` — contains only `_evidence/`.
  No active plan; this audit supersedes its intent for current-state mapping.
- The P0 T4 cache-coherence work and U18 detail-graph optimization referenced in
  the manager are already shipped (visible in current source as
  `onLibraryItemsMutated` callbacks and `includeDetailGraph: false`). This audit
  does not re-plan them.

## Provenance

- Audit performed: 2026-07-12.
  - **v1:** lead + 3 parallel read-only lanes (UI, API + repository, DB schema).
  - **v2 (improvement):** lead + 3 deep-dive lanes (variant/component flow,
    UX/UI/design, templates surface); lead verified every headline claim.
  - **v3 (domain + scalability):** lead + 2 deep-dive lanes (industry-domain
    money/UOM/concurrency/audit/links, startup-scalability search/pagination/
    observability/i18n/cache/bulk/export); lead verified the money-oracle float
    math (`estimate-row-total.ts:28-33`), no-Decimal-library, no-FTS5, no
    version-guard on UPDATE, and the dead export helpers + pricing-page
    overpromise.
- No code/migrations/config/provider state changed.
- Test decision: `NOT_REQUIRED` for this audit task (User Test Authorization
  Gate). `TEST_PROPOSAL`s recorded above await explicit owner authorization.

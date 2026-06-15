---
title: Ground-Truth Re-Verification & New Defects
type: docs
date: 2026-06-15
auditor: Claude (Opus 4.8, 1M context)
purpose: Every load-bearing claim re-verified against real code/SQL @72628d46, plus every NEW defect (V1..V14) the remediation introduced or both prior passes missed. Apply the fixes directly into the named plan docs.
---

# Ground-Truth Re-Verification & New Defects

Legend: **✓ CONFIRMED** · **✗ REFUTED** · **◐ PARTIAL/under-specified**. Every row cites real
`file:line`. The first section is the plan's verified foundation (keep it). The second section
is the new work (`V1…V14`).

---

## A. Re-verified foundation — these load-bearing claims hold (keep)

> **Citation note:** the LIVE definition of the insert/update RPC suite is
> `supabase/migrations/20260524050746_add_estimate_row_contingency_percentage.sql`, which
> **redefines** the functions first created in `20260524033151_estimate_sheet_version_control.sql`.
> Always verify against the latest `create or replace function` for a given RPC — citing the
> older migration is what produced the (now retracted) V1 below.

| Claim (plan) | Verdict | Evidence (file:line) |
|---|---|---|
| **U3 needs no migration**: `update_estimate_row_item_with_history` already accepts material/description/supplier/unit/unitCost/**contingencyPercentage**/miscCost/discipline/designation/categoryNodeId/supplierId/sourceLibraryItemId/sourceSnapshot/metadata | **✓ (full set, no exception)** | live RPC `20260524050746…sql:503-521` |
| **KTD7 JSON merge**: omit key → preserve; send top-level key → replace wholesale (no deep merge) | **✓** | `20260524050746…sql:520-521` (`source_snapshot = case when row_patch ? 'sourceSnapshot' then row_patch->'sourceSnapshot' else … end`; same idiom for `metadata`) |
| Insert RPC returns persisted snapshot incl. `rowRevision`; app currently discards it | **✓** | `20260524050746…sql:438` (`'row', estimate_row_item_snapshot(inserted_row)`); discard at `src/lib/estimates/actions.ts:2530` |
| Insert RPC idempotent by `correlation_id`; locks estimate row | **✓** | `20260524050746…sql:339` (`estimate_sheet_event_result(target_estimate_id, correlation_id)`) |
| Insert RPC classifies source-null inserts as `row_blank_added` (express would be mislabeled) | **✓** | `20260524050746…sql:422` (`case when inserted_row.source_library_item_id is null then 'row_blank_added' else 'row_added' end`) |
| Reclassification (U2) requires a migration; client `isBlankEstimateRowItem` ≠ SQL predicate | **✓** | SQL `:384` (`source_library_item_id is null`) vs client `src/components/workshop/estimate-sheet/activity-history.tsx:120-134` |
| `create_cost_library_component(target_workspace_id, component jsonb, price_options jsonb)` creates item+price-option atomically; requires exactly one `isDefault` | **✓** | `20260524141347_…sku_brand_view.sql:131-360, :180-182` |
| No existing RPC touches both `cost_library_items` and `estimate_row_items` → new promotion RPC genuinely needed and feasible | **✓** | grep: no such RPC; `create_cost_library_component` never references `estimate_row_items` |
| Permission helpers exist: `can_edit_estimate`, `can_access_estimate`, `is_workspace_editor`, `is_workspace_admin` | **✓** | `20260613192344_teamspace_rls_authuid_perf.sql:142,165,16`; `20260518090000_archestimator_core_schema.sql:180` |
| Column model needs no schema change; no `category` column; no `source` column (app-derived); express defaults satisfy NOT NULL | **✓** | `supabase/types.ts:1651+`; core schema `20260518090000…:96-118`; contingency `20260524050746…:2` |
| `unlink_estimate_row_item_from_library_with_history` expects linked row + `expected_row_revision`, clears source id, sets `link_state='detached'` | **✓** | `20260601184343_unlink_estimate_row_items.sql:50-79` |
| `canMakeProjectSpecific` is per-row, **no index/hover/count dependency** (so the U5 bug is genuinely unreproducible with real DB data) | **✓** | `src/components/workshop/estimate-sheet/rows/cells.tsx:79-82` |
| Collaboration subsystem real; cursor anchors on `data-estimate-row-id`/`data-estimate-cell-index`; cursor frames are signed/verified | **✓** | `src/hooks/use-estimate-cursor-broadcast.ts`; `EstimateSheetContent.tsx:771-776, :838-839`; `row-table.tsx:191/256/312` |
| Server-side `expected_row_revision` optimistic lock raises a conflict (no silent overwrite) | **✓** | `20260524033151…sql:451-456`; app sends it at `actions.ts:2575` |
| Workspace Components route has **no** project context today (projection is net-new) | **✓** | `app/workshop/library/components/page.tsx:11`; `cost-library-repository.ts:59-61` |
| `link_state` enum values used by the plan are all real | **✓** | enum `estimate_row_link_state`; `activity-history.tsx:1021-1046` |
| Project-source reuse rekeys row ids server-side (express stable-id is NOT auto-rekeyed though — see V6) | **✓** (rekey) | `20260613134852_insert_estimate_subtree_rpc.sql:189-195` (`gen_random_uuid()`) |

**Net:** the "no new table / U3 no-migration / promotion-RPC-feasible / collaboration-aware"
foundation is **SOUND**. Build on it.

---

## B. NEW defects — apply these fixes (none existed in the prior audit's matrix)

### V1 — ~~`contingencyPercentage` is silently dropped by BOTH RPCs~~ · **RETRACTED (false positive)**
- **Original claim (WRONG):** that neither RPC persists `contingencyPercentage`.
- **Correction:** the verification agent read the **superseded** `20260524033151` RPC version
  (created before the contingency column existed). The **live** RPC suite is redefined in
  `20260524050746_add_estimate_row_contingency_percentage.sql`, which **does** persist
  contingency: update reads it (`:505` `contingency_percentage = case when row_patch ?
  'contingencyPercentage' then … end`), insert reads it (`:392`), and the snapshot returns it
  (`:84`). **doc 07's Field Key Map is correct** — `contingencyPercentage` IS a working patch key.
- **No action required.** Retained as a documented retraction so the codebase AI does not
  re-raise it, and as a reminder to cite the LATEST `create or replace function` for any RPC.

### V2 — AI package-builder WRITE path can clobber `metadata.expressComponent` · **P1** · doc 04 U8 + doc 10
- **Truth:** `src/lib/ai/package-builder/apply.ts` inserts and **replaces** `estimate_row_items`
  and writes a full `metadata` object wholesale (`:590, :852, :1272`). U8 lists only the AI
  *read*-context (`read-context.ts`), never this **mutation** surface.
- **Why it matters:** a package-apply replacement that lands on an express row overwrites
  `metadata`, destroying `expressComponent` identity — the exact KTD7 JSON-replace hazard, on
  an unenumerated surface. AI may also read/replace express rows by material text.
- **Fix:** add `apply.ts` to U8's blast radius; add an edge-case row in doc 10 ("AI replacement
  targeting an express row must server-merge `metadata` or be blocked"); add a QA assertion.

### V3 — `content-visibility:auto` breaks the prescribed `measureElement` plan · **P1** · doc 09
- **Truth:** each row is `<tr class="grid … [content-visibility:auto] [contain-intrinsic-size:96px]">`
  (`row-table.tsx:185`). `content-visibility:auto` makes off-screen rows report the **intrinsic**
  96px, not measured height, which corrupts `rowVirtualizer.measureElement`. Row-table also uses
  `translateY(start − scrollMargin)` (`:598`) — mixing measured offsets with manual scrollMargin
  subtraction is exactly where scroll-jump regressions live. The sibling virtualizers doc 09
  cites use plain `<div>`s without `content-visibility` (`tree.tsx:1281`, `virtual-branch-list.tsx:143`).
- **Why it matters:** doc 09 presents "port the sibling `measureElement` pattern" as the primary
  path and the disable-on-active-editor as a fallback. Ground truth inverts this.
- **Fix:** in doc 09, either (a) require removing `content-visibility`/`contain-intrinsic-size`
  from rows in virtual+measured mode and reconcile the scrollMargin math, or (b) **promote the
  "disable virtualization while an express editor is open" fallback to the primary day-0 path**
  and keep dynamic measurement as the follow-up. Recommend (b) for day-0.

### V4 — Promotion RPC is under-specified in four concrete ways · **P1** · doc 07 + doc 11
- **V4a (editor/admin gate is NOT free):** the existing library write only checks workspace
  **membership** (`validate_cost_library_component_refs`, `20260523120957…sql:318-325`) — a
  viewer can call `create_cost_library_component` today. The promotion RPC must add
  `is_workspace_editor`/`is_workspace_admin` explicitly (SECURITY DEFINER bypasses RLS).
- **V4b (which gate function):** `is_workspace_editor` returns true for plain `member`
  (`20260613192344…sql:16,29`). Doc 11's "workspace editor/admin" label overstates it. Pin the
  exact function the RPC calls.
- **V4c (price-option NOT-NULL columns):** the default price option requires `label`
  (non-empty CHECK), `currency` (3-char, default `'PHP'`), `workspace_id`, `item_id`
  (`20260523120957…sql:40-62`). Doc 07's promotion effect list omits these.
- **V4d (DEFINER grants + folder-workspace binding):** every existing history RPC manually
  `revoke from public/anon; grant to authenticated` (`20260524033151…sql:1695-1717`) — doc 07
  omits the grant step. The writable-folder + editor checks must bind to the **folder's**
  workspace, not the estimate's.
- **Fix:** expand doc 07 §Promotion Contract with V4a–V4d and pin the gate function in doc 11.

### V5 — `sort_order` computed outside the RPC lock → concurrent-insert violation · **P1** · doc 10 + U2
- **Truth:** the client SELECTs max `sort_order` (`actions.ts:2514-2524`) **before** the RPC and
  passes it verbatim (insert RPC takes `sortOrder` as-is, `…sql:344`). A `unique(node_id,
  sort_order) deferrable` constraint exists (core `20260518090000…sql:117`). Two concurrent
  inserts read the same max → deferred-unique violation at commit. The estimate-level
  `FOR UPDATE` (`:301`) serializes *writers* but the max-SELECT happens outside it.
- **Why it matters:** express authoring adds a new, frequent insert entry point; the plan's
  concurrency doc (11) and edge-cases doc (10) never mention insert-ordering races.
- **Fix:** add an edge case to doc 10 and a note to U2: either compute `sort_order` inside the
  RPC under the lock, or handle the unique-violation with a retry.

### V6 — Express stable-id generation & collision rule undefined · **P1** · doc 02 + doc 07
- **Truth/contradiction:** Q14/Q34 require `metadata.expressComponent` (including its `id`) to
  "survive project-source copy"; U8 (doc 04:130) says copy "rekeys row ids"; doc 02:53 calls the
  `id` "stable" and "a forward-compatibility hedge." If the `id` survives a copy verbatim, two
  rows in two projects share the same "stable" id — a collision. No doc says **who** mints the
  id, that it is a UUID, or whether copy rekeys it.
- **Fix:** add a rule (doc 02 §Recommended Shape + doc 07 §Insert Contract): the express id is a
  **client-generated UUIDv4 at template creation**, and project-source copy **rekeys it** (new
  UUID) so "stable" means "stable within a row's lifetime," not "globally identical across
  copies." Reword Q14/Q34 to assert express *identity kind* survives copy while the *id* is
  rekeyed. (If the hedge has no near-term consumer, consider dropping the id entirely — see `05`.)

### V7 — Stale-revision recovery UX has zero existing hook · **P1** · doc 11
- **Truth:** the server lock is real (V-foundation), but **no app code recognizes the conflict
  error**: `onError` just rolls back + invalidates (`use-estimate-row-mutations.ts:147-151,
  257-264`); grep finds no handling of `estimate_sheet_row_revision_conflict`.
- **Why it matters:** doc 11's "stale-revision recovery UX" reads like a small addition; it is
  **entirely net-new** — error detection, local-value retention, and the recovery affordance all
  have to be built. This is real day-0 effort if concurrency is in scope.
- **Fix:** doc 11 should state that conflict detection + recovery UX is net-new (no existing
  hook), and either scope it into U9 explicitly or defer realtime-conflict UX out of day-0.

### V8 — doc 04 line 140 duplicated bullet contradicts line 131/132 · **P2** · doc 04
- **Truth:** U9 has a stray second "Tests:" bullet (doc 04:140) copied from U8 that ends
  "dashboard aggregation **from source snapshot**," contradicting line 132 ("from row fields")
  and the line-131 amendment ("Dashboard totals come from row-level fields").
- **Fix:** delete doc 04 line 140.

### V9 — `#7F7F7F` still blessed for load-bearing text → fails WCAG AA · **P2** · doc 09
- **Truth:** doc 09 (§Accessibility And Contrast) allows `#7F7F7F` as "decorative-only," but it is
  applied to placeholders and field labels, which are load-bearing. `#7F7F7F` on white ≈ 3.5:1 →
  **fails AA (4.5:1)**. `#5D5D5D` ≈ 5.9:1 ✓. DESIGN.md sanctions `#7F7F7F` for meta
  (`DESIGN.md:339-341`) but that guidance itself fails AA (known issue — see memory
  `designmd-tertiary-fails-aa`).
- **Fix:** doc 09 must floor **all** express placeholders, labels, and field text at `#5D5D5D`;
  reserve `#7F7F7F` strictly for non-text decoration.

### V10 — Orphaned QA rows + unmapped risk in traceability · **P2** · doc 08
- **Truth:** Q14, Q15, Q16, Q37, Q42 appear only under U8's unit row and map back to **no**
  requirement, violating doc 08's own invariant ("every QA row maps back to a requirement").
  RSK6 (image/storage) is referenced by no R/U/Q.
- **Fix:** map Q14/Q15/Q16/Q37 → R8 (and/or R16), Q42 → R7 (+R8); map RSK6 → U4/R1 image scope
  or mark it explicitly deferred.

### V11 — U1 "add metadata to workspace-repository SELECT" is a no-op · **P2** · doc 04 U1
- **Truth:** `workspace-repository.ts` already SELECTs `metadata` (`:1541`); only the *read* of
  `expressComponent` inside the row mapper (~`:1637`) is missing. The live estimate read path
  that genuinely lacks metadata is `estimate-repository.ts` (`ESTIMATE_ROW_ITEM_SELECT:45`,
  `toEstimateRowItem:71-92`) and the domain/UI types (`estimate-tree.ts:25-44`,
  `estimates/types.ts:81-136`).
- **Fix:** correct U1 to name `estimate-repository.ts` as the load-bearing SELECT/mapper edit and
  reduce the workspace-repository change to "read `expressComponent` from already-selected
  metadata." Also cite the `isPersistedPlaceholder` heuristic (`activity-history.tsx:122-127`)
  as the concrete predicate the express helper must defeat.

### V12 — doc 10 misdescribes `applyEditableValuesToLibraryItem` · **P2** · doc 10
- **Truth:** the function carries only quantity/contingency/misc (`EstimateSheetContent.tsx:398-416`);
  material/description/unit/unitCost survive only via `...libraryItem` spread, not because the
  function "carries" them. Doc 10's invariant ("`applyEditableValuesToLibraryItem` carries
  material/description/unit/unitCost") is correct in effect but wrong in mechanism, which will
  mislead an implementer who edits that function.
- **Fix:** reword doc 10 to "express fields survive move/replace via object spread of the moved
  row; `applyEditableValuesToLibraryItem` does not touch them — do not drop them when widening it."

### V13 — doc 11 "draft has no server row id to broadcast" is factually wrong here · **P2** · doc 11
- **Truth:** the optimistic insert renders a **client-generated** id into the DOM before
  persistence (`EstimateSheetContent.tsx:353/1706`), and `insertEstimateRowItemFromLibrary`
  persists that **same** id (`actions.ts:2528`). The cursor layer broadcasts whatever
  `data-estimate-row-id` is in the DOM (`:838`). So a hovering author **would** broadcast the
  pre-persist id. No row *content* leaks (peers fall back to coords), but doc 11's premise is wrong.
- **Fix:** doc 11 must require **actively suppressing** broadcast/anchor of an express row's id
  until a `persisted` flag is set, rather than assuming the draft id is unbroadcastable.

### V14 — Operational specificity gaps · **P2** · doc 12 + doc 11
- **V14a:** telemetry (doc 12 §Observability) lists metrics/thresholds but **no owning system and
  no event names** — it is a wishlist; assign an owner and a concrete event taxonomy.
- **V14b:** no doc defines what happens to an in-flight express **draft** when the user navigates
  away / switches estimate tab (data-loss/orphan path) — add to doc 11.
- **V14c:** the static-docs gate (doc 12 / Q38) is "run or manually verify" with no script/owner —
  acceptable, but flag it.

---

## C. Severity roll-up

| Severity | Count | IDs |
|---|---|---|
| **P1 (fix before building the affected unit)** | 6 | V2, V3, V4, V5, V6, V7 |
| **P2 (correctness/specificity; fix during the doc-correction pass)** | 7 | V8, V9, V10, V11, V12, V13, V14 |
| Retracted (false positive, no action) | 1 | V1 |

None of these invalidate the architecture. They are the gap between "strong plan" and
"very close to perfect." See `07-actionable-remediation-checklist.md` for the execution order.

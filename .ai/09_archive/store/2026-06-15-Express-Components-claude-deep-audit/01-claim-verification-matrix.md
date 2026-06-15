---
title: Express Components — Claim Verification Matrix
type: docs
date: 2026-06-15
auditor: Claude (Opus 4.8, 1M context)
purpose: Every code/SQL claim in the plan pack, verified against ground truth @72628d46 + live provider. Apply these corrections directly into the plan docs.
---

# Claim Verification Matrix

Legend: **✓ accurate** · **⚠ overstated/wrong** (plan claims a problem that is smaller/absent) ·
**△ understated** (the real problem is bigger, or a step is missing) · **✗ inaccurate** (wrong
fact/line/name). Each row cites evidence and the corrective action. Full detail per finding in
`evidence/agent-findings.md`.

---

## A. Claims that VERIFIED ACCURATE (the plan's strong foundation)

| Claim | Verdict | Evidence |
|---|---|---|
| Add-row flow: `QuietAddRowButton`→`onAddBlankRow`→`insertBlankRow`→`insertLibraryItem(createBlankEstimateRowTemplate())`→`insertRow`→`insertEstimateRowItemFromLibrary`→`insert_estimate_row_item_with_history` | ✓ exact | `drop-zones.tsx:36`, `EstimateSheetContent.tsx:1960/220/1700`, `use-estimate-row-mutations.ts:156`, `actions.ts:2493` |
| Blank template: `source:"project"`, placeholder material, unit `unit`, zero cost, tag `manual-row-placeholder` | ✓ | `EstimateSheetContent.tsx:220` |
| Material cell is display-only (no inline name/desc/unit/cost editing today) | ✓ | `cells.tsx:179/201/217/276`, `row-table.tsx:212/240/272/332` |
| Update path (app layer) currently exposes only `quantity`/`contingencyPercentage`/`miscCost` | ✓ | `use-estimate-row-mutations.ts:49/70/220`, `actions.ts:80/2561` |
| RLS enabled on all 4 tables; `estimate_row_items` reads via `can_access_estimate`, writes via `can_edit_estimate`; library tables workspace-scoped | ✓ live-verified | `evidence/live-supabase-verification.md §3` |
| `link_state` enum values used (`unlinked`, `linked-clean`, `linked-overridden`, `detached`, `source-changed`) are ALL real | ✓ live-verified | enum `estimate_row_link_state` |
| Components tab loads workspace library, not project rows; project-source data lives in `TemplatesTree` | ✓ | `LibraryComponentsRoute.tsx:9`, `LibraryPageClient.tsx:86`, `TemplatesTree.tsx:404/423/479/524` |
| `row_blank_added` classifies source-less inserts (express would be mislabeled) | ✓ live-verified | insert RPC `case when source_library_item_id is null then 'row_blank_added'` |
| Totals/line-total computation handles express row fields correctly | ✓ | `estimate_row_line_total`, dashboard lane B4 (score 92) |

**Action:** keep all of the above; cite the live-verification file as the authoritative DB contract.

---

## B. Claims that are OVERSTATED or WRONG — correct these in the plan

### B1. KTD7 / U3 — "the RPC replaces `metadata`/`source_snapshot` wholesale" ⚠
- **Live truth:** the update RPC only assigns a JSON column **when the patch contains that key**:
  `metadata = case when row_patch ? 'metadata' then coalesce(row_patch->'metadata','{}') else row_item.metadata end`
  (same for `source_snapshot`). **Omit the key → existing value preserved.**
- **Correction:** routine express *field* edits that don't touch `metadata`/`sourceSnapshot` are
  already safe. The server-merge discipline applies **only** to operations that intentionally
  mutate those JSON blobs (promotion relink — see A7-F7; express-metadata updates). Rewrite KTD7
  accordingly and state the merge rule precisely. *(A3 KTD7-premise dimension = 95/100 accurate on
  the narrow "replace if present" fact, but the plan's broad framing misleads.)*
- Evidence: `20260524033151_estimate_sheet_version_control.sql:478`, live RPC body.

### B2. U3 — "widen the row update contract" implies a DB change ⚠
- **Live truth:** the update RPC **already accepts** `material, description, supplier, unit,
  unitCost, contingencyPercentage, miscCost, discipline, designation, linkState, categoryNodeId,
  supplierId, sourceLibraryItemId, sourceSnapshot, metadata`. The narrowing is **app-layer only**
  (`actions.ts:80` input type + mutation hook).
- **Correction:** state in U3 that **no migration is needed for the update path**; the work is
  (1) widen the server-action input type, (2) widen `UpdateEstimateRowItemResult` + the result
  reader, (3) widen the optimistic patch + tree-patch. Evidence: `20260524033151:466-479`.

### B3. U5 / KTD5 / doc 01:66-73 — the icon-bug root cause ✗ (misdiagnosed)
- **Ground truth:** `cloneLibraryItemForEstimate` spreads `...libraryItem` (preserves
  `sourceLibraryItemId`/`linkState`); the insert RPC sets `linkState = sourceLibraryItemId ?
  'linked-clean' : 'unlinked'`; `canMakeProjectSpecific` is evaluated per-row with **no index/
  hover/count dependency**. So two DB-backed duplicate instances are structurally identical and
  both should pass the gate. The plan's 4 "likely failure modes" are unverified speculation.
- **The one code-grounded failure:** rows with **non-UUID ids or missing `source_library_item_id`**
  (i.e. seed/test fixtures like `lib-sofa`) fail the gate permanently, independent of order.
- **Correction:** **reproduce the bug against a real project first** (capture both instances'
  `source_library_item_id`/`link_state`). If it cannot be reproduced with DB-backed components,
  reframe U5 from "fix" to "normalization hardening" and fix KTD5's wording. Make U5's first
  deliverable a failing reproduction test. Evidence: `EstimateSheetContent.tsx:352/2552`,
  `cells.tsx:79-82`, `estimate-tree-data.ts:155`, `types.ts:112-113`.

### B4. KTD6 / U6 — "render Project only when projectId is supplied" ✗ (no projectId exists)
- **Ground truth:** the workspace Components route has **zero** project context.
  `app/workshop/library/components/page.tsx:8-11` reads `searchParams` only for a smoke flag and
  renders `<LibraryComponentsRoute/>` with no args; that component calls workspace-scoped
  `getCurrentWorkspaceComponentRowsLibrary()`. This is **net-new plumbing**, not a guard.
- **Correction:** reframe KTD6/U6; add `app/workshop/library/components/page.tsx` to the file
  list; choose the mechanism (query param vs project-scoped entrypoint vs the estimate-side
  sidebar `component-library/index.tsx`, which *already* has `projectId` at `:608`). Evidence: B4 above.

### B5. doc 02 §Project Folder — "place a virtual node before All Components" ⚠ (breaks the tree builder)
- **Ground truth:** `withAllComponentsRoot` returns a single-root array; `buildFolderPlacement`
  hardcodes `hasSyntheticRoot = isAllComponentsFolderId(nodes[0].folderId)` — **positional**. The
  DnD/selection layer models only `{kind:'folder'}` / component-leaf datums. A pre-pended virtual
  node breaks reorder, selection, and drop-placement assumptions.
- **Correction:** add U6 sub-tasks to de-positionalize the synthetic-root detection and add a
  third `LibraryFolderTreeDatum` kind that is non-reorderable/non-droppable. Evidence:
  `LibraryFolderTree.tsx:189/282-303/297/540/553`, `library-folder-reorder.ts:10`.

### B6. doc 01:15 — blank template sets `category "Unassigned"` ✗ (no `category` column)
- **Live truth:** `estimate_row_items` has **no `category` column**; the real columns are
  `discipline`, `designation`, `category_node_id` (all relevant ones NOT NULL except
  `category_node_id`). The plan never mentions `discipline`/`designation`.
- **Correction:** fix the doc 01 wording, and have the express template + widened patch
  consciously set `discipline`/`designation`/`categoryNodeId` (the RPC defaults them to `''`, so
  not a blocker, but they feed proposal/dashboard bucketing). Evidence:
  `evidence/live-supabase-verification.md §1`.

---

## C. Claims that are UNDERSTATED — the real gap is bigger / a step is missing

### C1. U2 — "insert must return persisted row + row revision" △ (it already does; app discards it)
- **Truth:** the insert RPC already returns `{ rowId, row: snapshot(...) }` including `rowRevision`
  (snapshot helper returns `rowRevision`/`lineTotal`/`subTotal`). But the app action
  `insertEstimateRowItemFromLibrary` destructures only `{ error }`, returns `void`, and the
  insert mutation's shared `onSuccess` never reconciles the optimistic row's id/revision.
- **Action:** state the 3 concrete app-layer changes (read `data`→`readHistoryRowResult`; widen
  return type; add insert `onSuccess` `setQueryData` patching `rowRevision`/id, mirroring
  `detachMutation` `onSuccess` at `use-estimate-row-mutations.ts:199-207`). No migration needed.
  Evidence: `actions.ts:2530/2558`, `use-estimate-row-mutations.ts:142/156`.

### C2. U2 — "if insert fails, keep a draft row" △ (today it DELETES the row)
- **Truth:** insert `onError` calls `rollback` = `restoreEstimateState(...)`, which **removes** the
  optimistic row. The draft-recovery contract *replaces* this behavior; it isn't additive. Also,
  the `mutationId` is generated *inside* the hook, so it isn't visible to the component for Retry.
- **Action:** specify a dedicated insert `onMutate`/`onError` that keeps + flags the row, and
  surface a stable `mutationId`/correlation to the component. Evidence:
  `use-estimate-row-mutations.ts:147`, `EstimateSheetContent.tsx:1728/1704`.

### C3. U2/U8 — "express insert uses `row_added`" △ (requires a SQL migration; client/SQL "blank" defs differ)
- **Truth:** the event type is hardcoded in the RPC (`source_library_item_id is null →
  'row_blank_added'`). To make express inserts `row_added` (or a new event) you **must edit the
  RPC** = a migration. Worse, the SQL "blank" definition (source-null) is **incompatible** with
  the client `isBlankEstimateRowItem` (requires `source='project'` AND `material='Drag or add a
  component here'` AND cost 0 AND category Unassigned AND no image). The two must be reconciled.
- **Action:** add an explicit migration task to U2; make the SQL predicate mirror the client
  heuristic (or key off `metadata.tags ? 'manual-row-placeholder'`). Evidence:
  `20260524050746...:422`, `activity-history.tsx:120-134`.

### C4. KTD2 — "express identity is metadata" △ (metadata isn't in the read path or the type at all)
- **Truth:** `ESTIMATE_ROW_ITEM_SELECT` omits `metadata`; `toEstimateRowItem` maps none; the UI
  `EstimateRowItem` type (`types.ts:81-136`) and domain type (`estimate-tree.ts:25-44`) have **no
  `metadata`/`expressComponent` field**. The main read mapping (`workspace-repository.ts:1636-1683`)
  extracts only `tags`/`laborUnitCost`/`scopeStatus` from `metadata`. So `metadata.expressComponent`
  has **zero client representation today** — the entire identity model is unreadable.
- **Action:** add a unit (or extend U3) to extend the SELECT + mapping + type, OR reuse the
  already-passed-through `tags` for express identity (cheapest). Evidence: `estimate-repository.ts:45/71-92`,
  `types.ts:81-136`, `workspace-repository.ts:1650`.

### C5. U7 — promotion atomicity/idempotency △ (named, but the concrete mechanism is missing)
- **Truth:** `create_cost_library_component` is atomic *within* the library aggregate and rich,
  but **does not touch `estimate_row_items`**; no RPC spans both. It is **not idempotent** (mints a
  new id unless caller supplies one; no `correlation_id`). The guard (`promotedLibraryItemId`) is
  written in the relink step (txn 2), so create-then-crash orphans a library item and a retry
  double-creates. Concurrent promotion can TOCTOU double-create (no uniqueness/lock).
- **Action:** pick one — a new `promote_express_row_to_library_component` SECURITY DEFINER RPC
  (true atomicity, a migration) **or** a deterministic-id + pre-write correlation-id saga with
  `INSERT ... ON CONFLICT (id) DO NOTHING` create-side de-dup. Specify which folder promotion
  targets and require non-empty `name`. Evidence: `evidence/live-supabase-verification.md §6`,
  `component-library/actions.ts:448`, `estimates/actions.ts:2571`.

---

## D. Naming / line / precision fixes (low severity, but they trip implementers)

| Fix | Detail |
|---|---|
| **`itemCost` vs `unitCost`** | U3 lists patch field `itemCost`; the RPC patch key is **`unitCost`** (DB column `unit_cost`). The domain patch type uses `itemCost`. State the canonical map app→patch→column. (`actions.ts:100/2563`) |
| **"adjustment" = `contingency_percentage`** | doc 01:35 calls it "adjustment"; the column/field is `contingency_percentage`/`contingencyPercentage`. |
| **No "Creating" save state** | doc 03:36/40 reuses `saveState` but invents a "Creating" indicator; `EstimateSaveState` has exactly 5 values (`idle/dirty/saving/saved/failed`) and is hook-global, not per-row. (`use-estimate-row-mutations.ts:11`) |
| **`row_blank_added` line** | operative classification is at `20260524050746...:422` (and `20260524033151:384`), not only the migration cited in doc 01. |
| **Two distinct library surfaces** | "the Components tab" (workspace, no projectId) ≠ the estimate-side picker `component-library/index.tsx` (has projectId). Name which one hosts the projection. |

---

## E. Claims the audit REFUTED / softened (do NOT over-correct these)

- **Published image gap — REFUTED.** A lane claimed an express image on `metadata` wouldn't
  publish; on re-verify, publication/snapshot/history all read `source_snapshot.imageUrl`, and the
  plan **already** says to store the image in `source_snapshot` (U4). So this is fine *as written*
  — just keep the "image → source_snapshot.imageUrl" rule explicit. (B4-F4 → low)
- **Blank/express "active collision" — OVERSTATED → medium.** The plan does include an exclusion
  marker line; the collision is a real edge to test, not an active defect. (B6-F2 → medium)
- **Promotion criticals — tempered critical→high** on re-verify (core claims confirmed; "critical"
  framing softened). Still must be resolved. (A7-F3/F4)

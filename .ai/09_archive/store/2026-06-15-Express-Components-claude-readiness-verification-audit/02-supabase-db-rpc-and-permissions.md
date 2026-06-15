---
title: Supabase / DB / RPC / Permissions Scrutiny
type: docs
date: 2026-06-15
auditor: Claude (Opus 4.8, 1M context)
purpose: All-angles database scrutiny of the Express Components plan — schema, RPC contracts, JSON merge, migrations, RLS, grants, promotion atomicity, and the permission boundary.
---

# Supabase / DB / RPC / Permissions Scrutiny

This is the Supabase deep-dive the audit was asked for ("scrutinize it in all angles
possible"). Everything here is verified against the real migration SQL in
`supabase/migrations/` and the generated `supabase/types.ts` at `72628d46`.

## 1. The foundation is sound — and it was verified, not trusted

| Question | Answer | Evidence |
|---|---|---|
| Does the update RPC really accept the full express field set (so U3 needs no migration)? | **Yes** | live RPC `20260524050746_add_estimate_row_contingency_percentage.sql:503-521` reads `quantity, unitCost, contingencyPercentage, miscCost, material, description, supplier, unit, discipline, designation, linkState, categoryNodeId, supplierId, sourceLibraryItemId, sourceSnapshot, metadata` |
| Is the JSON merge really omit-preserve / send-replace (KTD7)? | **Yes** | `20260524050746…sql:520-521` — `metadata = case when row_patch ? 'metadata' then coalesce(...) else row_item.metadata end` (same for `source_snapshot`) |
| Does the insert RPC return the snapshot + rowRevision and is it idempotent? | **Yes** | `:396-401, :150, :303-306` |
| Is there a `category` column? a `source` column? | **No / No** | `supabase/types.ts:1651+`; `source` is app-derived from `source_library_item_id` |
| Do express defaults satisfy NOT NULL? | **Yes** | `discipline`/`designation` NOT NULL with `''` default; `category_node_id` nullable; express sets `"Unspecified"`/`""`/`null` |
| Is the promotion RPC feasible? | **Yes** | `create_cost_library_component` already creates item + price option atomically (`20260524141347…sql:131-360`); the new RPC inlines that + relink + history |

**This is the most important DB finding: the plan's central wager — "no new table, U3 no
migration, promotion via a new atomic RPC" — is verified true.** Build on it. The DB-strategy
confidence is **88/100**.

## 2. Migration ledger — verified accurate, with one nuance

The plan's migration ledger (doc 07, doc 12) is correct:

| Unit | Migration needed? | Verified |
|---|---|---|
| U1 read path | No (SELECT/mapper/type) | ✓ |
| U2 insert return/draft | No for return; **yes for `row_blank_added` reclassification** | ✓ — classification is hardcoded SQL at `…sql:384` |
| U3 update widening | **No** | ✓ — RPC already accepts keys |
| U6 projection | No new table | ✓ |
| U7 promotion | **Yes** (new atomic RPC) | ✓ |
| Storage upload | Yes, if added | ✓ — deferred |

**Nuance:** the U2 reclassification migration must reconcile two *different* "blank"
definitions. The SQL predicate is `source_library_item_id is null` (`…sql:384`); the client
`isBlankEstimateRowItem` requires `source==="project"` AND the blank material label AND zero
cost AND (`manual-row-placeholder` tag OR persisted-placeholder heuristic)
(`activity-history.tsx:120-134`). The new SQL predicate should key off the blank material label
and/or `metadata.tags ? 'manual-row-placeholder'` to mirror the client. The plan says this; it
is correct and implementable in that RPC's `case`.

## 3. NEW database risks the plan misses (detail for V4, V5)

### V1 RETRACTED — `contingencyPercentage` IS persisted (not a defect)
An earlier draft flagged `contingencyPercentage` as dropped by the RPCs. That was wrong: it came
from reading the **superseded** `20260524033151` RPC. The **live** suite
(`20260524050746_add_estimate_row_contingency_percentage.sql`) persists it — update `:505`, insert
`:392`, snapshot `:84`. **Doc 07's Field Key Map is correct.** No action. (Lesson: cite the latest
`create or replace function`.)

### Promotion RPC under-specs (V4 · P1)
- **Editor/admin gate is not free.** `validate_cost_library_component_refs` checks only
  workspace **membership** (`20260523120957…sql:318-325`); a viewer can call
  `create_cost_library_component` today. The promotion RPC must add `is_workspace_editor` /
  `is_workspace_admin` explicitly — SECURITY DEFINER bypasses RLS, so in-RPC checks are the only
  guard. Precedent exists (`mass_deletion_governance.sql:347`).
- **`is_workspace_editor` includes plain `member`** (`20260613192344…sql:16,29`). Doc 11's
  "workspace editor/admin" label overstates the function. Pin which function the RPC uses.
- **Price-option NOT-NULL columns omitted:** `label` (non-empty), `currency` (3-char, default
  `'PHP'`), `workspace_id`, `item_id` (`20260523120957…sql:40-62`). The default price option
  must populate these or the insert fails.
- **DEFINER grant boilerplate omitted.** Every history RPC does `revoke from public/anon; grant
  to authenticated` (`20260524033151…sql:1695-1717`). The new RPC must too.
- **Folder-workspace binding.** Writable-folder + editor checks must bind to the **folder's**
  workspace, not the estimate's — an estimate editor with read access to a project must not
  promote into a workspace they cannot write.

### `sort_order` concurrency (V5 · P1)
Client computes max `sort_order` outside the RPC lock (`actions.ts:2514-2524`) and passes it
verbatim (`…sql:344`); `unique(node_id, sort_order) deferrable` (core `…sql:117`) → concurrent
inserts collide at commit. The estimate `FOR UPDATE` (`:301`) doesn't cover the pre-RPC SELECT.
Compute under the lock or retry on violation.

## 4. RLS / grants / provider blast radius — confirmed minimal

- RLS enabled on `estimate_row_items`, `cost_library_items`, `cost_library_item_price_options`,
  `library_folders` (live-verified by the plan; consistent with policy migrations).
- `estimate_row_items`: read via `can_access_estimate`, write via `can_edit_estimate`
  (`20260613192344…sql:142,165`).
- Library tables: workspace-scoped; **write requires only membership today** (important — see
  V4a). The dual-gate the plan adds for promotion is a genuine *tightening*, not redundant.
- **No new table → no new Data API grants, RLS policies, or generated-type surface.** Confirmed.
  The only provider changes are the U2 and U7 RPC migrations, both scoped to project
  `ebxxqidacheyapmmzavr`.
- No hidden trigger fires on `metadata` change (only `set_updated_at`; the `enforce_area_node`
  trigger was dropped) — the plan's silence here is safe.

## 5. Does the plan analyze blast radius / DB implications? — Yes, and accurately

The user asked whether the plan analyzes blast radius and DB implications. **It does, and the
analysis is largely correct:** doc 02, doc 07, and doc 12 correctly scope the provider impact,
the migration boundaries, the JSON semantics, and the RLS posture. The gaps are *specificity*
(V1, V4, V5), not *direction*. This is a well-above-average DB plan; the corrections are
surgical.

## 6. Recommended SQL verification gates (for the implementer, before claiming U2/U7 done)

```sql
-- U2: prove the reclassification predicate
--   blank label / manual-row-placeholder tag -> row_blank_added
--   express (null source, non-blank label)   -> row_added
-- U7: prove atomicity + idempotency
--   same correlation_id twice -> one cost_library_items row, one default price option
--   crash between create and relink -> full rollback, no orphan library item
--   viewer / member-without-editor -> RPC rejects
--   target folder in a different workspace than caller can write -> RPC rejects
```
Map these to Q32 and Q33 (already in the QA matrix) and add the viewer/folder-workspace negative
cases.

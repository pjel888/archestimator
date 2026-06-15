---
title: Day-0 P1 Blockers — Deep Dive
type: docs
date: 2026-06-15
auditor: Claude (Opus 4.8, 1M context)
purpose: Full ground-truth evidence and fixes for the 8 day-0 P1 findings. Each was adversarially confirmed against live code at HEAD a110ea43.
---

# Day-0 P1 Blockers — Deep Dive

These 8 must be resolved before (or during) the unit they affect. Most are doc corrections;
DB-N1, BR-N1, BR-N2 and PERF-N1 also imply concrete code/test work in U2/U3/U4/U8.

---

## DB-N1 — The day-0 write path does not enforce the viewer-block it claims · code + doc 11 + doc 04

**Claim in plan:** R14 (doc 04:34) "viewers cannot author/edit express rows"; AE10 (doc 04:157)
"server actions reject mutation attempts"; doc 11:65 "server actions/RPCs are authoritative";
doc 11:87 "viewer cannot add/edit through server action."

**Ground truth:**
- `assertCanEditEstimate` exists (`src/lib/estimates/actions.ts:360`) and is used by 7 actions
  (`:1496, :1799, :1849, :2243, :2284, :2352, :2630`) — **but not** by the three express write
  actions: `insertEstimateRowItemFromLibrary` (`:2493`), `updateEstimateRowItem` (`:2561`),
  `replaceEstimateRowItemWithLibrary` (`:2586`). *(Orchestrator-verified directly.)*
- Those actions call SECURITY DEFINER RPCs (`insert/update/replace_estimate_row_item_with_history`,
  `20260524050746:324/454/604`) which resolve authorization via `resolve_estimate_workspace`
  (`20260524033151:111-118`) — **workspace membership only, never `can_edit_estimate`.**
- SECURITY DEFINER **bypasses** the `estimate_row_items` RLS write policies that *do* gate on
  `can_edit_estimate` (`20260614144136:95-121`).
- `can_edit_estimate` requires role `owner/admin/editor` (`20260613192344:165-187`); a workspace
  **viewer** is a legitimate member who passes `resolve_estimate_workspace` but fails
  `can_edit_estimate`.

**Net:** a viewer can insert/update/replace express rows through the server actions. The plan
asserts an enforced block with **no enforcing mechanism** on the day-0 path (U3/U4 never mention
`assertCanEditEstimate` or an in-RPC `can_edit` check). doc 02:139 / doc 01:100 describe the RLS
*table* policy, which the DEFINER write path bypasses — so the docs misattribute protection that
isn't active.

**Fix:** add `assertCanEditEstimate` to the three express actions (preferred — the RPCs are
shared with non-express callers, so gate at the action layer to avoid behavior change), OR add an
in-RPC `can_edit_estimate` check. Reword R14/AE10/doc 11 to stop implying the current RPC enforces
edit permission. Add a U9 test: viewer calling the express action is rejected server-side.

> Note: this is a **pre-existing** authorization gap in the row-mutation actions that the express
> feature inherits and *surfaces* as a day-0 requirement. Worth flagging to the team as a general
> finding, not only an express one.

---

## BR-N1 — Drag/drop move/replace clobbers express identity server-side (primary path) · doc 04 U8 + doc 07 + doc 10 + code

**Chain:** `moveRowComponent` (`EstimateSheetContent.tsx:2093`) → `replaceRowItem` (`:2035`,
optimistic full object spread → UI *looks* express) → `use-estimate-row-mutations.ts:162` →
`replaceEstimateRowItemWithLibrary` (`actions.ts:2586`) → `replace_estimate_row_item_with_history`.

**Clobber:** the action always sends `metadata: getEstimateRowMetadata(libraryItem)`
(`actions.ts:2611`); `getEstimateRowMetadata` (`:768-780`) builds `{categoryNodeId, brandId,
supplierId, sourceComponentId, …}` with **no `expressComponent` key and no carry of the row's
existing metadata.** The RPC (`20260524050746:653,667`) **wholesale-replaces** `source_snapshot`
and `metadata`. So a moved/replaced express row persists with **no `metadata.expressComponent`**;
once U1 widens the read path it reclassifies as non-express/blank on reload. `getValidatedEstimateRow`
(`actions.ts:692-693`) omits metadata/source_snapshot, so even a server-merge fix has nothing to
merge from.

**Why it slipped:** pass-2 V2 was scoped to the AI `apply.ts` path only; the remediation added
exactly that. The **identical** hazard on the in-scope drag/drop path (R8) — through the same
`replace` RPC — was not enumerated. doc 10 "Move express row" only addresses the *client*
object-spread level.

**Fix:** add `replaceEstimateRowItemWithLibrary` + `getEstimateRowMetadata` + the `replace` RPC +
the `getValidatedEstimateRow` SELECT widening to U8 blast radius. Require move/replace of an express
row to carry-or-merge `expressComponent` or block it. Add a doc-10 row for the **server** replace
path. Add a QA assertion: a moved express row's `metadata.expressComponent` survives a round-trip
reload. (BR-N1 and the AI path can share one server-side mitigation.)

---

## BR-N2 — The express-id rekey-on-copy is asserted everywhere but implemented nowhere · doc 04 U8 + doc 07 + doc 00 + code

**Claim:** KTD2 (doc 04:41), U8 (doc 04:134), doc 07:89, doc 02:53, Q14 (doc 05:30), Q34 — all
state project-source/template copy **rekeys** `metadata.expressComponent.id`.

**Ground truth:** the only copy RPC `insert_estimate_subtree_into_estimate_with_history`
(`20260613134852:189-227`, sole definition) rekeys the **row id** (`gen_random_uuid()` `:195`) but
copies metadata **verbatim** (`:219` `coalesce(row_item.metadata,'{}') || jsonb_build_object(…four
provenance keys…)`). The `||` overrides only the four provenance keys; `expressComponent.id` passes
through unchanged. `grep expressComponent supabase/migrations/` = **0 hits**; the client path
(`reusable-sources/actions.ts:401-426`) does no post-copy rekey. The **template** copy path has the
same verbatim merge (`20260612094734:950`).

**Net:** two rows in two projects would share the same "stable" express id — the exact V6 collision
the pass-2 fix was meant to prevent. U8 lists no migration and no owner for the rekey; a test
written to Q14 would fail against current behavior with no task to make it pass.

**Fix:** pick one — (a) `jsonb_set` the `expressComponent.id` with a fresh UUID inside the copy
(and template) RPC; (b) a client/server post-copy rekey step; (c) drop the id per the doc-05 hedge.
Until chosen, correct KTD2/U8/doc 07/Q14 to stop asserting rekey-on-copy as existing behavior, and
add `insert_estimate_subtree_into_estimate_with_history` (+ the template copy RPC) to U8's mutator
surfaces.

---

## SEC-N2 — doc 11's Realtime Model assumes a row-sync path that doesn't exist · doc 11

**Claim:** doc 11:13-18 "after insert … peers see the row through normal realtime/cache refresh
paths."

**Ground truth:** `grep postgres_changes src/` = **0 hits**. The only realtime channels are the
cursor broadcast (`use-estimate-cursor-broadcast.ts:152`, cursor payloads only) and project
presence (`use-project-presence.ts:156`). All row-mutation invalidations use `refetchType:'none'`
(`use-estimate-row-mutations.ts:144,150,205,216,254,266`); the estimate query is `staleTime 5min`
+ `refetchOnWindowFocus:false` (`use-estimate-query.ts:46-47,107-108,161`; global defaults
`providers.tsx:18-20`); no polling. **A peer will not see another user's express row until a manual
refetch/navigation — up to 5 minutes later, not "realtime."**

**Important nuance:** data integrity is **not** at risk — the server optimistic lock
(`expected_row_revision`, raises `estimate_sheet_row_revision_conflict` at `20260524050746:490`) is
real and rejects stale writes. But (a) the collaboration narrative is ungrounded, and (b) because
peers rarely hold a fresh concurrent revision, the stale-revision recovery UX (V7) will seldom
actually fire — the recovery path must still exist, but the doc over-states the system's realtime-ness.

**Fix:** rewrite doc 11 Realtime Model to state the truth — row data is not realtime-synced today
(cursor/presence only). Either (a) scope doc 11 to optimistic-lock integrity + cursor suppression +
manual-refetch eventual visibility and defer true realtime row propagation as out-of-scope, or
(b) if near-real-time peer visibility is actually required, add a `postgres_changes`/broadcast-on-
insert workstream to U9 with its own RLS/replica-identity work.

---

## PERF-N1 — The "no full-tree rebuild on keystroke" claim never says where editor state lives · doc 03 + doc 09 + test

**Claim:** doc 03:110 "Keystrokes in one express editor must not rebuild the full row tree. Editor
state is row-scoped."

**Ground truth:** the render isolation that makes this true is the *sole* mechanism preventing
fan-out: the table comparator gates on `prev.editableRows[item.id] !== next…` (`row-table.tsx:81-84`)
and the per-row memo receives `editableRow={editableRows[item.id]}` (`:575`, default shallow memo
`:133/388`). `EditableRowValue` (`editable-row-model.ts:44`) currently holds only
quantity/contingency/misc — **no text fields.** If express text state is added to `EditableRowValue`,
isolation holds (proven by `tests/vitest/perf/estimate-sheet-render-relief.test.tsx`, which passes —
but only exercises **numeric** cells). If it's stored in a **separate** top-level `useState`/map in
`EstimateSheetContent`, neither gate sees it and isolation silently breaks — and the existing perf
test won't catch it. The plan never commits to which; a grep of all 14 docs for `EditableRowValue` /
`editableRows` / render-probe = **0 hits.**

**Fix:** add a Performance/State-Location subsection mandating express editor text state live inside
the per-row `EditableRowValue` record (extend the type); forbid a parallel top-level express-draft
map. Require a render-probe test (mirroring the numeric one) asserting that typing in an express name
field re-renders only that row.

---

## DM-N1 — Legacy-row migration safety asserted not proven; renamed source-less rows can leak · doc 02 + doc 07 + doc 10 + evidence

**Three threads (two solid, one tempered):**
1. **Evidence gap (solid):** `evidence/live-supabase-evidence.md` never captures the 29 source-less
   rows' `material/tags/category/unit_cost/image`. The "29 legacy rows" figure (doc 12:52) has zero
   row-shape detail. Safety is asserted, not proven.
2. **Renamed-row Project-folder leak (solid, strongest):** the client blank predicate
   (`activity-history.tsx:120-134`) requires `material === 'Drag or add a component here'` (top-level
   AND). A legacy **unlinked** row whose material was user-renamed is neither blank-by-client nor
   express, is not detached (so `isProjectSpecificRowItem` is false, `cells.tsx:75-77`), yet doc
   02:110 includes "rows that are unlinked but no longer blank placeholders" in the Project folder —
   so it would **surface as a project-local component.** No doc enumerates this case.
3. **SQL vs client predicate divergence (tempered — verifier flagged as overstated):** doc 07:93's
   narrowed SQL predicate is looser than the full client predicate, but it fires only on **new**
   inserts (forward-only), where express inserts always set non-placeholder material — so no concrete
   misclassification of historical rows is demonstrated.

**Fix:** before U2 coding, run read-only SQL capturing the 29 rows' shape into
`evidence/live-supabase-evidence.md`; add an edge case + Q-scenario for "abandoned source-less row
with edited material" covering Project-folder inclusion *and* history; either mirror the full client
predicate in SQL or explicitly document the divergence is acceptable (new-insert-only).

---

## CO-N1 — The traceability matrix doesn't encode the day-0 cut · doc 08

doc 08 Unit Coverage (`:34-44`) lists U1–U9 flat; Requirement Coverage maps R4→U5, R6→U7, R7→U6,
R11→U7 with no deferral signal; "Remaining Product Fork" (`:84-86`) covers only the catalog fork.
Every *other* doc flags U5/U6/U7 fast-follow (term counts: doc 00 = 10, doc 04 = 9, doc 12 = 5,
INDEX = 4, **doc 08 = 1**, and that one is the unrelated catalog fork). doc 08 is the document the
pack designates as the standalone bidirectional source of truth (INDEX:29,57) — an implementer
reading it alone treats promotion/projection as in-scope day-0, contradicting S0.1.

**Fix:** add a "Day-0 / fast-follow" column or annotation to the Unit and Requirement tables
(U1–U4 + U9-subset = day-0; U5/U6/U7 = fast-follow gated by doc 00), and note R6/R7/U6/U7 are
fast-follow in "Remaining Product Fork."

---

## STRAT-N1 — The inline-vs-modal fail branch has no modal design · doc 03

doc 00:40 mandates "if the spike fails… rewrite the UX plan to a compact quick-add modal or
popover." A grep across the pack for modal/popover/quick-add returns only fallback *mentions*
(doc 03:11,119; doc 04:21; INDEX:21) and **zero design** — no fields, focus order, keyboard
commit/cancel, or interaction with the U2 pending-insert lifecycle / U3 patch path. So only the
winning (inline) branch is buildable.

**Calibration:** the finder's "~50% chance the spike fails" is **inflated** — the V3 fallback
(disable virtualization while editing) already removed the hardest spike dependency
(measureElement vs content-visibility), so the inline bar is materially easier than pass 2 assumed.
The defect is real regardless of probability: a mandated fail branch with no design means the
"day-0 estimate" is not honest until the losing branch is specified.

**Fix:** add a thin "Quick-add modal fallback" section to doc 03 (fields, focus order, keyboard
commit/cancel, U2/U3 interaction) so both branches are buildable. (Pairs with STRAT-N2: give the
spike an owner + an `evidence/inline-vs-modal-spike-result.md` artifact.)

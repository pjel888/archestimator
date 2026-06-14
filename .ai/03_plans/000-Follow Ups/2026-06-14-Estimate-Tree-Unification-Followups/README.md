# Estimate-Tree Single-Node Unification — Follow-ups

**Created:** 2026-06-14
**Parent plan (DONE, archived):** `.ai/09_archive/store/2026-06-13-Estimate-Tree-Single-Node-Unification/`
**Status of the unification itself:** ✅ COMPLETE (P0–P6) and merged to `main`; P5 + P6 migrations **applied to prod** `ebxxqidacheyapmmzavr`; writes enabled (mixed nodes creatable). See `.ai/10_state/current-state.md` + `.ai/05_logs/2026-06-14-estimate-tree-unification-implementation.md` (+ `…-P5-apply.md`).

These are the deferred items flagged during implementation — **none are regressions**; they are QA, polish, and optional hygiene that don't block the shipped feature.

---

## FU-1 — In-app mixed-create QA (the one proof that needs a real browser) · **owner**
Verify end-to-end in the live app (dev-auth disabled → owner's authed Chrome): add an Area → add cost rows to it → add a sub-Area under that same node; drag a row onto a node that already has children. Expect: no wrap, no "select a group first", optimistic insert + inline rename, server accepts (RPCs relaxed). Then confirm the new mixed node reads correctly in **share**, **proposal export**, and **project charts** (reads were proven kind-agnostic, P1–P3). Capture a screenshot/transcript.

## FU-2 — Empty-group sidebar drop-into nuance · **small**
P4 made sidebar `isLeaf` children-based, so an **empty** node renders as a leaf; P6 added an opt-in `allowInsideOnLeaves` to `ui/tree.tsx` so you can still drop a node *inside* a childless node. Confirm in-browser that dropping a node into an empty Area works, and consider fully decoupling **caret/disclosure** from **droppability** in `ui/tree.tsx` if the band math feels off (logic-verified, not pixel-verified).

## FU-3 — P4 layout pixel QA · **small, browser**
Sticky-header **non-collision on deep scroll** (depth-accumulated offset via `STICKY_HEADER_H`/`STICKY_THEAD_H`), the **375px** responsive pass on a 20+-row mixed node, and the "Own items" eyebrow spacing. All logic/DOM-order is unit-tested; only the visual is unverified.

## FU-4 — Retire `correctKinds` (vestigial) · **optional hygiene**
`src/lib/share/reconstruct-share-tree.ts` still calls `correctKinds` (sets group/area display labels in the designation-reconstruction fallback path). It's harmless now that `kind` is a vestigial label, but it's the last two-kind helper. Removing it needs a check that the share designation-path display labels are unaffected — left wired deliberately rather than blind-deleted.

## FU-5 — `prove:unify-kinds-rls-rpc` harness · **optional, proof depth**
Doc 08 §"Additional RLS/RPC proof required": a local-PG harness asserting anon/viewer are denied the now-relaxed mutation RPCs and authorized editors can write mixed content. The P5/P6 applies were verified by guard-clause inspection + the existing `prove:unify-kinds` harness; this would add the access-control dimension.

## FU-6 — Optional `kind` column drop · **future, separate migration**
The plan keeps `kind` as a vestigial label (CHECK still `in ('group','area')`). A later dedicated migration could drop the column + the trigger/RPC signature churn once nothing reads it. Out of scope until then.

## Notes for whoever picks this up
- Supabase MCP `execute_sql`/`apply_migration` work with owner auth; the **direct `db.<ref>.supabase.co` host does not resolve** here (use the MCP, not `pg_dump`/psql).
- The P6 relax SQL (`scripts/sql/unify-p6-rpc-relax.sql`) is deliberately **out of** `supabase/migrations/` so the P5 prove-harness's "RPC-guard-intact" assertion stays valid; it's recorded in remote migration history.
- Unrelated pre-existing reds on `main` (NOT this work): a charts `set-state-in-effect` eslint error and `ProposalExportPreviewDialog` design-lint — owned by the charts / spreadsheet-export plans.

# EMC Improvement Plan — Implementation Closeout

> Implements `.ai/03_plans/2026-06-14-Estimate-Tree-Column-Improvement-Plan/` (esp. [08-IMPLEMENTATION-PLAN](../03_plans/2026-06-14-Estimate-Tree-Column-Improvement-Plan/08-IMPLEMENTATION-PLAN.md) + [10-READINESS-ADDENDUM](../03_plans/2026-06-14-Estimate-Tree-Column-Improvement-Plan/10-READINESS-ADDENDUM.md))
> Date: 2026-06-14 · Branch: `feat/estimate-sheet-uxui`

---

## Shipped (committed on this branch, all green)

| Phase | Req | Commit | What |
|---|---|---|---|
| A | Req 3 | `82951af8` | Disclosure caret keys off `hasContents` (not `hasChildren`) so rows-only nodes collapse; caret suppressed during sheet search (OD-3); `collectAllNodeIds` reconciled. Tests: caret-on-contents, empty-node, keyboard+focus, collapse-all, search suppress/restore. |
| B | Req 1 | `36342cd1` | Removed the EMC "Own items" eyebrow; rows-first order + child carets disambiguate. Charts money-attribution leaf untouched + guarded (BR-03). |
| C1 | Req 2 | `55613ca1` | `groupGap` is live, depth-driven, token-aligned (lg→md→sm); dead `usesSiblingGroupRhythm` flag removed end-to-end. |
| C2 | Req 2 | `3fe78bf4` | In-node cluster gap `space-y-4`→`space-y-2`; indent `depth*32 cap192`→`depth*16 cap96`. |
| C3 | Req 2 | `6a8af01d` | Nested nodes drop the competing card border for a tonal step (UX-4/OD-7); the row table keeps its frame. |
| C4/OD-20 | Req 2 | `72d91d77` | **Headline clip fix:** breadcrumb moved OUT of the sticky header so the sticky header is exactly 40px = `STICKY_HEADER_H`; the Materials/Qty thead (at stickyTop+40) is no longer covered by the breadcrumb. |
| D4 | Req 4 | `db5cc3a4` | Cancelled/failed component drag no longer deletes the component (OD-14); only explicit Delete is destructive. |
| D5 | Req 4 | `523c81ce` | Removed the phantom row-reorder grip (false affordance + false a11y `Drag material` label, OD-13). |

`h-10` / `STICKY_HEADER_H` / `STICKY_THEAD_H` were NOT changed (OD-5 respected). No new prop on `EstimateRowItemsTable` → perf comparator + isolation guards untouched (stayed green). No code TODOs left.

## Verification (per [10-READINESS-ADDENDUM](../03_plans/2026-06-14-Estimate-Tree-Column-Improvement-Plan/10-READINESS-ADDENDUM.md))

- `tests/vitest/estimate-mixed-content.test.tsx`, `estimate-sheet-spacing.test.tsx`, `estimate-component-drag.test.tsx`, `project-charts-aggregation.test.ts`, `estimate-template-drop-zones.test.tsx`, `tests/vitest/perf` — green.
- `bun run type-check` — clean.
- `bun run lint` / `bun run lint:design-system` — unchanged from baseline (pre-existing failures only, in `ProposalExportPreviewDialog.tsx` + 3 unrelated test files; **zero** new problems in touched files; verified by stash-diff).

---

## Deferred — owner-gated (NOT shipped this pass)

### C4 visual sign-off (G4) — needs the authenticated workshop browser
Phase C is structurally complete and the clip is fixed by construction (OD-20). The in-browser screenshot/bounding-box acceptance run at 1440/1280/1024/768/390px × 100/125/150% zoom is the remaining gate — the dev-auth bypass is disabled, so it must run in the owner's Chrome session. Checklist: [`2026-06-14-EMC-phase-C-visual-acceptance.md`](2026-06-14-EMC-phase-C-visual-acceptance.md).

### D0 / D1 / D2 / D3 — kind-gate insert fix (DBNET-1 / OD-9, **P0, owner-call**)
**Why deferred.** Lifting the client insert kind-gates (D1: `EstimateSheetContent.tsx` `insertLibraryItem` `kind !== "area"`; D3: `insertTemplatesIntoParent` `kind !== "group"`) is gated by the plan on D0 (fresh confirmation of live RPC bodies) + D2 (a committed relax migration), because the committed migrations still hard-gate:
- `insert_estimate_row_item_with_history` — `and node.kind = 'area'` (`supabase/migrations/20260524050746_…:349`)
- `insert_estimate_subtree_into_estimate` — `and node.kind = 'group'` (`…20260613134852_…:87`)
- `insert_estimate_template_into_estimate` — `and node.kind = 'group'` (`…20260612094734_…:824`)

Project state records hosted prod was relaxed (P6 writes enabled) but the relax SQL was deliberately kept out of `supabase/migrations/` — so a clean migrated env would still reject inserts into mixed nodes. The plan (G3) forbids lifting the client gates until that drift is fresh-confirmed and the committed migration lands. This pass cannot do that safely: the Supabase MCP needs interactive OAuth (owner browser) and there is no Docker / prove-harness in this session to verify a migration that touches 3 prod RPCs (a documented "point of no return"). So per the plan's own escape hatch ("D2 may be deferred … but then D1 must also be deferred"), all four are deferred together.

**Owner runbook to land them (one supervised DB session):**
1. **D0 (read-only):** owner-authed Supabase MCP → `select pg_get_functiondef('public.insert_estimate_row_item_with_history'::regprocedure);` (repeat for `insert_estimate_subtree_into_estimate`, `insert_estimate_template_into_estimate`). Diff each live body vs the committed body above; confirm "kind-gate removed?" + exact delta.
2. **D2:** author `supabase/migrations/<ts>_relax_insert_rpc_kind_gates.sql` that `CREATE OR REPLACE`s the three functions mirroring the **exact** live bodies (drop the `kind = 'area'` / `kind = 'group'` guards; keep same-estimate/orphan existence checks). No-op vs hosted, real fix vs fresh envs. Verify on PG17 prove-harness that a row inserts into a `group`-kind node; `get_advisors` → 0 new ERROR.
3. **D1:** `EstimateSheetContent.tsx` `insertLibraryItem` — replace `if (targetNode?.kind !== "area") return;` with an existence check `if (!targetNode) return;` (matches the single-template handler). Test: group-node blank-row insert appears optimistically (`getByRole("button", { name: /Add blank estimate row/i })`).
4. **D3:** `insertTemplatesIntoParent` — replace `if (targetParentNode?.kind !== "group") return false;` with `if (!targetParentNode) return false;`. Prove a clean migrated DB accepts multi-template insert into an `area` parent.

Until then, the current client behaviour is a **silent no-op** (add-row/insert/drop/palette on a group-kind node do nothing, no toast) — a real Req-4 bug, but it ships unchanged this pass by owner-gated necessity, not by oversight.

### Other matrix-surfaced gaps (already documented in plan docs 02 / 09)
Move row between nodes; row/node duplicate; explicit indent-outdent + keyboard reorder; confirm dialogs for single-row/tab delete; `canEditEstimate` UI gating + `assertCanEditEstimate` defense-in-depth (OD-11/12); cross-tab node move (intentionally blocked); non-atomic `moveRowComponent`; collapse-state persistence (OD-4); branch memoization (OD-18); template-editor renderer parity (OD-15). All deferred with rationale in [02-CRUD-CAPABILITY-MATRIX](../03_plans/2026-06-14-Estimate-Tree-Column-Improvement-Plan/02-CRUD-CAPABILITY-MATRIX.md) / [09-OPEN-DECISIONS](../03_plans/2026-06-14-Estimate-Tree-Column-Improvement-Plan/09-OPEN-DECISIONS.md).

# Add New Tabs — Downstream Consumer Verification (U7 / 06 §3a)

**Date:** 2026-06-13 · **Plan:** `.ai/03_plans/2026-06-13-Add-New-Tabs` · **Unit:** U7
**Method:** read-only source audit (6 parallel agents), no DB/runtime calls. Each
consumer checked against the [06 §3a](../03_plans/2026-06-13-Add-New-Tabs/06_BLAST_RADIUS.md)
acceptance criteria for a freshly "+"-created **empty** user tab.

**Headline:** every downstream consumer already tolerates new/empty tabs — these
were verification items, not implementation. The only caveat is a deploy-time
prerequisite (RPC presence), captured in the deploy checklist (decisions.md).

| Consumer | Result | Key evidence |
|---|---|---|
| XLSX export (`app/api/.../export/proposal.xlsx/route.ts`) | ✅ PASS | Empty tab → valid workbook, **one** worksheet per tab (header/structure only), names de-duplicated (`proposal-export/worksheet-name.ts:49-69`), no 413 (`route.ts:83-89` limits 1200 nodes/3000 rows; empty passes), scope chip shows tab name (`ProposalExportPreviewDialog.tsx:132-170`). Covered by `proposal-export-model.test.ts:235-247`. |
| Activity (`src/lib/activity/activity-composer.ts`) | ✅ PASS | `tab_created` → "{Actor} created tab {Tab name}" attributed to `estimateTabId` (`activity-composer.ts:107-108, 47-49`); covered by `estimate-sheet-version-control-ui.test.tsx:1067-1130`. |
| Publication (`src/lib/publication/actions.ts`) | ✅ PASS | Live tab query enumerates new tab into snapshot with `id, name, sortOrder, isDefault` (actual value, not forced false) (`actions.ts:381-386, 458-463`; `publication/types.ts:67-76`). |
| AI read-context (`src/lib/ai/read-context.ts`) | ✅ PASS | Empty tab listed with `nodeCount:0, rowCount:0`, no throw (`read-context.ts:1283-1297`); 12-tab cap enforced at DB level (`:17, :1932`). |
| Cross-tab drag reject (`EstimateTabStrip.tsx`) | ✅ PASS (D-7 preserved) | Drop rejected, `dropEffect='none'`, toast fires, no move (`handleTabDrop`). **The U2 single-`ContextMenu` (`asChild`) wrapper does NOT swallow the per-tab `onDragOver`/`onDrop` handlers** (independently verified); covered by strip test "rejects cross-tab tree-node drops". |
| Schema-missing / RPC-drift (deploy gate) | ⚠️ PARTIAL — **fails open** | `isEstimateTabsSchemaMissing` only matches a missing **table** (42P01/PGRST205) or **column** (42703/PGRST204) — it does **not** catch a missing/older `create_estimate_tab_with_history` RPC. So partial drift (table present, RPC absent) renders the strip + "+", and create **errors on click** (caught + shown inline). ⇒ the deploy checklist must probe the **RPC**, not just the table. |

## Conclusion
R8 satisfied: all enumerated consumers behave correctly with user-created/empty
tabs. No downstream code change required. The single actionable item is the
deploy-checklist RPC probe (below / in decisions.md), because the schema-missing
fallback fails *open* on partial RPC drift rather than hiding the affordance.

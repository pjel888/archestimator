# 09 — Open Decisions & Readiness Register

> Part of the **Estimate Master Column (EMC) Improvement Plan** — `.ai/03_plans/2026-06-14-Estimate-Tree-Column-Improvement-Plan/`
> Status: DRAFT (audit) · 2026-06-14 · Branch: feat/estimate-sheet-uxui
> Index: [00-README](00-README.md)

---

This is the **single consolidated register** of decisions the audit surfaced that need a product-owner call before (or during) implementation. Each per-perspective doc raised its own list; they are deduplicated here. Every decision carries a **recommendation** so the default path is clear — silence on a decision means "proceed with the recommendation."

**Legend**
- **Owner call?** — `YES` = genuinely the owner's product/policy choice; `DEFAULT` = recommendation is safe to adopt unless the owner objects.
- **Priority** — `P0` (blocks the in-scope plan), `P1` (should decide before merge), `P2` (follow-up / deferrable).
- **Blocks** — which implementation phase/task in [08-IMPLEMENTATION-PLAN](08-IMPLEMENTATION-PLAN.md) waits on it.

---

## Register at a glance

| ID | Decision | Owner call? | Priority | Blocks |
|----|----------|-------------|----------|--------|
| OD-1 | "Own items" removal scope (EMC eyebrow only; charts leaf stays) | YES | P1 | 08 Phase B (R1) |
| OD-2 | Empty-node caret policy after widening to `hasContents` | DEFAULT | P1 | 08 Phase A (R3) |
| OD-3 | Caret behaviour during active sheet search | DEFAULT | P1 | 08 Phase A (R3) |
| OD-4 | Collapse-state persistence across reloads | YES | P2 | — (follow-up) |
| OD-5 | Header height fixed at 40px vs free to change | DEFAULT | P0 | 08 Phase C (R2) |
| OD-6 | EMC indent step (32px → 16px) + real depth distribution | DEFAULT | P1 | 08 Phase C (R2) |
| OD-7 | Root-node card chrome (frame vs frameless) | DEFAULT | P1 | 08 Phase C (R2/C3) |
| OD-8 | Off-token blues → near-black accent token | DEFAULT | P1 | 08 Phase C (R2) |
| OD-20 | Sticky/breadcrumb contract + nested row clipping proof | DEFAULT | **P0** | 08 Phase C (C4) |
| OD-9 | **DBNET-1**: land P6 relax migration + confirm hosted RPCs (D0) | YES | **P0** | 08 Phase D (D0/D1/D2/D3) |
| OD-10 | Lift the insert kind-gates (client) under P6 | YES | P1 | 08 Phase D (D1/D3) |
| OD-11 | `canEditEstimate` gating on the left tree + EMC affordances | YES | P1 | (new task) |
| OD-12 | `assertCanEditEstimate` in row/node server actions (defense-in-depth) | YES | P1 | (new task) |
| OD-13 | Phantom row-reorder grip — wire vs remove | YES | P1 | 08 Phase D (D5) |
| OD-14 | Destructive clear-on-failed-drag — make non-destructive | DEFAULT | P1 | 08 Phase D (D4) |
| OD-15 | Template-editor parity (mirror EMC fixes vs accept divergence) | YES | P1 | 08 Phase A/C |
| OD-16 | Per-keystroke RPC + audit-row volume (debounce?) | YES | P2 | — (follow-up) |
| OD-17 | Tab-switch waterfall / adjacent-tab prefetch | DEFAULT | P2 | — (follow-up) |
| OD-18 | Memoize `EstimateSheetBranch` + add perf budgets (B1–B5) | DEFAULT | P1 | 08 cross-phase gate |
| OD-19 | Req-4 deferral: what ships now vs later (remediation dates) | YES | P1 | 08 Phase D scope |

---

## Requirement-scope decisions (the four named issues)

### OD-1 — "Own items" removal scope (Req 1)
**Question.** The user said *"no need to put the 'Own items' on the nodes that both have nested nodes and nested components."* The EMC eyebrow (`branch.tsx:241-248`) only ever renders in exactly that both-case, so removing it there removes it entirely. Do we also drop the screen-reader boundary, or keep an `sr-only` cue?
**Hard constraint (not a decision).** The charts **"Own items" leaf** (`aggregate-project-charts.ts:300-309`, label at `:301`) is a **separate money-attribution surface** — it keeps a mixed node's own-row total visible and counted exactly once. It MUST NOT be removed with the visual eyebrow. `project-charts-aggregation.test.ts:244` + the container==sum-of-leaves invariant (`:249-260`) pin this. See [07-BLAST-RADIUS-AND-RISK](07-BLAST-RADIUS-AND-RISK.md).
**Recommendation.** Remove the visual eyebrow only. Drop the dedicated `data-estimate-own-items-label` `<p>` and rely on the existing per-node `headerAriaLabel` `sr-only` span (`branch.tsx:181, 103-107`) for screen-reader disambiguation — no separate `sr-only` "Own items" node needed. Update `estimate-mixed-content.test.tsx:86-94` (and the rows-first anchor at `:73-84`) accordingly. Leave the charts leaf untouched.

### OD-2 — Empty-node caret policy after the disclosure fix (Req 3)
**Question.** Once the caret keys off `hasContents` (not `hasChildren`), what does a fully-empty node (no rows, no children) get?
**Recommendation.** **DEFAULT — keep the inert reserved slot** (`branch.tsx:204`) for empty nodes; render the caret only when `hasContents === true`. A caret on an empty node would toggle nothing.

### OD-3 — Caret behaviour during active sheet search (Req 3)
**Question.** While `sheetSearchActive`, collapse state is force-overridden to EMPTY (`EstimateSheetContent.tsx:1173`) but the underlying user state is preserved and restored on clear. If we show per-node carets everywhere, a user could toggle *invisible* collapse state during search.
**Recommendation.** **DEFAULT — hide/disable the per-node caret while search is active**, so users don't edit state they can't see; restore carets when search clears.

### OD-5 — Header height fixed vs free to change (Req 2)
**Question.** The 40px node header height is coupled three ways: `STICKY_HEADER_H`/`STICKY_THEAD_H` constants (`node-visuals.tsx:9-10`), the sticky-offset math (`branch.tsx:95-96`), and a test that pins `thead.style.top === STICKY_HEADER_H` (`estimate-mixed-content.test.tsx:121`).
**Recommendation.** **DEFAULT — keep header height fixed at 40px**; the spacing fix moves only inter-node gaps and intra-node spacing, not the header. Avoids the 3-way coupling churn. (If the owner wants a taller header, it becomes a coordinated change to the constant + math + test, tracked here.)

### OD-6 — EMC indent step (Req 2)
**Question.** EMC indent is `leftIndent = Math.min(depth*32, 192)` (`branch.tsx:89`). Proposed quantize to `depth*16` cap `96`. Is the 192px (~depth 6) cap ever hit in real estimates?
**Recommendation.** **DEFAULT — adopt `depth*16` cap `96`** for a tighter, on-token rhythm; confirm against a real estimate's depth distribution before merge. **Cross-surface note:** three renderers use three different indent systems — EMC `depth*32` cap 192 (`branch.tsx:89`), left tree (`EstimateSheetTree`, via shared `ui/tree.tsx`) `depth*16` **uncapped** (`TREE_INDENT_STEP = 16`, `tree.tsx:46,457`), template editor (`TemplateEditorSheet.tsx:266`) `depth*24` cap 144. The proposed EMC `16px` step coincidentally matches the left tree. Unifying them is out of scope here but tabulated in [03-UXUI-AUDIT](03-UXUI-AUDIT.md) for awareness.

### OD-7 — Root-node card chrome (Req 2)
**Question.** The depth-0 root renders full card chrome (`branch.tsx:163`), nesting a bordered card inside a bordered table (double border).
**Recommendation.** **DEFAULT — de-nest if the Phase C screenshot still reads as stacked cards**: make the root a frameless container that only borders its children (DESIGN.md "one surface per zone"), or record why the current border model passes `DESIGN.md`. C3 is a readiness decision, not unexamined optional polish.

### OD-8 — Off-token accent colors (Req 2 / a11y)
**Question.** DESIGN.md restricts color to a near-black accent (`#292929`), but the EMC uses `bg-blue-100` replace ring (`cells.tsx:185`), `#F6FAFF` + `rgba(37,99,235)` active-row inset (`row-table.tsx:193`), and `bg-surfaceWarm/30` template tint (`branch.tsx:164`).
**Recommendation.** **DEFAULT — replace the non-system blues with the DESIGN.md accent token**; keep the warm template-drop tint only if it survives a DESIGN.md check.

### OD-20 — Sticky/breadcrumb contract + nested row clipping proof (Req 2)
**Question.** Breadcrumbs currently live inside the sticky node header container, while sticky offsets count only the 40px header row and the 40px table header. Should breadcrumbs stay inside sticky or move outside it, and what proof blocks clipping regressions?
**Recommendation.** **DEFAULT / P0 — choose and record one sticky contract before Phase C code changes**, then prove it in a real browser. Either keep breadcrumbs inside sticky and prove their height does not cover row content, or move breadcrumbs outside sticky and keep `STICKY_HEADER_H` tied only to the 40px header row. Phase C must capture browser evidence at the viewports/zoom levels in [10-READINESS-ADDENDUM](10-READINESS-ADDENDUM.md); unit tests alone do not close the owner-reported clipping bug.

---

## Newly-surfaced correctness / readiness decisions

### OD-9 — DBNET-1: P6 relax migration + hosted confirmation (BLOCKER)
**Question.** The only committed insert RPC, `insert_estimate_row_item_with_history`, still hard-codes `node.kind = 'area'` (`supabase/migrations/20260524050746_...:344-352`), plus `kind = 'group'` guards in the subtree RPC (`20260613134852:87`) and template RPC (`20260612094734:824`). `.ai/10_state/current-state.md` records that P5/P6 production relax work was applied and write-enablement was verified, but the implementation still needs fresh hosted RPC bodies and clean-apply parity before source changes ship.
**Recommendation.** **YES / P0.** Add a Phase-D **pre-step D0**: run owner-authed Supabase `pg_get_functiondef` on the three insert RPCs and diff against committed SQL. Then land the P6 relax SQL as a **committed migration** so a fresh/CI environment matches hosted behavior. **D1 (lifting the row client kind-gate) and D3 (batch template path) MUST NOT ship until D0 confirms drift status and the relax migration is committed or explicitly accepted as deferred drift** -- otherwise client optimism can route inserts into nodes that a clean migrations apply rejects. See [06-DATABASE-AND-NETWORK-AUDIT](06-DATABASE-AND-NETWORK-AUDIT.md).

### OD-10 — Lift the insert kind-gates under P6 (Req 4)
**Question.** `insertLibraryItem` no-ops on group-kind nodes via `targetNode?.kind !== "area"` (`EstimateSheetContent.tsx:1649`); the multi-template **batch** path gates `kind !== "group"` (`:1740`). Both silently no-op (no toast). The server action explicitly allows any node (`actions.ts:2500-2513`). Is the gate an intentional product rule or a P6 leftover?
**Recommendation.** **YES / P1.** Treat as a P6 leftover: replace both gates with existence checks (target node exists) so add-row / insert / drop / palette work on any node. **Gated on OD-9** (the relaxed RPC must exist in the target environment first).

### OD-11 — `canEditEstimate` gating on UI affordances
**Question.** `EstimateSheetTree` receives **no** `canEditEstimate` prop (`EstimateWorkspaceClient.tsx:104-112`), so all node CRUD (add/rename/delete/move) is always enabled in the UI regardless of edit capability; EMC row CRUD is likewise client-ungated. Only tab CRUD + the New-tab button are gated. Read-only is enforced **server-side only**.
**Recommendation.** **YES / P1.** Thread `canEditEstimate` into the left tree and the EMC row affordances to hide/disable edit controls for non-editors — correct UX + defense-in-depth. (Server/RLS stays the source of truth.)

### OD-12 — `assertCanEditEstimate` in row/node server actions
**Question.** `assertCanEditEstimate` is called on exactly 7 sites (duplicate-sheet, project-source insert, 3× template insert, detach: `actions.ts:1496/1799/1849/2243/2284/2352/2631`) but NOT on `insertEstimateRowItemFromLibrary` (`:2494`), `updateEstimateRowItem` (`:2562`), `replaceEstimateRowItemWithLibrary` (`:2587`), `deleteEstimateRowItem` (`:2650`), `createEstimateNode` (`:1989`), rename/delete/reorder node — those rely solely on RPC-internal RLS.
**Recommendation.** **YES / P1.** Add `assertCanEditEstimate` to the remaining mutating actions for consistent defense-in-depth (RLS remains the hard floor).

### OD-13 — Phantom row-reorder grip (Req 4)
**Question.** `row-table.tsx:201-204` renders a `DotsSixVertical` with `cursor-grab` + `aria-label="Drag material {x}"` but is **not** `draggable`, has no `onDragStart`, and no reorder-row RPC exists. It's a false affordance (also a false a11y announcement).
**Recommendation.** **YES / P1.** Remove the misleading handle now (recommended for beta) unless this branch deliberately wires real row reordering (new server action + RPC). Do not ship the false affordance as-is.

### OD-14 — Destructive clear-on-failed-drag
**Question.** `cells.tsx:151-154` clears the attached component whenever a drag ends with `dropEffect !== "move"` — a failed/cancelled drag silently deletes the component.
**Recommendation.** **DEFAULT / P1 — make non-destructive in Phase D4**: snap back on a failed drop; require an explicit clear/delete action to remove a component. If deferred, the plan must state that a known destructive interaction ships intentionally.

### OD-19 — Req-4 deferral scope (what ships now)
**Question.** The in-scope plan ([08-IMPLEMENTATION-PLAN](08-IMPLEMENTATION-PLAN.md)) executes the disclosure fix, the label removal, the spacing system, the kind-gates, destructive-drag safety, and phantom-handle cleanup. The remaining gating gaps (OD-11/12) are defense-in-depth follow-ups.
**Recommendation.** **YES / P1.** Ship OD-13 and OD-14 in this branch by default. If either is deferred, attach an owner-visible acceptance note and remediation date. Decide whether OD-11/12 ship now or become follow-up auth-hardening work.

---

## Persistence / performance follow-ups

### OD-4 — Collapse-state persistence
Collapse state is in-memory `useState` (`EstimateSheetContent.tsx:992`), scope-keyed by tab (`:1155`); it survives tab switches within a session but is **lost on reload** (no localStorage/DB). **Recommendation — YES / P2:** add `localStorage` keyed by `estimateId+tabId` (client-only, no DB column) for a cheap UX win, or explicitly document ephemerality as intended.

### OD-16 — Per-keystroke RPC + audit-row volume
Row edits are fully optimistic with `refetchType:"none"`; there is **no debounce** — each committed cell value is one `update_*` RPC + one `estimate_sheet_events` audit row (`use-estimate-row-mutations.ts:291-301`). Source inspection shows the basic numeric fields update local state on change and commit on blur/Enter, while select/dropdown-style controls can commit on selection. **Recommendation — YES / P2:** no per-keystroke typing fix is needed for the Phase A-D plan, but consider debounce/coalesce for rapid committed edits if audit-row volume becomes noisy.

### OD-17 — Tab-switch waterfall
Tab switching has no adjacent-tab prefetch and a serialized nodes-then-rows waterfall (`estimate-repository.ts:186-216`). **Recommendation — DEFAULT / P2:** prefetch adjacent tabs or collapse `getEstimateTabTree` to a single round trip.

### OD-18 — Memoize the branch + add perf budgets
`EstimateSheetBranch` is an un-memoized recursive function (`branch.tsx:78`), rendered raw (`EstimateSheetContent.tsx:2340`); only `EstimateRowItemsTable` is memoized. The disclosure fix is **perf-positive** (collapsing a rows-only node unmounts its heavy table — impossible today). **Recommendation — DEFAULT / P1:** adopt perf budgets B1–B5 from [05-PERFORMANCE-AUDIT](05-PERFORMANCE-AUDIT.md), including an automated `STICKY_HEADER_H`/`STICKY_THEAD_H` lockstep assertion (B5); memoizing the branch (B3) is optional hardening, not required for Reqs 1–4.

---

## Cross-surface parity

### OD-15 — Template-editor parity
`TemplateEditorSheet.tsx` is a **parallel re-implementation** still on the old two-kind model (`isGroup`, FolderSimple/MapPin, `h-9` headers, always-on caret, no "Own items"). It imports **only** the four leaf helpers from `node-visuals` (`NodeIcon`, `nodeHeaderClasses`, `nodeNameClasses`, `nodeTotalClasses`) — **not** `groupGap`, `STICKY_HEADER_H`, or `STICKY_THEAD_H`. So EMC disclosure/spacing fixes (R2/R3) do **not** propagate; the two surfaces will visibly diverge unless mirrored.
**Recommendation.** **YES / P1.** Decide: mirror the EMC disclosure + spacing fixes into the template editor for parity, or accept (and document) the divergence for this branch. Full renderer unification is a separate, larger effort.

---

## Decisions already settled by the audit (not open)

These came up but are **resolved** — listed so they aren't re-litigated:

- **Charts "Own items" leaf stays.** Money-correctness surface, out of scope for Req 1. (OD-1 hard constraint.)
- **Reqs 1–3 are presentational** — no DB/RPC change required. The only DB dependency is OD-9, which gates the *Req-4* insert-gate work, not the caret/label/spacing changes. ([06-DATABASE-AND-NETWORK-AUDIT](06-DATABASE-AND-NETWORK-AUDIT.md))
- **The collapse engine is already kind-agnostic** — `collapsedNodeIds` toggles the whole node body; only the *caret render condition* is wrong. The fix is small. ([04-FEATURE-READINESS-AND-BUG-AUDIT](04-FEATURE-READINESS-AND-BUG-AUDIT.md))
- **Sheet-search collapse override is correct** — it force-empties the visible collapse set but preserves and restores user state. ([04-FEATURE-READINESS-AND-BUG-AUDIT](04-FEATURE-READINESS-AND-BUG-AUDIT.md))

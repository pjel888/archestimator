# 07 - Blast Radius & Risk Assessment

> Part of the **Estimate Master Column (EMC) Improvement Plan** -- `.ai/03_plans/2026-06-14-Estimate-Tree-Column-Improvement-Plan/`
> Status: DRAFT (audit) - 2026-06-14 - Branch: feat/estimate-sheet-uxui
> Index: [00-README](00-README.md)

---

## Purpose & method

This document assesses the **code-graph blast radius** and **regression risk** of the four EMC change families requested by the owner, so the work can be sequenced safely and so reviewers know exactly which files, seams, and tests co-change. It is the risk lens that the other docs feed into; cross-link [04-FEATURE-READINESS-AND-BUG-AUDIT.md](04-FEATURE-READINESS-AND-BUG-AUDIT.md) (caret/disclosure), [03-UXUI-AUDIT.md](03-UXUI-AUDIT.md) (spacing/rhythm), [02-CRUD-CAPABILITY-MATRIX.md](02-CRUD-CAPABILITY-MATRIX.md) (CRUD matrix), and [06-DATABASE-AND-NETWORK-AUDIT.md](06-DATABASE-AND-NETWORK-AUDIT.md) for the deeper per-area detail.

Every claim below was confirmed by reading the cited file at the cited line on branch `feat/estimate-sheet-uxui`. Where I assert "imports/callers," that was cross-checked against the import sites in source (the code-review-graph importer/caller relations agree with the read source).

### The four change families

| Family | Scope | User requirement |
|--------|-------|------------------|
| **A** | Remove the EMC "Own items" eyebrow | Req 1 — "No need to put the Own items on the nodes that both have nested nodes and nested components." |
| **B** | Carets / collapsibility on rows-only nodes | Req 3 — "Some node rows dont have expand/collapse icons even if they have components nested inside them." |
| **C** | Spacing / vertical-rhythm overhaul | Req 2 — "Fix proper spacing because the spacing/gaps between the nodes and rows are not very good." |
| **D** | CRUD gap-fills (duplicate, reorder rows, indent/outdent, the kind-gate insert bug, etc.) | Req 4 — "Examine and document and put in a matrix ALL the CRUD functionalities + more." |

---

## CRITICAL CALLOUT — the charts "Own items" leaf is a separate money-correctness surface

> **Do NOT delete `aggregate-project-charts.ts`'s "Own items" leaf when removing the EMC visual label (Family A).** They share only the literal string `"Own items"`. Different file, different purpose, different namespace, different test.

Two unrelated things are both named "Own items":

1. **The EMC visual eyebrow** — a single `<p data-estimate-own-items-label>` in `src/components/workshop/estimate-sheet/rows/branch.tsx:245-247`, rendered only when `hasOwnRows && hasChildren` (branch.tsx:241). It is a presentational disambiguator (its comment, branch.tsx:242-244, says it "disambiguate[s] this node's own rows from the first child's rows" and "Doubles as the L7 screen-reader boundary"). Pure view logic, zero persistence.

2. **The charts comparison-table leaf** — a data row pushed in `src/lib/project-charts/aggregate-project-charts.ts:300-309` (explanatory comment at `:296`, `label: "Own items"` at `:301`):

   ```ts
   // A container that ALSO directly owns rows gets an explicit "Own items"
   // leaf so its own money is visible and counted, not merged into a child.
   if (own) {
     rows.push({
       id: `area:${child.id}:own`,
       label: "Own items",
       total: own.total,
       ...
     });
   }
   ```

   This is **invariant-bearing money attribution**: a mixed (container-that-also-owns-rows) node must surface its own-rows total **exactly once**, so the container roll-up equals the sum of its rendered leaf lines. `tests/vitest/project-charts-aggregation.test.ts:244` asserts the exact row (`id: "area:group-mix:own"`, `total: 90`, `rowCount: 3`), and lines `:249-260` assert the invariant `container.total === sum(leaves) === seriesTotal` and `leafRowCount === 5` (verified by reading the test).

**Why deletion would corrupt charts:** removing the `aggregate-project-charts.ts:300-309` leaf-push block would drop the mixed node's own-rows money from the leaf set. The container roll-up (`aggregate-project-charts.ts:288-294`) would then no longer equal the sum of its rendered leaves — money would be silently under-counted on the comparison table and the golden-master / aggregation tests would fail.

**Guard for Family A:** before any delete, `grep -n "Own items"` and confirm each hit's file. Delete **only** `branch.tsx:241-248`. Add a PR-checklist line and a code comment near the charts leaf: "money-correctness, do NOT touch." The charts leaf and `project-charts-aggregation.test.ts` are **out of scope** for the EMC label decision entirely. (See also [06-DATABASE-AND-NETWORK-AUDIT.md](06-DATABASE-AND-NETWORK-AUDIT.md) DBNET-3.)

---

## The blast unit for A / B / C is one tight trio (plus tests)

The presentational families share a single, narrow code-graph radius:

| Module | Role | Importers (verified) |
|--------|------|----------------------|
| `src/components/workshop/estimate-sheet/rows/branch.tsx` | `EstimateSheetBranch` recursive node renderer (caret, "Own items" eyebrow, spacing, sticky offsets) | **exactly one** runtime importer: `EstimateSheetContent.tsx` (rendered at EstimateSheetContent.tsx:2340) + its own recursion (branch.tsx:285) |
| `src/components/workshop/estimate-sheet/rows/node-visuals.tsx` | `groupGap`, `STICKY_HEADER_H`/`STICKY_THEAD_H`, `NodeIcon`, `nodeHeaderClasses`/`nodeNameClasses`/`nodeTotalClasses`, `getNodeCode` | `branch.tsx`, `EstimateSheetContent.tsx`, **`TemplateEditorSheet.tsx`** (shared seam — but it imports ONLY the four leaf helpers `NodeIcon`/`nodeHeaderClasses`/`nodeNameClasses`/`nodeTotalClasses`, NOT `groupGap` or the `STICKY_*` constants — see below), and one test |
| `src/components/workshop/EstimateSheetContent.tsx` | EMC host; owns the scope-keyed collapse state + `EstimateSheetExpansionContext` | n/a (top of the EMC) |

`EstimateSheetBranch` has **no second runtime consumer**. The `SheetMutationHandlers` `Pick` type (branch.tsx:62-76) is referenced only inside `branch.tsx`. `groupGap` is called only from `EstimateSheetBranch` (branch.tsx:160). So Families A, B, and C carry **no import-breakage risk** to any downstream component — the risk is concentrated in (1) the one shared seam `node-visuals.tsx` reaches (the template editor), and (2) the test file that pins current behavior.

**Treat `branch.tsx` + `node-visuals.tsx` + the `EstimateSheetContent` collapse handlers as a single atomic blast unit for A/B/C. Do not over-scope beyond this trio + tests.**

---

## Shared seams that co-change

### Seam 1 — `node-visuals.tsx` leaf helpers reach the template editor (silent divergence risk)

`src/components/workshop/library/template-editor/TemplateEditorSheet.tsx` is a **full parallel re-implementation** of the node renderer (`TemplateSheetBranch`, defined from TemplateEditorSheet.tsx:252). It imports **only the leaf helpers** from `node-visuals.tsx` (`nodeHeaderClasses`, `nodeNameClasses`, `nodeTotalClasses`, `NodeIcon` — used at TemplateEditorSheet.tsx:344, 358, 360-361). It imports **neither** `rows/branch` nor `rows/expansion`. Verified by reading the component.

It is also still on the **OLD two-kind model**, which is materially different from the P6 EMC:

| Trait | EMC (`branch.tsx`) | Template editor (`TemplateEditorSheet.tsx`) |
|-------|--------------------|---------------------------------------------|
| Kind logic | none — kind-agnostic, `canReceiveTemplates = true` (branch.tsx:100) | `isGroup = node.kind === "group"` (TemplateEditorSheet.tsx:264) |
| Header height | `h-10` (40px) (branch.tsx:174) | `h-9` (TemplateEditorSheet.tsx:344) |
| Indent step | `min(depth*32, 192)` (branch.tsx:89) | `min(depth*24, 144)` (TemplateEditorSheet.tsx:266) |
| Caret gate | `hasChildren` only (branch.tsx:182) — the Req-3 bug | **always rendered**, every node (TemplateEditorSheet.tsx:347-356) |
| Inter-node gap | `groupGap` + `space-y-4` (branch.tsx:160, 237) | `depth > 0 && "mt-1"` (TemplateEditorSheet.tsx:332) |
| "Own items" label | yes, mixed-case only (branch.tsx:241-248) | **none** |
| Drop target | any node (branch.tsx:100) | components route to first area; templates only onto a group (TemplateEditorSheet.tsx:278-280) |

**Co-change implications:**

- **Family A** (remove EMC label): zero effect here — the template editor never had the label. Safe.
- **Family B** (caret on rows-only nodes): the template editor already renders an always-on caret, so it does **not** share the bug B fixes; the two surfaces will *appear* to agree afterward, but the caret *semantics* differ (always-on vs content-derived). No code change needed in the editor, but note the semantic mismatch.
- **Family C** (spacing): **the highest divergence risk.** The only Family-C surface genuinely shared with the editor is the **four leaf style helpers** — so if C edits the **shared** `nodeHeaderClasses`/`nodeNameClasses`/`nodeTotalClasses` (e.g. font sizes, leaf header height), **both** surfaces change together silently — possibly desirable, possibly not. The `groupGap` helper and the `STICKY_HEADER_H`/`STICKY_THEAD_H` constants are **NOT imported by the template editor** (it imports only the four leaf helpers, TemplateEditorSheet.tsx:19), so editing them is **EMC-local** and does not touch the editor at all. Editing `branch.tsx`-local constants (the `h-10`, the `space-y-4`, the `min(depth*32)` indent) is likewise EMC-local: the template editor will **NOT** follow and will visibly diverge (24px step vs new EMC step, `h-9` vs `h-10`, `mt-1` vs new rhythm). This is a UX-consistency regression, not a crash.

**Open decision (escalate):** unify the two node renderers, or accept a permanently-divergent "two skins" model? This decides whether spacing/caret work is one edit or two. Until decided, **any PR that touches the four shared leaf helpers (`NodeIcon`/`nodeHeaderClasses`/`nodeNameClasses`/`nodeTotalClasses`) must audit the template editor render in the same PR**, and any `branch.tsx`-local or `groupGap`/`STICKY_*` change (all EMC-local) must explicitly choose "replicate in editor" or "document divergence."

### Seam 2 — `aggregate-project-charts.ts` (string-only proximity, NOT a real seam)

Covered in the CRITICAL CALLOUT above. The only coupling to Family A is the shared string `"Own items"`. Treat as out of scope; guard with a grep before delete.

### Seam 3 — `SheetMutationHandlers` + `TemplateSheetHandlers` (Family D only)

Family D operations flow through the mutation seam, which is **two parallel contracts**:

- **EMC:** `SheetMutationHandlers` (branch.tsx:62-76) — `onInsertLibraryItem`, `onInsertTemplates`, `onInsertTemplateNode`, `onAddBlankRow`, `onReplaceRowItem`, `onDeleteRowItem`, `onUpdateRowItem`, `onMarkRowDirty`, `onOpenRowDetails`, `onClearRowComponent`, `onRequestProjectSpecific`, `onMoveRowComponent`. Implemented in `EstimateSheetContent.tsx` (the host that owns the optimistic `editableRows` model + TanStack invalidation).
- **Template editor:** `TemplateSheetHandlers` (consumed at TemplateEditorSheet.tsx:255, 261, 310-324) — `onDropLibraryItem`, `onDropTemplate`, and the editor's own add/delete/rename/update/remove handlers.

Adding any new EMC operation (row duplicate, indent/outdent, row reorder) means: extend the `SheetMutationHandlers` type (branch.tsx:62), thread the new prop through the **destructure** (branch.tsx:78) **AND** the recursive `<EstimateSheetBranch>` call (branch.tsx:285-309 — every handler is re-passed to children; a new one must be added in both places or children silently lose it), add the affordance in `row-table.tsx`/`cells.tsx`/`drop-zones.tsx`, implement the handler + optimistic update + server action + TanStack invalidation in `EstimateSheetContent.tsx`, and **decide template-editor parity**. This is the widest-radius family and the only one that crosses into DB/network (see [06-DATABASE-AND-NETWORK-AUDIT.md](06-DATABASE-AND-NETWORK-AUDIT.md)).

### Non-seams — explicitly OUT of the A/B/C/D radius

For risk scoping, the negative space matters:

| Surface | Why it is decoupled (verified) |
|---------|--------------------------------|
| `EstimateSheetTree.tsx` (left tree-nav) | Imports none of `rows/branch`, `rows/node-visuals`, `rows/expansion`, or `groupGap`; has its own `NodeIcon` and CRUD. Node-level CRUD origin lives here, not the EMC. |
| `ShareEstimateTreePanel.tsx` / `ShareEstimateTreeView.tsx` | Independent read-only mirrors with their own `collectAllNodeIds` (ShareEstimateTreePanel.tsx:58-63) and `hasChildren`/`aria-expanded`; import no EMC row module. |
| `estimate-tree-node-icon.test.tsx` | Targets the **left tree's** Circle icon, not the EMC's. EMC `NodeIcon` changes do not touch it. |

Do not modify these for A/B/C. (A future "unify icons across sidebar + EMC" decision is a separate, larger change with its own radius — and would then pull the node-icon test into scope.)

---

## The binding constraint: `estimate-mixed-content.test.tsx` pins current (partly buggy) behavior

`tests/vitest/estimate-mixed-content.test.tsx` is the single test file most coupled to the EMC, and it **asserts the present behavior** — including the Req-3 caret bug. **Every one of A/B/C breaks at least one assertion here, by design.** These tests must be rewritten *as part of* the change (TDD: flip the assertion first, watch it fail, then change `branch.tsx`), not afterward. Verified by reading the file:

| Test (line) | Asserts | Breaks under |
|-------------|---------|--------------|
| "renders a mixed node's own rows table BEFORE its child sub-areas" (`:73-84`) | uses `getByText("Own items")` (`:77`) as the **before-anchor** for DOM order | **A** — removing the label forces re-anchoring on the `<thead>`/table |
| "shows the 'Own items' label only when a node has BOTH rows and children" (`:86-94`) | label present in mixed (`:88`), absent in leaf (`:93`) | **A** — both assertions invert/delete |
| "renders a disclosure caret + aria-expanded only on a node with children" (`:96-111`) | leaf node has **no** Collapse/Expand button (`:105`) and its sticky header has **no** `[aria-expanded]` (`:108-110`) | **B** — both become false once rows-only nodes get carets |
| "offsets the own-rows sticky thead below the node header" (`:113-122`) | `thead.style.top === \`${STICKY_HEADER_H}px\`` (`:121`) | **C** — only if C changes header height / `STICKY_HEADER_H` |
| "renders no 'Group Node' / 'Area Node' / 'select a group first' copy" (`:124-129`) | P6 vocabulary guard | none of A/B/C (stays green) |

No other vitest file asserts these EMC specifics: the template-drop-zones test has no caret/own-items/sticky assertions, and `estimate-tree-node-icon.test.tsx` targets the left tree (confirmed in the non-seams table).

**Required rewrites, by family:**

- **A:** delete/invert the "Own items" assertions (`:86-94`); re-anchor the rows-first DOM-order test (`:73-84`) on the `<thead>`/table instead of the label. If an `sr-only` boundary is kept (see [03-UXUI-AUDIT.md](03-UXUI-AUDIT.md) sections 3.4 / 4.7 and [04-FEATURE-READINESS-AND-BUG-AUDIT.md](04-FEATURE-READINESS-AND-BUG-AUDIT.md) aria-expanded gap), assert that instead.
- **B:** flip `:96-111` to assert the caret **+ `aria-expanded`** now appear on a rows-only node, and assert that **only** a fully-empty node (no rows, no children) has none.
- **C:** update the `:121` expected `top` only if header height moved; prefer keeping header height fixed (below) so this stays green.

---

## Change-family detail

### Family A — remove the EMC "Own items" label

- **Direct dependents:** `branch.tsx:241-248` only. One importer (`EstimateSheetContent.tsx`), no downstream component reads the label.
- **Shared seams that co-change:** template editor — none (never had the label). Charts aggregation — **string-only proximity; must NOT be touched** (CRITICAL CALLOUT).
- **Tests that break:** `estimate-mixed-content.test.tsx:77, 88, 93` (and the `:73-84` rows-first test's reliance on the label as anchor). `project-charts-aggregation.test.ts` must stay **green and untouched**.
- **A11y note:** the eyebrow doubles as the L7 screen-reader boundary (branch.tsx:244 comment). The header already carries a full `sr-only` dual-content announcement (`headerAriaLabel`, branch.tsx:103-107, rendered at branch.tsx:181), so the boundary may be preserved with a zero-visual `sr-only` span or considered redundant — reconcile with [03-UXUI-AUDIT.md](03-UXUI-AUDIT.md) (sections 3.4 / 4.7) and [04-FEATURE-READINESS-AND-BUG-AUDIT.md](04-FEATURE-READINESS-AND-BUG-AUDIT.md) (aria-expanded gap).
- **Risk level:** **LOW** for code (one `<p>`, one importer) but **HIGH-if-careless** because of the charts string collision + the test re-anchoring. Net **LOW** with the grep-before-delete guard.
- **Rollback:** trivial — restore the `<p data-estimate-own-items-label>` block (branch.tsx:241-248) and revert the test edits. No state, no DB, no migration. A single-commit revert is clean.

### Family B — carets / collapsibility on rows-only nodes

- **Direct dependents:** `branch.tsx:182-205` (the `hasChildren ? Button : span` ternary). The fix is to gate on `hasContents` (branch.tsx:88, already computed) instead of `hasChildren` (branch.tsx:86).
- **Second-order effects (verified):**
  - **Collapse-id surface:** making rows-only nodes collapsible lets their id enter `collapsedNodeIds` (host state `collapsedNodeIdsByScope`, scope-keyed by `dataTabId`, search-paused when search is active). Set membership is behaviorally safe.
  - **Bulk vs single reconciliation:** `collectAllNodeIds` (expansion.ts) already enumerates **every** node id regardless of children, so collapse-all/expand-all already produce ids the per-node caret cannot act on today — Family B **reconciles** that inconsistency rather than creating it.
  - **Sticky math:** a rows-only node has no child branches, so collapsing it does not perturb `childStickyTop`. The sticky cascade is **not** disturbed by B specifically.
  - **Unmount win:** collapsing a rows-only node unmounts its `EstimateRowItemsTable` (the whole body is gated on `!collapsed`, branch.tsx:236) — a net **perf win** on large sheets (see [06-DATABASE-AND-NETWORK-AUDIT.md](06-DATABASE-AND-NETWORK-AUDIT.md) / the Performance doc, PERF-4).
- **Shared seams:** template editor already renders an always-on caret (no co-change needed; note semantic mismatch). Charts — none.
- **Tests that break:** `estimate-mixed-content.test.tsx:96-111` (`:105` leaf-has-no-button, `:108-110` leaf-header-has-no-`aria-expanded`). Both must flip. Confirm the **empty node** (no rows, no children → `hasContents === false`) still gets **no** caret (nothing to collapse) and keeps the reserved empty slot (branch.tsx:200-205).
- **Risk level:** **MEDIUM** — touches the disclosure model + `aria` + the collapse-id surface; no DB/network (collapse state is client-only, in-memory, scope-keyed).
- **Rollback:** revert the one-token gate change (`hasContents` → `hasChildren`) and the test flips. Because collapse state is ephemeral (lost on reload), there is no persisted bad state to clean up — a revert fully restores prior behavior.

### Family C — spacing / vertical-rhythm overhaul

- **Direct dependents:** `groupGap` (node-visuals.tsx:12-19), `STICKY_HEADER_H`/`STICKY_THEAD_H` (node-visuals.tsx:9-10), `space-y-4` + conditional `mt-1` (branch.tsx:237), `leftIndent = min(depth*32, 192)` (branch.tsx:89), `h-10` header (branch.tsx:174), the breadcrumb `my-1 pb-2` band (branch.tsx:220).
- **Dead-code note:** `groupGap`'s `depth1=mt-5` / `depth>1=mt-4` branches are unreachable because the recursion never passes `usesSiblingGroupRhythm` (it defaults `false`, branch.tsx:78), so the `depth > 0 && !usesSiblingGroupRhythm` guard (node-visuals.tsx:15) returns `mt-0` for every nested node. Fixing the rhythm means either deleting the flag and making `groupGap` purely depth-driven, or actually threading the flag in the recursive call (branch.tsx:285). See [03-UXUI-AUDIT.md](03-UXUI-AUDIT.md).
- **The three-way sticky coupling (the dangerous part):** `STICKY_HEADER_H=40` must equal the **rendered** header height `h-10`=40px (branch.tsx:174), because the recursion accumulates depth offsets from it — `ownRowsStickyTop = stickyTop + STICKY_HEADER_H` (branch.tsx:95) and `childStickyTop = ownRowsStickyTop + (hasOwnRows ? STICKY_THEAD_H : 0)` (branch.tsx:96). If C changes header height or adds vertical padding **inside** the sticky container (branch.tsx:172 wraps both header and breadcrumbs), then **rendered height, the constant, and the accumulated math** must all move together — and `estimate-mixed-content.test.tsx:121` (`thead.style.top === STICKY_HEADER_H`) must be updated. Get one wrong → headers collide (regressing the bug fixed at observation 7012) or a visible dead gap.
  - **The breadcrumb band (branch.tsx:218-233) sits INSIDE the sticky container** (branch.tsx:172) and adds real height (`my-1` + line + `pb-2`) that is **not** added to the child `stickyTop`. This is a pre-existing latent overlap bug (see the UX/UI doc UX-5) and a height source that fights the rhythm fix; C should resolve it (move breadcrumbs out of the sticky container, or add a breadcrumb-height constant to the offset).
- **Shared seam:** template editor — **the biggest divergence risk** (Seam 1), but narrow. Only the four leaf helpers (`NodeIcon`/`nodeHeaderClasses`/`nodeNameClasses`/`nodeTotalClasses`) are shared, so editing those changes both surfaces; editing `groupGap`, the `STICKY_*` constants, or any `branch.tsx`-local (the editor imports none of these — TemplateEditorSheet.tsx:19) is **EMC-local** and diverges the editor. Add a manual checklist item: open the template editor and a 3+-deep mixed estimate after C.
- **Tests that break:** `estimate-mixed-content.test.tsx:121` only if header height / `STICKY_HEADER_H` changes.
- **Risk level:** **MEDIUM-HIGH** if it changes header height (triggers the 3-way sticky coupling + template divergence); **contained / LOW-MEDIUM** if it touches only the **non-sticky** gaps (`space-y-*`, `groupGap`, breadcrumb `my`/`pb`, `leftIndent`) and leaves `h-10`/`STICKY_*` fixed. **Strongly prefer the contained path.**
- **Rollback:** revert `node-visuals.tsx` + `branch.tsx` className/constant edits. Pure CSS/layout, no state or DB. If header height was changed, ensure the `STICKY_*` constants and the test expectation are reverted in the same revert so the sticky math stays consistent.

### Family D — CRUD gap-fills

- **Direct dependents:** widest. Each new operation touches `SheetMutationHandlers` (branch.tsx:62), the destructure + recursion (branch.tsx:78, 285-309), the affordance file(s) (`row-table.tsx`/`cells.tsx`/`drop-zones.tsx`), the host handler + optimistic state + server action + invalidation (`EstimateSheetContent.tsx`), and the parallel `TemplateSheetHandlers` if parity is wanted.
- **Highest-value sub-item — the kind-gate insert bug (P6 violation):** `EstimateSheetContent.tsx:1649` `if (targetNode?.kind !== "area") return;` silently no-ops every blank-row add / library insert / component drop / command-palette insert into a `group`-kind node, even though the server action is already kind-agnostic. The batch template path repeats it at `EstimateSheetContent.tsx:1740` (`kind !== "group"`). This is a **behavior change needing owner sign-off** and is coupled to a **DB drift** — the committed `insert_estimate_row_item_with_history` RPC still hard-codes `node.kind = 'area'`, so lifting the client gate will fail on any environment built from the committed migrations unless D0/D2 prove and land parity with the hosted P6 behavior (see [06-DATABASE-AND-NETWORK-AUDIT.md](06-DATABASE-AND-NETWORK-AUDIT.md) DBNET-1). **The committed P6-relax migration must land before this ships to a non-prod environment.**
- **Node-level CRUD location decision:** add/rename/delete/move-area affordances currently live in the **left** `EstimateSheetTree.tsx`, not the EMC. Whether any of these belong in the EMC node header is itself a design decision — keep node-level (left tree) and row-level (EMC) CRUD decisions separate.
- **Shared seams:** `TemplateSheetHandlers` (parity per operation), the optimistic `editableRows` model + TanStack invalidation, and (for the kind-gate) the DB RPC + migration drift.
- **Tests that break:** none in `estimate-mixed-content.test.tsx` directly; new operations need their own tests. The kind-gate fix should add a test that inserting into a mixed/group node succeeds.
- **Risk level:** **MEDIUM-HIGH per operation** — it is the only **data-bearing** family (crosses the mutation seam into optimistic state + server actions + invalidation + the DB drift). Scope each gap-fill as its **own** change with its own impact pass.
- **Rollback:** per-operation. Presentational additions revert cleanly. The kind-gate change is reversible client-side, but if it has already driven row inserts into previously-blocked group nodes, those rows are persisted — a revert of the client gate does not delete them (they remain valid under the relaxed schema). The migration is forward-only; coordinate with the DB owner before reverting.

---

## Master risk table

| Family | Code radius | Shared seams co-changing | Breaking tests (file:line) | DB / network? | Risk | Key mitigation |
|--------|-------------|--------------------------|----------------------------|---------------|------|----------------|
| **A** Remove EMC "Own items" label | 1 `<p>`, 1 importer | charts string-collision ONLY (do not touch) | `estimate-mixed-content.test.tsx:77,88,93` (`project-charts-aggregation.test.ts` MUST stay green) | No | **LOW** | grep `"Own items"` before delete; delete only branch.tsx:241-248; re-anchor rows-first test on `<thead>` |
| **B** Carets on rows-only nodes | `branch.tsx:182-205` gate | template editor (already always-on; semantic mismatch only) | `estimate-mixed-content.test.tsx:96-111` (`:105`,`:108-110`) | No (collapse client-only) | **MEDIUM** | gate on `hasContents` not `hasChildren`; keep empty-node caret-less; flip the two leaf assertions |
| **C** Spacing rhythm overhaul | `node-visuals.tsx` + `branch.tsx` layout | template editor (visible divergence) | `estimate-mixed-content.test.tsx:121` *iff* header height changes | No | **MEDIUM-HIGH** | keep `h-10`/`STICKY_*` fixed; touch only non-sticky gaps; resolve breadcrumb-in-sticky; manual deep-tree + template-editor check |
| **D** CRUD gap-fills | `SheetMutationHandlers` seam + host + DB | template `TemplateSheetHandlers`; DB RPC + migration drift | new per-op tests; kind-gate needs a success test | **Yes** | **MEDIUM-HIGH** per op | land P6-relax migration first (DBNET-1); per-op impact pass; decide node-vs-row CRUD location; thread new handler in destructure AND recursion |

**Cross-cutting:** none of A/B/C touch the DB, network, RLS, or server actions — they are pure client-render changes (collapse state is in-memory, scope-keyed). **Only D is data-bearing.** The dominant non-code risk across all four is (1) the test suite pinning current behavior and (2) the silent template-editor divergence.

---

## Recommended sequencing & regression gate

> **Letter caution:** this doc's change-family letters (A/B/C/D, keyed to the *change*) are NOT the same as [08-IMPLEMENTATION-PLAN.md](08-IMPLEMENTATION-PLAN.md)'s phase letters (A/B/C/D, keyed to *execution order*). The canonical requirement mapping is **A = R1** (remove eyebrow), **B = R3** (caret), **C = R2** (spacing), **D = R4** (CRUD). Whenever an order is cited, use the requirement ids, not the family letters.

1. **Canonical execution order = R3 → R1 → R2 → R4** (see [08-IMPLEMENTATION-PLAN.md](08-IMPLEMENTATION-PLAN.md) Phases A–D, where Phase A=R3, Phase B=R1, Phase C=R2, Phase D=R4): do the caret fix (R3 / Family B) first, then remove the eyebrow (R1 / Family A), then the spacing overhaul (R2 / Family C), then the CRUD gap-fills (R4 / Family D). Each presentational change (R3, R1, R2) ships with **its test rewrite in the same commit** (TDD: flip the assertion, watch it fail, change `branch.tsx`), keeping `estimate-mixed-content.test.tsx` green at the end of every commit.
2. **R4 (Family D, CRUD) as separate per-operation changes**, each with its own `get_impact_radius` pass on the specific handler; the kind-gate fix is **gated on the DBNET-1 migration landing first**.

**Regression gate to run after every A/B/C/D change:**

```
estimate-mixed-content.test.tsx        (EMC behavior — rewritten in-PR)
project-charts-aggregation.test.ts     (charts "Own items" leaf — MUST stay green)
project-charts-golden-master*          (chart payload contract)
estimate-template-drop-zones*          (drop affordances)
tests/vitest/perf/*                    (render-isolation budget; see Performance doc)
```

**Manual checks (the unit tests will not catch these):**

- After **Family C (R2, spacing)**: open the **template editor** and a **3+-deep mixed estimate**, scroll, and confirm no sticky-header collision/gap and acceptable cross-surface visual consistency.
- After **Family B (R3, caret)**: collapse a rows-only node and confirm its table unmounts and re-expands, and that a fully-empty node shows no caret.

---

## Open decisions to surface to the owner

1. **Unify the two node renderers** (`branch.tsx` EMC + `TemplateSheetBranch` template editor) into one, or accept permanent visual divergence? Decides whether C is one edit or two (Seam 1).
2. After Family B, should a **fully-empty node** (no rows, no children) get a caret? Recommended **no** (nothing to collapse; keep the reserved slot at branch.tsx:200-205).
3. For Family A, does removing the visual label require a replacement **`sr-only` L7 boundary**, or is the existing header `headerAriaLabel` (branch.tsx:103-107, 181) sufficient? Decides whether `estimate-mixed-content.test.tsx` keeps an a11y assertion or deletes it.
4. For Family C, may **header height change** (triggering the `STICKY_HEADER_H` 3-way coupling, BR-04) or must it stay fixed at 40px with only inter-node gaps moving? Recommended: keep fixed.
5. For Family D, is lifting the **kind-gate** (EstimateSheetContent.tsx:1649, 1740) approved, and is the **P6-relax migration** committed so non-prod environments match prod (DBNET-1)? Blocker for any group/mixed-node insert work.

---

## Cross-references

- [04-FEATURE-READINESS-AND-BUG-AUDIT.md](04-FEATURE-READINESS-AND-BUG-AUDIT.md) — the `hasContents` caret gate detail (Family B / R3).
- [03-UXUI-AUDIT.md](03-UXUI-AUDIT.md) — the spacing-token map and dead-`groupGap` fix (Family C / R2).
- [02-CRUD-CAPABILITY-MATRIX.md](02-CRUD-CAPABILITY-MATRIX.md) — the full operation census + the kind-gate bug (Family D / R4).
- [06-DATABASE-AND-NETWORK-AUDIT.md](06-DATABASE-AND-NETWORK-AUDIT.md) — DBNET-1 RPC/migration drift, DBNET-3 charts leaf, persistence map (Family D gating).
- [03-UXUI-AUDIT.md](03-UXUI-AUDIT.md) (sections 3.4 / 4.7) and [04-FEATURE-READINESS-AND-BUG-AUDIT.md](04-FEATURE-READINESS-AND-BUG-AUDIT.md) (aria-expanded gap) — reconcile the `aria-expanded` change (B) and the `sr-only` "Own items" boundary (A).
- Performance doc — PERF-4 (caret unmount win), the per-table memo comparator, and the perf regression gate.

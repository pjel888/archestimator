# 06 — Blast Radius

Derived from `code-review-graph` impact analysis plus the feature map. The
honest summary: **the tab strip's blast radius is narrow; the permission-thread
is wider but additive; downstream tab consumers already tolerate new/empty tabs.**

---

## 1. Direct importers of `EstimateTabStrip` — only 2

`code-review-graph importers_of` returns exactly two:

- `src/components/workshop/EstimateSheetContent.tsx` (the mount)
- `tests/vitest/estimate-tab-strip.test.tsx` (the test)

So changes confined to the strip have a **tiny** real surface. The impact tool's
headline ("544 impacted nodes / 26 files") is **inflated and misleading** — the
"impacted files" list is dominated by `.agents/skills/impeccable/scripts/*`
(unrelated indexed tooling) and shared-utility fan-out from the very large
`EstimateSheetContent`. Those are not behavioral dependents of the tab strip.
Treat the import graph (2 files) as the true coupling for the strip.

## 2. Files this plan touches (and why)

| File | Change | Risk |
|---|---|---|
| `EstimateTabStrip.tsx` | Context menu, target-tab handlers, gate, overflow, motion | **MED** — net-new menu + handler refactor; covered by tests |
| `EstimateSheetContent.tsx` | Pass `enableLifecycleActions`/`canCreateTabs` from `canEditEstimate`; gate empty-state actions | LOW — localized to mount + empty state |
| `EstimateWorkspaceClient.tsx` | Thread `canEditEstimate` prop; `setQueryData` on create | LOW — additive prop |
| `app/.../estimates/[nodeId]/page.tsx` | Resolve + pass `canEditEstimate` | LOW — additive, server-side |
| `workspace-repository.ts` (maybe) | Helper to resolve edit capability (or reuse `can_edit_estimate`) | LOW–MED — new read path; RLS unchanged |
| `tests/vitest/estimate-tab-strip.test.tsx` | Extend coverage | LOW |
| `.ai/10_state/decisions.md`, `current-state.md` | Record D-15 lift | none (docs) |

No change to: the migration, RPCs, RLS, server actions (`createEstimateTab`
etc.), or generated types.

## 3. Downstream tab consumers — already tolerant

Lifting the gate means users can now create (and create *empty*) tabs at will.
Every downstream consumer was built for a multi-tab world and **already handles
new/empty tabs** (verified in the feature map; re-verify in QA, don't rebuild):

| Consumer | File | Behavior with a new/empty tab | Action |
|---|---|---|---|
| XLSX export | `app/api/.../export/proposal.xlsx/route.ts` | Empty tab → one near-empty worksheet; all-tabs/`?tab=`/single handled | **Verify** empty worksheet + preview scope chip |
| Activity / history | `src/lib/activity/activity-composer.ts` | `tab_created` event → "Created {Tab}" entry | **Verify** entry renders |
| Publication / presence | `src/lib/publication/actions.ts` | Tab enumerated in next snapshot; presence carries `activeTabId` | **Verify** snapshot includes new tab |
| AI read context | `src/lib/ai/read-context.ts` | Empty tab shows `nodeCount:0`; capped at 12 tabs | **Verify** no crash; empty tab listed |
| Sheet duplication | `src/lib/estimates/actions.ts` | Duplicates propagate all tabs | No new risk |
| Cross-tab node drag | `EstimateTabStrip.tsx:168` | Rejected with toast (D-7) | **Verify** rejection fires on new tab |

These are **verification** items, not implementation — the tolerance already
shipped and was locally proven (completion audit).

### 3a. Acceptance criteria for U7 (expected results, not just "verify")

Capture evidence in `.ai/05_logs/`. Each must PASS:

- **Export (empty tab):** exporting an estimate with a freshly "+"-created empty
  tab produces a valid workbook with **exactly one worksheet for that tab**,
  header/structure rows only (no row data), a non-colliding worksheet name, and
  the export preview scope chip shows the new tab's name. No 413, no throw.
- **Activity:** creating a tab writes a `tab_created` event and the Activity feed
  renders one entry reading "{Actor} created {Tab name}" attributed to the
  correct `estimate_tab_id`.
- **Publication snapshot:** the next publication enumerates the new tab in the
  snapshot's `tabs` array (id, name, sort_order, is_default=false).
- **AI read-context:** the empty tab appears in context with `nodeCount:0,
  rowCount:0`; no error; respects the 12-tab cap.
- **Cross-tab drag:** dragging an estimate-tree node onto the new tab shows the
  rejection toast and does **not** move the node (D-7 preserved).
- **Permission gate:** as a viewer (if reachable, OQ1) the "+", context menu,
  double-click rename, and empty-state Add Group / Browse buttons are all
  absent/disabled.

## 4. The permission-thread blast (`canEditEstimate`)

Threading a new edit-capability prop through page → workspace client → content →
strip is **additive** (new optional prop, default safe). Its only behavioral
effect: edit affordances (the "+", context menu, double-click rename, and the
empty-state Add Group / Browse templates) become hidden/disabled for non-editors
who reach the route. That is a **net improvement**, not a regression.

⚠️ **Audit correction:** there is **no role already fetched on this route** to
reuse — `resolveEstimateTabRouteContext` resolves only workspace/project/
estimate/tree data. `canEditEstimate` must be resolved by calling the
`can_edit_estimate` RPC. Add it **inside the page's existing `Promise.all`** so
it runs in **parallel** with the route-context load — one extra DB read, not a
sequential first-paint hop. See [07 U1](07_IMPLEMENTATION_PLAN.md) and
[OQ1](08_DECISIONS_AND_OPEN_QUESTIONS.md).

## 5. Risk ledger

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| "+" shown but RPC unapplied in prod → error on click | Low (fails closed: strip hidden if schema missing) | High if it occurred | Deploy-checklist verify schema applied before flipping gate in prod |
| Viewer sees "+" / context menu | Med (no client gate today) | Med (UX + error flash) | `canEditEstimate` gate (U1/U3) |
| Context-menu actions hit wrong tab | Med (handlers currently target active tab) | Med | Refactor handlers to target tab id; test it |
| Delete removes last tab | Low (RPC + UI guard) | Med | Disable Delete on last tab; keep guards |
| Empty tab breaks export/activity/AI | Low (already tolerant) | Med | Verification items in §3 |
| Many tabs slow all-tabs export | Low | Low–Med | Monitor; bounded + 413 guard exists |
| Redundant create refetch flash | Med (current behavior) | Low | `setQueryData` from returned array |

**Overall: LOW–MEDIUM.** The data layer is untouched; the UI change is in a
2-importer component; downstream is already tolerant. The only High-impact node
is the hosted-migration prerequisite, which fails closed.

## 6. Pre-merge graph hygiene (per CLAUDE.md)

Before committing the implementation, run `gitnexus_detect_changes()` /
`detect_changes_tool` to confirm only the expected symbols/flows changed, and
re-run `gitnexus_impact` on `EstimateTabStrip` + `EstimateSheetContent` if the
handler refactor grows beyond the strip.

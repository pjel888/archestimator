# 10 - Implementation Readiness Addendum

> Part of the **Estimate Master Column (EMC) Improvement Plan** -- `.ai/03_plans/2026-06-14-Estimate-Tree-Column-Improvement-Plan/`
> Status: binding second-pass readiness gates - 2026-06-14 - Branch: feat/estimate-sheet-uxui
> Index: [00-README](00-README.md)

---

## Purpose

This addendum is binding on the implementation plan. It incorporates the second-pass architecture, UX, QA, and code-review findings that were raised after the original pack was drafted. Use it with [08-IMPLEMENTATION-PLAN.md](08-IMPLEMENTATION-PLAN.md); if the two differ, this addendum is stricter.

The latest owner-visible failure to protect against is:

> Nested row items must render fully inside the EMC. The sticky node header and the `Materials / Qty / ...` table header must never cover, clip, or cut the first nested row when the tree is deep or scrolled.

---

## Readiness Gates Before Coding

| Gate | Scope | Stop condition |
|---|---|---|
| G1 - worktree/concurrency | Other agents may be active in the same codespace | Run `git status --short --branch` before editing, inspect any touched source/plan files, and do not overwrite unrelated changes |
| G2 - command parity | Prevent false-green verification | Use Bun commands in this pack; do not use `npx next lint` |
| G3 - DBNET-1 | Mixed-node insert paths | D1 and D3 cannot ship until D0 proves live RPC bodies and D2 lands or is explicitly accepted as deferred drift |
| G4 - visual clipping | Phase C spacing/sticky work | No implementation-complete claim without browser screenshot/bounding-box evidence for nested rows under sticky headers |
| G5 - destructive drag | Req 4 readiness | Cancelled/failed component drag must not clear the row component, or the bug must be removed from this branch scope by an explicit owner decision |
| G6 - maker/checker | Non-trivial implementation | A reviewer different from the implementer must clear the diff before completion |

---

## Verification Commands

Run from repo root. These replace the older `npx`/`next lint` examples in earlier drafts.

```bash
# focused EMC + charts regression set
bun x vitest run --maxWorkers=1 tests/vitest/estimate-mixed-content.test.tsx \
  tests/vitest/project-charts-aggregation.test.ts \
  tests/vitest/estimate-template-drop-zones.test.tsx

# perf isolation gate after branch/table/host changes
bun x vitest run --maxWorkers=1 tests/vitest/perf

# type + lint + design-system scan
bun run type-check
bun run lint
bun run lint:design-system
```

For Phase C, also run a touched-file design scan:

```bash
rg -n "text-sm|text-xs|text-\\[13px\\]|text-\\[14px\\]|font-semibold|font-bold|rounded-md|rounded-lg|rounded-xl|rounded-full|bg-blue-|shadow-" \
  src/components/workshop/EstimateSheetContent.tsx \
  src/components/workshop/estimate-sheet/rows
```

Any hit in a touched file must be justified against `DESIGN.md` or removed. The app contract is compact, neutral, 12px-max typography, 3px-radius chrome, and no raw blue selection styling in the EMC.

---

## Phase C Visual Acceptance Contract

Phase C is not complete until the implementer proves the following in a real browser:

1. A 4-5 level mixed tree with own rows at multiple depths scrolls without overlap between sticky node headers, breadcrumb bands, and sticky table headers.
2. Nested row content is fully visible below the `Materials`, `Qty`, `Subtotal`, `Adjustment`, `Misc Cost`, and `Total Item Cost` header row. The first material card, row title, quantity input, unit, row actions, and add-row affordance must not be hidden behind the header.
3. The same fixture passes at 100%, 125%, and 150% browser zoom.
4. The same fixture passes at 1440, 1280, 1024, 768, and 390px widths. At compact widths, the sheet remains the primary surface; controls may truncate intentionally, but text/control overlap is a failure.
5. With the left tree and right library visible at 1440px, the center sheet still shows the selected node header, table header, and at least five usable row bodies without horizontal UI collision.
6. Long material names truncate within their cell instead of pushing the fixed row grid into clipped controls.

Record screenshot artifacts in an `.ai/05_logs/` or `.omx/` evidence path and link them from the implementation closeout. If a Playwright test is added, prefer bounding-box assertions that table headers and first visible rows do not intersect; a screenshot alone is useful but not sufficient for automated proof.

### Sticky/Breadcrumb Decision

Before changing Phase C code, choose one of these contracts and record it in the implementation notes:

| Option | Contract |
|---|---|
| Keep breadcrumbs inside sticky node header | Breadcrumb height must be accounted for in visual QA; prove it does not push the sticky container over the row table |
| Move breadcrumbs outside sticky node header | Keep `STICKY_HEADER_H` tied only to the 40px header row and prove scroll rhythm still reads correctly |

Do not change `h-10`, `STICKY_HEADER_H`, or `STICKY_THEAD_H` unless the constants, tests, and visual proof are updated together.

---

## Accessibility And Keyboard Gates

Phase A must cover more than caret presence:

| Scenario | Required proof |
|---|---|
| Rows-only node mouse toggle | Button exists, `aria-expanded` starts true, click hides/restores the table |
| Rows-only node keyboard toggle | Enter and Space toggle the node, focus remains on the disclosure button, table visibility matches `aria-expanded` |
| Empty node | No disclosure button and no `aria-expanded` surface |
| Collapse-all | Collapse-all hides rows-only tables; a single rows-only node can be re-expanded without reopening every node |
| Active search | Either hide/disable disclosure buttons while search forces everything visible, or explicitly document why visible buttons remain correct and add a test for restored collapse state after search clears |

---

## CRUD And Data Gates

### DBNET-1

`.ai/10_state/current-state.md` records that P5/P6 production relax work was applied and write-enablement was verified. That is useful project state, but it is not a substitute for the implementation preflight. D0 still must run fresh against the target Supabase project before D1/D2/D3 ship, because this plan has to protect clean migrated environments as well as production.

### D3 Batch Template Inserts

D3 is gated the same way as D1. The batch server action eventually calls the committed `insert_estimate_template_into_estimate` RPC, whose committed migration still gates parent nodes by `kind = 'group'`. D3 must not ship on UI optimism alone. Required proof:

- D0 includes `insert_estimate_template_into_estimate`.
- D2 relaxes the committed RPC body, or the drift is explicitly accepted and D3 is deferred.
- A clean migrated DB accepts multi-template insert into an `area` parent.

### Destructive Drag

The cancelled-drag bug is not a cosmetic follow-up. Before Req 4 is called implementation-ready, add a required Phase D task:

1. Change `handleComponentDragEnd` so `dropEffect !== "move"` snaps back and does not clear the attached component.
2. Keep explicit clear/delete as the only destructive row-component actions.
3. Add a DOM test or manual browser proof for drag cancel/no drop.

If this is deferred, the plan must state that a known destructive interaction ships intentionally.

### Phantom Row Handle

The `DotsSixVertical` handle in `row-table.tsx` must not keep announcing fake drag support. For beta readiness, either remove the false handle/`aria-label` or wire real row reorder. Removal is the lower-risk default.

---

## Performance And Scale Gates

No virtualization work is required for this branch, but the no-virtualization assumption needs a ceiling:

- Phase C proof should use at least 5 depths, 25 nodes, and 100 visible row bodies across the selected subtree.
- If that fixture scrolls jankily, clips sticky layers, or makes row edit latency visibly worse, stop and decide whether branch memoization, row virtualization, or smaller scope is required.
- Keep the existing table render-isolation perf tests green. Add a collapse-unmount probe for rows-only nodes so the Req 3 fix is proven perf-positive, not just visually correct.

---

## Done Criteria

Implementation is ready to close only when:

- All modified plan/source/test files survive `git diff --check`.
- The focused Vitest, perf, type-check, lint, and design-system commands above pass, or each skipped command has a concrete reason and risk.
- Browser proof exists for nested sticky/header clipping at the viewports and zoom levels above.
- D0/D2/D1/D3 ordering is respected for any data-bearing insert changes.
- Destructive drag cancel and phantom row handle are fixed or explicitly owner-accepted as deferred.
- A separate reviewer clears the final diff with no open high-severity findings.

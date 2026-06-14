# EMC Phase C — Visual Acceptance Evidence (Req 2 / OD-20 / C4)

> Part of the **Estimate Master Column (EMC) Improvement Plan** — `.ai/03_plans/2026-06-14-Estimate-Tree-Column-Improvement-Plan/`
> Date: 2026-06-14 · Branch: `feat/estimate-sheet-uxui`
> Status: **PENDING owner browser execution** (the automated phases A/B/C1–C3 + the OD-20 structural fix are committed and green; the in-browser screenshot/bounding-box sign-off below requires the authenticated workshop session)

---

## Why this note exists

The owner-reported headline failure is a **clipping bug**:

> Nested row items must render fully inside the EMC. The sticky node header and the `Materials / Qty / ...` table header must never cover, clip, or cut the first nested row when the tree is deep or scrolled.

Per project setup, the dev-auth bypass is disabled and a second `next dev` won't start, so the implementing agent **cannot** drive the authenticated workshop or capture screenshots. This note records (a) the structural fix that removes the clip *by construction*, the OD-20 contract decision, and (b) the exact pass/fail checklist for the owner to execute in their own Chrome session and attach evidence.

---

## OD-20 sticky/breadcrumb contract — DECISION

**Chosen: move breadcrumbs OUTSIDE the sticky node header** (option 2 in [10-READINESS-ADDENDUM](../03_plans/2026-06-14-Estimate-Tree-Column-Improvement-Plan/10-READINESS-ADDENDUM.md)).

**Root cause (confirmed in source).** The breadcrumb band was rendered *inside* the sticky header container (`branch.tsx`, the `sticky z-[20]` div), so the sticky header's real height was `40px (header) + ~24px (breadcrumb) ≈ 64px`. But the own-rows `<thead>` pins at an explicit `stickyTop + STICKY_HEADER_H` = `stickyTop + 40px` (`row-table.tsx` `style={{ top: stickyTop }}`, fed `ownRowsStickyTop = stickyTop + STICKY_HEADER_H`). On any nested node the breadcrumb (`z-20`) therefore painted over the top ~24px of the `Materials / Qty / ...` thead (`z-10`) — exactly the reported clip.

**Fix.** The breadcrumb is now a normal (scrolling) band and the first child of the node body (`mt-1 space-y-2`), so the sticky header is exactly the 40px row = `STICKY_HEADER_H`. `h-10`, `STICKY_HEADER_H`, and `STICKY_THEAD_H` are unchanged (OD-5 respected — no 3-way coupling churn). The breadcrumb is contextual-on-arrival and scrolls away; the node header + table thead remain the only sticky layers, and their offsets are now honest.

**Guard test.** `estimate-mixed-content.test.tsx` → *"keeps a nested node's breadcrumb OUT of the sticky header so it can't clip the table thead (OD-20)"* asserts the breadcrumb is not a descendant of the `.sticky` container. The pre-existing *"offsets the own-rows sticky thead below the node header (sticky cascade)"* test (`thead.style.top === STICKY_HEADER_H`) stays green.

---

## What the unit suite already proves

- Caret on any node with contents; truly-empty node keeps the inert slot (Req 3).
- No "Own items" EMC eyebrow; charts money-attribution leaf untouched (Req 1).
- `groupGap` is live + token-aligned, decreasing with depth (Req 2 / C1).
- In-node cluster gap is `space-y-2`, indent quantized to 16px step (Req 2 / C2).
- Breadcrumb is outside the sticky header (Req 2 / OD-20).
- Perf isolation guards (`rendersOutside===0`, cursor isolation) stay green.

The unit suite **cannot** prove real-browser layout. The checklist below is the remaining gate.

---

## Owner execution checklist (attach evidence inline)

**Fixture.** Open a real estimate with a **4–5 level** mixed tree, own rows at multiple depths, **≥25 nodes** and **≥100 visible row bodies** across the selected subtree (the no-virtualization scale ceiling).

**Capture matrix.** Screenshot each cell; a ✅/❌ per row.

| # | Acceptance criterion (from [10-READINESS-ADDENDUM] Phase C Visual Acceptance Contract) | Result | Screenshot |
|---|---|---|---|
| 1 | A 4–5 level mixed tree scrolls with **no overlap** between sticky node headers, the (now non-sticky) breadcrumb band, and sticky table headers | ☐ | |
| 2 | Nested row content is **fully visible** below the `Materials / Qty / Subtotal / Adjustment / Misc Cost / Total Item Cost` header row — first material card, row title, qty input, unit, row actions, and the add-row affordance are not hidden behind any sticky layer | ☐ | |
| 3 | Passes at **100% / 125% / 150%** browser zoom | ☐ | |
| 4 | Passes at **1440 / 1280 / 1024 / 768 / 390px** widths (controls may truncate intentionally at compact widths, but text/control overlap is a failure) | ☐ | |
| 5 | At 1440px with the left tree + right library visible, the center sheet still shows the selected node header, table header, and **≥5 usable row bodies** without horizontal UI collision | ☐ | |
| 6 | Long material names **truncate within their cell** instead of pushing the fixed row grid into clipped controls | ☐ | |
| 7 | The inter-node rhythm reads as a **hierarchy** (top-level siblings breathe, deep siblings sit tighter); nested nodes read as nested via tonal surface + indent, not stacked card borders (C3) | ☐ | |

**Stop condition.** Any overlap, clipping, or text/control collision under a sticky header is a **failure** and blocks the Phase C "implementation-complete" claim.

**Optional automated upgrade.** If a stable authenticated estimate fixture becomes available, add a Playwright spec under `e2e/` asserting bounding boxes: each sticky `thead` bottom ≤ first visible row top in its table, and sticky node headers do not intersect child table bodies. A bounding-box assertion is stronger than a screenshot.

---

## Performance sanity (during the same pass)

- Scroll the ≥100-row fixture: if it scrolls jankily, clips sticky layers, or makes row-edit latency visibly worse, **stop** and decide whether branch memoization (OD-18 B3) or row virtualization (OD-18) is needed. None is required for Reqs 1–4 by default.
- Collapsing a rows-only node should unmount its table (Req 3 is perf-positive) — verify the heavy table leaves the DOM on collapse.

---

## Sign-off

- [ ] All 7 criteria ✅ with screenshots attached → Phase C visual gate **PASSED**.
- [ ] Any ❌ → file the specific failure and re-open Phase C.

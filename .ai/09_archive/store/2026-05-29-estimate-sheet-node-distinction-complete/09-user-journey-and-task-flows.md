# 09 — User Journey & Task Flow Analysis

**Date:** 2026-05-21  
**Method:** Persona-driven task decomposition, critical-path mapping, pain-point anticipation  
**Persona:** Small contractor / fit-out estimator / design-build contractor preparing a project cost estimate under time pressure

---

## 1. The estimator's day

### 1.1 Morning session — "Building the structure"

**Job:** Set up the project location tree before any pricing begins.

**Task flow:**
1. Create a new estimate sheet for the project.
2. Add top-level groups: `Lot A`, `Lot B`, `General Requirements`.
3. Under `Lot A`, add `Main House` (group).
4. Under `Main House`, add `Ground Floor` (group) and `Second Floor` (group).
5. Under `Ground Floor`, add areas: `Foyer`, `Living Area`, `Kitchen`, `Powder Room`.
6. Realize `Kitchen` should be under a new `Wet Areas` group instead of directly under `Ground Floor`.
7. Reorganize via drag-and-drop in the tree.
8. Review the structure. Does it match how the client thinks about the project?

**Pain points observed:**
- **P-A1:** No visual confirmation of group vs area while building. The user must remember that only areas receive rows.
- **P-A2:** Reorganizing the tree requires drag-and-drop; there is no "Move to parent" command.
- **P-A3:** Without codes, the user cannot reference structural decisions in meeting notes ("we decided to split the kitchen into dry and wet zones").

**Our plan coverage:**
- ✅ Background distinction helps the user see which nodes are containers vs workspaces.
- ✅ Codes provide stable reference for structural decisions.
- ⚠️ Tree reorganization UX is outside this plan's scope but is a known friction point.

---

### 1.2 Midday session — "Pricing the rooms"

**Job:** Fill each area with material and labor line items from the component library.

**Task flow:**
1. Select `Kitchen` in the tree. The sheet shows the Kitchen branch.
2. Drag `Ceramic Floor Tile` from the component library into the Kitchen area.
3. Adjust quantity: 22 sqm (calculated mentally from floor plan).
4. Drag `Kitchen Cabinet — IKEA SEKTION` into the area.
5. Adjust quantity: 1 set.
6. Add labor cost for cabinet installation: ₱8,500.
7. Add supplementary cost for delivery: ₱1,200.
8. Scroll down. See subtotal: ₱45,200.
9. Think: "Is that reasonable for a kitchen this size?"
10. Open `Living Area` in the tree. Repeat.

**Pain points observed:**
- **P-B1:** The Kitchen area header looks identical to the `Ground Floor` group header above it. The user must read the tiny icon to confirm they're adding to the right place.
- **P-B2:** After scrolling through 12 material rows, the user forgets which room they're in. They scroll back up to check.
- **P-B3:** No row numbers. When the client asks about "the tile line," the user must describe it by material name instead of "row 3."
- **P-B4:** No quick way to see "what's the total for all floors?" without clicking back up to `Main House`.
- **P-B5:** The row table has no subtotal by discipline. If the user wants to know "how much is all the electrical work across this room?" they must manually sum.

**Our plan coverage:**
- ✅ Background distinction makes area headers visually distinct from group headers.
- ✅ Breadcrumbs keep the user oriented while scrolling through rows.
- ❌ Row numbers are not in scope.
- ❌ Discipline subtotals are not in scope.
- ❌ Cross-area roll-up at a glance is not in scope.

---

### 1.3 Afternoon session — "Review and reconcile"

**Job:** Check for missing items, verify totals, and prepare for client discussion.

**Task flow:**
1. Expand all nodes. Scroll through the entire sheet.
2. Look for empty areas (rooms with no items yet).
3. Notice `Powder Room` has zero rows. Add toilet, sink, mirror.
4. Check `Main House` total: ₱1.2M. Compare against client budget: ₱1.5M.
5. Drill into `Second Floor`. Check `Master Bedroom`. ₱320K. Seems high.
6. Review each row. The `Chandelier` row has no image. Is that the right item?
7. Click to expand the material cell. Verify supplier and pricing source.
8. Save status shows "Saved" on all rows. Good.
9. Close laptop. Head to client meeting.

**Pain points observed:**
- **P-C1:** With all nodes expanded, the sheet is very long. The user needs to scan quickly for empty areas, high-cost outliers, and missing disciplines.
- **P-C2:** No visual indicator for "area has no rows" vs "area has rows." The user must scroll to each area and check.
- **P-C3:** No cost-health indicator. A ₱45K chandelier in a ₱320K room is 14% of the room budget — is that flagged? No.
- **P-C4:** No global "unsaved changes" indicator. The user must scan every row's save-status pill.
- **P-C5:** The total on group headers is the same visual weight as the total on area headers. A ₱1.2M roll-up and a ₱245K direct sum are rendered identically.

**Our plan coverage:**
- ✅ Background distinction + codes make scanning faster.
- ⚠️ Empty-area visibility could be improved (white header + empty drop zone is okay but not instant).
- ❌ Cost-health / outlier indicators are not in scope.
- ❌ Global save-state indicator is not in scope.
- ❌ Roll-up vs direct-sum visual distinction is not in scope.

---

### 1.4 Client meeting — "Presenting the estimate"

**Job:** Walk the client through costs by room/area.

**Task flow:**
1. Open the estimate on a laptop or tablet.
2. Show the client the tree: "This is your Main House, broken down by floor, then by room."
3. Click `Kitchen`. Show the row table.
4. Client asks: "What's item A.03?" User must find the row.
5. Client asks: "Can we see the total for all wet areas?" User must manually navigate and sum.
6. Client asks: "What if we downgrade the tiles?" User must edit the row, change the component, recalculate.
7. Client asks for a printed copy. User exports... but export is not implemented.

**Pain points observed:**
- **P-D1:** No presentation mode. The dense 10px grid is hard to read from across a table.
- **P-D2:** No code-based lookup. "Item A.03" means nothing if codes aren't displayed.
- **P-D3:** No scenario comparison. "Downgrade tiles" requires editing live data; there's no "what-if" snapshot.
- **P-D4:** No print/PDF export.

**Our plan coverage:**
- ✅ Codes enable "Item A.03" referencing.
- ❌ Presentation mode is not in scope.
- ❌ Scenario comparison is not in scope.
- ❌ Export is not in scope.

---

## 2. Critical paths (must work flawlessly)

### CP1 — Add component to area
**Frequency:** 50+ times per estimate  
**Criticality:** 🔴 Highest  
**Steps:** Select area → find component → insert → adjust quantity → verify subtotal  
**Failure modes:** Insert into wrong node (group instead of area), component not found, quantity not saved.

### CP2 — Navigate between areas
**Frequency:** 30+ times per estimate  
**Criticality:** 🔴 Highest  
**Steps:** Click tree node → review sheet → click next tree node → review sheet  
**Failure modes:** Lose context of where you are, click wrong node, tree collapses unexpectedly.

### CP3 — Adjust costs and quantities
**Frequency:** 20+ times per area  
**Criticality:** 🔴 Highest  
**Steps:** Click quantity cell → type new value → tab to next cell → verify total updates  
**Failure modes:** Number parsing fails, total doesn't update, change not saved.

### CP4 — Review totals at multiple levels
**Frequency:** 5+ times per session  
**Criticality:** 🟡 High  
**Steps:** Expand groups → scan headers → compare totals against budget  
**Failure modes:** Totals don't roll up correctly, hard to distinguish group roll-up from area direct sum.

### CP5 — Identify empty/missing areas
**Frequency:** 2+ times per estimate  
**Criticality:** 🟡 High  
**Steps:** Scan sheet for areas with no rows → add missing components  
**Failure modes:** Empty area not visible, user forgets a room exists.

---

## 3. Secondary paths (important but not daily)

### SP1 — Reorganize tree structure
**Frequency:** 2–5 times per estimate  
**Criticality:** 🟢 Medium  
**Steps:** Drag node to new parent → verify children move with it → verify totals recalculate

### SP2 — Add custom component to library
**Frequency:** 1–3 times per estimate  
**Criticality:** 🟢 Medium  
**Steps:** Open component library → click "New Component" → fill form → save → insert into area

### SP3 — Review source/pricing metadata
**Frequency:** 1–2 times per area  
**Criticality:** 🟢 Medium  
**Steps:** Expand material cell → read pricing source and date → verify with supplier quote

---

## 4. Task-flow diagram (simplified)

```
[Create Project] → [Build Tree] → [Add Components] → [Adjust Costs] → [Review Totals]
      ↑                ↑              ↑                ↑              ↓
      └────────────────┴──────────────┴────────────────┘       [Client Meeting]
                                                                     ↓
                                                              [Revise / Export]
```

Our plan sits in the **"Add Components" → "Adjust Costs" → "Review Totals"** loop.

---

## 5. What the user values most (ranked)

| Rank | Value | Why |
|------|-------|-----|
| 1 | **Speed** | Estimators bill by the project, not by the hour. Every click saved is money earned. |
| 2 | **Accuracy** | A wrong total loses money or loses the bid. The UI must prevent errors. |
| 3 | **Confidence** | The estimator must trust that what they see is correct. Ambiguity kills confidence. |
| 4 | **Clarity for clients** | The estimate must be explainable to non-experts. Codes and structure help. |
| 5 | **Flexibility** | Projects change. The estimate must be easy to revise without starting over. |

Our plan directly addresses **#3 (Confidence)** through visual distinction, codes, and breadcrumbs. It indirectly addresses **#4 (Clarity)** through codes and breadcrumbs.

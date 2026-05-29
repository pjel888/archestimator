# 11 — Happy Paths, Edge Cases, and Failure Modes

**Date:** 2026-05-21  
**Goal:** Exhaustively map every scenario the estimate sheet must handle, from the obvious to the pathological, so implementation gaps are caught in planning rather than in production.

---

## 1. Happy paths (the 80% cases)

### HP1 — Single project, single estimate, 3-level tree

**Setup:**
```
Lot A (group)
  └── Main House (group)
        └── Ground Floor (group)
              ├── Foyer (area, 3 rows)
              ├── Living Area (area, 5 rows)
              └── Kitchen (area, 8 rows)
```

**User actions:**
1. Expand all nodes.
2. Scroll through sheet.
3. See clear distinction: muted group headers, white area headers, breadcrumbs under areas.
4. Read codes: `01`, `01.01`, `01.01.01`, `01.01.01.01`.
5. Collapse `Ground Floor`. Only `Main House` total visible.
6. Expand `Ground Floor` again. All children visible.

**Expected:** Zero confusion. Fast scannability.

---

### HP2 — Area with many rows (scroll-heavy)

**Setup:** `Kitchen` area with 25 row items.

**User actions:**
1. Scroll down through rows.
2. Breadcrumb `Lot A › Main House › Ground Floor › Kitchen` stays visible (sticky or near the table).
3. Code `01.01.01.03` is visible in the header.
4. Row numbers (`#01` through `#25`) help reference.

**Expected:** User never loses context of which room they're editing.

---

### HP3 — Selected branch view (middle of tree)

**Setup:** User clicks `Main House` in the tree. Sheet renders the `Main House` branch starting from that node.

**User actions:**
1. See `Main House` as the root of the sheet.
2. See `Ground Floor` and `Second Floor` as child groups.
3. See area headers and row tables under each floor.
4. All codes are relative to the selected branch? Or absolute?

**Open question:** Should codes be absolute (from project root) or relative (from selected node)?  
**Recommendation:** Absolute. Codes are reference identifiers, not navigation aids. A code must mean the same thing regardless of which branch is selected.

---

### HP4 — Empty area (newly created)

**Setup:** User adds `Pantry` area under `Ground Floor`. No rows yet.

**User actions:**
1. See white area header with code `01.01.01.04`.
2. See breadcrumb `Lot A › Main House › Ground Floor › Pantry`.
3. See empty drop zone below: "Drag and drop estimate component here."

**Expected:** Clear that this is an empty workspace waiting for items.

---

## 2. Edge cases (the 15% cases)

### EC1 — Very long node names

**Setup:** `Ground Floor Master Bedroom with Walk-in Closet and Ensuite Bathroom`

**Behavior:** Name truncates with ellipsis. Code remains visible. Total remains visible. On hover, a tooltip shows the full name.

**Risk:** If the name is too long, the code might be pushed off-screen before the name truncates.  
**Mitigation:** Code has `shrink-0`. Name has `min-w-0 truncate`. Total has `shrink-0`.

---

### EC2 — Very deep nesting (depth 6+)

**Setup:**
```
Lot A
  └── Building A
        └── Wing North
              └── Floor 1
                    └── Unit 101
                          └── Bedroom 1
```

**Behavior:**
- Indent caps at 192px (depth 6 = 192px).
- Code becomes `01.01.01.01.01.01` (14 characters). At 9px monospace, this is ~70px wide.
- Header bar at depth 6 has very little space for name + total.

**Risk:** Header content overflows or becomes unreadable.  
**Mitigation:**
1. At depth ≥ 4, consider showing only the last code segment (`.01`) instead of full path.
2. Or reduce code font size to `text-[8px]` at deep depths.
3. Or hide the code at very narrow widths (below a container-query threshold).

---

### EC3 — Single area, no groups

**Setup:** Root-level area (technically invalid per hierarchy rules, but test defensively).

**Behavior:** If the backend allows it, the sheet renders an area at depth 0 with no ancestors. Breadcrumb is hidden (no path). Code is `01`.

**Risk:** Inconsistent with tree rules.  
**Mitigation:** Backend already enforces root-level groups only. This case should not occur.

---

### EC4 — Group with no children

**Setup:** `Site Works` group with zero child groups and zero areas.

**Behavior:** Group header renders as muted band. No children below. No row table. Collapse/expand button is present but toggling shows/hides nothing.

**Risk:** User thinks the group is broken.  
**Mitigation:** Empty groups could show a subtle message: "Add a group or area node." This is tree-panel functionality, not sheet functionality. Out of scope.

---

### EC5 — Area with zero rows, but user collapses it

**Setup:** `Pantry` area, empty. User clicks collapse.

**Behavior:** Area header remains visible. Empty drop zone and breadcrumb are hidden.

**Risk:** User forgets the area exists.  
**Mitigation:** Collapsed area header could show a subtle "0 items" indicator. This is a nice-to-have, not critical.

---

### EC6 — Rapid expand/collapse

**Setup:** User rapidly clicks expand/collapse on a group with 10 child areas.

**Behavior:** Each area's row table mounts/unmounts. Breadcrumbs recalculate. Codes remain stable.

**Risk:** Performance lag if row tables are heavy.  
**Mitigation:** Row tables are already rendered conditionally (`!collapsed`). React handles this efficiently. No change needed.

---

### EC7 — Tree reorder changes codes

**Setup:** User drags `Kitchen` from position 3 to position 1 under `Ground Floor`.

**Behavior:**
- Frontend auto-generates new codes immediately.
- `Kitchen` changes from `01.01.01.03` to `01.01.01.01`.
- `Foyer` changes from `01.01.01.01` to `01.01.01.02`.

**Risk:** Codes are unstable. If the estimator has referenced `01.01.01.03` in an email, it now points to the wrong node.  
**Mitigation:** This is why **user-defined DB-backed codes** are the long-term solution. Auto-generated codes are a convenience, not a contract. Until DB codes exist, we should consider:
- Not regenerating codes on reorder (keep original positions)
- Or showing a warning that codes are position-based

**Decision for now:** Auto-generate from current position. Accept that codes change on reorder. Document this limitation.

---

### EC8 — Narrow center column

**Setup:** User drags the tree panel to max width (432px) and the library panel to max width (560px). The center column becomes very narrow.

**Behavior:**
- Header bar has minimal width.
- Code + name + total must all fit.
- Name truncates aggressively.

**Risk:** Total is pushed off-screen or header wraps.  
**Mitigation:**
1. Total has `shrink-0` and stays visible.
2. Code hides at very narrow widths (`hidden` below a breakpoint or container query).
3. Name truncates.
4. If even total doesn't fit, the header could switch to a single-line overflow with horizontal scroll — but this is ugly. Better to enforce a minimum center-column width.

---

### EC9 — Area with 100+ rows

**Setup:** `General Requirements` area with 100+ line items (permits, fees, insurance, etc.).

**Behavior:**
- Row table is very tall.
- Breadcrumb is visible only at the top.
- User scrolls far down.

**Risk:** User loses context.  
**Mitigation:** Future feature: sticky area header + breadcrumb that pins while scrolling through rows. Not in current scope.

---

### EC10 — Special characters in node names

**Setup:** `Men's Room / Jack & Jill Bath` (contains quotes, ampersand, slash).

**Behavior:** Name renders in text node. No HTML injection risk (React escapes by default). Breadcrumb renders correctly.

**Risk:** Breadcrumb separator `›` might visually collide with a `>` in the name.  
**Mitigation:** Breadcrumb separator has spacing (`mx-0.5`). Names are plain text, not HTML. No collision.

---

## 3. Failure modes (the 5% cases that break things)

### FM1 — Code collision

**Setup:** Two sibling nodes have the same user-defined code (if DB codes are implemented without uniqueness constraints).

**Behavior:** Duplicate codes displayed. User confusion.

**Mitigation:** DB should enforce `unique(estimate_id, code)` or at least warn on duplicates. For auto-generated codes, collisions are impossible by construction.

---

### FM2 — Circular tree reference

**Setup:** Bug in tree data causes a cycle (A is child of B, B is child of A).

**Behavior:** `EstimateSheetBranch` recurses infinitely. Stack overflow.

**Mitigation:**
- Backend already prevents this via `parent_id <> id` constraint.
- Frontend could add a `maxDepth` guard (e.g., stop recursing at depth 20).
- Breadcrumb computation would also infinite-loop.

**Decision:** Add a `maxDepth = 20` guard in `EstimateSheetBranch` and a cycle-detection check in breadcrumb computation. Log an error if triggered.

---

### FM3 — Deleted node still referenced in URL

**Setup:** User has `nodeId=foyer` in the URL. Another user deletes `Foyer`.

**Behavior:** Page loads. `findEstimateNode` returns undefined. Fallback to first node.

**Risk:** User is confused why they're looking at a different node.  
**Mitigation:** Already handled by `resolveEstimateWorkspaceSelection`. Could add a subtle toast: "Foyer has been removed. Showing Lot A instead."

---

### FM4 — Breadcrumb path contains deleted ancestor

**Setup:** `Foyer` path is `[Lot A, Main House, Ground Floor]`. `Ground Floor` is deleted but `Foyer` is reparented to `Main House` directly.

**Behavior:** Breadcrumb recalculates from live tree. Shows correct new path.

**Risk:** If breadcrumb is cached, it shows stale data.  
**Mitigation:** Breadcrumb is computed at render time from the live tree. No caching. Safe.

---

## 4. Decision log for edge cases

| Edge case | Decision | Rationale |
|-----------|----------|-----------|
| Deep nesting (depth 6+) | Show full code for now; monitor truncation | Codes are reference identifiers; shortening them defeats the purpose. |
| Code instability on reorder | Accept for auto-generated codes | User-defined DB codes will solve this later. |
| Narrow center column | Hide code first, then truncate name, keep total | Total is the most critical number. |
| Area with 100+ rows | No sticky header yet | Future Phase B feature. Current breadcrumb is sufficient for MVP. |
| Circular reference | Add `maxDepth = 20` guard | Defensive programming against impossible-but-theoretic data bugs. |
| Special characters in names | React text nodes + spaced separators | Safe by default. No extra work needed. |

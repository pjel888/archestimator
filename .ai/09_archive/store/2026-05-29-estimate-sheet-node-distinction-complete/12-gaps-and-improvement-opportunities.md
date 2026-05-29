# 12 — Gaps & Improvement Opportunities

**Date:** 2026-05-21  
**Method:** Synthesis of user-journey analysis (09), north-star vision (10), and edge-case mapping (11) against the current plan  
**Goal:** Identify what the current plan misses, what should be added, and what should be deferred.

---

## 1. Gaps in the current plan

### Gap 1 — Roll-up total vs direct total is visually identical

**Problem:** A group header shows `₱1.2M` (roll-up of all descendants). An area header shows `₱245K` (direct sum of rows). Both use the same `text-[10px] font-normal tabular-nums text-ink` styling. The user cannot tell at a glance whether a total is "inherited" or "owned."

**Impact:** Medium. Can cause confusion during review when the user thinks a group total is inflated or an area total is too low.

**Recommendation:** Add a subtle visual cue to group totals:
- Option A: Small sigma icon `Σ` before group totals.
- Option B: Group totals use `font-semibold` while area totals use `font-normal`.
- Option C: Group totals have a `text-tertiary` label "(roll-up)" in 8px.

**Decision:** **Add Option B to Phase 1.** Group totals are `font-semibold`; area totals remain `font-normal`. This is a 1-class change with high clarity value.

---

### Gap 2 — No row numbers within areas

**Problem:** The row table has no sequential numbering. When a client says "what about the third item?" the estimator must count manually or reference by material name.

**Impact:** High for client communication. Medium for daily use.

**Recommendation:** Add a `#` column or inline row number before the material name. Numbering resets per area (so every area starts at `#01`).

**Decision:** **Add to Phase A.** A narrow `text-[9px] font-mono text-tertiary` column (24px wide) before the drag handle. Minimal space, high communication value.

---

### Gap 3 — Empty area is too subtle

**Problem:** An area with no rows shows a dashed drop zone. The drop zone is small, gray, and easy to miss when scanning. The user might think the area is "done" when it's actually empty.

**Impact:** Medium. Leads to missing rooms during estimating.

**Recommendation:** Add a visual "empty state" indicator:
- A small `text-[9px] text-tertiary` label next to the area name: `(0 items)`.
- Or a subtle orange dot/badge on the area header when `estimateRowItems.length === 0`.
- Or change the area header background slightly for empty areas (e.g., `bg-surfaceMuted/30` instead of `bg-white`).

**Decision:** **Add `(0 items)` count to area headers in Phase 1.** It uses existing space and requires no new layout. Format: `Foyer (0 items)` or `Foyer · 0 items` in `text-[9px] text-tertiary`.

---

### Gap 4 — Group headers don't show child count

**Problem:** A group like `Ground Floor` might contain 3 areas or 30 areas. The header shows only the total, not the count of children.

**Impact:** Low for daily use. Medium for project health checks.

**Recommendation:** Add a child count to group headers: `Ground Floor · 3 areas` or `Ground Floor · 12 items`.

**Decision:** **Defer to Phase B.** Nice-to-have, not critical for MVP.

---

### Gap 5 — No global "unsaved changes" indicator

**Problem:** Row save states are per-row pills. A user with 50 rows might have 3 unsaved. They must scan every row to find the dirty ones.

**Impact:** Medium. Risk of losing work if user navigates away.

**Recommendation:** Add a global status in the sheet header or the `ProjectTotalHeader`:
- "3 unsaved rows" in warning color.
- Or a dirty indicator on the estimate tab/shell.

**Decision:** **Defer to Phase C.** Out of scope for visual distinction work.

---

### Gap 6 — The sheet header has dead controls

**Problem:** `EstimateSheetHeader` has `SearchInput` ("Search Sheet"), `Filter`, and `View` buttons that are **visual only, not wired.** This creates false expectations.

**Impact:** Low. Users will try them, find they don't work, and be mildly annoyed.

**Recommendation:** Either:
- A) Wire them minimally (e.g., search filters row material names).
- B) Hide them until functional.
- C) Add `disabled` state with tooltip explaining "Coming soon."

**Decision:** **Option C — add `disabled` with tooltip in Phase 1.** This is a 5-minute change that prevents user confusion. Better than leaving live-looking dead controls.

---

### Gap 7 — No cost-per-unit-area metric

**Problem:** An area like `Foyer` has a total of `₱245K`. But how big is the foyer? If it's 20 sqm, that's `₱12,250/sqm` — a useful sanity-check metric. Currently not calculated or displayed.

**Impact:** Medium for accuracy. Estimators use $/sqm constantly.

**Recommendation:** Add an optional "area size" field to area nodes. Display cost-per-unit in the header or table footer.

**Decision:** **Defer to Phase C.** Requires new data fields and business logic.

---

### Gap 8 — Breadcrumb is not sticky

**Problem:** When an area has 25+ rows, the user scrolls down and the breadcrumb scrolls out of view. They lose context.

**Impact:** Medium. Mitigated by the fact that the area header is still visible if the table is short. But for 50+ rows, it's a real problem.

**Recommendation:** Make the area header + breadcrumb sticky while scrolling through the area's rows.

**Decision:** **Defer to Phase B.** Requires careful z-index management with the table's sticky header. Complex for MVP.

---

### Gap 9 — No visual indicator for "area is complete"

**Problem:** How does the estimator know when an area is "done"? Currently there's no state for "I've priced everything in this room."

**Impact:** Low-Medium. Helps project tracking.

**Recommendation:** Future feature: a "checked" or "reviewed" state per area, shown as a small icon on the header.

**Decision:** **Defer to Phase D.** Requires new data model and UI state management.

---

### Gap 10 — Kind badge might be redundant with codes

**Problem:** We planned a "GROUP"/"AREA" badge. But codes already communicate structure (e.g., `01.01` is clearly a group because it has children; `01.01.01` is clearly an area because it has a row table). The badge adds visual noise.

**Impact:** Low. Badge is optional.

**Recommendation:** **Remove the static kind badge from the default plan.** Keep it as a hover-only fallback or remove it entirely. The background distinction + code + icon is sufficient.

**Decision:** **Drop static badge. Keep hover-only if user testing requests it.** This reduces density and eliminates a potential clutter source.

---

## 2. Improvement opportunities (beyond gaps)

### IO1 — Header bar micro-interactions

**Current:** Headers have a simple hover background shift.
**Opportunity:** Add subtle micro-interactions:
- Hover on group header: background darkens + left border intensifies.
- Hover on area header: background tints + bottom border darkens.
- Active/pressed state on collapse button: `scale-95` transform.

**Decision:** **Add to Phase 1.** These are CSS-only and improve perceived quality.

---

### IO2 — Code hover tooltip

**Current:** Code is a static prefix.
**Opportunity:** Hovering the code shows a tooltip: "Auto-generated code. Click to set custom code." (Future feature teaser.)

**Decision:** **Add tooltip in Phase 2.** Uses existing tooltip primitive or `title` attribute.

---

### IO3 — Breadcrumb as mini-nav

**Current:** Breadcrumb is read-only text.
**Opportunity:** Each breadcrumb segment could be a subtle link that selects that ancestor in the tree.

**Decision:** **Defer to Phase B.** Adds interaction complexity. Read-only is safer for MVP.

---

### IO4 — Group header click to select in tree

**Current:** Clicking a group header in the sheet does nothing (only collapse/expand works).
**Opportunity:** Clicking the group name navigates to that node in the tree (same as tree click).

**Decision:** **Defer.** Collapse/expand is the primary interaction. Adding navigation to the name risks accidental clicks.

---

### IO5 — Area header color-coding by discipline

**Current:** All area headers are white.
**Opportunity:** If an area contains only Architectural items, tint the header slightly blue. If only Electrical, tint slightly yellow. Mixed = white.

**Decision:** **Reject.** Violates monochrome-first principle. Adds complexity without clear value.

---

## 3. Revised Phase A scope

Based on the gap analysis, here is the updated recommended implementation order:

### Phase A.1 — Core distinction (must have)
- Group: `bg-surfaceMuted` + full border + `border-l-2 border-l-divider` + `font-semibold`
- Area: `bg-white` + `border-b` + `font-normal text-secondary`
- Group total: `font-semibold` (roll-up cue)
- Area total: `font-normal` (direct sum cue)

### Phase A.2 — Node codes (must have)
- Auto-generated hierarchical codes
- `text-[9px] font-mono tabular-nums text-tertiary mr-1.5`

### Phase A.3 — Area breadcrumbs (must have)
- Subtle ancestor path below area headers
- `text-[9px] text-tertiary`

### Phase A.4 — Row numbers (should have)
- `#01`, `#02` per area
- Narrow column before drag handle

### Phase A.5 — Empty area indicator (should have)
- `(0 items)` label on area headers with zero rows

### Phase A.6 — Dead control cleanup (should have)
- Disable `Search Sheet`, `Filter`, `View` buttons with "Coming soon" tooltip

### Phase A.7 — Micro-interactions (nice to have)
- Enhanced hover states on headers
- Active states on collapse buttons

---

## 4. What stays deferred

| Feature | Deferred to | Why |
|---------|-------------|-----|
| User-defined DB codes | Phase B | Requires migration + CRUD UI |
| Group child count | Phase B | Nice-to-have |
| Global unsaved indicator | Phase C | Complex state aggregation |
| Sticky area headers | Phase B | Z-index complexity |
| Area "complete" state | Phase D | New data model |
| Cost-per-sqm | Phase C | New data fields |
| Breadcrumb as navigation | Phase B | Interaction complexity |
| Presentation mode | Phase C | Major feature |
| Export (PDF/Excel) | Phase C-D | Major feature |
| Keyboard shortcuts | Phase B | Needs holistic design |
| Copy/paste rows | Phase B | Complex DnD + state management |
| Discipline subtotals | Phase B | Calculation + UI complexity |
| Cost health / outlier detection | Phase C | Algorithmic complexity |

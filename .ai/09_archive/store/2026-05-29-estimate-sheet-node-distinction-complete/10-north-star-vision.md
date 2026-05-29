# 10 — North Star Vision for the Estimate Sheet

**Date:** 2026-05-21  
**Horizon:** 6–12 months  
**Goal:** Define the ideal end-state for the estimate workspace so that every near-term decision aligns toward it, not away from it.

---

## 1. Core thesis

> The estimate sheet is not a spreadsheet. It is a **structured cost breakdown** that happens to look like a sheet.

Unlike Excel, where every row is equal, Archestimator has a semantic hierarchy:
- **Groups** = organizational containers (locations, phases, trades)
- **Areas** = work surfaces that own line items
- **Rows** = material/labor/equipment components

The UI must make this hierarchy **instantly readable** at every level of zoom and every depth of nesting.

---

## 2. The ideal estimate sheet (12-month vision)

### 2.1 Visual hierarchy

```
┌──────────────────────────────────────────────────────────────────────┐
│ 01   LOT A                                    ₱5,200,000.00          │ ← Group: dark muted band, bold,
└──────────────────────────────────────────────────────────────────────┘   full border, code + name + total

  ┌────────────────────────────────────────────────────────────────────┐
  │ 01.01   MAIN HOUSE                            ₱3,100,000.00        │ ← Group: medium muted band,
  └────────────────────────────────────────────────────────────────────┘   bold, indented

    ┌──────────────────────────────────────────────────────────────────┐
    │ 01.01.01   GROUND FLOOR                       ₱1,850,000.00      │ ← Group: light muted band,
    └──────────────────────────────────────────────────────────────────┘   semibold, indented

      ┌────────────────────────────────────────────────────────────────┐
      │ 01.01.01.01   FOYER                           ₱245,000.00      │ ← Area: white header,
      └────────────────────────────────────────────────────────────────┘   bottom divider only
        Lot A › Main House › Ground Floor                            ← Breadcrumb (gray, 9px)
        ┌────────────────────────────────────────────────────────────┐
        │ #  │ Materials              │ Qty │ Unit │ Subtotal │ ... │ ← Row table
        │────┼────────────────────────┼─────┼──────┼──────────┼─────│
        │ 01 │ Ceramic Floor Tile     │ 22  │ sqm  │ ₱45,200  │ ... │
        │ 02 │ Wall Paint — Boysen    │ 45  │ sqm  │ ₱18,000  │ ... │
        │ 03 │ [empty drop zone]      │     │      │          │     │
        └────────────────────────────────────────────────────────────┘
```

**Key differences from today:**
- **Progressive background darkening by depth:** Root groups are darker; deeper groups are lighter. This creates a "stacked folder" effect.
- **Row numbers:** Every row has a sequential number within its area (`#01`, `#02`).
- **Area totals are visually distinct from group totals:** Group totals use a subtle "roll-up" indicator (e.g., a small sigma icon or different weight). Area totals are direct sums.
- **Empty areas show a prominent "Add items" call-to-action** instead of a subtle dashed zone.

### 2.2 Interaction model

| Action | Current | North Star |
|--------|---------|------------|
| Navigate tree | Click tree node | Click tree node **or** use `Cmd+↑/↓` to move between siblings |
| Add component | Drag from library or click | Drag, click, **or** type `/` for command palette insert |
| Edit quantity | Click cell, type | Click cell, type, **or** use inline calculator (`22*1.1` evaluates to `24.2`) |
| Copy row | Not possible | `Cmd+C` / `Cmd+V` on selected row |
| Move row to another area | Not possible | Drag row to tree node or use "Move to" command |
| Filter rows | Visual only | Live filter by material name, supplier, discipline |
| Sort rows | Not possible | Sort by cost, discipline, or custom order |
| Collapse all | Tree tool only | `Cmd+Shift+9` or sheet header button |
| See discipline subtotal | Manual sum | Auto-calculated subtotal row per discipline |
| See cost health | Not possible | Yellow/red tint on rows that exceed typical % of area budget |

### 2.3 Presentation mode

When the estimator clicks "Present" (or presses `Cmd+.`), the sheet transforms:
- Font sizes increase to 14–16px
- Row heights increase for readability
- Edit controls become read-only
- Totals are emphasized
- A sidebar shows key summary stats (total, per-sqft cost, budget comparison)

This mode is for **client meetings**, not editing.

### 2.4 Export and sharing

- **PDF:** Formatted document with cover page, tree structure, row tables, and totals.
- **Excel:** Flat export with grouping preserved (Excel outline groups).
- **Share link:** Client can view the estimate in read-only presentation mode without logging in.

---

## 3. Guiding principles for near-term decisions

### Principle 1: Structure before decoration

Every visual element must communicate structure (hierarchy, ownership, state). Decorative elements (gradients, shadows, animations) are forbidden unless they serve structural communication.

**Implication for our plan:** The background distinction, codes, and breadcrumbs are structural. The kind badge is decorative and should be the first thing cut if density becomes an issue.

### Principle 2: The row table is sacred

The row table is where the actual work happens. Nothing in the header or breadcrumb should compete with it for attention. Headers should recede; rows should advance.

**Implication for our plan:** Area headers use `bg-white` and minimal borders specifically so they "disappear" into the table.

### Principle 3: Codes are the universal language

Every node and every row must have a stable, referenceable code. Codes are how estimators talk to clients, suppliers, and subcontractors. They are not optional metadata; they are primary identifiers.

**Implication for our plan:** Auto-generated codes are the MVP. User-defined codes are the standard. Both must be visible at all times.

### Principle 4: Keyboard parity

Every mouse action must have a keyboard equivalent. Estimators who price 50+ areas per project cannot afford to reach for the mouse constantly.

**Implication for our plan:** Not in immediate scope, but the visual layout must not block future keyboard navigation (e.g., header tabs must be focusable, breadcrumbs must not trap focus).

### Principle 5: Progressive disclosure

Show the user what they need for the task at hand, and no more. A collapsed group shows only its name, code, and total. An expanded area shows rows. A selected row shows all editable fields.

**Implication for our plan:** Collapse/expand is the primary progressive disclosure mechanism. Our distinction system must work in both collapsed and expanded states.

---

## 4. What we are NOT building (anti-vision)

To prevent scope creep, here is what the north star explicitly does NOT include:

- **3D BIM integration** — out of product scope.
- **Real-time collaboration cursors** — nice, but not before single-user UX is excellent.
- **AI-generated estimates** — too early; the product must earn trust with manual estimates first.
- **Supplier API integrations** — future phase; manual pricing entry is the baseline.
- **Mobile editing** — tablet view-only is acceptable; phone editing is not.

---

## 5. Path from current state to north star

### Phase A (now — 0–2 months)
- ✅ Group/area visual distinction
- ✅ Node codes (auto-generated)
- ✅ Area breadcrumbs
- ✅ Kind badge (optional)
- 🆕 Row numbers within area tables
- 🆕 Empty area call-to-action (stronger than dashed zone)

### Phase B (2–4 months)
- 🆕 User-defined node codes (DB-backed)
- 🆕 Keyboard navigation (arrow keys between areas, shortcuts)
- 🆕 Inline calculator for quantity inputs
- 🆕 Copy/paste rows within and across areas
- 🆕 Discipline subtotal rows (auto-calculated)

### Phase C (4–8 months)
- 🆕 Presentation mode
- 🆕 Cost health indicators (outlier detection)
- 🆕 Row filtering and sorting
- 🆕 Global "unsaved changes" indicator
- 🆕 PDF export

### Phase D (8–12 months)
- 🆕 Excel export with grouping
- 🆕 Share links for clients
- 🆕 Scenario comparison ("what-if" versions)
- 🆕 Template/assemblies for repeated room types

---

## 6. How our current plan fits

Our current plan (distinction + codes + breadcrumbs) is **Phase A, items 1–3**. It is the foundation. Without it:
- Phase B keyboard navigation is impossible (users can't tell where they are).
- Phase C presentation mode is confusing (clients can't read the hierarchy).
- Phase D templates are fragile (no stable code reference).

**This plan is load-bearing.** It must be solid before anything else is built on top of it.

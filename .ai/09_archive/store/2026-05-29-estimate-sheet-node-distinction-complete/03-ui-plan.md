# 03 — UI Plan: Visual Design for Group vs Area Distinction

**Date:** 2026-05-21  
**Design system:** Archestimator compact app UI (Tailwind CSS v4, no `tailwind.config.js`)  
**Scope:** `EstimateSheetBranch` header bar and immediate child wrapper in `EstimateSheetContent.tsx`

---

## 1. Design principle

> **Groups look like folders. Areas look like sheet surfaces.**

The group header is a contained card (muted background, full border) that holds other things. The area header is a sheet divider (white background, bottom border only) that sits above its row table as part of the same surface.

All changes stay within the existing token palette. No new colors. No font-size increases. No shadows or glows.

---

## 2. Header bar specification

### 2.1 Group Node Header

```tsx
// EstimateSheetBranch — group node path
<div
  className={cn(
    "flex h-8 items-center gap-2 border border-hairline bg-surfaceMuted px-1",
    "border-l-2 border-l-divider",                    // organizational left accent
    "transition hover:bg-[#EAEEF3]"                   // subtle darken on hover
  )}
  style={{ paddingLeft: `${leftIndent + 8}px` }}
>
```

| Property | Value | Rationale |
|----------|-------|-----------|
| Height | `h-8` (32px) | Unchanged. Compact density preserved. |
| Background | `bg-surfaceMuted` (`#F4F7FA`) | Container/folder semantics. |
| Border | `border border-hairline` + `border-l-2 border-l-divider` | Full box border with a slightly stronger left edge to mark organizational depth. |
| Hover | `hover:bg-[#EAEEF3]` | 3% darker than surface muted; subtle but detectable. |
| Icon | `FolderSimple size={13} weight="bold" className="text-tertiary"` | Unchanged. |
| Code | `text-[9px] font-mono tabular-nums text-tertiary mr-1.5` | Inline prefix before name. Monospace for alignment; slightly smaller and subdued so it reads as metadata, not primary content. |
| Name | `text-[10px] font-semibold text-ink` | Semibold marks structural importance. |
| Total | `text-[10px] font-semibold tabular-nums text-ink` | **Semibold** marks this as a roll-up sum (different from area direct sums). |

**Visual result:** A contained, card-like bar that reads as "folder/section."

---

### 2.2 Area Node Header

```tsx
// EstimateSheetBranch — area node path
<div
  className={cn(
    "flex h-8 items-center gap-2 border-b border-hairline bg-white px-1",
    "transition hover:bg-surfaceMuted/60"             // subtle tint on hover
  )}
  style={{ paddingLeft: `${leftIndent + 8}px` }}
>
```

| Property | Value | Rationale |
|----------|-------|-----------|
| Height | `h-8` (32px) | Unchanged. |
| Background | `bg-white` | Blends into the row table below, creating one continuous "workspace." |
| Border | `border-b border-hairline` | Divider only. No top/side borders. |
| Hover | `hover:bg-surfaceMuted/60` | Very subtle gray tint; does not compete with material-cell hover states. |
| Icon | `Cube size={13} weight="bold" className="text-tertiary"` | Unchanged. |
| Code | `text-[9px] font-mono tabular-nums text-tertiary mr-1.5` | Same treatment as group codes. Consistent metadata language across both kinds. |
| Name | `text-[10px] font-normal text-secondary` | Normal weight, slightly subdued color. Content, not structure. |
| Total | `text-[10px] font-semibold tabular-nums text-ink` | **Semibold** marks this as a roll-up sum (different from area direct sums). |

**Visual result:** A clean divider that reads as "sheet section heading" above its data table.

---

### 2.3 Side-by-side comparison (simulated)

```
┌─────────────────────────────────────────────┐  ← Group: full border, muted bg,
│ ▼ 📁 01   Main House               ₱1.2M    │     left divider accent,
└─────────────────────────────────────────────┘     semibold name + code prefix

┌─────────────────────────────────────────────┐  ← Area: bottom border only,
│ ▼ ⬚ 01.01.01   Foyer               ₱245K    │     white bg, normal weight name
└─────────────────────────────────────────────┘
  Lot A › Main House › Ground Floor           ←  Breadcrumb (area-only, gray)
  ┌───────────────────────────────────────────┐
  │ [material cell] [qty] [subtotal] …        │  ← Row table (white bg, blends
  │ [material cell] [qty] [subtotal] …        │     seamlessly with area header)
  └───────────────────────────────────────────┘
```

---

## 3. Kind badge (micro-label)

**Decision:** **Removed from default plan.** The background distinction + code + icon provides sufficient kind identification. A badge adds visual noise without proportional value.

### Hover badge (fallback, if user testing requests it)

If Philip or testing reveals users still confuse group and area:
```tsx
<span className="opacity-0 transition-opacity group-hover:opacity-100 shrink-0 rounded-sm border border-hairline bg-white px-1 py-0 text-[8px] font-bold uppercase tracking-[0.08em] text-tertiary">
  {node.kind === "group" ? "Group" : "Area"}
</span>
```

This appears only on hover, preserving density while providing explicit confirmation when needed.

---

## 4. Area node breadcrumb

**Placement:** Between the area header bar and the `EstimateRowItemsTable` (or empty drop zone).

**Specification:**
```tsx
{node.kind === "area" && path.length > 0 && (
  <div
    className="truncate text-[9px] text-tertiary"
    style={{ paddingLeft: `${leftIndent + 8}px` }}
  >
    {path.map((ancestor, index) => (
      <span key={ancestor.id}>
        {index > 0 && (
          <span className="mx-0.5 text-hairline">›</span>
        )}
        <span>{ancestor.name}</span>
      </span>
    ))}
  </div>
)}
```

| Property | Value | Rationale |
|----------|-------|-----------|
| Font size | `text-[9px]` | Below the 10px body threshold; reads as metadata, not content. |
| Color | `text-tertiary` | Subdued; must not compete with row table headers or material names. |
| Separator | `›` (single chevron) in `text-hairline` | Minimal visual weight; common breadcrumb pattern. |
| Indent | Same as header (`leftIndent + 8px`) | Aligns with the area header text column. |
| Truncate | `truncate` on container | Long paths (e.g., `Lot A › Main House › Ground Floor › Wing A › Master Bedroom`) must not wrap. |
| Padding | `py-0.5` (2px vertical) | Tight; breadcrumb is a context whisper, not a section break. |

**Group nodes:** No breadcrumb. Their context is visually implicit from the nested headers above them.

**Empty areas:** Breadcrumb still appears above the empty drop zone so the estimator knows where they are.

---

## 5. Hierarchy connector (optional Phase 3)

If vertical guides are added later, use this pattern:

```tsx
// Inside EstimateSheetBranch, on the child-content wrapper
<div className={cn(
  "space-y-4",
  depth > 0 && "relative ml-3 border-l border-hairline pl-0"
)}>
```

- `ml-3` (12px) aligns the connector roughly with the parent icon column.
- `border-l border-hairline` provides the guide line.
- This is **not required** for the group/area distinction and is listed here only as a future-compatible spacing note.

---

## 5. Row numbers within areas

**Placement:** A narrow column before the drag handle in `EstimateRowItemsTable`.

**Specification:**
```tsx
// In the table grid column template
const rowColumns = "grid-cols-[24px_32px_minmax(134px,1fr)_104px_58px_92px_92px_92px_108px_30px]";

// In each row
<td className="flex items-center justify-center border-r border-hairline text-[9px] font-mono tabular-nums text-tertiary">
  {String(rowIndex + 1).padStart(2, "0")}
</td>
```

| Property | Value | Rationale |
|----------|-------|-----------|
| Width | `24px` | Just enough for two digits. |
| Font | `text-[9px] font-mono tabular-nums text-tertiary` | Subdued metadata; aligns with code styling. |
| Format | `#01`, `#02`... | Hash prefix makes it clear this is a row reference, not a code. |
| Reset | Per area | Every area starts at `#01`. |

**Empty rows / add row zone:** The drop-zone row shows no number.

---

## 6. Empty area indicator

**Problem:** An area with zero rows is visually identical to an area with rows, except for the drop zone below. When scanning, the user might miss empty areas.

**Solution:** Add a `(0 items)` label to the area header when `estimateRowItems.length === 0`.

```tsx
{node.kind === "area" && estimateRowItems.length === 0 && (
  <span className="ml-1.5 text-[9px] text-tertiary">(0 items)</span>
)}
```

- Placement: immediately after the area name.
- Color: `text-tertiary` — visible but not competing.
- Disappears when rows are added.

---

## 7. Empty area message styling

`EmptyAreaMessage` currently uses `marginLeft` to align with child indentation. With area headers now white, the empty message should visually belong to the area:

```tsx
// EmptyAreaMessage wrapper
<div
  style={{ marginLeft: `${Math.min(depth * 32, 192)}px` }}
  className="border-b border-dashed border-divider bg-white"
>
  <EstimateDropZone label="Drag and drop estimate component here" />
</div>
```

- Remove the outer `bg-surfaceWarm/80` from the drop zone when inside an empty area; keep it white to match the area surface.
- The drop zone itself can remain dashed and subdued (`border-dashed border-divider`).

---

## 6. Row table adjacency

The `EstimateRowItemsTable` renders with:
- Outer wrapper: `overflow-hidden border border-hairline bg-white`
- Header: `sticky top-0 z-10 bg-white`

With the area header now also `bg-white` and `border-b`, the table wrapper's top border sits flush against the header bottom border, creating a **1px double border** (header bottom + table top). To fix:

**Option A (recommended):** Remove the top border from the table wrapper when it is the first child after an area header.

```tsx
// In EstimateSheetBranch, pass a prop or use CSS sibling selector
<EstimateRowItemsTable
  …
  className="border-t-0"   // new prop to suppress top border
/>
```

Or simpler: change the area header to use a subtle shadow or no bottom border, and let the table supply the border. But shadows are discouraged.

**Option B:** Keep both borders; the double line is barely visible at 1px + 1px and may read as a stronger section break. Test in browser.

**Decision:** Try Option B first (no code change). If the double border feels heavy, apply `border-t-0` to the table wrapper.

---

## 7. Token usage summary

| Token / Class | Group Header | Area Header | Notes |
|---------------|--------------|-------------|-------|
| `bg-surfaceMuted` | ✅ | ❌ | Group = container. |
| `bg-white` | ❌ | ✅ | Area = sheet surface. |
| `border` | ✅ | ❌ | Full box border for groups. |
| `border-b` | ❌ | ✅ | Divider only for areas. |
| `border-l-2 border-l-divider` | ✅ | ❌ | Organizational left accent. |
| `font-semibold` | ✅ | ❌ | Structural weight. |
| `font-normal` | ❌ | ✅ | Content weight. |
| `text-ink` | ✅ (name) | ❌ | Strongest text for landmarks. |
| `text-secondary` | ❌ | ✅ (name) | Slightly subdued for content. |
| `hover:bg-[#EAEEF3]` | ✅ | ❌ | Custom hex stays within muted family. |
| `hover:bg-surfaceMuted/60` | ❌ | ✅ | Token-based hover. |

**No new CSS variables needed.** All classes are either existing Tailwind tokens or one-off hex values within the established muted-gray family.

---

## 8. Responsive / density behavior

- The sheet is desktop-only (workshop route). No mobile breakpoint concerns.
- At very narrow center-column widths (caused by wide tree or wide library panels), the name truncates (`truncate`). The badge, if static, should also shrink or hide via `truncate`.
- No font-size changes at any width.

---

## 9. Dark mode note

Dark mode is **not implemented** in the product. If it is introduced later:
- Group header: `bg-neutral-800`, `border-neutral-700`, `border-l-neutral-600`.
- Area header: `bg-neutral-900`, `border-b-neutral-700`.
- These are forward-compatible notes only; no code changes now.

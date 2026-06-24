# 05 — UX/UI/Accessibility Audit

## 5.1 Visual Consistency

### 5.1.1 Information hierarchy

- Header (TreePanelHeader): search + filter + Add button + tabs
- Body: tree rows with depth indent
- Footer: BulkActionToolbar (only when bulk selection active)

### 5.1.2 Row density

- Row min-height: `min-h-7` (28px) (tree.tsx:430)
- Font size: `text-[10px]` (tree.tsx:430)
- Tight density, matches design system rule (max 12px in app)

### 5.1.3 Branch indentation

- `TREE_INDENT_STEP = 16` px (tree.tsx:59)
- Applied to content only, NOT to left rail (tree.tsx:450-493)
- Rails align across depths; content indents. **GOOD**.

### 5.1.4 Depth legibility

- 16px per level → depth 10 = 160px indent
- Sidebar max 432px - 104px extension = 328px available
- At depth 10: 168px for label, truncates
- **GAP**: Deep trees hard to read

### 5.1.5 Expand/collapse affordance

- Caret button 14×14px (`w-3.5 h-3.5`) with CaretDown/CaretRight (tree.tsx:514-522)
- Only rendered when `expandable && isFolder` (tree.tsx:506)
- Leaf rows: 16px empty span for alignment (tree.tsx:525)

### 5.1.6 State clarity

| State | Indicator |
|---|---|
| Selected (bulk) | `bg-accentSoft` row background |
| Current (page) | `border-l-focus` left border |
| Focused | `border-l-focus` (same as current) |
| Hover | `bg-surfaceMuted` row background |
| Drop target "inside" | `bg-surfaceMuted` (same as hover!) |
| Drop target "before" | `border-t-2 border-t-primary` |
| Drop target "after" | `border-b-2 border-b-primary` |
| Drag source | `aria-grabbed={true}` (no visual) |
| Occupied | Olive green occupancy dot |
| Indeterminate bulk | Checkbox `indeterminate` |

**ISSUE**: Hover and drop-inside use same `bg-surfaceMuted` → indistinguishable.

### 5.1.7 Icon consistency

- All icons Phosphor at `TREE_ROW_ICON_SIZE = 12` (tree.tsx:66)
- Add: `<Log>` (entry L88-90); Caret: `<CaretDown>`/`<CaretRight>`; Drag: `<DotsSixVertical>`; Rename/Delete actions consistent

### 5.1.8 Hit-target sizes

- Row: 28px tall, ≥216px wide — OK
- Caret: 14×14px — **BELOW 24×24 WCAG 2.5.5 minimum** (F-HITBOX)
- Drag handle: 14×14px hit area, only visible on hover
- Filter button: 24×24px OK

## 5.2 Edit-mode Visual Consistency

### 5.2.1 Display vs Edit

| Property | Display | Edit | Verdict |
|---|---|---|---|
| Row outer height | `min-h-7` (28px) | preserved | OK |
| Input height | n/a | `h-5` (20px) | MISMATCH — 8px shorter |
| Vertical alignment | `items-center` | `items-center` | OK |
| Border | `border border-transparent` | `border-accent` + custom shadow | Intentional |
| Action icons | none | Check (✓) + Reset (✗) buttons (`size-5` = 20px) | Add 40px+gap |
| Error popover | none | Absolute-positioned, max-w-180px | OK |

### 5.2.2 Visual "jump" on edit

- Row outer height preserved, but input + buttons are 8px shorter → icons vertically off-center. **F-09**.

### 5.2.3 Text baseline shift

- Display: inherits text-[10px] and default leading
- Edit: explicit `leading-5` (20px)
- **MISMATCH**: Text moves vertically on edit transition

## 5.3 Interaction Quality

### 5.3.1 Click latency

- Selection: ZERO (pure client state)
- Expand/collapse: ZERO
- Drag start: ZERO (native DnD)
- Rename begin: <16ms (one render cycle)

### 5.3.2 Type responsiveness during rename

- `setEditingNodeName` per keystroke → reducer dispatch → re-render of input only (not full tree)

### 5.3.3 Click-firing-after-drop prevention

- `suppressPrimaryActionUntilRef` blocks 500ms after drag. **GOOD**.

### 5.3.4 Optimistic feedback timing

- Synchronous before server call. **GOOD**.

## 5.4 Loading Scope

### 5.4.1 Sidebar-wide blocking

- `isTreeMutationSaving` true for ANY mutation
- Blocks: drag, rename, delete
- **F-15**: Should be per-row

### 5.4.2 Toast loading

- Single toast id `estimate-tree-mutation` (L505)
- Tone changes by state

### 5.4.3 Tree disappearance

- NEVER during mutation, NEVER during refetch. **GOOD**.

## 5.5 Focus Management

### 5.5.1 Focus indicators

- Row focused: `border-l-focus` left border (tree.tsx:434)
- Input focus: custom shadow + `focus:bg-accentSoft`
- Checkbox: SelectionCheckbox's ring
- Caret button: NO focus ring. **GAP**.

### 5.5.2 Focus restoration

| Action | Behavior |
|---|---|
| Create | Input focused |
| Rename (begin) | Input focused via menu-close dance |
| Rename (commit) | Lost to body. **GAP** |
| Delete | Lost to body. **GAP** |
| Cancel rename | Lost to body. **GAP** |
| Modal close | Radix restores focus to trigger |

### 5.5.3 Modal focus trap

- Radix Dialog-based Modal
- Focus trap inside modal
- Escape closes

## 5.6 Keyboard Behavior

See §4.3 for full table. GAPS:

- No F2 for rename
- No Delete/Backspace for delete confirm
- No Shift+F10 / context menu key
- No type-ahead
- No keyboard DnD
- Incomplete ArrowRight/Left (no navigation)
- No IME composition guard on Enter

## 5.7 Screen-reader Behavior

### 5.7.1 Tree semantics

- `role="tree"` (tree.tsx:1308), `aria-label`, `tabIndex={0}` on container

### 5.7.2 Row semantics

- `role="treeitem"`, `aria-level`, `aria-setsize`, `aria-posinset`, `aria-expanded` (folders only), `aria-selected`, `aria-current="page"`, `aria-label`. **GOOD**.

### 5.7.3 Drag/drop announcements

- `aria-grabbed` on source, `aria-dropeffect` on target (tree.tsx:1220-1221). **GOOD**.

### 5.7.4 Live regions for mutations

- **MISSING**: Toast container should have `aria-live="polite"`. Mutations not announced. **GAP** (F-LIVE-REGION).

### 5.7.5 Rename input labeling

- `aria-label={`Rename ${node.name}`}` (L1397). Error: `aria-describedby`, `role="alert"` (L1482). **GOOD**.

### 5.7.6 Bulk selection announcements

- SelectionCheckbox has `ariaLabel={`Select ${node.label}`}` (tree.tsx:487)
- Bulk count update: **NO live region**. **GAP**.

## 5.8 Responsive Behavior

### 5.8.1 Sidebar width

- Min 216px, max 432px, default 272px
- User-resizable via drag or keyboard
- Persisted to cookie + localStorage

### 5.8.2 Below 1024px

- `width: 0` (ResizableSidePanel.tsx:77). **F-20**.

### 5.8.3 Resize affect on tree

- Tree content reflows; rows truncate at narrower widths

## 5.9 Dark Mode / Theme

### 5.9.1 Dark mode

- Tailwind classes used (bg-white, bg-surfaceMuted, text-ink)
- `bg-white` hard-coded — would NOT invert. **GAP**.

### 5.9.2 Theme consistency

- Glass surface variant (ResizableSidePanel.tsx:69): transparent backgrounds
- Paper mode (default): solid white

### 5.9.3 High-contrast mode

- Not explicitly tested
- `border-l-focus` likely visible
- `bg-divider`, `bg-surfaceMuted` may fail contrast

### 5.9.4 Reduced-motion

- `motion-reduce:transition-none` on rail transitions (tree.tsx:455, 477). **GOOD**.

## 5.10 Concrete UX Corrections

| Issue | Correction | Priority |
|---|---|---|
| Input height mismatch (F-09) | Change input from `h-5 leading-5` to `h-7 leading-7`; buttons to `size-7` | P3 |
| Caret no focus ring | Add `focus-visible:ring-2 focus-visible:ring-accentSoft` | P3 |
| Hover + drop-inside indistinguishable | Use different bg for drop-inside (e.g., `bg-accentSoft/50`) | P3 |
| Empty state invisible (F-21) | Render CTA: "No areas yet. Click 'Add Branch' to create one." | P2 |
| No live region for mutations | `aria-live="polite"` on toast container; announce states | P2 |
| Mobile sidebar hidden (F-20) | Add drawer / hamburger menu | P2 |
| No bulk count announcement | Live region for "N areas selected" | P2 |
| No F2 / Shift+F10 / type-ahead (F-12) | Implement standard tree keyboard | P2 |
| Loading is sidebar-wide (F-15) | Per-row pending state | P2 |
| No focus restoration after delete | Move focus to fallback row | P2 |
| Read-only mode shows all CRUD | Disable CRUD when `canEditEstimate === false` | P2 |
| No descendant count in delete modal | "Delete X? Removes N sub-areas and M cost rows." | P2 |
| No error message translation | Map technical errors to user-friendly copy | P3 |
| Deep tree readability at depth 10+ | Depth-based font fade or wrap | P3 |
| Toggle missing aria-controls (F-22) | Add stable aside id + `aria-controls` | P3 |

# 12 — UX/UI/Accessibility Audit

## Information architecture

The three-tab structure (Library / Project / Templates) is reasonable for a source browser. The hierarchy within each tab is clear: toolbar → tree → preview. The bulk-action dock floats at the bottom.

**Concern**: the "Project" tab name is ambiguous (current-project components vs reusable project sources). See Finding F-02.

## Typography

| Element | Size | Line height | Assessment |
| --- | --- | --- | --- |
| Tab labels | ~11px | standard | OK |
| Tree row label | 10px | 4 (0.25rem) | ⚠️ Small but readable on desktop |
| Tree row supplier | 9px | 3 | ⚠️ Very small |
| Price | 9px | standard | ⚠️ Small |
| Unit | 9px | standard | ⚠️ Small |
| Source trust chips | 8px | 3 | ⚠️ **Below WCAG recommended minimum** |
| Preview heading | 11px | standard | OK |
| Preview category | 9px | standard | ⚠️ |
| Preview staleness | 8px | 3 | ⚠️ |
| Staleness label | 8px | 3 | ⚠️ |
| Insert qty input | 9px | standard | ⚠️ |
| Add buttons | 9px | standard | ⚠️ |

**Finding**: many text elements are 8–9px, which is below the 10px practical minimum for comfortable reading on standard displays. This is a deliberate density choice for a professional estimating tool, but it sacrifices legibility. **P3** — consider a "comfortable" density toggle.

## Hit targets

| Element | Size | WCAG 2.2 (min 24×24px) |
| --- | --- | --- |
| Add button (row hover) | 20×20px (`size-5`) | ❌ Below minimum |
| Tree caret | 14×14px (`w-3.5 h-3.5`) | ❌ |
| Checkbox | ~14×14px | ❌ |
| Tab items | ~28px height | ✅ |
| Toolbar buttons | 24×24px (`size-6`) | ✅ (borderline) |
| Preview close | 20×20px (`size-5`) | ❌ |

**Finding**: several interactive elements are below the WCAG 2.2 24×24px minimum target size. **P2 accessibility defect.**

## Keyboard navigation

### Tree keyboard (shared `Tree` component)
- **Tab/Shift+Tab**: moves focus into/out of tree
- **Arrow Up/Down**: navigates rows (roving tabindex)
- **Arrow Left/Right**: collapse/expand folders
- **Home/End**: first/last row
- **Enter**: row click (triggers `onRowClick`)
- **Space**: toggle selection (if `selectable`)
- **Escape**: not handled by Tree itself (consumers handle overlay closing)

**VERIFIED**: `tree.tsx:1088-1154` implements full APG tree keyboard pattern.

### Arrow keys inside text inputs
The inline folder rename input (`LibraryTree.tsx:298-342`) calls `event.stopPropagation()` on keydown to prevent arrow keys from navigating the tree while editing text. ✅

### Enter during IME composition
Not explicitly guarded — `FolderRenameInput` commits on Enter unconditionally. For IME users, this could submit prematurely during composition. **P3 — low risk for English-first product.**

### `/` shortcut
- Opens search dropdown
- Guarded: does not fire when the AddComponentModal is open (`component-library-ui.test.tsx:945-951`)
- **VERIFIED CORRECT**

### Escape hierarchy
1. Context menu open → closes menu
2. Search dropdown open → closes search
3. Folder rename active → cancels rename
4. Preview open → (not handled by Escape — requires clicking X)
5. Modal open → closes modal

**Inconsistency**: Escape does not close the preview panel. **P3.**

## Screen reader behavior

### Landmarks
- The sidebar renders inside `ResizableSidePanel` which uses `<aside aria-label="…" aria-hidden={collapsed}>`.
- Nested `<aside>` within another `<aside>`: the sidebar's own root may produce redundant landmarks. **P3.**

### Tablist
- `role="tablist"` with `role="tab"` children and `aria-selected` — **VERIFIED** by test assertion at `component-library-ui.test.tsx:427`.
- `aria-controls` is NOT set on tabs (tabs don't control a specific panel id). **P3.**

### Tree
- `role="tree"` with `role="treeitem"` children — **VERIFIED** in `tree.tsx:1208`.
- `aria-level`, `aria-expanded`, `aria-selected`, `aria-setsize`, `aria-posinset` — all present.
- `aria-label` on tree: `"Library sources"`, `"Reusable estimate sources"`, etc.

### Drag announcements
- `aria-grabbed` on draggable source rows (`tree.tsx:1220`)
- `aria-dropeffect` on drop target rows (`tree.tsx:1221`)
- **VERIFIED**: U12/UX-5 implementation.

### Loading announcements
- Skeleton status: `role="status"` with `aria-label="Loading Library tree"` etc.
- **VERIFIED** by test at `estimate-sheet-library-lazy-load.test.tsx:114`.

### Error announcements
- Error toast: `role="alert"` with `aria-live="assertive"` (`toast.tsx:176`)
- Success toast: `role="status"` with `aria-live="polite"`

## Focus indicators

- Tree rows: `border-l-focus` on focused/current row (`tree.tsx:434`)
- Toolbar buttons: `focus-visible:ring-2 focus-visible:ring-focus`
- **VERIFIED**: visible focus indicators present on all interactive elements.

## Contrast

The design system uses a muted palette (`text-ink`, `text-secondary`, `text-tertiary`, `text-muted`). The `text-tertiary` class is used for 9px labels (supplier, unit, staleness). On white background, `text-tertiary` may fall below WCAG AA 4.5:1 contrast ratio for small text.

**Not measured** — requires actual color value extraction. Flagged for visual QA.

## Responsive behavior

- **Below 1024px (lg)**: sidebar is `display: none`. No mobile entry point. **Finding F-12.**
- **1024px–1366px**: sidebar renders at min width (360px). Dense but usable.
- **1366px+**: sidebar renders at saved width (up to 560px max).
- **Browser zoom**: CSS-based layout adapts. Text sizes are in px (not rem), so zoom scales proportionally.

## High contrast / reduced motion

- **Reduced motion**: `motion-reduce:transition-none` on rail transitions. `motion-reduce:animate-none` on bulk dock entrance. ✅
- **High contrast**: not explicitly tested. The muted palette may fail Windows High Contrast mode.

## Modal consistency

- `AddComponentModal`: uses shared `Modal` component with `showModal()` native dialog
- `NewTemplateModal`: same shared `Modal`
- `CommandPalette`: uses native `<dialog>` with `showModal()`
- Rename/delete dialogs: inline (no modal)
- Folder rename: inline input (no modal)

**Consistent**: all overlays use the same Modal/dialog primitives. ✅

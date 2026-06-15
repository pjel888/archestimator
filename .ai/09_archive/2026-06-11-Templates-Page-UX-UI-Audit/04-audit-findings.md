# Templates Page — Audit Findings & Recommendations

**Date**: 2026-06-11  
**Audit scope**: UX, UI, performance, content, accessibility, code quality  
**Severity scale**: 🔴 Critical | 🟠 High | 🟡 Medium | 🔵 Low | ⚪ Info

---

## 1. Functional Gaps

### Second-Pass Scope Correction

The original audit correctly identified that `/workshop/templates` does not surface create, edit, delete, duplicate, or apply actions. It should not imply that template insertion is absent from the product. The estimate editor already has an insertion backend and UI path:

- `src/lib/estimates/actions.ts` defines `insertEstimateTemplateIntoEstimate()`.
- That action calls the authenticated `insert_estimate_template_into_estimate_with_history` RPC.
- `src/components/workshop/EstimateSheetContent.tsx` supports template drag/drop into group nodes and passes templates into `EstimateRightSidebar`.
- Existing E2E/Vitest coverage already exercises estimate-workspace insertion paths.

The revised recommendation is to separate two options:

- **Preferred Option A**: keep `/workshop/templates` browse-first and add a clear launch/handoff into the existing estimate-editor insertion flow.
- **Option B**: build full create/edit/delete/apply management on `/workshop/templates` only after separately approving that larger scope.

### 🔴 CRITICAL: Browse-First Purpose Is Unclear

**Current state**: The Templates page behaves as a browse/discovery experience, but its layout and copied management chrome make it look like an incomplete management hub. Users can browse, search, select tree nodes, expand/collapse, and resize, but they cannot clearly understand the next step for using a template.

**Evidence**: 
- `HeaderIconToolbar` for sheet has empty `addActions={[]}` (line 138 of TemplateLibraryManager)
- Template cards render as `<li>` with no `onClick` handler (line 165)
- Existing insertion tests and server action live in the estimate editor path, not on the Templates page

**Expected behavior**: The page must declare and support its product role. For beta, the lower-risk path is browse-first discovery plus an explicit handoff into the existing estimate-editor apply flow. A full management hub is a separate product decision.

**Recommendation**: Add at minimum:
1. Card selection that opens or syncs a contextual inspector/dock.
2. A visible "use/open in estimate" handoff that routes into the existing insertion surface.
3. Clear empty/loading/error states that explain how templates are used.
4. A separate decision record if create/edit/delete should live on this page.

---

### 🔴 CRITICAL: Design-System Trust Gaps Are Underweighted

The current audit marks visual design as compliant because typography, radius, and tokens mostly pass. That is incomplete. Archestimator app/workshop UI also requires dense full-browser task utility, no decorative app UI, no orange app accent, no fake controls, and shared primitive reuse.

Required corrections:

- Treat inert toolbar buttons as P0 blocking defects.
- Treat decorative orange/texture app chrome visible in screenshots as out of scope for product UI unless explicitly approved.
- Remove or use every visible control.
- Prefer right-dock or inspector states over modal-first template management.
- Validate future additions against `DESIGN.md`, not only existing local class names.

---

### 🟠 HIGH: Non-Functional Toolbar Buttons

**Current state**: The `HeaderIconToolbar` renders "Filter" and "Group" buttons on both the sheet and tree panels, but clicking them does nothing observable.

**Evidence**: 
- `addActions={[]}` — no actions configured (lines 138, 278)
- Filter button renders but has no dropdown/menu/popover
- Group button renders but has no grouping functionality
- These are identical to the library page toolbar which HAS functional filter/group — the template page copied the shell but not the behavior

**Recommendation**: Either implement filter/group functionality or remove the buttons to avoid confusing users.

---

### 🟡 MEDIUM: No Sort Options

**Current state**: Templates are always sorted by `sort_order` then `name` (alphabetical). Users cannot re-sort.

**Recommendation**: Add sort controls — by cost, row count, recently modified.

---

## 2. UX Issues

### 🟡 MEDIUM: Template Cards Not Clickable

**Current state**: Template cards look like they should be interactive (border, padding, structured content), but clicking does nothing. The only way to "select" a template is via the tree panel.

**UX impact**: Users naturally try to click the large, prominent card. When nothing happens, it's disorienting.

**Recommendation**: Make template cards selectable/clickable so they open or sync a contextual detail view. Any "use" action should hand off to the existing estimate-editor insertion flow unless Option B is approved.

---

### 🟡 MEDIUM: Tree Panel Visual Dominance Stolen by Empty Header Row

**Current state**: There's a 40px empty header row (line 399-405) that takes up space but shows nothing:
```tsx
<div className="relative h-10 shrink-0 border-b border-hairline bg-white"
     data-workshop-layout="template-library-workspace-header-row">
  <div className="absolute inset-y-0 left-0 right-0 flex min-w-0 items-center"
       data-template-library-center-header="true" />
</div>
```

**Visual impact**: A 40px empty bar with a border-bottom occupies prime vertical space. The library page fills this with actual content (tab navigation, create button).

**Recommendation**: Either remove this row or populate it with template-level actions (New Template button, view mode toggle).

---

### 🔵 LOW: "Templates" Tab Redundant

**Current state**: The tree panel shows a `WorkshopTreeTabs` component with a single tab "Templates". Since there's only one tab and it's always selected, it serves no purpose.

**Evidence**: `TEMPLATE_LIBRARY_TABS = [{ id: "templates", label: "Templates" }]` — single-item array (line 29).

**Recommendation**: Remove the tab bar until multiple tabs are needed, or add a second tab (e.g., "Recent", "Favorites", "Categories").

---

### 🔵 LOW: Inconsistent Counter Wording

**Current state**: Counter says "3 of 3 templates" but the tree node shows "2 groups / 3 areas / 8 rows". The pluralization logic in `formatTemplateResultCount` handles singular/plural for "template/templates" but not for "groups", "areas", or "rows" (always plural even when count is 1).

**Evidence**: "Powder Room Basic" shows "1 groups / 1 areas / 4 rows" — should be "1 group / 1 area / 4 rows".

---

### 🔵 LOW: Search Doesn't Search Row Content

**Current state**: The sheet search matches against `template.name`, `template.description`, `template.category`, and node names (depth ≤ 1). It does NOT match against row item names like "HEMLINGBY Loveseat" or supplier names.

**Impact**: Users searching for "IKEA" or "HEMLINGBY" get no results even though those terms appear in the sample rows.

**Recommendation**: Include row material names and supplier names in the search index.

---

## 3. Accessibility Audit

### ✅ Strengths

| Feature | Status | Details |
|---------|--------|---------|
| ARIA landmarks | ✅ Good | `main`, `navigation`, `region`, `complementary`, `tree`, `treeitem` |
| Focus indicators | ✅ Good | `focus-visible:ring-2 focus-visible:ring-focus` |
| Semantic HTML | ✅ Good | `<h1>`, `<nav>`, `<ul>`, `<li>`, `<button>`, `<section>` |
| Roles | ✅ Good | `role="tree"`, `role="treeitem"`, `role="tablist"`, `role="tab"` |
| ARIA labels | ✅ Good | Descriptive labels on all interactive elements |
| aria-selected | ✅ Good | Properly tracks selected state on tree items and tabs |
| aria-expanded | ✅ Good | Properly tracks expand/collapse state |
| Screen reader text | ✅ Good | `sr-only` on loading indicators |

### Issues

| Issue | Severity | Details |
|-------|----------|---------|
| No keyboard shortcuts for search | 🔵 Low | Ctrl+K / ⌘K would be expected |
| Tree chevron click target small | 🔵 Low | 11px chevron, could be larger touch target |
| No "skip to content" link | 🔵 Low | Standard for accessibility compliance |
| Resize handle not keyboard-operable | 🟡 Medium | Drag-only resize, no keyboard alternative |

---

## 4. Visual Design Audit

### Typography Compliance (DESIGN.md)

| Rule | Compliant? | Details |
|------|-----------|---------|
| SF Pro font | ✅ Yes | Applied via globals.css |
| Max 12px font size | ✅ Yes | Largest is 10px, most are 9px |
| 3px border radius | ✅ Yes | `rounded-xs` everywhere (3px) |
| 0 letter-spacing | ✅ Yes | No letter-spacing override |
| Regular/medium weights | ✅ Yes | `font-medium` and `font-normal` only |
| Phosphor Icons | ✅ Yes | Regular weight outline |

### Color Usage

| Element | Color | Token |
|---------|-------|-------|
| Template name | #292929 (ink) | `text-ink` |
| Summary text | #7F7F7F (tertiary) | `text-tertiary` |
| Description | #7F7F7F at 80% opacity | `text-tertiary/80` |
| Background | White | `bg-white` |
| Borders | Hairline | `border-hairline` |
| Muted surface | Surface muted | `bg-surfaceMuted` |

**No color issues detected** — follows the established token system.

### Layout & Spacing

| Element | Spacing | Compliant? |
|---------|---------|------------|
| Card padding | `p-2` (8px) | ✅ |
| Card gap | `space-y-1` (4px) | ✅ |
| Search→toolbar | Stacked | ✅ |
| Tree→sheet split | Resizable, no min constraint issue | ✅ |

---

## 5. Code Quality

### Architecture

| Aspect | Rating | Notes |
|--------|--------|-------|
| Component decomposition | ✅ Good | Clean split: page → shell → manager → sheet + panel |
| Separation of concerns | ✅ Good | Data fetch (RSC) separate from UI (client) |
| Type safety | ✅ Good | Full TypeScript with strict mode |
| Error handling | ✅ Good | Error boundary, DB error fallback, missing table fallback |
| Loading states | ✅ Good | Suspense + skeleton, no flash of unstyled content |

### DRY Concerns

| Issue | Details |
|-------|---------|
| `summarizeEstimateTemplate` duplicated | Defined in BOTH `src/components/workshop/component-library/templates.ts` (line 16) AND `src/lib/component-library/estimate-templates.ts` (line 363). Identical logic. |
| Two `normalizeLabel`-style functions | `normalizeLabel` in TemplateLibraryManager vs potential similar function in ComponentLibraryManager |

### Missing Code Splitting

| Issue | Severity | Details |
|-------|----------|---------|
| No dynamic import for TemplateLibraryManager | 🟡 Medium | Library page uses `next/dynamic` for its manager; templates page does not. The 422-line component ships in initial JS bundle. |

---

## 6. Content Audit

### Template Data Quality

| Template | Completeness | Issues |
|----------|-------------|--------|
| Condo Fit-Out Starter | Good | All rows have pricing, suppliers, categories, descriptions |
| Powder Room Basic | Good | All rows complete |
| Roof Deck Lounge | Good | All rows complete |

### Content Gaps

| Gap | Impact |
|-----|--------|
| No template usage instructions | Users don't know HOW to apply a template to an estimate |
| No template creation guide | No onboarding for creating new templates |
| Limited categories | Only "Residential Rooms" and "Exterior + Site" |
| No template versioning info | Can't tell when a template was last updated |
| No author/creator info | Can't tell who created a template |

---

## 7. Comparison: Templates vs Library Page

| Aspect | Templates | Library |
|--------|-----------|---------|
| **Purpose** | Browse/discover estimate templates | Manage cost component library |
| **Read/Write** | Browse-first; management scope unapproved | Full CRUD |
| **Data density** | Low (3 items) | High (potentially hundreds) |
| **Code splitting** | ❌ No dynamic import | ✅ `next/dynamic` |
| **Toolbar** | Non-functional | Functional filter/group |
| **Tab bar** | Single tab (redundant) | Multi-tab (Categories, Suppliers, Brands, Custom) |
| **Tree actions** | None | Add to sheet, preview |
| **Card actions** | None | Add, preview, edit |
| **Search scope** | Name + nodes | Name, category, supplier, brand, material |

**The templates page feels like a stripped-down, incomplete version of the library page.** It inherits the same layout pattern and component structure but without the functionality that makes the library page useful.

---

## 8. Recommendations Summary

### Immediate (Pre-Beta)

| Priority | Action | Effort |
|----------|--------|--------|
| 🔴 P0 | Decide and encode Option A browse-first handoff vs Option B management hub | Low |
| 🔴 P0 | Remove or implement non-functional Filter/Group buttons | Low |
| 🔴 P0 | Add a clear "use/open in estimate" handoff into the existing insertion flow | Medium |
| 🟠 P1 | Make template cards selectable/clickable and sync detail/tree state | Medium |
| 🟠 P1 | Remove empty header row or populate it with real browse/handoff actions | Low |
| 🟡 P2 | Add sort controls | Low |
| 🟡 P2 | Add full create/edit/delete only if Option B is separately approved | Medium-High |

### Post-Beta

| Priority | Action | Effort |
|----------|--------|--------|
| 🟡 P2 | Add template edit/delete | Medium |
| 🟡 P2 | Expand search to include row content | Low |
| 🔵 P3 | Fix pluralization in summary text | Trivial |
| 🔵 P3 | Add `next/dynamic` code splitting | Low |
| 🔵 P3 | Remove redundant single-tab tab bar | Trivial |
| 🔵 P3 | Add keyboard shortcut for search focus | Trivial |
| 🔵 P3 | Deduplicate `summarizeEstimateTemplate` | Low |

---

## 9. Audit Metadata

| Field | Value |
|-------|-------|
| Audit date | 2026-06-11 |
| Auditor | Sisyphus (AI Agent) |
| Codebase revision | Current working tree |
| Files analyzed | 12 source files |
| Live testing | Yes — Playwright browser interaction |
| Screenshots captured | 2 (viewport + full-page) |
| Templates on page | 3 (seed data) |
| Total LOC analyzed | ~1,200 (templates-related) |

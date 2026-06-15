# UX Paths and Actions

Status legend:

| Status | Meaning |
| --- | --- |
| Verified | Confirmed from source, DB, or a successful runtime check. |
| Code-present | Source path exists, but the interaction still needs authenticated browser proof. |
| Not implemented | No current behavior found. |
| No-op | Visible UI exists but does not perform the implied action. |
| Pending | Needs authenticated visual, keyboard, or e2e verification. |

## Entry and Orientation

| ID | Path | Current status | Audit requirement |
| --- | --- | --- | --- |
| E1 | Navigate directly to `/workshop/library` while signed out | Verified redirect | Must redirect to `/login?next=%2Fworkshop%2Flibrary` without rendering private library data. |
| E2 | Navigate to `/workshop/library` while signed in | Pending | Capture authenticated desktop/tablet/mobile screenshots and confirm title, route, rail, sheet, catalogue, and tree panel geometry. |
| E3 | Use global navigation "Components" or equivalent | Code-present | Confirm active state, route label, keyboard focus order, and no misleading left-sidebar sizing assumption. |
| E4 | Start from old `/workshop/components` route | Verified source | Confirm redirect still lands on `/workshop/library` in authenticated browser. |

## Search and Discovery

| ID | Path | Current status | Audit requirement |
| --- | --- | --- | --- |
| S1 | Search by component name | Code-present | Type representative terms, assert count changes, focus remains in search, and result status is announced. |
| S2 | Search by category, supplier, brand, unit, description, source, confidence, or date | Code-present | Use seeded terms for each field and verify matches against visible card metadata. |
| S3 | Clear search | Code-present | Clear button must restore the previous full result set and preserve scroll intentionally. |
| S4 | No-results search | Pending | Empty state must name the query and offer recovery without moving focus. |
| S5 | Rapid typing | Pending | INP should remain <= 200 ms p75 under rapid query changes. Use React `useDeferredValue` or transition planning only if measured lag appears. |
| S6 | Filter button | No-op | Either remove/hide until implemented or wire to a real `FilterPopover` with testable facet semantics. |
| S7 | Group button | No-op | Either remove/hide until implemented or wire to explicit grouping controls. Do not rely on the hidden `viewMode` concept. |

## Browsing and Structural Navigation

| ID | Path | Current status | Audit requirement |
| --- | --- | --- | --- |
| B1 | Browse all visible components | Code-present | Confirm visible count matches route query behavior: 154 non-archived items at time of DB verification. |
| B2 | Browse root categories | DB-verified, UI pending | DB roots are 9. If UI shows 12 groups, document the promotion/mapping layer explicitly. |
| B3 | Use right tree panel | Code-present | Verify pointer and keyboard navigation, selection state, expansion/collapse, and screen-reader naming. |
| B4 | Switch tree mode to suppliers | Code-present | Verify label, count, selection behavior, empty states, and return path. |
| B5 | Switch tree mode to brands | Code-present | Verify label, count, selection behavior, empty states, and return path. |
| B6 | Visual list/grid toggle | Not implemented | Do not describe as existing. If planned, justify with task research and use existing `DataTable`/density primitives. |

## Component Understanding

| ID | Path | Current status | Audit requirement |
| --- | --- | --- | --- |
| C1 | Inspect component details | Not implemented | Planned detail view should prefer `InspectorDrawer`, `Sheet`, or right dock pattern before modal. It must expose price options, version/state, supplier/brand, category path, source/date/confidence, thumbnail/assets, and archive state. |
| C2 | Edit component | Not implemented from catalogue | Must be planned as a versioned mutation flow, not as a simple Add modal reuse. |
| C3 | View price history | Not implemented in current catalogue card | Future inspector should map to `cost_library_item_price_history`. |
| C4 | View attachments | Not implemented in current catalogue card | Future inspector should account for `cost_library_item_variant_attachments`, currently 0 rows in read-only check. |
| C5 | Distinguish discontinued item | Pending | Because the route includes non-archived discontinued items, UI must clarify or intentionally filter lifecycle state. |

## Add and Archive Workflows

| ID | Path | Current status | Audit requirement |
| --- | --- | --- | --- |
| A1 | Open Add Component | Code-present | Verify focus moves into modal and returns to Add control on close. |
| A2 | Fill required fields | Code-present | Verify labels, validation, disabled/loading states, and recovery from invalid entries. |
| A3 | Select or create supplier/brand | Code-present | Verify combobox/listbox semantics and keyboard behavior. |
| A4 | Upload image/attachment | Code-present | Verify file constraints, progress, error copy, and storage result. |
| A5 | Save new component | Code-present | Verify DB write through approved path, local state update, `router.refresh()`, toast/status, and duplicate handling. |
| A6 | Select cards for archive | Code-present | Verify checkbox labels, selected count, bulk toolbar, and focus behavior. |
| A7 | Preview and confirm archive | Code-present | Verify destructive preview content, policy/RPC permission handling, cancellation, and undo/recovery copy if available. |

## Accessibility-Specific Paths

| ID | Path | Current status | Audit requirement |
| --- | --- | --- | --- |
| K1 | Keyboard-only route traversal | Pending | Full tab order from rail to header, search, toolbar, tab, cards, tree, and modal controls. |
| K2 | Tree keyboard | Pending | Must match WAI-ARIA tree/treegrid expectations if using tree semantics; otherwise document chosen semantics. |
| K3 | Focus visibility | Pending | Focus must be visible and not hidden behind sticky headers or overlays. |
| K4 | Status announcements | Pending | Result counts, searching/no-results, add success/error, archive preview/success/error must use appropriate live regions or status patterns. |
| K5 | Reduced motion | Pending | Sidebar and any future transitions must respect `prefers-reduced-motion`. |
| K6 | Target size | Pending | Icon buttons, checkboxes, chips, tree toggles, and row actions must meet 24 x 24 CSS px or equivalent spacing. |

## Product Task Model

The Library page should primarily support these jobs:

1. Find a known component quickly by name, category, supplier, brand, or source metadata.
2. Compare component cost and source confidence before using it elsewhere.
3. Maintain catalogue hygiene: add, update, archive, categorize, and enrich components.
4. Navigate a construction taxonomy without losing context.
5. Trust that supplier/brand/source/date/confidence data is accurate enough for estimates and proposals.

Features that do not directly support these jobs should stay below the implementation line until user research or beta feedback justifies them.

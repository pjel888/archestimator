# Component Library Toolbar and Type Tabs Research

Date: 2026-07-15  
Scope: enterprise component-catalogue browsing, control placement, component-source tabs, accessibility, and large-result behavior.  
Source policy: official W3C/WAI guidance and first-party design-system/product documentation only.

## Recommended direction

1. Use one persistent centre-sheet control row for the component catalogue: **Search, Filter, View, Sort, Add component**. Remove the persistent context/control strip currently below it.
2. Keep result scope/count as compact non-action text within that row. Keep only genuinely conditional feedback below it: active-filter chips, mutation/error messages, or selection actions.
3. Keep the left rail's hierarchy control in its own header row because it controls the tree, but rename it from **View by** to **Organize by**. Folder/Supplier/Brand changes the catalogue hierarchy; it is not the same concept as Cards/Dense.
4. Add a lower-emphasis component-source tab row immediately below the top-level **Components** section and above the split catalogue surface:
   - **Library Components** — active default.
   - **Project Components** — enable only when it controls a real project-component panel or route.
   - **Supplier Components** — visible with a **Soon** badge, discoverable but not activatable until its panel exists.
5. Keep **Cards/Dense** in the catalogue toolbar. It changes the presentation of the same result set, so it is a view switch rather than a major tab.

This yields a clear hierarchy:

```text
Library section navigation:  Overview | Components | Templates
Component source:            Library Components | Project Components | Supplier Components (Soon)
Catalogue query toolbar:     Search | Filter | View | Sort | Add component
Tree organization:           Organize by Folder/Supplier/Brand | Expand | Collapse
Results:                     cards or dense table
```

Carbon explicitly distinguishes tabs for related categories in the same context from controls that merely filter or change the format of the same content. It recommends a lower-level content switcher for the latter. [Carbon Tabs](https://carbondesignsystem.com/components/tabs/usage/)

## Current Archestimator diagnosis

- The centre sheet already renders Search, Filter, and Add through `TreePanelHeader`, then renders a second persistent `data-component-sheet-context-strip` containing result scope, Load more, Cards/Dense, and passive sort text. That split is the precise source of the extra-row problem. See `src/components/workshop/component-library-manager/ComponentLibraryManager.tsx:1634-1742`.
- The left rail already places its hierarchy selector in the `TreePanelHeader` action row. Its behavior should stay there; only its language should become **Organize by**. See `src/components/workshop/component-library-manager/LibraryFolderTree.tsx:1265-1307`.
- The existing top-level Overview/Components/Templates tabs are route-backed and visually large. The component-source tabs should be more compact and visibly subordinate, not another equal-weight copy of the same navigation. See `src/components/workshop/library/LibraryTabsLayoutClient.tsx:214-260`.
- The shared `Tabs` component supplies underline tabs, horizontal overflow, roving focus, and manual/automatic activation, but native-disabled tabs are removed from arrow navigation. A visible future Supplier tab therefore needs a deliberate discoverable-disabled contract rather than the current `disabled` behavior. See `src/components/ui/tabs.tsx:99-138` and `src/components/ui/tabs.tsx:162-197`.
- `HeaderIconToolbar` is presently a visually grouped generic `div`, not a true ARIA toolbar. Adding `role="toolbar"` without implementing arrow-key focus management would be incomplete. See `src/components/ui/header-icon-toolbar.tsx:103-110`.

## Control placement matrix

| Control | User question | Recommended location | Behavior |
| --- | --- | --- | --- |
| Search | “Which component is it?” | Centre toolbar, first | Icon disclosure; preserve the existing shortcut and query state. |
| Filter | “Which components qualify?” | Centre toolbar | Opens facets; active count on trigger; applied chips appear only when filters exist. |
| View | “How should results look?” | Centre toolbar | Cards/Dense toggle; persists preference; never a major tab. |
| Sort | “In what order?” | Centre toolbar | Menu button with selected key and direction in its accessible name, e.g. `Sort: Name, ascending`. |
| Add component | “Create a catalogue record” | Centre toolbar, rightmost | Existing orange primary add treatment; do not duplicate it elsewhere on this route. |
| Organize by | “Which hierarchy should the rail show?” | Left-rail toolbar | Folder/Supplier/Brand; label it as organization rather than view. |
| Expand/Collapse | “How much of the hierarchy is open?” | Left-rail toolbar | Remains adjacent to Organize by because all three operate on the rail tree. |
| Result count/scope | “What am I seeing?” | Flexible text in centre toolbar | `All Components · 50 loaded of 2,317`; truncate visually but retain a complete accessible name. |
| Load more/pagination | “Fetch the next server page” | Result boundary or footer | Do not consume the limited global-action toolbar budget. Preserve status near the trigger. |

Carbon reserves a table toolbar for global actions such as settings, complex filtering, export, and editing, recommends no more than five visible actions, and moves extras into overflow. That maps cleanly to Search, Filter, View, Sort, and Add. [Carbon Data Table](https://carbondesignsystem.com/components/data-table/usage/) SAP likewise treats table actions, personalization, multiple views, and conditional filter summaries as one table-header system; its filter summary appears only after filters are set. [SAP Fiori Table Toolbar](https://www.sap.com/design-system/fiori-design-web/v1-145/discover/frameworks/sap-fiori-elements/tables-and-lists/tables-toolbar)

### What may remain below the toolbar

The user-requested persistent second row should be deleted. A second line is still justified when it is conditional and communicates active state rather than duplicating controls:

- applied facet chips with Clear all;
- bulk-selection actions after rows are selected;
- load, mutation, and error status;
- a filter summary only while filters are active.

This is consistent with SAP's conditional filter infobar and avoids paying the vertical-space cost when the catalogue is in its default state. [SAP Fiori Table Toolbar](https://www.sap.com/design-system/fiori-design-web/v1-145/discover/frameworks/sap-fiori-elements/tables-and-lists/tables-toolbar)

## Component-source tab contract

### Information architecture

The source tabs switch between related but meaningfully different component collections, so tabs are appropriate. Cards/Dense, sorting, and facets must remain shared query controls below them. Carbon recommends short, specific labels and horizontally scrollable tabs instead of wrapped multi-line tabs at narrow widths. [Carbon Tabs](https://carbondesignsystem.com/components/tabs/usage/)

Recommended visible labels are the user's requested two-word names because they remain concise and unambiguous:

```text
Library Components    Project Components    Supplier Components  Soon
```

Use a compact underline/line-tab treatment aligned with the content column. It should be lower in height and contrast than Overview/Components/Templates so the two levels are not mistaken for peers.

### Route and activation behavior

- Every enabled tab must own a real `tabpanel` or route-backed panel.
- Use manual activation when switching performs a server fetch or route transition: arrows move focus; Enter/Space activates. WAI recommends automatic activation only when the next panel appears without noticeable latency. [WAI Tabs Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/)
- Persist source in the URL when users may reload, share, or return to it. Do not create a clickable Project tab that only shows a fake empty state.
- Keep each source's search/filter/view/sort state independent if the underlying facets differ; restore it when the user returns to that source.

### Supplier “Soon” state

Carbon permits a disabled tab for permission, dependency, or prerequisite constraints. WAI also notes that disabled tabs may remain focusable when discoverability matters. [Carbon Tabs](https://carbondesignsystem.com/components/tabs/usage/), [WAI Keyboard Interface — disabled controls](https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/#kbd_disabled_controls)

For Archestimator:

- render `Supplier Components` with visible `Soon` text;
- expose `aria-disabled="true"` and an `aria-describedby` explanation;
- allow arrow-key focus to land on it, but suppress click/Enter/Space activation;
- do not use a link to a nonexistent route;
- retain a real focus indicator distinct from the selected-tab indicator.

The current shared `Tabs` implementation uses native `disabled` and skips disabled tabs during arrow navigation. Either add an explicit discoverable-disabled mode to that shared primitive, or keep the future Supplier label outside the `tablist` until that behavior exists. Do not silently ship an undiscoverable dead tab.

## Accessibility contract

### Tabs

- `role="tablist"` with an accessible label such as `Component sources`.
- One `role="tab"` has `aria-selected="true"` and `tabIndex=0`; other enabled tabs use `tabIndex=-1`.
- Left/Right Arrow navigate; Home/End are supported; Enter/Space activates in manual mode.
- Each enabled tab's `aria-controls` points to its real `tabpanel`, and the panel is labelled by the tab.
- Selected state and keyboard focus must be visually distinct. [WAI Tabs Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/), [WCAG Focus Visible](https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html)

### Toolbar

WAI defines a toolbar as a named group of three or more controls with one Tab stop and arrow-key navigation inside it. [WAI Toolbar Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/toolbar/)

Two valid implementation levels exist:

1. **Near-term, lowest risk:** keep the current native-button Tab order and named `role="group"` subclusters. Do not add `role="toolbar"` yet.
2. **Shared-system upgrade:** add `role="toolbar"`, an accessible name, roving `tabIndex`, Left/Right Arrow navigation, Home/End, and last-focused restoration in `HeaderIconToolbar` for every consumer.

The second option is an app-wide keyboard change and should not be bundled casually into this page-only layout pass.

Cards/Dense are mutually exclusive view choices. Keep them in a named group with pressed/selected state and icon labels. Sort and Organize-by triggers that open menus should expose `aria-haspopup="menu"`, `aria-expanded`, and `aria-controls`.

Result-count changes such as “18 results returned” should be announced without moving focus, but avoid making every keystroke excessively chatty. [WCAG Status Messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html)

### Results semantics

- Card mode should remain a semantic list of independently actionable component articles/cards; do not add `role="grid"` merely because CSS lays cards out in columns.
- Dense mode should use a native table when it behaves like a table. An ARIA grid is a composite widget that requires managed arrow-key cell focus and a single page Tab stop. [WAI Grid Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/grid/), [WAI Table Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/table/)

## Scaling to thousands of components

Enterprise catalogue products converge on the same model:

- Shopify pages product lists in batches of 50 while retaining search, filter, and sort. [Shopify product list](https://help.shopify.com/en/manual/products/searching-filtering)
- Akeneo keeps search, filters, pagination, selection, and contextual facets shared between its list and image-focused Gallery display. [Akeneo Advanced Product Grid](https://help.akeneo.com/serenity-take-the-power-over-your-products/serenity-get-familiar-with-the-product-grid)
- TanStack Virtual renders only the visible window for long lists and grids; it addresses DOM/render cost, not server query cost. [TanStack Virtual](https://tanstack.com/virtual/latest)

Archestimator should therefore preserve a server-page contract and virtualize only the loaded result window:

1. Search/filter/sort/source select a server query.
2. The server returns a bounded page plus exact/estimated total and continuation cursor.
3. Cards and Dense consume the same loaded query result.
4. Virtualization limits rendered DOM once the loaded page becomes large.
5. Load-more/pagination remains explicit and truthful; never imply all matching components are client-loaded.

For responsive toolbars, keep the five primary controls in one horizontal row and move lower-frequency future actions such as Import, Export, column settings, and saved views into one overflow menu. Do not wrap the source tabs into two lines; allow horizontal scrolling instead.

## Implementation acceptance checklist

- [ ] No persistent `data-component-sheet-context-strip` beneath the centre toolbar.
- [ ] Search, Filter, Cards/Dense, Sort, and orange Add component share one header row.
- [ ] Result scope/count is still visible and programmatically available.
- [ ] Filter chips/status rows render only when relevant.
- [ ] Left rail says Organize by Folder/Supplier/Brand and keeps tree controls in one row.
- [ ] Component-source tabs appear between the top Components section and catalogue panes.
- [ ] Library and Project tabs control real panels/routes; Supplier is visibly `Soon` and cannot navigate to a dead route.
- [ ] Tabs support Left/Right, Home/End, Enter/Space, selected state, focus state, and responsive horizontal overflow.
- [ ] Card mode remains a semantic list; Dense remains a native table unless a complete ARIA-grid keyboard model is deliberately implemented.
- [ ] Large libraries remain server-paged; virtualization is a rendering layer, not the data-loading strategy.


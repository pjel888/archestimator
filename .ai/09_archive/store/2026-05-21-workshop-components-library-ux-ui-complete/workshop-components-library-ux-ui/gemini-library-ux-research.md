# Archestimator Component Library UX/UI Research Memo

## 1. External UX Patterns

Modern construction cost databases (like RSMeans, CostX, or Procore's catalog), advanced procurement SaaS tools, and technical component managers (like Figma's asset panel or electronic component distributors like Digi-Key) utilize highly specific patterns for managing dense, hierarchical data:

*   **Split-Pane or Dual-Panel Navigation:** A persistent, narrow left sidebar containing the taxonomy (folders/categories/MasterFormat divisions), allowing the right pane to display the dense data grid of items within the selected node.
*   **Data-Dense Grid Views:** Tabular layouts resembling Excel, with sticky column headers, inline quick-editing for high-frequency fields (like `Unit Cost`), and extremely tight vertical padding to maximize items visible per screen.
*   **Compound Search & Filter:** A global search bar that accepts "smart" queries (e.g., "12mm ply suppliers:BGC") coupled with a robust filter drawer or dropdowns for strict faceting (Trade, Supplier, Material Type, Price Freshness).
*   **Contextual Detail Drawers (Slide-overs):** Clicking a row does not navigate away. Instead, a right-side drawer opens revealing the "Item Detail" (historical pricing, supplier links, spec sheets, variation logic), maintaining the list context underneath.
*   **Status Indicators:** Subdued but clear badging for critical metadata: "Stale Price" (e.g., yellow dot if last updated > 90 days ago), "Draft," or "Missing Supplier."

## 2. What Users Want First

Estimators, contractors, and architects in the Philippines operate in an environment where material prices fluctuate and supplier relationships dictate costs. Upon landing on `/workshop/components`, they want:

1.  **Immediate Confidence in Data Freshness:** To instantly see which high-impact items have outdated pricing (e.g., "Show me all rebar and cement prices older than 30 days").
2.  **Frictionless Lookup:** To find a specific item (e.g., "Boysen Permacoat Semi-Gloss") in milliseconds using a keyboard-focused search, bypassing deep folder structures if they know what they want.
3.  **Rapid Bulk Updates:** The ability to update the unit price of 5 different materials from a recently received supplier quote without opening 5 separate edit screens.
4.  **Clear Categorization:** To verify if they have complete coverage for a specific trade (e.g., "Do I have all the fixtures needed for Plumbing?").

## 3. Recommended Information Architecture

The UI should be strictly utilitarian, conforming to the <= 12px font constraint, utilizing dense layouts and clear visual hierarchy.

*   **Top Level (Header):**
    *   Breadcrumb (`Workshop / Component Library`)
    *   Global Search Bar (Cmd/Ctrl + K activated)
    *   Primary Action: `+ New Component` (dropdown: Material, Labor, Assembly)
*   **Layout:** Two-column split-pane.
    *   **Left Pane (Taxonomy Sidebar - 20-25% width):** Tree view of categories.
    *   **Right Pane (Main Content - 75-80% width):** The data grid.
*   **Main Content Views (Tabs above the grid):**
    *   `All Items` (Default)
    *   `Needs Review` (Filters for stale prices, incomplete data)
    *   `Assemblies` (Composite items)
*   **Data Grid (Table):**
    *   Columns: Status (dot), Item Name/Code, Category, Supplier, Unit (pcs, sqm, bdft), Unit Cost, Last Updated, Actions (hover).
    *   *Interaction:* Click row -> Opens Detail Drawer. Double-click specific cell (Cost) -> Inline edit.
*   **Detail Drawer (Right Slide-over):**
    *   Tabs within drawer: `Details` (Specs, SKU), `Pricing` (History, Supplier overrides), `Usage` (Which projects use this?).

## 4. Primary vs. Secondary Views

*   **Primary View: Category / Trade (Customizable).** In the Philippine context, strict MasterFormat is often overkill for small-to-medium firms. The primary tree should be customized categories (e.g., "01 Concrete," "02 Masonry," "03 Finishes") that the user defines, or a simplified trades list.
*   **Secondary View: Supplier.** Crucial for procurement and bulk pricing updates. Users need to pivot the view to say, "Show me everything supplied by Wilcon or CW Home Depot."
*   **Tertiary View: MasterFormat/CSI.** Should be supported via tagging/metadata for firms that need to export formal bids, but should *not* be the enforced primary navigation structure, as it creates too much friction for daily estimation of simple projects.
*   **Tertiary View: Assemblies.** Grouping materials and labor (e.g., "1 sqm of 6-inch CHB Wall"). This is advanced but necessary; it should be its own distinct tab or toggle to avoid cluttering raw material lists.

## 5. Risks and Anti-Patterns to Avoid

*   **The "Marketing" UI Trap:** Using large paddings, massive 16px+ typography, and excessive whitespace. This is a workspace; it must be dense. Low information density forces endless scrolling and infuriates estimators.
*   **Page Navigations for Edits:** Navigating to `/components/[id]/edit` for simple price tweaks breaks flow. Use inline table edits or side drawers exclusively.
*   **Rigid Taxonomy:** Forcing users into a deeply nested 6-level CSI structure when they just want a flat list of "Paint." The tree must support shallow hierarchies.
*   **"Ghost" Updates:** Updating a global component price without explicitly warning the user how this impacts existing, in-progress estimates. (Need clear "Update Library Only" vs. "Push to Active Estimates" logic, though the latter is complex and should be handled carefully).
*   **Over-reliance on Icons:** Using obscure icons for construction terms. Use text labels (even abbreviated, e.g., `Mat`, `Lab`, `Eqp`) at 10px-11px font sizes over ambiguous iconography.

## 6. Screen-by-Screen Recommendations for `/workshop/components`

**Screen 1: The Default Workspace (Grid View)**
*   **Left:** Tree list of `Categories`. Includes a top node for "Uncategorized".
*   **Top Bar:** Search input, Filters dropdown (Supplier, Type: Material/Labor/Equip).
*   **Center:** Dense Data Table. Zebra striping for readability. Column headers sortable. The `Unit Cost` column has a slight background tint to indicate it is the most critical numeric data. The `Last Updated` column shows a warning icon (triangle) if older than user-defined threshold.

**Screen 2: The Stale Price Review Flow**
*   User clicks the `Needs Review` tab.
*   The grid filters strictly to items flagged.
*   A batch action bar appears at the top: `Request Quotes (Export CSV)` or `Mark as Reviewed`.
*   Users can tab through the `Unit Cost` column, typing new numbers like a spreadsheet. Hit Enter to save and move down.

**Screen 3: Item Detail Drawer (Create/Edit)**
*   Triggered via `+ New Component` or clicking a row.
*   Slides in from the right, taking up ~40% of the screen.
*   **Header:** Component Name (H2, maybe 14px - the only slightly larger text), Status Badge.
*   **Body:** Grid of dense form fields.
    *   *Section 1: Identity:* Name, Category (dropdown tree), SKU/Code, Type (Radio: Material/Labor/Equipment).
    *   *Section 2: Costing:* Base Cost, Unit of Measure (UOM), Waste Factor %, Supplier.
    *   *Section 3: Metadata:* Notes, Link to spec sheet.
*   **Footer:** `Save` (primary), `Cancel` (ghost). Sticky to the bottom of the drawer.

## 7. Sources and Methodology

*   *Search Strategy:* Initial attempts to query `"construction estimating" AND "component library" AND "UX"` via Google Web Search yielded no specific contextual results.
*   *Methodology:* This memo was synthesized using established internal domain knowledge of:
    *   Data-heavy SaaS application design patterns (linear, split-pane, dense grids).
    *   Standard construction estimating software workflows (Procore, Buildertrend, RSMeans, CostX).
    *   The localized realities of Philippine construction estimating (supplier-driven pricing, customized vs. standardized MasterFormat structures, per-piece unit measurements).
    *   The strict app constraints provided in the prompt (dense, <= 12px fonts, no marketing UI).

# 01 — Design Brief

## 1. Feature summary

One Library page at `/workshop/library` that holds everything reusable: cost components today, estimate templates today, supplier catalogues later. Estimators open it to maintain their catalogue, compose templates, and pull both into estimates. It replaces two sibling pages that were 80% visual twins but behaved inconsistently (Components had add/archive but no detail view; Templates had nothing but browsing).

## 2. Primary user action

**Components tab:** find a component fast, trust its price, and act on it (inspect, edit, add).
**Templates tab:** open a template and shape it like an estimate — drag components in, adjust quantities, then push it into a real estimate.

## 3. Visual thesis

The unified Library is not a new design; it is the estimate workspace's grammar applied to reusable content. Tree left, sheet center, dock right, file-folder tabs, 40px icon toolbars, 10px SF Pro, hairline borders, 3px radius. A user who knows the estimate page already knows this page. The only new vocabulary is the **TEMPLATE mode chip** and breadcrumb that tell you which kind of thing you are editing.

- **Register:** product (DESIGN.md app/workshop system applies in full).
- **Color strategy:** Restrained — neutral surfaces, ink primary actions, semantic colors only for lifecycle/confidence states. No new accent color for templates (see Decision D6).
- **Anchor references:** the estimate sheet page (`/workshop/projects/[projectId]/estimates/[nodeId]`) for layout/toolbar/dock; the existing `EstimateRightSidebar` Components|Templates tabs for the tab pattern; the current Library page for the catalogue grid.

## 4. The seven decisions (and why)

### D1 — Tabs, not a merged tree. Components and Templates stay separate tabs.
A single combined tree ("folders containing both components and templates") was considered and rejected: the two content types have different schemas, different hierarchies (`component_category_nodes`/`library_folders` vs `estimate_templates.category` + template nodes), different center-pane layouts (card grid vs sheet), and different mental models (atoms vs assemblies). The estimate dock already presents them as two tabs and users have accepted that. The unification is in the *page*, the *grammar*, and the *navigation*, not in the data.

### D2 — Default landing = Library Overview home. **[PHILIP DECISION 2026-06-11]**
Philip chose to ship the "default main page" in v1 (overriding the components-first recommendation). `/workshop/library` renders an **Overview** tab: cross-library search (`Search components and templates`, ⌘K), `Add component` + `New template` creates, a recent-components card row, a recent-templates row list, and a **library health line** (prices older than 90 days, discontinued items still in use, components missing a brand, last update). The health line is what makes the overview a work surface rather than a corridor: it routes estimators to maintenance tasks the audits showed they currently can't see. The tab strip is `Overview | Components | Templates`, and when Supplier catalogues arrive the overview gains a suppliers section without any URL migration. Full spec in `03_SCREEN_SPECS.md` §0; mockup `mockups/00-library-home.html`.

### D3 — Each tab is a real sub-route, not client state.
`/workshop/library/components` and `/workshop/library/templates`, with `/workshop/library` rendering Components. Bookmarkable, sharable, back-button-correct, and each route server-fetches only its own dataset (the Templates tab no longer pays for 154 components it doesn't show, and vice versa). Precedent: `/workshop/components` → `/workshop/library` redirect already exists; `/workshop/templates` gets the same treatment.

### D4 — Trees move to the LEFT; the right side becomes a contextual dock.
Today both pages put the tree on the right. The estimate workspace — the explicitly chosen benchmark — puts navigation on the left and contextual tools on the right, and DESIGN.md codifies exactly that ("secondary rail left, right dock context-sensitive"). Unifying means every workshop surface reads the same: **[rail | navigate | work | context]**. The right dock then has a consistent meaning everywhere: on Components it's the detail inspector (closing audit gap C1/P1-3), on Templates-browse it's the template preview, in the template editor it's the Components palette for drag-and-drop.

### D5 — Opening a template turns the center into an estimate-style editable sheet.
This is the heart of the unification. Templates ARE estimate subtrees (`estimate_template_nodes` mirror `estimate_nodes`; rows reference `source_library_item_id`), so they should be edited like estimates: group/area header rows, item rows with qty/unit/unit-cost/total, inline editing, drag-to-reorder, drop zones for components dragged from the right dock. The browse state (gallery cards) stays for orientation; "Open" enters the editor at `/workshop/library/templates/[templateId]`.

### D6 — Template mode is differentiated by structure and labels, not color.
Philip asked "maybe different colors or what not?" Recommendation: no. DESIGN.md reserves color for semantic meaning, and a tinted sheet would read as a state (warning/selected), not a place. The estimate page and template editor are instead distinguished by what surrounds the grid:
- Breadcrumb `Library / Templates / {Group} / {Name}` instead of project context;
- A compact **TEMPLATE** mode chip (Blueprint-style icon, muted bg, 8px label) beside the title;
- No project toolbar, no version/issue/export actions, no financial summary cards — just `Template total` in the sheet footer with the caption "Totals are reference pricing: estimates re-price on insert";
- "Insert into estimate ▾" as the persistent header action (a verb estimates never show).
If after Phase 3 usability checks users still confuse the two, the approved fallback is a hairline-bordered full-width mode bar under the title (still neutral), not color. **[CONFIRMED BY PHILIP 2026-06-11: structure + labels only, no tint.]**

### D7 — Both trees are user-organizable with the same interactions.
The point of the library is that users own its structure. Both tabs' left trees support: drag-to-reorganize (folders/categories and leaves), right-click context menus (New / Rename / Delete / Duplicate), and inline rename. The templates tree already has `renameEstimateTemplate` / `deleteEstimateTemplate` server actions and stored sibling order from the templates-panel work; the components tree reuses the `library_folders` mechanics. No hover "+" buttons — context menu + drag only, matching the Phase-5 decision from the templates-panel plan.

## 5. Key states (summary; full matrix in 03_SCREEN_SPECS.md)

- **Components tab:** default grid · folder-filtered · searched (count strip + clear) · no results · empty workspace (first-run teach state) · item selected (inspector open) · bulk-select (archive flow) · loading skeleton · error retry.
- **Templates browse:** default gallery · group-filtered · searched · no results · empty ("Create your first template" + "or save a structure from any estimate") · template selected (preview dock) · loading · error.
- **Template editor:** populated sheet · empty template (drop-target hero zone) · drag-over (drop zones visible) · row selected · saving/saved indicator · insert-into-estimate picker open · error.

## 6. Interaction model (deltas from today)

- **One header row per panel** (Philip-confirmed 2026-06-11): every sheet and tree panel uses a single 40px `TreePanelHeader` row holding ALL controls — search as the magnifier-icon disclosure (the `EstimateSheetHeader` pattern), filter, expand/collapse, and add actions. No persistent search inputs in panels; `⌘K` opens and focuses the disclosure (`searchInputRef`). The disclosure pattern is the documented dense-header exception that satisfies audit R6. The Overview home keeps its persistent cross-library search because it is page content, not panel chrome.
- **No inert controls anywhere** (audit P1-1 / Templates finding 2): Filter ships wired-or-hidden; Group is dropped from v1.
- Component card click → inspector dock (no navigation). Template card click → preview dock; Open button / double-click → editor route.
- Drag: components dock → template sheet rows or left-tree groups, using the existing `application/x-archestimator-library-item` payload and `estimate-workshop-drag` store; same drop-zone choreography as the estimate sheet.
- Keyboard: full tab traversal, APG tree keys, `⌘K` search, Enter opens, F2/double-click renames, Del with confirm. Acceptance criteria in audit doc 12 apply verbatim.

## 7. Content requirements (copy, verbatim)

- Tab labels: `Components`, `Templates` (+counts). Never "Library" as a tab label — the page is the Library.
- Context strips: `{Folder} · {n} components`, `{Group} · {n} templates` — singular/plural correct (fixes the "1 groups" bug).
- Empty library: title `Build your component library` body `Add your first component, or import from a price list.` CTA `Add component`.
- Empty templates: title `No templates yet` body `Create a template from scratch, or save any estimate group as a template from the estimate page.` CTA `New template`.
- Empty template (editor): `Drag components here from the right panel, or add a group to start the structure.`
- Search no-results: `No components match "{q}"` / `No templates match "{q}"` + `Clear search` action.
- Mode chip: `TEMPLATE`. Footer caption: `Totals are reference pricing: estimates re-price on insert`.
- Destructive: `Delete template?` body `"{name}" will be removed from the library. Estimates already built from it keep their rows.` confirm `Delete template`.

## 8. Anti-goals

- Do not redesign the estimate workspace or its right sidebar.
- Do not introduce a new visual system, accent color, or radius for templates.
- Do not build a combined components+templates tree or cross-type folders.
- The Overview tab (Philip-approved, D2) stays a work surface: search, recents, health line. Do not grow it into a metrics dashboard, chart wall, or marketing-style hero.
- Do not implement supplier catalogues now — only keep the seams clean (tab slot, route namespace, schema notes).
- Do not virtualize lists preemptively; the audit's measurement gates stand.

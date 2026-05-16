# Programa.design Product and UI Research

**Date accessed:** 2026-05-16
**Subject:** Programa.design
**Purpose:** Extract product, UX, and visual-design insights relevant to Archestimator.
**Status:** Research note, not an implementation spec.

## Sources reviewed

- https://programa.design/
- https://programa.design/features/product-libraries
- https://programa.design/features/schedules-for-interior-designers
- https://programa.design/features/client-dashboard
- https://programa.design/pricing
- https://programa.design/blog/new-design-system

## Executive summary

Programa is positioned as polished operational software for interior designers and architects. Its strongest relevant patterns for Archestimator are not superficial styling alone. The real lessons are:

1. spreadsheet-like professional documents can be modernized without abandoning their mental model;
2. a reusable library can be a core workflow surface, not a settings page;
3. product/spec records should flow into schedules with minimal re-entry;
4. live links reduce outdated-file chaos;
5. client dashboards turn internal data into controlled external communication;
6. a design system can be sold as a productivity foundation, not only a visual refresh.

Archestimator should borrow the workflow philosophy, not copy the interior-design domain.

## Observed product positioning

Programa's homepage headline:

> Beautiful software for interior designers & architects.

Homepage submessage:

> Streamline your workflow and unlock your studio's potential.

Feature-page themes:

- specification tools;
- schedules;
- product library;
- web clipper;
- client dashboard;
- approvals;
- project management;
- purchase orders;
- invoicing.

The positioning is emotional but grounded in operational pain: spreadsheets, admin burden, supplier chasing, manual data entry, scattered information, and version-control problems.

## Visual language observations

### Overall style

- large confident sans-serif display type;
- generous white space;
- black/white base palette;
- strong yellow primary CTA accent;
- editorial images of design studios/interiors;
- product screenshots embedded as polished cards rather than raw full-screen dumps;
- soft rounded cards and controlled depth;
- short benefit-led section titles.

### Important UI marketing pattern

Programa does not lead with a dense enterprise screenshot. It shows small legible UI moments:

- product cards;
- schedule excerpts;
- library search panels;
- client-facing dashboard previews;
- web clipper cards.

This makes complex software feel approachable.

### Archestimator implication

For Archestimator's future marketing and app UI, avoid presenting the product as a raw estimating spreadsheet. Show compact, beautiful product moments:

- estimate summary card;
- material/labor cost split;
- cost library search;
- revision delta card;
- proposal package preview;
- source/pricing-date card;
- approval/conforme status.

## Key product patterns to adapt

## 1. Schedules as modernized spreadsheets

Programa's schedules are spreadsheet-adjacent but richer. They combine:

- rows and columns;
- images/product thumbnails;
- product metadata;
- supplier/product links;
- approval states;
- financial fields;
- sharing and dashboards.

### Archestimator adaptation

Archestimator should keep the estimate sheet familiar:

- sections;
- line items;
- quantity;
- unit;
- unit cost;
- material/labor split;
- totals.

But enrich it with:

- linked library source;
- scope status;
- pricing date;
- supplier/source URL;
- remarks and assumptions;
- proposal visibility state;
- version/revision state;
- internal/client/subcontractor display modes.

## 2. Product Library as reusable studio memory

Programa's product library page emphasizes:

- central product hub;
- supplier contacts;
- complete product details;
- specifications;
- notes;
- advanced search/filtering;
- inserting products into schedules;
- itemized quotes.

This validates Archestimator's current library direction.

### Archestimator adaptation

Archestimator's equivalent should be a Cost / Material / Assembly Library with:

- master workspace library;
- project-specific library;
- materials;
- labor rates;
- equipment rates;
- subcontract items;
- assemblies;
- supplier/vendor information;
- source URL;
- pricing date;
- dimensions/specs;
- default waste/markup;
- standard remarks/scope statuses;
- linked-row insertion with snapshot and override behavior.

## 3. Search and "add custom item" insertion pattern

Programa's product-library UI shows a search-style insertion flow and an option equivalent to adding a custom product when the item is not found.

### Archestimator adaptation

The estimate-sheet library panel should support:

1. search item;
2. filter by material/labor/equipment/subcontract/assembly;
3. drag/drop or click insert;
4. if not found, create custom estimate row;
5. optionally save custom row to project library or master library.

This prevents a dead-end workflow.

## 4. Web Clipper / external capture workflow

Programa's Web Clipper captures products from supplier pages into the product library/schedule workflow.

### Archestimator adaptation

Archestimator should later consider a capture workflow for:

- supplier product pages;
- material price pages;
- PDF catalog/spec sheets;
- supplier quote PDFs;
- screenshots of price lists;
- manufacturer data sheets.

Captured information should include:

- item name;
- brand/model/SKU;
- unit price;
- dimensions/specs;
- supplier;
- source URL/file;
- date captured;
- image;
- confidence/review status.

This is not first-cut MVP unless kept very small, but it is strategically aligned.

## 5. Live links and version-control pain

Programa explicitly uses the phrase "Version Control Eradicated" and frames browser-based live schedules as the antidote to stale spreadsheet files.

### Caution for Archestimator

Construction estimating cannot simply erase version control. Contractors need historical accountability:

- bid versions;
- issued proposals;
- change orders;
- alternates;
- scope revisions;
- locked commercial records.

Archestimator should therefore combine:

- a live current working estimate;
- named revisions;
- immutable issued proposal snapshots;
- restore-as-copy behavior;
- comparison/delta tools.

The marketing promise can be:

> No more outdated estimate files. Keep one live source of truth with every issued version safely preserved.

## 6. Client dashboard and controlled sharing

Programa's client dashboard messaging emphasizes:

- project links;
- feedback;
- branded dashboard;
- document accessibility;
- client relationships;
- links, QR codes, and custom dashboards.

### Archestimator adaptation

Archestimator should eventually support role-sensitive views:

- internal estimator view;
- client proposal view;
- architect/designer review view;
- subcontractor quote-request view;
- procurement handoff view.

Important controls:

- hide internal margin/markup;
- show only client-approved totals;
- allow comments/approvals per section or alternate;
- show exclusions/assumptions clearly;
- preserve issued proposal snapshots.

## 7. Design system as shipping velocity

Programa's design-system blog says the refresh involved:

- cleaner layouts;
- improved typography;
- better spacing;
- calmer visual feel;
- standardized buttons/icons/patterns;
- subtle depth/layering;
- preserved workflow;
- faster feature shipping.

The strongest line is conceptual: the design system is not decoration; it is a foundation for shipping faster with less inconsistency.

### Archestimator adaptation

Before implementation, Archestimator should maintain a formal design source of truth so agents do not improvise inconsistent UI. Google's DESIGN.md is well matched for this.

## Potential Archestimator principles inspired by Programa

1. Keep estimates familiar, but remove spreadsheet chaos.
2. Make the library a working panel, not a configuration page.
3. Prefer live source-of-truth links plus immutable commercial snapshots.
4. Treat proposal packages as controlled client communication.
5. Use polished micro-screens rather than overwhelming full screenshots.
6. Use one strong accent color for primary action.
7. Use calm, high-density professional UI for long work sessions.
8. Standardize patterns early so agentic implementation does not drift.

## Risks if copied incorrectly

- Programa serves interior designers; Archestimator serves contractors/architects/estimators. Estimating requires more auditability and numeric rigor.
- Live update marketing must not imply issued proposals mutate.
- Beautiful product cards should not obscure required BOQ/detail-table workflows.
- Client dashboards must protect internal margin and cost breakdowns.
- A web clipper can introduce pricing errors if no source/date/review status is captured.

## Recommended Archestimator follow-up

Do not start screen architecture yet. First create a design-system foundation:

1. research and decide Archestimator's visual identity principles;
2. create `DESIGN.md` in the project root;
3. validate it with `npx @google/design.md lint DESIGN.md`;
4. export Tailwind/DTCG tokens when stack is chosen;
5. use the file as the agentic UI source of truth.

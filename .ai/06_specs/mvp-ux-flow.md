# Archestimator MVP UX Flow

**Date:** 2026-05-16
**Status:** Draft v0.1
**Primary user:** Contractor handling multiple projects and frequent design changes

## UX north star

The user should be able to produce a credible editable estimate faster than they can rebuild an Excel sheet from scratch.

Primary success moment:

> “A client changed the design. I duplicated the estimate, adjusted the changed scope, and immediately saw the cost delta and a clean quote revision.”

## MVP navigation model

Recommended first app surfaces:

1. Dashboard
2. Projects
3. Project Detail
4. Estimate Sheet
5. Version History / Revision Delta
6. Cost Library
7. Proposal Package / Export Preview
8. Settings, light only

Avoid first-MVP surfaces:

- full project planner
- FF&E/spec manager
- supplier marketplace
- enterprise admin
- full CAD/takeoff workspace

---

## Flow 1 — Contractor dashboard

### User goal

See active estimating work and jump back into the right project quickly.

### Screen sections

- Active estimates needing action
- Recently changed estimates
- Projects list
- Quick actions:
  - New Project
  - New Estimate from Template
  - Import Excel/CSV, later
  - Open Cost Library

### Key information

Project cards should show:

- project name
- client
- location
- latest estimate total
- latest revision label
- last updated
- status: draft / sent / approved / superseded

### MVP acceptance criteria

- User can create a project in under 30 seconds.
- User can resume the last estimate in one click.
- User can see which estimates changed recently.

---

## Flow 2 — Create project

### User goal

Start an estimate without filling an enterprise project-management form.

### Required fields

- Project name
- Client name, optional but visible
- Location, optional
- Project type, optional:
  - residential
  - renovation
  - fit-out
  - small commercial
  - custom

### Optional fields

- notes
- target budget
- preferred margin/markup
- default contingency

### UX rule

Do not block estimate creation because optional project metadata is missing.

---

## Flow 3 — Create estimate

### User goal

Create an estimate from blank, prior estimate, or a simple template.

### Entry points

- New blank estimate
- From template
- Duplicate existing estimate
- Import from spreadsheet, later

### Template examples

- Basic residential renovation
- Fit-out estimate
- Kitchen/bath renovation
- Flooring/tile work
- General contractor rough estimate

### Estimate setup fields

- estimate name
- version/revision label: Initial / Rev 01 / Option A / client-requested change, etc.
- change reason, optional but encouraged when duplicating
- pricing basis date
- default markup
- default contingency
- tax/VAT setting, later

### MVP acceptance criteria

- Estimate can be created without choosing a complex template.
- Duplicate/version flow is visible from day one.
- User can distinguish a working draft from an issued proposal snapshot.

---

## Flow 3A — Project / estimate version history

### User goal

Recover, compare, and manage frequent project changes without losing prior work or issued proposal records.

### UX pattern

Archestimator should use contractor-friendly Notion-like history behavior:

- autosave quietly while editing;
- keep a visible version history panel;
- allow named versions such as Initial, Rev 01, Option B, Value Engineering;
- allow restore-as-copy rather than destructive rollback by default;
- show issued proposal snapshots separately from editable drafts;
- compare current estimate against a prior estimate or last issued proposal.

### Version history panel sections

- Current working estimate
- Named estimate versions/revisions
- Issued proposal snapshots
- Recent autosave history
- Project activity timeline

### User actions

- Save named version
- Duplicate as revision
- Compare changes
- Restore as copy
- View issued proposal
- Mark version/proposal as superseded
- Create change order from difference, later

### MVP acceptance criteria

- User can duplicate an estimate as a revision without changing the parent estimate.
- User can see prior named versions and issued proposal snapshots.
- User can compare old vs new totals and changed rows.
- Issued proposal snapshots remain stable even when the estimate or library changes later.

---

## Flow 4 — Estimate sheet

### User goal

Build and edit the actual estimate in a familiar spreadsheet-like interface.

### Core layout

- Top bar:
  - project name
  - estimate version
  - status
  - total
  - save state
  - export button
- Left or top section navigation:
  - General Requirements
  - Site Works
  - Concrete/Masonry
  - Finishes
  - Electrical
  - Plumbing
  - Custom sections
- Main grid:
  - line items
- Right inspector, optional:
  - selected row details
  - assumptions
  - source/pricing notes
  - revision history

### Core columns

Minimum MVP columns:

1. Section
2. Item / Scope
3. Description / Specification
4. Quantity
5. Unit
6. Unit Cost
7. Subtotal
8. Markup / Margin, optional column
9. Contingency / Waste, optional column
10. Total
11. Source / Notes

### Keyboard behaviors

Important because contractors and estimators are Excel-trained:

- Tab / Enter moves cell focus predictably
- Copy/paste rows or cells from Excel-like tables
- Add row quickly
- Duplicate row
- Bulk delete rows
- Undo/redo, ideally
- Inline edit without modal friction

### Calculation rules

- `subtotal = quantity × unitCost`
- row total may include markup, contingency, or supplementary cost depending on MVP decision
- section totals roll up automatically
- estimate total rolls up from sections

### Trust rules

Every generated or suggested row should expose:

- source: manual, template, prior project, calculator, AI suggestion, supplier quote
- pricing date, if known
- assumptions/confidence note

### MVP acceptance criteria

- User can build a small estimate without opening settings.
- User can edit quantities and unit costs inline.
- Totals update immediately.
- User can add custom sections and line items.

---

## Flow 5 — Quick calculators/templates to line items

### User goal

Use fast helpers for repetitive construction calculations without leaving the estimate.

### First calculator candidates

- tile quantity with waste/contingency
- paint area coverage
- concrete volume
- CHB/block count
- simple flooring area
- labor-day allowance, later

### UX pattern

1. User clicks `Add from Calculator`.
2. User selects helper.
3. User enters dimensions/assumptions.
4. App previews calculation.
5. User inserts result as an editable line item.

### Important rule

Calculators are not separate dead-end tools. They should produce estimate rows.

---

## Flow 6 — Cost library

### User goal

Reuse common materials, labor rates, assemblies, and company pricing assumptions.

### MVP library item fields

- name
- category
- unit
- default unit cost
- source
- pricing date
- supplier optional
- notes

### UX pattern

The library should not feel like a separate settings page. It should behave like a reusable estimating palette inside the estimate sheet.

Primary pattern:

- A floating or docked library panel is available from the estimate sheet.
- User searches or filters materials, labor rates, equipment, subcontract items, or assemblies.
- User drags an item from the library into the spreadsheet/grid.
- App creates an editable estimate line item with a link back to the source library item.
- User can override quantity, unit cost, waste, markup, notes, or description for this project.
- User can choose whether the row stays linked to the library item or becomes a project-specific detached copy.
- User can save a useful edited row back to the library as a new reusable item or update the existing library item if intentional.

### Floating library panel behavior

Recommended first design:

- Right-side drawer or floating panel labeled `Library`.
- Search-first interface, because contractors will want to type “tile”, “paint”, “CHB”, “labor”, etc.
- Filter chips:
  - Materials
  - Labor
  - Equipment
  - Subcontract
  - Assemblies
  - Project-specific
  - Recently used
- Drag/drop into a section or row position.
- Click-to-insert fallback for users who do not like drag/drop.
- Preview card shows:
  - name
  - unit
  - default unit cost
  - dimensions/specs, if relevant
  - source/pricing date
  - linked/project/custom badge

### Linked vs detached behavior

A library drop should create a copied row with a relationship, not a live spreadsheet formula that silently changes totals.

Row states:

1. `Linked clean`
   - row still matches current library defaults for synced fields.
   - UI can show a subtle linked badge.
2. `Linked with local overrides`
   - row keeps source link, but project-specific values differ.
   - examples: unit cost changed for this client/project, different waste factor, different tile size.
   - UI should show which fields are overridden.
3. `Detached`
   - row is now a custom project line item.
   - no future library update prompts affect it.
4. `Library source changed`
   - original library item changed after the row was inserted.
   - app may offer `Review update`, but must not auto-change sent estimates.

User actions:

- `Unlink from library`: converts linked row to detached row while preserving current values.
- `Reset from library`: reverts selected fields to current library defaults.
- `Update library from this row`: intentional action, permission-gated later.
- `Save as new library item`: creates a reusable item from a project row.

### MVP acceptance criteria

- User can insert a cost item into a line item by search/click, with drag/drop as the preferred richer interaction.
- User can override price locally without mutating the master library.
- User can see whether a row is linked, locally overridden, or detached.
- User can unlink a dropped material/labor item and keep the project-specific row values.
- User can see that the price is not authoritative unless sourced and dated.

---

## Flow 7 — Design change / estimate revision

### User goal

Update an estimate when the client/design changes and explain the difference.

### Revision creation

Entry points:

- Duplicate estimate as new revision
- Create change order from selected rows
- Add design-change note

### Revision delta screen

Show:

- previous total
- new total
- net change
- added rows
- removed rows
- changed rows:
  - quantity changed
  - unit cost changed
  - scope/spec changed
- notes for client explanation

### UX language

Use contractor/client-friendly labels:

- Added scope
- Removed scope
- Quantity changed
- Price changed
- New total
- Difference from previous estimate

### MVP acceptance criteria

- User can duplicate an estimate as Rev 01.
- User can edit Rev 01 without losing initial estimate.
- App can show total delta and changed rows.

---

## Flow 8 — Proposal package / export preview

### User goal

Send a professional client-ready proposal package, not just a spreadsheet printout.

### Proposal package concept

A contractor proposal is a layered document:

1. cover/title information;
2. proposal/transmittal letter;
3. cost summary by division/section;
4. detailed estimate or BOQ table;
5. commercial terms, exclusions, owner-supplied items, validity, duration, warranty, and signature blocks.

Archestimator should treat the proposal as a generated package from estimate data plus proposal terms.

### MVP export formats

Prioritize:

1. PDF / print proposal
2. Excel / XLSX detailed estimate
3. CSV, optional

### Proposal sections

- cover/title page, optional but supported
- contractor/company header
- project/client info
- architect/designer/through-contact, optional
- estimate revision label
- proposal date
- proposal letter with total amount in words and figures
- summary total
- section/division totals
- contingency, VAT/tax, discount, and rounding/adjustment lines
- construction duration
- proposal validity
- detailed line item table, configurable detail level
- assumptions
- exclusions
- owner-supplied materials / owner-supplied contractor-installed items
- warranty
- payment terms
- disclaimer for additional works not included in scope
- signature/conforme blocks

### MVP acceptance criteria

- User can preview before exporting.
- User can choose client-facing summary vs detailed BOQ/proposal view, if feasible.
- Export matches on-screen totals.
- Proposal includes validity, duration, payment terms, exclusions, and signature/conforme fields.
- Proposal export is snapshotted so it remains stable even if the estimate or library changes later.

---

## Flow 9 — AI assistance, carefully scoped

AI should not be the product’s first trust bottleneck.

Good early AI roles:

- suggest line items from a plain-language scope note
- review estimate for missing common items
- summarize revision changes for client wording
- classify pasted spreadsheet rows
- flag vague assumptions

Risky early AI roles:

- fully automated final estimate
- hidden quantity takeoff from drawings without verification
- uneditable black-box unit pricing

UX rule:

AI output must land as editable suggestions with assumptions, not final truth.

---

## First prototype screen order

If we prototype before implementation, create screens in this order:

1. Project Dashboard
2. Project Detail with estimates, versions, and issued proposals list
3. Estimate Sheet
4. Version History panel
5. Add line item / add from library
6. Duplicate estimate as revision
7. Revision Delta
8. Proposal Package Preview
9. Export Preview

## Open UX questions

1. Should default organization be by area, trade, CSI-like division, or contractor-defined sections?
2. How much detail should client-facing exports show by default?
3. Should markup be global, per section, or per row?
4. Should labor and materials be separate columns in MVP?
5. Should Philippine VAT/tax be included in v1 or deferred?
6. Should unit-cost library be seeded or empty/user-owned first?

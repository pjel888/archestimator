# Archestimator Product Thesis

**Date:** 2026-05-16
**Status:** Working thesis for product definition

## One-sentence thesis

Archestimator helps contractors create construction cost estimates, BOQs, quote revisions, and client-ready proposals faster by combining spreadsheet-like estimating, reusable cost libraries, lightweight calculation helpers, and transparent assumptions.

## Target user

Primary first user:

- Contractors handling multiple active projects
- Small-to-mid construction firms that need fast estimates but do not have a dedicated full-time estimating/QS team for every change
- Contractors dealing with recurring design revisions, client requests, supplier price changes, and scope uncertainty

Secondary possible users later:

- Architects/design-build studios preparing rough construction budgets
- Quantity surveyors who need reusable templates and regional cost libraries
- Homeowners/developers comparing contractor proposals
- Suppliers responding to RFQs

## Core user problem

When a project comes in, the contractor must produce an estimate. This often takes too long because:

- contractors are handling multiple projects at once
- design changes keep altering quantities, materials, and scope
- estimates are often rebuilt in Excel or copied from old projects
- supplier pricing and labor assumptions may be scattered
- proposal formatting and client communication add more time
- estimate revisions are hard to compare cleanly

## Product promise

Archestimator should make construction cost estimating:

- **fast** — create a useful first estimate quickly
- **easy** — spreadsheet-like, contractor-friendly, minimal setup
- **change-aware** — update estimates when designs or scope change
- **transparent** — show assumptions, quantities, unit costs, markups, and uncertainty
- **reusable** — learn from previous projects, templates, materials, and suppliers
- **client-ready** — export/share clean BOQs, quotes, and revision summaries

## Strategic wedge

Do not start as a full enterprise construction-management suite or a CAD-grade takeoff replacement.

Start as a contractor-first estimating workspace:

> Project → Estimate Version → Sections/Areas → Line Items → Totals → Revision Delta → Export

The first emotional win should be:

> “A design changed. I can update the estimate and explain the cost difference in minutes, not hours.”

## Core MVP workflow

1. Create project quickly.
2. Create an estimate from blank or template.
3. Add/edit line items in a fast spreadsheet-like sheet.
4. Organize items by section/area/trade.
5. Use quick calculators/templates for common tasks.
6. Apply quantities, units, unit costs, markup, contingency, and totals.
7. Duplicate/version an estimate when design changes happen.
8. Show what changed and the total cost delta.
9. Export/share as PDF/Excel/client quote.

## MVP data objects

### Project

- name
- client
- location
- status
- notes
- created/updated dates

### Estimate

- project ID
- version/revision label
- status: draft / sent / approved / superseded
- sections/areas
- total direct cost
- markup
- contingency
- grand total
- assumptions

### Section / Area

- estimate ID
- name
- description optional
- sort order
- parent optional, but MVP should prefer one-level sections unless nested hierarchy is truly needed

### Line Item

- section/area ID
- item name
- scope/spec description
- quantity
- unit
- unit cost
- subtotal
- supplementary costs
- markup/contingency optional
- supplier optional
- source: manual / template / material library / previous project / supplier quote
- assumption/confidence note

### Material / Cost Library Item

- name
- category/tags
- unit
- default unit cost
- pricing date
- source
- supplier optional
- variation optional

### Revision / Change

- estimate ID
- previous estimate ID
- change label
- changed line items
- added/removed items
- cost delta
- notes for client explanation

## MVP non-goals

Defer these unless user research proves they are the wedge:

- full supplier bidding platform
- project scheduling/planner
- 3D viewer
- FF&E/specification management
- complex multi-user permissions
- enterprise accounting/project-management suite
- full CAD/BIM takeoff engine
- marketplace of suppliers
- heavily nested recursive estimate tree as the default UX

## Product principles

1. **Speed beats completeness at first.** A contractor should get to a usable estimate quickly.
2. **Spreadsheet familiarity matters.** The UI should feel close enough to Excel to reduce fear.
3. **Assumptions must be visible.** Never imply false precision.
4. **Design changes are first-class.** Revisions and deltas should be core, not an afterthought.
5. **Local pricing must be editable.** Cost databases are helpful, but contractors trust their own prices.
6. **AI should assist, not hide math.** Any AI-generated estimate must expose quantities, assumptions, and confidence flags.

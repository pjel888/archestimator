# Legacy Archestimator Repo Lessons

**Date:** 2026-05-16
**Source:** Cloned GitHub repos from `pjel888` under `.ai/13_research/github-legacy-repos/clones/`

## Repos studied

- `archestimator_beta_v1` — Svelte/Vite calculator prototype
- `archestimator_old_frontend` — React/Vite estimate sheet and bid tracker prototype
- `archestimator_beta_v2` — React/Vite nested estimate component experiment
- `archestimator_beta_v3` — broader React/Vite workspace shell
- `archestimator.backend-beta-v1` — Express/tRPC/Mongoose backend prototype
- `archestimator-frontend-beta_v4` — React/Vite/TanStack/tRPC frontend prototype

## Product evolution found

### 1. Simple calculator phase

The earliest useful implementation was a tile calculator:

- Path: `archestimator_beta_v1/src/routes/estimates/Tile.svelte`
- Inputs: floor area, tile width, tile height, contingency
- Output: tile count and tile count with contingency
- Persistence: localStorage

Lesson: simple calculators are fast and contractor-friendly, but isolated calculators are not enough. They should become helpers that generate estimate line items.

### 2. Estimate sheet and bid workflow phase

The old React frontend explored a spreadsheet-like estimate sheet:

- Path: `archestimator_old_frontend/src/pages/EstimateSheet.tsx`
- Concepts: project metadata, sections, scope/spec/quantity/unit rows, editable cells
- Bid concepts: invite suppliers, invite contractors, invite client, choose supplier bid

Related bid tracker:

- Path: `archestimator_old_frontend/src/pages/BidInvitationTracker.tsx`
- Concepts: supplier name, contact person, contact details, bid sent date, status, version, bid link

Lesson: this is very close to real contractor behavior. The estimate sheet should be salvaged. Supplier bidding is valuable, but likely post-MVP.

### 3. Nested structure phase

Later repos explored parent-child estimate structures:

- Path: `archestimator_beta_v2/src/components/EstimateComponent.tsx`
- Concepts: children, nest under, nest out

Lesson: hierarchy is useful, but excessive tree manipulation can slow down the MVP. Start with Project → Section/Area → Line Item, then allow deeper nesting later.

### 4. Broad project workspace phase

`archestimator_beta_v3` explored a larger workspace:

- Path: `archestimator_beta_v3/src/pages/private/projects/IndividualProject/IndividualProject.tsx`
- Tabs: Overview, Viewer, Planner, Sheets, FF&E, Specs

Lesson: the long-term product could become broad, but this is too wide for the first MVP. It risks distracting from the fast-estimating wedge.

### 5. Backend estimate graph phase

The backend prototype modeled area, record, material, and supplier nodes.

Key paths:

- `archestimator.backend-beta-v1/modules/project-estimate/area-node/model/area-node-schema.ts`
- `archestimator.backend-beta-v1/modules/project-estimate/record-node/model/record-node-schema.ts`
- `archestimator.backend-beta-v1/modules/project-estimate/material-node/model/material-node-schema.ts`
- `archestimator.backend-beta-v1/modules/project-estimate/supplier-node/model/supplier-node-schema.ts`

Lesson: the domain model has useful primitives, but the implementation is not production-ready and should not be copied blindly.

## Salvage strongly

### Estimate sheet primitives

Keep:

- item/material
- description/spec
- quantity
- unit
- unit cost
- subtotal
- supplementary costs
- total
- supplier optional
- source/category optional

Evidence:

- `archestimator_old_frontend/src/pages/EstimateSheet.tsx`
- `archestimator-frontend-beta_v4/src/modules/projects/ProjectEstimateSheet/EstimateTable/useEstimateColumns.tsx`
- `archestimator.backend-beta-v1/modules/project-estimate/record-node/model/record-node-schema.ts`

### Simple project/area hierarchy

Keep the conceptual model:

- Project
- Estimate
- Section/Area
- Line Item

Evidence:

- area node schema with `parentAreaNodeId`
- v4 project estimate tree navigator
- v4 estimate sheet rows and breadcrumbs

### Material variation concept

Keep for later library work:

- material name
- description
- images
- variations
- cost per variation
- unit
- tags/custom properties

Evidence:

- `material-node-schema.ts`

### Supplier concept

Keep for post-MVP:

- company name
- business nature
- product tags
- contacts
- online presence

Evidence:

- `supplier-node-schema.ts`
- old bid tracker

### Calculator-to-line-item pattern

Tile calculator logic should become a template/helper that outputs an editable line item.

Example:

- User enters floor area, tile size, waste/contingency
- Archestimator calculates quantity
- Output becomes line item: Tiles, quantity, unit, assumptions

## Discard or avoid

- Copying old implementations directly
- Svelte v1 app as foundation
- Hardcoded fake project/estimate data
- Overbroad workspace tabs in MVP: Viewer, Planner, FF&E, Specs
- Full supplier bid workflows in first MVP
- Complex permission/history model before product fit
- Deep recursive tree UX as the primary user experience
- Backend schema/router inconsistencies from the old backend
- LocalStorage-only persistence for real estimates

## New MVP influence

The new product should combine the best legacy ideas into one focused wedge:

> A fast spreadsheet-like construction estimate organized by project/area, backed by reusable cost libraries, quick calculators/templates, and revision/change handling.

## Legacy archaeology bottom line

Archestimator should not be just a calculator and should not start as a full project-management platform.

The strongest product core is:

**Fast estimate sheet + reusable line-item/cost library + design-change revisions + export/share.**

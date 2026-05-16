# Archestimator Initial Data Model

**Date:** 2026-05-16
**Status:** Draft v0.1
**Purpose:** Stack-agnostic domain model before selecting database/ORM.

## Modeling principle

Keep the MVP model simple enough to implement quickly, but structured enough to support revision comparison, exports, reusable cost items, and future supplier workflows.

Recommended MVP hierarchy:

> Account/User → Project → Estimate → Section → Line Item

Supporting objects:

> Cost Library Item, Estimate Revision, Export, Assumption/Source Note

Do not start with the legacy repo’s full area-node/record-node graph unless the UX demands it.

---

## Entity: User

Represents an app user/contractor.

Fields:

- `id`
- `name`
- `email`
- `companyName`, optional
- `role`, optional: owner/admin/member
- `createdAt`
- `updatedAt`

Future:

- team membership
- permissions
- audit logs

---

## Entity: Company / Workspace

Represents the contractor company or estimating workspace.

Fields:

- `id`
- `name`
- `defaultCurrency`, example `PHP`
- `defaultMarkupPercent`
- `defaultContingencyPercent`
- `defaultTaxPercent`, optional
- `defaultProposalValidityDays`, optional
- `defaultProjectDurationDays`, optional
- `defaultWarrantyMonths`, optional
- `defaultPaymentTermsText`, optional
- `logoUrl`, optional
- `address`, optional
- `createdAt`
- `updatedAt`

MVP note:

If auth/workspaces are deferred, this can be collapsed into user settings temporarily, but keep the conceptual boundary.

---

## Entity: Project

Represents a construction project being estimated.

Fields:

- `id`
- `workspaceId`
- `name`
- `clientName`
- `location`
- `projectType`: residential / renovation / fit-out / small-commercial / custom
- `status`: active / archived / won / lost
- `notes`
- `currentEstimateId`, optional
- `lastIssuedProposalPackageId`, optional
- `createdAt`
- `updatedAt`

Derived:

- latest estimate total
- latest estimate revision
- last activity date

---

## Entity: Estimate

Represents one estimate version/revision for a project.

Fields:

- `id`
- `projectId`
- `parentEstimateId`, nullable for revision lineage
- `originEstimateId`, nullable for first ancestor/baseline
- `currentSnapshotId`, optional
- `lastIssuedProposalPackageId`, optional
- `name`
- `versionLabel`, examples: Initial, Rev 01, Client Option A
- `versionNumber`, optional sequential display number
- `changeReason`, optional
- `status`: draft / under-review / proposal-issued / approved / superseded / rejected / archived
- `pricingDate`
- `currency`
- `defaultMarkupPercent`
- `defaultContingencyPercent`
- `taxPercent`, optional
- `contingencyMode`: percent / fixed / round-up-adjustment, optional
- `roundingAdjustment`, optional
- `discountAmount`, optional
- `proposalValidityDays`, optional
- `projectDurationDays`, optional
- `warrantyMonths`, optional
- `paymentTermsText`, optional
- `assumptionsText`
- `exclusionsText`
- `createdAt`
- `updatedAt`

Derived totals:

- `directCostTotal`
- `markupTotal`
- `contingencyTotal`
- `taxTotal`
- `grandTotal`

Implementation note:

Store derived totals either as cached snapshot fields or compute on read. For export/version integrity, snapshot totals at export/send time.

---

## Entity: EstimateSection

Represents an estimate grouping: area, trade, phase, or contractor-defined section.

Fields:

- `id`
- `estimateId`
- `parentSectionId`, nullable; avoid deep nesting in MVP UI
- `name`
- `description`
- `sortOrder`
- `sectionType`: area / trade / phase / custom
- `outlineCode`, optional proposal numbering/code such as A, B, 1, 1.1
- `level`, optional hierarchy level for proposal display
- `displayInProposal`, boolean
- `createdAt`
- `updatedAt`

Derived:

- section direct cost
- section total cost

MVP recommendation:

Support `parentSectionId` in the model if easy, but UI should start with one-level sections.

---

## Entity: EstimateLineItem

Represents the main row in the estimate sheet.

Fields:

- `id`
- `estimateId`
- `sectionId`
- `sortOrder`
- `itemName`
- `description`
- `outlineCode`, optional proposal row numbering such as 3.4.1
- `tagCode`, optional material/spec/registry code such as GEN_134, WAF_136, FLF_022
- `locationArea`, optional room/area label
- `quantity`
- `unit`
- `unitCost`, optional combined unit cost for simple rows
- `materialUnitCost`, optional
- `laborUnitCost`, optional
- `directLineTotal`, optional for lump-sum rows without unit-cost split
- `costType`: material / labor / equipment / subcontract / other
- `scopeStatus`: included / excluded / owner-supplied / owner-supplied-contractor-installed / by-others / not-applicable / allowance / provisional / to-follow / verify-architect / verify-site-condition
- `isIncludedInTotal`, boolean
- `markupPercent`, nullable override
- `contingencyPercent`, nullable override
- `supplierName`, optional denormalized text for MVP
- `costLibraryItemId`, nullable source link to master library item
- `projectLibraryItemId`, nullable source link to project-specific library item
- `libraryLinkState`: unlinked / linked-clean / linked-overridden / detached / source-changed
- `librarySnapshotJson`, snapshot of key library fields at insertion time
- `overriddenFields[]`, list of fields changed locally after insertion
- `sourceType`: manual / template / library / project-library / calculator / previous-project / ai-suggestion / supplier-quote
- `originLineItemId`, nullable for copied revision rows
- `originEstimateId`, nullable for copied revision rows
- `sourceNote`
- `confidence`: high / medium / low / needs-review
- `createdAt`
- `updatedAt`

Derived formulas:

- simple row: `subtotal = quantity × unitCost`
- split row: `materialSubtotal = quantity × materialUnitCost`
- split row: `laborSubtotal = quantity × laborUnitCost`
- lump-sum row: `subtotal = directLineTotal`
- `markupAmount = subtotal × markupPercent`
- `contingencyAmount = subtotal × contingencyPercent`
- `total = subtotal + markupAmount + contingencyAmount`
- excluded / not-applicable / by-others rows should not contribute to totals unless explicitly configured

Important validation:

- quantity must be >= 0
- unit cost must be >= 0
- unit required when quantity is present
- source/confidence required for AI-generated suggestions

---

## Entity: CostLibraryItem

Represents reusable company pricing or material/labor item in the master workspace library.

Fields:

- `id`
- `workspaceId`
- `name`
- `description`
- `category`
- `itemType`: material / labor / equipment / subcontract / assembly / other
- `unit`
- `defaultUnitCost`
- `currency`
- `pricingDate`
- `sourceType`: user-entered / supplier-price-list / previous-project / imported / reference
- `sourceName`
- `supplierName`, optional
- `dimensionsJson`, optional for products like tile size, board size, roll size, bag coverage, etc.
- `defaultWastePercent`, optional
- `defaultMarkupPercent`, optional
- `tags[]`
- `tagCode`, optional spec/registry code
- `brand`, optional
- `modelName`, optional
- `finish`, optional
- `approvedEqualText`, optional
- `defaultRemarks`, optional
- `defaultScopeStatus`, optional
- `isActive`
- `createdAt`
- `updatedAt`

Important behavior:

- This is the user's reusable master library item.
- Estimate rows inserted from this item should snapshot key values at insertion time.
- Updating this item should not silently mutate existing estimates.
- Existing linked rows may receive a review/update prompt, but sent/exported estimates must remain stable.

Future:

- variations
- regional pricing
- supplier quote history
- image/spec attachments
- price confidence

---

## Entity: ProjectLibraryItem

Represents a project-specific reusable item. Use this when a project has special pricing, dimensions, supplier terms, or client-specific substitutions that should be reused inside that project but should not pollute the master library.

Examples:

- Tile A for Project X has a negotiated price and specific 600 mm × 600 mm dimension.
- A custom cabinet assembly is only valid for one renovation.
- Labor rate differs because the project is out of town.

Fields:

- `id`
- `projectId`
- `workspaceId`
- `sourceCostLibraryItemId`, nullable if derived from master library
- `name`
- `description`
- `category`
- `itemType`: material / labor / equipment / subcontract / assembly / other
- `unit`
- `unitCost`
- `currency`
- `pricingDate`
- `sourceType`: copied-from-master / project-entered / supplier-quote / imported / previous-estimate
- `sourceName`
- `supplierName`, optional
- `dimensionsJson`, optional
- `defaultWastePercent`, optional
- `defaultMarkupPercent`, optional
- `tags[]`
- `isActive`
- `createdAt`
- `updatedAt`

Behavior:

- Project library items can be dragged repeatedly into the same project's estimates.
- They are stronger than one-off line items, but weaker than master library items.
- User can promote a project item to the master library intentionally.
- User can detach an estimate row from a project library item without deleting the project library item.

---

## Entity: EstimateRevisionDiff

Can be computed on demand or stored as a snapshot for exports.

Fields if stored:

- `id`
- `fromEstimateId`
- `toEstimateId`
- `summaryText`
- `previousTotal`
- `newTotal`
- `deltaTotal`
- `createdAt`

Diff item fields:

- `lineItemId`
- `changeType`: added / removed / quantity-changed / price-changed / material-price-changed / labor-price-changed / status-changed / scope-changed / moved-section / terms-changed
- `previousValue`
- `newValue`
- `deltaAmount`

MVP recommendation:

Compute simple diffs by comparing line item IDs when duplicating revisions. If line item IDs change on duplication, store `originLineItemId` on copied rows.

---

## Entity: EstimateVersionSnapshot

Stores restorable estimate snapshots for autosave, named versions, issued baselines, restored copies, or imported baselines.

Fields:

- `id`
- `workspaceId`
- `projectId`
- `estimateId`
- `parentSnapshotId`, nullable
- `snapshotType`: autosave / named-version / issued-baseline / restored-copy / imported-baseline
- `label`
- `description`
- `reason`
- `snapshotJson`
- `summaryJson`
- `grandTotal`
- `createdByUserId`
- `createdAt`

Behavior:

- named versions and issued baselines should be durable;
- autosaves can use retention rules later;
- restore should create a copy by default, not destructively overwrite current work.

---

## Entity: ProjectVersionEvent

Stores meaningful project timeline events for Notion-like history and contractor-readable audit trail.

Fields:

- `id`
- `workspaceId`
- `projectId`
- `actorUserId`
- `eventType`: project-created / estimate-created / estimate-autosaved / estimate-named-version-created / estimate-duplicated / estimate-restored / proposal-created / proposal-issued / proposal-superseded / proposal-accepted / library-item-updated / linked-row-source-changed / export-created
- `entityType`: project / estimate / proposal / library-item / export
- `entityId`
- `title`
- `description`
- `metadataJson`
- `createdAt`

---

## Entity: Export / ProposalSnapshot

Represents a sent/printed/exported estimate snapshot.

Fields:

- `id`
- `estimateId`
- `exportType`: pdf / xlsx / csv / print
- `audience`: internal / client / supplier
- `fileUrl`, optional
- `snapshotJson`
- `grandTotalAtExport`
- `createdAt`
- `createdByUserId`

Why snapshot:

Exports must remain stable even if the estimate changes later.

---

## Entity: ProposalPackage

Represents the client-ready proposal document generated from an estimate plus commercial terms. This is distinct from the working estimate because it includes letter language, terms, exclusions, owner-supplied items, validity, duration, warranty, and signature blocks.

Fields:

- `id`
- `workspaceId`
- `projectId`
- `estimateId`
- `parentProposalPackageId`, nullable
- `supersedesProposalPackageId`, nullable
- `proposalVersionLabel`, examples Initial, Rev 01, Change Order 01
- `proposalDate`
- `recipientName`
- `throughName`, optional architect/designer/contact
- `subject`
- `letterBodyTemplate`
- `letterBodyFinal`, optional locked text
- `amountInWords`
- `validityDays`
- `projectDurationDays`
- `warrantyMonths`
- `paymentTermsText`
- `exclusionsText`
- `ownerSuppliedItemsText`
- `ownerSuppliedContractorInstalledItemsText`
- `finishingApprovalClause`, optional
- `disclaimerText`
- `signatureBlocksJson`
- `snapshotJson`
- `status`: draft / issued / superseded / accepted / rejected
- `createdAt`
- `updatedAt`

MVP note:

This can be implemented as part of export settings first, but the domain object should be named because contractor proposals are more than exported tables.

---

## Entity: Attachment, later

Possible future object for drawings, photos, supplier quotes, PDFs, and Excel files.

Fields:

- `id`
- `workspaceId`
- `projectId`, optional
- `estimateId`, optional
- `lineItemId`, optional
- `type`: drawing / quote / photo / spreadsheet / document
- `fileName`
- `fileUrl`
- `mimeType`
- `uploadedAt`

MVP note:

Do not make attachments central until import/export or AI parsing is planned.

---

## Data model decisions

### IDs

Use stable IDs for estimates, sections, and line items so revision comparison is possible.

When duplicating estimates:

- new estimate gets new `id`
- copied line items get new `id`
- copied line items store `originLineItemId` or equivalent to compare against previous revision

### Money

Store money as integer minor units if possible, or decimal with strict validation depending on database/ORM choice.

For Philippine peso:

- `currency = PHP`
- avoid floating-point drift in final totals

### Units

Start with text units, but normalize common values in UI:

- sqm
- sq.m.
- lm
- m
- pc
- lot
- bag
- cu.m.
- day
- hr

Future: create `Unit` reference table if needed.

### Local pricing

Do not imply a cost library item is authoritative unless sourced and dated.

Every cost item should eventually answer:

- who entered this price?
- when was it valid?
- where did it come from?
- is it company-specific or reference data?

### Library linking and snapshots

Library-driven estimating needs both reuse and estimate stability.

Recommended rule:

- Master library and project library items are templates/sources.
- Estimate line items are editable instances.
- Dropping a library item into an estimate creates a new line item with:
  - source link to the library item
  - snapshot of inserted values
  - current project-specific editable fields
  - link state

Do not make estimate totals depend on live master-library values. If a master price changes from PHP 800/sqm to PHP 900/sqm, an existing estimate should not silently change. The user should see a controlled update workflow instead.

Recommended update workflow:

1. Library item changes.
2. App marks affected linked rows as `source-changed` if they still reference the old item.
3. User opens a review panel.
4. User chooses per row or bulk:
   - keep project value
   - update from library
   - unlink/detach
   - save project override as project library item

Recommended row-link states:

- `unlinked`: manually entered row.
- `linked-clean`: inserted from library and still matches synced defaults.
- `linked-overridden`: inserted from library but has local project changes.
- `detached`: intentionally unlinked from any library source.
- `source-changed`: source library item changed after insertion and should be reviewed.

This makes the library feel component-like without creating dangerous hidden coupling.

## Likely first database tables

If using a relational database, first tables may be:

1. `workspaces`
2. `users`
3. `projects`
4. `estimates`
5. `estimate_sections`
6. `estimate_line_items`
7. `cost_library_items`
8. `project_library_items`
9. `estimate_version_snapshots`
10. `project_version_events`
11. `proposal_packages`
12. `proposal_exports`

Optional later:

- `attachments`
- `suppliers`
- `supplier_quotes`
- `estimate_revision_diffs`
- `audit_events`
- `templates`

## Open model questions

1. Should labor/material/equipment be separate columns or a `costType` enum in MVP?
2. Should markup be per estimate, per section, or per line item?
3. Should contingency/waste be separate from markup?
4. Should the default estimate structure be by trade, area, or custom sections?
5. Should costs be user-owned only in MVP, or should we seed sample reference data?
6. Should VAT/tax be included in initial model or added later?

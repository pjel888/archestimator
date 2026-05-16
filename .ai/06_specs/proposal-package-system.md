# Archestimator Proposal Package System

**Date:** 2026-05-16
**Status:** Draft v0.1
**Purpose:** Define how Archestimator turns estimate data, library/spec data, and commercial terms into a contractor-ready proposal package.

## Core thesis

Archestimator is not only an estimating grid. The estimate sheet is the engine, but the proposal package is the sellable artifact.

A contractor does not only need a total. A contractor needs a document that can be sent to a client, reviewed by an architect, negotiated, signed, and defended later if the scope changes.

The proposal package must therefore combine:

1. project identity;
2. offer letter;
3. cost summary;
4. detailed estimate or BOQ;
5. inclusions/exclusions and owner-supplied scope;
6. commercial terms;
7. acceptance/signature blocks;
8. stable snapshot history.

## Source learning

This spec is based partly on the analyzed contractor proposal sample:

`/Users/philiplewis/archestimator/.ai/13_research/proposal-samples/grand-hyatt-construction-proposal/analysis.md`

Key lesson:

> A professional contractor proposal is a commercial/risk-control document wrapped around a cost estimate.

## User goals

### Contractor goal

Produce a professional proposal quickly without rebuilding a Word/PDF document from a separate spreadsheet.

The contractor should be able to:

- build an estimate in the grid;
- apply proposal terms;
- preview a client-ready document;
- export PDF/XLSX;
- issue a stable snapshot;
- revise the proposal later without losing the prior issued version.

### Architect/client reviewer goal

Understand:

- what is included;
- what is excluded;
- what is owner-supplied;
- what is provisional or requires verification;
- how the total is calculated;
- what the contractor expects for payment, validity, duration, warranty, and acceptance.

## Proposal package anatomy

### 1. Cover / identity page

Purpose:

- orient the recipient;
- establish project identity;
- make the document look intentional and professional.

Fields:

- document title, e.g. `General Construction Proposal`;
- project name;
- project location/address;
- client/owner name;
- contractor/company name;
- architect/designer or `through` contact;
- proposal date;
- revision label/version;
- optional company logo;
- optional project image/rendering later.

MVP requirement:

- cover page can be optional, but the proposal export must still show project identity clearly.

### 2. Proposal / transmittal letter

Purpose:

- frame the estimate as a formal offer;
- state the amount in words and figures;
- state whether VAT/tax is included;
- identify the project and scope intent.

Template variables:

- `{{proposalDate}}`
- `{{clientName}}`
- `{{throughName}}`
- `{{projectName}}`
- `{{projectAddress}}`
- `{{proposalSubject}}`
- `{{projectType}}`
- `{{grandTotalNumber}}`
- `{{grandTotalWords}}`
- `{{currency}}`
- `{{taxStatement}}`
- `{{scopeIntent}}`
- `{{contractorName}}`
- `{{contractorTitle}}`

Default letter structure:

1. greeting;
2. thank-you/opportunity line;
3. project identification;
4. total proposal amount in words and numbers;
5. scope intent statement: supply of labor/materials/tools/equipment, as applicable;
6. consideration/closing line;
7. contractor signature.

Rules:

- Generated letter text must be editable before issue.
- If the total changes after letter generation, the UI must flag the letter as stale or regenerate totals.
- Issued proposal letter text must be snapshotted.

### 3. Cost proposal summary

Purpose:

- give the client a digestible view before detailed line items.

Typical rows:

- division/section totals;
- direct cost total;
- contingency;
- rounding adjustment, if any;
- VAT/tax;
- discount;
- grand total.

Data requirements:

- estimate sections with display names and outline codes;
- section totals;
- estimate-level financial modifiers;
- tax settings;
- discount settings;
- rounding rules;
- amount in words.

Rules:

- Summary totals must reconcile exactly with detailed estimate totals.
- Rounding should be explicit, not hidden.
- VAT/tax inclusion must be stated clearly.
- Discount must appear as its own line if used.

### 4. Detailed estimate / BOQ table

Purpose:

- show the basis of the cost;
- allow technical review;
- protect the contractor by showing scope assumptions and statuses.

Recommended columns:

- outline/row number;
- tag/spec code;
- particulars/description;
- quantity;
- unit;
- material unit cost;
- labor unit cost;
- material subtotal;
- labor subtotal;
- total cost amount;
- scope status;
- remarks.

MVP display modes:

1. **Summary proposal**
   - section totals only;
   - few or no detailed rows.
2. **Detailed proposal / BOQ**
   - full line items;
   - material/labor split if present.
3. **Internal estimate export**
   - all working columns, including source notes and confidence.

Rules:

- Client-facing export can hide internal notes, but must not hide exclusions or scope statuses.
- Rows with `excluded`, `by-others`, or `not-applicable` should not contribute to totals unless explicitly configured.
- Rows with `allowance` or `provisional` should be visibly marked.
- `OSM` and `OSCI` rows must be clear.

### 5. Inclusions, exclusions, OSM, and OSCI

Purpose:

- reduce disputes;
- make scope boundaries explicit.

Definitions:

- **Included**: contractor priced and responsible.
- **Excluded**: explicitly outside the proposal.
- **OSM / Owner-supplied material**: owner supplies the material.
- **OSCI / Owner-supplied contractor-installed**: owner supplies; contractor installs or provisions, depending on row.
- **By others**: specialty contractor, vendor, building admin, or another party handles it.
- **N/A**: not applicable to this project.
- **Provisional / verify**: subject to confirmation.

System behavior:

- Each estimate row should have a structured `scopeStatus`.
- Proposal package should auto-generate grouped annexes from row statuses:
  - exclusions;
  - owner-supplied materials;
  - OSCI;
  - by-others;
  - provisional/verify items.
- User can add manual clauses in addition to generated lists.

MVP rule:

- At minimum, support manual exclusions/OSM/OSCI text fields plus row-level scope status.
- Later, auto-generate annexes from structured rows.

### 6. Commercial terms

Purpose:

- turn the estimate into an offer with business terms.

Recommended fields:

- proposal validity days;
- project duration days;
- warranty months;
- down payment percent/amount;
- progress billing cadence;
- payment milestones, later;
- tax/VAT inclusion statement;
- disclaimer for additional works;
- sample/mock-up approval clause;
- acceptance/conforme clause.

Default terms based on common contractor proposal patterns:

- validity: 30 days;
- duration: user-entered calendar days;
- warranty: 12 months from acceptance/completion;
- down payment: user-entered percent;
- progress billing: every 2–3 weeks or milestone-based;
- disclaimer: works not indicated in the scope are additional and subject to quotation/approval.

Rules:

- Terms must be editable per proposal.
- Workspace defaults can prefill terms.
- Issued proposal terms must be snapshotted.

### 7. Signature / conforme blocks

Purpose:

- create a document that can be approved.

Fields:

- contractor signatory name;
- contractor title;
- client/owner signatory names;
- architect/designer acknowledgement, optional;
- signature labels;
- date lines.

MVP behavior:

- static signature lines in PDF.

Later:

- e-signature integration;
- acceptance tracking;
- signed document upload.

## Proposal workflow

### Flow A — Generate proposal from estimate

1. User opens estimate.
2. User clicks `Create Proposal` or `Preview Proposal`.
3. App opens proposal package editor.
4. App pre-fills project identity, estimate totals, terms defaults, and proposal letter.
5. User reviews sections:
   - letter;
   - summary;
   - detailed table display mode;
   - exclusions/OSM/OSCI;
   - terms;
   - signature blocks.
6. User previews PDF.
7. User exports draft or issues final proposal.

### Flow B — Issue proposal snapshot

Issuing means the proposal becomes a stable record.

On issue:

- freeze estimate totals;
- freeze proposal letter;
- freeze included line items and section summaries;
- freeze terms/exclusions/OSM/OSCI;
- store `snapshotJson`;
- assign proposal issue/version label;
- optionally generate PDF file.

Rules:

- An issued proposal must never silently change.
- If the estimate changes later, app should prompt to create a new proposal version/revision.
- Library updates must not mutate issued proposals.

### Flow C — Revise proposal

1. User changes estimate or project scope.
2. App marks related issued proposal as no longer current.
3. User creates a new proposal version from current estimate.
4. App can compare previous proposal and new proposal:
   - total difference;
   - added rows;
   - removed rows;
   - changed quantities;
   - changed prices;
   - changed scope statuses;
   - changed terms.
5. User issues revised proposal.

## Data model

### ProposalPackage

Fields:

- `id`
- `workspaceId`
- `projectId`
- `estimateId`
- `parentProposalPackageId`, nullable
- `proposalNumber`, optional human-friendly number
- `proposalVersionLabel`, e.g. Initial, Rev 01, Option B
- `status`: draft / issued / superseded / accepted / rejected / void
- `proposalDate`
- `issuedAt`, nullable
- `recipientName`
- `throughName`, optional
- `subject`
- `documentTitle`
- `letterBodyTemplate`
- `letterBodyFinal`
- `amountInWords`
- `validityDays`
- `projectDurationDays`
- `warrantyMonths`
- `paymentTermsText`
- `exclusionsText`
- `ownerSuppliedItemsText`
- `ownerSuppliedContractorInstalledItemsText`
- `byOthersText`
- `provisionalItemsText`
- `finishingApprovalClause`
- `disclaimerText`
- `signatureBlocksJson`
- `displaySettingsJson`
- `financialSummarySnapshotJson`
- `lineItemSnapshotJson`
- `termsSnapshotJson`
- `snapshotJson`
- `createdAt`
- `updatedAt`

### ProposalExport

Fields:

- `id`
- `proposalPackageId`
- `estimateId`
- `exportType`: pdf / xlsx / csv / print
- `audience`: client / internal / supplier
- `fileUrl`
- `fileName`
- `snapshotJson`
- `grandTotalAtExport`
- `createdAt`
- `createdByUserId`

### ProposalTemplate

Can be later, but should be designed early.

Fields:

- `id`
- `workspaceId`
- `name`
- `projectType`
- `documentTitleTemplate`
- `letterTemplate`
- `defaultTermsJson`
- `defaultDisplaySettingsJson`
- `signatureBlockTemplateJson`
- `isDefault`
- `createdAt`
- `updatedAt`

## Display settings

Proposal display must be configurable without corrupting estimate data.

Settings:

- show/hide cover page;
- show/hide proposal letter;
- show detailed rows vs section summary only;
- show material/labor split;
- show unit costs;
- show quantities;
- show internal source notes;
- show remarks;
- group by trade/section/area;
- include exclusions annex;
- include OSM/OSCI annex;
- include signature page.

Rule:

- Hiding a detail in the proposal export does not delete it from the estimate.

## Validation rules before issuing

Before issuing a proposal, warn if:

- no client name;
- no project address;
- no proposal validity;
- no duration;
- no payment terms;
- no exclusions/assumptions text;
- estimate has rows with `to-follow`, `verify-architect`, or `provisional` but no proposal note;
- estimate has rows excluded from total but not listed in exclusions/OSM/OSCI/by-others annex;
- letter total does not match current estimate total;
- proposal snapshot is stale compared with estimate.

Do not hard-block all warnings. Contractors need speed. Use severity:

- critical: totals mismatch, missing grand total, corrupted calculation;
- warning: missing terms, missing exclusions, unresolved provisional rows;
- note: missing logo, missing cover image, optional formatting.

## Relationship with versioning

Proposal packages are versioned artifacts.

A project may have many estimates and many proposal packages:

- Design Option A estimate;
- Design Option B estimate;
- Initial proposal;
- Rev 01 proposal after design changes;
- Change order proposal;
- Final accepted proposal.

Rules:

- Estimates remain editable until locked/issued depending on workflow.
- Issued proposals are immutable snapshots.
- New proposal versions should point back to their parent proposal.
- Proposal diffs should be available when generated from estimate revisions.

## MVP cutline

### Must-have for first serious prototype

- proposal preview screen;
- PDF proposal export concept;
- proposal letter template with editable text;
- summary totals;
- detailed estimate table mode;
- manual terms/exclusions/OSM fields;
- proposal snapshot object;
- basic proposal version label.

### Should-have soon

- structured row status annex generation;
- material/labor split display toggle;
- amount in words;
- proposal issue workflow;
- proposal diff from previous issued proposal.

### Later

- e-signature;
- online client approval;
- payment schedule milestones;
- clause library marketplace;
- document theme builder;
- collaborative redlines/comments.

## Implementation notes

- Keep proposal data separate from live estimate data once issued.
- Use snapshots to preserve legal/commercial integrity.
- Proposal generation should be deterministic from estimate + template + terms.
- Allow manual edits, but track when generated text is stale.
- Do not hide scope statuses in remarks only; model them structurally.

## Open questions

1. Should proposals be issued from estimates only, or can they be created as standalone quote documents?
2. Should accepted proposal automatically lock the underlying estimate?
3. Should proposal versions be tied one-to-one with estimate revisions, or can multiple proposals come from one estimate?
4. Which proposal display should be default for contractors: detailed BOQ or summary-first with annex?
5. Should proposal letter templates be workspace-level only, or project-type-specific?

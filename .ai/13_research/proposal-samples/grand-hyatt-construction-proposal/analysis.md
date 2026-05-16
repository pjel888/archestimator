# Contractor Proposal Anatomy — Grand Hyatt Sample

**Date analyzed:** 2026-05-16
**Source file:** `GRAND HYATT CONSTRUCTION PROPOSAL COMPLETE.pdf`
**Use:** Internal product research for Archestimator. Do not publish client-identifying contents.
**Source hash:** `c3de39f43a62c3bcc12a6e860a2613d9bc2d13dd3725e296fbfee1e96efb9d9f`
**Pages:** 8

## Why this sample matters

This is not merely a list of materials. It is a contractor-facing sales, scope, risk, and contract document wrapped around an estimate table.

For Archestimator, the target artifact is not only an accurate spreadsheet. It is a proposal package that helps a contractor say:

1. this is the project;
2. this is the total price;
3. this is how the price is organized;
4. this is what is included;
5. this is what is excluded or owner-supplied;
6. this is how payment, validity, duration, warranty, and acceptance work;
7. this is ready for client approval.

The product dogma should be: **an estimate becomes valuable when it can survive client review, architect review, contract negotiation, and later variation/change-order disputes.**

---

## Document-level structure

The proposal has four layers:

### 1. Cover / identity layer

Observed elements:

- project title;
- project location;
- document type: general construction proposal;
- proposal date.

Product implication:

Archestimator needs a proposal cover/profile object, not only estimate rows. The proposal export should be able to generate a front page from project metadata.

Required data fields:

- project name/title;
- project address/location;
- client/owner name;
- architect/designer/through-contact;
- contractor/company/preparer;
- proposal date;
- document title/type;
- revision label.

### 2. Transmittal / offer letter layer

Observed elements:

- date;
- addressee/client;
- through architect/designer;
- project name and address;
- subject;
- courteous proposal language;
- total amount in words and figures;
- VAT inclusion statement;
- scope intent: supply of labor, materials, tools, and equipment;
- closing and contractor signature.

Product implication:

The app should not export only a BOQ. It should also generate a client-facing letter. This letter is mostly templated, but it must pull from estimate totals and project fields.

Potential Archestimator feature:

- Proposal Letter Template
- variables: `{{clientName}}`, `{{projectName}}`, `{{projectAddress}}`, `{{totalAmountWords}}`, `{{totalAmountNumber}}`, `{{vatStatement}}`, `{{contractorName}}`, `{{proposalDate}}`

### 3. Estimate / bid-form layer

Observed elements:

- summary by major work division;
- detailed tabular breakdown;
- material and labor split;
- unit costs;
- material subtotal and labor subtotal;
- total cost amount;
- remarks;
- subtotals per division;
- grand total, contingency, VAT, discount, total estimated cost proposal;
- project duration;
- references to exclusions/annex.

Product implication:

The estimate sheet must support both:

- internal estimating detail; and
- client/proposal presentation detail.

The sample uses a nested hierarchy deeper than a simple flat spreadsheet:

- Division letter: A, B, C, etc.
- Division name: General Requirements, Site Works, Architectural Finishes, etc.
- Subsection number: 1, 2, 3...
- Subsection title: Doors, Joineries, Lighting System, etc.
- Line item number: 1.1, 1.2, 3.4.1, etc.
- Optional tag/code: GEN_134, WAF_136, FLF_022, JNR_065, etc.
- Description/specification.
- Quantity/unit.
- Material unit cost.
- Labor unit cost.
- Material subtotal.
- Labor subtotal.
- Cost amount.
- Remarks.

MVP implication:

The current one-level section model may be enough visually at first, but the data model should allow at least two levels or a `groupPath`/`outlineCode` field so generated proposals can look like real bid forms.

### 4. Commercial/legal terms layer

Observed elements:

- OSM / owner-supplied materials list;
- excluded items list;
- finishing material approval rule;
- down payment percentage;
- progress billing cadence;
- proposal validity period;
- project duration;
- warranty period;
- disclaimer: work not indicated is additional and chargeable;
- conforme/signature area.

Product implication:

Proposal exports need commercial terms, not just numbers. Archestimator should include proposal clauses/terms as reusable templates.

Potential objects:

- ProposalTermTemplate
- ProposalScopeNote
- ExclusionItem
- OwnerSuppliedItem
- AcceptanceSignatureBlock

---

## Estimate hierarchy extracted from sample

Major divisions:

- A — General Requirements and Preliminaries
- B — Site Works and Architectural Fit-Out Works
- C — Architectural Finishes
- D — Glass and Glazing
- E — Doors, Joineries and Specialty Works
- F — Mechanical Works
- G — Electrical and Auxiliary Works
- H — Plumbing Works
- I — Fire Protection and FDAS Works
- J — Furniture, Fixture and Equipment

This suggests Archestimator should support default templates for fit-out/interior proposals with common divisions. The divisions can be contractor-editable.

Important: the proposal blends trade-based organization and area/product-based organization:

- trade/system divisions: Mechanical, Electrical, Plumbing, Fire Protection;
- architectural scope divisions: Site Works, Architectural Finishes, Doors/Joineries;
- room/area subdivisions inside finishes: Great Room, Master Bedroom, T&B, Kitchen, Laundry;
- product registries/codes: GEN, WAF, FLF, DOR, JNR, KIT, SL, DL, etc.

Product implication:

Do not force a single organizational dogma. The estimate model should allow:

- division/trade grouping;
- area/room grouping;
- item/specification codes;
- custom outline numbering.

---

## Columns and calculation dogma

Observed estimate columns:

- number;
- tag/code;
- particulars;
- quantity;
- unit;
- material unit cost;
- labor unit cost;
- material subtotal;
- labor subtotal;
- cost amount;
- remarks.

This validates that labor/material split is important for contractor proposals, especially for fit-out work. Some rows are split neatly by material and labor; others are `lot` amounts; others are excluded or owner-supplied.

Recommended Archestimator row model:

- `outlineCode` / `rowNumber`;
- `tagCode`;
- `description`;
- `quantity`;
- `unit`;
- `materialUnitCost`;
- `laborUnitCost`;
- `equipmentUnitCost`, later;
- `subcontractUnitCost`, later;
- `materialSubtotal`;
- `laborSubtotal`;
- `lineTotal`;
- `scopeStatus`: included / excluded / by-owner / by-others / allowance / provisional / n-a;
- `remarks`;
- `sourceLibraryItemId`, optional;
- `sourceSpecCode`, optional.

Formula:

```text
materialSubtotal = quantity × materialUnitCost
laborSubtotal = quantity × laborUnitCost
lineTotal = materialSubtotal + laborSubtotal + other subtotal buckets
```

But rows must also support lump-sum exceptions:

- unit = lot;
- no separate unit costs;
- direct line total only;
- excluded/N/A/OSCI rows with no total.

---

## Scope-status language matters

The proposal repeatedly uses status/remarks such as:

- excluded;
- N/A;
- OSCI;
- owner-supplied materials;
- by specialty contractor;
- verify architect;
- to follow upon awarding;
- no plan issued;
- for verification based on actual condition;
- processing only.

These are not incidental comments. They are risk-management flags.

Archestimator should treat them as structured states, not just free text.

Recommended statuses:

- `included` — priced and included in proposal total;
- `excluded` — explicitly not included;
- `owner_supplied_contractor_installed` / OSCI — owner supplies, contractor installs or provisions;
- `owner_supplied_material` / OSM — owner supplies material;
- `by_others` — specialty contractor/building/vendor handles it;
- `not_applicable` / N/A;
- `allowance` — placeholder budget amount;
- `provisional` — subject to verification;
- `to_follow` — scope or pricing not yet finalized;
- `verify_architect` — requires architect confirmation;
- `verify_site_condition` — depends on actual condition;
- `processing_only` — contractor fee/processing only, not all fees included.

Product implication:

The estimate sheet needs a visible `scope status` or `inclusion status` column. This will make proposal generation much more professional and safer.

---

## Proposal summary dogma

The summary appears before the detailed estimate. It gives the client the digestible total by division first, before overwhelming them with line items.

Observed summary flow:

1. division totals;
2. total cost amount;
3. contingency;
4. VAT;
5. discount;
6. total estimated cost proposal.

Product implication:

The proposal export should have a configurable summary page:

- section/division totals;
- subtotal;
- contingency;
- VAT/tax;
- discount;
- grand total;
- construction duration;
- validity period.

This summary should be generated from estimate data, but editable/lockable for proposal issuance.

---

## Contingency, VAT, and discount treatment

Observed:

- base grand total: 6,609,169.67;
- contingency: 530,830.33;
- rounded subtotal after contingency: 7,140,000.00;
- VAT: 12%, 856,800.00;
- total proposal: 7,996,800.00;
- discount: 0.00.

Product implication:

Archestimator must support estimate-level financial modifiers:

- contingency as amount or percent;
- tax/VAT as percent;
- discount as amount or percent;
- rounding behavior;
- proposal total in words;
- inclusion statement: inclusive/exclusive of VAT.

Rounding is not trivial. The sample appears to use contingency partly to reach a rounded pre-VAT amount. The app should support explicit rounding/adjustment lines rather than hiding them.

Recommended fields:

- `baseDirectCostTotal`;
- `contingencyMode`: percent / fixed / round-up-adjustment;
- `contingencyAmount`;
- `preTaxTotal`;
- `taxPercent`;
- `taxAmount`;
- `discountAmount`;
- `grandTotal`;
- `amountInWords`;
- `roundingAdjustment`, optional.

---

## Material library implications

The proposal validates the library/component idea strongly.

Many rows are reusable specification items, not one-off descriptions:

- GEN_134 paint appears repeatedly across ceilings/walls/kitchen/laundry;
- GEN_135 laminate/wall covering appears in multiple areas;
- WAF codes repeat across rooms;
- FLF codes identify floor finishes;
- DOR/JNR/KIT codes identify doors, joineries, kitchen;
- lighting fixture codes such as SL, DL, WW, MLS, MLL map to a lighting registry.

This means Archestimator should not think of the library only as materials with prices. It should support **spec-linked estimate components**:

- product/material item;
- labor rate or install method;
- assembly composed of material + labor + consumables;
- spec code/tag;
- default remarks such as `Verify Architect`;
- approved-equal language;
- dimensions/thickness/finish/vendor;
- repeated usage across rooms with different quantities.

The reusable item contains specification/pricing defaults. The estimate row contains the project-specific usage quantity, area, location, status, and remarks.

---

## Areas where contractors need software help

This proposal exposes contractor pain points:

### 1. Turning design specifications into priced rows

The document maps design tags/specs into cost rows. Contractors need a fast way to convert finish schedules, lighting registries, door schedules, and joinery lists into estimate lines.

### 2. Managing repeated items

The same paint, laminate, tile, and hardware recur in multiple rooms. A linked library/component model prevents retyping and reduces inconsistency.

### 3. Separating reusable defaults from project quantities

Unit costs, descriptions, and supplier/spec data are reusable. Quantities and room-specific usage are project-specific.

### 4. Handling exclusions and owner-supplied items

Professional proposals must show excluded/OSM/OSCI items clearly. This is just as important as included scope.

### 5. Producing proposal language

The contractor must generate front letter, summary, terms, exclusions, validity, warranty, duration, payment schedule, and signature blocks.

### 6. Avoiding disputes

The disclaimer and exclusions protect the contractor. Archestimator should make it harder to send proposals without assumptions/exclusions.

---

## Proposed Archestimator feature implications

### MVP / near-MVP

- Proposal export should include a generated cover/letter, not just spreadsheet output.
- Estimate rows should support material/labor unit cost split.
- Estimate rows should support `scopeStatus` in addition to remarks.
- Estimate sections should support nested hierarchy or outline numbering.
- Proposal settings should include VAT, contingency, discount, duration, validity, warranty, payment terms.
- Library items should support spec codes/tags and reusable descriptions.
- Export preview should allow summary vs detailed BOQ/proposal view.

### Later but important

- Proposal clause library.
- Finish/material approval workflow.
- OSM/OSCI/exclusions structured annex generation.
- Import from existing contractor Excel/PDF bid forms.
- Schedule/registry import for finishes, lighting, doors, joinery.
- Change-order document generation from estimate revisions.

---

## Data model additions recommended

### EstimateLineItem additions

- `outlineCode`
- `tagCode`
- `locationArea`
- `materialUnitCost`
- `laborUnitCost`
- `materialSubtotal`
- `laborSubtotal`
- `scopeStatus`
- `isIncludedInTotal`
- `remarks`
- `proposalNote`

### EstimateSection additions

- `outlineCode`
- `level`
- `parentSectionId`
- `displayInProposal`

### Proposal additions

New conceptual object: `ProposalPackage`

Fields:

- `id`
- `estimateId`
- `proposalDate`
- `recipientName`
- `throughName`
- `subject`
- `letterBodyTemplate`
- `validityDays`
- `projectDurationDays`
- `warrantyMonths`
- `paymentTermsJson`
- `exclusionsText`
- `ownerSuppliedItemsText`
- `finishingApprovalClause`
- `disclaimerText`
- `signatureBlocksJson`
- `snapshotJson`

### Library item additions

- `tagCode`
- `specCode`
- `brand`
- `modelName`
- `finish`
- `dimensionsJson`
- `approvedEqualText`
- `defaultRemarks`
- `defaultScopeStatus`
- `defaultMaterialUnitCost`
- `defaultLaborUnitCost`

---

## Product dogma for Archestimator

Archestimator should not be framed as only “a faster estimating spreadsheet.”

Better framing:

> Archestimator helps contractors convert reusable construction knowledge, project-specific quantities, and commercial terms into professional proposal packages.

Key beliefs:

1. The estimate sheet is the engine, but the proposal is the sellable artifact.
2. Reusable library items are not just prices; they are spec/pricing/labor/remark components.
3. Project quantities live in the estimate, not the library.
4. Exclusions, OSM/OSCI, validity, warranty, and payment terms are product-critical, not afterthoughts.
5. The app must distinguish included scope from excluded/owner-supplied/by-others/provisional scope.
6. Old proposals must remain stable snapshots even if library prices change later.
7. Contractors need both internal detail and client-facing polish.

---

## Immediate doc updates to make

- Update MVP UX flow with `Proposal Package` as an export concept.
- Update data model with `scopeStatus`, labor/material split, proposal package fields, and outline hierarchy.
- Update decisions with proposal-generation dogma.
- Consider making `Proposal Template` a near-MVP primitive.

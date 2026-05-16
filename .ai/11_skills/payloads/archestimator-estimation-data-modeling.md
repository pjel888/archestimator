# Skill: Archestimator Estimation Data Modeling

## Use when

- Designing estimate entities/tables
- Reviewing database schema
- Adding fields to projects, estimates, sections, line items, cost library, exports, or revisions
- Checking calculation and revision-diff logic

## Required reading

1. `.ai/06_specs/initial-data-model.md`
2. `.ai/06_specs/mvp-ux-flow.md`
3. `.ai/06_specs/legacy-repo-lessons.md`

## Core hierarchy

Use this MVP hierarchy unless requirements prove otherwise:

> Workspace/User → Project → Estimate → Section → Line Item

Supporting objects:

> Cost Library Item, Export Snapshot, Revision Diff, Attachment later

## Modeling rules

- Preserve stable IDs for estimates, sections, and line items.
- When duplicating an estimate, keep `originLineItemId` or equivalent for revision comparison.
- Money should avoid floating-point drift; prefer integer minor units or strict decimals.
- Every cost library item needs source/date fields eventually.
- AI-generated rows must be marked by source/confidence and remain editable.
- Do not over-import the old node graph from legacy repos unless the MVP UX needs it.

## Required formula checks

Minimum line-item calculations:

- `subtotal = quantity × unitCost`
- `markupAmount = subtotal × markupPercent`
- `contingencyAmount = subtotal × contingencyPercent`
- `total = subtotal + markupAmount + contingencyAmount`

Minimum validation:

- quantity >= 0
- unitCost >= 0
- unit required when quantity exists
- currency explicit at estimate level
- source/confidence required for AI suggestions

## Common pitfalls

- Hiding assumptions behind AI-generated totals
- Treating regional costs as authoritative without source/date
- Making nested area trees the primary MVP UX
- Losing revision lineage when duplicating estimates
- Mutating global library prices when only project-specific override was intended

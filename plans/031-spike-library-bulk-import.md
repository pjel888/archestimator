# Plan 031 (Direction Spike): Library import / bulk-create — close the export-without-import asymmetry

> **Executor instructions**: This is a **design/spike plan**. Investigate,
> produce the import-path design + validation contract + open questions. Do NOT
> build the full feature. When done, update the status row in `plans/README.md`.

## Status

- **Priority**: P1 (direction — launch-urgent; blocks the success metric for every new user)
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: direction
- **Planned at**: commit `0a2667db9`, 2026-07-17

## Why this matters (the grounded signal)

ExcelJS export is fully built (`src/lib/proposal-export/xlsx-workbook.ts`,
`create-proposal-workbook.ts`, the route at
`src/app/api/.../export/proposal.xlsx/route.ts`). The component library has only
**single-item** creation paths:
- `src/lib/component-library/quick-add-validation.ts` — one component at a time.
- Upload routes only for images and attachments (`src/app/api/component-library/images/route.ts`, `attachments/route.ts`).
- No CSV/XLSX parser, no bulk-create server action, no `bulk` import in `component-library/actions.ts`.

The target user is explicitly spreadsheet-bound: `README.md:24` — "these teams
still run on spreadsheets and enterprise tools do not reach." PRODUCT.md's
success metric is "builds an estimate from reusable components in minutes rather
than hours" — **impossible if the library starts empty.** Notably, the AI
package-builder already has `create_library_component` as a first-class intent
(`src/lib/ai/package-builder/schemas.ts:7`) and parses component fields from
unstructured input — the parsing/normalization infrastructure for ingest is
half-built.

**Impact:** Every new contractor's first session hits a cold-start wall: an
empty library they must populate one row at a time. Highest-friction point in
the stated onboarding path; a top reason trial users churn before reaching the
success metric.

## Scope

**In scope** (design deliverables):
1. **The import format decision** — recommend accepting the **same XLSX column
   shape the exporter already produces** (round-trip is free), plus optionally
   CSV and "paste a spreadsheet range."
2. **The validation contract** — each row validated through the existing
   `quick-add-validation.ts` schema; explicit handling of duplicates (dedup
   against existing items by name+SKU), oversize batches, and partial-failure
   reporting (a results file: N imported, M errored with reasons).
3. **The ingestion path** — a dry-run/preview step (parse + validate, show
   counts + a sample of errors, then commit), the batched insert via the
   existing component-mutation repository (`src/lib/component-library/component-mutation-d1.ts`),
   and idempotency (re-importing the same file doesn't duplicate).
4. **Authz + mass-assignment guard** — workspace-scoped; the failure mode to
   design against is mass-assignment / oversharing (the playbook's security
   concern for bulk ingest).
5. **Open questions** (below).

**Out of scope**:
- Building the full feature (separate implementation plan).
- AI-assisted messy-spreadsheet normalization (a follow-on that leans on the
  package-builder's field parsing — note as a future enhancement).

## Questions to answer in the design

1. XLSX vs CSV vs paste-range — which first? (Recommend XLSX for round-trip; the
   exporter shape is the spec.)
2. Dry-run/preview: required, or commit directly with a rollback? (Recommend
   dry-run — bulk ingest errors are painful to undo.)
3. Duplicate detection key — name+SKU, or a normalized hash? What's the
   existing dedup key in the library?
4. Batch size cap — what's a sane max (500? 5000?) before requiring chunked
   upload?
5. Does the import lean on the AI package-builder's field parsing for messy
   real-world spreadsheets, or require strict column conformance first? (Recommend
   strict first; AI-normalization as a Pro-tier enhancement.)

## Deliverable shape

A design doc with: the import flow diagram, the validation contract (reusing
`quick-add-validation.ts`), the dry-run/preview → commit sequence, the batched
insert + idempotency design, the authz + mass-assignment guard, and the open
questions with recommendations.

## Done criteria

- [ ] The design doc exists with all 5 deliverables.
- [ ] The XLSX column contract is the exporter's shape (cite the exporter code).
- [ ] Validation reuses `quick-add-validation.ts` (cite it).
- [ ] The mass-assignment / workspace-scope guard is explicit.
- [ ] Open questions have recommendations.
- [ ] `plans/README.md` status row updated to DONE (spike).

## STOP conditions

- The exporter's XLSX shape is not a clean superset of the library's create
  schema (round-trip isn't actually free) — document the gap and recommend the
  import spec.
- `quick-add-validation.ts` can't be reused for bulk without modification —
  report what it lacks (batch context, dedup, etc.).

## Maintenance notes

- This is the most launch-urgent direction finding — every new user hits the
  cold-start wall. Recommend this spike first among the direction items.
- The implementation is a medium feature plan (parser + dry-run + batched insert
  + results UI); this spike de-risks the validation + idempotency + authz.
- Reviewer: confirm the design reuses the exporter shape and quick-add
  validation, and that the mass-assignment guard is explicit.

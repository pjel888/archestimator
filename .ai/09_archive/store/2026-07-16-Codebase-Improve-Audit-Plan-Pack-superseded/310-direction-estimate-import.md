# Plan UNIT-019 (Direction): Add estimate XLSX/CSV import — design spike

> **Drift check:** `git diff --stat 9a821b51a..HEAD -- src/lib/proposal-export src/lib/estimates src/app/api/activation`.

## Status
- **Priority:** — (direction) · **Effort:** L · **Risk:** MED · **Depends on:** — · **Category:** direction (AUXILIARY)
- **Planned at:** `9a821b51a`, 2026-07-16 · **Test decision:** NOT_REQUIRED (design spike)
- **Note:** Design/spike plan; done = reviewed design + open questions resolved.

## Why this is the highest-magnitude first-user win
Every design partner is migrating from spreadsheets. The export path is mature (`src/lib/proposal-export/`: 7 modules — `create-proposal-workbook.ts`, `build-proposal-export-model.ts`, `xlsx-workbook.ts`, etc.) with a dedicated activation route (`app/api/activation/proposal-export-completed/route.ts`). `rg` for any xlsx/csv *ingest* path returns **zero** source uses. The export model is a round-trip contract already; **import is the missing half**. Roadmap BETA P0 #11 (first-value flow) and #13 (client comprehension) are downstream of "can I bring my existing estimate in."

## Grounding
- `src/lib/proposal-export/build-proposal-export-model.ts` — the round-trip schema to reuse as the import contract.
- `exceljs` is already a dependency (export uses it) — no new dep for parsing.
- `computeEstimateRowCostParts` / `estimate-row-total` validation must be reused, not re-rolled.

## Open product questions (resolve before building)
1. **Schema:** import the *exact* export shape (round-trip) vs a friendlier template? Recommend round-trip + a downloadable template.
2. **Validation/quarantine:** malformed/oversized rows — reject the file, or import-good/quarantine-bad? Recommend per-row quarantine with a report.
3. **Placement:** new estimate from import vs merge into existing? New-only for v1.
4. **Limits:** max rows/size; workspace quota interaction.
5. **Authz:** manager-only; reuse `assertProjectPublicationManager`-style gates.

## Scope of this spike
- Define the import contract (= export model) + a template generator.
- Define the validation pipeline (reuse `estimate-row-total`) + quarantine shape.
- List build units: upload+parse, row-map, validate, quarantine UI, activation event.

## Done criteria (spike)
- [ ] Design doc with the 5 decisions
- [ ] Import contract documented (== export model)
- [ ] Owner sign-off on quarantine behavior + new-only v1
- [ ] `plan-pack.json` UNIT-019 marked with the decision

## STOP conditions
- The export model can't be inverted cleanly (e.g. lossy) — define a separate import template instead; don't force a broken round-trip.
- Import validation would need to duplicate `estimate-row-total` logic — STOP and refactor that into a shared validator first (avoids drift).

## Maintenance notes
- Pair the import build with a re-export round-trip test (import the export, re-export, diff) to keep the contract honest.
- This unblocks the single biggest onboarding friction; prioritize after the P1 quick wins.

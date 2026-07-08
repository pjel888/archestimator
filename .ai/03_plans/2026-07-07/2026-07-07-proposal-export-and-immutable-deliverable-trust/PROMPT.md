# GLM5.2 Plan Pack Prompt: Proposal Export And Immutable Deliverable Trust

Date: 2026-07-07
Target folder: `.ai/03_plans/2026-07-07-proposal-export-and-immutable-deliverable-trust`
Mode: planning only. Create the plan pack in this folder; do not change application code.

## Goal

Create a plan pack for proposal/export deliverable trust: immutable packages, stale-data warnings, redaction, generated file integrity, client confidence, and large-export reliability.

## Evidence To Start From

- Proposal export code lives in `src/lib/proposal-export/` and proposal/publication API/UI routes.
- Export preview UI exists in `src/components/workshop/ProposalExportPreviewDialog.tsx`.
- Publication and share flows can expose selected sheets to recipients.
- Risk docs mention mutable XLSX/export integrity/size concerns and the need for trustworthy proposal output.

## Required Plan Pack

Define export package states, immutability/versioning, checksum or audit trail, source/staleness indicators, internal-field redaction, PDF/XLSX decision points, large-file streaming, tests, and recipient proof.

## Constraints

Do not conflate proposal publishing UX with file-integrity implementation; link to that pack but keep this one focused on deliverable trust.

## Stop Condition

The pack is complete when a future executor can make proposal outputs trustworthy enough for real client review.

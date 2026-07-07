# GLM5.2 Plan Pack Prompt: Client-Ready Proposal Package Workflow

Date: 2026-07-07
Target folder: `.ai/03_plans/2026-07-07-client-ready-proposal-package-workflow`
Mode: planning only. Create the plan pack in this folder; do not change application code.

## Goal

Create a workflow plan for turning an estimate into a client-ready proposal package with clear readiness checks, selected sheets, terms, recipients, and delivery proof.

## Evidence To Start From

- `src/components/workshop/EstimateHeaderActions.tsx` and `ProposalExportPreviewDialog.tsx` expose proposal/export actions.
- `src/components/workshop/publisher/PublisherDrawer.tsx` and `src/components/workshop/publication/SheetPickerList.tsx` support publication.
- Proposal export integrity has a separate deliverable-trust pack; this pack should focus on owner workflow.
- Existing UX items include proposal and publication flows but not a unified readiness checklist.

## Required Plan Pack

Define readiness checklist, missing-data blockers, stale/source-risk warnings, sheet selection, recipient setup, preview states, delivery confirmation, resend/revoke flow, tests, and proof artifacts.

## Constraints

Keep internal estimator data protected. Do not assume every proposal must be exported the same way; plan for publishing and downloadable deliverables.

## Stop Condition

The pack is complete when an executor can implement a coherent owner workflow from estimate to client-ready package.

# GLM5.2 Plan Pack Prompt: Privacy Request Operations And Erasure Workflow

Date: 2026-07-07
Target folder: `.ai/03_plans/2026-07-07-privacy-request-operations-and-erasure-workflow`
Mode: planning only. Create the plan pack in this folder; do not change application code.

## Goal

Create a plan pack for turning privacy request intake into an operator-ready workflow with identity verification, status lifecycle, confirmation, fulfillment, and erasure/export evidence.

## Evidence To Start From

- `src/app/api/compliance/privacy-requests/route.ts` provides intake.
- Privacy request repository/tests and migration support exist, but email confirmation and complete fulfillment workflow remain partial.
- Retention/DSAR data lifecycle work is related but broader; this pack should focus on user request operations.
- Compliance roadmap items reference privacy notice, RoPA, processor register, breach runbook, scanner, and retention gates.

## Required Plan Pack

Define request states, identity checks, SLA timers, operator queue, email templates/proof, export/delete actions, audit evidence, abuse controls, and tests for anonymous and authenticated requesters.

## Constraints

Keep legal advice out of the implementation plan; call out owner/legal decisions. Do not store secrets or raw personal data in evidence.

## Stop Condition

The pack is complete when a future executor can implement and verify privacy request operations end to end.

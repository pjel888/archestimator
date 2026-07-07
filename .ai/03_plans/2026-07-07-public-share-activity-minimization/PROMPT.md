# GLM5.2 Plan Pack Prompt: Public Share Activity Minimization

Date: 2026-07-07
Target folder: `.ai/03_plans/2026-07-07-public-share-activity-minimization`
Mode: planning only. Create the plan pack in this folder; do not change application code.

## Goal

Create a plan pack that minimizes public share activity exposure while preserving useful recipient collaboration.

## Evidence To Start From

- `src/app/api/share/[token]/activity/route.ts` combines comments, decisions, events, recipient display names, and metadata.
- Comment, decision, and recipient flows span `src/app/api/share/`, `src/components/share/`, and publication components.
- Public links are high-risk because recipients may be unauthenticated or email-matched rather than full workspace members.
- Retention, privacy, and proposal inbox plans overlap but do not replace data minimization work.

## Required Plan Pack

Define the public-share data contract, minimum recipient-visible fields, redaction rules, pagination/rate limits, privacy tests, audit logging, revoked/expired behavior, and migration or compatibility notes.

## Constraints

Do not degrade legitimate recipient review flows. Treat source-only inspection as insufficient proof for privacy; specify tests and hosted checks.

## Stop Condition

The pack is complete when an executor can narrow the public activity surface and verify no unnecessary data is exposed.

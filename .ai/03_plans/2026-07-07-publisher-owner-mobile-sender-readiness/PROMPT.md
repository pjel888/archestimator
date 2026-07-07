# GLM5.2 Plan Pack Prompt: Publisher Owner Mobile And Sender Readiness

Date: 2026-07-07
Target folder: `.ai/03_plans/2026-07-07-publisher-owner-mobile-sender-readiness`
Mode: planning only. Create the plan pack in this folder; do not change application code.

## Goal

Create a plan pack for proposal publisher owner workflows on desktop and mobile, with reliable sender actions and recovery paths.

## Evidence To Start From

- `src/components/workshop/publisher/PublisherRosterClient.tsx` includes mobile width messaging that can block owner workflow.
- `PublisherEmptyState.tsx`, `PublisherDrawer.tsx`, and `src/components/workshop/publication/RecipientEmailComposer.tsx` cover owner/sender UI.
- Sender flow needs a clear checklist for generate, copy, email, resend, revoke, and confirm client access.
- Recipient inbox and proposal package plans cover adjacent surfaces.

## Required Plan Pack

Define desktop/mobile owner flows, sender states, email/copy/share actions, resend/revoke rules, mobile fallback, errors, audit/proof, accessibility checks, and tests.

## Constraints

Do not require full mobile parity for heavy estimating if a deliberate desktop guard is chosen; document the product decision and proof.

## Stop Condition

The pack is complete when proposal sending can be planned as an owner-operable workflow across expected devices.

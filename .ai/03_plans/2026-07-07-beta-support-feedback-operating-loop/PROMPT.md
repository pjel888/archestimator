# GLM5.2 Plan Pack Prompt: Beta Support Feedback Operating Loop

Date: 2026-07-07
Target folder: `.ai/03_plans/2026-07-07-beta-support-feedback-operating-loop`
Mode: planning only. Create the plan pack in this folder; do not change application code.

## Goal

Create a plan pack for the first-user beta support loop: contextual feedback capture, acknowledgement, triage, support monitoring, status expectations, and product-learning evidence.

## Evidence To Start From

- `src/app/workshop/feedback/page.tsx`, `src/components/workshop/BetaFeedbackForm.tsx`, and `src/app/workshop/settings/feedback/page.tsx` provide feedback surfaces.
- Support monitoring readiness currently depends on scripts/operator evidence.
- Existing UX plans mention feedback and support but do not define the operating loop.
- Launch readiness and observability alert proof depend on support response being real.

## Required Plan Pack

Define feedback entry points, required context, severity taxonomy, acknowledgement UX, operator queue, triage SLA, linked evidence, support alert integration, privacy handling, and tests.

## Constraints

Do not overbuild a CRM. Use the smallest loop that supports first users and produces actionable evidence.

## Stop Condition

The pack is complete when beta feedback can be handled, measured, and followed up without ad hoc operator behavior.

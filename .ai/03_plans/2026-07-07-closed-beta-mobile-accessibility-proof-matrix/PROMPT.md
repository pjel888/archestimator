# GLM5.2 Plan Pack Prompt: Closed-Beta Mobile And Accessibility Proof Matrix

Date: 2026-07-07
Target folder: `.ai/03_plans/2026-07-07-closed-beta-mobile-accessibility-proof-matrix`
Mode: planning only. Create the plan pack in this folder; do not change application code.

## Goal

Create a closed-beta proof matrix for mobile, desktop guard decisions, keyboard access, screen-reader states, route error states, and critical workflow accessibility.

## Evidence To Start From

- `DESIGN.md` contains alpha-stage design guidance and mobile/UX notes.
- Publisher owner UI currently has mobile-width constraints.
- Storybook is configured in `.storybook/main.ts`; route/e2e specs cover some error and shared-link flows.
- Critical first-user surfaces include landing/beta entry, onboarding, projects, estimates, proposals, sharing, feedback, and settings.

## Required Plan Pack

Define route/device matrix, keyboard expectations, ARIA/state checks, mobile guard policy, Storybook/static checks, browser proof only where needed, defects triage, and launch acceptance.

## Constraints

Respect `DESIGN.md` as alpha guidance, not immutable law. Use proportional visual/browser proof.

## Stop Condition

The pack is complete when closed-beta mobile/accessibility expectations are explicit and testable.

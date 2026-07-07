# GLM5.2 Plan Pack Prompt: First User Activation And Empty Workspace

Date: 2026-07-07
Target folder: `.ai/03_plans/2026-07-07-first-user-activation-empty-workspace`
Mode: planning only. Create the plan pack in this folder; do not change application code.

## Goal

Create a product/UX plan pack for the first-user path from beta entry to first project, first estimate, first area/template, and first publishable proposal.

## Evidence To Start From

- `src/app/workshop/onboarding/page.tsx` and dashboard/workshop components provide entry points but not a complete activation ladder.
- `src/components/workshop/dashboard/WorkshopDashboard.tsx`, `LibraryHubCard.tsx`, `RecentProjectsList.tsx`, and project empty states show zero-state surfaces.
- Existing Joyride/onboarding and UX plans overlap but do not yet prove first value.
- First users are the current stage priority in `AGENTS.md`.

## Required Plan Pack

Define activation success criteria, zero states, guided next actions, sample/demo data policy, onboarding milestones, analytics/evidence, tests, and connections to project/estimate/publishing plans.

## Constraints

Do not create a marketing landing page. Keep the first screen/workshop path useful and concrete for actual estimating work.

## Stop Condition

The pack is complete when an executor can implement a guided first-value path without inventing product decisions mid-build.

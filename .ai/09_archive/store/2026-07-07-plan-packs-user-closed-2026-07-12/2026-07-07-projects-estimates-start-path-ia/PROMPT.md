# GLM5.2 Plan Pack Prompt: Projects And Estimates Start Path IA

Date: 2026-07-07
Target folder: `.ai/03_plans/2026-07-07-projects-estimates-start-path-ia`
Mode: planning only. Create the plan pack in this folder; do not change application code.

## Goal

Create an information-architecture plan for starting projects and estimates cleanly from empty, existing, and returning-user states.

## Evidence To Start From

- `src/components/workshop/projects-page-client.tsx` contains project list, creation, and empty-state behavior.
- `src/components/workshop/ProjectDashboardClient.tsx` and `ProjectEstimatesTable.tsx` control project and estimate progression.
- Empty estimate tables and blank-row behavior may not clearly guide first users.
- Existing plans touch estimate sheet tree and library page UX but not the project-to-estimate start path as a whole.

## Required Plan Pack

Map user paths, primary CTAs, empty/partial/error states, estimate template choices, project metadata needs, route transitions, tests, and analytics/evidence of successful start.

## Constraints

Preserve dense operational UI where appropriate. Avoid decorative onboarding that slows repeated estimator workflows.

## Stop Condition

The pack is complete when a future executor can make project/estimate starts self-evident and measurable.

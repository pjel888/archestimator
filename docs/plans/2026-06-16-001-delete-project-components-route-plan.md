# Delete Project Components Route Plan

Canonical plan: `.ai/03_plans/2026-06-16-Project-Components-Route-Deletion/00-README.md`.

This bridge exists for the LFG workflow gate. The Archestimator source of truth remains the `.ai` plan pack.

## Scope

Delete `/workshop/projects/[projectId]/components` and remove its mini-sidebar entry. Preserve `/workshop/library/components`, shared library components, and estimate-side component workflows.

## Verification

Run the focused Vitest suite, type-check, changed-file ESLint, `git diff --check`, stale route search, and in-app browser sidebar proof listed in the canonical plan.

# GLM5.2 Plan Pack Prompt: Cost Library Data Governance And Source Trust

Date: 2026-07-07
Target folder: `.ai/03_plans/2026-07-07-cost-library-data-governance-and-source-trust`
Mode: planning only. Create the plan pack in this folder; do not change application code.

## Goal

Create a plan pack for production cost-library governance: source provenance, draft/review workflow, trust labels, stale data, import/export safety, and estimate impact.

## Evidence To Start From

- `src/lib/component-library/` contains component/cost-library logic.
- `migrations/0036_cost_library_component_drafts.sql` adds draft support.
- Existing tests reference cost governance/source trust, but production ownership, source confidence, and update cadence need a dedicated plan.
- `AGENTS.md` names cost library as a first-user priority.

## Required Plan Pack

Define data sources, provenance model, review states, role permissions, stale/region/version labels, import validation, estimate update behavior, audit trail, tests, and evidence for first-user trust.

## Constraints

Do not invent authoritative cost data. Explicitly mark owner decisions and unknown source commitments.

## Stop Condition

The pack is complete when cost library data can be trusted, reviewed, and surfaced honestly in estimating workflows.

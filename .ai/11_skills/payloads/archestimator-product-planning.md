# Skill: Archestimator Product Planning

## Use When

- defining product scope or first-user priorities
- deciding whether a feature belongs now or later
- writing a product, UX, or roadmap brief

## Authority

Read in this order:

1. `AGENTS.md` and the FAST PATH in `.ai/10_state/current-state.md`
2. current source for the affected product surface
3. `.ai/00_corpus/ARCHESTIMATOR_MASTER.md`
4. `.ai/01_roadmap/README.md` and any active plan explicitly linked by current
   state

The former `.ai/03_plans/mvp-definition-plan.md` does not exist and is not an
authority. `.ai/06_specs/legacy-repo-lessons.md`,
`.ai/06_specs/mvp-ux-flow.md`, `.ai/06_specs/initial-data-model.md`, and dated
competitor research are historical discovery inputs only; current source and D1
truth override them.

## Current Product Thesis

Archestimator is an AEC-first cost-estimating and proposal workspace. It helps
architects, engineers, contractors, estimators, quantity surveyors, fit-out
teams, interior designers, and suppliers produce and revise structured
commercial estimates faster, with clearer assumptions, scope boundaries,
supplier context, and client-ready handoffs than ad hoc spreadsheets.

Construction cost estimating is the implemented foundation, not a disposable
horizontal wedge. The near-term expansion remains within the AEC ecosystem:
deeper supplier, client-record, portfolio, and proposal-review workflows must
be validated through focused discovery before they become product commitments.

Archestimator is not currently a full ERP, procurement execution suite,
takeoff/CAD/BIM engine, project scheduler, or legal-document automation system.

## Decision Test

For each proposed feature, ask:

1. Which first user and job does it serve now?
2. Does it materially speed an AEC estimate, revision, or proposal handoff?
3. Does it reduce spreadsheet rework while preserving editable assumptions and
   source context?
4. Does current source already provide a simpler path?
5. Can the alpha ship by direct replacement or fix-forward work without growing
   into an enterprise suite?

If the answers are weak, defer the feature or run focused discovery. Ordinary
product work uses Direct or Brief execution; a dated plan pack is reserved for
the expensive-to-reverse cases defined by `AGENTS.md`.

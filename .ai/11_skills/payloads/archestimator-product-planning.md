# Skill: Archestimator Product Planning

## Use When

- defining product scope or first-user priorities
- deciding whether a feature belongs now or later
- writing a product, UX, or roadmap brief

## Authority

Read in this order:

1. `AGENTS.md` and the FAST PATH in `.ai/10_state/current-state.md`
2. current source for the affected product surface
3. `.ai/06_specs/archestimator-product-thesis.md`
4. `.ai/01_roadmap/README.md` and any active plan explicitly linked by current
   state

The former `.ai/03_plans/mvp-definition-plan.md` does not exist and is not an
authority. `.ai/06_specs/legacy-repo-lessons.md`,
`.ai/06_specs/mvp-ux-flow.md`, `.ai/06_specs/initial-data-model.md`, and dated
competitor research are historical discovery inputs only; current source and D1
truth override them.

## Current Product Thesis

Archestimator helps teams produce and revise structured commercial estimates,
quotations, and proposal outputs faster, with clearer assumptions, scope
boundaries, supplier/source context, and client-ready handoffs than ad hoc
spreadsheets.

The implemented proof case remains construction-style estimating and revision
updates for teams managing projects, supplier context, and changing scope. The
broader opportunity includes quote-heavy supplier, sales, buyer, furniture, and
restaurant-supply workflows, but expansion must be revalidated through focused
workflows rather than assumed.

Archestimator is not currently a full ERP, procurement execution suite,
takeoff/CAD/BIM engine, project scheduler, or legal-document automation system.

## Decision Test

For each proposed feature, ask:

1. Which first user and job does it serve now?
2. Does it materially speed a structured quote, estimate, revision, or proposal
   handoff?
3. Does it reduce spreadsheet rework while preserving editable assumptions and
   source context?
4. Does current source already provide a simpler path?
5. Can the alpha ship by direct replacement or fix-forward work without growing
   into an enterprise suite?

If the answers are weak, defer the feature or run focused discovery. Ordinary
product work uses Direct or Brief execution; a dated plan pack is reserved for
the expensive-to-reverse cases defined by `AGENTS.md`.

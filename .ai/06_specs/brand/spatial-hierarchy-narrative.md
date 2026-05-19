# Spatial Hierarchy Narrative

**Status:** Draft
**Created:** 2026-05-19

## Core principle

Archestimator's organizing idea is that a construction estimate should follow the physical and trade logic of the project.

Most estimating tools flatten work too quickly into rows. Rows are useful for calculation, but they are not enough for understanding. Construction work happens in locations, systems, trades, packages, assemblies, and change cycles. The estimate should preserve that structure instead of forcing the estimator to rebuild context mentally.

## The hierarchy

The working Archestimator hierarchy is:

1. **Project** — the commercial container.
2. **Lot group** — a major site/building/project segment.
3. **Structure group** — a building, wing, phase, or major constructed structure.
4. **Floor group** — vertical/spatial breakdown where applicable.
5. **Area group** — room, zone, space, or work area.
6. **Discipline / trade context** — architectural, structural, electrical, plumbing, mechanical, finishes, siteworks, etc.
7. **Cost component / assembly** — reusable construction scope package.
8. **Line item** — priced quantity, unit, labor, supplementary cost, or material row.
9. **Assumption / source note** — why the cost or quantity is what it is.
10. **Revision / proposal consequence** — what changed and how it affects the client-facing output.

This hierarchy is not only data architecture. It is brand architecture.

## Why this matters

Estimators do not only need a total. They need to know where the number came from.

A total becomes trustworthy when the estimator can answer:

- Which part of the project does this cost belong to?
- Which discipline or trade owns it?
- Is this a one-off row or a reusable cost component?
- What quantity basis was used?
- What assumption or supplier note supports it?
- What changed from the previous revision?
- Does the proposal still match the estimate?

Archestimator should make those answers visible by design.

## The intuitive argument

The system feels intuitive because it mirrors how construction people already think:

- buildings have locations;
- scopes belong to trades;
- trades contain assemblies;
- assemblies become quantities and costs;
- costs carry assumptions;
- changes affect the proposal.

Instead of asking the estimator to force all of this into a flat sheet, Archestimator gives the estimate a project-shaped structure.

## The smart argument

The system feels smart because it reduces invisible mental work.

A traditional spreadsheet often requires the estimator to remember:

- where a row belongs;
- whether the same assembly was used elsewhere;
- what assumption produced the unit cost;
- whether a revision affected one room, one floor, or the whole project;
- whether the proposal text is still aligned with the estimate.

Archestimator's smartness is not just automation. It is structured memory. The product remembers the project context so the estimator can focus on judgment.

## The ease argument

Ease does not mean oversimplifying the estimate. Ease means removing unnecessary friction around organization.

Archestimator should make it easier to:

- start a project;
- create the spatial breakdown;
- insert relevant cost components;
- see costs in context;
- revise without losing the old logic;
- issue a proposal that still matches the estimate.

The product should make professional estimating feel less scattered, not less serious.

## Phrase bank

Use these ideas in brand and landing copy:

- “Estimate in the shape of the project.”
- “Organize costs by where the work happens.”
- “A project-shaped estimating workspace.”
- “From location to discipline to cost component.”
- “Keep every line item tied to its place, trade, and assumption.”
- “The estimate should know where each cost belongs.”
- “Build the estimate the way the project is built.”
- “Less row chaos. More project logic.”

## Product design implication

The UI should reinforce the hierarchy visually:

- project identity before estimate detail;
- spatial tree visible near the estimate sheet;
- selected area/context visible while adding row items;
- reusable cost components inserted into the right area;
- financial totals connected to the selected scope;
- revision signals tied to the affected part of the hierarchy;
- proposal output linked to estimate sections, not detached text.

## Brand risk

“Spatial hierarchy” can sound too technical if exposed directly to users. Public copy should often translate it into plain language:

- Instead of “spatial hierarchy,” say “organized by project, floor, area, and scope.”
- Instead of “taxonomy,” say “project structure.”
- Instead of “discipline-aware cost model,” say “costs grouped by trade and work area.”

Use the technical language internally. Use the estimator's language publicly.

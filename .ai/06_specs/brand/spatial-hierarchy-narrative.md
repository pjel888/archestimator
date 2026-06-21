# Offer Structure Narrative

**Status:** Updated to master corpus v4.3 (2026-06-18)
**Created:** 2026-05-19

## Core principle

Archestimator's organizing idea is that a cost estimate should follow the structure of the project. Construction-style spatial hierarchy remains the current implemented proof case.

Most estimating tools flatten work too quickly into rows. Rows are useful for calculation, but they are not enough for understanding. Commercial offers happen in projects, areas, trades, scopes, assemblies, and change cycles. The estimate should preserve that structure instead of forcing the user to rebuild context mentally.

## The hierarchy

The current construction proof-case hierarchy is:

1. **Project** — the commercial container.
2. **Group** — a major building, wing, phase, or scope segment.
3. **Area** — room, zone, space, or work area.
4. **Discipline / trade context** — architectural, structural, electrical, plumbing, mechanical, finishes, siteworks, etc.
5. **Cost component / assembly** — reusable construction scope package.
6. **Line item** — priced quantity, unit, labor, supplementary cost, or material row.
7. **Assumption / source note** — why the cost or quantity is what it is.
8. **Revision / proposal consequence** — what changed and how it affects the client-facing output.

This hierarchy is not only data architecture. It is brand architecture.

## Why this matters

AEC teams do not only need a total. They need to know where the number came from.

A total becomes trustworthy when the estimator can answer:

- Which area, trade, supplier, or part of the project does this cost belong to?
- Is this a one-off row or a reusable cost component?
- What quantity basis was used?
- What assumption or supplier note supports it?
- What changed from the previous revision?
- Does the proposal still match the estimate?

Archestimator should make those answers visible by design.

## The intuitive argument

The system feels clear because it mirrors how AEC teams already think:

- projects have areas and groups;
- areas contain trades, scopes, suppliers, or work packages;
- components become quantities and costs;
- costs carry assumptions;
- changes affect the proposal.

Instead of asking the user to force all of this into a flat sheet, Archestimator gives the estimate a project-shaped structure.

## The smart argument

The system feels smart because it reduces invisible mental work.

A traditional spreadsheet often requires the user to remember:

- where a row belongs;
- whether the same assembly was used elsewhere;
- what assumption produced the unit cost;
- whether a revision affected one area, one trade, or the whole project;
- whether the proposal text is still aligned with the estimate.

Archestimator's smartness is not just automation. It is structured memory. The product remembers the commercial context so the user can focus on judgment.

## The ease argument

Ease does not mean oversimplifying the estimate. Ease means removing unnecessary friction around organization.

Archestimator should make it easier to:

- start a project estimate;
- create the project breakdown;
- insert relevant cost components;
- see costs in context;
- revise without losing the old logic;
- issue a proposal that still matches the estimate.

The product should make professional estimating feel less scattered, not less serious.

## Phrase bank

Use these ideas in brand and landing copy:

- “Estimate in the shape of the project.”
- “Organize costs by how the project will be reviewed.”
- “A project-shaped estimate workspace.”
- “From area to trade to cost component.”
- “Keep every line item tied to its place, source, scope, and assumption.”
- “The estimate should know where each cost belongs.”
- “Build the estimate the way the client will review it.”
- “Less row chaos. More project logic.”

## Product design implication

The UI should reinforce the hierarchy visually:

- project identity before estimate detail;
- project tree visible near the estimate sheet;
- selected area/context visible while adding row items;
- reusable cost components inserted into the right context;
- financial totals connected to the selected scope;
- revision signals tied to the affected part of the hierarchy;
- proposal output linked to estimate sections, not detached text.

## Brand risk

“Spatial hierarchy” can sound too construction-specific if exposed directly. Public copy should often translate it into plain language:

- Instead of “spatial hierarchy,” say “organized by project, area, trade, and scope.”
- Instead of “taxonomy,” say “project structure” or “estimate structure.”
- Instead of “discipline-aware cost model,” say “costs grouped by category, trade, work area, or scope.”

Use the technical language internally. Use the user's language publicly.

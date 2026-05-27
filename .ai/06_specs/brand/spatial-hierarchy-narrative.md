# Offer Structure Narrative

**Status:** Draft
**Created:** 2026-05-19

## Core principle

Archestimator's organizing idea is that a quote or estimate should follow the structure of the offer. Construction-style spatial hierarchy remains the current implemented proof case, but the broader brand should also cover supplier, sales, buyer, furniture, restaurant-supply, and other itemized quotation workflows.

Most quoting tools flatten work too quickly into rows. Rows are useful for calculation, but they are not enough for understanding. Commercial offers happen in packages, products, services, suppliers, locations, scopes, assemblies, and change cycles. The quote should preserve that structure instead of forcing the user to rebuild context mentally.

## The hierarchy

The current construction proof-case hierarchy is:

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

The broader quote/proposal hierarchy can be described as:

1. **Workspace/project/customer** — the commercial container.
2. **Offer package** — a quote section, product group, service group, or project segment.
3. **Product/service/location/scope** — where the line belongs for review.
4. **Supplier/source context** — the vendor, catalog, brand, or price basis.
5. **Cost component / catalog item** — reusable pricing logic.
6. **Line item** — priced quantity, unit, labor, supplementary cost, or material row.
7. **Assumption / source note** — why the cost or quantity is what it is.
8. **Revision / proposal consequence** — what changed and how it affects the buyer-facing output.

## Why this matters

Quote teams do not only need a total. They need to know where the number came from.

A total becomes trustworthy when the estimator can answer:

- Which package, product/service, supplier, or part of the project does this cost belong to?
- Which category, discipline, trade, or supplier owns it?
- Is this a one-off row or a reusable cost component?
- What quantity basis was used?
- What assumption or supplier note supports it?
- What changed from the previous revision?
- Does the proposal still match the estimate?

Archestimator should make those answers visible by design.

## The intuitive argument

The system feels clear because it mirrors how quote-heavy teams already think:

- offers have packages;
- packages contain products, services, suppliers, or work areas;
- components become quantities and costs;
- costs carry assumptions;
- changes affect the proposal.

Instead of asking the user to force all of this into a flat sheet, Archestimator gives the quote an offer-shaped structure.

## The smart argument

The system feels smart because it reduces invisible mental work.

A traditional spreadsheet often requires the user to remember:

- where a row belongs;
- whether the same assembly was used elsewhere;
- what assumption produced the unit cost;
- whether a revision affected one room, one floor, or the whole project;
- whether the proposal text is still aligned with the estimate.

Archestimator's smartness is not just automation. It is structured memory. The product remembers the commercial context so the user can focus on judgment.

## The ease argument

Ease does not mean oversimplifying the quote. Ease means removing unnecessary friction around organization.

Archestimator should make it easier to:

- start a quote or project;
- create the offer breakdown;
- insert relevant cost components;
- see costs in context;
- revise without losing the old logic;
- issue a proposal that still matches the estimate.

The product should make professional quoting and estimating feel less scattered, not less serious.

## Phrase bank

Use these ideas in brand and landing copy:

- “Quote in the shape of the offer.”
- “Organize costs by how the offer will be reviewed.”
- “An offer-shaped quote workspace.”
- “From package to supplier to cost component.”
- “Keep every line item tied to its place, source, scope, and assumption.”
- “The quote should know where each cost belongs.”
- “Build the quote the way the buyer will review it.”
- “Less row chaos. More offer logic.”

## Product design implication

The UI should reinforce the hierarchy visually:

- project/customer identity before quote detail;
- structure tree visible near the quote/estimate sheet;
- selected package/area/context visible while adding row items;
- reusable cost/catalog components inserted into the right context;
- financial totals connected to the selected scope;
- revision signals tied to the affected part of the hierarchy;
- proposal output linked to quote/estimate sections, not detached text.

## Brand risk

“Spatial hierarchy” can sound too construction-specific if exposed directly to broad users. Public copy should often translate it into plain language:

- Instead of “spatial hierarchy,” say “organized by offer, package, supplier, area, and scope.”
- Instead of “taxonomy,” say “offer structure” or “project structure.”
- Instead of “discipline-aware cost model,” say “costs grouped by category, supplier, work area, or scope.”

Use the technical language internally. Use the user's language publicly.

# Archestimator Product Thesis

**Status:** Active high-level thesis after 2026-05-17 reset. Detailed prototype implementation notes from earlier versions are superseded.

## Core thesis

Archestimator should help teams produce and revise structured commercial estimates, quotations, and proposal outputs faster, with clearer assumptions, scope boundaries, supplier/source context, and client-ready handoffs than ad hoc spreadsheets.

## Current implementation baseline

The canonical live state is `.ai/10_state/current-state.md`.

The previous app/workshop prototype was rejected for poor UI/UX and deleted from the live implementation. The immediate reset baseline was only `/` plus blank `/workshop`; the repo has since moved into a small post-reset workshop route slice. Do not use old prototype details as active requirements, and do not treat the current slice as approval to restore the full prototype.

## Product wedge to revalidate

The current implemented wedge remains:

> construction-style estimates and revision updates for teams managing multiple projects, supplier context, and design or scope changes.

The broader market narrative now includes teams that sell through itemized quotations: suppliers, sales teams, buyers, furniture suppliers, restaurant suppliers, and other businesses whose quotes become proposal, approval, purchase-order, or legal-review inputs. This must be revalidated through focused workflows before broadening product scope.

## What future work should preserve

- Structured quote/proposal workflows, with construction-style estimating as the current proof case.
- Editable quantities, rates, scope statuses, assumptions, exclusions, and pricing metadata.
- User-owned cost knowledge rather than pretending seeded prices are authoritative.
- Clear separation between internal pricing detail and client-facing quote/proposal/package outputs.
- Immutable issued outputs if proposal/export functionality returns.
- A calm, professional, high-density interface only after the workflow is accepted.

## What future work must avoid

- Rebuilding the rejected project dashboard/estimate editor/component library route family by default.
- Adding app-shell navigation before real features exist.
- Creating dense controls before the first workflow is accepted.
- Premature local-first repositories or schemas before the UX needs persistence.
- Grid/drag/drop packages before a simple interaction proves insufficient.
- Compatibility redirects for removed prototype routes.

## First restart requirement

Before implementation, write a small plan in `.ai/03_plans/` that answers:

1. Who is the first user?
2. What is the first job they need to complete?
3. What does `/workshop` show first?
4. What is explicitly not included?
5. What is the smallest validation gate?
6. When should the slice be deleted instead of extended?

## Open questions

- First user segment.
- First project/estimate workflow.
- Geography and pricing basis.
- First output format.
- AI role, if any, in v1.

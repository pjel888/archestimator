---
title: Best Practices Research
date: 2026-06-15
status: implementation-ready evidence
type: product-design-research
scope: /workshop/projects
---

# Best Practices Research

## Evidence sources

- WAI-ARIA APG Combobox Pattern: https://www.w3.org/WAI/ARIA/apg/patterns/combobox/
- WAI-ARIA APG Select-Only Combobox Example: https://www.w3.org/WAI/ARIA/apg/patterns/combobox/examples/combobox-select-only/
- NN/g, Defining Helpful Filter Categories and Values for Better UX: https://www.nngroup.com/articles/filter-categories-values/
- NN/g, Filters vs. Facets: Definitions: https://www.nngroup.com/articles/filters-vs-facets/
- Algolia, Faceted Search Overview: https://www.algolia.com/blog/ux/faceted-search-an-overview
- Local source evidence in `01-current-state-audit.md` and `02-component-library-inventory.md`.

## What applies to this product

Archestimator is a dense beta-stage estimating workspace. The projects page is an operational list, not a marketing surface. Controls should be direct, quiet, and repeatable:

- current state visible in the trigger
- no decorative panels
- no hidden mega-popover for a small number of controls
- no empty filter affordance
- keyboard and screen-reader behavior inherited from proven primitives

## View control pattern

The pure UX ideal for four high-frequency display modes is often a segmented control because it keeps every option one click away. This plan still chooses a dropdown because the explicit product request is to consolidate the four buttons into one control and reduce toolbar clutter.

Product-design note: `SegmentedControl` is the lower-interaction-cost view-density pattern (every density one click away, current selection always visible) and it already exists in the repo, used by `ProjectChartsClient`. The `DropdownSelect` is chosen here to satisfy the explicit consolidation request, not because it is unambiguously the UX-optimal choice; treat it as a deliberate, reversible v1 bet and verify discoverability (can a user tell which densities exist and which is active without opening the dropdown?). See RD8 in the decision ledger.

Mitigation for the dropdown tradeoff:

- show the active value in the trigger, for example `View: Large`
- keep all four values in the same order as today
- preserve existing localStorage preference
- test keyboard access and option selected state

## Sort pattern

Sort is distinct from filtering:

- Sorting reorganizes the same result set.
- Filtering removes items from the result set.

This distinction supports a visible Sort control now and argues against a placeholder Filter button. The current page already narrows through search and access tabs. A real Filter button should wait until the plan defines actual facets.

For v1, Sort should be a small field picker plus direction toggle rather than a large "Organize" popover. The user needs quick access to common orderings, not a configuration surface.

## Filter/facet implications

NN/g guidance says useful filters need categories and values that are appropriate, predictable, jargon-free, and prioritized. The current plan has no validated filter categories beyond access tabs and search text. Adding a generic Filter button now would increase interaction cost and create an empty promise.

Recommended follow-up only after evidence:

- Access filter if tabs become insufficient.
- Client filter if project counts make client navigation common.
- Location filter if location is consistently populated and meaningful.
- Favorites-only if favorite projects become a navigation habit.
- Publication/share state only if that state is reliable in the list data.

## Accessibility implications

WAI-ARIA APG supports a combobox/listbox model for select-only value selection. The repo's `DropdownSelect` already maps to this model: trigger as combobox, popup as listbox, options with selected state, focus managed through the existing popup system.

Plan tests should assert:

- View and Sort are named comboboxes.
- Options are selectable and expose selected state.
- Escape closes without an accidental committed change.
- Selection returns focus to the trigger or otherwise follows the existing primitive behavior.

Do not write tests against `menuitemradio` or `aria-checked`; those belong to a different menu implementation and are not this plan's chosen primitive.

## Responsive implications

The page header is a fixed, compact operational toolbar. Dynamic labels must be constrained. The implementation should verify:

- no wrapping in the 38px toolbar row
- Add remains reachable and right aligned
- Sort label truncates before layout breaks
- narrow viewport can degrade to shorter labels while preserving accessible names

## Product-design decision

Ship View + Sort now. Defer Filter, Group, Favorites-first, server preference sync, and cross-page design-system standardization until they have product evidence and a separate blast-radius plan.

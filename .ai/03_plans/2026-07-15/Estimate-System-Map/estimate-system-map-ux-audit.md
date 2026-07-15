# Estimate System Map — UX Audit

## Audit scope

- Surface: `/admin/estimate-system`
- Before capture: `.ai/03_plans/2026-07-15/Estimate-System-Map/estimate-system-map-before.png`
- Audit mode: focused UX and information-architecture audit

## User goal

Understand what Archestimator does, where each part of the product lives, and how one feature works without first learning the implementation architecture.

## Strengths in the previous surface

- The route was read-only and intentionally curated.
- The underlying source coverage was broad.
- Nodes exposed useful ownership and behavior details for deep technical investigation.

## Notable risks

1. **No orientation layer.** The first view presented 48 system nodes and 67 transitions before explaining the product journey.
2. **Mixed documentation levels.** Pages, domain entities, storage boundaries, calculations, audit evidence, and compatibility paths occupied the same canvas.
3. **Controls before comprehension.** Lenses, scenarios, search, domain filters, status filters, zoom controls, and an empty inspector competed for attention.
4. **Implementation language in a product map.** Storage and calculation details answered engineering questions that the primary documentation view had not asked.
5. **Page and feature concepts were inseparable.** The graph could not clearly answer either “where does this live?” or “how does this user goal work?”
6. **The default viewport hid most of the graph.** Understanding depended on zooming, panning, filtering, or already knowing what to inspect.

## Opportunity areas

- Start with the estimator's journey from Workshop to client review.
- Separate page records (where) from feature flows (how).
- Show one feature or one page at a time.
- Keep reusable Library content visible as support for estimating, not as another step in the main journey.
- Move source files and implementation detail behind optional disclosure.
- Use the real current routes and product names; exclude redirects and compatibility-era concepts.

## Implemented direction

The replacement uses three progressively disclosed views:

1. **Product** — six stable product areas and one five-step journey.
2. **Features** — one selected user goal, its flow, behavior rules, related pages, and optional source notes.
3. **Pages** — one selected route, its purpose, visible regions, actions, linked features, and next pages.

Final evidence:

- Product: `.ai/03_plans/2026-07-15/Estimate-System-Map/estimate-system-map-final-product.png`
- Variant feature: `.ai/03_plans/2026-07-15/Estimate-System-Map/estimate-system-map-feature-variant.png`
- Estimate page: `.ai/03_plans/2026-07-15/Estimate-System-Map/estimate-system-map-page-estimate.png`
- Compact layout: `.ai/03_plans/2026-07-15/Estimate-System-Map/estimate-system-map-final-compact.png`

## Result

The admin route now answers the product question first and exposes technical grounding only when requested. The all-system dependency landscape is no longer the default documentation experience.

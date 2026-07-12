# 10 — Variants Clarification (non-gap confirmation)

> A prior memory note flagged "the variants should be accommodated as well." This
> addendum records the evidence-grounded conclusion so future agents don't chase a
> phantom gap. **Read-only audit; no code changed.**

## Conclusion

**"Variants" is NOT a gap on the `/share/[token]` page.** Archestimator has **no
estimate-level variant / alternate / scenario concept** in the schema, domain types,
snapshot, or any UI. The variant concept that *does* exist belongs to the
**component-library** domain (price-option variants per library item), which is a
**Workshop-Library** concern, covered by the sibling
`2026-07-12/Workshop-Library-Audit/04-VARIANT-AND-COMPONENT-FLOW.md` pack — not a
Shared-Estimate-Page concern.

The genuine in-estimate subdivision — **estimate tabs** — **is already fully
accommodated** end-to-end (snapshot → share tree → tabs UI → print package).

## Evidence

### No estimate-variant/alternate/scenario concept exists
- `grep estimate_variant|estimate_alternate|estimate_scenario` across `migrations/` and
  `supabase/migrations/` → **zero matches.** No table, column, or type models alternate
  cost estimates for an estimate.
- Every `variant`/`alternate`/`scenario` hit in `src/` resolves to one of three unrelated
  things: A/B-test variants (`src/lib/ab-testing/**`), UI "surface" variants
  (`estimate-surface-variant.tsx`, button `variant=` props), or component-library
  price-option variants (below).

### Component-library variants (the only real variant concept — a Workshop-Library concern)
- `src/lib/estimates/types.ts:45-81` — `ComponentPriceOption` (`variantDescription`,
  `variantSortOrder`, `costEntries: ComponentVariantCostEntry[]`).
- `supabase/migrations/20260523120957_component_library_item_versioning.sql:40` —
  `cost_library_item_price_options`.
- `migrations/0028_component_library_action_support.sql:65` —
  `cost_library_item_variant_cost_entries`.
- Covered by `2026-07-12/Workshop-Library-Audit/04-VARIANT-AND-COMPONENT-FLOW.md`.

### Estimate tabs (the real in-estimate subdivision — already fully shipped)
- Schema: `supabase/migrations/20260612094734_estimate_tabs_foundation.sql:12` —
  `estimate_tabs (id, estimate_id, name, sort_order, is_default, archived_at, …)`.
- Snapshot types: `src/lib/publication/types.ts:83-98` — `PublicationSnapshotEstimateTab`
  `{ id, name, sortOrder, isDefault, rowCount, totalCost, rowIds?, rows?, treeNodes? }`.
- Snapshot builder populates tabs: `src/lib/publication/snapshot.ts:416-475`
  (`buildSnapshotEstimate`); `schemaVersion` bumps to `1.3` when tabs exist (`:504`).
- Build query selects tabs: `src/lib/publication/actions.ts:644-650`.
- Share tree consumes tab `treeNodes`: `src/lib/share/reconstruct-share-tree.ts:269-338`.
- Share UI gives an estimate picker AND a per-estimate tab picker, with per-tab totals:
  `src/components/share/SharePageTabs.tsx:138-182,738-771`.

### Publisher chooses estimates, not variants
- `src/components/workshop/publisher/ShareWizard.tsx:40,53-56,148,289-290` — publish
  wizard selects **which estimate sheets** to publish (`selectedEstimateIds`). No variant
  axis in the publish decision.

## If a true estimate-variant concept is ever introduced (hypothetical, out of scope)

IF product later adds real estimate-level alternates/scenarios (e.g. "Option A / Option B"
cost versions), the change set would span (none of these reference variants today):
schema (new table in `migrations/`), snapshot types
(`src/lib/publication/types.ts:100-151`), snapshot builder (`snapshot.ts:62-70,416-516`),
source query (`actions.ts:609-673`), public-id opacification (`snapshot.ts:72-83,146-190`
— new `PublicationIdKind`), share tree reconstruction, share tabs/picker/comparison
(`SharePageTabs.tsx`), summary total (`SharePageSummaryCard.tsx:86`), donut
(`aggregate-share-chart-buckets.ts`), comment targets, print package
(`SharePageTabs.tsx:160-182`), and publisher selection (`ShareWizard.tsx`).

This is **hypothetical** — record it only so a future estimate-variant feature has a
blast-radius starting point. It is not a current gap and not in this pack's scope.

## Decision

```
DEC-AUTO-006
Question: Should the Shared-Estimate-Page pack add "accommodate variants" to its scope?
Evidence: No estimate-variant concept exists; component variants are a Workshop-Library
  concern (sibling pack); estimate tabs are already fully published and surfaced.
Options: (a) add estimate-variant scope here; (b) confirm non-gap, defer component
  variants to the Workshop-Library pack; (c) leave open.
Decision: (b) confirm non-gap. The memory note refers to component-library variants,
  which the Workshop-Library-Audit pack already owns.
Confidence: high. Rollback: if product later adds true estimate alternates, open a new
  dated pack and use the hypothetical blast-radius list above as the starting point.
Responsible role: lead planning architect.
```

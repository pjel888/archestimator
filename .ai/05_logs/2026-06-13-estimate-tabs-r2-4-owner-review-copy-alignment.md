# Estimate Tabs R2.4 Owner/Product Review Copy Alignment

**Date:** 2026-06-13
**Branch:** `feat/estimate-tabs-phase5-templates-panel`
**Scope:** R2.4 marketing/landing copy owner-review gate for `.ai/03_plans/2026-06-12-Projects-Auto-Added-To-Templates`.

## Decision

Owner/product review authority was delegated in the active goal on 2026-06-13. The reviewed decision is to align public product/workspace nouns to **estimates** and **tabs** outside actual Excel/spreadsheet contexts. Explicit Excel import/handoff and spreadsheet-handoff language remains because it describes external files, not the Archestimator estimate surface.

## Implementation

Updated public copy in:

- `src/app/features/page.tsx`
- `src/app/pricing/page.tsx`
- `src/app/about/page.tsx`
- `src/components/landing/AnimatedProposalRecordSection.tsx`
- `src/components/landing/FeaturesSection.tsx`
- `src/components/landing/PricingSection.tsx`
- `src/components/landing/SecondaryClaimSection.tsx`

Added a source-text contract in `tests/vitest/closed-beta-pricing-copy.test.ts` that rejects non-Excel public `quote sheets` / `multi-sheet` / `structured sheet` drift while allowing `Excel quote sheets` and `spreadsheet/document handoff` in the FAQ.

## Fresh local evidence

```text
label=vitest-r2-4-owner-review-copy-red exit_code=1 command="bun x vitest run tests/vitest/closed-beta-pricing-copy.test.ts --maxWorkers=1" result="new R2.4 source-text contract failed before copy alignment"
label=vitest-r2-4-owner-review-copy-green exit_code=0 command="bun x vitest run tests/vitest/closed-beta-pricing-copy.test.ts --maxWorkers=1" result="1 file / 3 tests passed"
label=rg-r2-4-public-copy-residue exit_code=0 command="rg -n 'structured quote sheets|multi-sheet estimates|multiple quote sheets|version-labeled sheets|quote sheets|structured sheet|same sheet|cost sheets|quote sheet' src/app/features src/app/pricing src/app/about src/components/landing tests/vitest/closed-beta-pricing-copy.test.ts" result="only test assertions and allowed FAQ 'Excel quote sheets' remain"
```

## Boundary

This closes the R2.4 owner/product review gate locally. It does not claim hosted browser proof, Vercel deploy, production proof, or analytics/conversion impact proof.

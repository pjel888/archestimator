# Bug: CostDonutChart Visible Debug Badge on Public Share Page

**Title:** `CostDonutChart` renders visible developer debug badge on client-facing share page
**Classification:** Bug / Production Quality Blocker
**Date Discovered:** 2026-06-03 (second-pass plan refinement)
**Discovery Context:** Second-pass audit of share page UX/UI overhaul plan. Codebase inspection of `CostDonutChart.tsx`.

## Evidence

**File:** `src/components/charts/CostDonutChart.tsx:325-327`
```tsx
{/* Debug badge — always visible so user can report back what they see */}
<div className="absolute right-1 top-1 z-10 rounded-xs bg-black/70 px-1.5 py-px text-[8px] text-white tabular-nums">
  🍩 buckets:{data.length} total:{safeTotal}
</div>
```

The comment itself says "always visible so user can report back what they see" — confirming this is developer-facing debug output intentionally shown to users.

**Additional design-system violations in the same code block:**
- `bg-black/70` — hardcoded color outside Archestimator design tokens (should use `bg-ink/70` or equivalent)
- `text-white` — hardcoded color outside design tokens
- `🍩` — emoji in production UI

## Reproduction

1. Run `bun run dev`
2. Navigate to any share URL with estimate data: `http://localhost:3000/share/vTePfd5eq4ZbBFzHNae0JYOCLfPd_QcrW4F3cnf9Y_E`
3. Observe the "🍩 buckets:X total:YYYYY" badge in the top-right corner of the donut chart

## Expected Behavior

No visible developer/debug artifacts on any client-facing page.

## Actual Behavior

A black semi-transparent badge with emoji and bucket/total counts is permanently visible in the top-right corner of every `CostDonutChart` instance on the public share page.

## Suspected Root Cause

The badge was added during development for debugging bucket computation and was intentionally left visible rather than gated behind a dev flag or removed.

## Affected Files/Modules

- `src/components/charts/CostDonutChart.tsx` (lines 325-327)

## Impact

- **Severity:** High (visible on client-facing proposal review page)
- **User Impact:** Clients see a "🍩 buckets" emoji badge with internal data counts — unprofessional and erodes trust
- **Design System:** Multiple violations (hardcoded colors, emoji, non-design-system styling)

## Relationship to Current Plan

This bug is directly related to `AC-VISUAL-005` ("No visible developer/debug artifacts") in `.ai/03_plans/2026-06-03-share-page-client-review-ux-ui-overhaul/01_REQUIREMENTS_AND_ACCEPTANCE_CRITERIA.md`. It is a blocking quality issue for the share page UX/UI overhaul.

## Proposed Fix Plan

1. Remove the debug badge div entirely (`CostDonutChart.tsx:325-327`)
2. If debugging info is still needed, gate behind `process.env.NODE_ENV === "development"` or a dedicated env flag
3. Ensure no other debug artifacts remain in the component tree

## Verification Plan

1. DOM test: Assert that `CostDonutChart` rendered output does NOT contain the text "buckets:" or the emoji "🍩"
2. Visual inspection: Navigate to target share URL, confirm no debug badge visible
3. `bun run lint:design-system` passes

## Status

**Open** — requires implementation during share page overhaul (Phase 3: Language & Artifacts in plan sequence)

## References

- Plan folder: `.ai/03_plans/2026-06-03-share-page-client-review-ux-ui-overhaul/`
- Acceptance criterion: `AC-VISUAL-005` in `01_REQUIREMENTS_AND_ACCEPTANCE_CRITERIA.md`
- Related: `.ai/15_Bugs/2026-06-03-share-page-cost-donut-chart-hydration-mismatch.md` (same component, different issue)

# 15 — Hydration Fix Plan (CostDonutChart)

**Plan:** Share Page Client Review UX/UI Overhaul  
**Date:** 2026-06-03  
**Bug Reference:** `.ai/15_Bugs/2026-06-03-share-page-cost-donut-chart-hydration-mismatch.md`

---

## Problem

`CostDonutChart` uses D3 v7 to compute SVG path geometry. The floating-point arithmetic produces slightly different numeric values between Node.js (SSR) and browser (hydration) runtimes. React treats these as attribute mismatches, producing:

```
A tree hydrated but some attributes of the server rendered HTML didn't match the client properties.
```

The specific mismatch is in `c.connector` path `d` attributes at `CostDonutChart.tsx:375`.

---

## Solution: Deterministic SVG Rounding

### Approach
Round all numeric SVG attribute values to 4 decimal places before rendering. This eliminates floating-point precision differences between runtimes while maintaining sub-pixel accuracy.

### Implementation

#### Step 1: Create SVG Rounding Utility
**File:** `src/lib/charts/svg-rounding.ts` (NEW)

```typescript
const SVG_PRECISION = 4; // decimal places

/**
 * Round a number to SVG-safe precision.
 * D3 computations produce ~14 decimal places, but pixel rendering
 * only needs ~2-4. Rounding to 4 ensures server/browser determinism
 * while maintaining smooth curves.
 */
export function roundSvgNumber(n: number, precision = SVG_PRECISION): number {
  const factor = Math.pow(10, precision);
  return Math.round(n * factor) / factor;
}

/**
 * Round all numbers in an SVG path `d` attribute to fixed precision.
 * Handles M, L, C, Q, A, Z commands and their coordinate pairs.
 */
export function roundSvgPath(pathD: string, precision = SVG_PRECISION): string {
  // Match numbers (including scientific notation, negative, decimals)
  return pathD.replace(/-?\d+\.?\d*(?:e[+-]?\d+)?/gi, (match) => {
    const num = parseFloat(match);
    if (isNaN(num)) return match;
    return roundSvgNumber(num, precision).toString();
  });
}

/**
 * Format a number for use in SVG attributes.
 * Returns a string suitable for direct use in JSX.
 */
export function formatSvgNumber(n: number, precision = SVG_PRECISION): string {
  return roundSvgNumber(n, precision).toFixed(precision);
}
```

#### Step 2: Apply to CostDonutChart
**File:** `src/components/charts/CostDonutChart.tsx` (MODIFY)

Apply rounding to all D3-generated SVG output:

1. **Arc paths** (pie slices):
   ```tsx
   // Before:
   <path d={arc(slice) ?? ""} ... />
   // After:
   <path d={roundSvgPath(arc(slice) ?? "")} ... />
   ```

2. **Connector lines** (callout connectors — PRIMARY BUG):
   ```tsx
   // Before:
   <path d={c.connector} ... />
   // After:
   <path d={roundSvgPath(c.connector)} ... />
   ```

3. **Transform attributes**:
   ```tsx
   // Before:
   transform={`translate(${x}, ${y})`}
   // After:
   transform={`translate(${formatSvgNumber(x)}, ${formatSvgNumber(y)})`}
   ```

4. **Position attributes** (cx, cy, r, x, y):
   ```tsx
   // Before:
   cx={x}
   // After:
   cx={formatSvgNumber(x)}
   ```

5. **Text positioning** (label positions):
   Apply same rounding to text x, y coordinates.

### Performance Impact
- Rounding is applied once per render (not per frame)
- SVG path strings are typically < 200 characters
- String replacement on small strings is negligible (< 1ms)
- Total impact: immeasurable

### Verification

1. **Unit test** (`cost-donut-chart-hydration.test.tsx`):
   - Render `CostDonutChart` with identical props twice → output must be identical
   - All SVG path `d` attributes must contain numbers with ≤ 4 decimal places

2. **Manual QA**:
   - `bun run dev` → navigate to share URL → zero hydration warnings
   - `bun run build && bun run start` → navigate to share URL → zero hydration warnings

3. **Regression check**:
   - Workshop charts (`/workshop/projects/[projectId]/charts`) still render correctly
   - No visual degradation in chart appearance

---

## Alternative Approaches (Rejected)

| Approach | Why Rejected |
|----------|-------------|
| Client-only render (`useEffect` gate) | Flash of placeholder, potential CLS, loses SSR benefit |
| `suppressHydrationWarning` on SVG elements | Masks the symptom, doesn't fix the root cause; may hide real mismatches |
| Pre-computing D3 output on server only | D3 is designed for browser; server-side pre-computation complex and fragile |
| Using a different charting library | Migration cost too high; D3 is integrated across workshop and share pages |

---

## Rollback

If the rounding causes any visual issues:
1. Revert `CostDonutChart.tsx` changes
2. Delete `src/lib/charts/svg-rounding.ts`
3. Hydration warnings return but functionality is unaffected

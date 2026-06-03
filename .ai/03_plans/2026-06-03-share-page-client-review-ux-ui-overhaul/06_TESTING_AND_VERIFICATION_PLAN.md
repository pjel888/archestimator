# 06 — Testing & Verification Plan

**Plan:** Share Page Client Review UX/UI Overhaul
**Date:** 2026-06-03

---

## Existing Relevant Commands

```bash
bun run validate          # Full gate: type-check + lint + design-system + unit + DOM tests
bun run build             # Next.js production build (Turbopack)
bun run lint:design-system # Custom design-system enforcement
bun run test:dom          # Vitest DOM tests (--maxWorkers=1)
bun run type-check        # tsc --noEmit
bun run lint              # ESLint
git diff --check          # Whitespace validation
```

---

## Targeted Tests Needed

### New Tests to Create

| Test File | Purpose | Type |
|-----------|---------|------|
| `tests/vitest/share/cost-donut-chart-hydration.test.tsx` | Regression: `CostDonutChart` produces deterministic SVG from identical props | DOM/Vitest |
| `tests/vitest/share/share-page-proposal-header.test.tsx` | New component: renders project info, status, metadata correctly | DOM/Vitest |
| `tests/vitest/share/share-page-decision-bar.test.tsx` | New component: renders buttons, confirmation modal, locked state | DOM/Vitest |
| `tests/vitest/share/share-page-comments-state.test.tsx` | New behavior: comments load from server, display correctly | DOM/Vitest |
| `tests/vitest/share/share-page-decision-state.test.tsx` | New behavior: decision state loads from server, persists on reload | DOM/Vitest |

### Existing Tests to Update

| Test File | Changes Needed |
|-----------|---------------|
| `tests/vitest/project-publication-page.test.tsx` | Update assertions for removed "View-only" text, new layout structure |
| `tests/vitest/project-publication-comments.test.tsx` | Update for visual changes, history loading |
| `tests/vitest/project-publication-decision.test.tsx` | Update for component extraction, new DecisionBar |
| `tests/vitest/project-publication-header.test.tsx` | Update for header restructure |

### Tests to Verify (No Changes Expected)

| Test File | Check |
|-----------|-------|
| `tests/vitest/project-publication-actions.test.ts` | Still passes |
| `tests/vitest/project-publication-activity.test.tsx` | Still passes |
| `tests/vitest/project-publication-public-repository.test.ts` | Still passes |
| `tests/vitest/project-publication-security.test.ts` | Still passes |
| `tests/vitest/project-publication-security-headers.test.ts` | Still passes |
| `tests/vitest/project-publication-schema.test.ts` | Still passes |
| `tests/vitest/project-publication-snapshot.test.ts` | Still passes |
| `tests/vitest/project-publication-summary.test.ts` | Still passes |
| `tests/vitest/share/reconstruct-share-tree.test.ts` | Still passes |

---

## Hydration Regression Test Specification

**File:** `tests/vitest/share/cost-donut-chart-hydration.test.tsx`

```typescript
// Test: CostDonutChart produces identical SVG output from identical props
describe("CostDonutChart hydration determinism", () => {
  it("produces identical SVG output across multiple renders", () => {
    const buckets = [/* test buckets */];
    const render1 = renderToString(<CostDonutChart buckets={buckets} total={1000} currencyCode="PHP" label="Test" compact />);
    const render2 = renderToString(<CostDonutChart buckets={buckets} total={1000} currencyCode="PHP" label="Test" compact />);
    expect(render1).toBe(render2);
  });

  it("produces deterministic SVG path d attributes", () => {
    const buckets = [/* test buckets */];
    const { container } = render(<CostDonutChart buckets={buckets} total={1000} currencyCode="PHP" label="Test" compact />);
    const paths = container.querySelectorAll("path[d]");
    paths.forEach(path => {
      const d = path.getAttribute("d")!;
      // Verify all numbers in d attribute are rounded to ≤4 decimal places
      const numbers = d.match(/[\d.]+/g) || [];
      numbers.forEach(n => {
        const decimals = n.split(".")[1];
        expect(decimals?.length || 0).toBeLessThanOrEqual(4);
      });
    });
  });
});
```

---

## Manual QA Protocol

### Share Page (Production Build)
```bash
bun run build && bun run start
# Navigate to: http://localhost:3000/share/vTePfd5eq4ZbBFzHNae0JYOCLfPd_QcrW4F3cnf9Y_E
```

**Checks:**
1. [ ] Zero hydration warnings in browser console (Cmd+Opt+J)
2. [ ] No "View-only" text visible anywhere
3. [ ] No "Visits are logged" text in main content area
4. [ ] Proposal header shows project name prominently
5. [ ] Cover image renders (if present)
6. [ ] Estimate tabs work (click between sheets)
7. [ ] Donut chart renders without visual glitches
8. [ ] Tree View / Grid Preview sub-tabs work
9. [ ] Decision buttons visible and clickable (if recipient session active)
10. [ ] Comment composer works (if recipient session active)
11. [ ] Mobile layout (375px): no horizontal overflow, buttons wrap
12. [ ] Tablet layout (768px): comfortable spacing
13. [ ] Desktop layout (1024px+): full-width, clean hierarchy

### Password-Gated Publication
1. [ ] Navigate to password-protected share URL
2. [ ] Password form renders correctly
3. [ ] Enter wrong password → error message
4. [ ] Enter correct password → content reveals

### Print Stylesheet
1. [ ] Cmd+P → print preview looks professional
2. [ ] No interactive UI elements visible (decision buttons, comment composer hidden)

---

## Pass/Fail Definitions

### Build Gate (MUST PASS)
| Check | Pass Condition |
|-------|---------------|
| `bun run type-check` | Exit 0, no errors |
| `bun run lint` | Exit 0, no new errors |
| `bun run lint:design-system` | Exit 0, no violations |
| `bun run test:dom` | Exit 0, all tests pass |
| `bun run build` | Exit 0, successful build |
| `git diff --check` | Exit 0, no whitespace issues |

### Functional Gate (MUST PASS)
| Check | Pass Condition |
|-------|---------------|
| Hydration warning | Zero console warnings on share page |
| Comment submission | POST succeeds, comment appears |
| Decision submission | POST succeeds, decision badge appears |
| Password gate | Still functional |
| Recipient session | Still functional |
| Existing tests | All 13 publication test files pass |

### Quality Gate (SHOULD PASS)
| Check | Pass Condition |
|-------|---------------|
| Mobile layout | Usable at 320px |
| Accessibility | Keyboard navigable, screen reader friendly |
| Visual consistency | Design system compliant |
| No regressions | Workshop charts unaffected by CostDonutChart changes |

---

## E2E Tests

Playwright E2E tests are available but gated behind `ARCHESTIMATOR_E2E_SHARED_LINK=1`. If the environment supports it:

```bash
ARCHESTIMATOR_E2E_SHARED_LINK=1 bun run test:e2e -- --project=chromium
```

This should be run after implementation to verify no E2E regressions.

---

## If Tests Are Not Possible

For visual/manual verification where automated tests are impractical:
- Screenshot comparisons (before/after at multiple viewports)
- Manual QA checklist completion (signed off by implementer)
- Console log capture proving zero hydration warnings

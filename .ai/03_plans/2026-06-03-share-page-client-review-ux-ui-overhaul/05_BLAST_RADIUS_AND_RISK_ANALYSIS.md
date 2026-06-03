# 05 — Blast Radius & Risk Analysis

**Plan:** Share Page Client Review UX/UI Overhaul  
**Date:** 2026-06-03  

---

## Affected User Flows

| Flow | Impact | Risk |
|------|--------|------|
| Public share page viewing (unauthenticated) | Visual changes only | LOW |
| Password-gated publication access | Visual changes to password gate page may be affected if layout is restructured | MEDIUM |
| Recipient session initialization (`?recipient=`) | No logic changes — visual presentation of banner only | LOW |
| Comment submission | No logic changes — visual redesign + history loading addition | MEDIUM |
| Decision submission | No logic changes — placement change (sidebar → horizontal bar) | MEDIUM |
| Estimate viewing (tabs, tree, grid, chart) | Visual changes to layout, hydration fix for chart | MEDIUM |
| Owner-side publication manager | No changes — workshop surface untouched | NONE |
| Activity feed (owner) | No changes | NONE |

---

## Affected Modules

### Direct Changes
| Module | Change Level | Risk |
|--------|-------------|------|
| `src/app/share/[token]/page.tsx` | Significant — layout restructure, copy changes | MEDIUM |
| `src/components/share/SharePageTabs.tsx` | Minor — visual restyle only | LOW |
| `src/components/share/SharePageComments.tsx` | Significant — visual redesign + state loading | MEDIUM |
| `src/components/share/SharePageDecision.tsx` | Significant — extract to new component | MEDIUM |
| `src/components/share/SharePageHero.tsx` | Minor — possible restyle | LOW |
| `src/components/share/SharePageSessionBanner.tsx` | Minor — restyle language + tone | LOW |
| `src/components/charts/CostDonutChart.tsx` | Moderate — deterministic rounding applied | MEDIUM |

### Indirect Impact (No Changes)
| Module | Risk |
|--------|------|
| `src/lib/publication/*` | NONE — no logic or schema changes |
| `src/app/api/share/[token]/*` | NONE — API routes unchanged |
| `src/components/share/ShareEstimateTreeView.tsx` | LOW — rendered inside SharePageTabs, but component itself unchanged |
| `src/components/share/ShareEstimateTreePanel.tsx` | LOW — same |
| `src/components/share/ProjectPublicationPasswordForm.tsx` | LOW — rendered inside page, but component unchanged |
| `src/components/share/SharePageRecipientSessionInitializer.tsx` | NONE — untouched |

---

## Affected Tests

| Test File | Impact | Risk |
|-----------|--------|------|
| `tests/vitest/project-publication-page.test.tsx` | May need updates for copy changes ("View-only" removal, new layout) | MEDIUM |
| `tests/vitest/project-publication-comments.test.tsx` | May need updates for visual changes + history loading | MEDIUM |
| `tests/vitest/project-publication-decision.test.tsx` | May need updates for component extraction | MEDIUM |
| `tests/vitest/project-publication-header.test.tsx` | May need updates for header changes | LOW |
| All other 9 publication test files | No expected impact | LOW |

---

## Possible Regressions

| Regression | Likelihood | Severity | Detection |
|------------|-----------|----------|-----------|
| Password gate fails to render | LOW | HIGH | Manual QA + existing tests |
| Recipient session not detected | LOW | HIGH | Manual QA + existing tests |
| Comment submission broken | LOW | HIGH | Existing tests + manual QA |
| Decision submission broken | LOW | HIGH | Existing tests + manual QA |
| Chart rendering broken (visual) | MEDIUM | MEDIUM | Manual QA |
| Chart hydration warning returns | MEDIUM | MEDIUM | Regression test + manual QA |
| Layout break on specific viewport widths | MEDIUM | MEDIUM | Manual QA (multiple viewports) |
| Design-system lint failure | MEDIUM | LOW | `bun run lint:design-system` |
| Build failure | LOW | HIGH | `bun run build` |
| Type error from component refactor | LOW | MEDIUM | `bun run type-check` |

---

## Edge Cases

| Case | Mitigation |
|------|-----------|
| Share page with no estimates (empty snapshot) | `SharePageTabs` returns `null` — ensure page still renders gracefully |
| Share page with 10+ estimate sheets | Tab overflow: horizontal scroll with fade masks (existing behavior) |
| Recipient visits without `?recipient=` parameter | Session not initialized, shows "session required" banner |
| Recipient visits with expired session cookie | Session validation fails, shows "session required" banner |
| User submits decision, then reloads before API responds | Decision state should be loaded from server on reload (Phase 5) |
| User submits comment while offline | Queued in sessionStorage, flushed on reconnect (existing behavior) |
| Password-protected publication with no cover image | Hero component returns null gracefully (existing behavior) |
| Extremely long project name | Text truncation in header (CSS overflow handling) |
| Share page viewed on very narrow viewport (320px) | Flex-wrap on buttons, responsive padding |
| Chart renders with zero-cost buckets | Chart should handle gracefully (empty donut) |

---

## Risk Matrix

| Risk | Severity | Likelihood | Score | Mitigation |
|------|----------|-----------|-------|------------|
| Password gate regression | HIGH | LOW | MEDIUM | Don't touch password gate code path |
| Recipient session regression | HIGH | LOW | MEDIUM | Don't touch session init/cookie logic |
| Comment/decision logic regression | HIGH | LOW | MEDIUM | Keep API call logic, only change component structure |
| Hydration fix introduces new visual bug | MEDIUM | MEDIUM | MEDIUM | Regression test + manual QA |
| Layout breakage on mobile | MEDIUM | MEDIUM | MEDIUM | Test at multiple viewports |
| Design-system lint failure | LOW | MEDIUM | LOW | Run lint after every change |
| Build/type failure | HIGH | LOW | MEDIUM | Build after every phase |
| Existing test failures | MEDIUM | MEDIUM | MEDIUM | Run test suite after every phase |
| Supabase/security boundary change | CRITICAL | NONE | NONE | Zero changes to data/security layer |
| Merge conflict with other branches | MEDIUM | MEDIUM | MEDIUM | Work on isolated feature branch |

---

## Rollback Strategy

### Per-Phase Rollback
Each phase is independently reversible:
- **Git revert** the phase commit
- Re-run validation to confirm green state
- Document what was reverted

### Full Rollback
If the entire overhaul needs to be reverted:
1. Drop the feature branch
2. Revert to pre-implementation commit on `main`
3. Run `bun run validate` to confirm baseline

### Partial Rollback
Individual components can be reverted:
- Revert `CostDonutChart` changes → hydration warning returns but everything else works
- Revert layout changes → old layout returns
- Revert copy changes → old language returns
- Revert new components → delete the files

---

## Concurrency Risks

- Other agents may be working on share/publication code simultaneously
- Use isolated feature branch (`feat/share-page-client-review-ux-ui-overhaul`)
- Pull latest `main` before starting
- No shared mutable state with other features

---

## GitNexus / Code-Review Graph Impact Requirements

Per `AGENTS.md` and operating protocol:
- Before editing any exported symbol, run `gitnexus_impact` or `code-review-graph` impact analysis
- `CostDonutChart` is shared between share page and workshop charts — verify workshop charts unaffected
- All share page components are consumer-side only (no upstream callers beyond the page route)
- Risk: LOW — changes are isolated to public share surface

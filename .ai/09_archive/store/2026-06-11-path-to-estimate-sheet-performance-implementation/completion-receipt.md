# Completion Receipt — Path-To-Estimate-Sheet Performance Implementation

**Date**: 2026-06-11
**Branch**: `perf/path-to-estimate-sheet` (created from `claude/projects-pages-ux-and-ui-design` @ 626d44a)
**Status**: COMPLETED_WITH_PROVIDER_BLOCKERS (database + authenticated-browser channels unavailable this run; deferred units carry ready designs and reopen triggers)

## Commit range

626d44a..HEAD on `perf/path-to-estimate-sheet`:

- 3c85dcc test(perf): prove the estimate-sheet keystroke render cascade before optimizing (U0/U0A)
- 96563ca perf(workshop): stop keystrokes from re-rendering every estimate row table (U1)
- aa7c10d perf(repositories): fetch only consumed columns for estimate-sheet tree loads (U2)
- 959f9d9 perf(workshop): lazy-load the component library off the estimate sheet critical path (U4)
- c978527 perf(landing): drop the anonymous auth round-trip and scope vendor CSS to its consumers (U6)
- b7f4d34 perf(workshop): isolate remote cursor traffic from the estimate sheet render tree (U8, U7 deferral)
- 6c1c05f docs(perf): record QA matrix results, unit decisions, and implementation-run plan corrections
- 3553850 refactor(workshop): extract activity-history and row-details modals from the estimate sheet (U9, 4,534→2,900 lines)
- 54b9fac test(landing): use static imports in the landing-auth-state source contract
- 6c70e9a fix(workshop): invalidate the lazy library cache after sidebar mutations (review HIGH finding)
- final commit: archive move + receipts

## Final verification (after review fixes)

| Command | Exit | Result |
|---------|------|--------|
| `bun run type-check` | 0 | clean |
| `bun run lint` | 1 | 3 pre-existing errors in untouched files (command-dialog, tabs.stories); all errors caused by this work fixed |
| `bun run lint:design-system` | 0 | passed |
| `bun run test` | 1 | 8/9; 1 pre-existing fail (WorkshopHomebaseClient contract, file untouched) |
| `bun run test:dom` | 1 | 1580 passed / 20 failed / 3 skipped — all 20 proven pre-existing (10 suites re-run at base 626d44a: identical failures; +3 dirty-file/Stack) |
| `bun run build` | 0 | passed (re-run after review fixes); dev server on :3000 verified responsive afterward |

## Performance evidence (artifact paths)

| Metric | Baseline | Final | Delta | Evidence |
|--------|----------|-------|-------|----------|
| 200-row keystroke avg (jsdom) | 82.0ms | 8.4ms | −90% | baseline/jsdom-render-baseline-before.json / -after-u1.json |
| 200-row keystroke worst (jsdom) | 197.0ms | 17.8ms | −91% | same |
| 500-row keystroke avg (jsdom) | 212.8ms | 34.2ms | −84% | same |
| Non-edited table renders / 10 keystrokes (200 rows) | 90 | 0 | −100% | same |
| 500-row initial render (jsdom) | 1119.3ms | 552.3ms | −51% | same |
| Anonymous `/` TTFB median (dev server) | ~0.60s | ~0.057s | −90% | baseline/u6-landing-evidence.md |
| Anonymous `/` TTFB worst (dev server) | 1.73s | 0.071s | −96% | same |
| Estimate page blocking queries | tree + library + user | tree + user (library lazy) | library off critical path | tests/vitest/estimate-sheet-library-lazy-load.test.tsx |
| Cursor frame re-render scope | whole sheet | cursor layer only | isolation proven | tests/vitest/perf/estimate-sheet-cursor-isolation.test.tsx |

All jsdom/dev numbers are local relative comparisons; no hosted/provider claims are made (QA-PROVIDER-001 BLOCKED, correctly).

## QA matrix status

Full per-row table: `qa/qa-matrix-results.md`. Summary: 13 PASS, 4 PARTIAL (browser channel blocked by recorded auth boundary; one pre-existing dirty-file failure), 2 DEFERRED (DB), 2 BLOCKED (DB/provider authority).

## Verification commands (final gate)

Recorded in `final-verification.md` (same folder) with exit codes.

## Provider / database authority

- Local only: all work. No hosted Supabase reads/writes (access denied by permission classifier — recorded), no migrations, no Vercel mutations, no provider metrics claims.
- Skipped pending authority: U3 RPC migration + parity, U5 EXPLAIN/indexes, hosted Speed Insights evidence.

## Known residual risks

1. U2 payload reduction (~100B/row) and U4 query-count drop are structurally proven but not network-measured on an authenticated route — measure on next authenticated-browser run.
2. Stale-cookie landing CTA shows workshop copy until the cookie is cleared (display-only; fail-closed routes unaffected).
3. Production CSS chunking for the scoped vendor CSS is verified by `bun run build` at the final gate, not by visual diff on every route.
4. Two pre-existing test failures from in-flight templates-panel work (bulk-selection label; `Stack` source assertion) remain — owned by that branch's work, not this one.

## Unrelated dirty work preserved

`.ai/03_plans/2026-06-11-templates-panel-ux/plan.md`, `src/components/ui/tree.tsx`, `src/components/workshop/EstimateSheetTree.tsx`, `src/components/workshop/component-library/tree/LibraryTree.tsx`, `src/components/workshop/component-library/tree/TemplatesTree.tsx`, `tests/vitest/component-library-ui.test.tsx`, `tests/vitest/estimate-sheet-tree-dom.test.tsx` — present before this run, never staged, byte-identical (verified at final gate).

## Archive

Plan pack archived to `.ai/09_archive/2026-06-11-Path-To-Estimate-Sheet-Performance-Optimization` after the final verification gate (see final commit).

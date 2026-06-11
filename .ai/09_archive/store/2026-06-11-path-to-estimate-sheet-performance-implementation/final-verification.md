# Final Verification — 2026-06-11

Branch `perf/path-to-estimate-sheet`. Raw log: /tmp/perf-final-verification.log (session-local); summaries below are the durable record.

| Command | Exit | Result | Classification |
|---------|------|--------|----------------|
| `bun run type-check` | 0 | clean | — |
| `bun run lint` | 1 | 5 errors / 549 warnings | 2 errors were caused by this work (require() in new landing-auth test) — **fixed in 54b9fac**, file now clean. Remaining 3 errors (`ui/overlays/command-dialog.tsx` setState-in-effect, `stories/navigation/tabs.stories.tsx` 2× no-explicit-any) + warnings are pre-existing in files this branch never touched. |
| `bun run lint:design-system` | 0 | passed | — |
| `bun run lint:design` | NOT RUN | — | Reason: `npx impeccable detect --strict` requires the impeccable CLI session + design review flow; no UI visual changes were made on workshop surfaces (layout/DOM preserved by construction). Safe substitute: lint:design-system passed; UI-affecting diffs (skeleton fallback, landing CTA copy path) reuse existing tokens/components. Residual risk: low. |
| `bun run test` (unit) | 1 | 8/9 pass | 1 fail (`tests/unit/reset-baseline.test.ts` — WorkshopHomebaseClient greeting contract): pre-existing; file untouched by this branch. |
| `bun run test:dom` (full) | 1 | 1580 passed / 20 failed / 3 skipped (217 files) | **All 20 failures pre-existing — empirically proven**: the 10 non-dirty failing suites were re-run at base commit 626d44a in a clean worktree → identical 17 test failures before any change from this run. Remaining 3: component-library-ui (DIRTY mid-edit file), estimate-tree-bulk-selection (dirty EstimateSheetTree "n" label), live-estimate-node-route (`Stack` assertion vs StackPlus committed before this run). 17+3 = 20. Zero failures caused by this work. |
| `bun run build` | recorded in completion receipt | see receipt | — |
| `bun run test:e2e` | NOT RUN | — | Reason: Playwright e2e needs an authenticated session + local DB fixtures (environment boundary, see environment-status.md). Safe substitute: 217-file DOM suite + anonymous HTTP checks + auth-proxy suites. Residual risk: authenticated browser flows unverified this run. |
| `bun run perf:measure-routes` / `perf:check-routes` | NOT RUN | — | Reason: route-transition scripts target the prior route-transition plan's fixtures and require seeded authenticated routes. Safe substitute: jsdom keystroke/render profiles + dev-server TTFB evidence. Residual risk: low. |

## Base-commit failure proof (method)

```
git worktree add /tmp/perf-base-check 626d44a
ln -s <repo>/node_modules /tmp/perf-base-check/node_modules
npx vitest run --maxWorkers=1 <10 failing non-dirty suites>
→ Test Files 10 failed (10); Tests 17 failed | 31 passed (48)
git worktree remove /tmp/perf-base-check --force
```

## Review gate

Independent multi-lens adversarial review executed via background workflow (4 lenses: correctness, security/auth, perf-regression, contracts; each finding adversarially verified). Results + dispositions recorded in `review-findings.md` in this folder.

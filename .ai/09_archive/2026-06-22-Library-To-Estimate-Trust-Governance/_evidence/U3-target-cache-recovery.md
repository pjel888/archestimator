# U3 Target Cache Recovery Evidence

- Date/time: 2026-06-22.
- Unit and QA/ADV IDs: U3; QA-002, QA-005, QA-006, QA-020, QA-024; ADV-001,
  ADV-002, ADV-007, ADV-020.
- Claim: estimate-sidebar Library loading is workspace/project scoped, bounded
  to the first trusted page, and does not pull unbounded workspace detail tables
  for the lite path.
- Proof category: local static tests, typecheck, and provider query-plan proof.
- Files under test:
  `src/lib/repositories/component-library-repository.ts`,
  `src/lib/component-library/project-component-projection.ts`,
  `src/lib/component-library/actions.ts`,
  `src/components/workshop/EstimateSheetContent.tsx`,
  `tests/vitest/estimate-sheet-sidebar-library-consumers.test.tsx`,
  `tests/vitest/component-library-templates-repository.test.ts`,
  `tests/vitest/library-workspace-switch-cache.test.ts`.
- Commands/results:
  `bunx vitest run tests/vitest/estimate-sheet-sidebar-library-consumers.test.tsx tests/vitest/component-library-templates-repository.test.ts tests/vitest/project-component-projection.test.ts tests/vitest/library-workspace-switch-cache.test.ts tests/vitest/estimate-component-library-lazy-load.test.tsx --maxWorkers=1`
  passed `5` files and `21` tests.
- Typecheck:
  `bun run type-check` passed.
- Provider proof:
  SQL-006A item-page `EXPLAIN` used
  `cost_library_items_sidebar_lite_idx`, returned `50` rows, and executed in
  about `0.296 ms` on the current live dataset.
- Residual risk: literal-shape related-query and governance queue EXPLAINs were
  retried after Supabase temp-role throttling cleared, but the CLI role sees
  `0` library rows through hardened policies. See
  `performance-cache-budgets.md`.
- Owner lane: cache/performance.
- Evidence privacy check: pass; provider proof records counts and index names
  only.

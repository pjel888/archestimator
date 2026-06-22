# U2 Source Taxonomy Evidence

- Date/time: 2026-06-22.
- Unit and QA/ADV IDs: U2; QA-003, QA-004, QA-007, QA-022; ADV-004,
  ADV-005, ADV-017.
- Claim: the estimate sidebar distinguishes `Library`, `Project`, and
  `Templates`, and tree rows expose source-scope labels plus trust chips instead
  of relying on hidden status text.
- Proof category: local static and DOM tests.
- Files under test:
  `src/components/workshop/component-library/index.tsx`,
  `src/components/workshop/component-library/tree/LibraryTree.tsx`,
  `src/components/workshop/component-library/tree/types.ts`,
  `src/lib/component-library/project-component-projection.ts`,
  `tests/vitest/estimate-sheet-sidebar-library-consumers.test.tsx`,
  `tests/vitest/component-library-ui.test.tsx`,
  `tests/vitest/project-component-projection.test.ts`.
- Commands/results:
  `bunx vitest run tests/vitest/estimate-sheet-sidebar-library-consumers.test.tsx tests/vitest/component-library-templates-repository.test.ts tests/vitest/project-component-projection.test.ts tests/vitest/library-workspace-switch-cache.test.ts tests/vitest/estimate-component-library-lazy-load.test.tsx --maxWorkers=1`
  passed `5` files and `21` tests.
- Additional command/result:
  the `7`-file UI/workflow slice in `U1-compare-before-replace.md` passed
  `155` tests.
- Residual risk: browser visual screenshots were not rerun because no
  browser-only geometry or canvas claim was introduced.
  `SKIP-WITH-RISK: browser`.
- Owner lane: UX/source.
- Evidence privacy check: pass.

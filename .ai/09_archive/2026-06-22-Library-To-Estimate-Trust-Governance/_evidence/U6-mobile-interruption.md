# U6 Mobile And Interruption Evidence

- Date/time: 2026-06-22.
- Unit and QA/ADV IDs: U6; QA-011, QA-012; ADV-011.
- Claim: touched estimate-sheet flows preserve visible pending/error/retry
  affordances and accessible recovery rather than relying on toast-only state.
- Proof category: local DOM/a11y tests.
- Files under test:
  `src/components/workshop/EstimateSheetContent.tsx`,
  `src/components/workshop/component-library/index.tsx`,
  `tests/vitest/estimate-sheet-cost-inputs.test.tsx`,
  `tests/vitest/estimate-sheet-column-resize-a11y.test.tsx`,
  `tests/vitest/library-add-component-modal-a11y.test.tsx`.
- Commands/results:
  `bunx vitest run tests/vitest/estimate-sheet-column-resize-a11y.test.tsx tests/vitest/estimate-sheet-cost-inputs.test.tsx tests/vitest/library-add-component-modal-a11y.test.tsx --maxWorkers=1`
  passed `3` files and `49` tests.
- Additional UI slice:
  the `7`-file UI/workflow command passed `155` tests.
- Residual risk:
  `SKIP-WITH-RISK: browser`; no new browser-only geometry claim was made, and
  DOM/a11y tests cover the touched error/focus semantics.
- Owner lane: UX/source.
- Evidence privacy check: pass.

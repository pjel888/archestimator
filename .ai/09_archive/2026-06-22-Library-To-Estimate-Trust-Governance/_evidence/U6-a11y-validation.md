# U6 A11y Validation Evidence

- Date/time: 2026-06-22.
- Unit and QA/ADV IDs: U6; QA-012; ADV-011.
- Claim: keyboard/a11y and numeric validation contracts remain intact after
  source-review, sidebar, and governance changes.
- Proof category: local DOM/a11y tests and ESLint.
- Commands/results:
  `bunx vitest run tests/vitest/estimate-sheet-column-resize-a11y.test.tsx tests/vitest/estimate-sheet-cost-inputs.test.tsx tests/vitest/library-add-component-modal-a11y.test.tsx --maxWorkers=1`
  passed `3` files and `49` tests.
- Lint result:
  targeted `bunx eslint` over touched source and test files passed with no
  output.
- Residual risk:
  `SKIP-WITH-RISK: browser`; no responsive layout geometry was changed in the
  final U3/DB pass.
- Owner lane: UX/source.
- Evidence privacy check: pass.

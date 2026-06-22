# U1 Compare Before Replace Evidence

- Date/time: 2026-06-22.
- Unit and QA/ADV IDs: U1; QA-001, QA-007, QA-022; ADV-003 through ADV-006,
  ADV-017.
- Claim: Library and supplier-derived estimate commits no longer silently
  replace row cost/source data. Risky insert/replace paths show the source
  review gate; server insert/replace revalidates current Library source state.
- Proof category: local static, DOM, and action tests.
- Files under test:
  `src/components/workshop/EstimateSheetContent.tsx`,
  `src/lib/estimates/actions.ts`,
  `src/components/workshop/library/source-trust-model.ts`,
  `tests/vitest/estimate-sheet-library-insert.test.tsx`,
  `tests/vitest/library-source-trust.test.ts`,
  `tests/vitest/estimate-sheet-actions-authz.test.ts`.
- Commands/results:
  `bunx vitest run tests/vitest/library-source-trust.test.ts tests/vitest/library-copy-contract.test.ts tests/vitest/estimate-sheet-cost-inputs.test.tsx tests/vitest/estimate-sheet-library-insert.test.tsx tests/vitest/component-library-ui.test.tsx tests/vitest/estimate-sheet-column-resize-a11y.test.tsx tests/vitest/library-add-component-modal-a11y.test.tsx --maxWorkers=1`
  passed `7` files and `155` tests.
- Additional command/result:
  `bunx vitest run tests/vitest/library-telemetry-emit.test.ts tests/vitest/auth-sensitive-api-boundaries.test.ts tests/vitest/estimate-sheet-actions-authz.test.ts tests/vitest/estimate-sheet-version-control-actions.test.ts tests/vitest/component-library-cost-governance-actions.test.ts tests/vitest/component-library-attachment-lifecycle.test.ts tests/vitest/share-snapshot-redaction.test.tsx --maxWorkers=1`
  passed `7` files and `71` tests.
- Residual risk: browser geometry was not re-run because the changed claim is
  commit gating and server revalidation, not responsive layout geometry.
  `SKIP-WITH-RISK: browser`.
- Owner lane: UX/source plus security/action.
- Evidence privacy check: pass; no raw source URLs, row IDs, or private project
  data recorded.

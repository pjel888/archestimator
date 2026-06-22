# Security Redaction Evidence

- Date/time: 2026-06-22.
- Unit and QA/ADV IDs: U7/security; QA-013, QA-014, QA-024; ADV-012,
  ADV-015, ADV-019.
- Claim: telemetry and public/proposal snapshots do not expose raw private
  URLs, storage paths, filenames, source prose, review prose, or unexpected
  free-text values from trust/governance events.
- Proof category: local unit/static tests plus evidence review.
- Files under test:
  `src/lib/component-library/library-telemetry.ts`,
  `tests/vitest/library-telemetry-emit.test.ts`,
  `tests/vitest/share-snapshot-redaction.test.tsx`.
- Commands/results:
  `bunx vitest run tests/vitest/library-telemetry-emit.test.ts tests/vitest/auth-sensitive-api-boundaries.test.ts tests/vitest/estimate-sheet-actions-authz.test.ts tests/vitest/estimate-sheet-version-control-actions.test.ts tests/vitest/component-library-cost-governance-actions.test.ts tests/vitest/component-library-attachment-lifecycle.test.ts tests/vitest/share-snapshot-redaction.test.tsx --maxWorkers=1`
  passed `7` files and `71` tests.
- Evidence privacy audit: pass for newly added evidence files; files record
  commands, counts, booleans, and safe enum/index names only.
- Residual risk: provider logs were not inspected; local code prevents known
  raw-value telemetry paths.
- Owner lane: security/QA.

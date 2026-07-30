# Project Ledger and Commitment Timeline Closeout

## Implementation Result

The plan-pack source implementation is complete. It includes project-ledger contracts and event persistence, immutable issue packages and accepted baselines, internal and recipient-safe timelines, Commitment Center actions, project artifacts and evidence uploads, change-request flows, client-portal discussions and notifications, AI narrative provenance, and legacy-publication cutover controls.

The internal Project Timeline now renders a left-to-right `Latest -> Earlier` rail with responsive snap-scrolling cards, Newer/Latest/Earlier controls, keyboard navigation (`ArrowLeft`, `ArrowRight`, `Home`, and `End`), visible focus treatment, loading state, semantic chronology, and reduced-motion behavior.

Legacy cutover is hardened with:

- exact publication, comment, response, recipient, and credential fingerprinting;
- workspace-scoped mapping ownership and migrations `0124` and `0125`;
- a lease-bound write barrier acquired before migration and rechecked at every finalization write;
- audited takeover and release recovery with full `(frozen_at, frozen_by)` compare-and-swap protection;
- replay-safe finalization that preserves the original cutover timestamp;
- immutable finalized mappings and operation-unique rollback markers that prevent manager downgrade, duplicate audit, and same-millisecond rollback races;
- fail-closed recipient visibility, read-state, request-exposure, and upload-error boundaries.

## Fresh Local Evidence

- Focused cutover and rollback regression: PASS, 4 files and 35 tests.
- Full ledger feature sweep: PASS, 80 files and 404 tests (`artifacts/quality/ledger-focused.json`).
- Strict Q2 component lane: PASS, 2,300 tests with zero failures and zero skips (`artifacts/quality/component-strict.vitest.json`).
- Timeline and estimate performance regression: PASS, 6 files and 68 tests; the coverage-instrumented 500-row keystroke benchmark also passes after coalescing quantity-draft propagation through one animation frame.
- Plan-related full-suite repairs: PASS, 5 files and 26 tests. A focused reproduction of the original eight full-suite failures now leaves only three unrelated landing/provider/upload failures.
- TypeScript: `bun run type-check` PASS.
- Scoped ESLint: PASS for every source and test file touched during the final reconciliation.
- Static checks: PASS for 68 changed executable files (`artifacts/quality/static.json`).
- Anti-bypass: PASS for 82 files (`artifacts/quality/anti-bypass.json`).
- Diff whitespace check: `git diff --check main` PASS.
- Classification: PASS, `Q2_CRITICAL_CHANGE_GATE` (`artifacts/quality/classification.json`).
- Plan-pack validation: PASS.
- Independent read-only security source review: APPROVE after the finalized-mapping and concurrent-rollback repairs.

## Remaining Q2 Evidence Gap

The canonical critical mutation gate remains FAIL. With the unchanged one-hour timeout and a host-safe four-worker attempt, Stryker reached 83% (3,881 of 4,521 mutants) before SIGTERM and had already reported at least 764 surviving mutants. The JSON report was therefore not produced (`artifacts/quality/mutation.json`). The temporary runner acceleration changes were removed; no timeout, target, test, threshold, or exclusion was weakened.

The strict Q2 component lane is now green. The aggregate component gate remains FAIL because `quality/baseline.json` does not exist, and the repository contract does not permit admitting the current candidate as its own baseline. The full-suite run initially surfaced eight failures; five plan-related stale contracts and D1 test doubles were repaired and now pass. Focused reproduction leaves three unrelated concurrent failures: landing-control integrity drift, provider-cleanup strict-mode drift, and upload backfill `undefined` versus `null` drift. They were not rewritten as part of this plan pack. The independent quality reviewer has not yet approved this refreshed candidate.

One ledger-sweep AI narrative test exposed an ignored-click race while the generate control was still disabled. The test now waits for the control to become enabled, removes the prior extended lookup timeout, passes in isolation, and passes in the final 404-test ledger sweep. The earlier failed run remains part of the evidence history and is not represented as a clean first pass.

Browser visual and cross-device proof remains unclaimed. The user selected Chrome on 2026-07-29; Chrome, the ChatGPT Chrome Extension, and the native messaging host were all detected as installed and enabled, but the browser connection did not attach after the required retry and one user-authorized fresh Chrome window. Product Design policy forbids substituting another browser or standalone automation for the selected Chrome surface. The previously recorded strict bundle overage on an unchanged template-library route was not reclassified as plan-pack proof.

Accordingly, the repository implementation is source-complete but the Q2 aggregate is not `PASS` and the pack is not release-ready. No deployment, hosted behavior, production migration, or production data claim is made.

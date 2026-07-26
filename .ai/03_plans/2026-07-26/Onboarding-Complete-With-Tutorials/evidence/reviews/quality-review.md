# Onboarding Q2 Independent Quality Re-Review

**Profile:** `Q2_CRITICAL_CHANGE_GATE`

**Reviewed at:** `2026-07-27T01:49:51.4670550+08:00`

**Reviewed HEAD:** `8e19d90ddf2220df38ae9c0d054d6cc041a7001b` plus the current dirty onboarding/evidence worktree

**Method:** current source and stored receipts only; no heavy command was rerun in this reviewer lane.

## Verdict

- **FAIL** - the current onboarding source has fresh green focused tests, SQLite integration, scoped and repository typecheck, scoped lint, production build, browser/device evidence, security review, and architecture review. Q2 still fails because onboarding diff coverage is materially below the required 100% critical changed-branch threshold, canonical mutation selected only an unrelated AB target, GitNexus used a 31-commit-stale index, and AC-003/AC-004 retain direct acceptance-proof gaps. These are locally actionable gaps, so `QUALITY_BLOCKED` is not the correct classification.

## Acceptance Criteria

| Criterion | Verdict | Direct evidence | Remaining gap |
| --- | --- | --- | --- |
| `AC-001` | **PASS** | `artifacts/quality/onboarding-sqlite.json` is fresh PASS with 25/25 tests: 11 starter actions, 7 onboarding migrations, and 7 guided-sample cases. Current tests cover idempotent install, exact membership, missing/archive/latest-generation recovery, owner/member boundaries, member self-scope, active contention, expired takeover, displaced-holder rollback, successor preservation, stale revision, and non-manager denial. The distinct security re-review is `PASS / APPROVE` with zero findings; the architecture review is `PASS / CLEAR`. Current source atomically couples exact-token lease renewal/guarding with each D1 business batch and owner/admin-gates cross-user reconciliation. | User-edited-resource preservation is evaluated separately under AC-004. No AC-001 blocker remains in the reviewed current source and receipts. |
| `AC-002` | **PASS** | `artifacts/quality/onboarding-coverage-command.json` is PASS with 38/38 files and 276/276 tests, including route coordination, target ownership/resolution, automatic continuity, pause/resume/dismiss/recovery, and domain-proof repositories. `artifacts/quality/onboarding-settings-playwright.json` reports 3 expected and zero skipped/unexpected/flaky. `artifacts/quality/onboarding-first-value-playwright-matrix.json` reports 35 expected and zero skipped/unexpected/flaky across seven browser/device projects. | No acceptance-specific flow lifecycle defect found. Aggregate Q2 remains red independently. |
| `AC-003` | **PARTIAL** | The 35/35 matrix covers Chromium, Firefox, WebKit, Mobile Safari, iPhone SE, iPad, and Pixel 8 Chrome with retries 0. It proves keyboard handoff, Return/Escape recovery, reduced-motion/mobile layouts, Axe checks, a 640-CSS-pixel 200%-reflow proxy, and desktop Chromium/Firefox/WebKit pointer creation through the real `estimate.add_row` button. Architecture confirms the overlay stops before product-target focus and domain flows cannot complete from tour termination alone. | `e2e/onboarding-first-value.spec.ts:537` explicitly returns before pointer activation for Mobile Safari, iPhone SE, iPad, and Pixel 8 Chrome, so pointer handoff at mobile sizes is unproved. The desktop click asserts row creation only; it does not assert persisted activation readback or visible guided-step advancement. The zoom case is a viewport-equivalence proxy, not an actual browser-zoom run. |
| `AC-004` | **PARTIAL** | The 276-test receipt covers the current pack version, three fictional Philippine projects, estimates, reusable components, multi-row templates, math/provenance, stable asset keys, idempotence, and new-generation recovery. Architecture review concludes that versioned stable claims avoid in-place overwrite and only missing/inactive generations are recreated. | No executable fixture deliberately edits a legacy or starter-owned project, estimate, component, estimate row, or template and then proves install/upgrade/restore preserves that edit. Source structure and architectural review support the invariant but do not replace the explicit preservation acceptance case. Onboarding mutation strength is also unproved. |
| `AC-005` | **PASS** | The 35/35 matrix asserts exactly two primary first-value choices and separately labels a passive completed guide `Viewed` and a domain-task guide `Completed`. Current `GettingStartedProgress.tsx` and `GuidanceToursSettings.tsx` preserve this distinction, while focused tests cover viewer routing and role-aware readiness. Security and architecture reviews report no boundary or semantic finding. | No current false-completion defect found. |
| `AC-006` | **FAIL** | Fresh PASS receipts exist for focused coverage (276/276), SQLite (25/25), scoped lint, scoped typecheck, full repository typecheck, production build, first-value Playwright (35/35), settings Playwright (3/3), security review (APPROVE, zero findings), and architecture review (PASS/CLEAR, zero findings). `artifacts/quality/mutation.json` is technically PASS at 100% for its one selected target. | `artifacts/quality/onboarding-diff-coverage.json` is FAIL with 10 findings: 112 changed `starter-pack-actions.ts` lines are absent from LCOV; changed line/statement coverage is 10.20%; changed branch coverage is 44.44%; and the canonical baseline is PENDING. The 100% mutation receipt selected only `src/lib/ab-testing/results-calculator.ts`, so it is not onboarding changed/critical mutation evidence. `evidence/gitnexus-detect-changes.json` is FAIL because its index is 31 commits behind HEAD; low risk and zero affected processes cannot be accepted as fresh blast-radius proof. `plan-pack.json` remains unreconciled at `implementation_status: NOT_STARTED`. |

## Evidence

- `artifacts/quality/onboarding-sqlite.json` - **PASS**, 25/25, zero failed/pending/todo.
- `artifacts/quality/onboarding-coverage-command.json` - **PASS**, 38/38 files and 276/276 tests; 75.74% statements, 68.55% branches, 83.22% functions, 78.42% lines across the broad onboarding include set.
- `artifacts/quality/onboarding-lint-scoped.json` - **PASS**, current onboarding source, E2E, migration-check, and focused tests with `--max-warnings=0`.
- `artifacts/quality/onboarding-typecheck-scoped.json` - **PASS**.
- `artifacts/quality/onboarding-typecheck.json` - **PASS**, full `bun run type-check`.
- `artifacts/quality/onboarding-build.json` - **PASS**, production `bun run build`.
- `artifacts/quality/onboarding-first-value-playwright-matrix.json` - **PASS**, 35 expected, 0 skipped/unexpected/flaky across seven projects.
- `artifacts/quality/onboarding-settings-playwright.json` - **PASS by Playwright stats**, 3 expected, 0 skipped/unexpected/flaky.
- `evidence/reviews/security-review.md` - **PASS / APPROVE**, zero critical/high/medium/low findings against current HEAD plus the final dirty onboarding/evidence worktree.
- `evidence/reviews/architecture-review.md` - **PASS / CLEAR**, zero critical/high/medium findings.
- `artifacts/quality/mutation.json` - **PASS**, 100% score for 84 killed, 8 compile-error, and 4 ignored mutants, but selected target is only the unrelated `src/lib/ab-testing/results-calculator.ts`; this does not satisfy onboarding mutation.
- `artifacts/quality/onboarding-diff-coverage.json` - **FAIL**, 10 findings; 31/304 changed lines (10.20%), 8/18 changed branches (44.44%), 10.20% changed statements, 112 uncovered changed onboarding action lines, and canonical baseline PENDING.
- `evidence/gitnexus-detect-changes.json` - **FAIL**, detect completed with 61 symbols, 43 files, 0 indexed processes, and reported low risk, but the index is 31 commits behind HEAD and detected only three onboarding symbols.

## Gaps

- Cover all critical changed onboarding lines, statements, and branches and produce a current diff-coverage PASS at the Q2-required 100% threshold with an available canonical baseline.
- Execute changed/critical mutation against the onboarding authorization, lease/CAS, preservation, proof, and handoff predicates; produce a PASS with no high-risk survivor or no-coverage mutant.
- Add mobile pointer activation on the real product target and assert that the resulting domain event/readback advances the visible guided step.
- Add a versioned legacy/user-edited resource preservation fixture covering install/upgrade/restore without overwrite.
- Reindex GitNexus from a pinned available runner, rerun `detect_changes`, and replace the stale FAIL receipt with fresh machine-readable PASS evidence.
- Reconcile `plan-pack.json` and the aggregate evidence manifest only after the substantive red/missing gates above are closed.

## Risks

- Broad 75.74% statement coverage and green 276/276 tests conceal 112 uncovered changed lines in the critical starter mutation implementation.
- The canonical mutation score is valid only for an unrelated AB calculation target and gives no strength signal for onboarding concurrency, authorization, or persistence tests.
- The seven-project browser total can conceal the explicit mobile pointer early-return and missing domain-progress readback.
- Correct starter fencing depends on transactional D1 batch rollback and foreign-key enforcement; this is supported by architecture/security review and SQLite rehearsal, but changed-branch coverage and onboarding mutation are still required.

## Stop Condition

Do not mark the onboarding plan complete until AC-003 and AC-004 have direct current proof, onboarding diff coverage reaches the Q2-required 100% critical changed-branch/line/statement gate with a usable baseline, onboarding-targeted mutation passes, GitNexus is freshly indexed and `detect_changes` passes, the aggregate manifest is reconciled, and no required receipt or independent review is red, stale, skipped, flaky, malformed, or missing.

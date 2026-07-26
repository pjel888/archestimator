# Onboarding Q2 Independent Quality Re-Review

**Profile:** `Q2_CRITICAL_CHANGE_GATE`

**Reviewed at:** `2026-07-27T01:15:20.5554309+08:00`

**Reviewed HEAD:** `efa25a00413185aed6de64ad040d8b473c81a6ac`

**Method:** current source and stored receipts only; no heavy command was rerun.

## Verdict

- **FAIL** — the current implementation has materially repaired the earlier false-completion, authorization, lease-fencing, domain-proof, port-validation, and desktop pointer findings, but the Q2 gate is not complete. Onboarding changed-code coverage is red, critical mutation did not execute and selected no onboarding target, the required fresh security approval is absent, GitNexus is 31 commits stale, and AC-003/AC-004 still lack direct acceptance proof. These are local evidence or implementation/test gaps, so `QUALITY_BLOCKED` is not the correct aggregate verdict.

## Acceptance Criteria

| Criterion | Verdict | Direct evidence | Gap |
| --- | --- | --- | --- |
| `AC-001` | **PARTIAL** | `artifacts/quality/onboarding-coverage-command.json` is PASS with 38/38 files and 272/272 tests. Current `tests/vitest/starter-pack-actions.test.ts` contains eight SQLite-backed starter tests covering idempotent install, owner/member scope, missing/archive generations, active-lease denial, automatic-bootstrap read-only behavior, stale revision, and non-manager/nonempty denial. Current source gates cross-user reconciliation through `canManageSharedStarter` (`src/lib/onboarding/starter-pack-actions.ts:1972`, `:1990`, `:2116`) and fences starter mutations through `acquireStarterMutationLease` (`:1849`, `:2197`). | The dedicated `artifacts/quality/onboarding-sqlite.json` is stale: it records 21/21 (7 migration + 7 guided sample + 7 starter) at 22:53, while `starter-pack-actions.test.ts` changed at 23:41 and now has an eighth test. No stored 22-test SQLite receipt exists. No direct case begins with a user-edited starter resource and proves install/restore leaves it unchanged. The distinct security review still carries its earlier FAIL and has not approved the repaired source. |
| `AC-002` | **PASS** | The 272-test receipt exercises flow launch/navigation/pause/resume/dismiss/recovery/finish paths. `artifacts/quality/onboarding-settings-playwright.json` reports 3 expected, 0 unexpected, 0 skipped, 0 flaky. `artifacts/quality/onboarding-first-value-playwright-matrix.json` reports 35 expected, 0 unexpected, 0 skipped, 0 flaky across Chromium, Firefox, WebKit, Mobile Safari, iPhone SE, iPad, and Pixel 8 Chrome. | No acceptance-specific behavior gap found in the reviewed current source/receipts. Aggregate Q2 evidence remains red independently. |
| `AC-003` | **PARTIAL** | The 35/35 matrix runs five first-value cases on seven projects/devices with retries 0. Keyboard handoff, Return/Escape recovery, reduced-motion/mobile layouts, Axe checks, and the 640-CSS-pixel reflow proxy for 200% zoom are green. The real `estimate.add_row` target is a button; desktop Chromium/Firefox/WebKit click it and observe the estimate-row count increase (`e2e/onboarding-first-value.spec.ts:496-542`). | The test explicitly returns before pointer activation for all four mobile projects (`e2e/onboarding-first-value.spec.ts:537`), so pointer handoff at mobile sizes is not proved. After the desktop domain click it proves only row creation, not a persisted activation readback or visible guided-step advancement. The 200% result is a viewport-equivalence proxy, not an actual browser-zoom run. |
| `AC-004` | **PARTIAL** | The 272/272 receipt includes starter fixture/action coverage for pack version, three fictional Philippine projects, estimates, reusable components/templates, math/provenance, stable keys, idempotence, and generation recovery. `src/lib/onboarding/starter-pack.ts` remains version/key scoped. | `rg` finds no executable starter action/fixture test that deliberately edits a legacy/starter-owned project, estimate, component, row, or template and proves a later install/upgrade/restore preserves the edit. Source conventions alone do not prove the explicit “preserving every legacy or user-edited resource” criterion. Changed critical onboarding branches and mutation strength also remain unproved. |
| `AC-005` | **PASS** | The 35/35 matrix asserts two primary start choices and now includes “labels a completed passive guide Viewed and a completed domain-task guide Completed.” Current source returns `Viewed` for passive reader orientation in `GettingStartedProgress.tsx:137-145` and uses `PASSIVE_VIEW_FLOWS` for both top-level and lesson labels in `GuidanceToursSettings.tsx:100-108,214`. Focused tests cover viewer routing and role-aware readiness. | No current false-completion defect found in the reviewed paths. |
| `AC-006` | **FAIL** | Scoped typecheck is PASS (`artifacts/quality/onboarding-typecheck-scoped.json`); scoped lint is recorded PASS (`artifacts/quality/onboarding-lint-scoped.json`); focused coverage and both Playwright receipts above are green. The production build compiled successfully before its TypeScript phase. A current read-only GitNexus `detect_changes(scope="all")` reports 61 changed symbols in 43 files, 0 affected processes, low risk. | `artifacts/quality/onboarding-diff-coverage.json` is FAIL: one changed `GettingStartedProgress.tsx` line, ten changed `starter-pack-actions.ts` lines, and one changed `starter-pack.ts` line are absent from LCOV; aggregate changed line/statement coverage is 2.07%, branch coverage 50%, and the global baseline is pending. `artifacts/quality/mutation.json` is FAIL before mutation execution on `scripts/quality/component-core.ts` TS18048; its selected targets contain no onboarding file, so it supplies no changed/critical onboarding mutation proof. `artifacts/quality/onboarding-build.json` is FAIL after successful compilation because unrelated untracked `src/lib/change-requests/service.ts:363` references missing `exposurePortalId`; whole-worktree Q2 still fails closed. The scoped lint receipt predates the latest `e2e/onboarding-first-value.spec.ts` edit. GitNexus is indexed at `5c4407869cbd42f90e4b02fa5a25e9828a32ca50`, 31 commits behind HEAD, and no required `evidence/gitnexus-detect-changes.json` exists. `security-review.md` is stale FAIL, and `plan-pack.json` still says `implementation_status: NOT_STARTED` with stale/failing acceptance evidence. |

## Evidence

- `artifacts/quality/onboarding-coverage-command.json` — **PASS**, 38 test files and 272 tests; 75.51% statements, 68.44% branches, 82.95% functions, 78.17% lines across the broad onboarding include set. This broad total does not replace the Q2 100% changed-critical requirement.
- `artifacts/quality/onboarding-first-value-playwright-matrix.json` — **PASS**, 35 expected, 0 skipped/unexpected/flaky; seven browser/device projects, five cases each.
- `artifacts/quality/onboarding-settings-playwright.json` — **PASS by Playwright stats**, 3 expected, 0 skipped/unexpected/flaky.
- `artifacts/quality/onboarding-sqlite.json` — **PASS but stale**, 21/21; it predates the current eighth starter SQLite test. The requested 22-test count is visible in current test inventory (7 + 7 + 8), but no current dedicated 22-test receipt is stored.
- `artifacts/quality/onboarding-typecheck-scoped.json` — **PASS**; current onboarding production source is included and predates this receipt.
- `artifacts/quality/onboarding-lint-scoped.json` — **PASS but partially stale**; the latest E2E edit is newer than the receipt.
- `artifacts/quality/onboarding-build.json` — **FAIL**; Next.js compiled in 10.2 seconds, then whole-worktree typecheck failed only at unrelated `src/lib/change-requests/service.ts:363`.
- `artifacts/quality/onboarding-diff-coverage.json` — **FAIL**, including 12 uncovered changed onboarding lines and sub-threshold changed branch/line/statement coverage.
- `artifacts/quality/mutation-plan.json` — plan-only PASS with three unrelated selected targets; execution was not run by this artifact.
- `artifacts/quality/mutation.json` — **FAIL**, Stryker initialization stopped on `scripts/quality/component-core.ts:923,928,929`; no mutation score or onboarding target proof exists.
- GitNexus `list_repos` — index is 31 commits behind HEAD. Fresh read-only `detect_changes` can describe the current diff but cannot satisfy the plan's fresh-index contract.
- `.ai/03_plans/2026-07-26/Onboarding-Complete-With-Tutorials/evidence/reviews/security-review.md` — **FAIL / REQUEST CHANGES** against an older fingerprint. Its HIGH findings appear repaired in current source, but an obsolete FAIL is not a fresh independent PASS.

## Gaps

- Raise changed critical onboarding line, statement, and branch coverage to the Q2-required 100%, including the specifically reported `GettingStartedProgress.tsx`, `starter-pack-actions.ts`, and `starter-pack.ts` lines, then generate a current PASS receipt.
- Execute changed/critical mutation against the onboarding state, authorization, lease, preservation, and handoff predicates; produce a PASS receipt with no high-risk survivor or no-coverage mutant.
- Add direct mobile pointer activation plus a domain-event/readback assertion that the real action advances the displayed guide.
- Add a versioned legacy/user-edited resource preservation test covering install/upgrade/restore without overwrite.
- Produce a fresh dedicated 22-test SQLite receipt and rerun scoped lint after the current E2E edit.
- Obtain a distinct fresh security re-review of the repaired authorization/lease/domain-proof/port source.
- Reindex GitNexus from a pinned/available runner, persist `evidence/gitnexus-detect-changes.json`, and reconcile the plan/evidence manifest.
- Repair or otherwise reach green whole-worktree build evidence without excluding the concurrent change-request surface.

## Risks

- The fixed-duration starter lease expires after ten minutes; later reconciliation writes do not revalidate the lease token. A long-running first request could continue after expiry while a second request acquires a new lease. No receipt exercises lease expiry during an in-flight mutation.
- Green broad coverage and browser totals can conceal the explicit uncovered changed branches and missing acceptance assertions above.
- The dirty worktree contains substantial unrelated data/auth/public-route work. Q2 ownership changes attribution, not the requirement for whole-worktree green evidence.

## Stop Condition

Do not mark this onboarding plan complete until AC-001/AC-003/AC-004 have direct current proof, every required Q2 artifact is fresh and PASS (including 100% critical changed-branch coverage, onboarding mutation, build, SQLite, lint, and fresh-index `detect_changes`), the distinct security review is PASS, and no unresolved high/critical finding or high-risk mutant remains.

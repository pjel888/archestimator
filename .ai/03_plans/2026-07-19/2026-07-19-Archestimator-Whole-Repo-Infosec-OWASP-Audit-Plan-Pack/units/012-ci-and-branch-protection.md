# 012 — Re-enable CI Gates + Configure Branch Protection (AUXILIARY)

> Closes `SEC-CI-001`, `SEC-CI-002`, `SEC-SUPPLY-001`. **AUXILIARY** requirement `SEC-007`.

## unit_id
`UNIT-012` · **status:** `READY` · **priority:** P2 · **effort:** S · **implementation_risk:** LOW · **local_implementation_status:** `NOT_STARTED` · **external_lifecycle_status:** requires `AUTH-001` (GitHub branch protection).

## requirements / findings
- Requirements: `SEC-007` (AUXILIARY).
- Findings: `SEC-CI-001`, `SEC-CI-002`, `SEC-SUPPLY-001`.

## goal
CI gates (type-check, lint, test, build, CodeQL, dependency-review) are active on `main`. Dependabot is active. `skills:update` does not run mutable-tag fetches. CODEOWNERS enforcement is on (GitHub branch protection).

## security_invariants
1. `.github/workflows/ci.yml` (2026-07-13 variant), `codeql.yml`, `dependency-review.yml`, `dependabot.yml` are present and active.
2. `package.json:70` `skills:update` script pins `omx`/`codex` to specific versions (or is removed/made manual).
3. Branch protection requires the CI checks on `main`.

## current_source_evidence
- `.github/workflows/` is empty; all workflows in `.github/workflows-disabled/`.
- `.github/workflows-disabled/dependabot.yml` (npm + github-actions, weekly).
- `.github/workflows-disabled/2026-07-13/release.yml` — well-designed immutable-candidate sha256 verification.
- `package.json:70` — `npx -y skills@1.5.16 ... && omx update --stable && codex plugin marketplace upgrade --json`.

## affected_paths_and_resources
- `.github/workflows/ci.yml` (move from `workflows-disabled/2026-07-13/ci.yml`).
- `.github/workflows/codeql.yml`.
- `.github/workflows/dependency-review.yml`.
- `.github/workflows/dependabot.yml`.
- `package.json` (`skills:update` script).

## owned_paths
- `.github/workflows/`
- `package.json`

## dependencies
None locally.

## preconditions
GitHub repo Settings access for branch protection (`AUTH-001`).

## non_goals
- Adding new SAST/SCA tools beyond CodeQL + dependency-review (recorded as future work).
- Restoring `release.yml` until release-candidate workflow is needed.

## implementation_sequence
1. Move `.github/workflows-disabled/2026-07-13/ci.yml` → `.github/workflows/ci.yml`.
2. Move `.github/workflows-disabled/codeql.yml` → `.github/workflows/codeql.yml`.
3. Move `.github/workflows-disabled/2026-07-13/dependency-review.yml` → `.github/workflows/dependency-review.yml`.
4. Move `.github/workflows-disabled/dependabot.yml` → `.github/dependabot.yml` (note: dependabot config goes at repo root or `.github/dependabot.yml`, not under `workflows/`).
5. `package.json:70` — remove the `skills:update` script or replace `omx update --stable` and `codex plugin marketplace upgrade --json` with version-pinned equivalents.
6. Open PR; observe CI runs.
7. (Philip, `AUTH-001`) Configure branch protection on `main` to require `ci.yml` + `codeql.yml` + `dependency-review.yml`; enable secret scanning + push protection; enable CODEOWNERS enforcement.

## data_or_schema_changes
None.

## authz_and_tenant_implications
None.

## failure_and_exception_behavior
CI failures block merge — by design. If a workflow has a bug, fix the workflow.

## acceptance_criteria
1. `.github/workflows/` contains `ci.yml`, `codeql.yml`, `dependency-review.yml`.
2. `.github/dependabot.yml` exists.
3. `package.json:70` does not contain mutable-tag fetches.
4. (Hosted, `AUTH-001`) Branch protection requires the CI checks.

## acceptance_evidence
Source/diff inspection + GitHub Actions run green on a PR (hosted — `AUTH-001`).

## test_decision
`NOT_REQUIRED`.

## exact_test_proposal_if_any
None.

## authorization_boundaries
`AUTH-001` for branch protection + Actions observation.

## observability_or_audit_requirements
CI status visible on every PR.

## recovery_or_fix_forward
If a workflow breaks the build, disable that workflow and fix-forward. The disabled-by-default state is the current baseline, so worst-case is "no change."

## conflict_and_concurrency_notes
Coordinate with Philip on which checks are required (operator decision).

## completion_signal
All applicable acceptance criteria evidenced (criterion 4 requires `AUTH-001`). Local criteria `DONE` when workflows are moved + script is fixed.

## next_unit_on_success
`UNIT-013` (or pack completion if `UNIT-013` done).

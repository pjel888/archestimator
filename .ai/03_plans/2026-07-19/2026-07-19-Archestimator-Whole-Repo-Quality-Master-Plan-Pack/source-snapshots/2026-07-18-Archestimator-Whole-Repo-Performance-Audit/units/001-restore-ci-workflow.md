# UNIT-001 — Restore CI Workflow (README Claims Active CI) · PERF-CI-001

**Finding:** PERF-CI-001 · **Priority:** P0 · **Wave:** 0 (W0-1) · **Effort:** XS · **Risk:** Low
**Roadmap item:** W0-1 · **Test decision:** `NOT_REQUIRED`
**local_implementation:** `NOT_STARTED` · **external_lifecycle:** `NOT_STARTED`

## Outcome

The automated regression gate (type-check, lint, build, test, bundle-budget,
Playwright smoke) runs on PRs and pushes to main, OR the README is corrected to
reflect "CI archived; local validation only". Either resolution closes the
release blocker.

## Affected surface

- `.github/workflows/` (currently empty — root cause)
- `.github/workflows-disabled/ci.yml` (the archived workflow to restore)
- `.github/workflows-disabled/{codeql,dependabot,react-doctor}.yml` (related)
- `.github/workflows-disabled/2026-07-13/{release,dependency-review,ci}.yml`
- `README.md:380-385` (stale claim: "triggers on PRs and pushes to main/feat/*.
  Runs bun install --frozen-lockfile → bun run validate → bun run build →
  Playwright smoke.")

## Dependencies

- None. This is the highest-leverage change and unblocks W0-2 (`bun run verify`
  baseline) and every later Wave that depends on the CI gate.
- AUTH_BOUNDARY: none — git move of workflow files is within standing
  authorization; PR opens on the user's normal dev flow.

## Implementation intent

Smallest coherent change, derived from PERF-CI-001 "Recommendation":

1. `git mv .github/workflows-disabled/ci.yml .github/workflows/ci.yml`
   (restore the validated workflow). Also restore `dependabot.yml` and
   `react-doctor.yml` if desired; keep `codeql.yml` archived only if it is
   known-broken.
2. **OR** if CI is intentionally off for alpha cost reasons, edit
   `README.md:380-385` to state "CI archived; local validation only — run
   `bun run validate` before merging." Pick this only if the owner confirms CI
   should stay off.

Do not invent a new workflow file. Do not change workflow contents beyond what
is needed to restore.

## Expected evidence

Verification command from PERF-CI-001 "Verification":

```
ls .github/workflows/ci.yml        # file exists
gh run list                         # shows runs triggered by PRs/push
```

Evidence class: `NOT_REQUIRED` — file presence + `gh run list` output is the
decisive non-test signal. (If option 2 is chosen: `grep -nE 'GitHub Actions|
\.github/workflows/ci\.yml' README.md` returns only the corrected text.)

## Completion signal

`.github/workflows/ci.yml` exists AND either (a) `gh run list` shows a run on
the next PR/push, or (b) `README.md:380-385` reads "CI archived; local
validation only" with no reference to `.github/workflows/ci.yml` as active.

## Recovery path

Not required (Risk: Low). Reversal is `git mv` back to
`.github/workflows-disabled/`. No data, no migration, no external service.

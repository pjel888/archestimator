# 13 — Rollout, Rollback, and Operations

Closed-beta, single-branch (`main`) repo. No staged rings, no feature flags required for these additive empty-state layers.

## Rollout

- **Shape:** direct merge to `main` (repo convention; no auto-branch). Coordinate concurrent agents via file-scope ownership + fresh `git status`.
- **Sequence:** P1 (href fix) → P2 (empty states) → P4 (analytics). P3 (template chooser) only after `OPEN-DEC-02`.
- **Feature flags:** none required. (`OPTIMISTIC_ESTIMATE_LIST_ENABLED` is an existing temporary backout aid, unrelated.)
- **Pre-merge gates:**
  - `bun run type-check` green.
  - `bun run lint` + `bun run lint:design-system` green.
  - `bun run test:dom` for touched + perf baseline files green.
  - `git diff --check` clean.

## Rollback performance gates (PERF)

| Metric | Observability source | Gate | Regression threshold | Rollback trigger |
|---|---|---|---|---|
| Projects-page render count | `perf/projects-page-render-baseline.test.tsx` | merge | any increase | test red |
| Projects-page RPC round-trips | `perf/projects-page-rpc-contract.test.ts` | merge | new round-trip | test red |
| Empty-state visible correctness | DOM tests | merge | AC fail | test red |
| Activation event redaction | `start-path-activation-events.test.ts` | merge | PII present | test red |

## Rollback procedure

- **Trigger:** any gate red; or a visible regression in empty-state rendering / start flow.
- **Steps:**
  1. Revert the offending commit(s) on `main` (no force-push/history rewrite).
  2. Confirm `bun run test:dom` for the affected files green again.
  3. No data rollback needed (no schema/data change).
- **Fix-forward alternative:** for a copy/visual issue, patch forward (lower risk than revert).

## Observability (post-release)

- FR-06 activation events (`project_created`, `estimate_started`, `estimate_first_area_added`, `estimate_first_row_added`) — the success signal. Once an analytics SDK is chosen (sibling plan), build a funnel view.
- No new logs/dashboards/alerts (free-tier posture; closed beta).

## Operations & support

- No runbook changes (no infra/provider change).
- Support path: a first user who can't see the empty state → check workspace scoping (`ensureDefaultWorkspace`), check `owned` filter (route filters to owned), check that no filter is active.

## Post-release verification

- Confirm the three start journeys (J1 empty workspace, J2 project-zero-estimates, J4 read-only) render correctly.
- Confirm activation events fire for a real first-user path.

## External proof still required

- Hosted/production proof of activation events is **not** claimed by this plan (planning-only). Implementation + sibling analytics-SDK plan own that.
- Browser proof for focus/responsive deferred to implementation.

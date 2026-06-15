# Estimate Peak-Load Profile Baseline

Date: 2026-06-06 (session local date; JSON timestamp is UTC)
Worktree: `/Users/philiplewis/archestimator.omx-worktrees/impl-performance-and-speed-pr-0b-cache-safety`
Branch: `feat/performance-and-speed-pr-0b-cache-safety`

## Scope

This evidence advances the estimate workspace local baseline for Workstream 4. It is a **local jsdom render profile**, not a production Chrome React Profiler trace and not Vercel Speed Insights INP proof.

## Command

```bash
ROUTE_PERF_PROFILE_OUTPUT=.ai/03_plans/2026-06-05-performance-and-speed/evidence/2026-06-06-estimate-peak-load-profile.json \
bun run perf:profile-peak-load
```

Result: passed.

- Test files: 1 passed.
- Tests: 1 passed.
- Duration: 2.95s.

## Metrics

Artifact: `2026-06-06-estimate-peak-load-profile.json`.

| Scenario | Fixture scale | Initial render | Rendered elements | Decision |
| --- | ---: | ---: | ---: | --- |
| `project-estimates-table` | 50 project estimates | 171.01ms | 50 open links | defer virtualization and broad memoization until browser profiler proves jank |
| `estimate-sheet-content` | 200 estimate rows | 355.56ms | 200 row selectors | defer virtualization and broad memoization until browser profiler proves jank |

## Decision

Status language: **LOCAL ESTIMATE PEAK-LOAD BASELINE CAPTURED / BROWSER PROFILER AND PROVIDER INP PROOF OPEN**.

Do not use this jsdom profile alone to justify tree virtualization, broad memoization, or cursor-broadcast throttling. Workstream 4 runtime changes still require browser/React Profiler evidence that identifies the actual bottleneck and regression tests for editing, DnD, context menu, version control, library insert, collaboration cursors, and proposal preview behavior.

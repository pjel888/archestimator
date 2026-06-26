# 13 - Rollout, Rollback, and Operations

## Rollout Strategy

This optimization can ship in small slices.

1. Benchmark harness changes.
2. Baseline capture.
3. Leaf page Suspense boundary refactor.
4. After measurement.
5. Evidence-gated parent layout or overlay work only if needed.

Do not bundle a broad project-layout or overlay rewrite with the leaf page refactor unless Phase 0 proves both are necessary.

## Deployment Readiness

Before any merge or deploy:

- Baseline and after artifacts exist.
- Targeted tests pass.
- Browser timeline confirms no parent fallback flashes.
- Invalid/unauthorized route behavior remains fail-closed.
- Evidence artifacts are sanitized, or any raw screenshots/traces with protected content are kept under ignored `.ai/99_scratch/...` and summarized safely.
- `git diff --check` passes.
- React Doctor changed-scope output is recorded if React files changed.
- Bundle delta is reviewed.

## Rollback

Preferred rollback:

- Revert the isolated leaf page refactor commit.
- Revert benchmark tooling only if it blocks CI; otherwise keep harmless evidence tooling.

If overlay changes ship:

- Keep overlay changes in a separate commit.
- Roll back overlay commit independently if other routes regress or stuck overlay appears.

If project layout changes ship:

- Keep layout changes isolated.
- Roll back on dashboard, estimates list, charts/data, or breadcrumb regressions.

## Monitoring

Local/preview monitoring:

- Route-transition JSON.
- `[perf-json]` server logs.
- Browser trace if needed.
- Bundle analyzer report.

Production/RUM:

- Not owned by this plan.
- If required, create a separate RUM/Speed Insights plan that captures route-level soft navigation data.

## Support and Incident Triggers

Trigger rollback or hotfix if:

- Users see unauthorized project/estimate data.
- Valid sheet routes start 404ing.
- Invalid sheet routes render content instead of notFound/redirect.
- Overlay remains stuck after navigation.
- Project dashboard loading is broken.
- RSC request count or server timing regresses sharply.

## Documentation Updates

After implementation, update:

- Evidence folder summary.
- `.ai/10_state/current-state.md` if project reality changes.
- This plan only if implementation deviates materially from the approved sequence.

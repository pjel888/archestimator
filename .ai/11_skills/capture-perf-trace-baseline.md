---
status: active
last_updated: 2026-07-19
---

# Capture A Performance Trace Baseline

Use this when a concrete symptom or acceptance claim depends on measured route,
D1, bundle, or transition behavior. Start from the symptom; do not collect a
generic baseline merely because instrumentation exists.

## Authority And Test Gate

Read `.ai/00_system/PERFORMANCE_LOADING_AND_MOUNT_PROTOCOL.md` and
`.ai/00_system/VALIDATION_MATRIX.md` first.

- `NOT_REQUIRED` is the default. Use source, diff, package-script, static, or
  existing-artifact inspection when it can decide the claim.
- `TEST_PROPOSAL` records the named risk and exact proposed command but does not
  authorize execution.
- Only an explicit current-task `TEST_TASK` authorizes performance tests,
  OpenNext/Cloudflare preview builds, Playwright, browser traces, fixture seeding,
  or other product-measurement runs.
- This playbook never authorizes a commit.

## Symptom-First Workflow

1. State the observed symptom, affected route/surface, expected threshold, and
   decision the measurement will change.
2. Inspect current instrumentation and scripts before choosing a command:
   `src/lib/perf/server-timing.ts`, `src/components/workshop/WebVitalsProbe.tsx`,
   and current `perf:*` entries in `package.json`.
3. Reuse existing evidence when it matches the same current source, environment,
   route, dataset shape, and claim. Otherwise treat it as historical context.
4. Choose the narrowest evidence that can isolate the symptom. Do not expand
   automatically from a static/source check to a build, browser trace, or seeded
   dataset.
5. If measurement is authorized, record environment, route, auth state, dataset
   shape, warm/cold status, command, raw output, and interpretation. Redact
   cookies, tokens, private URLs, and customer data.
6. Compare like-for-like before/after evidence. Distinguish local-only results
   from provider-backed Cloudflare evidence.

## `TEST_TASK`-Only Command Examples

Confirm each command still exists in `package.json` before running it.

```bash
PERF_TRACE=1 bun run cf:preview
bun run perf:dashboard-query-count
bun run perf:measure-routes
bun run perf:library-baseline
```

Playwright, `test:e2e:perf`, browser automation, fixture seeding, and preview
builds remain user-gated even when an archived performance plan requested them.

## Stop Condition

Stop when the named symptom or threshold has decisive authorized evidence and
the result is labeled `local-only`, `provider-proven`, or still unproven. Do not
create extra evidence artifacts or Git changes solely for ceremony.

## Historical Reference

`.ai/09_archive/store/2026-07-05-Performance-Optimization/` preserves prior
work-package hypotheses and targets. It is not current execution authority.

<!-- Docs-only performance planning pack. Created 2026-06-05. No application code implementation in this folder. -->


# Worker Handoff Prompts

Use these for future implementation or evidence lanes. All prompts preserve the docs-first/no-overclaim posture.


## Mandatory pre-code gate for every worker

No worker may implement code from this pack until all of the following are true:

1. `01-vercel-speed-insights-and-metrics-intake.md` has a captured baseline or a documented observability blocker.
2. `16-metric-decision-tree-and-sequencing-gates.md` selects one metric/route bottleneck.
3. `11-performance-hypothesis-scorecard.md` identifies the active hypothesis.
4. `17-per-surface-acceptance-criteria.md` defines the pass/fail target.
5. `18-test-fixtures-and-data-volume-spec.md` defines the representative fixture.
6. `19-risk-register-and-rollback-runbook.md` names rollback and signoff requirements.

If any item is missing, the worker task is evidence/planning only, not implementation.

## Metrics evidence worker

```text
Role: verifier/researcher.
Task: Capture Vercel Speed Insights baseline for Archestimator. Use logged-in Vercel dashboard or connector-supported export. Record overall score, p75 LCP/INP/CLS/FCP/TTFB, route/device/time-window breakdown, latest deployment id, and screenshots. Do not change project settings. Save results under .ai/03_plans/2026-06-05-performance-and-speed/evidence/ and update 01-vercel-speed-insights-and-metrics-intake.md.
```

## Bundle attribution worker

```text
Role: test-engineer.
Task: Run ANALYZE=true bun run build after dependencies are installed. Identify largest route chunks and whether root layout/providers, fonts, lenis, react-complex-tree, d3, ExcelJS, @firecms/neat, or @phosphor-icons contribute to public/critical routes. Do not optimize yet. Save analyzer summary and recommended first code target.
```

## Root shell architect worker

```text
Role: architect.
Task: Design a low-risk root provider/global CSS/font containment plan for Next.js 16. Respect current tests that intentionally keep @vercel/speed-insights absent unless owner approves a telemetry change. Include blast radius, tests, and rollback. Do not edit code.
```

## Landing performance worker

```text
Role: executor after plan approval.
Task: Optimize the measured public landing bottleneck only. Candidate surfaces: NeatWireframeBackground, LandingSmoothScrollProvider, LandingAnalyticsLoader/ClarityScript, images/fonts. Preserve visual design and consent behavior. Run visual screenshot comparison, Lighthouse/mobile trace, lint/typecheck, and affected tests.
```

## Auth/proxy worker

```text
Role: debugger/security-aware executor.
Task: Improve public/protected route TTFB without weakening proxy auth. Do not replace getUser() with getSession(). Any getClosedBetaAccessForEmail change is CRITICAL blast radius and needs explicit approval. Run auth proxy, beta allowlist, hosted auth, invite-entry, and route-transition tests.
```

## Estimate workspace worker

```text
Role: executor + test-engineer.
Task: Improve measured EstimateSheetContent/EstimateSheetTree INP/render bottleneck. Start with React Profiler evidence and route-transition peak-load profile. Split lazy modal/sidebar/history/proposal preview boundaries only where measured. Preserve cost inputs, DnD, context menu, version control, library insert, collaboration cursors, and proposal preview behavior.
```

## Data/query worker

```text
Role: dependency-expert/Supabase postgres specialist.
Task: Build query plan evidence for protected project/estimate/share routes. Use existing database-indexing-and-query-performance plan. Run EXPLAIN/pg_stat/provider advisor only against the correct Archestimator Supabase project when authorized. Do not mutate provider projects or add migrations without explicit plan approval.
```

## Share/proposal worker

```text
Role: executor + security reviewer.
Task: Optimize public share activity or proposal export only after measured latency evidence. Preserve no-store, token/password/session/rate-limit semantics, internal data hiding, and XLSX correctness. Run publication/share tests and export benchmarks.
```

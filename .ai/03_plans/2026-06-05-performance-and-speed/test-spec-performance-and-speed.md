<!-- Docs-only performance test spec. Created 2026-06-05. -->

# Performance and Speed Test Spec

This file is the short pointer test spec for agents that expect a `test-spec-*` artifact. The full protocol is `06-test-spec-and-validation-protocol.md`.

## Required test families

1. Baseline Speed Insights capture: p75 LCP, INP, CLS, FCP, TTFB, route/device/time window.
2. Bundle analyzer: `ANALYZE=true bun run build` after dependencies are present.
3. Standard repo gates: `bun run type-check`, `bun run lint`, `bun run lint:design-system`, `bun run test`, `bun run test:dom`.
4. Performance route gates: `bun run test:e2e:perf`, `bun run perf:check-routes`.
5. Surface tests based on touched files:
   - root/analytics: `tests/vitest/vercel-web-analytics-integration.test.ts`
   - auth/proxy: auth proxy and hosted auth verification scripts
   - estimate sheet/tree: cost inputs, DnD, context menu, version control, library insert, peak-load profile
   - share/publication: activity/comment/decision/session/password/publication tests
   - proposal export: workbook tests and export benchmark
6. Provider/manual proof: Vercel Speed Insights/Lighthouse/Chrome trace/Supabase EXPLAIN as relevant.

## Completion gate

A future implementation cannot be called complete unless local tests pass and production/provider evidence confirms the targeted metric improvement or explicitly records that more traffic/time is required.

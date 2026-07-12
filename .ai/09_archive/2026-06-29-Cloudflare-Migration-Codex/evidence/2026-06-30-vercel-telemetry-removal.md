# Vercel Telemetry Removal

Generated: 2026-06-30T13:15:30.000Z

Scope: live runtime client telemetry.

## Removed

- Dependencies: `@vercel/analytics`, `@vercel/speed-insights`
- Runtime mounts: `VercelWebAnalytics`, `SpeedInsights`
- Retired files: `src/components/analytics/VercelWebAnalytics.tsx`, `src/lib/analytics/vercel-web-analytics.ts`, `scripts/check-vercel-speed-insights-readiness.ts`
- Retired package script: `perf:check-speed-insights`

## Retained

- Cloudflare Web Analytics remains consent-gated through the public landing loader.
- Historical Vercel proof/cost scripts remain only where they support migration comparison, rollback records, or current-provider baselines.

## Verification

- `bunx vitest run tests/vitest/vercel-analytics-removed.test.ts tests/vitest/cloudflare-web-analytics-integration.test.ts --maxWorkers=1`
- `bunx vitest run tests/vitest/vercel-analytics-removed.test.ts tests/vitest/cloudflare-web-analytics-integration.test.ts tests/vitest/cloudflare-worker-readiness-script.test.ts tests/vitest/cloudflare-provider-resources-script.test.ts tests/vitest/cloudflare-release-gates-script.test.ts tests/vitest/cloudflare-better-auth-proof-script.test.ts --maxWorkers=1`
- `bun run cf:build`
- `bun run cf:check-deploy-dry-run`
- `git diff --check`

Production cutover remains blocked by DNS delegation, missing Google Better Auth OAuth Worker secrets, Better Auth production replacement proof, and cost/performance gates.

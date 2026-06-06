<!-- Docs-only performance planning pack. Added 2026-06-05. No application code implementation in this folder. -->

# Ready Implementation Packets

This document is the handoff that makes code implementation readiness 100% for the first safe stories. Future workers must choose one packet and execute only that packet.

## Packet selection order

1. **PR-0B** — recommended first code-bearing story: public personalization/cache-safety proof.
2. **PR-0A** — if dashboard/browser access is available: fill Speed Insights baseline evidence.
3. **PR-1A** — only after owner closes telemetry privacy decision.
4. **PR-1B** — only after bundle analyzer evidence proves route-level public bundle/global-provider cost.

## PR-0B — Public personalization/cache-safety proof harness

**Status:** READY FOR IMPLEMENTATION.

**Why this is first:** Hosted evidence captured on 2026-06-05 shows public marketing routes return `private, no-cache, no-store` and `x-vercel-cache: MISS`, with `time_starttransfer` roughly 467–544ms from the test location. This is a plausible high-impact public TTFB lever. But source audit shows all marketing pages call `getLandingAuthState()`, and the home page reads consent/A-B cookies and can set `ab_test`, so direct cache relaxation is unsafe until output variance is proven.

**Goal:** Add a small test/harness that proves public marketing HTML/header variation across anonymous, logged-in, consented, and A/B states. The harness should not change production behavior.

**Allowed files:**

- New or existing tests under `tests/vitest/` or `scripts/`.
- Evidence/docs updates under this plan folder.
- Minimal helper extraction only if required by testability, after impact analysis.

**Preferred no-production-code path:**

- Add tests against `getLandingAuthState`, `getVariant`, and public page rendering/cache-header assumptions using existing patterns.
- Add a script/harness that fetches hosted public pages with controlled cookies and records whether headers/body differ.

**Forbidden files without separate approval:**

- `src/proxy.ts` behavior changes.
- `src/lib/auth/closed-beta-access.ts` or `getClosedBetaAccessForEmail`.
- Any route cache header changes.
- Any provider/project settings.

**Pre-edit impact analysis:**

- Run GitNexus impact before any production symbol edit.
- If only adding test/script/docs files, record that no production symbol edit occurred.

**Required tests/commands:**

```bash
bun run type-check
bun run lint
bun run test:dom -- tests/vitest/vercel-web-analytics-integration.test.ts
bun run test:dom -- <new-public-cache-safety-test>
```

If adding a script instead of vitest-only coverage, run it against public routes and save redacted output under `evidence/`.

**Acceptance criteria:**

- The test/harness reports whether `/`, `/about`, `/features`, `/pricing`, `/contact`, `/privacy`, and `/terms` are safe candidates for shared cache.
- It explicitly checks anonymous vs logged-in assumptions, consent accepted/rejected, and home-page A/B cookie behavior.
- It records whether `Set-Cookie`, `Cache-Control`, `Vary`, and `x-vercel-cache` are compatible with future cache optimization.
- It does not change runtime behavior.

**Rollback:**

- Remove the new test/script/evidence-only changes.
- No runtime rollback should be required.

**Completion language:**

- Use `IMPLEMENTATION PACKET COMPLETE / OPTIMIZATION NOT YET SHIPPED`.
- Do not use `COMPLETE` for performance improvement.

## PR-0A — Speed Insights baseline evidence capture

**Status:** READY WHEN DASHBOARD ACCESS IS AVAILABLE.

**Goal:** Fill `01-vercel-speed-insights-and-metrics-intake.md` with exact dashboard/export values and attach evidence files.

**Allowed files:**

- `01-vercel-speed-insights-and-metrics-intake.md`
- `21-evidence-index.md`
- `90-workflow-evidence.md`
- files under `evidence/`

**Commands/tools:**

- Vercel dashboard: `https://vercel.com/philipjonlewis-projects/archestimator/speed-insights`
- Vercel connector project/deployment lookup.
- Screenshots or exported summaries.

**Acceptance criteria:**

- Overall score, p75 LCP/INP/CLS/FCP/TTFB, route/path breakdown, device split, geo if available, time window, deployment id/commit are filled.
- Worst metric and worst route bucket are selected in `01`.
- `16-metric-decision-tree-and-sequencing-gates.md` points to the next packet.

**Completion language:** `BASELINE CAPTURED / READY TO SELECT OPTIMIZATION TARGET`.

## PR-1A — Telemetry privacy implementation

**Status:** BLOCKED UNTIL OWNER DECISION.

**Unblock by filling:** `20-telemetry-privacy-decision-record.md`.

**Possible implementation:** Add `@vercel/speed-insights` with `beforeSend`/`sampleRate` policy or keep dashboard-only and add tests documenting no package addition.

**Required tests:**

- Existing analytics privacy tests.
- Sensitive-route allow/drop/redaction tests for `/workshop`, `/share/[token]`, `/invite/[token]`, `/auth/*`.

**Completion language:** `TELEMETRY DECISION IMPLEMENTED / PROVIDER PROOF OPEN`.

## PR-1B — Bundle attribution and root-shell containment spike

**Status:** READY AFTER BUNDLE ANALYZER BASELINE.

**Unblock by capturing:** `ANALYZE=true bun run build` or `ANALYZE=true bunx next build --webpack` artifacts.

**Allowed implementation only if analyzer proves public-route cost:**

- Split public/workshop providers.
- Stop loading workshop-only CSS on public routes.
- Scope non-critical fonts.

**Required tests:**

```bash
bun run type-check
bun run lint
bun run test:dom -- tests/vitest/vercel-web-analytics-integration.test.ts
bun run test:e2e:perf
bun run perf:check-routes
```

**Completion language:** `IMPLEMENTED LOCALLY / PROVIDER PROOF OPEN` until hosted/Speed Insights evidence proves gains.

## Packet discipline

Future workers must not mix these packets in one PR unless a reviewer explicitly approves it. Evidence and safety packets may run in parallel; runtime code changes should stay one packet at a time.

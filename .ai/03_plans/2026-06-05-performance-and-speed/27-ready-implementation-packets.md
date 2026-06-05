<!-- Docs-only performance planning pack. Added 2026-06-05. No application code implementation in this folder. -->

# Ready Implementation Packets

This document is the handoff that makes code implementation readiness 100% for the first safe stories. Future workers must choose one packet and execute only that packet.

## Packet selection order

1. **PR-0B** — recommended first code-bearing story: public personalization/cache-safety proof.
2. **PR-0A** — if dashboard/browser access is available: fill Speed Insights baseline evidence.
3. **PR-1A** — only after owner closes telemetry privacy decision.
4. **PR-1B** — only after bundle analyzer evidence proves route-level public bundle/global-provider cost.

## PR-0B — Public personalization/cache-safety proof harness

**Status:** IMPLEMENTATION PACKET COMPLETE / OPTIMIZATION NOT YET SHIPPED as of 2026-06-06 in branch `feat/performance-and-speed-pr-0b-cache-safety`.

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

**PR-0B implementation result (2026-06-06):**

- Added `scripts/check-public-cache-safety.ts` to fetch hosted public marketing routes with controlled anonymous, synthetic logged-in-cookie, consent rejected, consent accepted + A/B A, consent accepted + A/B B, and anonymous mobile request states.
- Added `tests/vitest/public-cache-safety-harness.test.tsx` to lock the route/scenario matrix, header/body classification, report language, and source-level logged-in CTA variance via `LandingHeader`.
- Captured hosted evidence at `evidence/2026-06-06-public-cache-safety-harness.md`.
- Result: all seven public marketing routes are **not** compatible with broad shared HTML cache today. Hosted responses remain `private, no-cache, no-store, max-age=0, must-revalidate` with `x-vercel-cache: MISS`; `/` body varies across consent/A-B scenarios; and logged-in CTA markup can vary when `getLandingAuthState()` resolves true.
- Runtime behavior, `src/proxy.ts`, route cache headers, auth, provider settings, and Supabase resources were not changed.

## PR-0A — Speed Insights baseline evidence capture

**Status:** SUBSTITUTE EVIDENCE CAPTURED / SPEED INSIGHTS PROVIDER METRICS OPEN.

**2026-06-06 result:** Captured Vercel connector deployment context and hosted public-route curl timing/header refresh at `evidence/2026-06-06-pr0a-vercel-connector-and-public-route-timing.md`. The required Speed Insights dashboard/export fields remain open because the current connector exposes no Speed Insights metrics endpoint and prior UI attempts timed out.

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

**Status:** BUNDLE BASELINE CAPTURED / CODE OPTIMIZATION NOT YET JUSTIFIED.

**2026-06-06 result:** Captured `ANALYZE=true bun run build` Turbopack behavior and a clean `ANALYZE=true bunx next build --webpack` analyzer pass at `evidence/2026-06-06-bundle-analyzer-baseline.md`. The webpack analyzer first exposed an invalid extra route export in `src/app/api/webhooks/resend/route.ts`; the max-body constant now lives in `src/lib/email/resend-webhook-route-constants.ts`, preserving webhook behavior while allowing Next route type validation to pass.

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

**Current decision:** Do not split providers, move global CSS, or alter fonts in this packet. Analyzer evidence shows candidates, but PR-0A route/device p75 data is still missing and PR-0B proves cache/header changes are unsafe today.

## Packet discipline

Future workers must not mix these packets in one PR unless a reviewer explicitly approves it. Evidence and safety packets may run in parallel; runtime code changes should stay one packet at a time.

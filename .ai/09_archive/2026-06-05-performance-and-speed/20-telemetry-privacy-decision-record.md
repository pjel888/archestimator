<!-- Docs-only performance planning pack. Added 2026-06-05. No application code implementation in this folder. -->

# Telemetry and Privacy Decision Record

## Current decision status

**Status:** REOPENED and superseded on 2026-06-20 — **Option B adopted (owner-approved)**.

Decision (2026-06-20): add `@vercel/speed-insights` root instrumentation for real-user (RUM) field metrics. The owner explicitly approved enabling Speed Insights to measure real-user hero-path performance after the `syd1` region fix brought production authenticated renders to ~700–900 ms.

Privacy rationale (satisfies the Sensitive route policy below via route **templating**, not dropping):

- `@vercel/speed-insights/next` attributes Web Vitals to Next.js **route patterns** (e.g. `/share/[token]`, `/invite/[token]`, `/workshop/projects/[projectId]/estimates/[nodeId]`), NOT literal token/ID values, and does not collect query strings or hash fragments. Raw sensitive values from the Sensitive route policy are therefore not transmitted.
- Unlike Web Analytics, Speed Insights exposes no `beforeSend` hook, so it cannot DROP authenticated/tokenized routes the way `redactVercelAnalyticsEvent` does — it relies on route-pattern attribution instead. Web Analytics keeps its stricter drop-policy unchanged (authenticated `/workshop/*` and tokenized `/share|/invite` page views are still dropped before Vercel receives them).
- Residual owner action: verify in Vercel dashboard → Speed Insights that route labels appear as PATTERNS (no literal tokens/IDs). If any literal sensitive value appears, add `sampleRate`/disable.

Repo evidence (2026-06-20):

- `@vercel/speed-insights` is installed and `<SpeedInsights />` is mounted in `src/app/layout.tsx` (root layout → all routes).
- `@vercel/analytics` + `VercelWebAnalytics` (with `redactVercelAnalyticsEvent`) remain mounted and unchanged.
- `tests/vitest/vercel-web-analytics-integration.test.ts` updated to assert Speed Insights is present and to record this superseding decision.

---

### Historical decision (superseded 2026-06-20)

**Status:** closed for PR-1A on 2026-06-06.

Decision: **Option A — dashboard/provider-only Speed Insights, no package change**.

The active implementation path (as of 2026-06-06) must not add `@vercel/speed-insights`, `<SpeedInsights />`, or custom web-vitals telemetry until a later owner-approved decision reopens this record with a concrete redaction/drop/sampling policy and provider proof plan. — Superseded 2026-06-20 by Option B above.

Current repo evidence shows:

- `@vercel/analytics` is installed and `VercelWebAnalytics` is mounted in `src/app/layout.tsx`.
- `@vercel/speed-insights` is not installed in `package.json`.
- Existing tests intentionally assert Speed Insights is absent in `tests/vitest/vercel-web-analytics-integration.test.ts`.
- Numeric Vercel Speed Insights provider p75 proof is captured via CLI without adding `@vercel/speed-insights`; dashboard overview/recommendation cards remain unavailable from repeated Computer Use/protected-fetch attempts.

## Decision options

| Option | Description | Pros | Risks | Required before choosing |
| --- | --- | --- | --- | --- |
| A | Dashboard/provider-only Speed Insights, no package change | No code/privacy change; lowest risk | May lack route attribution/export detail | Confirm dashboard route/device metrics are sufficient |
| B | Add `@vercel/speed-insights` root instrumentation | Better direct RUM capture if dashboard needs it | Privacy/route-label risk; test updates required | owner privacy approval, redaction/drop tests, package review |
| C | Use Speed Insights drain/export/API-style evidence | Stronger analysis path | Provider setup/config risk; API path may be deprecated depending on Vercel docs | verify current Vercel docs and dashboard capabilities |
| D | Add custom `useReportWebVitals` client boundary for local/provider telemetry | Captures hydration/render/route-change metrics | Can add client boundary/noise; storage/privacy questions | define destination, sampling, redaction, retention |

## Sensitive route policy

No telemetry decision may expose raw values from:

- `/share/<token>`
- `/invite/<token>`
- recipient tokens/query params,
- password/session identifiers,
- protected workshop paths containing project/estimate identifiers if policy forbids them.

Use route labels such as `/share/[token]` and redact query strings.

## Required tests if telemetry changes

- Existing web analytics integration tests updated intentionally.
- Sensitive-route redaction/drop tests for share/invite/workshop paths.
- Consent-gated GA/Clarity behavior remains unchanged.
- Provider/dashboard proof captured after deployment.

## Decision record template

```text
Decision date: 2026-06-06
Chosen option: Option A — dashboard/provider-only Speed Insights, no package change
Approver: owner goal to implement the performance plan, constrained by prior security removal and current dashboard access blockers
Reason: Lowest-risk path preserves the existing privacy/security posture after `@vercel/speed-insights` was removed. The Vercel CLI now captures provider p75 metrics without adding a package; adding client instrumentation would increase telemetry/privacy surface without solving dashboard UI access or comparable-window proof.
Sensitive route policy: Keep dropping tokenized `/share/<token>` and `/invite/<token>` page views before Vercel receives them. Keep dropping authenticated `/workshop/*` page views. Keep stripping query strings and hash fragments from allowed public page views.
Tests required: `tests/vitest/vercel-web-analytics-integration.test.ts` must prove Web Analytics remains redacted, Speed Insights remains absent, and this decision record stays dashboard-only/no-package.
Provider proof required: Vercel Speed Insights dashboard/export p75 route/device metrics remain required before claiming real-user performance improvement; dashboard overview/recommendation cards remain optional/manual provider UI evidence if required.
Rollback: Reopen this decision record, add an owner-approved Option B/C/D policy, add sensitive-route redaction/drop/sampling tests before adding any package or telemetry destination, then deploy and capture provider proof.
```

Completion language: **TELEMETRY DECISION IMPLEMENTED / PROVIDER PROOF OPEN**.


## `beforeSend` and `sampleRate` gate

If option B or C is selected, future implementation must define whether Speed Insights events are:

- dropped for sensitive route classes,
- rewritten to route templates such as `/share/[token]`,
- sampled with `sampleRate`,
- exported/drained into any destination with access controls.

Tests must assert the policy before deployment.

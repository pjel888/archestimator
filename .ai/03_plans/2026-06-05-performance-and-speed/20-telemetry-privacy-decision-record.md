<!-- Docs-only performance planning pack. Added 2026-06-05. No application code implementation in this folder. -->

# Telemetry and Privacy Decision Record

## Current decision status

**Status:** closed for PR-1A on 2026-06-06.

Decision: **Option A — dashboard/provider-only Speed Insights, no package change**.

The active implementation path must not add `@vercel/speed-insights`, `<SpeedInsights />`, or custom web-vitals telemetry until a later owner-approved decision reopens this record with a concrete redaction/drop/sampling policy and provider proof plan.

Current repo evidence shows:

- `@vercel/analytics` is installed and `VercelWebAnalytics` is mounted in `src/app/layout.tsx`.
- `@vercel/speed-insights` is not installed in `package.json`.
- Existing tests intentionally assert Speed Insights is absent in `tests/vitest/vercel-web-analytics-integration.test.ts`.
- Vercel Speed Insights dashboard/provider proof is still open from repeated Computer Use timeouts.

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
Reason: Lowest-risk path preserves the existing privacy/security posture after `@vercel/speed-insights` was removed. Current connector/browser attempts cannot capture dashboard p75 metrics, and adding a package would increase telemetry/privacy surface without solving provider access.
Sensitive route policy: Keep dropping tokenized `/share/<token>` and `/invite/<token>` page views before Vercel receives them. Keep dropping authenticated `/workshop/*` page views. Keep stripping query strings and hash fragments from allowed public page views.
Tests required: `tests/vitest/vercel-web-analytics-integration.test.ts` must prove Web Analytics remains redacted, Speed Insights remains absent, and this decision record stays dashboard-only/no-package.
Provider proof required: Vercel Speed Insights dashboard/export p75 route/device metrics remain required before claiming real-user performance improvement.
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

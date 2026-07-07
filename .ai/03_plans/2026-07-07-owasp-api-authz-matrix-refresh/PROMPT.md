# GLM5.2 Plan Pack Prompt: OWASP API/Authz Matrix Refresh

Date: 2026-07-07
Target folder: `.ai/03_plans/2026-07-07-owasp-api-authz-matrix-refresh`
Mode: planning only. Create the plan pack in this folder; do not change application code.

## Goal

Create a refreshed OWASP/API authorization plan pack that audits all current API routes, public share routes, auth boundaries, and mutation paths against first-user production expectations.

## Evidence To Start From

- Existing plan `.ai/03_plans/2026-06-01-security-owasp-compliance-audit` is older than the current code.
- `src/app/api/`, `src/app/share/`, invite routes, proposal routes, feedback routes, upload routes, and compliance routes have continued to evolve.
- Better Auth is D1-backed and Cloudflare is the production substrate.
- Security CI gates are not yet unified with a complete current authz matrix.

## Required Plan Pack

Include endpoint inventory, auth/authz decision table, tenant isolation checks, mutation/idempotency checks, CSRF/origin policy, rate-limit needs, negative tests, release gates, and prioritized remediation.

## Constraints

Use current source as truth. Do not rely on the older June audit without re-validating each route.

## Stop Condition

The pack is complete when it can drive an implementation pass and test suite for current API authorization readiness.

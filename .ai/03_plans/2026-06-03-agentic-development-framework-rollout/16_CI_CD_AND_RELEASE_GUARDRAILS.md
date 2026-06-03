# CI/CD and Release Guardrails

## Current CI
`.github/workflows/ci.yml` runs install, validate, build, Playwright e2e, and route-transition perf smoke.

## Future guardrails
- Set explicit `permissions:` in Actions.
- Consider pinning third-party actions or maintaining trusted-action allowlist.
- Use OIDC/provider-native flows instead of long-lived deployment secrets where approved.
- Use GitHub environments and approvals for beta/production.
- Add docs-compliance/advisory agent-payload schema checks after dry-run.
- Use CODEOWNERS/rulesets progressively.

## What agents must never do
Delete tests, skip failing checks, weaken branch protection, print secrets, bypass approvals, claim deployment/provider proof without evidence, or modify GitHub settings without authorization.

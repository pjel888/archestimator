# GitHub Protection and PR Policy Plan

## Current local evidence
CI exists but no live GitHub ruleset/protection mutation was performed in this task.

## Future recommendations
- Rulesets over legacy branch protections where practical; start in evaluate/advisory mode.
- Required checks: validate, build, e2e/perf for release-relevant branches, docs-compliance after dry-runs.
- PR reviews: CODEOWNERS for `.github`, migrations, security/provider docs, `.ai/00_system`, payloads.
- Actions security: least privilege, trusted/pinned actions policy, OIDC, environments, secret scanning/dependency graph/Dependabot/code scanning where available.
- Emergency: preserve Philip admin recovery path.

## Rollback
Document ruleset names/settings before enforcement; switch to evaluate/disabled if urgent recovery blocked.

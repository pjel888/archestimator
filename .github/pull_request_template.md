# Summary

<!-- State the user-visible or operational outcome. -->

## Risk and acceptance

- Classified profile: `Q0 | Q1 | Q2 | Q3`
- Critical capability IDs:
- Actors, roles, and tenant boundaries affected:
- Happy, denial, boundary, failure, recovery, and concurrency criteria:
- Non-goals:

## Evidence

<!-- Link the quality manifest and list exact commands with result, count, duration, and artifact path. -->

- Quality manifest:
- Acceptance/BDD evidence:
- Unit/component/Workers evidence:
- Browser/accessibility evidence:
- Coverage/mutation evidence:
- Security/dependency evidence:
- Performance/observability evidence:

## Data and migration

- [ ] No schema, migration, persisted-data, import/export, or recovery impact.
- [ ] Migration and recovery impact is described below with local rehearsal evidence.

Details:

## Security and privacy

- Threats and negative cases:
- Authn/authz/tenant-isolation impact:
- Secrets, logs, redaction, uploads, cache, and privacy impact:
- Findings and expiring human-approved waivers:

## Accessibility

- Keyboard, focus, semantics, screen-reader, contrast, and responsive impact:
- Automated and manual evidence:

## Performance and observability

- Budgets or baselines affected:
- Structured logging, correlation, error handling, and alert readiness:
- Hosted proof collected or explicitly pending:

## Release and recovery

- Rollback or fix-forward procedure:
- Data restore considerations:
- External enforcement/provider proof still pending:

## Author checklist

- [ ] The classifier selected the profile automatically; no profile was downgraded.
- [ ] Every acceptance criterion maps to executable or explicitly non-automatable evidence.
- [ ] Required jobs passed without skip, focus, hidden retry, flake, or `continue-on-error`.
- [ ] Zero unresolved high/critical security finding and zero S0/S1 defect.
- [ ] No secret, private user data, sensitive trace, or production fixture is attached.
- [ ] Local, CI, remote-enforcement, hosted, and production evidence are distinguished.

# Beta quality operations

Archestimator classifies every change as `Q0`, `Q1`, `Q2`, or `Q3`. The classifier selects the profile; authors may escalate but may not downgrade it. Required evidence must execute and pass. Missing, malformed, skipped, cancelled, flaky, or hidden-failure evidence is a gate failure.

The canonical policy is `.ai/00_system/BETA_QUALITY_ENGINEERING_PROTOCOL.md`. Machine-readable profile requirements live in `quality/profiles.json`, risk rules in `quality/risk-map.json`, thresholds in `quality/thresholds.json`, and capability traceability in `quality/critical-capabilities.json`.

## CI checks

The active pull-request and `main` workflow emits stable checks:

- `quality / classify`
- `quality / contracts`
- `quality / static`
- `quality / unit`
- `quality / component`
- `quality / workers`
- `quality / bdd-smoke`
- `quality / a11y`
- `quality / build`
- `quality / e2e-smoke`
- `quality / mutation-changed`
- `quality / security`
- `quality / operations`
- `quality / coverage`
- `quality / gate`

The aggregate reads the selected profile and job-result manifest. A skipped job is accepted only when `quality/profiles.json` proves that it is inapplicable. A required skipped job fails.

Security analysis separately emits `security / codeql` and, on pull requests, `security / dependency review`. Nightly and manual release-evidence workflows run the Q3 surface, full browser matrix, comprehensive mutation/security evidence, local operations checks, SBOM generation, and provenance/SBOM attestations.

## Evidence boundaries

- **Local proof:** deterministic repository checks using synthetic fixtures and local bindings.
- **CI proof:** a recorded GitHub Actions run for the exact commit.
- **Remote enforcement:** GitHub ruleset, code-scanning, Dependabot, secret-scanning, and push-protection state read back from GitHub.
- **Hosted proof:** an authorized check against a deployed provider resource.
- **Production proof:** explicitly authorized observation of the production environment.

Configured workflows are not passing evidence until they run. Local proof is not hosted proof. This repository currently reports `EXTERNAL_ENFORCEMENT_PENDING`; see [GITHUB_ENFORCEMENT.md](GITHUB_ENFORCEMENT.md).

## Operator references

- [QA_OPERATIONS.md](QA_OPERATIONS.md) defines readiness, completion, defect, waiver, and artifact-handling rules.
- [OPERATIONS_GATES.md](OPERATIONS_GATES.md) maps performance, observability, migration, Cloudflare, and release checks to evidence boundaries.
- [security/ASVS-5-MAPPING.md](security/ASVS-5-MAPPING.md) maps critical capabilities to selected OWASP ASVS 5.0.0 controls without claiming certification.
- [security/SUPPLY_CHAIN.md](security/SUPPLY_CHAIN.md) covers workflow, dependency, secret-scanning, SBOM, and provenance controls.

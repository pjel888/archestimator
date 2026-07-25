# Security and supply-chain operations

## Pull requests and `main`

- All third-party actions are pinned to full 40-character commit SHAs.
- Workflow and job permissions are explicit and minimal.
- Untrusted pull requests use `pull_request`, never `pull_request_target`.
- Dependencies install with the repository-pinned Bun version and `--frozen-lockfile`.
- `quality:security` owns Bun audit, workflow syntax/security analysis, secret-pattern/static checks, and normalized findings.
- `security / dependency review` rejects newly introduced high-severity dependencies.
- `security / codeql` runs JavaScript/TypeScript security-extended and security-and-quality queries.
- Required failures cannot use `continue-on-error`.

The workflow-security gate must reject tag-only third-party actions, broad write permissions, untrusted checkout plus secrets, unsafe shell interpolation, mutable downloads, missing timeouts, required `continue-on-error`, and `pull_request_target`.

## Dependency updates

Dependabot checks npm and GitHub Actions weekly. Production dependency grouping is patch-only; broader production upgrades remain individually reviewable. Security updates still require the automatically selected profile and full evidence. Do not merge an update merely because Dependabot opened it.

`bun audit` output is dependency evidence, not proof that application security controls are correct. `quality:security` normalizes the registry JSON, fails every current high/critical advisory, and fails medium advisories unless a separate human-approved, expiring waiver is implemented and supplied. Low findings remain visible in the manifest. The gate never stores raw audit output.

## Secret scanning

Repository configuration cannot prove GitHub secret scanning or push protection is active. Apply and read back those settings using [../GITHUB_ENFORCEMENT.md](../GITHUB_ENFORCEMENT.md). Treat every detected credential as compromised: contain exposure, revoke/rotate at the provider, remove it from current source, assess history and use, and record a sanitized incident. Merely deleting the text is insufficient.

The local gate scans tracked and unignored source, configuration, and repository text/document files for private-key and credential/token patterns. Generated artifact directories and historical archives are excluded; oversized active text inputs still fail closed. Findings contain only the rule, repository path, and line number, never the matched value. Synthetic secret fixtures are exempt only under `tests/fixtures/security/**` when they contain the explicit `quality-secret-scan: synthetic-fixture` marker.

Never upload raw secret-scanning matches, credentials, cookies, private URLs, provider payloads, or private user data as CI artifacts.

## Release SBOM and provenance

The manual release-evidence workflow:

1. accepts and validates a full immutable commit SHA;
2. checks out and verifies that exact commit;
3. runs Q3;
4. builds a Cloudflare candidate without deployment;
5. creates a source-map/log-excluding candidate archive and SHA-256 digest;
6. generates a CycloneDX JSON SBOM;
7. requests GitHub build-provenance and SBOM attestations;
8. uploads the candidate and safe evidence for 14 days.

Attestation depends on GitHub-hosted OIDC and repository attestation support. A configured workflow is not an attestation until a run succeeds and the attestation is read back for the exact candidate digest. The workflow never deploys.

## OSS fallback

If GitHub CodeQL or dependency review is unavailable, `quality:security` remains required and runs the checked-in workflow-security analysis, normalized Bun audit, and repository secret-pattern scan. Supply a local CodeQL/SARIF report with `--sarif <repository-relative-path>` when one exists; the gate normalizes it and fails unknown, unwaived medium, high, or critical results without retaining messages or source snippets. When no SARIF is supplied, the manifest records `NOT_SUPPLIED` and keeps authoritative GitHub code-scanning proof `EXTERNAL_PENDING`. Local fallback evidence must never be labelled GitHub code-scanning proof.

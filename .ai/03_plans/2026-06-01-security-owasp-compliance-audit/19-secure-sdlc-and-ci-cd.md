# 19 — Secure SDLC and CI/CD

## Findings

### F-CI-01 — Workflow `permissions:` not declared at workflow level

- **Severity:** High
- **Likelihood:** Medium
- **Impact:** Medium
- **Evidence:** `.github/workflows/ci.yml` does not set `permissions:` at the workflow level — defaults to repo token (read/write)
- **Recommendation:** Set `permissions: read-all` at workflow level, escalate per-job as needed. (R-64)
- **CWE:** CWE-269
- **OWASP 2025:** A05
- **ASVS 5.0:** V14.6

### F-CI-02 — No SAST step

- **Severity:** High
- **Likelihood:** High
- **Impact:** Medium
- **Recommendation:** Add `github/codeql-action` or `semgrep` to CI. (R-28, re-stated)
- **OWASP 2025:** A04
- **ASVS 5.0:** V14.6

### F-CI-03 — No SCA step

- **Severity:** High
- **Likelihood:** High
- **Impact:** High
- **Recommendation:** Add `osv-scanner` or `bun audit` to CI. (R-27, re-stated)
- **OWASP 2025:** A06
- **ASVS 5.0:** V14.2

### F-CI-04 — No secret-scanning step

- **Severity:** High
- **Likelihood:** Medium
- **Impact:** Critical
- **Recommendation:** Add `gitleaks` action; consider GitHub native secret scanning. (R-29, re-stated)
- **OWASP 2025:** A05
- **ASVS 5.0:** V14.1

### F-CI-05 — No DAST step

- **Severity:** Medium
- **Likelihood:** Medium
- **Impact:** Medium
- **Recommendation:** Add a nightly DAST run (e.g., OWASP ZAP baseline) against a preview deployment. (R-65)
- **OWASP 2025:** A04
- **ASVS 5.0:** V1.14

### F-CI-06 — No SBOM / dependency review

- **Severity:** Medium
- **Likelihood:** High
- **Impact:** Low (informational)
- **Recommendation:** Emit CycloneDX SBOM; enable Dependabot / Renovate. (R-30, R-66)
- **OWASP 2025:** A06
- **ASVS 5.0:** V14.2

### F-CI-07 — No signed releases / verified provenance

- **Severity:** Medium
- **Likelihood:** Medium
- **Impact:** Medium
- **Recommendation:** Add SLSA provenance and signed commits on release. (R-67)
- **OWASP 2025:** A08
- **ASVS 5.0:** V14.6

### F-CI-08 — Branch protection not observed

- **Severity:** Medium
- **Likelihood:** Medium
- **Impact:** High
- **Recommendation:** Require PR reviews + passing CI for `main`; restrict direct pushes. (R-68)
- **OWASP 2025:** A05
- **ASVS 5.0:** V14.6

### F-CI-09 — Test coverage gate not in workflow

- **Severity:** Low
- **Likelihood:** Medium
- **Impact:** Low
- **Recommendation:** Add coverage threshold gate. (R-69)
- **OWASP 2025:** A04

## Recommendations

- R-28 (re-stated): SAST
- R-27 (re-stated): SCA
- R-29 (re-stated): Secret scanning
- R-30 (re-stated): SBOM
- R-64: `permissions:` at workflow level
- R-65: DAST
- R-66: Dependabot / Renovate
- R-67: Signed releases / SLSA
- R-68: Branch protection
- R-69: Coverage gate

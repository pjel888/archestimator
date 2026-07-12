# 10 — Third-Party and Supply Chain

## Findings

### F-SC-01 — Dependency pinning observed in `package.json`

- **Severity:** Informational (control)
- **Status:** Implemented correctly
- **Evidence:** Reviewed manifest pins exact versions for all production deps (no `^` or `~` seen in spot-checked entries)
- **Strength:** Reproducible builds
- **CWE:** CWE-1357
- **OWASP 2025:** A06
- **OWASP API 2023:** API8
- **ASVS 5.0:** V14.2

### F-SC-02 — No CI step for dependency review / SCA

- **Severity:** High
- **Likelihood:** High (without a gate, vulnerabilities persist)
- **Impact:** High (known CVEs in `next`, `exceljs`, `sharp`, `resend`, `@supabase/*` could go unnoticed)
- **Evidence:** `.github/workflows/ci.yml` runs `bun run validate`, `bun run build`, `playwright test` — no SCA, no `npm audit`, no `osv-scanner`, no `dependabot` config observed
- **Recommendation:** Add an SCA gate (e.g., `osv-scanner` or `bun audit`) and enable Dependabot / Renovate. (R-27)
- **CWE:** CWE-1104
- **OWASP 2025:** A06
- **ASVS 5.0:** V14.2

### F-SC-03 — No SAST gate in CI

- **Severity:** High
- **Likelihood:** High
- **Impact:** Medium
- **Evidence:** CI does not run `semgrep`, `codeql`, or equivalent
- **Recommendation:** Add a SAST gate. (R-28)
- **CWE:** CWE-1126
- **OWASP 2025:** A04
- **OWASP API 2023:** API8
- **ASVS 5.0:** V14.6

### F-SC-04 — No secret-scanning gate in CI

- **Severity:** High
- **Likelihood:** Medium (devs may inadvertently commit)
- **Impact:** Critical (service-role key in source = full DB compromise)
- **Evidence:** CI has no `gitleaks`, `trufflehog`, or equivalent
- **Recommendation:** Add secret scanning as a required check on PR. (R-29)
- **CWE:** CWE-798
- **OWASP 2025:** A05
- **OWASP API 2023:** API8
- **ASVS 5.0:** V14.1

### F-SC-05 — No SBOM produced

- **Severity:** Medium
- **Likelihood:** High
- **Impact:** Low (informational for incident response)
- **Evidence:** No SBOM artefact in CI
- **Recommendation:** Emit an SBOM (CycloneDX) on each release. (R-30)
- **CWE:** CWE-1357
- **OWASP 2025:** A06
- **ASVS 5.0:** V14.2

### F-SC-06 — Third-party providers

| Provider | Use | DPA / contract posture | Recommendation |
|---|---|---|---|
| Supabase | DB, Auth, Storage | Provider-side | R-22 |
| Resend | Email transactional | DPA TBD | R-20 |
| DeepSeek | LLM | DPA TBD, data flow TBD | R-12, R-20 |
| Vercel | Hosting | DPA TBD | R-31 |

### F-SC-07 — Image pipeline (`sharp`)

- **Severity:** Medium
- **Likelihood:** Medium (sharp has had memory-corruption CVEs)
- **Impact:** Medium
- **Evidence:** `sharp` is used in upload routes. Pinning observed in `package.json`.
- **Recommendation:** Subscribe to `sharp` advisories; ensure auto-update path. (R-32)
- **CWE:** CWE-1104
- **OWASP 2025:** A06

### F-SC-08 — `exceljs` version — manual review needed

- **Severity:** Low
- **Likelihood:** Low
- **Impact:** Medium
- **Evidence:** `exceljs` is used for XLSX export
- **Recommendation:** Verify `exceljs` version has no known CVEs; add to SCA baseline. (R-33)
- **CWE:** CWE-1104

### F-SC-09 — `@supabase/ssr` and `@supabase/supabase-js` versions

- **Severity:** Informational
- **Evidence:** `@supabase/ssr@0.10.3`, `@supabase/supabase-js@2.106.2`
- **Recommendation:** Subscribe to Supabase security advisories. (R-34)

### F-SC-10 — `next` version

- **Severity:** Informational
- **Evidence:** `next@16.2.6` — project rule in `AGENTS.md` flags that "this is NOT the Next.js you know" and breaks should be read from `node_modules/next/dist/docs/`
- **Recommendation:** Add an `next`-advisory subscriber and a regression test for security-relevant headers (CSP, Permissions-Policy). (R-35)

## Recommendations

- R-27: SCA gate
- R-28: SAST gate
- R-29: Secret scanning
- R-30: SBOM
- R-31: Vercel DPA / privacy review
- R-32–R-35: Subscribe to provider advisories

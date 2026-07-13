# 16 — Requirements Traceability Matrix

**Schema (mandated by Improve-Plan-Prompt §PHASE-3.2):** `Source ID | Requirement | Source evidence | Source strength | Plan section | Work item | Acceptance criteria | Test/proof | Risk | Status | Gap/decision`

**Source-strength legend:** `brief` (PROMPT.md), `repo evidence` (current source/config), `official docs` (GitHub/Vitest/Sigstore/etc. docs), `assumption` (unvalidated), `derived` (inferred from other reqs), `owner-delegated decision` (owner-signed).

| Source ID | Requirement | Source evidence | Source strength | Plan section | Work item | Acceptance criteria | Test/proof | Risk | Status | Gap/decision |
|---|---|---|---|---|---|---|---|---|---|---|
| SRC-B1 | SEC-CI-01 consolidated security:gate | PROMPT.md "one consolidated security release gate" | `brief` | `06` §3-4, `11` WP-3 | WP-3.1, WP-3.2 | AC-01a..d | TEST-CI-01 | RISK-CI-03 | specified (impl-ready) | — |
| SRC-B2 | SEC-CI-02 dependency-vuln gate (bun audit) | PROMPT.md "dependency risk"; `package.json` overrides; `19` §1 (Dependabot free) | `brief`+`repo evidence`+`official docs` | `11` WP-1.1 | WP-1.1 | AC-02a..e | TEST-CI-02 | RISK-CI-01, RISK-CI-18 | specified (impl-ready; overrides-verify load-bearing) | AC-02d override-honoring must be verified (RISK-CI-18) |
| SRC-B3 | SEC-CI-03 secret scanning (gitleaks) | PROMPT.md "secret scanning"; `19` §1 (native needs Secret Protection) | `brief`+`official docs` | `11` WP-1.2 | WP-1.2 | AC-03a..e | TEST-CI-03 | RISK-CI-02, RISK-CI-04 | specified (impl-ready) | gitleaks diff flag = `--log-opts` (R4) |
| SRC-B4 | SEC-CI-04 SBOM + provenance | PROMPT.md "SBOM/provenance"; `19` §1 (attestation needs GHEC) | `brief`+`official docs` | `11` WP-1.3 | WP-1.3 | AC-04a..e | TEST-CI-04 | RISK-CI-05, RISK-CI-16, RISK-CI-17 | specified (04a/04c Tier-A impl-ready; 04b Tier-B OPEN-CI-06) | Go-binary install (R4); osv can't scan bun.lock |
| SRC-B5 | SEC-CI-05 coverage threshold | PROMPT.md "coverage thresholds"; `19` §10-11 | `brief`+`official docs` | `11` WP-4 | WP-4.1..4.4 | AC-05a..e | TEST-CI-05 | (Vitest include gotcha) | specified (DISCOVERY for baseline; 40% floor AC-05e) | baseline measure-then-set; floor guards low auto-set |
| SRC-B6 | SEC-CI-06 DAST-like route smoke | PROMPT.md "DAST-like smoke"; `19` §15 | `brief`+`official docs` | `11` WP-1.5 | WP-1.5 | AC-06a..d | TEST-CI-06 | RISK-CI-06, RISK-CI-15 | specified (DISCOVERY for route manifest) | auth-regression detector; lifecycle spec needed (R4 T-8) |
| SRC-B7 | SEC-CI-07 SAST (CodeQL) | PROMPT.md "SAST/CodeQL"; `.github/codeql/` exists; `19` §1 (Code Security) | `brief`+`repo evidence`+`official docs` | `11` WP-2.3 | WP-2.3 | AC-07a..c | TEST-CI-07 | RISK-CI-08 | specified (Tier B, OPEN-CI-01) | biggest residual; restore path documented |
| SRC-B8 | SEC-CI-08 PR dep-diff gate | PROMPT.md "dependency risk"; `19` §1 (dep-review needs Code Security) | `brief`+`official docs` | `11` WP-1.6 | WP-1.6 | AC-08a..c | TEST-CI-08 | RISK-CI-17 | specified (Tier-A osv substitute impl-ready; Tier-B OPEN-CI-09) | osv via package.json/SBOM, NOT bun.lock (R4) |
| SRC-B9 | OPS-CI-01 release-blocking policy | PROMPT.md "release blocking policy" | `brief` | `13` §2 | (doc) | AC-O1a/b | static (doc review) | — | specified | conditional on OPEN-CI-04 + launch-gate reader (R4 T-6) |
| SRC-B10 | OPS-CI-02 escape hatches | PROMPT.md "local developer escape hatches" | `brief` | `13` §3, `11` WP-0.5/3.2 | WP-0.5, WP-3.2 | AC-O2 | TEST-CI-01 (--help) | — | specified | — |
| SRC-B11 | ARCH-CI-01 CI restore + permissions | `workflows-disabled/ci.yml`; `19` §13 least-privilege | `repo evidence`+`official docs` | `11` WP-0.1, WP-2.1 | WP-0.1, WP-2.1 | (implicit: pins+permissions present) | TEST-CI-07 (pinning) | RISK-CI-13 | specified | feat/**→[main] narrowing = OPEN-CI-11 (R4) |
| SRC-B12 | ARCH-CI-02 SECURITY.md | `03` §2 (missing) | `repo evidence` | `11` WP-0.3 | WP-0.3 | present + mirrors security.txt | static | — | specified | — |
| SRC-B13 | DOC-CI-01 launch-gate mapping | launch-readiness-evidence-gate pack OPEN-LG-05/06 | `repo evidence` (sibling pack) | `13` §4 | WP-6 | contract test | static | (coordination) | specified | contract is PROPOSED, not reciprocated (R4 T-5) |
| SRC-D1 | TEST-CI-01..08 gate self-tests | (derived from SEC-CI-*) | `derived` | `11` WP-5, `12` §2 | WP-5 | per AC | (self) | — | specified | — |
| SRC-D2 | UX-CI-01..05 CLI report | (derived) | `derived` | `05`, `11` WP-3.1/3.2 | WP-3.1, WP-3.2 | report shape | TEST-CI-01 | — | specified | — |
| SRC-D3 | A11Y-CI-01..03 no color-only | (derived) | `derived` | `05`, `11` WP-3.1 | WP-3.1 | NO_COLOR/word+symbol | TEST-CI-01 | — | specified | — |
| SRC-D4 | TM-CI-01..11 gate self-protection | `08` threat model | `derived` | `08`, `11` per-TM | (per TM) | per TM | ADV-01..17 | — | specified | TM-CI-11 cosign-blind residual |

## Performance-sensitive requirements (extra columns per directive)

| Req | Baseline | Target | Measurement | Regression threshold | Rollback trigger |
|---|---|---|---|---|---|
| SEC-CI-01 | TBD (WP-4.1) | < 120s local | `time security:gate` | +50% | disable workflow |
| SEC-CI-04 | n/a | SBOM exists for release | artifact presence | missing | block release |
| SEC-CI-05 | baseline (WP-4.1) | monotonic ↑ | coverage-summary | regression | ratchet-down PR |
| (CI budget) | 0 | < 1,500 min/mo | Actions billing | warn > 1,800; cap 2,000 | cost levers (`09` §1) |

## Coverage check

- **All 7 brief gate categories** (dependency, secret, SAST, SBOM/provenance, DAST-smoke, coverage, release-policy) → mapped: SEC-CI-02, 03, 07, 04, 06, 05, OPS-CI-01. ✓
- **All brief deliverables** (gate categories, tools, thresholds, escape hatches, CI cost, retention, launch mapping) → mapped: §`06` categories, `15` tools, `04` thresholds, `13` §3 hatches, `09` §1 cost, `09` §5 retention, `13` §4 launch mapping. ✓
- **Every task maps to ≥1 requirement** (`11` WP table). ✓
- **Every requirement maps to source + work item + AC + test + risk + status + gap.** ✓ (11 mandated columns present)
- **No requirement untraced.** ✓
- **Source-strength classification** applied to every row (`brief`/`repo evidence`/`official docs`/`derived`). ✓

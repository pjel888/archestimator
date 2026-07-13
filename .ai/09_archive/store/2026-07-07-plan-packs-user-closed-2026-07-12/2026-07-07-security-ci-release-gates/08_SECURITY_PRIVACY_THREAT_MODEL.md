# 08 — Security, Privacy, and Threat Model

This pack *is* a security control, so its own threat surface must be modeled. Two layers: (A) threats the gates **detect/mitigate**, and (B) threats **to the gates themselves**.

## §1. Trust boundaries

| Boundary | Trust side (high) | Untrusted side (low) |
|---|---|---|
| CI runner | workflow inputs (code, PR) | PR author (external contributor?), fork PRs |
| Local dev | owner machine | cloned repo content, tool binaries |
| Launch-gate consumer | `security:gate` artifact | (treated as trusted if signed; unsigned = advisory) |
| GitHub attestation store | GitHub Sigstore CA | (trusted root) |
| Rekor (Sigstore transparency log) | public-good CA | (trusted root; availability is best-effort) |

**Actor roles:**
- **Owner (Philip):** full trust; can bypass any gate locally.
- **CI runner (GITHUB_TOKEN):** least-privilege per workflow; `contents: read` default; `id-token: write` only on the cosign step; `attestations: write` only on the Tier-B SBOM step.
- **External contributor (future):** untrusted; must not be able to skip gates or exfiltrate secrets via `pull_request_target` misuse.

## §1b. Attack Surface Inventory (mandated by Improve-Plan-Prompt §PHASE-3.7)

The product of this pack IS a CI/automation surface. Entry-point inventory:

| Entry point | Actor | Authn/authz + ownership check | Input validation | Output DTO / artifact | Cache/header behavior | Rate/abuse posture | Required tests |
|---|---|---|---|---|---|---|---|
| `pull_request` trigger (security-gates.yml) | PR author (incl. fork) | GITHUB_TOKEN `contents: read`; fork PRs get NO secrets; `id-token:write`/`attestations:write` steps gated `if: same-repo` | workflow YAML is static (no user input); gate scripts validate their own inputs | PR comment (dep-diff); `security-dep-diff` check; report artifact | n/a (CI) | cancel-in-progress per-ref; Dependabot `open-pull-requests-limit: 5` | PROOF-12 (CI green); TM-CI-02 fork-safety |
| `push: [main]` trigger | maintainer with push | as above; cosign + Tier-B attest run here (same-repo guaranteed) | as above | cosign bundle; GitHub attestation (Tier B); report artifact | n/a | as above | PROOF-11; PROOF-04 |
| `schedule` (weekly) | none (cron) | `contents: read` only; no `id-token`/`attestations` needed | n/a | full-history gitleaks report; report artifact | n/a | 1×/week | ADV-04 |
| `GITHUB_TOKEN` (CI) | the workflow itself | least-privilege per-step `permissions:`; never `write-all` | n/a | none (used for attest/comment) | n/a | GitHub-managed | TM-CI-02; pinning test (PROOF-09) |
| `id-token: write` (cosign step) | the workflow (cosign) | gated `if: github.event_name=='push' && same-repo` — fork PRs CANNOT reach it (TM-CI-02) | cosign validates SBOM input | signed Sigstore bundle + Rekor entry | n/a | n/a | PROOF-04 |
| Go-binary install step (gitleaks/Syft/cosign/osv) | the workflow | checksum/SHA pin at download; `tool-manifest.json` asserted (PROOF-10) | checksum verify on download | installed binary | n/a | n/a | PROOF-10 (RISK-CI-17) |
| gitleaks report artifact | CI uploader → artifact store | `actions/upload-artifact`; retention 1 day; gitleaks `--redact` | gitleaks redacts by default | redacted findings JSON | n/a | short retention | PROOF-03 (redaction ADV-17) |
| SBOM artifact (sbom.cdx.json) | Syft → artifact store + release tag | public dep names only (no secrets) | Syft output validated (PROOF-04) | CycloneDX JSON | n/a | 90-day CI / indefinite release | PROOF-04 |
| cosign Sigstore bundle | cosign → release artifact | keyless (Rekor); verifiable via `cosign verify-blob` | cosign output | `.sig` + bundle | n/a | release-tagged | PROOF-04 |
| `.security-gate-report.json` (local) | gate run → gitignored file | local-only; never committed | aggregator schema v1 | report JSON | gitignored | overwritten each run | PROOF-01 |
| `workflow_dispatch` (if added) | maintainer (manual) | `contents: read` | none | report artifact | n/a | manual | (optional) |

**DTO minimization note:** the report artifact contains gate names, counts, and file paths only — no secrets (gitleaks redacts), no PII, no user data. The dep-diff PR comment contains advisory IDs + dep names (public). This satisfies the Improve-Plan-Prompt's "Missing DTO minimization or abuse/rate-limit coverage ... caps security/privacy readiness below 80" gate: both are covered.

## §2. Threats the gates mitigate (the value)

| Threat | Gate | How |
|---|---|---|
| Known-vulnerable dependency merged | SEC-CI-02 (`bun audit`) | high/critical → FAIL |
| New vuln introduced via PR | SEC-CI-08 (osv-scanner Tier A / dependency-review Tier B) | osv PR-diff comment + advisory check; `fail-on-severity` when Code Security enabled |
| Hardcoded secret committed | SEC-CI-03 (gitleaks) | finding → FAIL |
| Supply-chain build not attributable | SEC-CI-04 (SBOM Tier A + cosign provenance Tier A / GitHub attestation Tier B) | Syft SBOM + cosign signed bundle binds artifact → build (OSS path); GitHub attestation when GHEC |
| Security-critical code untested | SEC-CI-05 (coverage) | threshold on `src/**` ratchets up |
| Route authz silently regressed | SEC-CI-06 (smoke) | auth-required route returning 200 → FAIL |
| Stale vulnerable dep lingers | Dependabot (restored) | weekly update PRs |
| Unpinned action tampering | ARCH-CI-01 (SHA pin) | all `uses:` pinned to SHA |
| Broad token permissions | ARCH-CI-01 (`permissions:`) | top-level `contents: read` |

## §3. Threats TO the gates (the meta-threat surface)

| ID | Threat | Vector | Impact | Mitigation |
|---|---|---|---|---|
| TM-CI-01 | **Secret in gitleaks report leaks** | gitleaks report uploaded as artifact un-redacted | secret exposure in CI logs/artifacts | gitleaks redacts by default; report ephemeral + short retention; AC-03e verifies redaction; never commit report |
| TM-CI-02 | **`pull_request_target` misuse** | fork PR triggers workflow with secrets access | secret exfiltration | workflows use `pull_request` (not `_target`) for security gates; no secrets exposed to fork-originated runs; attest step gated to `if: github.event_name == 'push'` |
| TM-CI-03 | **Action supply-chain (unpinned/compromised)** | a `uses:` tag force-pushed | malicious CI | all actions SHA-pinned (existing pattern; `19` §13); Dependabot keeps `github-actions` ecosystem pins fresh |
| TM-CI-04 | **gitleaks/Syft binary compromise** | downloaded binary tampered | malicious tool runs in CI | pin to release SHA/checksum; prefer GitHub-released binaries with verified provenance; document verification in `13` |
| TM-CI-05 | **False-negative (gate passes a real vuln)** | threshold too lenient / allowlist too broad | false security confidence | thresholds documented + ratcheted; allowlist reviewed per change; `bun audit` + optional osv double-coverage |
| TM-CI-06 | **False-positive velocity drag → devs bypass** | gate too noisy | gates get disabled/bypassed | advisory→blocking ratchet; allowlist; `--skip-<gate>` with audit log |
| TM-CI-07 | **Smoke gate false confidence** | route returns 200 but is broken | "green build, broken app" | smoke is *additive* to Playwright E2E, not a replacement; smoke checks status + minimal shape, not full behavior |
| TM-CI-08 | **Coverage gaming** | trivial tests raise % | false coverage confidence | threshold is a floor + ratchet, not a target; review-time judgment still required; documented as "floor not ceiling" |
| TM-CI-09 | **Provenance without verification** | cosign bundle / GitHub attestation generated but never verified at deploy | provenance theater | `13` runbook includes `cosign verify-blob` (Tier A) + `gh attestation verify` (Tier B, when GHEC) before production deploy |
| TM-CI-10 | **Tier-B gates assumed present** | reader assumes CodeQL/secret-scan/GHEC-attestation/Code-Security-dep-review are running | false security confidence | `security:gate` report explicitly lists Tier-B gates as SKIP with reason; launch gate DOM-55 requires the report, not an assumption |
| TM-CI-11 (R3) | **OSS provenance (cosign) trusted blindly** | cosign keyless Rekor outage / identity mis-binding | false provenance confidence | cosign path is advisory-ratcheted (RISK-CI-16); Rekor is a public good with high availability; document the residual |

## §4. Credential-material taxonomy — N/A (restated)

This pack creates **no credentials**. It scans for leaked ones and signs build artifacts. No raw tokens, hashes, session cookies, share URLs, or API keys are introduced. The `GITHUB_TOKEN` used for attestation is Actions-injected and ephemeral. Confirmed in `04` credential-taxonomy section.

## §5. Privacy

- **No user data processed** by the gates. SBOM = dependency names/versions (public). Reports = gate names/counts/paths. No PII.
- **No data egress to third parties** in Tier A (§`07` §2). gitleaks/Syft run offline.
- **Audit logging:** gate runs are logged in CI (GitHub Actions logs) and optionally locally. No sensitive content logged (gitleaks redacts).

## §6. Abuse scenarios

| Scenario | Defense |
|---|---|
| Attacker opens PR to exfiltrate CI secrets | `pull_request` trigger (not `_target`); no secrets in fork runs; `permissions:` least-privilege |
| Attacker floods Dependabot PRs to overwhelm | `open-pull-requests-limit: 5` (existing config) |
| Attacker adds a route to the smoke manifest to probe | manifest is in-repo, code-reviewed; PR-required |
| Attacker lowers coverage threshold in a PR | threshold ratchet is monotonic; review gate |

## §7. CSP / headers — N/A

The gates produce no web content. The app's CSP is owned by `2026-07-07-global-nonced-csp-enforcement`. The smoke gate *verifies* routes respond, but does not assert CSP headers (that's the CSP pack's E2E concern).

## §8. Rate-limit / body-size — N/A for the gates

Application rate limits and body-size limits are owned by the invite/share/public-share/owasp sibling packs. The smoke gate does not test rate limits (it would need load, which is a separate perf-evaluator concern).

## §9. Residual risk

- **Tier-B gates not present** until GHAS/Pro → SAST and native secret scanning are absent. Mitigated by gitleaks (pattern secret scan) + `bun audit` (dep vuln), but these are **not equivalents** of CodeQL (semantic SAST) or verified secret scanning. The launch gate must treat "security automation PASS" as "Tier-A clean", not "fully scanned". This is documented in `13` §4 and is the single most important residual.
- **Coverage floor ≠ security coverage.** A high % doesn't mean security paths are tested. The security-themed tests (`03` §4.2) are the real security-behavior floor; coverage is a regression floor only.

# 14 — Risk Register

| ID | Description | Trigger | Probability | Impact | Severity | Affected | Detection | Prevention | Mitigation | Contingency | Owner | Residual | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| RISK-CI-01 | `bun audit` JSON schema drift across bun versions | bun upgrade | Medium | Medium | Medium | audit gate | gate parse-FAIL | pin bun in CI; pin audit-parser to tested schema | parse-fail = FAIL-with-hint, not silent pass | manual `bun audit` until fixed | owner | low | specified |
| RISK-CI-02 | gitleaks false-positive storm blocks velocity | noisy patterns | Medium | High | **High** | secrets gate; dev velocity | ADVISORY count spike | tight allowlist; diff-mode on PR | advisory ratchet; `--skip-secrets` local | broaden allowlist (reviewed) | owner | medium | specified |
| RISK-CI-03 | Aggregator complexity / ordering bugs | gate interactions | Low | Medium | Medium | security:gate | unit tests; manual run | uniform GateResult contract; per-gate isolation | red test → fix | reorder gates | impl | low | specified |
| RISK-CI-04 | gitleaks allowlist too broad → false negatives | misconfigured allowlist | Medium | **High** | **High** | secrets gate | security review; periodic audit | review-required on allowlist PRs; pattern-based not blanket | periodic gitleaks full-scan with tightened allowlist | remove over-broad rule | owner | medium | specified |
| RISK-CI-05 | Syft mis-parses Bun lockfile → incomplete SBOM | Bun lockfile format | Medium | Medium | Medium | sbom gate | dep-count delta vs `bun pm ls` | cross-check (WP-1.3); warn >20% delta | flag incomplete SBOM as ADVISORY | use `cdxgen` fallback | impl | medium | specified |
| RISK-CI-06 | Smoke gate port/boot flakiness in CI | CI environment | Medium | Medium | Medium | smoke gate | intermittent FAIL | dynamic port; retry-on-boot; teardown-on-exit | retry once; then FAIL with log | `--skip-smoke` (not on PR-to-main) | impl | medium | specified |
| RISK-CI-07 | CI minute overage on free tier | high PR cadence | Low | Medium | Medium | CI budget | Actions billing alert | cost levers (`09` §1); matrix/share install | apply levers | upgrade to Pro (owner) | owner | low | specified |
| RISK-CI-08 | Tier-B (CodeQL/secret-scan) never approved → residual SAST gap | owner declines GHAS | High | High | **High** | overall security posture | launch-gate DOM-55 reflects SKIP | gitleaks + bun-audit as partial substitutes (Tier A) | document residual explicitly | accept residual w/ owner signoff OR go public (free GHAS) | owner | **high** | specified — **this is the single biggest residual risk** |
| RISK-CI-09 | Branch protection never enabled → gates can't enforce merge | owner declines Pro | Medium | Medium | Medium | merge policy | red PR still merges | gates block *release* regardless | launch-gate reads verdict even without enforcement | accept pre-launch; enable at beta | owner | medium | specified |
| RISK-CI-10 | Coverage gaming (trivial tests inflate %) | threshold pressure | Medium | Low | Low | coverage gate | review | "floor not ceiling" doc; review-time judgment | ratchet is monotonic but reviewable | spot-review uncovered critical paths | impl | low | specified |
| RISK-CI-11 | Attestation generated but never verified → provenance theater | runbook not followed | Medium | Medium | Medium | provenance | deploy runbook audit | `13` §3 verification step documented | CI step verifies on release | make verify a release-script step | owner | medium | specified |
| RISK-CI-12 | `pull_request_target` misuse leaks secrets | workflow bug | Low | **Critical** | **High** | CI secrets | TM-CI-02 adversarial test | use `pull_request` not `_target`; fork-PR gating (WP-2.2) | none — prevention is the control | audit workflow YAML | impl | low | specified |
| RISK-CI-13 | Workflow action supply-chain compromise | upstream tag force-push | Low | **Critical** | **High** | CI integrity | pinning test | SHA-pin all actions; Dependabot github-actions updates | none — pinning is the control | rotate tokens if breach | impl | low | specified |
| RISK-CI-14 | New devDeps (Syft/coverage-v8) introduce vuln | supply chain | Low | Medium | Medium | devDeps | bun audit covers devDeps too | bun audit gate catches it | override/patch | — | impl | low | specified |
| RISK-CI-15 | Smoke route manifest goes stale (new route not covered) | route added without manifest update | High | Low | Medium | smoke coverage | manifest-review checklist in `13` | PR-template reminder | periodic audit of `src/app/**` routes vs manifest | — | owner | medium | specified |
| RISK-CI-16 (R3) | cosign keyless (Rekor) flakiness/outage | Rekor unavailable during CI | Low | Low | Low | OSS provenance (SEC-CI-04c) | SKIP + residual | advisory-ratcheted; cosign not hard-blocking | retry; accept ADVISORY | impl | low | specified |
| RISK-CI-17 (R4) | Go-binary tools (gitleaks/Syft/cosign/osv) outside `bun audit` scope → undetected supply-chain compromise in those binaries | upstream binary tampering | Low | **High** | **High** | gate supply chain | checksum/SHA pin at install + tool-manifest.test.ts + periodic review | tool-manifest assertion + Dependabot github-actions for action-wrapped installs | rotate + repin | impl | medium | specified |
| RISK-CI-18 (R4) | `bun audit` may not honor `overrides` on the text `bun.lock` (lockfileVersion 1) | bun version drift | Medium | **High** | **High** | audit gate correctness (false-PASS) | WP-1.1 override-verification step | plant-and-verify before relying on it; fall back to osv-scanner as authoritative | osv as primary dep gate | impl | medium | specified — **load-bearing for AC-02d** |
| RISK-CI-19 (R4) | Launch-gate artifact contract is one-sided — no consumer-side reader exists | launch-gate Phase 6 deferred / DOM-55 not wired | High | Medium | Medium | launch-gate integration | WP-6 downgraded to blocked-on-sibling; contract labeled PROPOSED | `security:gate` verdict is advisory until reader + branch-protection land | owner ratifies contract at launch-gate Phase 6 | owner | medium | specified |
| RISK-CI-15b (R4) | Smoke gate dev-server lifecycle flake (port, boot-timeout, child-kill) | CI environment / concurrent runs | Medium | Medium | Medium | smoke gate | WP-1.5 lifecycle spec (port range, retries, boot-poll, SIGTERM kill) | bounded retries; FAIL with boot log | `--skip-smoke` (not on PR-to-main) | impl | medium | specified |

## Severity legend
- **Critical/High** (RISK-CI-08, 12, 13): security-integrity risks → prevention controls are load-bearing.
- **Medium**: velocity/reliability risks → mitigations + ratchets.
- **Low**: quality/maintenance → review-time controls.

## Top 3 risks to watch
1. **RISK-CI-08** (Tier-B SAST gap) — the single biggest residual; only owner-decision can close.
2. **RISK-CI-02/04** (gitleaks false-pos/neg) — the allowlist is the highest-maintenance, highest-risk config.
3. **RISK-CI-12/13** (CI secret-leak / supply-chain) — prevention (fork-gating, SHA-pinning) is non-negotiable.

## Unmitigated critical risks
**None internally-resolvable.** RISK-CI-08 is external (owner GHAS decision); all others have prevention + mitigation + contingency. This supports the `CONDITIONALLY READY` verdict (`17`).

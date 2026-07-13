# 01 — Executive Summary

## One-line

Design a **two-tier, GitHub-Free-friendly security CI + release gate** that re-enables automation around the existing `validate`/`build`/E2E CI, adds free dependency/secret/SBOM/coverage/smoke gates, marks CodeQL/native-secret-scan/branch-enforcement as owner-decision paid gates, and feeds a single `bun run security:gate` verdict into the `launch-readiness-evidence-gate` GO/NO-GO.

## The situation (evidence)

1. **CI is off.** `.github/workflows/` is empty; the 4 workflows (CI, CodeQL, Dependabot, React Doctor) were archived to `.github/workflows-disabled/` on 2026-07-07 to stop failing-CI noise during fast iteration (`current-state.md` lines 85-92).
2. **Hosted security controls are unavailable, not clean.** Code scanning 403, Dependabot alerts 403 (extra scope requested), secret scanning 404 (`current-state.md` lines 40-42; `2026-07-07-github-security-pr-comment-loop` ledger).
3. **The repo is private on GitHub Free.** This is the load-bearing constraint. Research (`19`, R3-corrected):
   - **Free on private-Free:** Dependabot (alerts/sec-updates/version-updates), gitleaks, osv-scanner, Vitest coverage thresholds, **Syft SBOM generation**, **cosign OSS provenance (Sigstore/Rekor)**, `bun audit`, the dependency **graph**.
   - **Paid (GitHub Code Security, $30/committer/mo) on private:** CodeQL code scanning, **dependency-review action**, OpenSSF Scorecards. (Post-Apr-2025 GHAS split.)
   - **Paid (GitHub Secret Protection, $19/committer/mo) on private:** native secret scanning + push protection.
   - **Paid (GitHub Enterprise Cloud) on private:** Artifact Attestations (`actions/attest-*`) — **not free on private-Free** (R3 correction; the R2 draft erred here).
   - **Paid (GitHub Pro $4/mo) on private:** branch protection / rulesets — i.e. the ability to *enforce* "checks must pass to merge".
4. **No consolidated gate.** There is no `SECURITY.md`, no SBOM, no provenance, no coverage threshold, no secret-scanning config, and no single release verdict command.
5. **Integration target exists.** `2026-07-07-launch-readiness-evidence-gate` designs a unified `bun run launch:gate` but leaves CI re-enablement + merge-gate strictness as owner-gated `OPEN-LG-05` and hosted-security as `OPEN-LG-06`. **This pack is the implementation path for those two open decisions** for the CI/security-automation slice.

## The design (DEC-CI-01..09, see `15`)

- **Tier A — Free, implement now.** Restore `ci.yml`; add a new `security-gates.yml` running: `bun audit` (advisory→blocking), `gitleaks` secret scan, **Syft SBOM + cosign OSS provenance** (Sigstore/Rekor — the free path; GitHub attestation is Tier B), osv-scanner PR dep-diff (Tier-A substitute for dependency-review), Vitest coverage threshold (low, ratcheted, 40%-floor-guarded), and a DAST-like route smoke. One local command: `bun run security:gate`.
- **Tier B — Owner-decision paid.** CodeQL (Code Security), dependency-review action (Code Security), GitHub native secret scanning + push protection (Secret Protection), OpenSSF Scorecards (Code Security), GitHub Artifact Attestations (GHEC), branch-protection/ruleset enforcement (GitHub Pro). Each is marked `OPEN-CI-*` with the feature it unblocks and the cost; the pack is valuable without any of them.
- **R3-corrected:** the original draft misclassified two features as Tier-A free — `actions/attest-*` (actually GHEC-gated on private) and `dependency-review-action` (actually Code-Security-gated on private). An adversarial reviewer caught both; the pack now ships free OSS substitutes (cosign, osv-scanner) and isolates the paid features as Tier B.
- **R4-corrected (Improve-Plan pass):** a second adversarial pass caught that the R3 "470 vitest files" recount had dropped all `.test.tsx` (actual: 650), that `--gitleaks-diff` is not a real gitleaks flag (use `--log-opts`), and that osv-scanner/Syft/cosign/gitleaks are Go binaries (not `bunx`-invokable devDeps) and osv-scanner can't parse `bun.lock`. It also required the mandated traceability + proof-contract schemas. All fixed; cost model recomputed (~1,286 min/mo, ~36% headroom); verification honestly `emulated` (authoring + revision same session; two independent adversarial passes raise content confidence but do not lift the 97 cap). See `19` §3 R4.
- **Merge vs release policy.** A clear table (`13` §2): Tier-A gates block merge (when enforcement is available) **or** block release (when it isn't); Tier-B gates are required for production rollout but not for the free pre-launch slice. Escape hatches (`--skip-<gate>` flags, `SECURITY_*_STRICT` env advisory→blocking) are documented per gate.
- **Proportional to `VALIDATION_MATRIX.md`.** Pre-launch closed-beta stage = fast iteration; gates are advisory-ratcheted (blocking after a stated window), not hard-stops on day one. Matches the existing `PERF_BUDGET_STRICT` pattern.

## What changes when implemented (not in this planning task)

- New: `.github/workflows/ci.yml` (restored + security steps), `.github/workflows/security-gates.yml`, `.github/dependabot.yml` (restored), `SECURITY.md`, `scripts/security-gate/` (the aggregator), `vitest.config.ts` coverage block, `.github/gitleaks-config.toml`, SBOM output path.
- Modified: `package.json` (`security:gate`, `security:audit`, `security:secrets`, `security:sbom`, `security:smoke` scripts), `vitest.config.ts` (coverage), possibly `tsconfig` excludes.
- Not touched: `src/`, `migrations/`, `wrangler.jsonc`, `cloudflare-env.d.ts`, any Cloudflare resource, any sibling security surface.

## Status

**`CONDITIONALLY READY`** — the **Tier-A free slice is `IMPLEMENTATION-READY`** (exact paths, commands, thresholds; R3-corrected so it contains no paid features). Overall `CONDITIONALLY READY` because: (a) `verification_mode: emulated` authoring caps readiness at 97 for high-blast-radius planning (R3 adversarial was independent but authoring-adjacent); (b) Tier-B features (Code Security, Secret Protection, GHEC, GitHub Pro) + live hosted controls are genuinely external owner-decisions; (c) SBOM/provenance/coverage/osv/cosign tooling are new devDeps/binaries — flagged for owner sign-off (`OPEN-CI-05`) per the "no new dependencies unless justified" constraint; (d) two measured baselines (CI cost, coverage) are DISCOVERY-REQUIRED.

## Headline scores (see `17`, R4-revised)

| Category | Score |
|---|---|
| Product strategy | 95 |
| Scope clarity | 95 |
| Requirements completeness | 94 |
| Architecture readiness | 94 |
| Security & privacy readiness | 92 (R4: Tier-B SAST residual RISK-CI-08; Go-binary supply chain RISK-CI-17; audit-override unverified RISK-CI-18) |
| Performance & scalability | 92 (R4: cost recounted 650 files / ~1,286 min; per-run estimates unmeasured) |
| Testing & validation | 93 (R4: mandated proof-contract schema; tool-manifest PROOF-10) |
| Rollout & rollback | 91 (capped: merge-enforcement Tier B + launch-gate reader absent RISK-CI-19) |
| Requirements traceability | 94 (R4: mandated 11-col schema + source-strength) |
| **Overall implementation readiness** | **93** |

Below the 95 PASS bar → `CONDITIONALLY READY`, not PASS. After R4, the deficits are external owner-decisions, load-bearing-unverified technical claims (AC-02d), or external proof (see `17` §deficiency table). Per-doc scorecard in `17`.

## Major decisions (see `15`)

- **DEC-CI-01**: Two-tier free/paid model (don't silently assume GitHub-native === free).
- **DEC-CI-02**: `gitleaks` for secret scanning (free, fills the Secret Protection gap).
- **DEC-CI-03**: `bun audit` primary + `osv-scanner` (existing-dep + PR-dep-diff; both free).
- **DEC-CI-04**: Vitest `@vitest/coverage-v8` in-repo thresholds, no Codecov/Coveralls.
- **DEC-CI-05 (R3)**: Syft SBOM (Tier A) + **cosign OSS provenance (Tier A, Sigstore/Rekor)** + GitHub attestation (Tier B, GHEC). *Corrected: attestations are not free on private-Free.*
- **DEC-CI-06**: DAST-like = route smoke, not OWASP ZAP.
- **DEC-CI-07**: Advisory→blocking ratchet (mirror `PERF_BUDGET_STRICT`).
- **DEC-CI-08**: CodeQL restore path documented; execution needs Code Security → `OPEN-CI-01`.
- **DEC-CI-09 (R3)**: dependency-review reclassified Tier B (Code Security); osv-scanner Tier-A substitute. *Corrected: was a phantom free gate.*

## Open owner-decisions (see `15`)

| ID | Decision | Cost | Unblocks |
|---|---|---|---|
| OPEN-CI-01 | Enable GitHub Code Security for CodeQL SAST | $30/committer/mo | Tier-B SAST |
| OPEN-CI-02 | Enable GitHub Secret Protection (secret scan + push protection) | $19/committer/mo | native secret scan |
| OPEN-CI-03 | OpenSSF Scorecards | (Code Security) | posture score |
| OPEN-CI-04 | GitHub Pro for branch protection/rulesets | $4/mo | merge-gate enforcement |
| OPEN-CI-05 | Approve Syft/coverage-v8/osv-scanner/cosign devDeps+binaries | $0 | Tier-A SBOM+coverage+dep-diff+provenance |
| OPEN-CI-06 | GitHub Enterprise Cloud for Artifact Attestations | $$$ | Tier-B GitHub attestation (cosign is Tier-A substitute) |
| OPEN-CI-08 (inherits OPEN-LG-05) | Re-enable CI + merge-gate strictness | owner | launch gate Phase 6 |
| OPEN-CI-09 | Code Security for dependency-review action | $30/committer/mo | Tier-B dependency-review (osv is Tier-A substitute) |
| OPEN-CI-10 | Coverage floor decision (if baseline <40%) | $0 | SEC-CI-05 strict promotion |
| (inherits OPEN-LG-06) | Resolve GitHub hosted sec 403/404 | owner/GitHub admin | launch gate DOM-55 |

## Confirmation

No application code, tests, migrations, schemas, infra, or config were modified. All writes are confined to `.ai/03_plans/2026-07-07-security-ci-release-gates/`. No Git state changed.

# 15 — Decisions, Assumptions, and Alternatives

## Decisions (ADR-style, DEC-CI-*)

### DEC-CI-01 — Two-tier free/paid gate model
- **Problem:** the brief says "prefer GitHub-native" but the repo is private on GitHub Free, where CodeQL/secret-scan/Scorecards/branch-enforcement are **not free** (`19`).
- **Constraints:** $0 baseline; no silent paid assumption; proportional to pre-launch velocity.
- **Options:** (A) assume GitHub-native === free → wrong; (B) design free-first Tier A + owner-decision Tier B; (C) recommend buying GHAS upfront.
- **Chosen:** **B**. Tier A is fully free and implementation-ready; Tier B is isolated, cost-labeled, owner-gated.
- **Rejected:** (A) factually wrong on private-Free; (C) violates "no paid unless owner-decision" and pre-launch cost posture.
- **Consequences:** Tier-A gates ship value immediately; Tier-B residual (RISK-CI-08) is explicit, not hidden.
- **Conditions to revisit:** repo goes public (most Tier-B becomes free) OR owner buys GHAS/Pro.

### DEC-CI-02 — gitleaks for secret scanning
- **Problem:** GitHub native secret scanning needs GHAS on private (`19` §3).
- **Options:** gitleaks (OSS, pattern); TruffleHog (OSS, verified); GitHub native (GHAS); GitGuardian (paid).
- **Chosen:** **gitleaks** — free, fast (offline pattern), CI-friendly, fills the GHAS gap.
- **Rejected:** TruffleHog (secret-verification = network egress, slower, overkill for CI pattern-scan); native (GHAS); GitGuardian (paid).
- **Tradeoff:** gitleaks has higher false-positive rate than verified scanners → managed via allowlist + advisory ratchet (RISK-CI-02/04).

### DEC-CI-03 — `bun audit` primary, osv-scanner optional
- **Problem:** dep-vuln scanning needed; free.
- **Options:** `bun audit` (built-in); osv-scanner (OSS, multi-DB); Snyk (freemium); `npm audit`.
- **Chosen:** **`bun audit` primary** (zero new dep, built-in, honors `overrides`). **osv-scanner optional second opinion** (additive, free, broader DB).
- **Rejected:** Snyk (free tier exhausts on private under CI); `npm audit` (wrong package manager).
- **Tradeoff:** bun-audit DB is npm-advisory only → osv-scanner adds OSV.dev breadth if desired.

### DEC-CI-04 — Vitest in-repo coverage thresholds (no Codecov)
- **Problem:** coverage threshold needed; free; single maintainer.
- **Options:** Vitest `thresholds` (in-repo); Codecov (SaaS); Coveralls (SaaS).
- **Chosen:** **Vitest in-repo** — zero external dep, no token, fails the build directly.
- **Rejected:** Codecov/Coveralls — add a SaaS dependency + token for value (trend UI, PR annotations) that a single-maintainer pre-launch repo doesn't need (`19` §11).
- **Tradeoff:** no coverage trend UI — acceptable pre-launch.

### DEC-CI-05 — Syft SBOM (Tier A) + OSS cosign provenance (Tier A) + GitHub attestation (Tier B)
- **Problem:** SBOM + provenance needed; must be free for the Tier-A slice.
- **R3 correction:** the original draft misclassified `actions/attest-build-provenance` as free on private-Free. It is **not** — it requires **GitHub Enterprise Cloud** on a private repo (`19` §1, reverified against `docs.github.com` + `github.com/security/plans`). Free/Pro/Team get attestations only for **public** repos.
- **Chosen (split):**
  - **SEC-CI-04a SBOM generation (Tier A, free):** Syft (handles Bun lockfile + node_modules; CycloneDX).
  - **SEC-CI-04c OSS provenance (Tier A, free):** `cosign sign-blob` keyless (Sigstore/Rekor) over the SBOM + a minimal in-toto build statement. Free; no GitHub attestation store.
  - **SEC-CI-04b GitHub attestation (Tier B, GHEC):** `actions/attest-build-provenance`/`attest-sbom` only when `OPEN-CI-06` (GHEC or repo public). Until then SKIP-with-reason.
- **Rejected:** `npm sbom` (assumes npm); cdxgen (viable alt; Syft more documented); relying solely on GitHub attestation (paid on private).
- **Tradeoff:** OSS cosign path is slightly more manual than GitHub attestation but free and portable; cosign keyless can be flaky (RISK-CI-16) → advisory-ratcheted.

### DEC-CI-09 — dependency-review reclassification (Tier B) + osv-scanner Tier-A substitute
- **Problem:** PR-time dep-diff gate wanted; `actions/dependency-review-action` is **not free on private-Free** — it requires **GitHub Code Security** ($30/active-committer/mo, on Team or GHEC; post-April-2025 GHAS split, `19` §1).
- **R3 correction:** the original draft listed the action as Tier-A free (a phantom gate row in `13` §2). Reverifier confirmed: the **dependency graph** is free on private, but **dependency review** (action + PR enforcement) is gated.
- **Chosen:** **Tier-A osv-scanner substitute** (free OSS, posts PR comment + advisory check) now; **Tier-B `dependency-review-action`** when `OPEN-CI-09` (Code Security) closed.
- **Rejected:** assuming the action is free (factual error); skipping PR-time dep gating entirely (loses the new-dep control).
- **Terminology note (2025/2026):** "GitHub Advanced Security (GHAS)" was split (Apr 1, 2025) into **GitHub Code Security** ($30/committer/mo) and **GitHub Secret Protection** ($19/committer/mo). Code scanning/CodeQL + dependency review → Code Security; secret scanning + push protection → Secret Protection. Both now purchasable on Team (previously Enterprise-only). This pack uses the post-split terminology in `OPEN-CI-*`.

### DEC-CI-06 — DAST = route smoke, not OWASP ZAP
- **Problem:** "DAST-like smoke" in brief.
- **Options:** route smoke (curl/fetch); OWASP ZAP; full Playwright (already exists for E2E).
- **Chosen:** **route smoke** — boots `bun run dev`, probes a curated manifest, asserts status + shape. Catches "won't boot" + auth-regression (route returning 200 when it should 401).
- **Rejected:** ZAP (overkill pre-launch, heavy CI); relying only on Playwright (slower; smoke is the always-on fast gate, Playwright is the deep gate).
- **Tradeoff:** smoke ≠ full DAST — documented as additive, not replacement (TM-CI-07).

### DEC-CI-07 — Advisory→blocking ratchet (mirror `PERF_BUDGET_STRICT`)
- **Problem:** new gates could block velocity on day one (violates `VALIDATION_MATRIX.md`).
- **Chosen:** every gate honors a `SECURITY_*_STRICT` env (advisory default, blocking when set), mirroring the existing `PERF_BUDGET_STRICT` precedent.
- **Rejected:** hard-block from day one (velocity); advisory-only forever (no teeth).
- **Tradeoff:** 1–2 week advisory windows before promotion.

### DEC-CI-08 — CodeQL: documented restore path, not enabled
- **Problem:** CodeQL config exists (`workflows-disabled/codeql.yml` + `.github/codeql/`) but needs GHAS on private.
- **Chosen:** document the exact restore (WP-2.3: move file, rescope paths to drop `supabase`, re-verify SHA); mark Tier-B `OPEN-CI-01`; SKIP-with-reason in `security:gate` until GHAS.
- **Rejected:** enable now (would fail/no-op without GHAS); delete config (loses the curated query-pack selection).

## Open decisions (owner)

| ID | Decision | Options | Recommendation | Owner | Cost | Unblocks | Impact if declined |
|---|---|---|---|---|---|---|---|
| OPEN-CI-01 | Enable GitHub Code Security for CodeQL SAST | buy Code Security; make repo public; defer | defer pre-launch, enable at beta | owner | $30/committer/mo | Tier-B SAST (SEC-CI-07) | RISK-CI-08 residual; gitleaks+audit partial substitutes |
| OPEN-CI-02 | Enable GitHub Secret Protection (native secret scanning + push protection) | Secret Protection; public; gitleaks-only | gitleaks-only (Tier A), revisit at beta | owner | $19/committer/mo | native secret-scan | gitleaks remains the secret scanner |
| OPEN-CI-03 | OpenSSF Scorecards | Code Security; skip | skip pre-launch | owner | (Code Security) | posture score | no Scorecard posture signal |
| OPEN-CI-04 | GitHub Pro for branch protection/rulesets | Pro ($4/mo); defer | defer; enable when external contributors arrive | owner | $4/mo | merge-enforcement (Stage 4) | gates can't *force* merge-block; they still block *release* |
| OPEN-CI-05 | Approve `@vitest/coverage-v8` devDep + 4 CI-installed Go binaries (gitleaks, Syft, cosign, osv-scanner) | approve; defer; alternatives | approve (R4: coverage-v8 is a devDep; the 4 Go tools are CI-installed binaries, NOT npm packages — not `bunx`-invokable, not in `bun.lock`, not covered by `bun audit`) | owner | $0 | Tier-A SBOM + coverage + dep-diff + provenance + secret-scan | those gates defer |
| OPEN-CI-11 (R4) | Confirm `feat/**`→`[main]` ci.yml trigger narrowing (behavior change to existing CI) | keep narrowed; restore `feat/**` | narrowed (matches cost model); owner-ack required (AGENTS.md branch-hazard) | owner | $0 | cost predictability | if owner used `feat/**` CI, it silently drops |
| OPEN-CI-06 | Enable GitHub Enterprise Cloud for Artifact Attestations | GHEC; make repo public; OSS cosign path | OSS cosign path (Tier A); GHEC at enterprise stage | owner | $$$ (GHEC) | Tier-B GitHub attestation (SEC-CI-04b) | cosign OSS provenance remains the control (SEC-CI-04c) |
| OPEN-CI-07 (inherits OPEN-LG-05) | Re-enable CI | yes (this pack's premise); defer | yes | owner | $0 | launch gate Phase 6 | launch gate stays NO-GO on CI slice |
| OPEN-CI-08 (inherits OPEN-LG-06) | Resolve hosted GitHub sec 403/404 | GitHub admin fix; Tier-A substitutes | Tier-A substitutes now; hosted fix when available | owner/GitHub admin | $0/$$ | hosted-control slice | hosted controls remain unavailable (not clean) |
| OPEN-CI-09 | Enable GitHub Code Security for dependency-review action | Code Security; osv-scanner substitute; public | osv-scanner substitute (Tier A); Code Security at beta | owner | $30/committer/mo | Tier-B dependency-review (SEC-CI-08) | osv-scanner remains the PR dep-diff gate |
| OPEN-CI-10 | Coverage floor decision (if baseline < 40%) | invest in tests; accept low floor; defer gate | invest in tests before enabling strict | owner | $0 | SEC-CI-05 strict promotion | coverage stays ADVISORY at low baseline |

## Assumptions (ASSUMP-CI-*, validated in `03`/`19`)

| ID | Assumption | Validated? | If wrong |
|---|---|---|---|
| ASSUMP-CI-01 | repo stays private on GitHub Free pre-launch | yes (`current-state.md`) | Tier-B becomes free/cheap → simplify |
| ASSUMP-CI-02 | Bun 1.3.14 + `bun.lock` authoritative | yes (`package.json`) | audit/SBOM scripts adapt |
| ASSUMP-CI-03 | archived `ci.yml` is the restore baseline | yes (`03` §1.2) | baseline differs → WP-0 adjusts |
| ASSUMP-CI-04 | owner accepts `PERF_BUDGET_STRICT` ratchet pattern | yes (existing precedent) | gates hard-block → velocity conflict |
| ASSUMP-CI-05 | ~~GitHub Artifact Attestations stay free~~ **CORRECTED (R3): attestations are NOT free on private-Free; require GHEC.** OSS cosign path (SEC-CI-04c) is the free Tier-A substitute. | reverified 2026-07-08 against `docs.github.com` + `github.com/security/plans` | provenance: cosign Tier A, GitHub attestation Tier B (`OPEN-CI-06`) |
| ASSUMP-CI-06 | 2,000 free CI min/mo sufficient for Tier A | yes (R4-recounted estimate `09` §1: ~1,286, ~36% headroom) | apply cost levers or upgrade |
| ASSUMP-CI-07 | gitleaks/Syft run reliably in CI ubuntu-24.04 | research-likely (`19`); confirm at WP-1 | fallback tools (cdxgen) |

## Alternatives considered but rejected (consolidated)

| Area | Chosen | Rejected | Why |
|---|---|---|---|
| Overall model | Tier A/B | assume-free; buy-everything | factual/cost |
| Secret scan | gitleaks | TruffleHog, native, GitGuardian | speed/free/paid |
| Dep-vuln (existing) | bun audit (+optional osv) | Snyk, npm audit | free/wrong-PM |
| Dep-vuln (PR new-deps) | osv-scanner substitute (Tier A) + dependency-review (Tier B) | dependency-review only | action is paid on private (R3) |
| Coverage | Vitest in-repo | Codecov, Coveralls | no-external-dep |
| SBOM | Syft (Tier A) | npm sbom, cdxgen | Bun-lockfile support |
| Provenance | cosign OSS (Tier A) + GitHub attestation (Tier B GHEC) | GitHub attestation only | paid on private (R3) |
| DAST | route smoke | ZAP | overkill |
| Aggregation | dedicated security:gate | fold into cf:release-gates | separation of concerns |
| Gate wiring | separate security-gates.yml | fold into ci.yml | triggers/permissions differ |
| Enforcement | conditional (Tier B) | hard-enforce day one | velocity |

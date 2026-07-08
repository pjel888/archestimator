# 04 — Requirements Specification

Stable ID scheme: `SEC-CI-*` (security/CI), `OPS-CI-*` (operations/release), `REL-CI-*` (reliability), `ARCH-CI-*` (architecture), `DOC-CI-*` (documentation), `TEST-CI-*` (testing of the gate itself). Source codes: `brief` (PROMPT.md), `repo` (current source), `research` (`19`), `sibling` (sibling pack), `derived`.

Priority: **P0** = required for the Tier-A free slice (implementation-ready); **P1** = required for full release-readiness (Tier-B owner-decision); **P2** = enhancement.

---

## SEC-CI-01 — Consolidated security gate command
- **Statement:** A single `bun run security:gate` command runs all Tier-A security gates, prints a consolidated PASS/ADVISORY/FAIL report, and exits non-zero on FAIL.
- **Rationale:** brief ("one consolidated security release gate"); replaces fragmented manual checks.
- **Source:** `brief`; `sibling` (launch-gate expects a single artifact).
- **Priority:** P0.
- **Dependencies:** SEC-CI-02..06.
- **Acceptance criteria:**
  - AC-01a: `bun run security:gate` runs dependency-vuln + secret + SBOM + coverage + smoke gates.
  - AC-01b: exit code 0 iff all gates pass; non-zero if any gate FAILs; ADVISORY results do not change exit code (printed only).
  - AC-01c: report names each gate, its result, its threshold, and its evidence path.
  - AC-01d: completes in < 120s on a clean local run (CI budget, see `09`).
- **Validation:** `TEST-CI-01` (unit test of aggregator exit logic); manual run.
- **Affected code areas:** `scripts/security-gate/` (new), `package.json`.
- **Risks:** aggregator complexity (RISK-CI-03).
- **Status:** specified.

## SEC-CI-02 — Dependency-vulnerability gate (`bun audit`)
- **Statement:** `bun audit` runs against `bun.lock`; high/critical advisories FAIL the gate; moderate/low are ADVISORY.
- **Rationale:** brief ("dependency risk"); free; protects the clean state from `15-dependency-advisory-triage.md`.
- **Source:** `brief`; `repo` (overrides exist); `research` (`19` §1, §8).
- **Priority:** P0.
- **Dependencies:** none (bun built-in).
- **Acceptance criteria:**
  - AC-02a: gate calls `bun audit` (JSON parseable).
  - AC-02b: any advisory with severity `high` or `critical` → FAIL (non-zero).
  - AC-02c: `moderate`/`low` → ADVISORY (printed, exit unchanged) unless `SECURITY_AUDIT_STRICT=1`.
  - AC-02d: `overrides`-resolved advisories are counted as resolved (bun audit honors overrides).
- **Validation:** `TEST-CI-02` (fixture: a mock audit JSON with each severity → expected gate result).
- **Affected code areas:** `scripts/security-gate/audit.ts` (new), `package.json`.
- **Risks:** bun-audit schema drift across versions (RISK-CI-01).
- **Status:** specified.

## SEC-CI-03 — Secret-scanning gate (`gitleaks`)
- **Statement:** `gitleaks detect` scans the repo for hardcoded secrets; any finding FAILs the gate; runs in CI on PRs (diff) and on schedule (full history).
- **Rationale:** brief ("secret scanning"); GitHub native secret scanning is **not free on private-Free** (`19` §3, §7); gitleaks fills the gap at $0.
- **Source:** `brief`; `research`.
- **Priority:** P0.
- **Dependencies:** gitleaks Go binary (CI: release binary + checksum pin; local: release binary / `go install`; `OPEN-CI-05`; NOT `bunx`).
- **Acceptance criteria:**
  - AC-03a: `.github/gitleaks-config.toml` exists with allowlist for known-safe patterns (e.g., test fixtures, `public/.well-known/security.txt`).
  - AC-03b: gate runs `gitleaks detect --source . --config .github/gitleaks-config.toml --report-path ...`.
  - AC-03c: any finding → FAIL; clean → PASS.
  - AC-03d: CI PR mode scans only the diff via `gitleaks detect --source . --log-opts="<base>..HEAD" --redact --config .github/gitleaks-config.toml` (R4: `--gitleaks-diff` does not exist in gitleaks; the diff mechanism is `--log-opts` which gitleaks passes to `git log -p`); scheduled mode scans full history (no `--log-opts`).
  - AC-03e: no secret values appear in evidence/reports — **verified objectively by PROOF-03** (assert the gitleaks report for a planted `AKIA…` dummy does NOT contain the literal `AKIA` string; gitleaks `--redact` is the mechanism). ADV-17 covers the manual-inspect complement.
- **Validation:** `TEST-CI-03` (fixture: a dummy secret in a temp file → detection; a known-safe pattern → allowlisted).
- **Affected code areas:** `.github/gitleaks-config.toml` (new), `scripts/security-gate/secrets.ts` (new), `package.json`.
- **Risks:** false positives blocking velocity (RISK-CI-04); mitigated by allowlist + advisory ratchet.
- **Status:** specified.

## SEC-CI-04 — SBOM generation (Tier A) + provenance (Tier B / OSS fallback)
- **Statement (split, post-R3 correction):**
  - **SEC-CI-04a (Tier A, free):** CI generates an SBOM (Syft, CycloneDX) bound to the `.open-next/` build and uploads it as a workflow artifact + release-tagged archive.
  - **SEC-CI-04b (Tier B, GHEC):** GitHub build-provenance attestation (`actions/attest-build-provenance`) **requires GitHub Enterprise Cloud on a private repo** (`19` §1, reverified). It is **not** Tier-A free.
  - **SEC-CI-04c (Tier-A OSS fallback for provenance):** an OSS provenance path — `cosign sign-blob` (keyless via Sigstore Rekor, free) over the SBOM + a build in-toto statement, committed as a release artifact — provides provenance **without** the GitHub attestation store.
- **Rationale:** brief ("SBOM/provenance"). The original draft misclassified `actions/attest-build-provenance` as free on private-Free — the R3 adversarial review caught this (reverified against `docs.github.com` + `github.com/security/plans`). The split keeps SBOM-generation Tier-A free; attestation moves to Tier B with an OSS provenance substitute so the pack is valuable without GHEC.
- **Source:** `brief`; `research` (`19` §1, §5 — **corrected**); `repo`.
- **Priority:** P0 (04a SBOM; 04c OSS provenance fallback); P1 (04b GitHub attestation when GHEC).
- **Dependencies:** 04a: Syft (`OPEN-CI-05`). 04c: `cosign` Go binary (CI: `cosign-installer` action; local: release binary). 04b: `OPEN-CI-06` (GHEC) or repo made public.
- **Acceptance criteria:**
  - AC-04a: CI step runs `syft . -o cyclonedx-json=<path>` after build (Tier A).
  - AC-04b: SBOM artifact retained per `09` §retention (Tier A).
  - AC-04c: OSS provenance path (04c) produces a signed Sigstore bundle over the SBOM, stored as a release artifact (Tier A).
  - AC-04d: when `OPEN-CI-06` (GHEC) closed, `actions/attest-build-provenance`/`attest-sbom` runs with the artifact digest (Tier B) — **until then SKIP-with-reason** in `security:gate`.
  - AC-04e: `13` runbook documents verification: `cosign verify-blob` (Tier A OSS path) and, when available, `gh attestation verify` (Tier B).
- **Validation:** `TEST-CI-04` (assert SBOM valid JSON, expected top-level deps; assert cosign bundle present for OSS path).
- **Affected code areas:** `.github/workflows/security-gates.yml` (new), `package.json` (`security:sbom` script), `scripts/security-gate/sbom.ts`, `scripts/security-gate/provenance.ts` (new, OSS cosign path).
- **Risks:** Syft on Bun lockfile fidelity (RISK-CI-05); cosign keyless flakiness (RISK-CI-16, new); mitigated by cosign being advisory-ratcheted.
- **Status:** specified (04a/04c impl-ready Tier A; 04b Tier B `OPEN-CI-06`).

## SEC-CI-05 — Code coverage threshold (Vitest)
- **Statement:** Vitest runs with `@vitest/coverage-v8` and enforces a ratcheted coverage threshold (baseline measured, then ratcheted up).
- **Rationale:** brief ("coverage thresholds"); free in-repo (`19` §10, §11).
- **Source:** `brief`; `research`; `repo` (`vitest.config.ts` has no coverage).
- **Priority:** P0.
- **Dependencies:** `@vitest/coverage-v8` devDep (`OPEN-CI-05`).
- **Acceptance criteria:**
  - AC-05a: `vitest.config.ts` has a `coverage:` block: `provider: 'v8'`, `include: ['src/**/*.{ts,tsx}']`, `exclude: [...]`, `thresholds: { lines: <baseline>, functions: <baseline>, branches: <baseline>, statements: <baseline> }`.
  - AC-05b: baseline measured before setting threshold (measure-then-set; `11` WP-4).
  - AC-05c: threshold is **ratcheted** (monotonic non-decreasing) — a `scripts/ratchet-coverage.mjs` updates the floor to current coverage if higher.
  - AC-05d: under-threshold → FAIL; advisory for first 2 weeks (ratchet window per `09`).
  - AC-05e: **floor minimum** — if the measured baseline is below `lines: 40%` (the pre-launch floor), the gate does NOT auto-ratchet to the low baseline; instead it ships as ADVISORY + an `OPEN-CI-10` owner decision (so the gate cannot silently ship as a near-no-op). The 40% floor is itself an owner-tunable number.
- **Validation:** `TEST-CI-05` (assert threshold config parses; assert a deliberate uncovered-line drop triggers FAIL).
- **Affected code areas:** `vitest.config.ts`, `scripts/ratchet-coverage.mjs` (new), `package.json`.
- **Risks:** Vitest counts all glob-matched files (`19` §10 gotcha) → threshold appears wrong; mitigated by careful `include`.
- **Status:** specified; **DISCOVERY-REQUIRED** sub-step to measure baseline before setting the number (WP-4), with the 40% floor guarding against a meaninglessly-low auto-set.

## SEC-CI-06 — DAST-like route smoke
- **Statement:** A route-smoke script boots `bun run dev`, hits a curated endpoint list (health, key public/auth routes), asserts HTTP status + minimal response shape.
- **Rationale:** brief ("DAST-like smoke"); lighter than full Playwright for the always-on gate (`19` §15).
- **Source:** `brief`; `research`; `repo` (Playwright exists for the heavier gate).
- **Priority:** P0.
- **Dependencies:** none (uses existing `bun run dev`).
- **Acceptance criteria:**
  - AC-06a: `scripts/security-gate/smoke.ts` starts `bun run dev`, waits for `/` to respond, then hits a manifest of routes (`scripts/security-gate/smoke-routes.json`).
  - AC-06b: each route asserts expected status (200 for public, 401/403 for auth-required, etc.).
  - AC-06c: smoke completes < 30s; dev server torn down on exit (success or failure).
  - AC-06d: smoke route manifest is maintained alongside route additions (documented in `13`).
- **Validation:** `TEST-CI-06` (assert smoke against a known-good local server returns PASS; assert a deliberately-broken route returns FAIL).
- **Affected code areas:** `scripts/security-gate/smoke.ts` (new), `scripts/security-gate/smoke-routes.json` (new), `package.json`.
- **Risks:** port conflicts in CI; flaky boot; mitigated by dynamic port + retry-on-boot.
- **Status:** specified.

## SEC-CI-08 — PR dependency-diff gate (Tier B GitHub action; Tier-A OSS substitute)
- **Statement:** a PR-time gate blocks new high/critical vulns from entering via dependency changes.
  - **Tier B (paid):** `actions/dependency-review-action` with `fail-on-severity: high` — **requires GitHub Code Security ($30/active-committer/mo) on a private repo** (`19` §1, reverified). Not free on private-Free.
  - **Tier A (free substitute):** `osv-scanner` (or `bun audit` diff) run against the PR diff's `package.json`/`bun.lock` changes — posts a comment + sets a non-required check. Free OSS.
- **Rationale:** brief ("dependency risk" on new deps, complementing SEC-CI-02's existing-dep scan). The original draft listed `dependency-review-action` as Tier-A free — the R3 review caught this; it is now Tier B with a free OSS substitute so the capability exists at $0.
- **Source:** `brief`; `research` (`19` §1, **corrected** — dependency graph is free, dependency-review action is not).
- **Priority:** P0 (Tier-A osv-scanner substitute); P1 (Tier-B action when Code Security).
- **Dependencies:** Tier A: `osv-scanner` Go binary (CI: release binary + checksum pin; local: release binary; `OPEN-CI-05`; NOT `bunx`). Tier B: `OPEN-CI-09` (Code Security).
- **Acceptance criteria:**
  - AC-08a: Tier-A osv-scanner PR-diff step runs on `pull_request`; comments on PR with any new advisory; sets `security-dep-diff` check (advisory until `SECURITY_DEPDIFF_STRICT=1`).
  - AC-08b: Tier-B `actions/dependency-review-action` with `fail-on-severity: high` runs **only when** `OPEN-CI-09` closed.
  - AC-08c: until Tier B, the Tier-A substitute is the gate; documented in `13` §2 policy table (replacing the prior phantom row).
- **Validation:** `TEST-CI-08` (assert osv-scanner PR-diff comment logic; assert Tier-B action gated behind plan check).
- **Affected code areas:** `.github/workflows/security-gates.yml`, `scripts/security-gate/depdiff.ts` (new).
- **Status:** specified (Tier-A substitute impl-ready; Tier-B action owner-gated).

## SEC-CI-07 — SAST (CodeQL) — Tier B, owner-decision
- **Statement:** CodeQL SAST is restored from `workflows-disabled/codeql.yml` and runs on PRs/push/schedule **when** the repo has GHAS (or is made public). Until then it is documented as the Tier-B path.
- **Rationale:** brief ("SAST/CodeQL"); CodeQL on private-Free requires GHAS (`19` §2).
- **Source:** `brief`; `repo` (config exists, orphaned); `research`.
- **Priority:** P1.
- **Dependencies:** `OPEN-CI-01` (GHAS) OR repo made public.
- **Acceptance criteria:**
  - AC-07a: `11` WP-2.3 documents the exact restore path (move `codeql.yml`, rescope `paths` to drop `supabase`).
  - AC-07b: `OPEN-CI-01` records the cost and the feature it unblocks.
  - AC-07c: until GHAS, the gate is `not-applicable-with-reason` in the `security:gate` report.
- **Validation:** static (config-presence test updates; `TEST-CI-07`).
- **Status:** specified (Tier B).

## OPS-CI-01 — Release-blocking policy (merge vs release)
- **Statement:** A documented policy table states, per gate: does it block merge? does it block release? what is the escape hatch? advisory window?
- **Rationale:** brief ("release blocking policy"); the two-tier model needs an explicit policy (`13` §2).
- **Source:** `brief`.
- **Priority:** P0.
- **Acceptance criteria:**
  - AC-O1a: `13` §2 contains the table; every implemented gate has a row.
  - AC-O1b: merge-blocking requires branch-protection enforcement (Tier B, `OPEN-CI-04`); until then, the gate "blocks release" (the `security:gate` verdict is a release input, not a merge enforcement).
- **Status:** specified (in `13`).

## OPS-CI-02 — Local developer escape hatches
- **Statement:** Each gate has a documented local escape hatch (`--skip-<gate>`, `--allow-dirty`, advisory env var) and the policy for when using it is safe.
- **Rationale:** brief ("local developer escape hatches").
- **Priority:** P0.
- **Acceptance criteria:** AC-02o: `13` §3 documents each hatch; `security:gate --help` lists them.
- **Status:** specified.

## ARCH-CI-01 — CI workflow restoration + top-level permissions
- **Statement:** `ci.yml` restored from `workflows-disabled/`, with a top-level `permissions: contents: read` block added (current archived version lacks it).
- **Rationale:** least-privilege (`19` §13); gap in current archived file.
- **Priority:** P0.
- **Status:** specified (`11` WP-0).

## ARCH-CI-02 — `SECURITY.md`
- **Statement:** `.github/SECURITY.md` documents the vulnerability-reporting policy (mirrors `public/.well-known/security.txt`), supported versions, and response SLA.
- **Rationale:** missing (`03` §2); brief implies security posture.
- **Priority:** P0.
- **Status:** specified (`11` WP-0).

## DOC-CI-01 — Mapping to launch readiness
- **Statement:** `13` §4 maps `security:gate` to the launch-readiness-evidence-gate's `OPEN-LG-05`/`OPEN-LG-06` and DOM-55.
- **Priority:** P0.
- **Status:** specified.

## TEST-CI-* (testing the gate itself)
- **TEST-CI-01..06:** unit tests for each gate's exit logic and the aggregator (in `tests/unit/security-gate/`).
- **TEST-CI-07:** config-preservation test update (§2.3 of `03`).
- **Priority:** P0.
- **Status:** specified (`12`).

---

## Shadow-path matrix (the gate's own failure modes)

| Flow | Happy path | Nil/missing input | Empty input/result | Invalid input | Auth denied | Upstream/network error | Concurrency/race | Retry/idempotency | User-visible result | Test |
|---|---|---|---|---|---|---|---|---|---|---|
| `security:gate` | all gates pass → exit 0, PASS report | a gate's tool missing (gitleaks/Syft binary) → that gate SKIP with reason; overall ADVISORY | empty audit/SBOM → ADVISORY with "no data" | malformed audit JSON → FAIL with parse error | n/a (local tool) | registry fetch for gitleaks/Syft → SKIP + retry hint | two `security:gate` runs writing same report path → last-writer-wins (acceptable; reports are ephemeral) | re-run is idempotent (no side effects) | consolidated report + exit code | TEST-CI-01 |
| `bun audit` gate | 0 high/crit → PASS | `bun.lock` missing → FAIL ("no lockfile") | 0 advisories → PASS | `bun audit` schema change → FAIL (parse) with "rerun `bun audit` manually" hint | n/a | registry offline → SKIP + residual risk; **advisory-DB stale/lagging (npm DB lags OSV by days) → ADVISORY "DB may lag; consider osv-scanner second-opinion"** (RISK-CI-01, mitigated by DEC-CI-03 optional osv) | n/a | idempotent | per-severity counts | TEST-CI-02 |
| gitleaks gate | 0 findings → PASS | repo empty → PASS | n/a | bad config TOML → FAIL (config) | n/a | gitleaks binary unavailable → SKIP + install hint | n/a | idempotent | finding count + redacted list | TEST-CI-03 |
| SBOM gate | Syft emits valid JSON → PASS | build artifact missing → SKIP (build didn't run) | empty dep list → ADVISORY | malformed → FAIL | n/a | Syft unavailable → SKIP | n/a | idempotent | SBOM path + dep count | TEST-CI-04 |
| provenance (OSS cosign) | cosign emits valid Sigstore bundle → PASS | SBOM missing → SKIP ("run sbom first") | n/a | malformed bundle → FAIL | n/a | cosign unavailable / Rekor offline → SKIP + residual | n/a | idempotent | bundle path | TEST-CI-04 |
| provenance (GitHub attest, Tier B) | attest succeeds → PASS | GHEC absent → SKIP + reason (OPEN-CI-06) | n/a | n/a | n/a | n/a | n/a | idempotent | attestation ref | TEST-CI-04 |
| coverage gate | coverage ≥ threshold → PASS | no `src/**` matched → FAIL (misconfig) | 0 files → FAIL | threshold NaN → FAIL | n/a | n/a | n/a | idempotent | % vs threshold | TEST-CI-05 |
| smoke gate | all routes expected status → PASS | route manifest empty → SKIP ("no routes") | all routes 404 → FAIL | manifest malformed → FAIL | auth-required route returns 200 → FAIL (security regression!) | dev server won't boot → FAIL + boot log | port in use → retry next port | re-run restarts server (acceptable) | per-route status table | TEST-CI-06 |

**Critical shadow path:** the smoke gate's "auth-required route returns 200" cell is a **security regression detector** — a route that *should* 401/403 but returns 200 means an authz regression; the gate FAILs loudly. This connects to (but does not duplicate) the owasp-api-authz-matrix-refresh sibling.

## Credential-material taxonomy — N/A for this pack

This pack introduces **no new credentials**. It scans for leaked ones (gitleaks) and binds build artifacts (provenance). No raw tokens, hashes, encrypted secrets, session cookies, or share URLs are created or handled by the gate. The gitleaks allowlist (`SEC-CI-03` AC-03a) must explicitly exclude test fixtures that contain *dummy* secret-shaped strings (clearly marked `EXAMPLE_ONLY`/`x-test-`) so they don't false-positive.

## What can go wrong (per requirement, summarized)

Each requirement's risks are enumerated inline above and consolidated in `14`. The cross-cutting failure modes are: (a) tool-binary availability in CI, (b) false-positive velocity drag, (c) schema/config drift, (d) the smoke gate's port/boot flakiness, (e) the Tier-B gates being unblockable without owner spend.

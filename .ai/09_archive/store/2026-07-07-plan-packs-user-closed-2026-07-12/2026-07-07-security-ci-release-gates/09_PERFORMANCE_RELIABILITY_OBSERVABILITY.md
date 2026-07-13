# 09 — Performance, Reliability, and Observability

The "performance" of this pack = **CI runtime cost** and **gate execution time**, not application runtime (untouched). The brief explicitly requires "CI runtime cost" — that is the primary deliverable here.

## §1. CI runtime cost estimate (the brief's explicit ask)

**Quota:** GitHub Free private = **2,000 Actions minutes/month** (Linux ubuntu-24.04 = 1× multiplier; `19` §14).

### Per-run estimates (linux, 1×)

**Test-file counts verified 2026-07-08 (R4 corrected):** `tests/vitest/` = **650** files (475 `.test.ts` + 175 `.test.tsx` — the R3 "470" recount dropped all `.test.tsx`); `tests/unit/` = 6 files (bun-native); `e2e/` = 9 specs. The `validate` script chains `type-check + lint + lint:design-system + lint:design + test(bun) + test:dom(vitest)` — separate durations below.

| Job/step | Est. minutes | Basis |
|---|---|---|
| **`ci.yml` (restored)** | | |
| checkout + setup-bun + install | ~1.5 | existing baseline |
| `bun run test` (bun unit, 6 files) | ~0.3 | tiny |
| `bun run test:dom` (vitest, 650 files, serial `maxWorkers=1`) | **~5.0** | long pole; scaled from 650 files |
| type-check + lint + lint:design-system + lint:design | ~1.5 | non-test validate steps |
| `bun run build` | ~2 | next build |
| perf-budget advisory | ~0.5 | script |
| Playwright Chromium install | ~1.5 | download + deps |
| `test:e2e` + `test:e2e:perf` | ~3 | 9 specs, chromium |
| **ci.yml subtotal** | **~15.3** | |
| **`security-gates.yml` (new)** | | |
| checkout + setup-bun + install + Go-binary install (gitleaks/syft/cosign/osv) | ~2.0 | install now includes 4 Go binaries (R4) |
| `bun audit` | ~0.5 (est, unmeasured) | registry lookup |
| gitleaks (diff-mode on PR via `--log-opts`; full on schedule) | ~0.5 (diff) / ~1.5 (full-history, est) | pattern scan, offline; full-history slower |
| Syft SBOM | ~0.5 (est) | lockfile + node_modules parse |
| osv-scanner dep-diff (SEC-CI-08 Tier A) | ~0.5 (est) | scans package.json + generated SBOM (not bun.lock — R4) |
| cosign OSS provenance (SEC-CI-04c, keyless Rekor) | ~0.7 (est; Rekor round-trip) | sign SBOM |
| coverage (folds into `test:dom --coverage`, +~10%) | ~0.5 | coverage overhead only (folded into ci.yml's vitest per WP-4.4; delta if separate) |
| route-smoke (boot + probe + teardown) | ~1 | dev server boot ~10s + probes |
| **security-gates.yml subtotal** | **~6.2** | (coverage folded into ci.yml; else +4.5) |
| **CodeQL (Tier B, if Code Security)** | ~9 | JS/TS auto-build + analyze; `security-extended`+`security-and-quality` |

### Run-frequency model (pre-launch, assume 1 active dev + bots)

| Trigger | Frequency/mo | Runs/mo |
|---|---|---|
| `ci.yml` on `pull_request` + `push:[main]` | ~40 commits × ~1.2 runs | ~48 |
| `security-gates.yml` on PR/push | ~48 (same cadence) | ~48 |
| `security-gates.yml` weekly schedule | 4 | 4 |
| Dependabot PR CI runs | ~10 PRs × ~1.5 runs | ~15 |
| CodeQL weekly (Tier B) | 4 | 4 |

**Note (R4):** the archived `ci.yml` triggers on `push: [main, feat/**]`. Per WP-0.1 the restored trigger is **narrowed to `push: [main]`** — this is a deliberate owner-decision (`OPEN-CI-11`, not silent), matching security-gates.yml and this cost model. If `feat/**` is kept, add ~30% more ci.yml runs.

### Monthly budget (Tier A only)

| Component | Runs/mo × min | Minutes/mo |
|---|---|---|
| ci.yml | 48 × 15.3 | 734 |
| security-gates.yml | (48+4) × 6.2 | 322 |
| Dependabot-triggered | 15 × 15.3 | 230 |
| **Total Tier A** | | **~1,286** |

**Headroom:** 2,000 − 1,286 = **~714 min/mo spare (~36%)**. Within free tier for the pre-launch single-contributor cadence. **Still an estimate, not a measurement** — per-run cells marked `(est)` are unmeasured; confirm with first month of real billing (DISCOVERY).

### If CodeQL (Tier B / GHAS) added
+ 4 × 8 = 32 min/mo (scheduled only) → negligible. + if CodeQL on PR/push: ~48 × 8 = 384 → would push total to ~1,709, still within 2,000 but tighter. **Recommendation (Tier B):** CodeQL on schedule + `pull_request: [main]` only (not all pushes) to stay within budget. Recorded in `13`.

### Cost-reduction levers (if budget tightens)
1. **Matrix/share install:** run `ci.yml` and `security-gates.yml` as jobs in one workflow sharing an install step → saves ~1.5 min × 48 = 72 min/mo.
2. **Smoke only on `pull_request`**, not push-to-main → saves smoke boot time.
3. **Coverage in `ci.yml`** (already runs `test:dom`) instead of re-running in security-gates.yml → saves ~4 min × 48 = 192 min/mo. **(Recommended: fold coverage into the existing `validate`/`test:dom` step; the security workflow reads the coverage summary.)** This is captured in `11` WP-4.
4. **gitleaks diff-mode on PRs** (not full history) → faster; full history only on schedule.

**Reconciliation note:** lever 3 means the *coverage gate* runs as part of `ci.yml`'s existing `test:dom` step (just adding `--coverage` + threshold check), not as a separate security-gates.yml job. This is the most efficient design and is reflected in `11` WP-4.

## §2. Performance evaluator contract (for the gates themselves)

Following the performance-goal discipline (a gate is a runtime tool with latency):

| Metric | Baseline | Target | Measurement | Fixture | Runs | Regression threshold | Evidence |
|---|---|---|---|---|---|---|---|
| `security:gate` wall-clock (local) | TBD (measure at WP-1) | < 60s (excl. smoke) / < 120s (incl. smoke) | `time bun run security:gate` | clean main | 5 | +50% over target | `.security-gate-report.json` timestamp |
| `security-gates.yml` job (CI) | ~8.5 min (estimate) | < 12 min | Actions run duration | clean main | 10 runs | +30% | Actions UI / API |
| gitleaks full-scan | ~30s (estimate) | < 60s | `time gitleaks detect` | repo @ HEAD | 5 | +50% | report timestamp |

**Initial baseline is DISCOVERY-REQUIRED** (measure at WP-1) — the estimates above are planning bounds, not measured. The targets are set from the estimates with margin.

## §3. Reliability / failure modes

| Failure | Detection | Recovery |
|---|---|---|
| Tool binary (gitleaks/syft) unavailable in CI | gate SKIP with reason | install step in workflow (Go-binary download + checksum pin) |
| `bun audit` schema change across bun versions | gate FAIL (parse error) + clear hint | update parser; pin bun version in CI |
| Dev server won't boot (smoke) | smoke FAIL with boot log | port conflict → dynamic port; missing dep → `bun install` |
| Registry offline (`bun audit`) | gate SKIP + residual risk | retry; non-blocking |
| gitleaks false positive storm | many ADVISORY | allowlist tuning; `--skip-secrets` local hatch |
| Coverage threshold ratcheted too high | devs blocked | lower via PR (ratchet is monotonic but reviewable) |
| Attestation signing fails | attest step FAIL | retry; GitHub Sigstore CA rarely down |
| Flaky Playwright in CI (existing) | E2E red | unrelated to this pack; owned by existing CI |

## §4. Observability

| Signal | Source | Owner | Threshold/action |
|---|---|---|---|
| CI run duration | GitHub Actions | owner | > 12 min → investigate |
| `security:gate` verdict trend | report artifact | launch gate | FAIL → blocks release |
| `bun audit` advisory count | audit JSON | owner | any high/crit → FAIL |
| gitleaks finding count | gitleaks report | owner | any → FAIL |
| coverage % | coverage summary | owner | below threshold → FAIL; ratchet tracks monotonic increase |
| Dependabot PR merge latency | GitHub | owner | stale > 14d → review |

**No new metrics infra.** Observability is GitHub-native (Actions UI + Dependabot dashboard + the report artifact). APM/error-tracking for the *application* is a separate launch gate (owned by `01_roadmap` dashboard, "LEFT TO DO"); not this pack.

## §5. Artifact retention (the brief's explicit ask)

| Artifact | Location | Retention | Rationale |
|---|---|---|---|
| `security-gate-report-*` (CI) | workflow artifact | **14 days** | enough to inspect a recent release decision; short to avoid log-drift cost |
| `security-gate-report.json` (local) | `.security-gate-report.json` (gitignored) | overwritten each run | ephemeral |
| `sbom.cdx.json` | workflow artifact + release-tagged archive | **90 days** (CI) / **indefinite** (release tag) | release evidence; SBOM should live as long as the release it describes |
| build-provenance attestation | GitHub attestation store | GitHub-managed | off-repo; per GitHub policy |
| gitleaks report | workflow artifact | **1 day** (ephemeral) | redacted; short retention limits any exposure |
| coverage/ | gitignored | ephemeral | regenerable |

**Retention is set via `actions/upload-artifact@<sha>` `retention-days` input.** No paid Actions storage expected within these retention windows + single-contributor volume.

## §6. Resource budgets (CI runner)

- **Runner:** ubuntu-24.04 (Linux, 1× minute multiplier). 2-core, 7GB RAM, 14GB SSD (GitHub-hosted standard).
- **No self-hosted runner** (the 2026 self-hosted-runner fee `19` §14 is avoided).
- **No macOS jobs** (10× multiplier — avoided).
- **Cache:** `actions/cache` for `node_modules`/bun cache + Playwright browsers → cuts install step ~40%.

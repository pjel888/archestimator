# 11 — Implementation Plan

**This is the authoritative execution guide.** Phases are dependency-aware (graph in `10`). Each task has an exact target path. Planning-only pack: the implementer must verify current files before editing (`05` concurrent-safety).

**Profile:** exhaustive → full phasing. **Status:** Tier-A slice `IMPLEMENTATION-READY`; overall `CONDITIONALLY READY` (Tier-B + branch-enforcement external).

## Phase map

| Phase | Objective | Deps | Parallelizable? |
|---|---|---|---|
| WP-0 | Restore CI baseline + SECURITY.md + package scripts + fix config tests | none | WP-0 internal steps parallel-safe |
| WP-1 | Build the 5 gate modules + gitleaks config | WP-0, OPEN-CI-05 | gate modules parallel-safe (disjoint files) |
| WP-2 | security-gates.yml workflow + CodeQL Tier-B restore path | WP-1 | sequential after WP-1 |
| WP-3 | Aggregator + `security:gate` entry | WP-1, WP-4 | sequential |
| WP-4 | Vitest coverage block + ratchet + measure baseline | OPEN-CI-05 | parallel with WP-1 (disjoint: `vitest.config.ts`) |
| WP-5 | Tests TEST-CI-01..07 + update existing config tests | WP-1..4 | parallelizable by test file |
| WP-6 | Launch-gate artifact-contract integration | WP-3 | sequential |
| WP-7 | Docs: runbook, this pack's stale-revalidation, state update | all | last |

---

## WP-0 — Restore CI baseline + policy + scripts

**Objective:** re-enable CI from the archived baseline, add the missing `permissions:` block, add `SECURITY.md`, add the `security:*` package scripts, and update the config-preservation tests so re-enablement doesn't red them.
**Requirements:** ARCH-CI-01, ARCH-CI-02, OPS-CI-02 (partial).
**Prerequisites:** owner confirms CI re-enable is wanted (closes `OPEN-LG-05` CI slice).
**Affected paths:** `.github/workflows/ci.yml`, `.github/dependabot.yml`, `.github/SECURITY.md`, `package.json`, `tests/vitest/security-automation-config.test.ts`, `tests/vitest/ci-workflow-pinning.test.ts`.

### WP-0.1 — Restore `ci.yml` with `permissions:` block + narrowed trigger
- **Target:** `.github/workflows/ci.yml` (copy from `.github/workflows-disabled/ci.yml`).
- **Changes:**
  1. add top-level `permissions: contents: read` (current archived version lacks it — `03` §1.2);
  2. **narrow `push:` trigger from `[main, feat/**]` to `[main]`** (R3 cost-model correction — avoids uncounted `feat/**` runs; matches security-gates.yml and the `09` §1 budget). Document this change in the workflow comment.
  - Keep all existing SHA pins, steps, and the `PERF_BUDGET_STRICT` ratchet otherwise unchanged.
- **Why:** least-privilege (`19` §13); cost predictability (`09` §1).
- **Validation:** `actionlint` (if available) or YAML lint; `bun run test:dom -- security-automation-config` (after WP-0.4).
- **Exit:** ci.yml present in active dir, SHA-pinned, `permissions:` present, `push:[main]` only.
- **Complexity:** Small.

### WP-0.2 — Restore `dependabot.yml`
- **Target:** `.github/dependabot.yml` (move from `workflows-disabled/dependabot.yml`).
- **Change:** verbatim restore (npm + github-actions ecosystems, weekly, limit 5).
- **Validation:** `bun run test:dom -- security-automation-config` (after WP-0.4).
- **Complexity:** Small.

### WP-0.3 — Add `.github/SECURITY.md`
- **Target:** `.github/SECURITY.md` (new).
- **Content:** mirror `public/.well-known/security.txt` policy; supported versions (current main); private reporting email (redacted placeholder; owner fills); response SLA (e.g., 72h acknowledge); "do not open public issues for vulns".
- **Why:** ARCH-CI-02; missing (`03` §2).
- **Complexity:** Small.

### WP-0.4 — Update config-preservation tests to read active paths
- **Target:** `tests/vitest/security-automation-config.test.ts`, `tests/vitest/ci-workflow-pinning.test.ts`.
- **Change:** generalize to read `.github/workflows/{ci,codeql}.yml` and `.github/dependabot.yml` (active), with a fallback read of `workflows-disabled/` if active missing (so the test works in both states). Assert the same pins/fields.
- **Why:** `03` §2.3 — current test reads `workflows-disabled/` and would red on re-enable.
- **Critical:** without this, WP-0.1/0.2 immediately red the suite.
- **Complexity:** Small.

### WP-0.5 — Add `security:*` package scripts
- **Target:** `package.json`.
- **Scripts to add:**
  - `security:gate` → `bun run scripts/security-gate/index.ts`
  - `security:audit` → `bun run scripts/security-gate/audit.ts`
  - `security:secrets` → `bun run scripts/security-gate/secrets.ts`
  - `security:sbom` → `bun run scripts/security-gate/sbom.ts`
  - `security:smoke` → `bun run scripts/security-gate/smoke.ts`
  - (coverage runs via existing `test:dom` + `--coverage`; see WP-4)
- **Why:** OPS-CI-02; the gate entry points.
- **Complexity:** Small.

---

## WP-1 — Build the 5 gate modules (parallel-safe)

**Objective:** one module per Tier-A gate, each emitting a uniform `GateResult`.
**Requirements:** SEC-CI-02..06.
**Prerequisites:** WP-0; OPEN-CI-05 (devDeps) for Syft/coverage-v8.
**Shared type** (`scripts/security-gate/types.ts`):
```ts
export type GateResult = {
  name: string;
  result: 'PASS' | 'ADVISORY' | 'FAIL' | 'SKIP' | 'ERROR';
  threshold?: string;
  evidencePath?: string;
  advisory?: boolean;
  skipReason?: string;
  detail?: string;
};
export type Gate = { name: string; run: () => Promise<GateResult> };
```
**Each module** owns its invocation, parsing, threshold, and failure logic. No cross-gate coupling.

### WP-1.1 — `audit.ts` (SEC-CI-02)
- **Target:** `scripts/security-gate/audit.ts` (new).
- **Behavior:** run `bun audit` (JSON); parse advisories; map severity → result. high/crit → FAIL; mod/low → ADVISORY unless `SECURITY_AUDIT_STRICT=1`.
- **Override verification (R4 AC-02d):** before relying on "bun audit honors overrides", plant a known-resolved-by-override advisory (temporarily add a vuln dep + an `overrides` fix) and confirm `bun audit` reports it resolved. Record the result. If bun audit does NOT honor overrides on the text `bun.lock`, surface as ADVISORY + RISK-CI-18 and consider the osv-scanner second-opinion as the authoritative dep gate.
- **Failure cases:** no `bun.lock` → FAIL; schema drift → FAIL with hint; overrides not honored → ADVISORY + RISK-CI-18.
- **Test:** TEST-CI-02 (`tests/unit/security-gate/audit.test.ts`).
- **Complexity:** Medium.

### WP-1.2 — `secrets.ts` + `.github/gitleaks-config.toml` (SEC-CI-03)
- **Target:** `scripts/security-gate/secrets.ts` (new), `.github/gitleaks-config.toml` (new).
- **Behavior:** run `gitleaks detect --source . --config .github/gitleaks-config.toml --report-format json --report-path <tmp>`; parse; any finding → FAIL; verify redaction (AC-03e).
- **Modes (AC-03d, R4-corrected):**
  - **Scheduled/full:** `gitleaks detect --source . --redact --config .github/gitleaks-config.toml` (full history) on the weekly schedule.
  - **PR-diff (WP-1.2 sub-step):** on `pull_request`, run `gitleaks detect --source . --log-opts="origin/<base>..HEAD" --redact --config .github/gitleaks-config.toml`. **R4 correction:** `--gitleaks-diff` does not exist in gitleaks (any version); the diff mechanism is `--log-opts="<range>"`, which gitleaks forwards to `git log -p`. Requires `actions/checkout@<sha>` with `fetch-depth: 0` + `git fetch origin <base>` so the base ref exists. Verify the exact flag name against the pinned gitleaks release at implementation (gitleaks CLI has shifted across versions). TEST-CI-03 covers both modes.
- **Config:** allowlist for test fixtures (`tests/**`, `**/*.test.ts`), `public/.well-known/security.txt`, `.ai/**` (plan docs may contain redacted examples — ensure they're allowlisted by pattern, not blanket).
- **Failure cases:** gitleaks missing → SKIP + install hint; bad config → FAIL; shallow-clone missing base → fallback to full scan with a performance warning.
- **Test:** TEST-CI-03 (full + diff modes).
- **Complexity:** Medium.
- **Security note:** the allowlist is the highest-risk config (too broad → false negatives). Review-required on every allowlist change.

### WP-1.3 — `sbom.ts` (SEC-CI-04a, Tier A) + `provenance.ts` (SEC-CI-04c, Tier A OSS)
- **Target:** `scripts/security-gate/sbom.ts` (new), `scripts/security-gate/provenance.ts` (new).
- **Tool install (R4):** Syft and cosign are **Go binaries**, not npm packages. CI installs them via release-binary download + checksum pin (Syft) and `sigstore/cosign-installer` action (cosign). Locally: release binary or `go install`. NOT `bunx`. NOT in `bun.lock`. See `18` §4.
- **SBOM behavior:** run `syft . -o cyclonedx-json=<path>`; validate JSON; count top-level deps; report path. (Tier A, free.)
- **Provenance behavior (OSS, Tier A):** run `cosign sign-blob --yes --bundle=<path> <sbom-path>` (keyless Sigstore/Rekor); produce a signed bundle over the SBOM + a minimal in-toto build statement. **Requires `permissions: id-token: write` on the cosign step (R4 T-10)** for the OIDC token Rekor needs; gate to same-repo/push-to-main (fork-safety, TM-CI-02). Free; no GitHub attestation store.
- **GitHub attestation (SEC-CI-04b, Tier B):** NOT implemented in Tier A. The `provenance.ts` module probes for GHEC availability; if absent → SKIP-with-reason (`OPEN-CI-06`); if present → also run `actions/attest-build-provenance`/`attest-sbom`.
- **Failure cases:** Syft missing → SKIP; build artifact missing → SKIP "run build first"; malformed SBOM → FAIL; cosign missing / Rekor offline → SKIP + residual (RISK-CI-16); `id-token: write` not granted → FAIL with "cosign keyless needs OIDC".
- **Test:** TEST-CI-04 (SBOM JSON; cosign bundle present; Tier-B SKIP-with-reason).
- **Complexity:** Medium.
- **Cross-check:** compare Syft dep count vs `bun pm ls --all` count; warn if delta > 20% (Syft Bun-lockfile fidelity, RISK-CI-05).

### WP-1.4 — `coverage.ts` (SEC-CI-05)
- **Target:** `scripts/security-gate/coverage.ts` (new).
- **Behavior:** read Vitest coverage summary (`coverage/coverage-summary.json`); compare `lines/functions/branches/statements` vs threshold from `vitest.config.ts`; below → FAIL.
- **Note:** the *running* of coverage is done by `test:dom --coverage` (WP-4); this module only reads + decides.
- **Failure cases:** no summary file → SKIP ("run test:dom --coverage first"); threshold missing → FAIL (misconfig).
- **Test:** TEST-CI-05.
- **Complexity:** Medium.

### WP-1.5 — `smoke.ts` + `smoke-routes.json` (SEC-CI-06)
- **Target:** `scripts/security-gate/smoke.ts` (new), `scripts/security-gate/smoke-routes.json` (new).
- **Behavior:** boot `bun run dev --port <dynamic>`; wait for `/`; iterate `smoke-routes.json` (`[{path, expectedStatus, authRequired}]`); assert status; auth-required route returning 200 → **FAIL (security regression)**; teardown server on exit.
- **Lifecycle spec (R4 T-8):**
  - **Port:** dynamic, picked from range `3939..3999` (avoid 3000/8787 collisions); first free port wins; `EADDRINUSE` → next port.
  - **Max boot retries:** 3 (different ports); each boot-poll: GET `/` every 500ms, timeout 20s per attempt.
  - **Total budget:** ≤ 30s for boot + probe (AC-06c).
  - **Teardown:** spawn server with a tracked child handle; on exit (success, failure, SIGINT, SIGTERM, or thrown error) send `SIGTERM` to the child, wait 2s, then `SIGKILL` if still alive. Use a `finally` block + `process.on('exit'/'SIGINT'/'SIGTERM')` hooks so CI cancellation still kills the child.
  - **Concurrency (R4 ADV-09):** two concurrent smokes contend for ports — each scans the range independently; if no free port after the range, FAIL (not silent). `.security-gate-report.json` is last-writer-wins (acceptable; no atomic-write guarantee needed while no mid-write consumer exists).
- **Routes manifest (initial, DISCOVERY):** `/` (200), `/api/health` (200, if exists), a known auth-required route (401/403), `/share/<invalid>` (404). **DISCOVERY-REQUIRED:** enumerate actual public + auth-required routes from `src/app/` to seed the manifest (WP-1.5 sub-step).
- **Routes manifest (initial):** `/` (200), `/api/health` (200, if exists), a known auth-required route (401/403), `/share/<invalid>` (404). **DISCOVERY-REQUIRED:** enumerate actual public + auth-required routes from `src/app/` to seed the manifest (WP-1.5 sub-step).
- **Failure cases:** server won't boot → FAIL + log; port conflict → next port; manifest malformed → FAIL.
- **Test:** TEST-CI-06.
- **Complexity:** Medium-Large (server lifecycle is the hard part).

### WP-1.6 — `depdiff.ts` (SEC-CI-08 Tier-A substitute)
- **Target:** `scripts/security-gate/depdiff.ts` (new).
- **Tool install (R4):** osv-scanner is a **Go binary**, not an npm package. CI installs via release-binary download + checksum pin. Locally: release binary or `go install`. NOT `bunx`. NOT in `bun.lock`.
- **Behavior (R4-corrected):** osv-scanner **cannot parse `bun.lock`** (google/osv-scanner#1405 open). On `pull_request`, run `osv-scanner --source .` (scans `package.json`) OR `osv-scanner --sbom=<syft-sbom-path>` (scans the Syft-produced CycloneDX SBOM). Diff-awareness: compare the PR's resolved-advisory set vs main's (run osv on both, set-diff). Post a PR comment with any NEW advisory; set a `security-dep-diff` check (advisory until `SECURITY_DEPDIFF_STRICT=1`). Do NOT pass `--lockfile bun.lock`.
- **Why:** replaces the paid `dependency-review-action` (needs Code Security on private) with a free OSS substitute (R3). R4 fixes the invocation + lockfile-gap.
- **Failure cases:** osv-scanner missing → SKIP + hint; no `package.json` change AND no SBOM → SKIP "no dep change"; advisory-DB lag → ADVISORY (cross-ref SEC-CI-02 shadow-path); osv can't resolve a dep → ADVISORY with the unresolved name.
- **Test:** TEST-CI-08.
- **Complexity:** Medium.

---

## WP-2 — security-gates.yml workflow + CodeQL Tier-B path

**Objective:** CI workflow running the Tier-A gates on PR/push/schedule; document (don't enable) the CodeQL Tier-B restore.
**Requirements:** ARCH-CI-01, SEC-CI-07.
**Prerequisites:** WP-1.
**Target:** `.github/workflows/security-gates.yml` (new).

### WP-2.1 — security-gates.yml
- **Triggers:** `pull_request`, `push: [main]`, `schedule: "17 3 * * 1"` (weekly, offset from CodeQL cron).
- **Permissions:** top-level `contents: read`; job-level `pull-requests: write` only on the dep-diff comment step; `attestations: write` **only** on the Tier-B attest step and **only** `if:` GHEC is detected; **`id-token: write` on the Tier-A cosign step** (R4 T-10 — keyless cosign needs the OIDC token for Rekor) **gated to same-repo/push-to-main** (fork-safety, TM-CI-02). WP-2.2 fork-safety applies to both cosign and Tier-B attest.
- **Steps (Tier A):** checkout (SHA, `fetch-depth: 0` for gitleaks diff-base), setup-bun (SHA), `bun install --frozen-lockfile`, `bun audit` gate, gitleaks (diff-mode on PR per WP-1.2, full on schedule), Syft SBOM (SEC-CI-04a), cosign OSS provenance sign-bundle (SEC-CI-04c), osv-scanner dep-diff (SEC-CI-08 Tier A), coverage (folded into ci.yml's vitest per WP-4.4; this workflow reads the summary), `bun run security:smoke`, `bun run security:gate` (aggregator), upload report artifact (`retention-days: 14`).
- **Steps (Tier B, gated):** `actions/attest-build-provenance` + `actions/attest-sbom` run only `if:` GHEC detected AND event is push-to-main (SEC-CI-04b). `actions/dependency-review-action` runs only `if:` Code Security detected (SEC-CI-08 Tier B).
- **Concurrency:** cancel-in-progress per-ref.
- **Pinned actions:** all `uses:` pinned to 40-char SHA per `19` §13.
- **Complexity:** Medium.

### WP-2.2 — Fork-PR safety
- **Rule:** security-gates.yml runs on `pull_request` but the SBOM/attest steps (which use `permissions: attestations: write`) are gated `if: github.event_name == 'push' || github.event.pull_request.head.repo.full_name == github.repository` (no secret scope on fork PRs). TM-CI-02.
- **Complexity:** Small.

### WP-2.3 — CodeQL Tier-B restore path (documented, not enabled)
- **Target:** `.github/workflows/codeql.yml` (restore from disabled) — **only when OPEN-CI-01 (GHAS) closed or repo public**.
- **Change vs archived:** rescope `paths` in `.github/codeql/codeql-config.yml` — **remove `supabase`** (legacy archaeology dir; `03` §2.2); keep `src, scripts, tests`. Pin CodeQL action to current v4 SHA (the archived `411bbbe…` should be re-verified against latest at restore time).
- **Why:** Tier-B; SAST; not free on private-Free.
- **Status:** `OPEN-CI-01`; documented as SKIP in `security:gate` until then.
- **Complexity:** Small (restore + rescope).

---

## WP-3 — Aggregator + `security:gate` entry

**Objective:** the `index.ts` that runs all gates, aggregates, prints the report (`05` shape), writes the artifact (`06` §4), and exits.
**Requirements:** SEC-CI-01.
**Prerequisites:** WP-1, WP-4.
**Target:** `scripts/security-gate/index.ts` (new).

### WP-3.1 — index.ts
- **Behavior:** import gates from WP-1 modules; run in defined order; catch per-gate throws → ERROR; collect `GateResult[]`; compute verdict (FAIL if any FAIL; else ADVISORY if any ADVISORY; else PASS); print report (no color if not TTY / `NO_COLOR`); write `.security-gate-report.json` (v1 schema, `06` §4); exit non-zero iff FAIL (or SKIP under `SECURITY_GATE_STRICT=1`).
- **Escape hatches:** `--skip-<gate>` flags; `--allow-dirty` (skip git-clean check); env `SECURITY_GATE_SKIP=<comma>` (CI).
- **Order:** audit → secrets → sbom → coverage → smoke (fastest-failing first; secrets before sbom so a leaked secret doesn't get attested).
- **Test:** TEST-CI-01.
- **Complexity:** Medium.

### WP-3.2 — `security:gate --help`
- Lists gates, thresholds, escape hatches, env vars. UX-CI-05.
- **Complexity:** Small.

---

## WP-4 — Vitest coverage block + ratchet + baseline

**Objective:** add coverage to `test:dom` and enforce a ratcheted threshold.
**Requirements:** SEC-CI-05.
**Prerequisites:** OPEN-CI-05 (`@vitest/coverage-v8`).
**Targets:** `vitest.config.ts`, `scripts/ratchet-coverage.mjs` (new), `package.json`.

### WP-4.1 — Measure baseline (DISCOVERY-REQUIRED, floor-guarded)
- **Action:** add `@vitest/coverage-v8`; run `bun run test:dom -- --coverage`; read `coverage/coverage-summary.json`; record `lines/functions/branches/statements` % for `src/**`.
- **Floor guard (AC-05e):** if the measured `lines` baseline is **< 40%** (the pre-launch floor), do NOT auto-set the threshold to the low baseline. Instead ship the coverage gate as ADVISORY + open `OPEN-CI-10` (owner decides: invest in tests before enabling, or accept the low floor). The 40% is owner-tunable. This prevents the gate silently shipping as a near-no-op.
- **Output:** 4 baseline numbers + a floor-guard decision (set threshold vs ADVISORY+OPEN-CI-10).
- **Stop condition:** have 4 numbers and the floor-guard decision.
- **Complexity:** Small (but blocks setting the threshold).

### WP-4.2 — Add coverage block
- **Target:** `vitest.config.ts`.
- **Content:** `coverage: { provider: 'v8', include: ['src/**/*.{ts,tsx}'], exclude: ['src/**/*.d.ts', 'src/**/__mocks__/**', ...], reporter: ['text', 'json-summary'], thresholds: { lines: <baseline>, functions: <baseline>, branches: <baseline>, statements: <baseline> } }`.
- **Gotcha:** Vitest counts all `include`-matched files (`19` §10) — set `include` to `src/**` only, not `tests/**`.
- **Deliberate exclusion (R4 T-11):** `scripts/security-gate/**` (the gate's own code) is **intentionally NOT in coverage `include`**. It is tested via `tests/unit/security-gate/` (PROOF-01..07). Including `scripts/**` would drag the threshold down with many untested scripts. This choice is documented here so an implementer doesn't "helpfully" add `scripts/**`.
- **Complexity:** Small.

### WP-4.3 — Ratchet script
- **Target:** `scripts/ratchet-coverage.mjs` (new).
- **Behavior:** read current coverage summary; if current > threshold-in-config, update config to current (monotonic non-decreasing); print diff; no-op if current ≤ threshold. Run manually or in CI on main.
- **Complexity:** Small-Medium.

### WP-4.4 — `package.json` `test:dom` + coverage
- **Change:** `test:dom` stays `vitest run --maxWorkers=1`; coverage runs via `vitest run --maxWorkers=1 --coverage` (new script `test:dom:coverage`, used by security-gates.yml). Keeps `test:dom` fast for non-gate use.
- **Complexity:** Small.

---

## WP-5 — Tests

**Objective:** TEST-CI-01..07 + update existing config tests.
**Requirements:** TEST-CI-*.
**Targets:** `tests/unit/security-gate/*.test.ts` (new, 6 files), updates to `tests/vitest/security-automation-config.test.ts`, `ci-workflow-pinning.test.ts`, `supply-chain-toolchain-manifest.test.ts`.

| Test ID | File | What it proves |
|---|---|---|
| TEST-CI-01 | `tests/unit/security-gate/aggregator.test.ts` | exit-code logic; verdict mapping; SKIP-under-STRICT |
| TEST-CI-02 | `tests/unit/security-gate/audit.test.ts` | severity → result mapping; strict env; parse-error FAIL |
| TEST-CI-03 | `tests/unit/security-gate/secrets.test.ts` | finding → FAIL; allowlist; redaction |
| TEST-CI-04 | `tests/unit/security-gate/sbom.test.ts` | valid JSON; dep count; missing-artifact SKIP |
| TEST-CI-05 | `tests/unit/security-gate/coverage.test.ts` | threshold parse; under-threshold FAIL |
| TEST-CI-06 | `tests/unit/security-gate/smoke.test.ts` | expected-status assertions; auth-regression detection; teardown |
| TEST-CI-07 | (update) `security-automation-config.test.ts` | reads active paths; both-state resilient |

**R4 correction on `supply-chain-toolchain-manifest.test.ts`:** the existing test only asserts `packageManager === "bun@1.3.14"` — it does NOT maintain a tool manifest and has no row to "add syft/gitleaks to". So it will NOT red on re-enable. WP-5 should instead **create a new `scripts/security-gate/tool-manifest.json`** (listing the 4 Go binaries + their pinned versions/checksums) and extend this test (or a new `tool-manifest.test.ts`) to assert the manifest exists and every binary has a checksum pin. This closes RISK-CI-17 (Go binaries are outside `bun audit`'s scope → need their own pinned-manifest check).

- **Complexity:** Medium (6 new test files; smoke test is the hardest).
- **Command:** `bun test tests/unit/security-gate` + `bun run test:dom -- security-automation-config`.

---

## WP-6 — Launch-gate integration

**Objective:** wire `security:gate` artifact into `launch-readiness-evidence-gate`.
**Requirements:** DOC-CI-01, SEC-CI-01 (consumer side).
**Prerequisites:** WP-3.
**Note:** the launch-gate pack owns its DOM-55 wiring; this task only ensures the **artifact contract** (`06` §4) is satisfied and documents the mapping. Actual launch-gate code change is owned by that pack's Phase 6 (OPEN-LG-05).
- **Action:** verify `SecurityGateArtifact` v1 schema matches what launch-gate's reader expects; add a stub reader test.
- **Complexity:** Small.
- **Status:** additive; doesn't block Tier-A.

---

## WP-7 — Docs + state update (post-impl)

**Objective:** update repo state docs to reflect active CI; publish the runbook.
**Targets:** `.ai/10_state/current-state.md` (CI no longer disabled), `01_roadmap` dashboard, this pack's `13` runbook referenced from `README.md`.
- **Complexity:** Small.

---

## Per-task summary table (complexity & parallelization)

| Task | Req IDs | New/Mod file | Complexity | Parallel class |
|---|---|---|---|---|
| WP-0.1 | ARCH-CI-01 | ci.yml | S | sequential (0.1→0.4) |
| WP-0.2 | ARCH-CI-01 | dependabot.yml | S | parallel with 0.1 |
| WP-0.3 | ARCH-CI-02 | SECURITY.md | S | parallel |
| WP-0.4 | TEST-CI-07 | 2 test files | S | sequential after 0.1/0.2 |
| WP-0.5 | OPS-CI-02 | package.json | S | parallel |
| WP-1.1 | SEC-CI-02 | audit.ts | M | parallel (1.1-1.5 disjoint) |
| WP-1.2 | SEC-CI-03 | secrets.ts + toml | M | parallel |
| WP-1.3 | SEC-CI-04 | sbom.ts + provenance.ts | M | parallel |
| WP-1.4 | SEC-CI-05 | coverage.ts | M | parallel |
| WP-1.5 | SEC-CI-06 | smoke.ts + json | M-L | parallel (DISCOVERY sub-step) |
| WP-1.6 | SEC-CI-08 | depdiff.ts | M | parallel |
| WP-2.1 | ARCH-CI-01 | security-gates.yml | M | sequential after WP-1 |
| WP-2.2 | TM-CI-02 | (in 2.1) | S | with 2.1 |
| WP-2.3 | SEC-CI-07 | codeql restore (Tier B) | S | owner-gated |
| WP-3.1 | SEC-CI-01 | index.ts | M | sequential after WP-1+4 |
| WP-4.1 | SEC-CI-05 | (measure) | S | parallel with WP-1 |
| WP-4.2 | SEC-CI-05 | vitest.config.ts | S | after 4.1 |
| WP-4.3 | SEC-CI-05 | ratchet-coverage.mjs | S-M | after 4.2 |
| WP-5 | TEST-CI-* | 6 test files + 3 updates | M | parallel by file |
| WP-6 | DOC-CI-01 | contract test | S | after WP-3 |
| WP-7 | DOC-CI-* | state docs | S | last |

## Rollback per task
Every task is reversible: delete the new file / revert the edit / move workflow back to `workflows-disabled/`. No destructive operations. Rollback procedure in `13` §3.

# 18 — Stack Contract and Production Standards

Consolidates the cross-cutting production decisions for this pack's stack surface (CI, Bun, Vitest, GitHub Actions, gitleaks, Syft, attestations). Application-stack layers (Next.js/React/D1/R2/etc.) are **explicitly unaffected** and documented as such — this pack touches only the build/CI/dev tooling layer.

## §1. CI runtime contract

| Aspect | Decision | Evidence |
|---|---|---|
| Runner | `ubuntu-24.04` (Linux, 1× min multiplier) | `19` §14; avoids macOS 10× |
| Package manager | Bun 1.3.14 (pinned in setup-bun) | `package.json` packageManager |
| Install | `bun install --frozen-lockfile` | existing `ci.yml` |
| Action pinning | all `uses:` pinned to 40-char SHA | existing pattern; `19` §13; TM-CI-03/RISK-CI-13 |
| Permissions | top-level `contents: read`; per-job widen only | `19` §13; ARCH-CI-01; TM-CI-02 |
| Concurrency | cancel-in-progress per-ref | existing react-doctor pattern |
| Cache | `actions/cache` for bun + Playwright browsers | `09` §6 cost lever |
| Triggers | `pull_request` + `push: [main]` + `schedule` (security-gates) | `11` WP-2.1 |
| Fork-PR safety | `pull_request` (not `_target`); attest gated to same-repo | TM-CI-02; WP-2.2 |

## §2. Bun / lockfile contract

| Aspect | Decision |
|---|---|
| Lockfile | `bun.lock` (text, `lockfileVersion: 1`); `--frozen-lockfile` in CI |
| Audit | `bun audit` (JSON) — honors `overrides` (verify at WP-1.1, RISK-CI-18) |
| New devDep | `@vitest/coverage-v8` only (the one true npm devDep; `OPEN-CI-05`) |
| CI-installed Go binaries (NOT npm packages, NOT `bunx`-invokable, NOT in `bun.lock`, NOT covered by `bun audit`) | gitleaks, Syft, cosign, osv-scanner — installed in CI via release-binary download + checksum/SHA pin; locally via `go install` or release binary. R4 correction: the original draft framed these as `bunx` devDeps — incorrect. |
| osv-scanner input (R4) | osv-scanner **cannot parse `bun.lock`** (google/osv-scanner#1405 open). Feed it `package.json` + a generated `package-lock.json` (`bun pm lockfile --npm` or equivalent), OR scan the Syft-produced SBOM (`osv-scanner --sbom=<path>`). Do NOT pass `--lockfile bun.lock`. |
| Existing hygiene | `overrides` block (js-yaml, tmp, undici, uuid, etc.) preserved |
| `trustedDependencies` | esbuild, sharp, unrs-resolver (unchanged) |
| `patchedDependencies` | `@firecms/neat@0.8.0` (unchanged) |

## §3. Vitest contract

| Aspect | Decision |
|---|---|
| Runner | Vitest 4.x (`vitest.config.ts`) |
| Environment | jsdom; serial (`fileParallelism: false`, `maxWorkers: 1`) |
| Coverage provider | `@vitest/coverage-v8` (v8, default) |
| Coverage include | `src/**/*.{ts,tsx}` (NOT `tests/**` — `19` §10 gotcha) |
| Coverage thresholds | baseline-measured, ratcheted, monotonic |
| Test exclusions (tsconfig) | tests/e2e/config files excluded from type-check (unchanged) |

## §4. Gate tooling contract (Go binaries — R4 reframed)

All four are **Go binaries, not npm packages**. They are installed in CI (release binary + checksum/SHA pin) and locally (release binary or `go install`). They are NOT in `bun.lock` and NOT covered by `bun audit` — `bun audit` covers only the JS dependency tree.

| Tool | Install (CI) | Install (local) | Config | Egress | Redaction |
|---|---|---|---|---|---|
| gitleaks | release binary + checksum pin (or `gitleaks/gitleaks-action`) | release binary | `.github/gitleaks-config.toml` | offline | `--redact` flag (AC-03e) |
| Syft | release binary + checksum pin | release binary / `go install` | (defaults; CycloneDX JSON out) | offline | n/a (dep names public) |
| cosign | `sigstore/cosign-installer` action | release binary / `go install` | (keyless Rekor) | Rekor (signing) | n/a |
| osv-scanner | release binary + checksum pin | release binary / `go install` | (scan package.json + generated package-lock, OR `--sbom`) | OSV.dev DB | n/a |
| `@vitest/coverage-v8` | `bun install` (devDep) | `bun install` | `vitest.config.ts` coverage block | offline | n/a |
| `actions/attest-build-provenance` (Tier B) | SHA-pinned action | n/a | — | GitHub Actions API | n/a |
| `actions/attest-sbom` (Tier B) | SHA-pinned action | n/a | — | GitHub Actions API | n/a |

**Supply-chain note (R4):** because these Go binaries are outside `bun audit`'s scope, the gate's own supply-chain posture relies on (a) checksum/SHA pinning at install, (b) Dependabot `github-actions` ecosystem for the action-wrapped ones, and (c) periodic manual review of binary release provenance. This residual is RISK-CI-17.

## §5. Documentation/policy contract

| Artifact | Owner | Purpose |
|---|---|---|
| `.github/SECURITY.md` | owner | repo vuln-reporting policy (mirrors `public/.well-known/security.txt`) |
| `.github/CODEOWNERS` | owner (advisory until Pro) | ownership (unchanged) |
| `13_ROLLOUT...` runbook | this pack | operator red-gate responses |
| launch-gate `OPEN-LG-05/06` | launch-gate pack + this pack | CI slice closed by this pack |

## §6. TypeScript / validation contract (gate code)

- Gate scripts are TypeScript (`scripts/security-gate/*.ts`), run via `bun`.
- Shared `GateResult` type (`types.ts`); no `any`; exhaustive result-union handling.
- Artifact schema versioned (`archestimator.security-gate.v1`).
- No application-domain types touched.

## §7. Standards NOT applicable (with reason)

| Standard | Reason N/A |
|---|---|
| Next.js App Router / Server Components / cache | no app code touched |
| D1/R2/DO/Queue/Email | no binding change (`07`) |
| Better Auth | no auth change |
| Tailwind/design-system | no UI (`05` N/A justified) |
| CSP/headers | owned by CSP sibling pack (`08` §7) |
| Rate limits / body-size | owned by invite/share sibling packs (`08` §8) |

## §8. Production-readiness cross-cut

This pack contributes to the `01_roadmap` production-readiness dashboard:
- **Security — CI/automation:** from "LEFT TO DO / disabled" → "IMPLEMENTED (Tier A)" post-impl.
- **Security — supply chain:** SBOM + provenance + dep-audit → new capability.
- **QA — CI gates:** consolidated `security:gate` → new capability.
- Does **not** close (Tier B): SAST, native secret-scan, branch-enforcement — those rows stay "DECIDED / OWNER-GATED".

# 03 — Source and Codebase Audit

All paths repo-relative unless noted. Evidence gathered by read-only Explore + general-purpose agents (2026-07-08); their raw outputs are summarized, not duplicated. Quotes are verbatim from current files.

## §1. Current CI state — DISABLED (the central fact)

### 1.1 `.github/workflows/` is EMPTY
```bash
$ ls -la .github/workflows/
# only . and ..  (total 0)
```
All four workflows were archived on **2026-07-07** (commit `68a59394a`) to `.github/workflows-disabled/`. Commit message:
> "chore(ci): Move disabled GitHub Actions workflows to archive directory ... GitHub Actions no longer run, but the workflow files are preserved for reference or future revival."

`current-state.md` lines 85-92 confirms: re-enable by moving YAML back into `.github/workflows/` and restoring `.github/dependabot.yml`.

### 1.2 Archived workflows (the restore baseline)

| File | Triggers | Key steps / notes |
|---|---|---|
| `workflows-disabled/ci.yml` | `pull_request`, `push: [main, feat/**]` | `actions/checkout@93cb6cb…` (v5 SHA), `oven-sh/setup-bun@0c5077e…` v2 (bun 1.3.14), `bun install --frozen-lockfile`, `bun run validate`, `bun run build`, perf-budget (`continue-on-error: ${{ secrets.PERF_BUDGET_STRICT != '1' }}`), `bun run lint:design`, Playwright Chromium install, `bun run test:e2e`, `bun run test:e2e:perf`. **No top-level `permissions:` block** (gap). |
| `workflows-disabled/codeql.yml` | `pull_request: [main]`, `push: [main]`, `schedule: "33 2 * * 1"` | `permissions: {contents: read, security-events: write}`; `github/codeql-action/init@411bbbe…` v4 + `analyze@411bbbe…` v4; `languages: javascript-typescript`; `config-file: ./.github/codeql/codeql-config.yml`. |
| `workflows-disabled/dependabot.yml` | (config, not workflow) | v2; npm (weekly Mon 09:00 Asia/Manila, limit 5, labels `dependencies`+`security`, commit-prefix `deps`, grouped prod/dev); github-actions (weekly Mon 09:30, limit 5, commit-prefix `ci`). |
| `workflows-disabled/react-doctor.yml` | `pull_request` (opened/synchronize/reopened/ready_for_review), `push: [main]` | `permissions: {contents: read, pull-requests: write, issues: write, statuses: write}`; concurrency cancel-in-progress; `millionco/react-doctor@2ba03bdb…`; **currently advisory** (the `with: blocking: error` block is commented out). |

**Implication:** The restore baseline is *good* (SHA-pinned, least-privilege `permissions` on CodeQL/React-Doctor) but *incomplete* as a consolidated security gate: it has no secret scan, no SBOM, no coverage threshold, no dependency-vuln gate, no DAST-smoke, and `ci.yml` lacks a top-level `permissions:` block.

### 1.3 The advisory→blocking ratchet precedent (`PERF_BUDGET_STRICT`)
`workflows-disabled/ci.yml` lines 26-36 establish the **canonical pattern** for this repo: a gate runs, is `continue-on-error` by default (advisory), and promotes to blocking via a secret (`PERF_BUDGET_STRICT=1`). **DEC-CI-07** adopts this pattern for all new security gates. This is the key velocity-preserving mechanism.

## §2. Security config gaps

| Item | Status | Evidence |
|---|---|---|
| `SECURITY.md` / `.github/SECURITY.md` | **MISSING** | no file in tree |
| `.github/dependabot.yml` (active) | **DISABLED** (archived) | in `workflows-disabled/` |
| `.github/codeql/codeql-config.yml` | present (orphaned) | still on disk; only consumed by disabled workflow |
| Secret-scanning config (gitleaks/gitguardian) | **MISSING** | none |
| `renovate.json` | **MISSING** | none |
| Branch protection / rulesets | **NOT ENFORCED** | `.github/CODEOWNERS` header: "keep this file advisory until required CODEOWNERS review can be enabled" |
| SBOM / provenance config | **MISSING** | no syft/grype/syft/cyclonedx config or artifacts |
| `public/.well-known/security.txt` + `src/app/security/page.tsx` | present | RFC 9116 vuln-disclosure policy already shipped (so `SECURITY.md` is the *repo* policy companion, not the public one) |

### 2.1 `.github/CODEOWNERS` (advisory only)
```
# ... Platform enforcement is pending GitHub branch-protection capability; keep this
# file advisory until required CODEOWNERS review can be enabled.
* @pjel888
.github/ @pjel888   .ai/ @pjel888   src/ @pjel888   ...
```
Single owner; explicitly states enforcement is **pending** (i.e., not active). This matches the Tier-B reality: branch-protection/ruleset enforcement requires GitHub Pro on a private repo (`19` research).

### 2.2 `.github/codeql/codeql-config.yml` (the SAST query pack config)
```yaml
name: Archestimator CodeQL config
queries:
  - uses: security-extended
  - uses: security-and-quality
paths: [src, scripts, tests, supabase]
paths-ignore: [node_modules, .next, coverage, storybook-static]
```
**Note:** `paths` still includes `supabase` (legacy). When CodeQL is restored, this should be re-scoped to the active D1/Workers surface (remove `supabase`, the legacy archaeology dir) — flagged in `11` WP-2.3.

### 2.3 `tests/vitest/security-automation-config.test.ts` — the config-preservation guard
This test **locks in the disabled state** by reading the archived paths:
```ts
const dependabotConfig = readFileSync(".github/workflows-disabled/dependabot.yml", "utf8");
const codeqlWorkflow = readFileSync(".github/workflows-disabled/codeql.yml", "utf8");
```
**Implication for implementation:** When CI is re-enabled and files move back to `.github/workflows/`, **this test must be updated** to read the active paths (or generalized to read both). This is an explicit task in `11` (WP-0.4) — without it, the test goes red.

Related automation-config tests that will be affected by re-enablement:
- `tests/vitest/ci-workflow-pinning.test.ts`
- `tests/vitest/supply-chain-toolchain-manifest.test.ts` — **R4 correction:** currently only asserts `packageManager === "bun@1.3.14"`; does NOT maintain a tool manifest. The plan's earlier claim that it needs "syft/gitleaks added" was wrong — it won't red on re-enable. WP-5 instead creates a NEW `scripts/security-gate/tool-manifest.json` + a `tool-manifest.test.ts` to assert the 4 Go binaries are checksum-pinned (RISK-CI-17).
- `tests/vitest/cloudflare-release-gates-script.test.ts`

## §3. `package.json` scripts (the integration surface)

File: `package.json`. Relevant scripts (lines approximate):

| Script | Command | Relevance |
|---|---|---|
| `validate` (98) | `type-check && lint && lint:design-system && lint:design && test && test:dom` | **The existing CI body.** New `security:gate` wraps *around* this, doesn't replace it. |
| `build` (8) | `next build` | CI step. |
| `test` (79) | `bun test tests/unit` | Bun-native unit. |
| `test:dom` (80) | `vitest run --maxWorkers=1` | Vitest DOM/helper (serial for perf). **Coverage target.** |
| `test:e2e` (82) | `playwright test` | DAST-like coverage already exists. |
| `test:e2e:perf` (83) | `playwright test e2e/route-transition-performance.spec.ts` | Perf smoke. |
| `lint:design` (99) | `node .agents/skills/impeccable/scripts/detect.mjs --strict src/components` | Impeccable. |
| `cf:release-gates` (55) | (script) | **Existing release-gate script** — the precedent for `security:gate` shape (exit-code semantics). |
| `validate:agents` (62) | `node scripts/validate-ai-workflow-adapters.mjs` | Agent-surface validator. |
| **MISSING** | `security:gate`, `security:audit`, `security:secrets`, `security:sbom`, `security:smoke`, `audit`, `sbom` | **None exist.** This pack proposes them. |

### 3.1 devDependencies (security/quality-relevant)
`eslint@^9.39.4`, `eslint-config-next@16.2.6`, `typescript@^6.0.3`, `vitest@^4.1.9`, `vite@8.0.16`, `@playwright/test@^1.60.0`, `@testing-library/react@^16.3.2`, `jsdom@^29.1.1`, `wrangler@^4.105.0`, `react-doctor@0.5.8`, `@next/bundle-analyzer@16.2.6`, `storybook@10.4.6`.

**No dedicated security scanner** in deps (no `gitleaks`, no `osv-scanner`, no `syft`, no `@vitest/coverage-v8`). These are the candidate new devDeps (`OPEN-CI-05`).

### 3.2 `overrides` (existing transitive supply-chain hygiene)
```json
"overrides": {
  "@babel/core": "7.29.7", "esbuild": "0.28.1", "js-yaml": "4.2.0",
  "postcss": "8.5.15", "tmp": "0.2.7", "undici": "7.28.0", "uuid": "11.1.1"
}
```
This is the **existing dependency-pin hygiene** (post-InfoSec-run, `.ai/17_InfoSec/2026-06-24-InfoSec-Run/15-dependency-advisory-triage.md` cleared 15 advisories to `{}` via these + direct patches). The new `bun audit` gate protects this posture going forward.

### 3.3 `patchedDependencies` / `trustedDependencies`
- `patchedDependencies`: `@firecms/neat@0.8.0` → `patches/@firecms%2Fneat@0.8.0.patch`.
- `trustedDependencies`: `esbuild`, `sharp`, `unrs-resolver` (Bun install-script allowlist).

## §4. Test infrastructure (coverage target)

| Layer | Runner | Config | Location | Count |
|---|---|---|---|---|
| Unit | Bun native | (none) | `tests/unit/` | 6 files |
| DOM/helper | Vitest | `vitest.config.ts` (`jsdom`, serial, `@`→`./src`) | `tests/vitest/` | **650 files** (475 `.test.ts` + 175 `.test.tsx`; R4-corrected — R3's "470" dropped `.test.tsx`) |
| E2E | Playwright | `playwright.config.ts` (chromium default; browser matrix env-gated) | `e2e/` | 9 specs |

### 4.1 Coverage — currently NONE
- `vitest.config.ts` has **no `coverage:` block**.
- No `c8`/`istanbul`/`nyc`/`@vitest/coverage-*` in deps.
- `tsconfig.json` **excludes** `tests`, `e2e`, `vitest.config.ts`, `playwright.config.ts` from type-checking (line 36).

**Implication:** Adding a coverage threshold means (a) new devDep `@vitest/coverage-v8`, (b) a `coverage:` block in `vitest.config.ts`, (c) a baseline measurement before setting the threshold (else it's a guess). `11` WP-4 covers this with a "measure-then-set" sub-step.

### 4.2 Security-themed tests already present (in `tests/vitest/`)
`activity-security`, `ai-audit-flow`, `ai-audit-schema`, `ai-package-builder-security-contract`, `auth-account-audit-d1-store`, `auth-account-audit-hmac`, `auth-audit-completion-readiness-script`, `cloudflare-worker-secret-sync-script`, `dbidx-repo-audit`, `landing-security-headers`, `project-d1-audit`, `project-metadata-audit`, `project-publication-security*` (3), `public-font-lcp-audit`, **`security-automation-config`** (§2.3 above), `security-findings-*` (6), `upload-requirement-coverage-audit`.

**Implication:** Security-behavior tests exist and run under `bun run test:dom`. The new `security:gate` runs *alongside* these, not instead of them. They are the **Tier-A security-behavior floor**; the new gates add *automation/policy* (CI-time vuln/secret/SBOM) on top.

## §5. Cloudflare / deployment context (boundary confirmation)

`wrangler.jsonc`: Worker `archestimator-proof`, custom domain `archestimator.com`, compatibility_date `2026-06-29`, `nodejs_compat`, observability enabled (logs 0.1, traces 0.05 head-sampling), 3 crons (`0 3 * * *`, `15 3 * * *`, `30 3 * * *`), D1 `ARCH_DB`, R2 `ARCH_UPLOADS_R2`, DO `COLLAB_ROOMS`, Queue `archestimator-upload-jobs` (DLQ, batch 5, retries 3), Email `EMAIL`, Images `IMAGES`.

**Boundary:** This pack proposes **zero** `wrangler.jsonc` / binding / migration changes. The CI workflow may *call* `cf:release-gates` as a release-gate input, but does not modify Cloudflare config. Standing Cloudflare-resource authorization is not extended to GitHub billing.

### 5.1 Build artifact paths (for SBOM/attestation scope)
`/.next/` (build), `/.open-next/` (OpenNext Worker output, `wrangler.jsonc` assets dir = `.open-next/assets`), `/coverage` (proposed), `/playwright-report`, `/test-results` (gitignored). These are the artifacts a build-provenance attestation would bind to (the `.open-next/worker.js` is the deployable).

## §6. The `launch-readiness-evidence-gate` integration target

Pack: `.ai/03_plans/2026-07-07-launch-readiness-evidence-gate/`. It designs `bun run launch:gate` (proposed) aggregating 67 readiness domains into GO/CONDITIONAL/NO-GO. Two of its open decisions are **this pack's deliverables**:

- **OPEN-LG-05**: "Re-enable CI + decide merge-gate strictness" → owner-gated Phase 6. **This pack provides the concrete CI workflow + merge-gate policy that closes OPEN-LG-05** for the security-automation slice.
- **OPEN-LG-06**: "Resolve GitHub hosted sec 403/404 (CodeQL/Dependabot/secret-scan)" → owner/GitHub admin. **This pack provides the Tier-A free substitutes (gitleaks, bun audit, SBOM) that make progress on OPEN-LG-06 without waiting for GHAS**, plus the Tier-B GHAS path.

The launch gate's evidence DAG (producer→artifact→consumer) expects a `security:gate` artifact (exit code + report). This pack defines that artifact's producer (`scripts/security-gate/`) and its consumer (launch gate DOM for "security automation"). See `06` §4 and `13` §4.

## §7. Sibling security packs (do NOT duplicate — reference only)

| Pack | Owns | This pack's relationship |
|---|---|---|
| `2026-07-07-owasp-api-authz-matrix-refresh` | 33 API route handlers + ~162 Server Actions authz; OWASP API1–10 | Reference; **not** in scope (route/API authz, not automation) |
| `2026-07-07-global-nonced-csp-enforcement` | Per-request nonced CSP, Report-Only→Enforced | Reference; **not** in scope |
| `2026-07-07-invite-token-flow-hardening` | Invite origin, `/continue`, rate limits, migration `0038` | Reference; **not** in scope |
| `2026-07-07-public-share-activity-minimization` | Share over-fetch, deny→allow-list, Turnstile | Reference; **not** in scope |
| `2026-07-07-ai-safety-leakage-and-provider-resilience` | AI leakage/injection, ship-AI-OFF | Reference; **not** in scope |
| `2026-07-07-privacy-request-operations-and-erasure-workflow` | DSAR intake/erasure | Reference; **not** in scope |
| `2026-07-07-retention-and-dsar-data-lifecycle` | Retention TTLs | Reference; **not** in scope |
| `2026-07-07-launch-readiness-evidence-gate` | Unified launch gate | **Integration target** (§6) |
| `2026-07-07-github-security-pr-comment-loop` | Live PR/security-comment ledger | Coordinate; its non-goal ("no claim CodeQL/Dependabot/secret-scan clean without hosted readback") is honored here |
| `2026-06-01-security-owasp-compliance-audit` | June static OWASP audit; Doc 10 supply-chain | Supply-chain framing reference (Doc 10 Third-Party/Supply Chain) |

### 7.1 InfoSec run (`.ai/17_InfoSec/2026-06-24-InfoSec-Run/`)
The authoritative security-audit state. Key docs for this pack:
- `12-final-report.md`: verdict **NOT APPROVED**; release blockers include `INFOSEC-SC-006` (hosted GitHub controls) and `INFOSEC-SC-007` (Vercel/production/domain). **This pack's Tier-A gates directly address INFOSEC-SC-006's automation slice** (gitleaks/bun-audit/SBOM are the free substitutes for the unavailable hosted controls).
- `15-dependency-advisory-triage.md`: 15 advisories → `{}` clean via overrides + patches. **This is the `bun audit` baseline** — the gate protects this clean state.
- `18-release-gates-traceability.md`: authoritative release-gate traceability.

## §8. Not an exhaustive codebase claim

This audit is **systematic for the CI/security-automation surface** (§1–5) and the **integration/planning surface** (§6–7), not a line-by-line read of `src/`. That scoping is correct for a CI/automation planning pack: the application code is *out of scope* (owned by sibling packs). The blast-radius analysis (`10`) confirms no `src/` file is a planned target of this pack's implementation.

# 19 — Research, Review, and QA Evidence

## §1. Research questions and sources

The plan's load-bearing decisions depend on **current (2026) GitHub pricing/feature facts**, because the brief says "GitHub-native" but the repo is private on GitHub Free. Research was delegated to a general-purpose agent with WebSearch (read-only); its full output is summarized here, not duplicated.

### Research questions
1. Which GitHub-native security features are **free on private repos on GitHub Free** (2026)?
2. Which require GHAS / GitHub Pro?
3. What free OSS substitutes exist for the paid features?
4. Vitest coverage thresholds — how, gotchas?
5. SBOM/provenance for a Bun project — tooling?
6. GitHub Actions free-minute budget — sufficient?
7. DAST-like smoke for Next.js+Cloudflare — proportionate approach?

### Key findings (decisive for the plan)
| Finding | Source | Plan impact |
|---|---|---|
| Dependabot alerts/security-updates/version-updates free on all plans incl. private-Free | `github.com/security/plans`; Dependabot alerts docs | restore dependabot.yml (Tier A) |
| **CodeQL (code scanning) on private requires GitHub Code Security** (post-Apr-2025 GHAS split; $30/committer/mo) | `github.com/security/plans`; CodeQL docs | SEC-CI-07 Tier B; OPEN-CI-01 |
| **Secret scanning + push protection on private requires GitHub Secret Protection** ($19/committer/mo) | secret-scanning docs; push-protection GA blog | gitleaks substitute (DEC-CI-02); OPEN-CI-02 |
| **Branch protection/rulesets on private require GitHub Pro ($4/mo)** | GitHub pricing; community discussions #174400, #198686 | merge-enforcement is Tier B (OPEN-CI-04) |
| ~~Artifact attestations free for all accounts~~ **CORRECTED (R3): attestations require GHEC on private; free only for public on Free/Pro/Team** | `actions/attest-build-provenance` README; `docs.github.com` attestation docs | SBOM-gen Tier A (Syft); provenance Tier A OSS (cosign, DEC-CI-05); GitHub attestation Tier B (OPEN-CI-06) |
| **dependency-review-action requires GitHub Code Security on private** (dependency GRAPH is free; dependency REVIEW is not) | `actions/dependency-review-action` README; dependency-review docs; `github.com/security/plans` | SEC-CI-08: osv-scanner Tier-A substitute + dependency-review Tier B (OPEN-CI-09); removed phantom gate row |
| gitleaks free/OSS, offline, fills secret-scan gap | gitleaks repo | DEC-CI-02 |
| osv-scanner free/OSS, multi-DB; also the Tier-A PR dep-diff substitute | google/osv-scanner | DEC-CI-03 + SEC-CI-08 |
| cosign keyless (Sigstore/Rekor) free; OSS provenance path | cosign docs/Sigstore | DEC-CI-05 (SEC-CI-04c) |
| CodeQL action v4 current; v3 deprecated Dec 2026 | codeql-action changelog Oct 2025 | re-verify SHA at restore (WP-2.3) |
| Vitest counts all include-matched files (gotcha) | Vitest coverage docs | set `include` to `src/**` (WP-4.2) |
| In-repo Vitest thresholds > Codecov for single maintainer | AWS Graph Explorer #1704; Vitest docs | DEC-CI-04 |
| Actions 2,000 free min/mo (Linux 1×); self-hosted runner fee Mar 2026 avoided | GitHub billing docs | `09` §1 budget (~1,286 used Tier A, R4-corrected from 650 vitest files) |
| Syft handles Bun lockfile + node_modules | Anchore JS SBOM guide | DEC-CI-05 (with fidelity cross-check RISK-CI-05) |
| **GHAS product split (Apr 1, 2025):** Code Security ($30) + Secret Protection ($19), purchasable on Team or GHEC | GitHub blog changelogs 2025-03-04, 2025-04-01 | OPEN-CI terminology updated post-split |

### Source dates / version assumptions
- All GitHub Docs/pricing facts rechecked July 2026.
- CodeQL action v4 / v3-deprecation: Oct 2025 changelog (recheck before restore).
- Self-hosted-runner fee (Mar 2026) — avoided (we use GitHub-hosted).
- **Recheck at rollout** (`13` §7): GHAS pricing, attestation freeness, Actions minute quota.

### What was searched for but not found
- A 2025/2026 announcement making CodeQL free on private-Free (none exists).
- A 2025/2026 announcement making branch protection free on private-Free (none; active feature request #198686).
- A Bun-native SBOM generator matching Syft's fidelity (none first-party; Syft is the best third-party).

### Rubric used to decide research sufficient
The plan's free-vs-paid matrix is **decisive** (it determines Tier A vs Tier B). Every cell is sourced to GitHub Docs/changelog or the OSS tool's repo. Pricing facts are the highest-confidence items. Tool-fidelity claims (Syft on Bun) are medium-confidence → mitigated by cross-check (RISK-CI-05).

**Sources:** see the research agent's full source list (summarized): GitHub Docs (Dependabot, CodeQL query suites, About GHAS, secret-scanning, push-protection, dependency-review-action, artifact attestations, Actions billing, protected-branches, GitHub products), GitHub Blog (push-protection GA, attestations GA, default-setup scheduled scans, CodeQL v3 deprecation, Actions SHA-pinning policy Aug 2025, arm64 runners Jan 2026, 2026 pricing changes), community discussions (#189054, #174400, #198686, #182186, #190621), ossf/scorecard-action, gitleaks repo, google/osv-scanner, Anchore/Syft, Vitest coverage docs, npm sbom docs, cdxgen, Snyk plans, Codecov pricing, Wiz/StepSecurity Actions-hardening guides.

## §2. Skills and workflows used / unavailable

| Skill/workflow | Used | Purpose |
|---|---|---|
| `archestimator-plan-pack` | yes | plan-pack convention + loop contract |
| Explore agent (×1) | yes (emulated lane) | CI/codebase inventory (`03` §1-5) |
| Explore agent (×1) | yes (emulated lane) | sibling-pack/roadmap inventory (`03` §6-7) |
| general-purpose agent (×1) w/ WebSearch | yes (emulated lane) | GitHub-native research (`19` §1) |
| `gitnexus` | **no** | CI/automation task, not symbol refactor; `rg`+reads sufficient (proportional graph policy) |
| `ultraqa`/`ultrawork`/`autopilot` | **no** (referenced for future impl) | planning-only task; future impl should use `autopilot` per directive |
| native subagents (for authoring) | **unavailable** | → `emulated` verification (cap 97) |

No skill was fabricated. No tool output was fabricated.

## §3. Critique-and-revision cycle summaries (exhaustive ≥ 2 cycles)

### R0 — Initial draft
Drafted from discovery + research: `00`-`19` + README.

### R1 — Adversarial pass (emulated reviewer)
Searched for missing/vague/contradictory content. **5 findings:**

| # | Finding (P-level) | Severity | Fix in R2 |
|---|---|---|---|
| R1-1 | No explicit **merge-vs-release policy table** — the brief explicitly requires "release blocking policy" but the draft scattered it | P0 | Added `13` §2 table (every gate row: blocks-merge? blocks-release? hatch? window? strict-env?) |
| R1-2 | No **escape-hatch taxonomy** — brief requires "local developer escape hatches" | P0 | Added `13` §3 hatch table + WP-3.2 `--help` |
| R1-3 | No **CI-minute cost estimate** — brief requires "CI runtime cost" | P0 | Added `09` §1 (per-run + frequency + monthly budget ~1,293 min; headroom ~707; cost levers) |
| R1-4 | No **coverage-ratchet mechanism** — a static threshold either blocks velocity or has no teeth | P1 | Added WP-4.3 `ratchet-coverage.mjs` (monotonic) + DEC-CI-07 advisory→strict |
| R1-5 | **CodeQL GHAS-license gap** unclear — draft implied CodeQL restore was Tier-A; research says it needs GHAS on private | P0 | Clarified SEC-CI-07 as Tier B; OPEN-CI-01; RISK-CI-08 as top residual |

All 5 resolved in R2 revision.

### R2 — Final verifier pass (emulated)
Requirement-by-requirement audit (`17`). Claimed "no contradictions" — **this claim was invalidated by R3** (the R2 emulated pass missed two load-bearing free-vs-paid errors in its own research matrix).

### R3 — Independent adversarial review (general-purpose agent, NOT the author)
A fresh adversarial reviewer found **3×P0 + 5×P1**, all reverifier-confirmed against GitHub Docs:

| # | Finding | Severity | Status |
|---|---|---|---|
| R3-1 | `actions/attest-build-provenance`/`attest-sbom` misclassified free on private-Free → requires GHEC | **P0** | FIXED: SEC-CI-04 split (04a Syft Tier A / 04c cosign OSS Tier A / 04b GitHub attestation Tier B OPEN-CI-06); DEC-CI-05 rewritten; ASSUMP-CI-05 corrected; `13` §3 runbook cosign path added |
| R3-2 | `dependency-review-action` misclassified free + phantom gate row (no req/task/test) → requires Code Security | **P0** | FIXED: SEC-CI-08 added (osv Tier-A substitute + dependency-review Tier B OPEN-CI-09); phantom row removed from `13` §2; DEC-CI-09 added; `11` WP-1.6 added |
| R3-3 | Cost model used 634 vitest files (actual 470) + conflated bun-test/vitest | **P0** (cost claim) | FIXED: `09` §1 recounted (470 files; bun+vitest separated; ~1,150 min/mo Tier A; ~42% headroom); marked DISCOVERY |
| R3-4 | Duplicate AC ID `AC-01o` | P1 | FIXED: renumbered AC-O1a/AC-O1b |
| R3-5 | `feat/**` trigger unmodeled | P1 | FIXED: WP-0.1 narrows restored trigger to `push:[main]` |
| R3-6 | Coverage floor missing (gate could ship near-no-op) | P1 | FIXED: AC-05e 40% floor + OPEN-CI-10 |
| R3-7 | gitleaks diff-mode specified but no task step | P1 | FIXED: WP-1.2 diff-mode sub-step + shallow-clone handling |
| R3-8 | advisory-DB-lag shadow-path missing | P1 | FIXED: `04` audit shadow-path cell |

**Lesson:** the emulated R2 pass trusted its own research matrix; a fresh adversarial agent caught the two most security-critical free-vs-paid cells were wrong. This validates the directive's maker/checker expectation and the R3 correction is now in the pack.

### R4 — Second independent adversarial review (Improve-Plan-Prompt step, general-purpose agent)
Under the Improve-Plan-Prompt's stricter adversarial lens, a fresh reviewer found **5×P0 + 8×P1 + 7×P2** — all NEW (R3 issues not re-reported). All P0/P1 verified against the live repo:

| # | Finding | Severity | Status |
|---|---|---|---|
| R4-T1 | vitest file count STILL wrong — 650 (475 .test.ts + 175 .test.tsx), not 470 (R3 dropped .test.tsx) → cost model undercounted | **P0** | FIXED: `09`/`03` recounted to 650; monthly ~1,286, headroom ~36% |
| R4-T2 | `--gitleaks-diff` flag does not exist in gitleaks → `--log-opts="<base>..HEAD"` is the correct mechanism | **P0** | FIXED: `04` AC-03d, `11` WP-1.2 |
| R4-T3 | osv-scanner is a Go binary (not `bunx`), AND cannot parse `bun.lock` (issue #1405) → dep-diff gate as specified cannot run | **P0** | FIXED: `11` WP-1.6 (scan package.json/SBOM), `18` §2 |
| R4-T4 | Syft/cosign/gitleaks are all Go binaries, not npm devDeps → `bunx` framing + `bun audit` coverage claim wrong | **P0** | FIXED: `18` §4 reframed; OPEN-CI-05 reframed; tool-manifest.json + PROOF-10 (RISK-CI-17) |
| R4-MA1 | `16` did not use the mandated 11-col traceability schema + source-strength | **P0** | FIXED: `16` rewritten |
| R4-MA2 | `12` did not use the mandated proof-contract schema (missing red/green, cleanup/skip) | **P0** | FIXED: `12` §2 rewritten as PROOF-01..12 |
| R4-T5 | launch-gate artifact contract is one-sided (consumer reader doesn't exist; DOM-55 is missing-evidence) | P1 | FIXED: `06` §4 / `13` §4 labeled PROPOSED; RISK-CI-19; WP-6 downgraded |
| R4-T6 | "blocks release" is aspirational — conditional on BOTH branch-protection AND launch-gate reader | P1 | FIXED: `13` §4 honesty; `17` deficiency |
| R4-T7 | `feat/**`→`[main]` trigger narrowing is a silent behavior change | P1 | FIXED: OPEN-CI-11; `02` C8 |
| R4-T8 | smoke gate lifecycle under-specified (port range, retries, boot-timeout, child-kill) | P1 | FIXED: `11` WP-1.5 lifecycle spec |
| R4-T9 | supply-chain-toolchain-manifest.test.ts mis-described (only asserts packageManager; won't red) | P1 | FIXED: `10`/`03` §2.3; WP-5 creates tool-manifest.json instead |
| R4-T10 | cosign keyless needs `id-token: write` (not specified) + fork-safety | P1 | FIXED: `11` WP-2.1 permissions |
| R4-MA3 | no Attack Surface Inventory in `08` | P1 | FIXED: `08` §1b added |
| R4-MA4 | no per-document scorecard in `17` | P1 | FIXED: `17` per-doc table |
| R4-MA6 | impl units incomplete vs mandated unit spec | P1 | PARTIAL: WP-1.1/1.3/1.5/1.6 expanded; blanket-rollback noted |
| R4-T11..T15, MA5/7 | (P2) coverage-include note, per-run cost basis, ADV-09 soften, independence headline, AC testability, allowlist spec | P2 | FIXED in this R4 pass (see docs) |

**Lesson (R4):** the R3 "470 files" fix repeated the original error's shape (undercount) by dropping `.test.tsx`; the `bunx` assumption for Go binaries was a model-memory leak (osv/Syft/cosign/gitleaks are not npm packages). The Improve-Plan-Prompt's mandated-schema requirement (traceability, proof-contract) caught two structural gaps the Creating-Plan pass had filled with near-miss schemas. After R4, the remaining deficits are external owner-decisions or load-bearing technical claims that require real implementation to verify (AC-02d override-honoring; measured cost/coverage).

## §4. Adversarial QA matrix (UltraQA-style)

See `12` §3 (ADV-01..17). Covers: missing tools, schema drift, secret detection, allowlist, coverage drop, auth-regression, boot failure, concurrency, fork-PR safety, missing lockfile, empty manifest, false-positive storm, unpinned action, broad permissions, ratchet-tamper, secret-in-report.

## §5. Performance evaluator contract

See `09` §2 + `12` §4. Baselines are DISCOVERY-REQUIRED (measure at WP-4.1/WP-1). Targets set with margin from estimates.

## §6. Independent final verifier evidence

`emulated` (see `17`). The active-search list in `17` was completed; no internally-resolvable critical gap found.

## §7. Explicit validation gaps (residual)

| Gap | Why | Risk | Unblock |
|---|---|---|---|
| Real CI run not performed | planning-only (no workflow created) | YAML/step errors at first run | WP-2 first PR |
| Measured CI minutes | planning estimate (R4: 650 files / ~1,286 min / ~36% headroom) | ±20% on actual | first month billing |
| Coverage baseline number | not measured | threshold is a guess (floor-guarded AC-05e) | WP-4.1 DISCOVERY |
| CodeQL (Code Security) run | no Code Security license | SAST gap (RISK-CI-08) | OPEN-CI-01 |
| GitHub attestation | no GHEC | provenance uses cosign OSS path instead (SEC-CI-04c) | OPEN-CI-06 |
| dependency-review action | no Code Security | osv-scanner substitute instead (SEC-CI-08) | OPEN-CI-09 |
| Branch-protection enforcement | no Pro | merge not enforceable | OPEN-CI-04 |
| Independent (non-emulated) review | no native reviewer in session | readiness capped 97 | owner/independent review |

## §8. Research shaped which plan decisions

Per directive: research is not a detached appendix.
- `19` §1 free-vs-paid matrix → **DEC-CI-01** (Tier A/B model), the plan's spine.
- gitleaks-fills-GHAS-gap → **DEC-CI-02**.
- branch-protection-needs-Pro → **OPS-CI-01** conditional merge-blocking + OPEN-CI-04.
- attestation-free → **DEC-CI-05** provenance in Tier A.
- Vitest-include-gotcha → **WP-4.2** include scoping.
- CodeQL-v3-deprecation → **WP-2.3** re-verify SHA.

Every research finding that materially shapes a decision is cited at the decision (`15`) or task (`11`).

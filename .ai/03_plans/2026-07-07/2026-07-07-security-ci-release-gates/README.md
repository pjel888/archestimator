# Security CI & Release Gates — Plan Pack

**Date:** 2026-07-07 (Asia/Manila)
**Plan folder:** `.ai/03_plans/2026-07-07-security-ci-release-gates/`
**Mode:** `planning-only` (no application code, tests, migrations, schemas, infra, or config changed)
**Plan profile:** `exhaustive`
**Suite label mapping:** `IMPLEMENTATION-READY`↔GO-implement, `CONDITIONALLY READY`↔named-slices-only, `NOT READY`↔no-impl. (Old aliases: `READY`→`IMPLEMENTATION-READY`, `READY WITH EXTERNAL DECISIONS`→`CONDITIONALLY READY`.)

## Plan status: `CONDITIONALLY READY`

The **Tier-A free slice is implementation-ready in design** (exact paths, commands, thresholds). Overall status is `CONDITIONALLY READY` (overall readiness **93**) because: (a) `verification_mode: emulated` (authoring + revision same session; two independent adversarial passes R3/R4 raise content confidence but do not lift the 97 cap); (b) several gates are external owner-decisions (`OPEN-CI-01..06, 09..11`, inherited `OPEN-LG-05/06`); (c) two measured baselines (CI cost, coverage) are DISCOVERY-REQUIRED; (d) AC-02d (`bun audit` override-honoring) is load-bearing and unverified until WP-1.1's plant-and-verify; (e) the launch-gate reader doesn't exist yet (RISK-CI-19). See `17`.

## What this pack delivers (the planning outcome)

A **two-tier, GitHub-Free-friendly security CI + release gate** for Archestimator:

- **Tier A (free, implementation-ready):** restore CI; add `bun audit` (dep-vuln), `gitleaks` (secret-scan), Syft SBOM + cosign OSS provenance (the free Sigstore path; GitHub attestation is Tier B), osv-scanner PR dep-diff (Tier-A substitute for the paid dependency-review action), Vitest coverage threshold (ratcheted, 40%-floor-guarded), route smoke (DAST-like); consolidate into one `bun run security:gate` verdict.
- **Tier B (owner-decision, paid):** CodeQL SAST (GHAS), GitHub native secret scanning (GHAS), OpenSSF Scorecards (GHAS), branch-protection/ruleset enforcement (GitHub Pro $4/mo).
- **Policy:** explicit merge-vs-release table, escape hatches, advisory→blocking ratchet, CI cost (~1,286 of 2,000 free min/mo, R4-corrected), artifact retention, and mapping to the `launch-readiness-evidence-gate` GO/NO-GO (closes `OPEN-LG-05`/`OPEN-LG-06` CI slices).

An executor can build the Tier-A gate from this pack **without re-discovering** the CI state, the GitHub free-vs-paid matrix, or the launch-gate integration contract.

## The load-bearing constraint (read first)

**The repo is private on GitHub Free.** This single fact determines the Tier A/B split (`19` §1, R3-corrected). On private-Free:
- **Free:** Dependabot (alerts/sec/version updates), gitleaks, osv-scanner, Vitest coverage thresholds, **Syft SBOM**, **cosign OSS provenance (Sigstore/Rekor)**, `bun audit`, the dependency **graph**.
- **Paid (GitHub Code Security, $30/committer/mo):** CodeQL code scanning, **dependency-review action**, OpenSSF Scorecards.
- **Paid (GitHub Secret Protection, $19/committer/mo):** native secret scanning + push protection.
- **Paid (GitHub Enterprise Cloud):** Artifact Attestations (`actions/attest-*`) — **not free on private-Free** (R3 correction).
- **Paid (GitHub Pro $4/mo):** branch protection / rulesets (merge-gate *enforcement*).

The pack does **not** assume GitHub-native === free. **R3** caught two misclassifications (attestation, dependency-review); **R4** (Improve-Plan pass) caught a wrong file-count/cost model (650 vitest files, not 470), a non-existent gitleaks flag, and that osv/Syft/cosign/gitleaks are Go binaries (not `bunx` devDeps) and osv can't parse `bun.lock`. All corrected. See `19` §3. `verification_mode: emulated` — two independent adversarial passes (R3, R4) raise content confidence but authoring+revision were same-session, so the 97 cap stands; a real independent/owner review is needed for `IMPLEMENTATION-READY`.

## Implementation start document

**`11_IMPLEMENTATION_PLAN.md`** — phased (WP-0..7), dependency-aware, exact target paths per task.

### Phase order & dependency graph

```
WP-0 (restore CI + SECURITY.md + scripts + fix tests) ─┐
                                                        ├─► WP-1 (5 gate modules) ─► WP-2 (security-gates.yml) ─┐
OPEN-CI-05 (devDeps) ───────────────────────────────────┤                                                          ├─► WP-5 (tests) ─► WP-6 (launch-gate integration) ─► WP-7 (docs)
                                                        └─► WP-4 (coverage + ratchet) ──────────────────────────┘
                                                                                              WP-3 (aggregator) ◄─ WP-1 + WP-4
```

- WP-0, WP-4 are **parallel-safe** (disjoint files) once OPEN-CI-05 is decided.
- WP-1 gate modules are **parallel-safe** (disjoint files).
- WP-2 → WP-3 → WP-5 → WP-6 → WP-7 sequential.

## Requirements / task / test traceability

- Requirements: `04` (SEC-CI-01..07, OPS-CI-01..02, ARCH-CI-01..02, DOC-CI-01, TEST-CI-*, UX-CI-*, A11Y-CI-*, TM-CI-*).
- Traceability matrix: `16`.
- Test execution matrix: `12` §2.
- Adversarial matrix: `12` §3 (ADV-01..17).
- Implementation tasks: `11` (WP-0.1..7).

## Blocked decisions table (external)

| ID | Decision | Owner | Cost | Unblocks |
|---|---|---|---|---|
| OPEN-CI-01 | Enable GitHub Code Security for CodeQL SAST | owner | $30/committer/mo | Tier-B SAST (SEC-CI-07) |
| OPEN-CI-02 | Enable GitHub Secret Protection (secret scan + push protection) | owner | $19/committer/mo | native secret scan |
| OPEN-CI-03 | OpenSSF Scorecards | owner | (Code Security) | posture score |
| OPEN-CI-04 | GitHub Pro for branch protection/rulesets | owner | $4/mo | merge-gate enforcement (Stage 4) |
| OPEN-CI-05 | Approve Syft/coverage-v8/osv-scanner/cosign devDeps+binaries | owner | $0 | Tier-A SBOM + coverage + dep-diff + provenance |
| OPEN-CI-06 | GitHub Enterprise Cloud for Artifact Attestations | owner | $$$ | Tier-B GitHub attestation (cosign is Tier-A substitute) |
| (inherits OPEN-LG-05) | Re-enable CI + merge-gate strictness | owner | $0 | launch gate Phase 6 (CI slice closed by this pack) |
| OPEN-CI-09 | Code Security for dependency-review action | owner | $30/committer/mo | Tier-B dependency-review (osv is Tier-A substitute) |
| OPEN-CI-10 | Coverage floor decision (if baseline <40%) | owner | $0 | SEC-CI-05 strict promotion |
| (inherits OPEN-LG-06) | Resolve GitHub hosted sec 403/404 | owner/GitHub admin | $0/$$ | hosted-control slice (Tier-A substitutes provided) |

## Commands/checks to run before the first implementation edit

1. `git status --short --branch` (shared live worktree; check for concurrent agents).
2. `ls .github/workflows/` (confirm still disabled; if active, WP-0 already partial).
3. `bun run type-check` (clean baseline).
4. `bun audit` (confirm clean dep state before adding the audit gate).
5. `grep -n security:gate package.json` (confirm scripts not yet added).
6. Re-read `03` §1-2 (current CI state) and `19` §1 (free-vs-paid matrix — recheck GitHub pricing).
7. Re-read `13` §7 (stale-revalidation checklist).

## Files explicitly off-limits (for the implementation)

- Any file under `src/` (application code) — gates call over HTTP only.
- Any file under `migrations/` — no DB changes.
- `wrangler.jsonc`, `cloudflare-env.d.ts` — no binding changes.
- Any file under `.github/workflows-disabled/` — do not delete (owner archive; restore = *copy* to active).
- Historical Supabase project `ebxxqidacheyapmmzavr` and unrelated `archestimator` provider project — never.
- Any sibling security pack's files (`03` §7) — reference only.

## Files/systems intentionally unaffected

- Application runtime, React/Next.js, D1/R2/DO/Queue/Email/Images, Better Auth, TanStack Query, Zustand, Tailwind — all unaffected (build/CI tooling only).
- Sibling security surfaces (OWASP API authz, CSP, invite, share, AI safety, DSAR, retention) — referenced, not modified.

## External proof that remains required before production rollout

- Real CI run of `security-gates.yml` (planning-only; no workflow created here).
- Measured CI-minute cost (first month of billing).
- Measured coverage baseline (WP-4.1 DISCOVERY).
- `gh attestation verify` step before first production deploy (`13` §3).
- (Tier B) GHAS CodeQL run, branch-protection enforcement, hosted GitHub sec 403/404 resolution.

## Archive policy

Do not archive automatically. Archive only after the Tier-A slice lands (WP-0..5), the owner accepts the `security:gate` verdict for a release decision, and the launch-gate pack's `OPEN-LG-05`/`OPEN-LG-06` CI slices are closed. Tier-B items remain open until their `OPEN-CI-*` close.

## Document index

| Doc | Purpose |
|---|---|
| `00_AGENT_COORDINATION.md` | Master goal, ledger, authority, skills, workstreams |
| `01_EXECUTIVE_SUMMARY.md` | The pack in one read |
| `02_FEATURE_BRIEF_AND_SCOPE.md` | Brief, scope/non-goals, assumptions, constraints |
| `03_SOURCE_AND_CODEBASE_AUDIT.md` | Current CI + scripts + test infra + sibling packs + launch-gate integration |
| `04_REQUIREMENTS_SPECIFICATION.md` | SEC/OPS/ARCH/DOC/TEST/UX/A11Y/TM reqs + shadow-path matrix |
| `05_UX_UI_ACCESSIBILITY_PLAN.md` | CLI report UX + a11y (browser N/A justified) |
| `06_ARCHITECTURE_AND_TECHNICAL_DESIGN.md` | Current/target arch + gate design + artifact contract + alternatives |
| `07_DATA_DATABASE_API_NETWORK_PLAN.md` | DB N/A (justified); gate egress; artifacts |
| `08_SECURITY_PRIVACY_THREAT_MODEL.md` | Threats mitigated + threats TO the gates (TM-CI-01..10) |
| `09_PERFORMANCE_RELIABILITY_OBSERVABILITY.md` | CI cost estimate + evaluator + retention |
| `10_BLAST_RADIUS_AND_DEPENDENCIES.md` | Direct/transitive impact + impl dependency graph |
| `11_IMPLEMENTATION_PLAN.md` | **Execution guide** — WP-0..7 phased tasks |
| `12_TEST_AND_VALIDATION_STRATEGY.md` | Test matrix + ADV-01..17 + evaluator |
| `13_ROLLOUT_ROLLBACK_AND_OPERATIONS.md` | Staged ladder + **merge/release policy** + hatches + launch mapping |
| `14_RISK_REGISTER.md` | RISK-CI-01..15 |
| `15_DECISIONS_ASSUMPTIONS_AND_ALTERNATIVES.md` | DEC-CI-01..08 + OPEN-CI-* + ASSUMP-CI-* |
| `16_REQUIREMENTS_TRACEABILITY_MATRIX.md` | Req → task → test → rollout |
| `17_FINAL_READINESS_REVIEW.md` | Verification (emulated) + scores + caps |
| `18_STACK_CONTRACT_AND_PRODUCTION_STANDARDS.md` | CI/Bun/Vitest/tooling contract; app-stack N/A |
| `19_RESEARCH_REVIEW_AND_QA_EVIDENCE.md` | GitHub free-vs-paid research + critique cycles R1/R2 |
| `PROMPT.md` | (pre-existing) The original task brief |

## Stale-plan revalidation checklist (before relying on this pack)

- [ ] Re-confirm `.github/workflows/` state (still disabled?).
- [ ] Re-confirm GitHub plan tier (still Free private? → Tier model holds).
- [ ] Re-confirm `bun audit` clean (`15-dependency-advisory-triage.md` baseline).
- [ ] Re-confirm `OPEN-CI-05` (Syft/coverage-v8 not yet approved/added).
- [ ] Re-confirm sibling pack list (`03` §7) — new packs may have landed.
- [ ] Re-confirm `OPEN-LG-05`/`OPEN-LG-06` still open in launch-gate pack.
- [ ] Re-confirm CodeQL action v4 SHA + GHAS pricing (`19` §1).
- [ ] Re-confirm Artifact Attestations still free (`ASSUMP-CI-05`).

If any changed, update `03`/`06`/`11`/`19` before implementing.

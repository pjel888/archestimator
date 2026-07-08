# 00 — Agent Coordination

**Plan folder:** `.ai/03_plans/2026-07-07-security-ci-release-gates/`
**Date:** 2026-07-07 (Asia/Manila)
**Mode:** `planning-only`
**Plan profile:** `exhaustive`
**Verification mode:** `emulated` (no native independent reviewer available in this session; readiness caps apply — see `17`).

## Master goal

Define a **practical, proportional security CI + release-gate layer** for Archestimator that is implementable as a reviewable gate without re-discovery. The pack owns **automation + release policy** only; it deliberately does not re-litigate route/API authz, CSP, invite, share, or AI-safety surfaces (owned by sibling packs — see `03` §7).

### Outcome
A single, consolidated, two-tier security release gate (`bun run security:gate`, proposed) plus the CI workflow + branch-protection policy that feeds it, mapped to the `launch-readiness-evidence-gate` GO/NO-GO so that "is the build safe to release?" is answered by one command.

### Problem being solved
- `.github/workflows/` is **empty** — all four workflows (CI, CodeQL, Dependabot, React Doctor) were archived 2026-07-07 (`workflows-disabled/`).
- GitHub hosted security controls are **unavailable, not clean**: code scanning 403, Dependabot alerts 403, secret scanning 404 (`current-state.md` lines 40-42).
- No `SECURITY.md`, no secret-scanning config, no SBOM/provenance, no coverage thresholds, no consolidated release-blocking policy.
- The repo is **private on GitHub Free** — this gates which tools are free vs paid (see `19` §research matrix), and is the single most load-bearing constraint.

### Intended behavior
- Re-enabling CI restores: `validate` + `build` + perf-budget + E2E + lint:design (the existing `ci.yml`), **plus** consolidated security gates: dependency-vuln (`bun audit` + optional `osv-scanner`), secret scan (`gitleaks`), SBOM + provenance attestation, coverage threshold, and a DAST-like smoke.
- A clear policy says what **blocks merge** vs what **blocks release**, with documented escape hatches.
- All Tier-A gates are free; Tier-B gates (CodeQL SAST on private, GitHub native secret scanning, branch-protection enforcement) are owner-decisions marked explicitly.

### Planning scope
- CI workflow(s), scripts under `scripts/`, `package.json` scripts, `.github/` config, `vitest.config.ts` coverage block, SBOM/attestation, release-gate aggregation script.

### Non-goals
- Route/API authorization, CSP nonce pipeline, invite hardening, share minimization, AI safety, DSAR/retention — all owned by sibling packs (referenced, not redefined).
- Migrating off Cloudflare, changing `wrangler.jsonc` bindings, application code changes, DB migrations.
- Enabling any paid GitHub plan, GHAS, or third-party paid scanner (left as owner-decision; the pack must be valuable on GitHub Free alone).

### Required codebase analysis (done — see `03`)
- Current CI state, package scripts, test infra, Cloudflare config, existing automation tests, sibling security packs, launch-readiness-evidence-gate integration.

### Implementation-readiness criteria
- Every Tier-A gate has an exact file path, command, pass/fail threshold, and CI step. Every Tier-B gate is marked owner-decision with the plan/feature it unblocks. The pack is `IMPLEMENTATION-READY` for the Tier-A slice; `CONDITIONALLY READY` overall because branch-protection enforcement (Tier B) and live hosted verification are external.

### Validation criteria
- Tier-A gates runnable locally via `bun run security:gate`; CI workflow YAML syntactically valid and proportional to `VALIDATION_MATRIX.md`; escape hatches documented; runtime-cost estimate within free-tier.

### Final planning deliverables
- This numbered pack (`00`–`19` + `README.md`), with stable requirement/decision/risk IDs, traceability matrix, and a final readiness review.

## Authority model (when sources conflict)

1. User intent / PROMPT.md — product goal.
2. Current repo source + `AGENTS.md` + `current-state.md` + `wrangler.jsonc` — implementation reality.
3. Official GitHub/Vitest/Syft docs (2026) — version-sensitive behavior (researched in `19`).
4. Older plans / model memory — lower authority; do not overrule current source.

Key reconciliation: the PROMPT.md says "prefer existing tooling and GitHub-native checks" — but **the single most important research finding** (`19`) is that on a private GitHub-Free repo, CodeQL, native secret scanning, Scorecards, and branch-protection enforcement are **not free**. The pack therefore distinguishes a fully-free Tier-A path from owner-decision Tier-B gates rather than silently assuming GitHub-native === free.

## Document authority + dependency map (mandated by Improve-Plan-Prompt §PHASE-1)

| Doc | Authority level | Primary/derived | Depends on | Depended on by |
|---|---|---|---|---|
| `PROMPT.md` | highest (user intent) | primary | — | all |
| `README.md` | entry (index of the pack) | derived | all | implementer |
| `00` (this) | coordination | derived | PROMPT, AGENTS | lanes |
| `01` exec summary | derived | all | `README`, others |
| `02` scope | primary (scope/non-goals/constraints) | PROMPT, `03` | `04`, `11`, `15` |
| `03` source audit | primary (repo evidence) | repo files, sibling packs | `06`, `11`, `16` |
| `04` requirements | primary (reqs + AC + shadow paths) | PROMPT, `03`, `19` | `11`, `16` |
| `05` UX/a11y | derived (CLI surface) | `04` (UX/A11Y reqs) | `11` WP-3 |
| `06` architecture | primary (design + artifact contract) | `03`, `04`, `19` | `11`, `13` |
| `07` data/API/network | primary (boundary + N/A) | `03` | `11` |
| `08` security/threat | primary (threat model + attack surface) | `04`, `06` | `14`, `12` |
| `09` perf/cost | primary (CI cost + evaluator) | `03`, `19` | `13`, `17` |
| `10` blast radius | primary (impact + impl graph) | `03`, `06`, `11` | `11` |
| `11` impl plan | primary (execution guide) | `04`, `06`, `10` | implementer |
| `12` test/QA | primary (proof contracts + adversarial) | `04`, `11` | implementer |
| `13` rollout/ops | primary (policy + runbook) | `06`, `09`, `11` | implementer |
| `14` risk register | primary (risks) | all | `17` |
| `15` decisions | primary (ADRs + OPEN-CI + assumptions) | `19`, `04` | `17`, `README` |
| `16` traceability | derived (matrix) | `04`, `11`, `12` | `17` |
| `17` readiness review | derived (scores + verification) | all | `README` |
| `18` stack contract | primary (tooling contract) | `03`, `19` | `11` |
| `19` research/QA | primary (research + critique cycles) | external docs, repo | `15`, `17` |
| `LOOP_LEDGER` | coordination log | lanes | — |

## Specialist workstreams (all `emulated` as separated passes; no native subagents were launched)

| Lane | Mode | Output |
|---|---|---|
| Lead coordinator / synthesizer | emulated | This pack |
| CI/codebase inventory | emulated (Explore agent) | `03` §1–6 |
| Existing-security-pack inventory | emulated (Explore agent) | `03` §7 |
| GitHub-native security research | emulated (general-purpose agent w/ WebSearch) | `19` research matrix |
| Product/scope | emulated | `02`, `04` |
| Architecture/design | emulated | `06` |
| Security/privacy/threat model | emulated | `08` |
| Performance/CI-cost | emulated | `09` |
| Blast-radius | emulated | `10` |
| Implementation planner | emulated | `11` |
| Test/QA | emulated | `12` |
| Rollout/ops | emulated | `13` |
| Risk/decisions | emulated | `14`, `15` |
| Traceability | emulated | `16` |
| Adversarial reviewer | emulated | `19` §3 |
| Final verifier | emulated | `17` |

**No native subagents were launched for authoring.** Two Explore/general-purpose agents were used for read-only discovery + web research only (their outputs are summarized in `03` and `19`; they did not author pack docs).

## Coordination ledger

| Lane | Goal | Owned scope | Dependencies | Current work | Findings | Decisions/rejected | Conflicts | Validation evidence | Status |
|---|---|---|---|—|—|—|—|—|---|
| CI inventory | Map current CI + scripts + test infra | `.github/`, `package.json`, `vitest.config.ts`, `playwright.config.ts` | none | done | All 4 workflows archived; no coverage; no security scripts | — | none | file reads | COMPLETE |
| Sibling-pack inventory | Map existing security/release plans | `.ai/03_plans/`, `.ai/01_roadmap/`, `.ai/17_InfoSec/` | none | done | 8 sibling security packs; launch-readiness-evidence-gate is integration target | Defer to siblings; integrate into launch gate | none | file reads | COMPLETE |
| GitHub research | Free vs paid matrix 2026 | GitHub docs, OSS tool docs | none | done | Initial: CodeQL/secret-scan/branch-protect NOT free on private Free; Dependabot/gitleaks/osv/Vitest ARE free. **R3-corrected (see `19` §3): attestations also NOT free (GHEC); dependency-review also NOT free (Code Security).** | Two-tier model (DEC-CI-01) | none | cited URLs | COMPLETE |
| Architecture | Design gate + workflow + policy | `06`, `11` | inventories + research | done | Two-tier gate; consolidate into `security:gate`; merge vs release policy | — | none | — | COMPLETE |
| Adversarial | Find gaps/contradictions | whole pack | draft | done | 5 findings (see `19` §3), all resolved in revision R2 | — | none | — | COMPLETE |
| Final verifier | Requirement-by-requirement audit | whole pack | revised pack | done | see `17` | — | none | — | COMPLETE |

## Skills discovered / used

| Skill | Used? | Why |
|---|---|---|
| `archestimator-plan-pack` | yes | Binds the dated-pack + LOOP_LEDGER convention and the loop contract |
| `Creating-Plan-Prompt.md` | yes | Authoritative structure for this exhaustive pack |
| `Multi-Agent-Execution-Directive.md` | yes | Authority model, verification labels, completion gates |
| `gitnexus` | no | This is a CI/automation planning task, not a code-symbol refactor; `rg` + targeted reads were sufficient (proportional graph policy in `AGENTS.md`) |
| `ultraqa` / `ultrawork` / `autopilot` | no (referenced as the future-implementation loop shape in `11`/`13`) | Planning-only task; the *future* implementation should use `autopilot` shape per the directive |
| `wrangler` / `cloudflare` | no | No binding/wrangler change planned |

No skills were fabricated. Unavailable native-subagent delegation is recorded as `emulated`.

## Stop condition

Pack complete when: security automation is specified as a reviewable, proportional release gate — every Tier-A gate has exact path/command/threshold, every Tier-B gate is owner-decision-marked, escape hatches + cost + retention + launch mapping are defined, and the readiness review passes its gates. **Met** (see `17`).

## Loop iterations

- **R0**: draft from discovery + research (suite step 1, Creating-Plan).
- **R1**: adversarial pass found 5 findings (see `19` §3): missing merge-vs-release policy table, missing escape-hatch taxonomy, missing CI-minute cost estimate, missing coverage-ratchet mechanism, CodeQL license gap unclear. All resolved.
- **R2**: final verifier pass (`17`); claimed clean but missed two load-bearing free-vs-paid errors.
- **R3**: independent adversarial pass caught 3×P0 (attestation-GHEC, dependency-review-Code-Security, 634-vs-470 file count) + 5×P1. All resolved.
- **R4** (suite step 2, Improve-Plan): independent adversarial pass caught 5×P0 (650 not 470 file count, nonexistent gitleaks flag, osv-can't-scan-bun.lock, Go-binaries-not-bunx, non-conformant traceability/proof-contract schemas) + 8×P1 + 7×P2. All resolved.
- **R4-verify**: independent final verifier (fresh third pass) confirmed `CONDITIONALLY READY` (93), no P0; minor stale-number propagation fixed.

Iteration cap (3–6) not reached; stopped on proven pass against acceptance criteria for the internally-resolvable scope. Remaining items are external owner-decisions or load-bearing claims requiring real implementation to verify (AC-02d).

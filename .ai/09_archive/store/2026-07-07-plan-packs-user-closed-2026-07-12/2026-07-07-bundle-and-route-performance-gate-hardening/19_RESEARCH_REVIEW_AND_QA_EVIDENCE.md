# Research, Review, and QA Evidence

## Research questions and sources

| Question | Primary source | Finding | Plan decision shaped |
|---|---|---|---|
| What bundle diagnostics does Next 16 emit? | `scripts/check-performance-budgets.mjs:1-12` + `:42-55` | `.next/diagnostics/route-bundle-stats.json`, array of `{ route, firstLoadChunkPaths }` | DEC-02 (per-route budgets feasible) |
| Are there one or two route-transition budget systems? | `e2e/route-transition-performance-budgets.json` + `scripts/check-route-transition-readiness.ts:145-170` | Two, with different values/scope | DEC-03 (reconcile) |
| Is the hosted verifier safe (credential-free)? | `scripts/verify-cloudflare-hosted-performance.ts:23-24,153-176` | Yes; rejects localhost/private; fake token | SEC-01 |
| Is the CI bundle gate blocking today? | `.github/workflows/ci.yml:26-36` | No; advisory with `continue-on-error` + secret-gated strict | DEC-01, PERF-02 |
| Do authed route-transition scenarios run in CI? | `e2e/route-transition-performance.spec.ts:345-349` | No; skipped without bypass/storage-state | PERF-04, OPEN-PERF-02 |
| What did older `current-state.md` entries say about hosted perf? | `.ai/10_state/current-state.md:2836,2329+` | Route contracts pass; some public p95 location-sensitive; aggregate readiness workbook-owned | PERF-06 posture |

No external/web research was required; all answers came from repo evidence. Official-doc research was not needed because the brief is about wiring existing repo tooling, not framework/provider behavior changes.

## Skills and workflows used or unavailable

- **Used (as reference, not executed):** `AGENTS.md` (proportional verification), `Creating-Plan-Prompt.md` (exhaustive contract), `Multi-Agent-Execution-Directive.md` (evidence classes), sibling transition/loading UX plan.
- **Informed structure but not executed:** `performance-goal` (evaluator contract shape), `ultraqa` (adversarial matrix shape).
- **Unavailable / not needed:** no runtime tool execution required for a planning-only task. No subagent launched (emulated lanes).

## Specialist workstream outputs (emulated)

| Workstream | Output | Evidence |
|---|---|---|
| Performance/Reliability | Evaluator contracts E1–E4, budget tables | `09_*.md` |
| CI/Ops | Layer posture, advisory→blocking | `09_*.md` §1, `13_*.md` |
| Source audit | Script/route/CI inventory | `03_*.md` |
| Security | Threat model, credential taxonomy | `08_*.md`, `07_*.md` |
| Adversarial review | Matrix below + critique cycle | this doc |
| Final verifier (emulated) | Requirement audit | `17_*.md` |

## Critique-and-revision cycle summaries

**Cycle 1 (initial draft → self-critique):**
- Found: initial draft implied hosted p95 should be in CI; corrected to pre-release (DEC-01).
- Found: initial bundle section did not distinguish Tier-A vs Tier-B; added §3b/3c split.
- Found: flake policy was implicit; made explicit (PERF-07).
- Found: did not address "don't default to browser automation"; added evidence-class table in `12_*.md`.

**Cycle 2 (targeted, post-critique):**
- Found: DEC-03 risk of split-brain if migration is partial; added RISK-05 + atomic-migration note.
- Found: missing credential-material taxonomy for the auth fixture; added to `07_*.md`.
- Found: Tier-B proposed values were asserted without a derivation; added the headroom formula and owner-gating (OPEN-PERF-04).
- Found: no explicit "gate tightening must not incentivize UX removal" constraint; added to `05_*.md`.

**Cycle 3 (final consistency):**
- Cross-checked budget values across `03/04/09/13/16` — consistent.
- Confirmed every requirement has Phase/Task/Test/Rollout in `16_*.md`.
- Confirmed status is `CONDITIONALLY READY` with emulated cap and four OPEN decisions.

Three meaningful cycles completed; remaining gaps are genuinely external (owner decisions, independent reviewer).

## UltraQA-style adversarial scenario matrix

| ID | User/attacker model | Scenario | Setup | Command/harness | Expected signal | Status |
|---|---|---|---|---|---|---|
| ADV-01 | PR author whose code regressed bundle | Per-route bundle over budget (strict) | Build with heavy route | `check-performance-budgets.mjs --strict` | Exit 1; route flagged | specified (future test) |
| ADV-02 | Noisy CI runner | Single-run route-transition spike | Tier-B harness, RUNS=3 | `perf:measure-routes` + `perf:check-routes` | median within budget, max over → not a fail (improvement fallback) | specified |
| ADV-03 | Broken build | `route-bundle-stats.json` missing | No build before gate | `check-performance-budgets.mjs --strict` | Exit 1 (strict) / SKIP (advisory) | specified (current behavior) |
| ADV-04 | Broken diagnostics | Partial-read chunk | Unreadable chunk path | same | `partialReadRoutes` warning/fail | specified (current behavior) |
| ADV-05 | Auth fails mid-measure | Authed scenario, storage-state expired | Tier-B harness | `perf:measure-routes` | Scenario failure recorded; not silent pass | specified |
| ADV-06 | Hosted route-contract fail | Required probe non-200 | Hosted verifier | `cf:verify-hosted-performance` | `routeContractReady=false`; exit 1 | specified (current behavior) |
| ADV-07 | Hosted p95 miss (location) | `features` p95 > 200 ms from far location | Hosted verifier | same | `p95BudgetMisses` listed; watch-grade | specified |
| ADV-08 | Budget map missing a route | New route added, map not updated | Build new route | `check-performance-budgets.mjs` | Warn + use backstop (specified behavior) | specified |
| ADV-09 | Concurrent agent edits budgets file | Two agents edit `route-transition-performance-budgets.json` | Multi-agent repo | coordination ledger + `git diff --check` | Detect conflict; serialize | specified (`10_*.md`) |
| ADV-10 | Owner-flips strict mid-window | `PERF_BUDGET_STRICT` toggled | CI secret change | CI run | Documented promotion path | specified |
| ADV-11 | Dev-auth bypass secret leaked | Insider exfiltrates CI secret | CI secret access | code refuses non-local host | Blast radius localhost-only | specified (SEC-RESIDUAL-01) |
| ADV-12 | SSRF via hosted base URL | Insider sets internal URL | env override | verifier rejects private/non-https | Exit at validation | specified (current behavior) |

## Performance evaluator contract

Captured in `09_*.md` §2 (E1–E4). Each has baseline, target, command, fixture, runs/flake, threshold, related tests, artifact.

## Independent final verifier evidence

Emulated pass recorded in `17_*.md`. No independent reviewer output exists. Cap applied.

## Explicit validation gaps

- No live Phase-0 baseline (future work).
- No independent reviewer.
- Hosted location-sensitivity is historical, not freshly measured.
- Authenticated Tier-B in CI depends on OPEN-PERF-02.

## Cleanup / artifacts

- This planning pass created only plan-folder Markdown files. No temp files, harnesses, fixtures, logs, or provider state. Nothing to clean up.

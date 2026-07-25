# Validation Matrix

## Contract

Every change is automatically classified `Q0_CONTRACT_ONLY`,
`Q1_CHANGE_GATE`, `Q2_CRITICAL_CHANGE_GATE`, or `Q3_RELEASE_GATE`. The selected
profile is a floor: paths, affected flows, uncertainty, or release intent may
escalate it and no agent may lower it. Standing authorization for local quality
evidence and the no-gaming/fail-closed rules are defined in
`.ai/00_system/BETA_QUALITY_ENGINEERING_PROTOCOL.md`.

## Profile Matrix

| Profile | Selection | Required evidence |
|---|---|---|
| `Q0_CONTRACT_ONLY` | True prose/comments/diagrams with no executable, generated, workflow, adapter, threshold, or gate behavior | Relevant contract/schema/link validators; contradiction and active legacy-policy scan; proof no executable/generated behavior changed; `git diff --check` |
| `Q1_CHANGE_GATE` | Default for noncritical production, test, config, build, or generated behavior | Type/static/lint; focused unit/regression evidence; applicable component/route/contract/integration/property evidence; changed-code coverage; build/dry-run when compilation or config changes; acceptance scenarios for business behavior; browser and accessibility evidence for UI behavior; no skips, flakes, weakening, or unauthorized exclusions |
| `Q2_CRITICAL_CHANGE_GATE` | Critical/uncertain paths or flows and all quality-system changes | All applicable Q1 evidence; full relevant suite; denial/abuse/boundary/failure/recovery cases; Workers-runtime integration when applicable; changed/critical mutation; 100% critical changed-branch coverage; mapped security checks; migration/restore or fix-forward rehearsal for data changes; applicable concurrency/idempotency/fault evidence; cross-browser/device proof for critical journeys; independent quality review and security review when applicable; zero unresolved high/critical findings or high-risk mutants |
| `Q3_RELEASE_GATE` | Release candidate, production release decision, or main release workflow | Q2 across release scope; full unit/component/integration/BDD/a11y/E2E and browser/device matrix; comprehensive policy-defined mutation; performance/resource budgets; dependency/supply-chain and supported provenance evidence; migration/restore rehearsal; observability readiness; authorized hosted/provider readback needed for the claim; signed release manifest; no expired waiver or S0/S1 defect |

Quality contracts, agent instructions, adapters, classifiers, thresholds, risk
maps, test configuration, gate scripts, and workflows are always at least
`Q2_CRITICAL_CHANGE_GATE`, even when represented as text.

## Classification

The classifier evaluates the entire merge-base-to-worktree diff, path rules,
and affected GitNexus flows when available. It records all reasons and selects
the maximum profile. Unknown paths, missing or malformed inputs, classifier
errors, or uncertainty select `Q2_CRITICAL_CHANGE_GATE`.

Ownership affects attribution, not evidence. Required whole-worktree evidence
includes inherited dirty paths; task-owned and overlapping paths are reported
separately with exact hashes.

## Evidence Rules

- Evidence must be fresh, executable, capable of failing, and mapped to an
  acceptance or critical-capability ID.
- Defect work captures red-before-green when feasible. New behavior supplies
  pre-implementation red, a negative fixture, or equivalent mutation evidence.
- Missing, stale, malformed, skipped, cancelled, flaky, focused, or incomplete
  required evidence fails closed.
- Local evidence cannot prove hosted or production behavior. Required external
  proof without authority yields `QUALITY_BLOCKED`.
- A reviewed noncritical baseline may ratchet identified legacy debt. Any new
  identity/count increase, expired review, critical/unknown/unhandled debt, or
  infrastructure/collection failure fails.
- Rerun only evidence invalidated by later edits, but never omit a required
  profile layer.

## Review And Final Verdict

`Q2` requires an independent read-only quality review. Security/auth/data-
boundary changes also require a distinct read-only security review. `Q3`
requires a read-only release-gate decision. Authors cannot independently approve
their own surface.

The aggregate manifest reports `PASS`, `FAIL`, or `QUALITY_BLOCKED`.
Completion requires `PASS`; `QUALITY_BLOCKED` is an honest terminal result only
for an exact protected external/ownership boundary after safe local work is
complete. Final reports name the profile, commands, results, reports/hashes,
coverage and mutation metrics, reviews, unavailable evidence, and remaining
risk. Never claim uncollected evidence.

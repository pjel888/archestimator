# UNIT-006 — Establish controlled-beta release-gate ritual + deployment provenance

## Goal

Convert the release-gate definition (`artifacts/release-gate.json`) into an
operator-executed ritual that runs before each cohort wave, captures the
deployed Worker SHA, and produces an auditable release receipt. This is the
operator-facing counterpart to the engineering CI work now owned by
`.ai/03_plans/2026-07-31/Code-Improvement/` (historical Quality Master UNIT-002
and Infosec UNIT-012).

## Source findings / requirements

- `OPS-RELEASE-GATE-004` (High) — release-gate ritual not yet executed
- `OPS-DEPLOY-005` (Medium) — hosted deployment provenance unverified
- `OPS-WORKERS-DEV-009` (Medium) — cross-reference
  `.ai/03_plans/2026-07-31/Code-Improvement/` (historical Infosec UNIT-002)
- `REQ-006` (CORE)
- `REQ-007` (CORE)

## Dependencies

- UNIT-001, UNIT-002, UNIT-003 must resolve their NO_GO items first
- AUTH-001 resolution (wrangler login) for deployment SHA capture

## Owned paths / resources

- `artifacts/release-gate.json` — authoritative gate definition + receipt template
- `artifacts/deployment-provenance.md`
- `artifacts/recovery-scenario-matrix.csv`

## Non-goals

- CI activation (current authority `.ai/03_plans/2026-07-31/Code-Improvement/`;
  historical Infosec UNIT-012)
- CI truthful-claims engineering (current authority
  `.ai/03_plans/2026-07-31/Code-Improvement/`; historical Quality Master
  UNIT-002)
- Public self-service release gates (this is controlled-beta only)
- `workers_dev:false` remediation (current authority
  `.ai/03_plans/2026-07-31/Code-Improvement/`; historical Infosec UNIT-002)

## Implementation boundary

Operator-driven actions before each cohort wave:

1. `bunx wrangler deployments list --env prod` — capture latest deployed
   version + source SHA.
2. `bun run cf:check-latest-deploy-source-smoke` — smoke-prove the deployed
   source matches.
3. Run `bun run cf:release-gates` (or equivalent) and capture the result JSON.
4. Walk every item in `release-gate.json`:
   - Verify all `NO_GO_items` are resolved.
   - Verify each `CONDITIONAL_items` has an accepted mitigation.
   - Verify the `GO_items_already_satisfied` list still holds.
5. Populate `release_receipt_template`:
   - `admit_timestamp`, `cohort_size`, `baseline_sha` (this audit's HEAD),
     `deployed_worker_sha`, `d1_migration_head`, `applied_migrations_verified`,
     `alerts_verified_scenarios`, `oauth_roundtrip_account`,
     `hosted_probe_results` (path), `no_go_items_resolved`,
     `conditional_items_accepted`, `decision`.
6. If `decision == GO`: admit cohort.
7. If `decision == CONDITIONAL_GO`: admit cohort with documented mitigations.
8. If `decision == NO_GO`: block admit; raise an incident and find/fix.
9. Append the receipt to a cohort-admit log (this pack or a new operator
   ledger).
10. After admit: capture a Workers Logs snapshot for the first hour as a
    post-admit baseline.

## Invariants

- No product code changes.
- No deploy or migration in this unit (those are operator actions in their own
  units / operator decisions).
- No customer PII in release receipts.

## Acceptance evidence

- A populated release receipt exists for the cohort wave.
- `release-gate.json` `release_receipt_template` filled in.
- Deployment SHA captured and recorded.
- LOOP_LEDGER records the cohort admit event.

## Test decision

`NOT_REQUIRED` — operator-driven ritual.

## Recovery / fix-forward

If `NO_GO`: do not admit; raise an incident. The recovery-scenario-matrix
defines the response to each failure mode.

## Completion signal

A release receipt exists for each cohort wave. The ritual is documented and
renewable.

## Status

`PLANNED` — ready for operator; gated on UNIT-001/002/003 resolution.

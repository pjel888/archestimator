# Rollout, Fix-Forward, And Completion Gate

## Authority And Release Boundary

This is the independent operations/final-audit surface for `OPS-001`, `AC-015`,
`GATE-005`, and UNIT-007. It does not change package status. Local implementation
completion does not prove deployment, hosted D1 state, public traffic, desktop
spreadsheet behavior, or production release readiness.

## Staged Adoption

| Stage | Change | Go evidence | No-go/fix-forward |
|---|---|---|---|
| 0 - Canonical dark path | Add cost parts/bases and compatibility wrappers; no user-visible switch | Independent fixture plus legacy wrapper characterization | Preserve wrapper behavior; repair/version canonical mapping |
| 1 - Internal consumers | Migrate editor/Data/charts, then publication/share, then preview/XLSX in DAG order | Each consumer's exact membership and named totals; shared receipt current | Route only failing consumer through verified adapter; do not revert unrelated pack work |
| 2 - Beta artifact proof | Run saved lifecycle through publication, preview, native XLSX readback, and print media | P0, security, workbook, print, performance, regression gates all pass | Block affected action; serve no partial artifact; fix earliest owner |
| 3 - Release evaluation | Use repository release process and prove deployed candidate separately | Fresh deployment/hosted evidence outside this local pack | Keep `release_status` non-ready; no local inference |

Snapshots remain immutable. A published semantic defect is repaired with a new
snapshot/calculation version and an explicit compatibility reader, not a rewrite
of issued history. Additive D1 constraints are fixed forward after a clean legacy
scan; destructive rollback is not an incident response.

## Final Audit Matrix

The independent verifier records `PASS|FAIL|BOUNDARY|N/A` and evidence for:

1. `BETA-P0-05` maps through `REQ-001` to `REQ-004`, `DATA-001`, `SEC-001`,
   `UX-001`, `PERF-001`, `OPS-001`, and every linked criterion/test/gate.
2. The `BETA-P1-10` receipt is limited to touched calculation/export capability
   extraction and uses the program-required contract.
3. Publisher issue identity, funnel, recipients, and unrelated UX were not changed;
   every shared edit consumed a current receipt and lease.
4. Golden expected values are independent and every row appears exactly once in
   each applicable named basis.
5. Scope, archive, currency, rounding, charge order, overflow, and version behavior
   match the domain contract with one oracle owner.
6. Editor/Data/chart, snapshot/share, preview/model, formula/scalar XLSX, native
   readback, unsaved/save/reload, and print proof are all fresh and mutually
   consistent.
7. Public allowlist/denial, workbook text safety, structured errors, and no-partial
   artifact behavior pass.
8. Time/query/payload/RSS/artifact/cardinality budgets pass on recorded fixtures.
9. Existing calculation/publication/proposal/workbook regressions and the required
   type, lint, error-handling, build, diff, and plan validation checks pass.
10. No duplicate formula, stale adapter/receipt, ambiguous label, temporary D1
    fixture/workbook/XML/server/browser, active lease, or untracked proof remains.
11. Manifest/evidence hashes and statuses match actual receipts; `next_unit` is
    cleared only after every unit is `VERIFIED`.

Any `FAIL` reopens its earliest causal unit and all downstream proof affected by
that contract. A missing hosted/provider/desktop claim is recorded as a release
boundary, not converted into local PASS.

## Resume And Completion Packet

Resume from the exact `next_unit` in `plan-pack.json`, then read only its packet
and the risk artifact(s) it references. Final handback includes source/diff and
manifest hashes, unit/criterion/gate status, commands and exits, proof digests,
shared receipts, resource cleanup, remaining release boundaries, and the next
safe action. The stop condition is all local units verified with zero unresolved
P0/P1, not document creation or validator invocation alone.

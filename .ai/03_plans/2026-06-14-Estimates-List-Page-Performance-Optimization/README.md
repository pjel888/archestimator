# Estimates List Page Performance Plan

This folder is the current plan pack for improving
`/workshop/projects/[projectId]/estimates`.

Start with:

1. `00_INDEX.md`
2. `08_PREIMPLEMENTATION_REVIEW_AND_REPAIR.md`
3. `09_TRACEABILITY_AND_QA_MATRIX.md`
4. `06_IMPLEMENTATION_PLAN.md`
5. `05_MEASUREMENT_METHODOLOGY.md`

Current status: **not implementation-ready until the P-1 entry gate for P0 is
satisfied**. The original performance diagnosis is still useful, but the repair
pass found that optimistic UI work must not begin while the client row type is
still coupled to `Tables<"estimates">` and mutation actions return only partial
reconciliation payloads. P-1 is satisfied only when the DTO/action/store
contract tests are green and the intentionally inverted no-refresh tests have
documented red output for P0 to turn green.

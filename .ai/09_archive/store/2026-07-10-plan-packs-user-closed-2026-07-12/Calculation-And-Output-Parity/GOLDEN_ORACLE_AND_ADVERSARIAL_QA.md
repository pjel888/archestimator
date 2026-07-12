# Golden Oracle And Adversarial QA

## Purpose And Authority

This is the maker/checker test design for `TEST-001` through `TEST-010`. Stable
test IDs and scenario baselines remain documented in
`VERIFICATION_ROLLOUT_AND_FINAL_AUDIT.md`; current live status remains solely in
`plan-pack.json`. This artifact supplies the independently reviewable fixture,
negative-path, evidence, and handback contract.

## Golden Fixture Construction

The fixture is hand-authored before calculation source edits and cannot call a
production calculator to generate expected values. It freezes:

- stable workspace/project/estimate/tab/node/row IDs and ordering;
- fixed clock, currency, calculation/snapshot versions, and export settings;
- material/labor, fractional quantity, quantity-base contingency, row discount,
  misc, sheet adjustment, proposal contingency, and VAT;
- included, excluded, by-owner, archived, legacy-missing-scope, and orphan cases;
- independently reviewed expected cost parts, membership, working/direct/final
  minor-unit totals, workbook cells, and print rows.

Expected values are reviewed by a checker who did not implement the oracle. A
disagreement changes the fixture/decision before source implementation; expected
values are never patched merely to make current production output green.

## Adversarial Matrix

| Risk family | Cases | Primary tests |
|---|---|---|
| Identity/membership | Empty tree, nested/group rows, duplicate labels, orphan, archived, scope states | TEST-001, TEST-003, TEST-004 |
| Numeric boundary | Zero/fraction/half-cent/discount, negative/NaN/Infinity, percentage limits, quantity congruence | TEST-001, TEST-003, TEST-008 |
| Overflow/cardinality | Safe-integer edge and one beyond, product/sum overflow, 5k/10k/50k refusal | TEST-001, TEST-007, TEST-008 |
| Compatibility | Current/legacy/unknown snapshot and calculation versions | TEST-004, TEST-008 |
| Public security | Private fields, unsafe URL, cross-workspace/public-ID confusion | TEST-004, TEST-008 |
| Workbook | Formula on/off, invalid ranges, stale cached value, reopen failure, formula-injection text | TEST-005, TEST-008 |
| Lifecycle | Unsaved/save/failure/retry/reload, stale concurrent export, repeated/cancelled print | TEST-006, TEST-008 |
| Regression/scope | Duplicate formula, PHP-only format, unrelated Publisher identity diff | TEST-002, TEST-009, TEST-010 |

Every case names the expected failing signal before implementation and the exact
pass signal. A test that fails during fixture setup or for an unrelated reason is
not acceptable red evidence.

## Receipt Contract

Each receipt records test/evaluator command, exit code, stable test IDs, source
revision, scoped diff hash, fixture hash, runtime/tool versions, expected and
actual signal, created resources, cleanup, and earliest causal unit. Artifact
receipts additionally store sanitized workbook/browser/output digests without
customer-like raw content.

Evidence stays `PLANNED` until the named producer actually runs. A worker summary,
manual assertion, planning document, or plan-pack validation cannot promote a
criterion. Stale source, fixture, Publisher receipt, runtime, or diff hashes
invalidate the dependent receipt.

## Final Adversarial Review

The verifier samples one happy path and at least one nil, invalid, unauthorized,
concurrent/retry, partial-failure, stale/legacy, overflow/cardinality, and cleanup
case for every implicated boundary. Any P0/P1 finding returns to the earliest
causal unit, followed by its focused proof and every downstream consumer proof.
